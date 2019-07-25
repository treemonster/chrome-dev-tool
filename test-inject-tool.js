const ptask=require('./core').openAutotask(false)
console.log(ptask)
ptask(async ({hook, goto, evaluate, end})=>{
  hook(({url})=>{
    console.log('#baidu', url)
  })
  await goto('https://baidu.com')
  console.log(await evaluate(async _=>{
    return new Promise(r=>setTimeout(_=>r('baidu####'), 3e3))
  }))
  end()
})

ptask(async ({hook, goto, evaluate, end})=>{
  hook(({url})=>{
    console.log('#nodejs', url)
  })
  await goto('http://nodejs.cn')
  console.log(await evaluate(async _=>{
    return new Promise(r=>setTimeout(_=>r('nodejs####'), 3e3))
  }))
  end()
})