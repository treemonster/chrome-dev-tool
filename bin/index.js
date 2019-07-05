const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')

const {writeFileSync, readFileSync, NOTHING}=require('./libs/common')
const get_apis=require('./libs/get_apis')
const make_hooks_args=require('./libs/make_hooks_args')
const get_response=require('./libs/get_response')
const make_response=require('./libs/make_response')

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--auto-open-devtools-for-tabs',
    ]
  })
  const { Network } = await CDP({ port: chrome.port })
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

main().catch(e=>console.log(e))

// https://chromedevtools.github.io/devtools-protocol/tot/DOM
