'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const pacProxy = require('pacproxy-js');
const app = require('./app.js');
const readline = require('readline-sync');
const path = require('path');
const dns = require('dns');
const CacheableLookup = require('cacheable-lookup');
const https = require('https');
const NatAPI = require('nat-api')

var currentConfig = false;
var accountEmail = false;
var glx = false;
var httpServer = false;
var httpsServer = false;
var client = new NatAPI()

exports.runServer = runServer;
exports.app = app;

function runServer(vConfig){
    if(!vConfig) {
        if(!loadConfig()) return;
    } else {
        currentConfig = vConfig
    }

    if(currentConfig.upnp){
        client.unmap(80, () =>
            client.map(80,currentConfig.httpport, function (err) {
                if (err)
                    return console.warn('upnp port 80 mapping failed!', err)
                else
                    console.warn('upnp Port 80 mapped!')
                    startServer();    
                })
        );

    }        
}

function loadConfig()
{
    if(fs.existsSync(process.cwd()+'/current.site.cfg')) currentConfig = require(process.cwd()+'/current.site.cfg');
    else {
        fs.copyFileSync(__dirname + '/example.site.cfg', process.cwd()+'/current.site.cfg');
        readline.question("\r\nPlease Modify your site config file: current.site.cfg [ok]");
        return false;
    }
    console.log("\r\ndomain config:\r\n");
    console.log(currentConfig);
    if(!currentConfig) return false;

    return true;
}


function startServer()
{
    try {
        let rawdata = fs.readFileSync(process.cwd()+'/greenlock.d/config.json');
        var config = JSON.parse(rawdata);
        accountEmail = config.defaults.subscriberEmail;
        console.log("maintainer: " + accountEmail + '\r\n');
    } catch(e) {
        //console.log(e);
    }

    if(!accountEmail){
        if(!checkEmail(currentConfig.email)) return readline.question('\r\ninvalid email format [ok]');
        if(!checkDomain(currentConfig.domain)) return readline.question('\r\ninvalid domain format [ok]');
        var config = getConfig(currentConfig.email);
        var site = getSite(currentConfig.domain);
        accountEmail = currentConfig.email;
        addsite(config,site);
    } else if( !hassite(config,currentConfig.domain)) {
        if(!checkDomain(currentConfig.domain)) return readline.question('\r\ninvalid domain format [ok]');
        var site = getSite(currentConfig.domain);
        addsite(config,site);
    }

    if(! ('https' in currentConfig)) currentConfig.https = true;
    if(!currentConfig.httpport) currentConfig.httpport = 80;
    if(!currentConfig.port) currentConfig.port = 443;
    if(!currentConfig.proxyport) currentConfig.proxyport = 443;
    if(! ('websocket' in currentConfig)) currentConfig.websocket = true;
    if(! ('behindTunnel' in currentConfig)) currentConfig.behindTunnel = false;

    if(app.onrequest) currentConfig.onrequest = app.onrequest;
    if(app.onconnection) currentConfig.onconnection = app.onconnection;

    const vlookup = dns.lookup;
    const cacheable = new CacheableLookup({lookup: vlookup});
    dns.lookup = cacheable.lookup;

    let keydir1 = './greenlock.d/live/' + currentConfig.domain + '/privkey.pem';
    let certdir1 = './greenlock.d/live/' + currentConfig.domain + '/fullchain.pem';
    currentConfig.key  = path.resolve(process.cwd(), keydir1);
    currentConfig.cert  = path.resolve(process.cwd(), certdir1);

    greenlock.init({
            packageRoot: process.cwd(),
            configDir: "./greenlock.d",
            maintainerEmail: accountEmail,
            cluster: false,
            packageAgent: 'pacproxy'
        })
        .ready(httpsWorker);
}

