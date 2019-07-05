const fs=require('fs')
const path=require('path')
const crypto=require('crypto')
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

const error_timeout=new Error('timeout')
/**
 success: resolve({status: statusCode, headers: {...}, response: Buffer})
 failed: reject(Error)
 */
exports.fetchUrl=({url, method, postData, headers, timeout})=>new Promise((resolve, reject)=>{
  const u=require('url')
  let {protocol, hostname, port, path}=u.parse(url)
  const tout=setTimeout(_=>reject(error_timeout), timeout||3e3)
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
      headers: res.headers,
      response: Buffer.alloc(0),
    }
    res.on('data', chunk=>{
      result.response=Buffer.concat([result.response, chunk])
    })
    res.on('end', _=>{
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

exports.ERROR_TIMEOUT=error_timeout

