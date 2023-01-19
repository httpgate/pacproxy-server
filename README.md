# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy

自动获取SSL数字证书, 自动加载SSL数字证书, 多域名同时有效

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

需要能运行nodejs的服务器, 新手请选用Ubuntu服务器

需要申请一个域名，并将域名指向服务器IP, 后文把你的域名叫作your.site.domain

需要ssh到服务器的命令行，新手推荐用Bitvise SSH Client


## 运行

### 初始化服务器，并修改网站设置模板

```
git clone https://github.com/httpgate/pacproxy-server

cd pacproxy-server

./pacpinit.sh

```
  编辑当前网站设置并按Ctrl + O保存，Ctrl + X退出

  初始化SSL存储，下面your@email.address要改成你的email:
```
npx greenlock init --config-dir greenlock.d --maintainer-email your@email.address
```


### 增加域名，如果域名被封锁可以增加新的域名, 旧域名也仍然有效：

  下面的you.site.domain要改成你申请到的域名：

```
npx greenlock add --subject your.site.domain --altnames you.site.domain
```
### 第一次运行pacproxy服务：

```
npm start
```
确认运行正常后 Ctrl + C 退出

核对屏幕上显示出的PAC链接，如果不对则需要修改网站配置文件：

```
nano current.site.cfg 
```
  编辑当前设置并按Ctrl + O保存，Ctrl + X退出

### 以后每次运行pacproxy服务：

```
nohup npm start > pacproxy.log >2&1  & 
```
  加nohup 和 & 可以关闭ssh终端后还可以后台运行, 查看日志：

```
cat pacproxy.log
```

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
