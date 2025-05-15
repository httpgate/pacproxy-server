'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const pacProxy = require('pacproxy-js');
const path = require('path');
const dns = require('dns');
const CacheableLookup = require('cacheable-lookup');
const https = require('https');
const NatAPI = require('@silentbot1/nat-api')
const client = new NatAPI({ enablePMP: true, enableUPNP: true })
const send = require('@fastify/send')
const serveIndex = require('serve-index')
const rootDir = path.resolve(process.cwd(), 'website');
const index = serveIndex(rootDir, {'icons': true});
const html404 = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Not Found</pre>\n</body>\n</html>';

var currentConfig = false;
var accountEmail = false;
var glx = false;
var httpServer = false;
var httpsServer = false;
var clChallenge = false;
var dnsModuleName = false;

exports.runServer = runServer;

async function runServer(vConfig){

    if(!vConfig) {
        if(!loadConfig()) return;
    } else {
        currentConfig = vConfig
    }

    dns.setServers(['1.1.1.1', '8.8.8.8', '208.67.222.222', '8.8.4.4', '208.67.220.220']);

    if(!fs.existsSync(rootDir)) var msg = 'Please create website folder: ' + rootDir;
    
    if(currentConfig.website===true){
        currentConfig.onrequest = onWebsiteRequest;
        currentConfig.website = '';
    } else if(currentConfig.website===false){
        currentConfig.onrequest = onFolderRequest;
        currentConfig.website = ''; 
    } else {
        msg = '';
    }
    if(msg) console.warn(msg);

    if(! ('https' in currentConfig)) currentConfig.https = true;
    if(!currentConfig.httpport) currentConfig.httpport = 80;
    if(!currentConfig.port) currentConfig.port = 443;
    if(!currentConfig.proxyport) currentConfig.proxyport = 443;
    if(! ('pacpass' in currentConfig)) currentConfig.pacpass = [];
    if(! ('websocket' in currentConfig)) currentConfig.websocket = true;
    if(! ('behindTunnel' in currentConfig)) currentConfig.behindTunnel = false;

    if(currentConfig.certdir || (currentConfig.cert && currentConfig.key)) return startProxy();

    const keydir1 = './greenlock.d/live/' + currentConfig.domain + '/privkey.pem';
    const certdir1 = './greenlock.d/live/' + currentConfig.domain + '/fullchain.pem';
    currentConfig.key  = path.resolve(process.cwd(), keydir1);
    currentConfig.cert  = path.resolve(process.cwd(), certdir1);    

    if(!currentConfig.cloudflare_token && currentConfig.upnp){
        await client.unmap(80);

        client.map(80,currentConfig.httpport).then((err)=> {
            console.warn('upnp Port 80 mapped!');
            startServer();    
        }).catch((err) => {
            console.warn('upnp port 80 mapping failed!', err);
        });

    } else startServer();    
}


function loadConfig(){

    if(fs.existsSync(process.cwd()+'/current.site.cfg')) currentConfig = require(process.cwd()+'/current.site.cfg');
    else {
        fs.copyFileSync(__dirname + '/example.site.cfg', process.cwd()+'/current.site.cfg');
        console.warn("\r\nPlease Modify your site config file: current.site.cfg!");
        return false;
    }
    console.log("\r\ndomain config:\r\n");
    console.log(currentConfig);
    if(!currentConfig) return false;

    return true;
}


async function onFolderRequest (req, res) {

    const onNotFound = () => {
        res.statusCode = 404;
        res.end(html404);
    }

    const pathName = req.url.indexOf('?')>0 ? req.url.substring(0, req.url.indexOf('?')) : req.url;
    if(pathName.endsWith('/')) return index(req,res, onNotFound);
    const sent = await send(req, pathName, { root: rootDir});
    if(sent.type === 'directory') return index(req,res, onNotFound);

    res.writeHead(sent.statusCode, sent.headers);
    sent.stream.pipe(res);
}


async function onWebsiteRequest (req, res) {

    const pathName = req.url.indexOf('?')>0 ? req.url.substring(0, req.url.indexOf('?')) : req.url;
    const sent = await send(req, pathName, { root: rootDir});
    res.writeHead(sent.statusCode, sent.headers);
    sent.stream.pipe(res);
}


