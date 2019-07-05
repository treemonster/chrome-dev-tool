module.exports=({Args, response})=>{
  const {responseHeaders}=Args
  let header=`HTTP/1.1 ${Args.status} OK\r\n`
  Args.addResponseHeader('Content-Length', response.length)
  Args.addHeaders.map(([key, value])=>{
    header+=key+': '+value+'\r\n'
    Args.deleteResponseHeader(key)
  })
  for(let a in responseHeaders) {
    header+=a.replace(/(^|-)([a-z])/g, (_, a, b)=>a+b.toUpperCase())+': '+responseHeaders[a]+'\r\n'
  }
  return Buffer.concat([header, `\r\n`, response, `\r\n\r\n`].map(c=>Buffer.from(c)))
}
