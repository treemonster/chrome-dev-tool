#!/usr/bin/env node
const fs=require('fs')
const path=require('path')
const {openChrome, core}=require(__dirname+'/index.js')
const {getArgv, setDefaultArgv}=require(__dirname+'/../core/libs/common')
/*
 --dir
 --browser-data-dir
 --inject-js
 --version
 */
if(getArgv('version')) {
  console.log(JSON.parse(fs.readFileSync(__dirname+'/../package.json', 'utf8')).version)
  process.exit()
}

setDefaultArgv({
  dir: '.',
  'browser-data-dir': './browser-data',
})
const dir=getArgv('dir')
const ijs=getArgv('inject-js')
console.log(JSON.stringify({
  projectdir: path.resolve(dir),
  hookjs: path.resolve(dir+'/hooks.js'),
  url2cachedir: path.resolve(dir+'/data'),
  injectjs: ijs? path.resolve(ijs): null,
}, null, 2))
if(ijs) {
  global.ChromeDevToolCore=core
  require(path.resolve(ijs))
}else{
  openChrome()
}
