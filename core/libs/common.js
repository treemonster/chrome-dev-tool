const fs=require('fs')
const path=require('path')
const crypto=require('crypto')
const iconv=require('iconv-lite')
const getPort = require('get-port')
const url=require('url')
const querystring=require('querystring')
const {
  deleteHeader, getHeader, replaceHeader,
  fetchUrl,
  NETWORK_TIMEOUT_ERROR,
}=require('cwg-fetch')

exports.CONTINUE_REQUEST=new Error('continueWithoutHooks')

const args={}
process.argv.slice(2).map(arg=>{
  arg.replace(/^--(.+?)(=(.+))*$/,(_, k, v)=>{
    args[k.toUpperCase()]=v||''
  })
})
exports.setDefaultArgv=def=>{
  for(let k in def) if(args[k.toUpperCase()]===undefined) args[k.toUpperCase()]=def[k]
}
exports.getArgv=key=>args[key.toUpperCase()]

exports.writeFileSync=function(fn, str) {
  path.normalize(fn+'/../').split(path.sep).reduce((a, b)=>{
    a=a+path.sep+b
    try{fs.mkdirSync(a)}catch(e){}
    return a
  })
  fs.writeFileSync(fn, str)
}
exports.readFileSync=function(fn) {
  try{
    return fs.readFileSync(fn)
  }catch(e){}
}
exports.md5=function(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}
exports.cut=function(str, a, b) {
  return str.replace(new RegExp('(^.{'+a+'}).*?(.{'+b+'}$)', 'g'), '$1...$2')
}
exports.NOTHING=Buffer.alloc(0)
exports.sleep=ms=>new Promise(r=>setTimeout(r, ms))

const require_file_mtime={}
exports.requireFile=fn=>{
  const abs_fn=path.resolve(fn)
  try{
    const fd=fs.openSync(abs_fn, 'r')
    const {mtime}=fs.fstatSync(fd)
    const _mtime=require_file_mtime[abs_fn]||0
    fs.closeSync(fd)
    if(_mtime - mtime) {
      require_file_mtime[abs_fn]=mtime
      delete require.cache[abs_fn]
    }
    return require(abs_fn)
  }catch(e) {
    if(require_file_mtime[abs_fn]!==-1) console.log('Failed to load '+abs_fn+': ')
    require_file_mtime[abs_fn]=-1
  }
}

exports.updateResultResponseHeaders=(result, headers)=>{
  const {update_header_key, headers2kvheaders}=exports
  replaceHeader(result.responseHeaders, 'Access-Control-Allow-Credentials', 'true')
  replaceHeader(result.responseHeaders, 'Access-Control-Allow-Origin', headers.Origin||'*')
  replaceHeader(result.responseHeaders, 'Access-Control-Allow-Method', '*')
  replaceHeader(result.responseHeaders, 'Access-Control-Allow-Headers', '*')

  const responseHeadersNode=headers2kvheaders(result.responseHeaders).reduce((a, {name, value})=>{
    name=update_header_key(name)
    if(!Array.isArray(value)) value=[value]
    if(!a[name]) a[name]=value
    else a[name]=a[name].concat(value)
    return a
  }, {})
  result.responseHeadersNode=responseHeadersNode
  result.responseHeadersArray=headers2kvheaders(responseHeadersNode)
}
/**
 success: resolve({
   status: statusCode,
   responseHeaders: {...},
   responseHeadersNode: {...},
   responseHeadersArray: [...],
   response: Buffer,
})
 failed: reject(Error)
 */
exports.fetchUrl=async ({url, method, postData, headers, timeout})=>{
  const {proxy}=require('./get_apis')()
  timeout=timeout || exports.DEFAULT_NETWORK_TIMEOUT
  const result=await fetchUrl({url, method, postData, headers, timeout, proxySettings: proxy}).result
  const content_type=getHeader(result.responseHeaders, 'Content-Type')
  const html=Buffer.from(result.response.slice(0, 2000)).toString('utf-8')
  if(content_type.match(/charset.*?gb/i) || html.match(/meta.*?Content-Type[^>]*gb/i)) {
    replaceHeader(result.responseHeaders, 'Content-Type', 'text/html;charset=utf-8')
    try{result.response=Buffer.from(iconv.decode(result.response, 'gbk'))}catch(e) {}
  }
  deleteHeader(result.responseHeaders, 'ETag')
  exports.updateResultResponseHeaders(result, headers)
  return result
}

