process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
const {sleep, newLocalServer}=require('./libs/common')
const localServer=newLocalServer()
const id_map={
  resCaches: {},
}

const newBrowser=(headless, hooks_js_inject)=>watchClient(async (client, page)=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  const {bindHookHandler, port}=await localServer
  bindHookHandler(hookRequest, id_map)
  await Promise.all([Fetch.enable({patterns})])

  ; ['continueRequest', 'fulfillRequest'].map(f=>{
    Fetch['_'+f]=a=>Fetch[f](a).catch(_=>0)
  })

  Fetch.requestPaused(async ({requestId, frameId, request})=>{
    let {url, method, headers, postData}=request

    // 非 http/https 开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch._continueRequest({requestId})

    // 浏览器自带referer头会触发client blocked，因此启动参数禁止referer，hook中补上
    const a=page.frames().find(a=>a._id===frameId)
    if(a) headers.Referer=a.url()

    // 如果这个请求已经被代理处理过，得到响应结果了，则返回响应结果
    // 走代理的根本目的是为了获取postData
    // 因此GET请求，以及postData已经获取到的请求，完全没有必要走代理
    // 跳转代理的请求，代理处理完成后307跳转原始请求地址

    let result=null
    const KEY=url+'\n'+method
    if(id_map.resCaches[KEY]) {
      result=id_map.resCaches[KEY]
      delete id_map.resCaches[KEY]
    }else if(method==='GET' || postData) {
      result=await hookRequest(request, page._target._targetId)
    }

    if(result) {
      const {status, response, responseHeadersArray}=result
      return Fetch._fulfillRequest({
        requestId,
        responseCode: status,
        responseHeaders: responseHeadersArray,
        body: Buffer.from(response).toString('base64'),
      })
    }else{
      url=`http://127.0.0.1:${port}/?id=${requestId}`
      id_map[requestId]={request, page}
      Fetch._continueRequest({requestId, url})
    }

  })
}, headless, hooks_js_inject)

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer


// 启动调试模式的chrome，用于开发
exports.openDebugger=_=>newBrowser()

// 封装代码控制的隐藏chrome，用于执行自动化任务
exports.openAutotask=headless=>{
  const url2response_list={}
  const HOOKS_JS_INJECT={proxy: true, url2response: Args=>{
    for(let pageId in url2response_list) {
      if(Args.pageId !== pageId) continue
      const p=url2response_list[pageId]
      typeof p==='function' && p(Args)
    }
  }}
  const browser=newBrowser(headless, HOOKS_JS_INJECT)
  const run=async asyncFunc=>{
    const _browser=await browser
    const page=await _browser.newPage()
    const pageId=page._target._targetId
    url2response_list[pageId]=null
    return new Promise(r=>asyncFunc({
      hook: fn=>url2response_list[pageId]=fn,
      goto: async url=>{
        await page.goto(url)
        for(;!page.__BINDED__;) await sleep(1e2)
      },
      evaluate: fn=>page.evaluate(fn),
      end: async _=>{
        delete url2response_list[pageId]
        await page.close()
        r()
      },
    }))
  }
  const destroy=async _=>(await browser).close()
  return {run, destroy}
}
