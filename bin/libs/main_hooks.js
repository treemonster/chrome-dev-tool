const CDP = require('chrome-remote-interface')
const puppeteer = require('puppeteer-core')
const findChrome = require('chrome-finder')
const path = require('path')

const get_apis=require('./get_apis')
const do_hooks=require('./do_hooks')
const {sleep, getPageUrl, sandboxTool, deleteHeader, headers2kvheaders}=require('./common')

exports.hookRequest=async request=>{
  const {url, method, postData, headers}=request

  const hooks=get_apis()
  let cors_origin=''
  if(headers.Referer) {
    const {host, protocol}=require('url').parse(headers.Referer)
    cors_origin=protocol+'//'+host
  }
  const resp=({status, responseHeaders, response})=>{
    deleteHeader(responseHeaders, ['Access-Control-Allow-Credentials', 'Access-Control-Allow-Origin'])
    return {
      responseCode: status,
      responseHeaders: headers2kvheaders(responseHeaders).concat([
        {name: 'Access-Control-Allow-Credentials', value: 'true'},
        {name: 'Access-Control-Allow-Origin', value: cors_origin || '*'},
      ]),
      response: Buffer.from(response),
    }
  }

  const fetchObj=Object.assign({
    url, method, postData, headers,
    timeout: hooks.network_timeout,
  }, hooks)
  return resp(await do_hooks(fetchObj))

}

exports.watchClient=async onClient=>{
  const targetsHooked={}
  puppeteer.launch({
    defaultViewport: null,
    ignoreDefaultArgs: true,
    args: [
      '--disable-breakpad',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--auto-open-devtools-for-tabs',
      '--no-first-run',
      '--user-data-dir='+path.normalize(__dirname+'/../../browser-data'),
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
      await onClient(client, page)
      let load_flag=''
      page.on('domcontentloaded', async _=>{
        load_flag=Math.random()
        let _load_flag=load_flag
        for(let _url=''; load_flag===_load_flag; ) {
          try{await page.evaluate(_=>1)}catch(e){break}
          await sleep(1e2)
          const url=await getPageUrl(page)
          if(!url || url===_url) continue
          _url=url
          const {runScriptOnUrlChange}=get_apis()
          if(!runScriptOnUrlChange) return;
          runScriptOnUrlChange(await sandboxTool(page))
        }
      })
      page.reload()
    }
    browser.targets().map(bindTarget)
    ; ['targetcreated', 'targetchanged'].map(t=>browser.on(t, bindTarget))

    browser.on('disconnected', _=>{
      process.exit()
    })
  })

}
