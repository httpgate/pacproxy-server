sudo apt install nodejs
sudo apt install npm
sudo ufw allow http
sudo ufw allow https
npm install
npm update
sudo npm install -g pm2@latest

cp ./example.site.cfg ./current.site.cfg
nano ./current.site.cfg