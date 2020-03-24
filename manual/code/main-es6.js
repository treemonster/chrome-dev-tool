let {datas, editfn, NO_CONTENT}=window.DATAS
let _editfn=editfn
function updatebtns() {
  $('em').each(function(){
    const em=$(this), text=em.html()
    const r=/^call\:([a-z\d]+):(.+)$/
    if(!text.match(r)) return
    em.replaceWith(text.replace(r, `<span data-svid="$1" class="call-btn">$2</span>`))
  })
}
function xhr(method, url, postbody) {
  return new Promise(cb=>{
    const xhr=new XMLHttpRequest
    xhr.open(method, url, !0)
    method==='POST' && xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    xhr.send(postbody)
    xhr.onreadystatechange=_=>{
      if(xhr.readyState!==4) return;
      cb(xhr.responseText)
    }
  })
}
function save(fn, content) {
  return xhr('POST', '?act=write&fetch='+encodeURIComponent(fn), encodeURIComponent(content))
}
function updatebigtitle(){
  const h=$('.bigtitle').height()
  $('.titles,.content').css({top: h})
}
function showpanel(title, md, cls, fn) {
  $('.edit').addClass('show')
  $('.pad-div').addClass(cls)
  $('.tit').html(title)
  $('.pad-text').val(md).change()
  editfn=fn
}
function hidepanel() {
  $('.edit').removeClass('show')
  $('.pad-div')[0].className='pad-div'
}
const pos={}
function calc_where(key, str) {
  const old=pos[key]||''
  pos[key]=str
  if(str===old) return;
  const len=Math.min(old.length, str.length)
  let cur=0
  for(; cur<len && old.charAt(cur)===str.charAt(cur); cur++);
  return str.substr(0, cur)+'<i data-cur></i>'+str.substr(cur, str.length)
}
$(document).on('click', [1,2,3,4,5,6].map(a=>'.titles h'+a).join(','), function() {
  location='?view='+encodeURIComponent($(this).html())
  return false
})
$(document).on('click', '[data-svid]', async function() {
  const svid=$(this).attr('data-svid')
  try{
    const res=JSON.parse(await xhr('GET', '?act=call_svid&svid='+svid))
    // {ok, msg}
    alert(res.msg)
  }catch(e) {
    alert('网络错误')
  }
})
$(document).on('click', '.title', function() {
  showpanel('大标题', datas.bigtitle, 'bigtitle', 'bigtitle')
})
$(document).on('click', '.edit-title-btn', function() {
  showpanel('目录', datas.titles, 'titles titles-list', 'titles')
  return false
})
$(document).on('click', '.edit-content-btn', function() {
  showpanel(_editfn, datas.subs[_editfn], '', _editfn)
})
$(document).on('click', '.cancel', _=>hidepanel())
$(document).on('click', '.save', async _=>{
  const data=await save(editfn, $('.pad-text').val())
  if(editfn==='bigtitle') {
    datas.bigtitle=$('.pad-text').val()
    $('.title').html(data)
    updatebigtitle()
  }else if(editfn==='titles') {
    datas.titles=$('.pad-text').val()
    $('.titles-list').html(data)
  }else{
    datas.subs[editfn]=$('.pad-text').val()
    $('.content-panel').html(data||NO_CONTENT)
    hl_code($('.content-panel code'))
  }
  updatebtns()
  hidepanel()
})

; ['change', 'keyup'].map(c=>$(document).on(c, '.pad-text', function() {
  const str=marked.parse($(this).val())
  const fixstr=calc_where('pad-text', str)
  if(!fixstr) return;
  $('.pad-div').html(fixstr)
  try{
    $('.pad-div')[0].scrollTop+=$('[data-cur]').offset().top-$('.pad-div').offset().top-$('.pad-div').height()/2
    const p=$('[data-cur]').parent()
    if(!p.hasClass('focusit')) {
      p.addClass('focusit')
      setTimeout(_=>p.removeClass('focusit'), 1e3)
    }
  }catch(e) {}
  hl_code($('.pad-div code'))
  updatebtns()
}))

function hl_code(codes) {
  codes.map(function() {
    (this.className+'').replace(/^language-([a-z\d]+)/, (_, lan)=>{
      $(this).html(hljs.highlight(lan, this.innerText).value).addClass('hljs')
    })
  })
}
$(_=>{
  updatebigtitle()
  updatebtns()
})
$(window).on('resize', _=>updatebigtitle())
hljs.initHighlightingOnLoad()