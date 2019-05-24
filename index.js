const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const fs=require('fs')
const path=require('path')
const iconv=require('iconv-lite')

// 部分可配置方法写在customer_apis
const {url2filename}=require('./customer_apis')

const {
  SPEC_STR,
  node2chrome,
  chrome2node,
  BackgroundAPI,
  FrontAPI,
  CHROME_TOOL_INITJS,
}=require('./tools')

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
    return fs.readFileSync(fn)
  }catch(e){}
}
function md5(str) {
  return require('crypto').createHash('md5').update(str).digest('hex')
}
function cut(str, a, b) {
  return str.replace(new RegExp('(^.{'+a+'}).*?(.{'+b+'}$)', 'g'), '$1...$2')
}

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--auto-open-devtools-for-tabs',
    ]
  })
  const client = await CDP({ port: chrome.port })
  const { Runtime, Network, Page, Console } = client
  await Promise.all([Runtime.enable(), Network.enable(), Console.enable()])
  await Network.setRequestInterception({
    patterns: [{
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
    let fn=url2filename(request.url)
    if(responseStatusCode !== 200) return Network.continueInterceptedRequest(params)
    const response = await Network.getResponseBodyForInterception({ interceptionId })
    const bodyData = response.base64Encoded ? new Buffer(response.body, 'base64') : new Buffer(response.body)

    let newBody=readFileSync(fn) || bodyData
    if((responseHeaders['Content-Type']+'').match(/charset.*?gb/i)) {
      responseHeaders['Content-Type']='text/html;charset=utf-8'
      newBody=iconv.decode(new Buffer(response.body, 'base64'), 'gbk')
    }
    if(newBody===bodyData) writeFileSync(fn, newBody)
    let header=`HTTP/1.1 200 OK\r\n`
    responseHeaders['content-length']=newBody.length
    for(let a in responseHeaders) header+=a.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())+': '+responseHeaders[a]+'\r\n'
    let resp=header+`\r\n`+newBody+`\r\n\r\n`
    Network.continueInterceptedRequest({
      interceptionId,
      rawResponse: response.base64Encoded ? new Buffer(resp).toString('base64'): resp,
    })
  })

}

main().catch(e=>console.log(e))

// https://chromedevtools.github.io/devtools-protocol/tot/DOM