function startProxy(){

    pacProxy.proxy(currentConfig);

    if(currentConfig.upnp){
        client.unmap(currentConfig.proxyport).then(()=>
            client.map(currentConfig.proxyport,currentConfig.port).then(()=>
                console.warn('upnp Port ' + currentConfig.proxyport +' mapped!')
            ).catch((err) =>
                console.warn('upnp port mapping failed!', err))
        );
    }

    const vlookup = dns.lookup;
    const cacheable = new CacheableLookup({lookup: vlookup});
    dns.lookup = cacheable.lookup;        
}


function startServer(){

    try {
        const rawdata = fs.readFileSync(process.cwd()+'/greenlock.d/config.json');
        var config = JSON.parse(rawdata);
        accountEmail = config.defaults.subscriberEmail;
        console.log("maintainer: " + accountEmail + '\r\n');
    } catch(e) {
        //console.log(e);
    }

    if(currentConfig.cloudflare_token){
        dnsModuleName = 'acme-dns-01-cloudflare';
        clChallenge = {
            module: dnsModuleName,
            token: currentConfig.cloudflare_token,
            verifyPropagation: false,
            verbose: true 
        };
    }

    if(!accountEmail){
        if(!checkEmail(currentConfig.email)) return console.warn('\r\ninvalid email format!');
        if(!checkDomain(currentConfig.domain)) return console.warn('\r\ninvalid domain format!');
        var config = getConfig(currentConfig.email);
        var site = getSite(config,currentConfig.domain,clChallenge);
        accountEmail = currentConfig.email;
        addsite(config,site);
    } else if( !hassite(config,currentConfig.domain,dnsModuleName)) {
        if(!checkDomain(currentConfig.domain)) return console.warn('\r\ninvalid domain format!');
        var site = getSite(config,currentConfig.domain,clChallenge);
        addsite(config,site);
    }

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

    httpServer = glx.httpServer();

    var httpReady = false;
    var httpsReady = false;

    httpsServer.listen(0, "127.0.0.1", () => {
        httpsReady = true;
        //console.info("\r\n Https SSL Cert Server Listening on ", httpsServer.address());
        if(httpReady || currentConfig.cloudflare_token) requestSSLCert();
    });

    if(!currentConfig.cloudflare_token){
        httpServer.listen(currentConfig.httpport, "0.0.0.0", () => {
            httpReady = true;
            if(httpsReady) requestSSLCert();
            //console.info("\r\n Http SSL Cert Server Listening on ", httpServer.address());
        });
    }
}


function endCertRequest() {
    if (!fs.existsSync(currentConfig.key))  return console.warn("\r\nFailed to obtain SSL certificate!");

    startProxy();

    setTimeout(()=>{
        httpServer.close();
        httpsServer.close();
        if(currentConfig.upnp){
            if(!currentConfig.cloudflare_token) client.unmap(80).then(() => client.destroy());
            else client.destroy();
        }
        console.log("\r\nFinished Obtain SSL certificate ");}, 30000);
}


function requestSSLCert() {

    const clookup = (hostname, opts, cb) => {
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


function getSite(config, domain, dnsChallenge){
    const site= {
        "subject": domain,
        "renewAt": 1
    };

    config.sites.forEach(element => {
        if(element.subject==domain) {
            site.renewAt = element.renewAt;
            site.altnames = element.altnames;
        }
    });

    if(dnsChallenge) site.challenges={"dns-01":dnsChallenge}

    return site;
}


function addsite(config,site){
    config.sites=[];
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


function hassite(config,domain,dnsModuleName){
    let _hassite = false;
    config.sites.forEach(element => {
        if(element.subject==domain) {
            console.warn('domain already exists 域名已经存在');
            if(dnsModuleName){
                if(element.challenges && element.challenges["dns-01"] && element.challenges["dns-01"].module==dnsModuleName && element.challenges["dns-01"].token==currentConfig.cloudflare_token )  _hassite = true;
            } else if(!element.challenges) _hassite = true;
        }
    });
    return _hassite;
}


function checkEmail(email) {
    if (!email) return false;
    const {account,address} = email.split('@');
    if(!address) return false;
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
