const makeRequestPipe=({url, method, postData, headers}, Args)=>({
  requestOrigin,
  responseOrigin,
  timeout,
})=>new Promise((resolve, reject)=>{
  Args.updateCORSHeaders()
  const uu=require('url')
  let {protocol, hostname, port}=uu.parse(responseOrigin)
  const {path}=uu.parse(url)
  timeout=timeout||3e3
  const tout=setTimeout(_=>reject(), timeout)
  let http
  if(protocol==='http:') {
    http=require('http')
    port=port||80
  }else{
    http=require('https')
    port=port||443
  }
  if(headers.Referer) headers.Referer=requestOrigin+uu.parse(headers.Referer).path
  headers.Origin=requestOrigin

  if(postData) headers['Content-Length']=Buffer.byteLength(postData)
  const req=http.request({
    hostname,
    port,
    method,
    path,
    headers,
    timeout,
  }, res=>{
    Args.setStatusCode(res.statusCode)
    // res.headers
    let buf=Buffer.alloc(0)
    res.on('data', (chunk) => buf=Buffer.concat([buf, chunk]))
    res.on('end', _=>{
      resolve(buf)
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

module.exports=({
  responseStatusCode,
  request,
  responseHeaders,
})=>{
  const Args={
    addHeaders: [],
    status: responseStatusCode,
    url: request.url,
    postData: request.postData,
    requestHeaders: request.headers,
    response: null,
    responseHeaders,
    updateCORSHeaders: _=>{
      Args.addResponseHeader('Access-Control-Allow-Credentials', 'true')
      Args.addResponseHeader('Access-Control-Allow-Origin', Args.requestHeaders.Origin)
    },
    addResponseHeader: (key, value)=>{
      Args.addHeaders.push([key, value])
    },
    getResponseHeader: (key)=>{
      for(let k in responseHeaders) {
        if(key.toLowerCase()!==k.toLowerCase()) continue
        return responseHeaders[k]
      }
      return ''
    },
    go302: (r_url)=>{
      Args.addResponseHeader('Location', r_url)
      Args.status=302
    },
    deleteResponseHeader: (key)=>{
      for(let k in responseHeaders) {
        if(key.toLowerCase()!==k.toLowerCase()) continue
        delete responseHeaders[k]
      }
    },
    sleep: ms=>new Promise(r=>setTimeout(r, ms)),
    setStatusCode: (code=200)=>{
      Args.status=code
    },
  }
  Args.requestPipe=makeRequestPipe(request, Args)
  return Args
}