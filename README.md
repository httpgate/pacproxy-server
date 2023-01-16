# pacproxy-server
pacproxy runs in a web server 在vps服务器上运行的pacproxy
关于pacproxy参见[pacproxy.js](https://github.com/httpgate/pacproxy.js)

## 准备
需要能运行nodejs的服务器
需要装好nodejs和npm
需要申请一个域名，并将域名指向服务器IP
需要ssh到服务器的命令行

## 运行

第一次运行：

git clone https://github.com/httpgate/pacproxy-server
cd pacproxy-server
pacpinit.sh your@email your.site.domain

以后运行：

npm start your.site.domain
