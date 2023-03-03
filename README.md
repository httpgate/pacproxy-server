# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy加密代理

自动获取SSL数字证书, 自动加载SSL数字证书

支持多域名，能同时保存和获取多个域名数字证书，但只能启用其中一个域名的https加密

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

需要能运行nodejs的服务器, 新手请选用Ubuntu服务器

需要[申请一个域名](https://github.com/httpgate/pacproxy.js/blob/main/documents/About_Domain_ZH.md)，并将域名指向服务器IP

需要ssh到服务器的命令行，新手推荐用Bitvise SSH Client


## 运行

新手建议运行编译好的服务器软件，适合各种操作系统，笔记本和台式机：https://github.com/httpgate/resouces/tree/main/pacproxy-server

### 初始化服务器，并修改网站设置

```
git clone https://github.com/httpgate/pacproxy-server

cd pacproxy-server

./pacpinit.sh

```
  编辑当前网站设置并按Ctrl + O保存，Ctrl + X退出


### 运行pacproxy服务：

```
./server.js
```
核对屏幕上显示出的PAC链接，如果不对则需要修改网站配置文件：

```
nano current.site.cfg 
```
从浏览器访问网站，确认运行正常后 Ctrl + C 退出


### 后台运行pacproxy服务：

```
nohup ./server.js &
```
加nohup防止关闭ssh连接后服务中止, (如nohup有问题可以改用screen)

 查看日志：

```
tail -f nohup.out
```

### 停止pacproxy服务并升级Github代码：

```
ps -ef | grep node
kill -9 找到的pid

git checkout package.json
git pull
npm update
```

### 更新域名数字证书

```
./server.js forcert
```
如果数字证书过期，则需要按前面的方法停止pacproxy服务，再用上述命令启动服务，访问网站更新数字证书后再重启服务


### 如果中间做错可以删掉从头再来：

```
cd ..
rm -rf ./pacproxy-server
```
  然后就可以从第一步重新开始做


## 推荐

推荐用prcproxy安全的访问以下网站：
* 明慧网：https://www.minghui.org
* 干净世界：https://www.ganjing.com
* 神韵作品: https://shenyunzuopin.com
* 大法经书: https://www.falundafa.org
