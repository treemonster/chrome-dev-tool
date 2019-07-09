process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
const localServer=require('./libs/common').newLocalServer()
const id_map={}

watchClient(async client=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  const {bindHookHandler, port}=await localServer
  await Promise.all([Fetch.enable({patterns})])
  bindHookHandler(hookRequest, id_map)
  Fetch.requestPaused(async ({requestId, request})=>{
    let {url, method, headers}=request

    // 非http/https开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch.continueRequest({requestId})

    // 转发还有问题，目前仅让boundary类型请求转发
    if((headers['Content-Type']+'').match(/boundary/i)) {
      url=`http://127.0.0.1:${port}/?id=${requestId}`
      id_map[requestId]=request
      Fetch.continueRequest({requestId, url})
    }else{
      // 直接hook存在问题，超长postData无法获取
      const {responseCode, responseHeaders, response}=await hookRequest(request)
      Fetch.fulfillRequest({
        requestId,
        responseCode,
        responseHeaders,
        body: response.toString('base64'),
      })
    }
  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer

