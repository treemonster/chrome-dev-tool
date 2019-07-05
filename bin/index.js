const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer')

const {writeFileSync, readFileSync, NOTHING, sleep}=require('./libs/common')
const get_apis=require('./libs/get_apis')
const make_hooks_args=require('./libs/make_hooks_args')
const get_response=require('./libs/get_response')
const make_response=require('./libs/make_response')

const hookClient=async client=>{
  /*
  const {Fetch, Network}=client
  await Promise.all([Fetch.enable(), Network.enable()])
  Fetch.requestPaused(async params=>{
    Fetch.fulfillRequest({requestId: params.requestId, responseHeaders: [
      {name: "Content-Type", value: "text/html"},
    ], responseCode: 200, body: Buffer.from("33").toString("base64")})
    // Fetch.continueRequest({requestId: params.requestId})
  })
  */
  const {Network}=client
  await Promise.all([Network.enable()])

  await Network.setRequestInterception({
    patterns: 'Script,XHR,Document,Stylesheet,Image'.split(',')
      .map(resourceType=>({resourceType, interceptionStage: 'HeadersReceived'}))
  })

  Network.requestIntercepted(async (params) => {
    const { interceptionId, request, responseHeaders, responseStatusCode }=params
    const Args=make_hooks_args({responseStatusCode, request, responseHeaders})
    const {url2filename, url2response, should_no_cache, write_cache}=get_apis()
    let response=await get_response({Network, Args, interceptionId})
    let fn, cache
    if(write_cache) {
      fn=await url2filename(Args)
      cache=readFileSync(fn)
      if(cache && !should_no_cache(Args)) response=cache
    }
    Args.response=response
    response=await url2response(Args)
    if(responseStatusCode!==200 && (!response || !response.length)) {
      return Network.continueInterceptedRequest(params)
    }
    if(write_cache && Buffer.compare(
      Buffer.from(cache||NOTHING),
      Buffer.from(response))
    ) writeFileSync(fn, response)

    Network.continueInterceptedRequest({
      interceptionId,
      rawResponse: make_response({Args, response}).toString('base64'),
    })
  })
}

const targetsHooked={}
const bindCDP=async (options, targetId)=>{
  if(targetsHooked[targetId]) return
  targetsHooked[targetId]=1
  hookClient(await CDP(Object.assign({target: targetId}, options)))
}

puppeteer.launch({
  headless: false,
  defaultViewport: null,
}).then(async browser => {
  const port=browser.wsEndpoint().replace(/^.*\/\/.*?\:(\d+).*/,'$1')
  const bindTarget=target=>bindCDP({port}, target._targetInfo.targetId)
  browser.targets().filter(t=>t._targetInfo.type==='page').map(bindTarget)
  ; ['targetcreated', 'targetchanged'].map(t=>browser.on(t, bindTarget))
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
