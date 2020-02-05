const {
  NOTHING,
  sleep, fetchUrl, getHeader, deleteHeader,
  requestPipe, update_header_key,
  ERROR_TIMEOUT, ERROR_TIMEOUT_FETCH, ERROR_FAILED_FETCH,
  readFileSync, writeFileSync,
  updateResultResponseHeaders,
  queryAll,
}=require('./common')

/**
 return {
   // 原始请求数据
   url, method, postData, requestHeaders,

   // 不依赖响应的方法
   go302(),
   sleep(),
   requestPipe(),

   // 等待响应，如果需要使用原始请求的数据
   waitForResponse(),

   // 响应值相关方法
   // 获取类的方法，没有调用 waitForResponse 之前，取到的数据都是空的
   addResponseHeader(),
   getResponseHeader(),
   deleteResponseHeader(),
   setResponseType(),
   getResponse(),
   getStatusCode(),
   setStatusCode(),

   // 页面唯一标识
   pageId,

 }
 */
let __caches={}, __caches_url=/$^/
const makeArgs=({
  url, method, postData, headers,

  url2cachefile, network_timeout,

  pageId,
})=>{
  const result={
    status: 0,
    response: null,
    responseHeaders: null,
  }

  const Args={
    url,
    method,
    postData,
    requestHeaders: headers,

    queryAll,

    sleep,

    pageId,

  }

  Args.queryAll=queryAll(url)

  Args.go302=r_url=>{
    result.status=302
    addResponseHeader('Location', r_url)
  }
  const _addHeaders={}, addResponseHeader=(key, value)=>{
    if(typeof key!=='string') for(let k in key) addResponseHeader(k, key[k])
    else if(Array.isArray(value)) value.map(v=>addResponseHeader(key, v))
    else {
      _addHeaders[key]=_addHeaders[key]||[]
      _addHeaders[key].push(value)
    }
  }
  Args.addResponseHeader=addResponseHeader
  Args.requestPipe=async ({requestOrigin, responseOrigin, timeout})=>{
    const {status, responseHeaders, response}=await requestPipe({
      url, method, postData, headers,
      timeout: timeout || network_timeout,
      requestOrigin, responseOrigin,
    })
    result.status=status
    addResponseHeader(responseHeaders)
    return response
  }
  Args.waitForResponse=async _=>{
    let res=null
    let cache_fn=await url2cachefile(Args), cache_fn_headers=cache_fn+'.headers', ch, ch_headers
    if(cache_fn) try{
      ch=readFileSync(cache_fn)
      ch_headers=JSON.parse(readFileSync(cache_fn_headers).toString('utf8'))
    }catch(e) {}

    if(ch && ch_headers) res={
      status: 200,
      responseHeaders: ch_headers,
      response: ch,
    }
    else try{
      res=await fetchUrl({url, method, postData, headers, timeout: network_timeout})
      if(cache_fn && Buffer.compare(...[ch||NOTHING, res.response].map(b=>Buffer.from(b)))) {
        deleteHeader(res.responseHeaders, ['Etag', 'Last-Modified'])
        writeFileSync(cache_fn_headers, JSON.stringify(res.responseHeaders))
        writeFileSync(cache_fn, res.response)
      }
    }catch(e) {
      if(e===ERROR_TIMEOUT) res=ERROR_TIMEOUT_FETCH
      else res=ERROR_FAILED_FETCH
    }
    result.status=res.status
    result.responseHeaders=res.responseHeaders
    result.response=res.response
  }
  Args.getResponseHeader=key=>result.status!==0 && getHeader(result.responseHeaders, key)
  Args.deleteResponseHeader=key=>result.status!==0 && deleteHeader(result.responseHeaders, key)
  Args.setResponseType=type=>{
    const c=({
      html: {'Content-Type': 'text/html;charset=UTF-8'},
      json: {'Content-Type': 'text/json;charset=UTF-8'},
      js: {'Content-Type': 'text/javascript;charset=UTF-8'},
      css: {'Content-Type': 'text/css;charset=UTF-8'},
    })[(type||'json').toLowerCase()]
    c && addResponseHeader(c)
  }
  Args.getAllResponseHeaders=_=>{
    const hs={}
    if(result.responseHeaders) for(let key in result.responseHeaders) {
      hs[update_header_key(key)]=result.responseHeaders[key]
    }
    for(let key in _addHeaders) {
      hs[update_header_key(key)]=_addHeaders[key]
    }
    return hs
  }

  Args.getResponse=_=>result.response
  Args.getStatusCode=_=>result.status
  Args.setStatusCode=status=>result.status=status

  Args.cacheUrlBy=urlReg=>{
    __caches_url=urlReg
    return urlReg && url.match(urlReg) && __caches[url] && !0 || !1
  }
  Args.cacheData=_=>__caches[url]
  Args.cacheClear=(urlReg=/^/)=>{
    for(let k in __caches) if(k.match(urlReg)) delete __caches[k]
  }

  return Args
}


module.exports=async ({
  // request
  url, method, postData, headers,

  // apis
  url2cachefile, url2response, network_timeout,
}, pageId)=>{
  const Args=makeArgs({
    url, method, postData, headers,
    url2cachefile, network_timeout,
    pageId,
  })
  const hooked_response=await url2response(Args)
  const len=Buffer.from(hooked_response||'').length
  len>0 && Args.addResponseHeader('Content-Length', len)
  const result={
    status: Args.getStatusCode() || 200,
    responseHeaders: Args.getAllResponseHeaders(),
    response: hooked_response,
  }
  updateResultResponseHeaders(result, headers)
  if(url.match(__caches_url) && !__caches[url]) __caches[url]=result
  return result
}
