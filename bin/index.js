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
  Fetch.requestPaused(async ({requestId, frameId, request})=>{
    let {url, method, headers}=request

    // 非 http/https 开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch.continueRequest({requestId})

    // 浏览器自带referer头会触发client blocked，因此启动参数禁止referer，hook中补上
    const a=page.frames().find(a=>a._id===frameId)
    if(a) headers.Referer=a.url()

    // 如果这个请求已经被代理处理过，得到响应结果了，则返回响应结果
    const key=url+'\n'+method
    if(id_map.resCaches[key]) {
      const {status, response, responseHeadersArray}=id_map.resCaches[key]
      Fetch.fulfillRequest({
        requestId,
        responseCode: status,
        responseHeaders: responseHeadersArray,
        body: Buffer.from(response).toString('base64'),
      })
      delete id_map.resCaches[key]
      return
    }else if(method==='GET') {
      // 没有被hook过的GET请求，不需要走代理来获取postData，所以直接处理了
      const {status, response, responseHeadersArray}=await hookRequest(request)
      return Fetch.fulfillRequest({
        requestId,
        responseCode: status,
        responseHeaders: responseHeadersArray,
        body: Buffer.from(response).toString('base64'),
      })
    }

    // 跳转代理
    // 代理处理完成后307跳转原始请求地址
    url=`http://127.0.0.1:${port}/?id=${requestId}`
    id_map[requestId]={request, page}
    Fetch.continueRequest({requestId, url})

  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer

