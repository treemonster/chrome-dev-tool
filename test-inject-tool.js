const core=require('./bin/core')
// true表示打开一个headless chrome
// 第二个参数为hooks.js的内容
core(true, {
  url2cachefile: ({url})=>{
  	console.log("##", url)
    if(url.match(/nodejs\.cn\//)) return __dirname+'/nodejs.cn.html'
  }
}).then(async browser=>{
  // 获取browser实例
  const page=await browser.newPage()
  page.goto('http://nodejs.cn')
  await new Promise(r=>setTimeout(r, 3e3))
  browser.close()
})
