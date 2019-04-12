const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const {Base64}=require('js-base64')
const fs=require('fs')
const path=require('path')

function writeFileSync(fn, str) {
  path.normalize(fn+'/../').split(path.sep).reduce((a, b)=>{
    a=a+path.sep+b
    try{fs.mkdirSync(a)}catch(e){}
    return a
  })
  fs.writeFileSync(fn, str)
}
function readFileSync(fn) {
  try{
    return fs.readFileSync(fn, 'utf-8')
  }catch(e){}
}
function md5(str) {
  return require('crypto').createHash('md5').update(str).digest('hex')
}
function cut(str, a, b) {
  return str.replace(new RegExp('(^.{'+a+'}).*?(.{'+b+'}$)', 'g'), '$1...$2')
}
const SPEC_STR='\0\1\2\3\4\0TREEMONSTER'
const node2chrome=client=>expression=>new Promise(resolve=>{
  let {Runtime}=client
  Runtime.evaluate({expression}, (_, {result})=>resolve(result.value))
})
const chrome2node=client=>async ({message})=>{
  let {text}=message
  let bg=BackgroundAPI(client)
  try{text=JSON.parse(text)}catch(e){}
  if(!text || text[0]!==SPEC_STR) return;
  let [_, ID, fn, ...args]=text
  let result=await bg[fn].apply({}, args)
  let _node2chrome=node2chrome(client)
  _node2chrome(`window[${JSON.stringify(SPEC_STR)}].callback(${JSON.stringify([ID, result])})`)
}

const BackgroundAPI=client=>({
  captureScreenshot: async _=>{
    let {Page}=client
    let {data}=await Page.captureScreenshot({
      format: 'jpeg',
      quality: 35,
      fromSurface: true,
      clip: Object.assign((await Page.getLayoutMetrics()).contentSize, {scale: 1}),
    })
    return data
  }
})
const FrontAPI=(div, logpanel, callFn)=>({
  captureScreenshot: async _=>{
  	div.style.display='none'
    let png=await Promise.resolve(callFn('captureScreenshot').promise)
    div.style.display='block'
    logpanel.innerHTML='<img src="data:image/png;base64,'+png+'" width="200" />'
  },
})

const CHROME_TOOL_INITJS='('+((SPEC_STR, FrontAPI)=>{
  if(window[SPEC_STR]) return;
  let _tasks={}
  const callFn=function(){
    const ID=Math.random()+Date.now()
    _tasks[ID]=defer()
    console.log(JSON.stringify([SPEC_STR, ID].concat(Array.prototype.slice.call(arguments))))
    return _tasks[ID]
  }
  function defer() {
    let d = {}, promise = new Promise((resolve, reject)=>{
      d={resolve, reject}
    })
    d.promise=promise
    return d
  }
  const d=document.createElement('div')
  d.style.cssText=`
    position: fixed;
    right: 0;
    background: #feecba;
    z-index: 99999;
    width: 100%;
    height: 100px;
    bottom: 0px;
    border-top: 2px solid #ccc;
    text-align: center;
  `
  d.innerHTML=`
    <button onclick='window[${JSON.stringify(SPEC_STR)}].api.captureScreenshot()'>屏幕截图</button>
    <div id='logpanel'></div>
  `
  document.body.appendChild(d)
  window[SPEC_STR]={
    callback: ([ID, result])=>{
      _tasks[ID].resolve(result)
    },
    api: FrontAPI(d, logpanel, callFn),
  }
})+')('+JSON.stringify(SPEC_STR)+','+FrontAPI+')'

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--auto-open-devtools-for-tabs'
    ]
  })
  const client = await CDP({ port: chrome.port })
  const { Runtime, Network, Page, Console } = client
  await Promise.all([Runtime.enable(), Network.enable(), Console.enable()])
  await Network.setRequestInterception({
    patterns: [{
      urlPattern: "*.js*",
      resourceType: 'Script',
      interceptionStage: 'HeadersReceived',
    }, {
      resourceType: 'Document',
      interceptionStage: 'HeadersReceived',
    }, {
      resourceType: 'Stylesheet',
      interceptionStage: 'HeadersReceived',
    }]
  })
  const _node2chrome=node2chrome(client)
  const _chrome2node=chrome2node(client)

  client.on('event', (message)=>{
    if (message.method !== 'Network.requestWillBeSent') return
    _node2chrome(CHROME_TOOL_INITJS)
  })

  Console.messageAdded(a=>_chrome2node(a))

  Network.requestIntercepted(async (params) => {
    const { interceptionId, request, responseHeaders, responseStatusCode }=params
    let fn=__dirname+'/data/'+request.url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
      return a+'/'+(md5(request.url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
    })
    if(responseStatusCode !== 200) return Network.continueInterceptedRequest(params)
    const response = await Network.getResponseBodyForInterception({ interceptionId })
    const bodyData = response.base64Encoded ? Base64.decode(response.body) : response.body

    let newBody=readFileSync(fn) || bodyData
    if(newBody===bodyData) writeFileSync(fn, newBody)
    let header=`HTTP/1.1 200 OK\r\n`
    responseHeaders['content-length']=newBody.length
    for(let a in responseHeaders) header+=a.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())+': '+responseHeaders[a]+'\r\n'
    let resp=header+`\r\n`+newBody+`\r\n\r\n`
    Network.continueInterceptedRequest({
      interceptionId,
      rawResponse: response.base64Encoded ? Base64.encode(resp): resp,
    })
  })

}

main().catch(e=>console.log(e))

// https://chromedevtools.github.io/devtools-protocol/tot/DOM
