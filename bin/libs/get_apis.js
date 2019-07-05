const {md5, cut, requireFile, DEFAULT_NETWORK_TIMEOUT}=require(__dirname+'/common')
const url2filename=({url, requestHeaders, addResponseHeader, postData})=>{
  return __dirname+'/../../data/'+url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
    return a.replace(/\:/,'_')+'/'+(md5(url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
  })
}
const url2response=({response})=>response
const should_no_cache=_=>false
const write_cache=false
const network_timeout=DEFAULT_NETWORK_TIMEOUT

const aa=(a, b)=>a===undefined?b:a
const ss=(a, b)=>async c=>(await aa(a,b)(c))||b(c)
module.exports=_=>{
  let hooks=requireFile(__dirname+'/../../hooks.js')
  if(hooks.HOOKS_FILE) hooks=requireFile(hooks.HOOKS_FILE)
  return {
    // 自定义 url2filename 和 url2response 不返回值的情况下，将使用默认返回值
    // should_no_cache 无返回值当作返回false处理
    url2filename: ss(hooks.url2filename, url2filename),
    url2response: ss(hooks.url2response, url2response),
    should_no_cache: aa(hooks.should_no_cache, should_no_cache),
    write_cache: aa(hooks.WRITE_CACHE, write_cache),
    network_timeout: aa(hooks.NETWORK_TIMEOUT, network_timeout),
  }
}
