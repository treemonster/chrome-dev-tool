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

const nodejs_task=ptask.run(async ({hook, goto, page, sleep, evaluate, end})=>{
  hook(async ({url, waitForResponse, getResponse})=>{
    if(!url.match(/search.*?=fs/)) return true
    await waitForResponse()
    console.log(getResponse().toString('utf8'))
  })
  await goto('http://nodejs.cn/search')
  await page.focus('input')
  await page.keyboard.type('fs')
  await page.keyboard.press('Enter')
  await sleep(10e3)
  end()
})

Promise.all([baidu_task, nodejs_task]).then(_=>ptask.destroy())
