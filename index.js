const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const fs=require('fs')
const path=require('path')
const iconv=require('iconv-lite')

let url2filename=({url, requestHeaders, addResponseHeader, postData})=>{
  return __dirname+'/data/'+url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
    return a+'/'+(md5(url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
  })
}, url2response=({url, requestHeaders, addResponseHeader, postData, response})=>{
  return response
}, should_no_cache=({url, requestHeaders, addResponseHeader, postData})=>false

let _url2filename=url2filename,
  _url2response=url2response,
  _should_no_cache=should_no_cache

const NOTHING=Buffer.alloc(0)

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

let mtime=0

async function main() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      '--auto-open-devtools-for-tabs',
    ]
  })
  const client = await CDP({ port: chrome.port })
  const { Runtime, Network, Page } = client
  await Promise.all([Runtime.enable(), Network.enable(), ])

  await Network.setRequestInterception({
    patterns: 'Script,XHR,Document,Stylesheet,Image'.split(',')
      .map(resourceType=>({resourceType, interceptionStage: 'HeadersReceived'}))
  })

  Network.requestIntercepted(async (params) => {

    const { interceptionId, request, responseHeaders, responseStatusCode }=params
    const deleteResponseHeader=(key)=>{
      for(let k in responseHeaders) {
        if(key.toLowerCase()===k.toLowerCase()) delete responseHeaders[k]
      }
    }
    const addHeaders=[]
    const Args={
      url: request.url,
      postData: request.postData,
      requestHeaders: request.headers,
      response: null,
      responseHeaders: responseHeaders,
      addResponseHeader: (key, value)=>addHeaders.push([key, value]),
      deleteResponseHeader,
      sleep: ms=>new Promise(r=>setTimeout(r, ms)),
    }

    try{
      let fd=fs.openSync('./hooks.js','r')
      let t=fs.fstatSync(fd).mtime
      fs.closeSync(fd)
      if(mtime - t) {
        console.log(mtime, t)
        mtime=t
        delete require.cache[path.resolve('./hooks.js')]
        let hooks=require('./hooks')
        _url2filename=hooks.url2filename||url2filename
        _url2response=hooks.url2response||url2response
        _should_no_cache=hooks.should_no_cache||should_no_cache
      }
    }catch(e) {
      console.log('Failed to load hooks.js: ', e)
    }

    let fn=_url2filename(Args)||url2filename(Args)
    const response = responseStatusCode===200?
      await Network.getResponseBodyForInterception({ interceptionId }):
      {body: "", base64Encoded: true}
    let bodyData = response.base64Encoded ? new Buffer(response.body, 'base64') : new Buffer(response.body)
    if((responseHeaders['Content-Type']+'').match(/charset.*?gb/i)||bodyData.slice(0, 2000).toString('utf-8').match(/meta.*?Content-Type.*?gb/i)) {
      responseHeaders['Content-Type']='text/html;charset=utf-8'
      try{bodyData=iconv.decode(bodyData, 'gbk')}catch(e) {}
    }
    let newBody=cache=readFileSync(fn) || bodyData
    if(_should_no_cache(Args) || should_no_cache(Args)) newBody=bodyData
    Args.response=newBody
    newBody=(await _url2response(Args)) || url2response(Args)
    if(responseStatusCode!==200 && (!newBody || !newBody.length)) return Network.continueInterceptedRequest(params)
    if(Buffer.compare(Buffer.from(cache||NOTHING), Buffer.from(newBody))) writeFileSync(fn, newBody)
    let header=`HTTP/1.1 200 OK\r\n`
    addHeaders.map(([key, value])=>{
      header+=key+': '+value+'\r\n'
      delete responseHeaders[key]
      delete responseHeaders[key.toLowerCase()]
    })
    deleteResponseHeader('content-length')
    responseHeaders['content-length']=newBody.length
    for(let a in responseHeaders) header+=a.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())+': '+responseHeaders[a]+'\r\n'
    let resp=Buffer.concat([header, `\r\n`, newBody, `\r\n\r\n`].map(c=>Buffer.from(c)))
    Network.continueInterceptedRequest({
      interceptionId,
      rawResponse: response.base64Encoded ? resp.toString('base64'): resp,
    })
  })

}

main().catch(e=>console.log(e))

// https://chromedevtools.github.io/devtools-protocol/tot/DOM
