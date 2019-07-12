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

    // 非 http/https 开头的链接不需要处理
    if(!url.match(/^https*\:\/\//)) return Fetch.continueRequest({requestId})

    // set-cookie 注入。经跳转的地址，直接 Set-Cookie 无效
    const id=url.replace(/^.*Do-Set-Cookie-requestId=(.+)$|^.*$/, '$1')

    if(id && id_map[id]) return Fetch.fulfillRequest({
      requestId,
      responseCode: 200,
      responseHeaders: [
        {name: 'Content-Type', value: 'text/plain'},
      ].concat(id_map[id].setCookies.map(value=>({name: 'Set-Cookie', value}))),
      body: "",
    })

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

