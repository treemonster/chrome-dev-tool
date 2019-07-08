process.on('uncaughtException', e=>console.log(e))

const {hookRequest, watchClient, IGNORE_HOOK}=require('./libs/main_hooks')

watchClient(async client=>{
  const {Fetch}=client
  const patterns=[/^https*\:\/\//ig]
  await Promise.all([Fetch.enable({patterns})])
  Fetch.requestPaused(async ({requestId, request})=>{
    const res=await hookRequest(request)
    if(res===IGNORE_HOOK) Fetch.continueRequest({requestId})
    const {responseCode, responseHeaders, response}=res
    Fetch.fulfillRequest({
      requestId,
      responseCode,
      responseHeaders,
      body: response.toString("base64"),
    })
  })
})

// https://chromedevtools.github.io/devtools-protocol/tot/Fetch
// https://github.com/cyrus-and/chrome-remote-interface
// https://github.com/GoogleChrome/puppeteer
