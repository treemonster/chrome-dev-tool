const getPort=require('get-port')
const server=require('cwg-pre-loader/simple-server')
module.exports=(async _=>{
  const port=await getPort({port: getPort.makeRange(2e4, 4e4)})
  const url="http://127.0.0.1:"+port+"/"
  server({
    dir: __dirname+'/code',
    listen: port,
  })
  console.log("chrome-dev-tools manual ready on "+url)
  return url
})()
