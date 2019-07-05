const {sleep, fetchUrl}=require('./common')

module.exports=({
  responseStatusCode,
  request,
  responseHeaders,
  network_timeout,
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
    sleep,
    setStatusCode: (code=200)=>{
      Args.status=code
    },
    requestPipe: ({
      requestOrigin,
      responseOrigin,
      timeout,
    })=>new Promise(async (resolve, reject)=>{
      const {url, method, postData, headers}=request
      Args.updateCORSHeaders()
      const {Referer}=headers
      if(Referer) headers.Referer=requestOrigin+require('url').parse(Referer).path
      headers.Origin=requestOrigin
      try{
        const {status, headers, response}=await fetchUrl({
          url, method, postData, headers,
          timeout: timeout||network_timeout,
        })
        Args.setStatusCode(status)
        for(let key in headers) Args.addResponseHeader(key, headers[key])
        resolve(response)
      }catch(e) {
        reject()
      }
    }),
  }
  return Args
}