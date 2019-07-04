const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')

const {writeFileSync, readFileSync, NOTHING}=require('./libs/common')
const get_apis=require('./libs/get_apis')
const make_hooks_args=require('./libs/make_hooks_args')
const get_response=require('./libs/get_response')

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--auto-open-devtools-for-tabs',
    ]
  })
  const client = await CDP({ port: chrome.port })
  const { Runtime, Network, Page } = client
  await Promise.all([Runtime.enable(), Network.enable(), ])

  await Network.setRequestInterception({
    patterns: 'Script,XHR,Document,Stylesheet,Image'.split(',')
      .map(resourceType=>({resourceType, interceptionStage: 'HeadersReceived'}))
  })

  Network.requestIntercepted(async (params) => {

    const { interceptionId, request, responseHeaders, responseStatusCode }=params
    const Args=make_hooks_args({responseStatusCode, request, responseHeaders})
    const {url2filename, url2response, should_no_cache}=get_apis()
    const current_response=await get_response({Network, Args, interceptionId})

    let fn=await url2filename(Args)
    let newResponse=cache=readFileSync(fn)||current_response
    if(should_no_cache(Args)) newResponse=current_response
    Args.response=newResponse
    newResponse=await url2response(Args)
    if(responseStatusCode!==200 && (!newResponse || !newResponse.length)) {
      return Network.continueInterceptedRequest(params)
    }
    if(Buffer.compare(
      Buffer.from(cache||NOTHING),
      Buffer.from(newResponse))
    ) writeFileSync(fn, newResponse)

    let header=`HTTP/1.1 ${Args.status} OK\r\n`
    Args.addResponseHeader('Content-Length', newResponse.length)
    Args.addHeaders.map(([key, value])=>{
      header+=key+': '+value+'\r\n'
      Args.deleteResponseHeader(key)
    })
    for(let a in responseHeaders) {
      header+=a.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())+': '+responseHeaders[a]+'\r\n'
    }

    let resp=Buffer.concat([header, `\r\n`, newResponse, `\r\n\r\n`].map(c=>Buffer.from(c)))
    Network.continueInterceptedRequest({
      interceptionId,
      rawResponse: resp.toString('base64'),
    })
  })

}

main().catch(e=>console.log(e))

// https://chromedevtools.github.io/devtools-protocol/tot/DOM
