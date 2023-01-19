cp ./default.site.cfg "$1"
npx greenlock add --subject "$1"  --altnames "$1"
nano "$1"
