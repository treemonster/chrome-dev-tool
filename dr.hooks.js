// 达人平台
const querystring=require('querystring')

exports.url2response=({
  url, response, postData,
  requestHeaders,
  responseHeaders,
  addResponseHeader,
  deleteResponseHeader,
})=>{
  // console.log(postData)
  addResponseHeader('Access-Control-Allow-Credentials', 'true')
  addResponseHeader('Access-Control-Allow-Origin', requestHeaders.Origin)

  /*
  if(url.match(/author\/query/))
    for(let i=Date.now();Date.now()-i<2e3;);
  else return
    */

/*
  if(url.match(/proceed/)) {
  	console.log(responseHeaders)
    deleteResponseHeader('Access-Control-Allow-Origin')
    deleteResponseHeader('Access-Control-Allow-Credentials')
  }
  return
*/

  // set cookie
  ; `__jdv=105103518|direct|-|none|-|1559617796256; __jdu=15596177962531877106913; pinId=Ux-hifW62sjfNvhs_1PWTw; pin=darenpingtai2; unick=%E6%88%91%E6%98%AF%E5%B0%8F%E5%8F%AF%E7%88%B1aacute1; ceshi3.com=000; _tp=pqo6bZPDr5nuCxDZoB1zPg%3D%3D; _pst=darenpingtai2; auid=67834; disour=1; RT="z=1&dm=jd.com&si=ybmqnlj6t9p&ss=jwhf035k&sl=1&tt=19t&r=80a3506d67a08a805e641bfcce7e194a&ul=hfp5"; areaId=2; ipLoc-djd=2-2815-51975-0; logining=1; __jda=95931165.15596177962531877106913.1559617796.1559639822.1559641912.4; __jdc=95931165; __jdb=95931165.20.15596177962531877106913|4.1559641912; TrackID=1TUGZ-lwsJf74z-VEdi__qOTTAnb8B2bd8sgTDIabzKDCcXzkiNoIvgORoGV9PmRzadxB2F9__F5bWrYDJXIeQFZufHZDc8D5ltoxjDoajNk; thor=C7AB56A4A297C85EB913ACEAD11EFD9623B4222B1B9AE179734BCD96D8D314DEF2972AC2B5367076DEDD447B882C463504249148222C2BAC1AAF0C6579E3C9D9C28163910DA9B9F5451910CC116639C798E93EDFBD6E09928C5B78A2AB568A5845123111EBDB8A6FD20033155570E83E7AC4C043F249C06F435BB2001F1E639B4D8D29C050A92DA07090D256C496ECD1; autype=0; auname=%E6%88%91%E6%98%AF%E5%B0%8F%E5%8F%AF%E7%88%B1acute; aupic=mobilecms%2Fjfs%2Ft1%2F26856%2F39%2F6184%2F59231%2F5c483ce8Ebf8b65ab%2Fb66cf097a26cc9e4.jpg`.split(';').map(a=>{
    return a.split('=').map(a=>a.trim())
  }).map(([k,v])=>addResponseHeader('Set-Cookie', k+'='+v+'; expires=Sat, 11 Jun 2096 11:29:42 GMT; path=/; domain: .jd.com;'))

  if(url.match(/\/subAuthorListWithBindInfo/)) return JSON.stringify({
    success: true,
    result: [
      {position: "", synopsis: "dscadcdscadcdscadcdscadcdscadcdscadcdscadcdscadc", phoneNumber:"ewdqwed3r", pin:"cadscdsacdsacdsc", identificationType: 1, identificationName: "qewdewqd", identificationNo: "0", name: "xx", id: 1},
      {position: "", synopsis: "dscadc", phoneNumber:"ewdqwed3r", pin:"cadscdsacdsacdsc", identificationType: 1, identificationName: "wq232e334", identificationNo: "0", name: "yy", id: 2},
      {position: "", synopsis: "dscadc", phoneNumber:"ewdqwed3r", pin:"cadscdsacdsacdsc", identificationType: 1, identificationName: "frfwrefref", identificationNo: "0", name: "zz", id: 3},
    ]
  })
  if(url.match(/\/author\/share\/create/)) return JSON.stringify({
    success: true,
    result: 'cdcsdc'
  })

  if(url.match(/dr_config/)) return response.toString('utf8').replace(/\/\*\*[\s\S]+/g, '')
  if(url.match(/\/commentMaterialList/)) {
    const {channedId, bId, page}=querystring.parse(postData)
    return JSON.stringify({map:{subCode:0,page,data:
      [... new Array(10)].map(_=>({
        materialId: "198729",
        title: "测试数据111112",
        updateTime: Date.now(),
        totalCount: "222",
        unreadCount: "111",
        bId,
        sid: "112",
      })),
      totalSize:100
    },resultCode:0,resultCodeParams:[],success:true
    })
  }

// {"success":true,"result":{"totalOrderNum":1,"totalOrderPrice":"714.0","totalEstimateEarning":"12.28","clearedOrderNum":0,"clearedEarning":"0.0","trends":[{"totalOrderNum":1,"totalOrderPrice":"714.0","totalEstimateEarning":"12.28","clearedOrderNum":0,"clearedEarning":"0.0","statsDate":"2019-05-10","orderIds":null,"clearedOrderIds":null}]},"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null}
  if(url.match(/\/getEarningHBase/i)) {
  	const {startTime}=querystring.parse(postData)
  	let t=new Date(startTime)
    return JSON.stringify({
      success:true,
      result: {
        totalOrderNum: 31,
        totalOrderPrice: 11,
        totalEstimateEarning: 11,
        clearedOrderNum: 11,
        clearedEarning: 11,
        trends: [...new Array(15)].map((_,i)=>({
          clearedEarning: Math.random()*10|0+i,
          clearedOrderNum: Math.random()*10|0+i,
          statsDate: (t.setTime(t.getTime()+86400e3), t.toLocaleDateString()),
          totalEstimateEarning: Math.random()*10|0+i,
          totalOrderNum: Math.random()*10|0+i,
          totalOrderPrice: Math.random()*10|0+i,
        })),
      },
      "code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null,
    })
  }

  // {"success":true,"result":{"content":[{"unionId":"1001170305","subUnionId":"","orderId":"94993944660","subPosition":"-1","articleId":"150269743","skuId":"791043","skuName":"双沟 珍宝坊之君坊 41.8度 整箱装白酒 （480ml+20ml）*6瓶（内含3个礼袋） 口感绵柔浓香型","skuNum":"1","orderPrice":"714.00","estimateEarning":"12.28","accountEarning":"12.28","orderDate":"1557494145000","accountDate":"1559786591000","endDate":"1557540191000","validFlag":"1","splitFlag":"1","accountFlag":"1","orderStatus":"1","articleTitle":" 珍宝坊之君坊","userName":null,"orderStatusDesc":"已结算"}],"page":0,"pageSize":20,"totalRows":0,"totalPage":0,"passbackVlaue":null,"hasNext":false},"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null}
  if(url.match(/\/listdetailhbase/i)) {
  	const {page}=querystring.parse(postData)
    return JSON.stringify({
      success:true,
      result:{
        content: [...new Array(20)].map((_, i)=>({
          orderId: 13+i,
          orderStatusDesc: 11,
          orderDate: Date.now()-86400e3*i,
          accountDate: Date.now()-86400e3*i,
          skuId: 11,
          skuName: 11,
          articleId: 11,
          articleTitle: 11,
          subChannelName: 11,
          userName: 11,
          orderPrice: 11,
          estimateEarning: 11,
          accountEarning: 11,
        })),
        page,"pageSize":20,"totalRows":100,"totalPage":5,"passbackVlaue": Date.now().toString(36),"hasNext": page!=5
      },"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null,
    })
  }

  if(url.match(/\/(allSubAuthorList|allParentAuthorList)/i)) {
    return JSON.stringify({
      code:0,"errorMsg":"","invalidParamMsgs":[],"oth":null,"result": [...new Array(10)].map((_, i)=>({
        "applyTime":"2017-06-01 16:33:41.0",
        "auditFailReason":"",
        "authorLevel":0,
        "backgroundPic":"",
        "bindStatus":-1,
        "confirmPic":"",
        "ext":"",
        "id":"64594"+i,
        "identificationId":"",
        "identificationName":"sushengnan3",
        "identificationNo":"",
        "identificationPic":"",
        "identificationType":0,
        "isWhite":"0",
        "links":"",
        "managerCpsFlag":0,
        "name":"京东达人学院",
        "parentPin":"darenpingtai98",
        "parentUnionId":"1000359198",
        "phoneNumber":"",
        "pic":"mobilecms/jfs/t5881/52/2373121908/11475/7a5ba5ed/592fd6deN548dd3b7.jpg",
        "pin":"darenpingtai99",
        "position":"",
        "privilege":40210748813931,
        "privilege1":1317624576693703241,
        "privilege2":25770328065,
        "privilege3":50333184,
        "privilege4":54993173574844440,
        "privilege5":192,
        "privilege6":7081984,
        "role":"","roleTag":0,"shopId":0,"signature":"","signatureUrl":"","source":6,
        "status":1,"synopsis":"","type":0,
        "unionId": "99818"+i,
      })),
      // {"applyTime":"2017-06-26 10:25:40.0","auditFailReason":"","authorLevel":0,"backgroundPic":"","bindStatus":-1,"confirmPic":"mobilecms/jfs/t24037/161/1710876467/100914/1adc7394/5b693da8N8508c0b7.jpg","ext":"","id":"68354","identificationId":"","identificationName":"京东","identificationNo":"123213N6ccp58","identificationPic":"mobilecms/jfs/t25021/142/233363577/100914/1adc7394/5b693da4N35979dc3.jpg","identificationType":1,"isWhite":"0","links":"","managerCpsFlag":0,"name":"测试一下","parentPin":"darenpingtai98","parentUnionId":"1000359198","phoneNumber":"","pic":"mobilecms/jfs/t1/1267/34/6212/132284/5ba21c48E3e59c103/88f44c423fd64fdb.jpg","pin":"darenpingtai3","position":"","privilege":61692181358089819,"privilege1":1317624576693703241,"privilege2":524289,"privilege3":2305843009213693952,"privilege4":214748889088,"privilege5":288230376151711744,"privilege6":2097152,"role":"","roleTag":0,"shopId":0,"signature":"","signatureUrl":"","source":1,"status":1,"synopsis":"","type":0,"unionId":"1000824418"},{"applyTime":"2018-03-07 15:28:49.0","auditFailReason":"","authorLevel":0,"backgroundPic":"","bindStatus":-1,"confirmPic":"","ext":"","id":"128811","identificationId":"","identificationName":"田晴","identificationNo":"14010919910619**3*","identificationPic":"","identificationType":0,"isWhite":"0","links":"","managerCpsFlag":0,"name":"1fwf","parentPin":"darenpingtai98","parentUnionId":"1000359198","phoneNumber":"13132321311","pic":"mobilecms/jfs/t16018/107/2303215261/2785/fd4633a7/5a9f94a8n4898ac04.png","pin":"jd_72a62ac58a56d","position":"0","privilege":1319031951593878091,"privilege1":1317624576693703241,"privilege2":524288,"privilege3":0,"privilege4":0,"privilege5":0,"privilege6":0,"role":"","roleTag":0,"shopId":0,"signature":"","signatureUrl":"","source":1,"status":1,"synopsis":"","type":0,"unionId":""},{"applyTime":"2017-06-21 19:59:59.0","auditFailReason":"","authorLevel":0,"backgroundPic":"","bindStatus":1,"confirmPic":"","ext":"","id":"67834","identificationId":"","identificationName":"达人平台","identificationNo":"","identificationPic":"","identificationType":0,"isWhite":"0","links":"","managerCpsFlag":0,"name":"我是小可爱acute","parentPin":"","parentUnionId":"","phoneNumber":"13351345344","pic":"mobilecms/jfs/t1/26856/39/6184/59231/5c483ce8Ebf8b65ab/b66cf097a26cc9e4.jpg","pin":"darenpingtai2","position":"","privilege":3952873730080618203,"privilege1":3948369028487516745,"privilege2":1793397705880647387,"privilege3":2799952225473771209,"privilege4":3952873730080055515,"privilege5":496365414062896859,"privilege6":3519683732332196544,"role":"","roleTag":0,"shopId":0,"signature":"","signatureUrl":"","source":1,"status":1,"synopsis":"测试敏感词笑嘻嘻笑嘻嘻笑嘻嘻笑嘻嘻笑嘻嘻笑嘻嘻笑嘻嘻笑嘻嘻","type":0,"unionId":"1000295618"}],
      "success":true
    })
  }

  if(url.match(/\/listEarningBySubAuthor/)) {
    return JSON.stringify({
      success:true,
      "result":{
        subAuthorOrderList:[...new Array(10)].map((_, i)=>({
          startTime: (new Date(Date.now()-(i+1)*86400e3)).toLocaleDateString(),
          endTime: (new Date(Date.now()-i*86400e3)).toLocaleDateString(),
          authorName: 'cds',
          subChannelName: 'cdsascd',
          totalOrderNum: 11,
          totalOrderPrice: 2,
          totalEstimateEarning: 33,
          clearedOrderNum: 21,
          clearedEarning: 23,
          authorId: "64594"+i,
          orderDateType: 1,
        })),
        "totalOrder":{
          "totalOrderNum":0,
          "totalOrderPrice":"0",
          "totalEstimateEarning":"0",
          "clearedOrderNum":0,
          "clearedEarning":"0",
          "authorId":null,
          "authorName":null,
          "subPosition":-1,
          "subChannelName":"全部"
        }
      },"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null
    })
  }

  if(url.match(/\/daren\/media\/proceed/)) return JSON.stringify({
    "success":true,"result":null,"code":0,"errorMsg":null,
    "invalidParamMsgs":null,"oth":{
      code: 7,
      unionStatus: 1,
      auditTime: Date.now(),
      failReason: 'ccc',
      count: 3,
      fan: 2,
    }
  })

  if(url.match(/daren\/media\/certify/)) return JSON.stringify({
    "success":false,"result":null,"code":0,
    "errorMsg":"您好,您已经申请过CPS的权限,请查看相关说明后,继续操作!",
    "invalidParamMsgs":null,"oth":{"code":4}
  })


  if(url.match(/daren\/media\/regist/)) return JSON.stringify({
    "code":0,"errorMsg":null,"success":true
  })

  if(url.match(/\/daren\/author\/query/)) return JSON.stringify({
    "success":true,"result":{
      "id":"78946",
      "name":"管理者测试账号1",
      "pic":"mobilecms/jfs/t1/6635/1/660/16404/5bc9ad47Ede868250/ea9f7f10af8d8a61.png",
      "synopsis":"shsthdtrhtrh",
      "signature":null,"signatureUrl":null,"privilege1":1317624576693703241,
      "privilege2":524288,"privilege3":0,"privilege4":0,"privilege":7844772711402880435,
      "source":50,"unionId":"1000359198","pin":"darenpingtai98",
      "authorLevel":null,"position":"0","parentUnionId":null,
      "parentPin":"","identificationId":null,"shopId":null,"privilege5":0,
      "privilege6":0,"roleTag":null,"role":null,"status":1,
      "applyTime":"2017-08-29 14:18:08.0","type":0,"links":"",
      "backgroundPic":null,"isWhite":"0",
      "phoneNumber":"1662****994","auditFailReason":"",
      "identificationType":2,"identificationName":"测试机构",
      "identificationNo":"130283199877654572",
      "identificationPic":"mobilecms/jfs/t1/475/26/6093/34956/5ba0a90ae441ed606/500f137f06a5ad0d.jpg",
      "confirmPic":"mobilecms/jfs/t9100/144/286856199/180559/6ebb01a/59a50677N95d344d4.png",
      "bindStatus":1,"managerCpsFlag":1,"ext":null
    },"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":{
      "humanity":0,
      "AccountBannedStatus":"","roleTagName":"","createBannedStatus":"",
      "code":3,"AccountBannedReason":"","showLevel":1
    }
  })

  if(url.match(/\/login$/)) return JSON.stringify({
    "code":0,"errorMsg":"","invalidParamMsgs":[],"oth":null,"result":"login.json","success":true
  })

  if(url.match(/\/redPoint/)) return JSON.stringify({
    "success":true,"result":{"msgNum":"99+","redPoint":true},"code":0,"errorMsg":null,"invalidParamMsgs":null,"oth":null
  })

}
exports.should_no_cache=({url})=>{
  if(url.match(/(gw|storage).*?.jd.com/)) return true
}
