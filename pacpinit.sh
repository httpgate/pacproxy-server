npm install
npx greenlock init --config-dir greenlock.d --maintainer-email "$1"
npx greenlock add --subject "$2" --altnames "$2"
cp ./example.site.domain ./"$2"
nano "$2"