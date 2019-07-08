process.on('uncaughtException', e=>{
  console.log(e)
})

const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer-core')
const findChrome = require('chrome-finder')

const {headers2kvheaders, fetchUrl, ERROR_TIMEOUT, ERROR_TIMEOUT_FETCH}=require('./libs/common')
const get_apis=require('./libs/get_apis')
const hook_fetch=require('./libs/hook_fetch')

const hookClient=async client=>{
  const patterns=[/^https*\:\/\//ig]
  const {Fetch}=client
  await Promise.all([Fetch.enable({patterns})])
  Fetch.requestPaused(async params=>{
    const {requestId, request}=params

    // 非http/https开头的链接不需要处理
    if(!request.url.match(/^https*\:\/\//)) {
      Fetch.continueRequest({requestId})
      return
    }

    const hooks=get_apis()
    const resp=({status, responseHeaders, response})=>Fetch.fulfillRequest({
      requestId,
      responseCode: status,
      responseHeaders: headers2kvheaders(responseHeaders),
      body: Buffer.from(response).toString("base64"),
    })

    try{
      const {url, method, postData, hasPostData, headers}=request
      const fetchObj={
        url, method, postData, headers,
        timeout: hooks.network_timeout,
      }
      const hookObj=Object.assign(
        fetchObj,
        hooks,
        await fetchUrl(fetchObj),
      )
      resp(await hook_fetch(hookObj))
    }catch(e) {
      if(e===ERROR_TIMEOUT) resp(ERROR_TIMEOUT_FETCH)
      else {
        Fetch.failRequest({requestId, errorReason: "Failed"})
      }
    }

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
