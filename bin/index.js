process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
// const localServer=require('./libs/common').newLocalServer()

// const id_map={}
watchClient(async client=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  // const {bindHookHandler, port}=await localServer
  await Promise.all([Fetch.enable({patterns})])
  // bindHookHandler(hookRequest, id_map)
  Fetch.requestPaused(async ({requestId, request})=>{
    let {url}=request
    // 非http/https开头的链接不需要处理
    if(url.match(/^https*\:\/\//)) {
      // url=`http://127.0.0.1:${port}/?id=${requestId}`
      // id_map[requestId]=request
      const {responseCode, responseHeaders, response}=await hookRequest(request)
      Fetch.fulfillRequest({
        requestId,
        responseCode,
        responseHeaders,
        body: response.toString('base64'),
      })
    }else Fetch.continueRequest({requestId})
  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer

