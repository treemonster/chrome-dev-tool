process.on('uncaughtException', e=>{
  console.log(e)
})

const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer-core')
const findChrome = require('chrome-finder')

const {writeFileSync, readFileSync, NOTHING, sleep, fetchUrl, ERROR_TIMEOUT}=require('./libs/common')
const get_apis=require('./libs/get_apis')
const make_hooks_args=require('./libs/make_hooks_args')
const get_response=require('./libs/get_response')
const make_response=require('./libs/make_response')

const hookClient=async client=>{
  const patterns=[/^https*\:\/\//ig]
  const {Fetch, Network}=client
  await Promise.all([Fetch.enable({patterns}), Network.enable()])
  Fetch.requestPaused(async params=>{
    const {requestId, request}=params

    const {network_timeout}=get_apis()
    let fetchResult
    try{
      if(!request.url.match(/^https*\:\/\//)) {
        Fetch.continueRequest({requestId})
        return
      }
      fetchResult=await fetchUrl(Object.assign({timeout: network_timeout}, request))
    }catch(e) {
      if(e===ERROR_TIMEOUT) fetchResult={
        status: 200, headers: {'chrome-dev-tool': 'Fetch-Timeout'}, response: "",
      }
    }
    if(!fetchResult) {
      Fetch.failRequest({
        requestId,
        errorReason: "network unreachable",
      })
      return
    }

    const {status, headers, response}=fetchResult
    Fetch.fulfillRequest({
      requestId,
      responseHeaders: (a=>{
        for(let key in headers) {
          let values=headers[key]
          ; (values.constructor===Array? values: [values]).map(value=>{
            a.push({name: key, value})
          })
        }
        return a
      })([]),
      responseCode: status,
      body: response.toString("base64")
    })

  })

  await Network.setRequestInterception({patterns})

  Network.requestIntercepted(async params=>{
    const {interceptionId, request, responseHeaders, responseStatusCode}=params
    const {url2filename, url2response, should_no_cache, write_cache, network_timeout}=get_apis()
    const Args=make_hooks_args({responseStatusCode, request, responseHeaders, network_timeout})
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
    try{
      Network.continueInterceptedRequest({
        interceptionId,
        rawResponse: make_response({Args, response}).toString('base64'),
      })
    }catch(e) {}
  })
}

const targetsHooked={}
const bindCDP=async (options, targetId)=>{
  if(targetsHooked[targetId]) return true
  targetsHooked[targetId]=1
  await hookClient(await CDP(Object.assign({target: targetId}, options)))
}
puppeteer.launch({
  defaultViewport: null,
  ignoreDefaultArgs: true,
  args: [
    '--enable-features=NetworkService,NetworkServiceInProcess',
    '--auto-open-devtools-for-tabs',
    '--no-first-run',
    'about:blank',
  ],
  executablePath: findChrome(),
}).then(async browser => {
  const port=browser.wsEndpoint().replace(/^.*\/\/.*?\:(\d+).*/,'$1')

  // https://github.com/GoogleChrome/puppeteer/issues/3667
  // 新开页面到cdp可以博捕捉之间有一段空隙时间，这段时间无法注入代码，暂无解决方案
  // 目前我所使用的reload方式，仅仅让新页面在和cdp建立连接之后重新载入，但在reload之前所发出的请求已确实被后台所记录了
  // 所以这个方式治标不治本，在特定情况下会引入其他错误。例如页面打开之后调用了统计访问次数的接口，那么这个接口就有可能被调用两次

  const bindTarget=async target=>{
    if(await bindCDP({port}, target._targetInfo.targetId)) return;
    const page=await target.page()
    if(!page) return;
    await page.reload()
  }
  browser.targets().filter(t=>t._targetInfo.type==='page').map(bindTarget)
  ; ['targetcreated', 'targetchanged'].map(t=>browser.on(t, bindTarget))
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer
