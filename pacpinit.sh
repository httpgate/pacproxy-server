sudo apt install nodejs
sudo apt install npm
sudo ufw allow http
sudo ufw allow https
npm install
npm update

if ($1 == 'your@email.address')
then
    echo "wrong email address, please try again"
else
    npx greenlock init --config-dir greenlock.d --maintainer-email "$1"
    cp ./example.site.cfg ./current.site.cfg
    nano ./current.site.cfg
fi