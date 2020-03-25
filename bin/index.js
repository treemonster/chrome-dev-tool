const core=require(__dirname+'/../core')
const simplebook=require('cwg-simple-book')
const path=require('path')
simplebook({
  SVID_HTML: __dirname+'/../manual/svid.html',
  BOOK_DIR: __dirname+'/../manual/md',
  globals: {
    PROJ_SRC: path.normalize(__dirname+'/..'),
  }
}).then(url=>{
  console.log("chrome-dev-tools manual ready on "+url)
  core.openDebugger(url)
})
