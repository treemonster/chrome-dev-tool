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
      nh.push({name: exports.update_header_key(key), value: value+''})
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
    reject()
  }
})
exports.update_header_key=key=>{
  return key.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())
}

const callSetCookiePage=async (setCookies, url, idMap, id)=>{
  if(!setCookies || !setCookies.length) return false
  idMap[id].setCookies=setCookies
  const page=await idMap[id].page.browser().newPage()
  await page.goto(url+'&?Do-Set-Cookie-requestId='+id)
  await page.close()
  /*
  .evaluate(({url, id})=>{
    (new Image).src=url+'&?Do-Set-Cookie-requestId='+id
  }, {url, id})
  */
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
  const {deleteHeader, update_header_key, headers2kvheaders}=exports
  let hookHandler=null, idMap=null
  require('http').createServer((req, res)=>{
    const id=decodeURIComponent(getQuery(req.url).id)
    const {request, page}=idMap[id]
    const reqObj={
      url: request.url,
      headers: request.headers,
      method: request.method,
      postData: Buffer.alloc(0),
    }
    const {host, protocol}=url.parse(reqObj.url)
    deleteHeader(reqObj.headers, ['host', 'accept-encoding'])
    reqObj.headers.Host=host

    req.on('data', buf=>reqObj.postData=Buffer.concat([reqObj.postData, buf]))
    req.on('error', _=>{
      delete idMap[id]
    })
    req.on('end', async _=>{
      const {responseCode, responseHeaders, response}=await hookHandler(reqObj)
      const responseHeadersArray=headers2kvheaders(responseHeaders.reduce((a, {name, value})=>{
        name=update_header_key(name)
        if(!Array.isArray(value)) value=[value]
        if(!a[name]) a[name]=value
        else a[name]=a[name].concat(value)
        return a
      }, {}))
      idMap.resCaches[reqObj.url+'\n'+reqObj.method]={
        responseCode,
        response,
        responseHeadersArray,
      }

      let _url=page.target().url()
      if(_url.indexOf(reqObj.url+'#')===0) reqObj.url=_url

      // 307 保持请求方式和参数
      res.writeHead(307, {
        Location: reqObj.url,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': reqObj.headers.Origin||'*',
      })
      res.end()
    })
  }).listen(port)
  return {
    port,
    bindHookHandler: (handler, id_map)=>{
      hookHandler=handler
      idMap=id_map
    },
  }
}

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
  ret.evaluate=page.evaluate.bind(page)

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
}

