### 基于chrome远程调试协议的调试工具，可用于修改网站代码来测试效果

使用说明：
1. 安装依赖包 `npm install`
2. 运行 `node .`
3. 访问网页时本程序会把加载到的Script和Document类型的文件会写入到data下
4. 修改对应的文件，然后刷新页面看效果

为了查找方便，data文件夹下以网站域名区分文件夹，同一个域名下的文件都会被放在一起。文件命名规则是 `md5(完整请求路径).substr(0, 8)+'_'+文件名`。