function httpsWorker(vglx) {
    if(vglx) glx = vglx;

    httpsServer = glx.httpsServer(null, function(req, res) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello pacproxy!');
        console.log("\r\nSSL Cert issued\r\n");
    });

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    httpServer = glx.httpServer();

    var httpReady = false;
    var httpsReady = false;

    httpServer.listen(currentConfig.httpport, "0.0.0.0", () => {
        httpReady = true;
        if(httpsReady) requestSSLCert();
        //console.info("\r\n Http SSL Cert Server Listening on ", httpServer.address());
    });


    httpsServer.listen(0, "127.0.0.1", () => {
        httpsReady = true;
        //console.info("\r\n Https SSL Cert Server Listening on ", httpsServer.address());
        if(httpReady) requestSSLCert();
    });

}

function endCertRequest() {
    if (!fs.existsSync(currentConfig.key))
        readline.question("\r\nFailed to obtain SSL certificate [ok]");
    else pacProxy.proxy(currentConfig);

    if(currentConfig.upnp){
        client.unmap(currentConfig.proxyport, ()=>
            client.map(currentConfig.proxyport,currentConfig.port, function (err) {
                if (err)
                console.warn('upnp port mapping failed!', err)
                else
                console.warn('upnp Port ' + currentConfig.proxyport +' mapped!')
            })
        );
    }

    setTimeout(()=>{
        httpServer.close()
        httpsServer.close()
        if(currentConfig.upnp){
            client.unmap(80);
        }
        console.log("\r\nFinished Obtain SSL certificate ");}, 30000);
}

function requestSSLCert() {

    let clookup = (hostname, opts, cb) => {
        if(opts && opts.all)  cb(null, [{"address":'127.0.0.1', "family":4}]);  
        else    cb(null, '127.0.0.1', 4);
    };
        
    const req = https.get({
        hostname: currentConfig.domain,
        port: httpsServer.address().port,
        lookup: clookup},  (res) => {
      
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => endCertRequest());
    });
    
    req.on('error', (e) => {
        console.error(e);
    });
}


function getConfig(email){
    return {
        "defaults": {
          "store": {
            "module": "greenlock-store-fs"
          },
          "challenges": {
            "http-01": {
              "module": "acme-http-01-standalone"
            }
          },
          "renewOffset": "-45d",
          "renewStagger": "3d",
          "accountKeyType": "EC-P256",
          "serverKeyType": "RSA-2048",
          "subscriberEmail": email
        },
        "sites": []
      };
}


function getSite(domain){
    return {
        "subject": domain,
        "altnames": [
            domain
        ],
        "renewAt": 1
    };
}


function addsite(config,site){
    config.sites.push(site);
    try{
        if(fs.existsSync(process.cwd()+'/greenlock.d/config.json')) fs.renameSync(process.cwd()+'/greenlock.d/config.json',process.cwd()+'/greenlock.d/config.json.bak'); 
        var content = JSON.stringify(config);
        if(!fs.existsSync(process.cwd()+'/greenlock.d')) fs.mkdirSync(process.cwd()+'/greenlock.d');
        fs.writeFileSync(process.cwd()+'/greenlock.d/config.json', content, 'utf-8');

        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function hassite(config,domain){
    let domainExists = false;
    config.sites.forEach(element => {
        if(element.subject==domain) {
            console.warn('domain already exists 域名已经存在');
            domainExists = true;
        }
    });
    return domainExists;
}


function checkEmail(email) {
    if (!email) return false;
  
    var emailParts = email.split('@');
  
    if(emailParts.length !== 2) return false;
  
    var account = emailParts[0];
    var address = emailParts[1];
  
    if(account.length > 64) return false;
  
    if(!checkDomain(address)) return false;
  
    return true;
}


function checkDomain(address) {
    if (!address) return false;
  
    else if(address.length > 255) return false
  
    var domainParts = address.split('.');
    if(domainParts.length<2) return false;
    if (domainParts.some(function (part) {
      return part.length > 63;
    })) return false;

    return true;
}
