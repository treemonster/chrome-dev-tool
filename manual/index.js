const server=require('cwg-pre-loader/simple-server')
server({
  dir: __dirname+'/code',
  listen: 9001,
})
console.log("server ready on http://127.0.0.1:9001/")
