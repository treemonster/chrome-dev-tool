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

async function main() {
  const chrome = await chromeLauncher.launch({
    startingUrl: 'https://baidu.com',
    chromeFlags: [
      '--auto-open-devtools-for-tabs'
    ]
  })
  const protocol = await CDP({ port: chrome.port })
  const { Runtime, Network } = protocol
  await Promise.all([Runtime.enable(), Network.enable()])
  await Network.setRequestInterception({
    patterns: [{
      urlPattern: "*.js*",
      resourceType: 'Script',
      interceptionStage: 'HeadersReceived',
    }, {
      resourceType: 'Document',
      interceptionStage: 'HeadersReceived',
    }]
  })

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