exports.headers2kvheaders=headers=>{
  const nh=[]
  for(let key in headers) {
    let values=headers[key]
    ; (values.constructor===Array? values: [values]).map(value=>{
      nh.push({name: exports.update_header_key(key), value: value+''})
    })
  }
  return nh
}

exports.getHeader=getHeader
exports.deleteHeader=deleteHeader

exports.requestPipe=async ({
  url, method, postData, headers, timeout,
  requestOrigin, responseOrigin,
})=>new Promise(async (resolve, reject)=>{
  headers=JSON.parse(JSON.stringify(headers))
  const uu=require('url')
  if(headers.Referer) headers.Referer=requestOrigin+uu.parse(headers.Referer).path
  headers.Origin=requestOrigin
  headers.Host=uu.parse(responseOrigin).host
  url=responseOrigin+uu.parse(url).path
  try{
    resolve(await exports.fetchUrl({url, method, postData, headers, timeout}))
  }catch(e) {
    reject()
  }
})
exports.update_header_key=key=>{
  return key.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())
}

exports.ERROR_TIMEOUT_FETCH={
  status: 503,
  responseHeaders: {'Chrome-Dev-Tool': 'Fetch-Timeout'},
  response: "",
}
exports.ERROR_FAILED_FETCH={
  status: 444,
  responseHeaders: {'Chrome-Dev-Tool': 'Fetch-Failed'},
  response: "",
}
exports.ERROR_TIMEOUT=NETWORK_TIMEOUT_ERROR
exports.DEFAULT_NETWORK_TIMEOUT=10e3

exports.getPageUrl=async page=>{
  try{
    return await page.evaluate(_=>location.href)
  }catch(e) {}
}

exports.sandboxTool=async page=>{
  const ret={page}
  const {sleep, getPageUrl}=exports
  ret.sleep=sleep
  ret.url=await getPageUrl(page)

  // 模拟事件文档参考
  // https://github.com/puppeteer/puppeteer/blob/master/docs/api.md#class-mouse

  return ret

  /*

  ret.$=async q=>{
    for(;;) {
      const f=await page.$(q)
      if(f) return f
      await sleep(1e2)
    }
  }
  const _wrap=fn=>async q=>{
    await ret.$(q)
    await fn(q)
  }
  ret.mouse={}
  ret.mouse.focus=_wrap(async q=>{
    await page.focus(q)
  })
  ret.mouse.click=_wrap(async q=>{
    await page.evaluate(q=>{
      document.querySelector(q).click()
    }, q)
  })
  ret.mouse.hover=_wrap(async q=>{
    await page.hover(q)
  })

  // https://github.com/GoogleChrome/puppeteer/blob/v1.18.1/lib/USKeyboardLayout.js
  ret.keyboard={}
  ret.keyboard.type=async str=>{
    await page.keyboard.type(str)
  }
  ret.keyboard.ctrlBackspace=async _=>{
    await page.keyboard.down('Control')
    await page.keyboard.press('Backspace')
    await page.keyboard.up('Control')
  }
  ret.keyboard.enter=async _=>{
    await page.keyboard.press('Enter')
  }

  return ret
  */
}


/*
 Input:
 url='http://aa.cc/cdsc?a=22#333?cxp=c&dasc=22'

 Output:
 {
   hash: {cxp: "c", dasc: "22"},
   query: {a: "22"},
 }
 */
exports.queryAll=function(url) {
  const res={query: {}, hash: {}}
  try{
    const bind=(a, b)=>url.replace(a, '$1').split(/&|\?/).map(s=>{
      s.replace(/^(.*?)=(.*$)/, (_, k, v)=>res[b][decodeURIComponent(k)]=decodeURIComponent(v))
    })
    bind(/^[^#\?]+\?(.*?)(?:#.*)*$|^.*$/, 'query')
    bind(/^.+?#.*?\?(.*$)|^.*$/, 'hash')
  }catch(e) {}
  return res
}