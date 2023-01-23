# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy

自动获取SSL数字证书, 自动加载SSL数字证书

支持多域名，能同时保存和获取多个域名数字证书，但只能启用其中一个域名的https加密

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

需要能运行nodejs的服务器, 新手请选用Ubuntu服务器

需要申请一个域名，并将域名指向服务器IP, 后文把你的域名叫作your.site.domain

需要ssh到服务器的命令行，新手推荐用Bitvise SSH Client


## 运行

如果不是在有公网IP的服务器运行，请下载编译好的服务器软件，适合各种操作系统，笔记本和台式机：https://github.com/httpgate/resouces/tree/main/pacproxy-server

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
第一次运行需要根据屏幕提示输入一个域名和email

确认运行正常后 Ctrl + C 退出

核对屏幕上显示出的PAC链接，如果不对则需要修改网站配置文件：

```
nano current.site.cfg 
```
  编辑当前设置并按Ctrl + O保存，Ctrl + X退出


### 后台运行pacproxy服务：

```
nohup ./server.js -s &
```
加-s防止出现对话框导致后台运行一直在等待输入状态


### 停止pacproxy服务并升级Github代码：

```
ps -ef | grep node
kill -9 找到的pid
git pull
npm update
```

### 如果中间做错可以删掉从头再来：

```
cd ..
rm -rf ./pacproxy-server
```
  然后就可以从第一步重新开始做
