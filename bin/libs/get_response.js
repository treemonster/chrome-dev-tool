const iconv=require('iconv-lite')
module.exports=async ({Network, Args, interceptionId})=>{
  try{
    const response=Args.status===200?
      await Network.getResponseBodyForInterception({interceptionId}):
      {body: "", base64Encoded: true}
    let bodyData = response.base64Encoded? Buffer.from(response.body, 'base64'): Buffer.from(response.body)
    if(Args.getResponseHeader('Content-Type').match(/charset.*?gb/i)||bodyData.slice(0, 2000).toString('utf-8').match(/meta.*?Content-Type.*?gb/i)) {
      Args.deleteResponseHeader('Content-Type')
      Args.addResponseHeader('Content-Type', 'text/html;charset=utf-8')
      try{bodyData=iconv.decode(bodyData, 'gbk')}catch(e) {}
    }
    return bodyData
  }catch(e) {}
  return ""
}
