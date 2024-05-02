# pacproxy-server

pacproxy runs in a web server 在vps服务器上运行的pacproxy加密代理

自动获取SSL数字证书, 自动加载SSL数字证书

关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)


## 准备

需要能运行nodejs的服务器, 建议选用Debian服务器

需要[申请一个域名](https://github.com/httpgate/pacproxy.js/blob/main/documents/About_Domain_ZH.md)，并将域名指向服务器IP

需要ssh到服务器的命令行，推荐用Bitvise SSH Client


## 运行

可运行编译好的服务器软件，适合各种操作系统，笔记本和台式机：https://github.com/httpgate/resouces/tree/main/pacproxy-server

### 初始化服务器，并修改网站设置

```
git clone https://github.com/httpgate/pacproxy-server

cd pacproxy-server

./pacpinit.sh

```
  编辑当前网站设置并按Ctrl + O保存，Ctrl + X退出


### 运行pacproxy服务：

```
sudo ./server.js
```
核对屏幕上显示出的PAC链接，如果不对则需要修改网站配置文件：

```
nano current.site.cfg 
```
从浏览器访问网站，确认运行正常后 Ctrl + C 退出


### 后台运行pacproxy服务：

```
sudo nohup ./server.js &
```
加nohup防止关闭ssh连接后服务中止

查看日志：

```
tail -f nohup.out
```

新版本也支持pm2, 比nohup更稳定:

```
sudo npm install -g pm2@latest
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

如果用nohup命令后台运行:

```
ps -ef | grep node
sudo kill -9 找到的pid
```
如果用pm2命令后台运行:

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

免费数字证书现在有效期缩短为3个月，建议用crontab每月更新一次数字证书

```
sudo nohup ./server-linux forcert
```
加forcert参数运行后，会强制更新数字证书后再启动服务

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
