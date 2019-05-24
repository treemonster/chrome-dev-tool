const SPEC_STR='\0\1\2\3\4\0TREEMONSTER'
const node2chrome=client=>expression=>new Promise(resolve=>{
  let {Runtime}=client
  Runtime.evaluate({expression}, (_, {result})=>resolve(result.value))
})
const chrome2node=client=>async ({message})=>{
  let {text}=message
  let bg=BackgroundAPI(client)
  try{text=JSON.parse(text)}catch(e){}
  if(!text || text[0]!==SPEC_STR) return;
  let [_, ID, fn, ...args]=text
  let result=await bg[fn].apply({}, args)
  let _node2chrome=node2chrome(client)
  _node2chrome(`window[${JSON.stringify(SPEC_STR)}].callback(${JSON.stringify([ID, result])})`)
}

const BackgroundAPI=client=>({
  captureScreenshot: async _=>{
    let {Page, Runtime}=client
    let {data}=await Page.captureScreenshot({
      format: 'jpeg',
      quality: 35,
      fromSurface: true,
      clip: JSON.parse(await new Promise(r=>{
        Runtime.evaluate({expression: `JSON.stringify({
          x: 0,
          y: 0,
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          scale: 1,
        })`}, (_, {result})=>r(result.value))
      }))
    })
    return data
  }
})
const FrontAPI=(div, logpanel, callFn)=>({
  captureScreenshot: async _=>{
  	div.style.display='none'
    let png=await Promise.resolve(callFn('captureScreenshot').promise)
    div.style.display='block'
    logpanel.innerHTML='<img src="data:image/png;base64,'+png+'" width="200" />'
  },
})

const CHROME_TOOL_INITJS='('+((SPEC_STR, FrontAPI)=>{
  if(window[SPEC_STR]) return;
  let _tasks={}
  const callFn=function(){
    const ID=Math.random()+Date.now()
    _tasks[ID]=defer()
    console.log(JSON.stringify([SPEC_STR, ID].concat(Array.prototype.slice.call(arguments))))
    return _tasks[ID]
  }
  function defer() {
    let d = {}, promise = new Promise((resolve, reject)=>{
      d={resolve, reject}
    })
    d.promise=promise
    return d
  }
  const d=document.createElement('div')
  d.style.cssText=`
    position: fixed;
    right: 0;
    background: #feecba;
    z-index: 99999;
    width: 100%;
    height: 100px;
    bottom: 0px;
    border-top: 2px solid #ccc;
    text-align: center;
    display: none;
  `
  d.innerHTML=`
    <button onclick='window[${JSON.stringify(SPEC_STR)}].api.captureScreenshot()'>屏幕截图</button>
    <div id='logpanel'></div>
  `
  document.body.appendChild(d)
  window[SPEC_STR]={
    callback: ([ID, result])=>{
      _tasks[ID].resolve(result)
    },
    api: FrontAPI(d, logpanel, callFn),
  }
})+')('+JSON.stringify(SPEC_STR)+','+FrontAPI+')'


module.exports={
  SPEC_STR,
  node2chrome,
  chrome2node,
  BackgroundAPI,
  FrontAPI,
  CHROME_TOOL_INITJS,
}
