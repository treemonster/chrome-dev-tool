process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient}=require('./libs/main_hooks')
const localServer=require('./libs/common').newLocalServer()
const id_map={}

watchClient(async (client, page)=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  const {bindHookHandler, port}=await localServer
  bindHookHandler(hookRequest, id_map)
  await Promise.all([Fetch.enable({patterns})])
  Fetch.requestPaused(async ({requestId, request})=>{
    let {url, headers}=request

    // 非http/https开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch.continueRequest({requestId})

    // cookies 注入
    const id=url.replace(/^.*Do-Set-Cookie-requestId=(.+)$|^.*$/, '$1')
    if(id && id_map[id]) return Fetch.fulfillRequest({
      requestId,
      responseCode: 200,
      responseHeaders: id_map[id].setCookies.map(value=>({name: 'Set-Cookie', value})),
      body: "",
    })

    // 跳转代理
    url=`http://127.0.0.1:${port}/?id=${requestId}`
    id_map[requestId]={request, page}
    Fetch.continueRequest({requestId, url})

  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer

