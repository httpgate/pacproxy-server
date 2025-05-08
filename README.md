# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy加密代理

自动获取SSL数字证书, 自动加载SSL数字证书

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

* 需要能运行nodejs的服务器, 建议选用Debian服务器

* 需要[申请一个域名](https://github.com/httpgate/pacproxy.js/blob/main/documents/About_Domain_ZH.md)，并将域名指向服务器公网IP

* 需要能够临时占用服务器公网IP的80端口，或者Cloudflare管理的域名需要获取[DNS API Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/), 其他域名可以[托管到Cloudflare](https://developers.cloudflare.com/fundamentals/setup/manage-domains/add-site/)

* 需要ssh到服务器的命令行，推荐用[Bitvise SSH Client](https://bitvise.com/ssh-client-download)

* 需要准备服务器设置文件current.site.cfg, 空白文件夹下第一次运行服务器会生成该文件样板，详情参考[样板](example.site.cfg)


## 运行

* 可运行[编译好的服务器软件](https://github.com/httpgate/resouces/tree/main/pacproxy-server) ，适合各种操作系统，笔记本和台式机

* 推荐用pm2[直接运行pacproxy-https-server的npm库](https://github.com/httpgate/resouces/tree/main/pm2_Run_Npm_Package.md)

* 也可以按以下步骤用pm2直接运行代码，运行更稳定，可及时更新软件

### 初始化服务器，并修改网站设置

```
git clone https://github.com/httpgate/pacproxy-server

cd pacproxy-server

./pacpinit.sh

```
  编辑当前网站设置并按Ctrl + O保存，Ctrl + X退出


### 设置website参数

* current.site.cfg里的website参数可以为空'', 可以是外部网站URL, 可以是true或false

* 设置为true或false时需要先在当前文件夹下创建website文件夹：mkdir website

* 设置为true时website文件夹可放一个静态网站，或一些可下载的文件。可以用chrome浏览器访问某个网页，然后保存到website文件夹里，类型选”Webpage, Complete", 文件名为：index.html

* 设置为false时会将website显示为一个文件夹，列出website里的所有文件。此时建议设置website_auth参数，保护信息隐私

* 设置website为外部网站URL时会将该网站的内容显示到自己的网站上，此时需要留意黑客DDOS攻击，会导致自己IP因为中转DDOS攻击被该外部网站和一些CDN屏蔽。此时可设置website_auth参数, 或改为使用本地网站。

* website参数设置好后，浏览器访问： https://your.site.domain 可以显示网站的内容，也可以将一些需要分享给他人下载的文件放到website文件夹内


### 运行pacproxy服务：

```
sudo ./runserver.js
```
核对屏幕上显示出的PAC链接，如果不对则需要修改网站配置文件：

```
nano current.site.cfg 
```
从浏览器访问网站，确认运行正常后 Ctrl + C 退出


### 后台运行pacproxy服务：

```
sudo pm2 start runserver.js
```

查看日志：

```
sudo pm2 logs --lines 100
```
可用pm2每天下午13点45分(举例)重启服务，清理内存：

```
sudo pm2 restart runserver --cron-restart="45 13 * * *"
```
### 停止pacproxy服务

```
sudo pm2 delete runserver
```

### 升级Github代码：

```
git checkout package.json
git pull
npm update
```
### 更新数字证书

免费数字证书现在有效期为3个月，允许过期前30天更新新证书。

新版本每次重启会在后台自动更新数字证书，用pm2每个月5日18点（举例）重启服务：

```
sudo pm2 restart runserver --cron-restart="00 18 5 * *"
```

### 如果中间做错可以删掉从头再来：

```
cd ..
rm -rf ./pacproxy-server
```

## 推荐

推荐用prcproxy安全的访问以下网站：
* 明慧网：https://www.minghui.org
* 干净世界：https://www.ganjing.com
* 神韵作品: https://shenyunzuopin.com
* 大法经书: https://www.falundafa.org
