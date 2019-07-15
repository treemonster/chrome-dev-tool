process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
const localServer=require('./libs/common').newLocalServer()
const id_map={
  resCaches: {},
}

watchClient(async (client, page)=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  const {bindHookHandler, port}=await localServer
  bindHookHandler(hookRequest, id_map)
  await Promise.all([Fetch.enable({patterns})])
  Fetch.requestPaused(async ({requestId, request})=>{
    let {url, method, headers}=request

    // 非 http/https 开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch.continueRequest({requestId})

    const key=url+'\n'+method
    if(id_map.resCaches[key]) {
      const {responseCode, response, responseHeadersArray}=id_map.resCaches[key]
      Fetch.fulfillRequest({
        requestId,
        responseCode,
        responseHeaders: responseHeadersArray,
        body: Buffer.from(response).toString('base64'),
      })
      delete id_map.resCaches[key]
      return
    }

    // 跳转代理
    url=`http://127.0.0.1:${port}/?id=${requestId}`
    id_map[requestId]={request, page}
    headers.Referer=page.url() // 浏览器自带referer头会触发client blocked，因此启动参数禁止referer，hook中补上
    Fetch.continueRequest({requestId, url})

  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer

