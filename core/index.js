process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
const {sleep, CONTINUE_REQUEST}=require('./libs/common')

const newBrowser=(headless, hooks_js_inject)=>watchClient(async (client, page)=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  await Promise.all([Fetch.enable({patterns})])

  ; ['continueRequest', 'fulfillRequest'].map(f=>{
    Fetch['_'+f]=a=>Fetch[f](a).catch(_=>0)
  })

  Fetch.requestPaused(async ({requestId, frameId, request})=>{
    let {url, method, headers, postData}=request

    // 非 http/https 开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch._continueRequest({requestId})

    let result=await hookRequest(request, page._target._targetId)
    if(result === CONTINUE_REQUEST) return Fetch._continueRequest({requestId})
    const {status, response, responseHeadersArray}=result

    return Fetch._fulfillRequest({
      requestId,
      responseCode: status,
      responseHeaders: responseHeadersArray,
      body: Buffer.from(response).toString('base64'),
    })

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
