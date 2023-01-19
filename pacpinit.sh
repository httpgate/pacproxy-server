sudo apt install nodejs
sudo apt install npm
sudo ufw allow http
sudo ufw allow https
npm install
npm update
npx greenlock init --config-dir greenlock.d --maintainer-email "$1"
cp ./example.site.cfg ./current.site.cfg
nano ./current.site.cfg