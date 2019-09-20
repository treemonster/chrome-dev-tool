const {md5, cut, requireFile, DEFAULT_NETWORK_TIMEOUT}=require(__dirname+'/common')
const _default_url2cachefile=({url})=>{
  return __dirname+'/../../data/'+url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
    return a.replace(/\:/,'_')+'/'+(md5(url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
  })
}

// 默认不写入缓存
const url2cachefile=_=>false
const url2response=async ({
  getResponse,
  waitForResponse,
})=>{
  await waitForResponse()
  return getResponse()
}
const network_timeout=DEFAULT_NETWORK_TIMEOUT
const runScriptOnUrlChange=null
// false 不使用代理，true 使用系统代理，{src: 'http://127.0.0.1:8080', ignore: /127\./} 用户自定义代理
const proxy=false
// useragent 为null时使用默认值
const useragent=null

const aa=(a, b)=>a===undefined?b:a
const ss=(a, b)=>async c=>(await aa(a,b)(c))||b(c)
module.exports=_=>{
  let hooks=global.HOOKS_JS_INJECT||requireFile(__dirname+'/../../hooks.js')||{}
  if(hooks.HOOKS_FILE) hooks=requireFile(hooks.HOOKS_FILE)
  return {
    url2cachefile: async c=>{
      let p=await (ss(hooks.url2cachefile, url2cachefile)(c))
      if(p===true) p=_default_url2cachefile(c)
      return p
    },
    url2response: ss(hooks.url2response, url2response),
    network_timeout: aa(hooks.NETWORK_TIMEOUT, network_timeout),
    runScriptOnUrlChange: aa(hooks.runScriptOnUrlChange, runScriptOnUrlChange),
    proxy: hooks.proxy || proxy,
    useragent: hooks.useragent || useragent,
  }
}
