const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer-core')
const findChrome = require('chrome-finder')

const get_apis=require('./get_apis')
const {
  NOTHING,
  sleep, fetchUrl, getHeader, deleteHeader,
  requestPipe, update_header_key, headers2kvheaders,
  ERROR_TIMEOUT, ERROR_TIMEOUT_FETCH, ERROR_FAILED_FETCH,
}=require('./common')

const do_hooks=async ({
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
    url, method, postData,
    requestHeaders: headers,
    response: null,
    responseHeaders,
    updateCORSHeaders: _=>Args.addResponseHeader({
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': headers.Origin||'*',
    }),
    addResponseHeader: (key, value)=>{
      if(typeof key!=='string') for(let k in key) _addHeaders.push([k, key[k]])
      else _addHeaders.push([key, value])
    },
    getResponseHeader: key=>getHeader(responseHeaders, key),
    go302: (r_url)=>{
      Args.addResponseHeader('Location', r_url)
      result.status=302
    },
    deleteResponseHeader: key=>deleteHeader(responseHeaders, key),
    sleep,
    setStatusCode: (code=200)=>result.status=code,
    getStatusCode: _=>result.status,
    requestPipe: async ({requestOrigin, responseOrigin, timeout})=>{
      const {status, responseHeaders, response}=await requestPipe({
        url, method, postData, headers,
        timeout: timeout || network_timeout,
        requestOrigin, responseOrigin,
      })
      Args.setStatusCode(status)
      Args.addResponseHeader(responseHeaders)
      Args.updateCORSHeaders()
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
  Args.addResponseHeader('Content-Length', result.response.length+'')
  _addHeaders.map(([key, value])=>{
    a_responseHeaders[update_header_key(key)]=value
    Args.deleteResponseHeader(key)
  })
  for(let key in Args.responseHeaders) {
    a_responseHeaders[update_header_key(key)]=Args.responseHeaders[key]
  }
  result.responseHeaders=a_responseHeaders
  return result
}

exports.hookRequest=async request=>{
  const {url, method, postData, headers}=request

  const hooks=get_apis()
  const resp=({status, responseHeaders, response})=>({
    responseCode: status,
    responseHeaders: headers2kvheaders(responseHeaders),
    response: Buffer.from(response),
  })

  try{
    const fetchObj={
      url, method, postData, headers,
      timeout: hooks.network_timeout,
    }
    const hookObj=Object.assign(
      fetchObj,
      hooks,
      await fetchUrl(fetchObj),
    )
    return resp(await do_hooks(hookObj))
  }catch(e) {
    if(e===ERROR_TIMEOUT) return resp(ERROR_TIMEOUT_FETCH)
    else return resp(ERROR_FAILED_FETCH)
  }
}

exports.watchClient=async onClient=>{
  const targetsHooked={}
  puppeteer.launch({
    defaultViewport: null,
    ignoreDefaultArgs: true,
    args: [
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--auto-open-devtools-for-tabs',
      '--no-first-run',
      'about:blank',
    ],
    executablePath: findChrome(),
  }).then(async browser => {

    const options={
      port: browser.wsEndpoint().replace(/^.*\/\/.*?\:(\d+).*/,'$1'),
    }

    // https://github.com/GoogleChrome/puppeteer/issues/3667
    // 新开页面到cdp可以博捕捉之间有一段空隙时间，这段时间无法注入代码，暂无解决方案
    // 目前我所使用的reload方式，仅仅让新页面在和cdp建立连接之后重新载入，但在reload之前所发出的请求已确实被后台所记录了
    // 所以这个方式治标不治本，在特定情况下会引入其他错误。例如页面打开之后调用了统计访问次数的接口，那么这个接口就有可能被调用两次

    const bindTarget=async target=>{
      const page=await target.page()
      if(!page) return
      const {targetId}=target._targetInfo
      if(targetsHooked[targetId]) return 1
      targetsHooked[targetId]=1
      const client=await CDP(Object.assign({target: targetId}, options))
      await onClient(client)
      page.reload()
    }
    browser.targets().map(bindTarget)
    ; ['targetcreated', 'targetchanged'].map(t=>browser.on(t, bindTarget))

    browser.on('disconnected', _=>{
      process.exit()
    })
  })

}
