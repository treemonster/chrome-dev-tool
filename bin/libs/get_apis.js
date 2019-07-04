const {md5, cut}=require(__dirname+'/common')
const url2filename=({url, requestHeaders, addResponseHeader, postData})=>{
  return __dirname+'/../../data/'+url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
    return a.replace(/\:/,'_')+'/'+(md5(url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
  })
}
const url2response=({response})=>response
const should_no_cache=_=>false

const fs=require('fs')
const path=require('path')
const require_file_mtime={}
const requireFile=function(fn) {
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

const ss=(a, b)=>async c=>(await (a||b)(c))||b(c)
module.exports=_=>{
  let hooks=requireFile(__dirname+'/../../hooks.js')
  if(hooks.HOOKS_FILE) hooks=requireFile(hooks.HOOKS_FILE)
  return {
    // 自定义 url2filename 和 url2response 不返回值的情况下，将使用默认返回值
    // should_no_cache 无返回值当作返回false处理
    url2filename: ss(hooks.url2filename, url2filename),
    url2response: ss(hooks.url2response, url2response),
    should_no_cache: hooks.should_no_cache||should_no_cache,
  }
}
