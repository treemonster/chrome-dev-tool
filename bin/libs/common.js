const fs=require('fs')
const path=require('path')
const crypto=require('crypto')
const iconv=require('iconv-lite')
const getPort = require('get-port')
const url=require('url')
const querystring=require('querystring')

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
    console.log('Failed to load '+abs_fn+': ', e)
  }
}
const DEFAULT_NETWORK_TIMEOUT=10e3
const error_timeout=new Error('timeout')
/**
 success: resolve({status: statusCode, responseHeaders: {...}, response: Buffer})
 failed: reject(Error)
 */
exports.fetchUrl=({url, method, postData, headers, timeout})=>new Promise((resolve, reject)=>{
  const u=require('url')
  let {protocol, hostname, port, path}=u.parse(url)
  let tout=null, update_tout=_=>{
    clearTimeout(tout)
    tout=setTimeout(_=>reject(error_timeout), timeout||DEFAULT_NETWORK_TIMEOUT)
  }
  update_tout()
  let http
  if(protocol==='http:') {
    http=require('http')
    port=port||80
  }else{
    http=require('https')
    port=port||443
  }
  method=method||'GET'
  headers=headers||{}
  if(postData) headers['Content-Length']=Buffer.byteLength(postData)
  const req=http.request({
    method, headers,
    hostname, port, path,
    timeout,
  }, res=>{
    const result={
      status: res.statusCode,
      responseHeaders: res.headers,
      response: Buffer.alloc(0),
    }
    update_tout()
    res.on('data', chunk=>{
      update_tout()
      result.response=Buffer.concat([result.response, chunk])
    })
    res.on('end', _=>{
      const content_type=exports.getHeader(result.responseHeaders, 'Content-Type')
      const html=result.response.slice(0, 2000).toString('utf-8')
      if(content_type.match(/charset.*?gb/i) || html.match(/meta.*?Content-Type.*?gb/i)) {
        exports.deleteHeader(result.responseHeaders, 'Content-Type')
        result.responseHeaders['Content-Type']='text/html;charset=utf-8'
        try{result.response=Buffer.from(iconv.decode(result.response, 'gbk'))}catch(e) {}
      }
      resolve(result)
      clearTimeout(tout)
    })
    res.on('error', e=>{
      reject(e)
      clearTimeout(tout)
    })
  })
  if(postData) req.write(postData)
  req.end()
})

exports.headers2kvheaders=headers=>{
  const nh=[]
  for(let key in headers) {
    let values=headers[key]
    ; (values.constructor===Array? values: [values]).map(value=>{
      nh.push({name: exports.update_header_key(key), value})
    })
  }
  return nh
}

exports.getHeader=(Headers, key)=>{
  for(let k in Headers) {
    if(key.toLowerCase()!==k.toLowerCase()) continue
    return Headers[k]
  }
  return ''
}

exports.deleteHeader=(Headers, key)=>{
  if(Array.isArray(key)) return key.map(k=>{
    exports.deleteHeader(Headers, k)
  })
  for(let k in Headers) {
    if(key.toLowerCase()!==k.toLowerCase()) continue
    delete Headers[k]
  }
}

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
    console.log(e)
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
exports.ERROR_TIMEOUT=error_timeout
exports.DEFAULT_NETWORK_TIMEOUT=DEFAULT_NETWORK_TIMEOUT
const getQuery=link=>querystring.parse(url.parse(link).query)
exports.newLocalServer=async _=>{
  const port=await getPort()
  const {deleteHeader, update_header_key}=exports
  let hookHandler=null, requestIds=null
  require('http').createServer((req, res)=>{
    const id=decodeURIComponent(getQuery(req.url).id)
    const reqObj={
      url: requestIds[id].url,
      headers: requestIds[id].headers,
      method: requestIds[id].method,
      postData: Buffer.alloc(0),
    }
    const {host, protocol}=url.parse(reqObj.url)
    deleteHeader(reqObj.headers, ['origin', 'host', 'accept-encoding'])
    reqObj.headers.Host=host
    reqObj.headers.Origin=protocol+'//'+host
    req.on('data', buf=>reqObj.postData=Buffer.concat([reqObj.postData, buf]))
    req.on('end', async _=>{
      delete requestIds[id]
      const {responseCode, responseHeaders, response}=await hookHandler(reqObj)
      const hs=responseHeaders.concat([
/*
        {name: 'X', value: 'z1'},
        {name: 'X', value: 'z2'},
        {name: 'Y', value: ['z1', 'z2']},
        {name: 'Set-Cookie', value: [
          'X1=222; path=/; HttpOnly; expires=Wed, 08-Jul-20 04:17:17 GMT; max-age=31536000;',
          'X2=333; path=/; HttpOnly; domain=127.0.0.1',
          'X5=556; expires=Wed, 08-Jul-20 04:17:17 GMT;',
          'X6=556; domain=127.0.0.1:81; expires=Wed, 08-Jul-20 04:17:17 GMT;',
          'X3=555; path=/; HttpOnly; expires=Wed, 08-Jul-20 04:17:17 GMT; max-age=31536000;',
        ]},
        Set-Cookie 不生效，待排查
*/
      ]).reduce((a, {name, value})=>{
        name=update_header_key(name)
        if(!Array.isArray(value)) value=[value]
        if(!a[name]) a[name]=value
        else a[name]=a[name].concat(value)
        return a
      }, {})
      for(let name in hs) res.setHeader(name, hs[name])
      res.writeHead(responseCode, {})
      res.end(response)
    })
  }).listen(port)
  return {
    port,
    bindHookHandler: (handler, id_map)=>{
      hookHandler=handler
      requestIds=id_map
    },
  }
}



