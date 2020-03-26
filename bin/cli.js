#!/usr/bin/env node
const path=require('path')
const {openChrome}=require(__dirname+'/index.js')
const {getArgv}=require(__dirname+'/../core/libs/common')
const dir=path.resolve(getArgv('dir') || '.')
console.log(JSON.stringify({
  projectdir: dir,
  hookJs: path.normalize(dir+'/hooks.js'),
  url2cachedir: path.normalize(dir+'/data'),
}, null, 2))
openChrome()
