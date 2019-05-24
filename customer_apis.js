// 请求地址转唯一文件名
exports.url2filename=(url)=>{
  return __dirname+'/data/'+url.replace(/^https*\:\/\/(.+?)\/.*?([^\/]*?)(?:\?.*|$)/g, (_, a, b)=>{
    return a+'/'+(md5(url).substr(0, 8)+'/'+cut(b, 15, 15)).replace(/[^a-z\d\.]/ig, '_')
  })
}


