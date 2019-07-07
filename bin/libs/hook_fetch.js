const {NOTHING, sleep, fetchUrl, getResponseHeader, deleteResponseHeader, requestPipe, update_header_key}=require('./common')
module.exports=async ({
  // request
  url, method, postData, headers,

  // response
  status, responseHeaders, response,

  // apis
  url2filename, url2response, should_no_cache, write_cache, network_timeout,
})=>{
  const result={
    status,
    response,
    responseHeaders,
  }

  const _addHeaders=[]
  const Args={
    url, method, postData, headers,
    requestHeaders: headers,
    response: null,
    responseHeaders,
    updateCORSHeaders: _=>Args.addResponseHeader({
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': Args.requestHeaders.Origin||'*',
    }),
    addResponseHeader: (key, value)=>{
      if(typeof key!=='string') for(let k in key) _addHeaders.push([k, key[k]])
      else _addHeaders.push([key, value])
    },
    getResponseHeader: key=>getResponseHeader(responseHeaders, key),
    go302: (r_url)=>{
      Args.addResponseHeader('Location', r_url)
      result.status=302
    },
    deleteResponseHeader: key=>deleteResponseHeader(responseHeaders, key),
    sleep,
    setStatusCode: (code=200)=>result.status=code,
    getStatusCode: _=>result.status,
    requestPipe: async ({requestOrigin, responseOrigin, timeout})=>{
      Args.updateCORSHeaders()
      const {status, responseHeaders, response}=await requestPipe({
        url, method, postData, headers,
        timeout: timeout || network_timeout,
        requestOrigin, responseOrigin,
      })
      Args.setStatusCode(status)
      Args.addResponseHeader(responseHeaders)
      return response
    }
  }

  let fn, cache
  if(write_cache) {
    fn=await url2filename(Args)
    cache=readFileSync(fn)
    if(cache && !should_no_cache(Args)) response=cache
  }
  Args.response=response
  response=await url2response(Args)
  result.response=response
  if(status!==200 && (!response || !response.length)) return result
  if(write_cache && Buffer.compare(
    Buffer.from(cache||NOTHING),
    Buffer.from(response))
  ) writeFileSync(fn, response)

  const a_responseHeaders={}
  Args.addResponseHeader('Content-Length', result.response.length)
  _addHeaders.map(([key, value])=>{
    a_responseHeaders[update_header_key(key)]=value
    Args.deleteResponseHeader(key)
  })
  for(let key in Args.responseHeaders) {
    a_responseHeaders[update_header_key(key)]=Args.responseHeaders[key]
  }

  return result
}
