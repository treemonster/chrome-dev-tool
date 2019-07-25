const ptask=require('./core').openAutotask(false)

const baidu_task=ptask.run(async ({hook, goto, evaluate, end})=>{
  hook(({url})=>{
    console.log('#baidu', url)
  })
  await goto('https://baidu.com')
  console.log(await evaluate(async _=>{
    return new Promise(r=>setTimeout(_=>r('baidu####'), 2e3))
  }))
  end()
})

const nodejs_task=ptask.run(async ({hook, goto, evaluate, end})=>{
  hook(({url})=>{
    console.log('#nodejs', url)
  })
  await goto('http://nodejs.cn')
  console.log(await evaluate(async _=>{
    return new Promise(r=>setTimeout(_=>r('nodejs####'), 2e3))
  }))
  end()
})

Promise.all([baidu_task, nodejs_task]).then(_=>ptask.destroy())
