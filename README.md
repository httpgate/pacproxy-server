# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy

自动获取SSL数字证书，自动加载SSL数字证书

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

需要能运行nodejs的服务器, 新手请选用Ubuntu服务器

需要申请一个域名，并将域名指向服务器IP

需要ssh到服务器的命令行，新手推荐用Bitvise SSH Client


## 运行

* 初始化服务器，并修改网站设置模板

```
git clone https://github.com/httpgate/pacproxy-server

cd pacproxy-server

./pacpinit.sh

nano default.site.cfg
```

编辑默认网站设置并保存，它是新增网站的设置模板

* 第一次运行pacproxy服务：

```
npm start your.site.domain your@email.address

```
确认运行正常后 Ctrl + C


* 以后每次运行pacproxy服务：

```
nohup npm start your.site.domain > pacproxy.log >2&1  & 
```

加nohup 和 & 可以关闭ssh终端后还可以后台运行, 查看日志：

```
cat pacproxy.log
```

* 关闭网站并升级Github代码：

```
ps -ef | grep node
kill -9 找到的pid
git pull
npm update

```
