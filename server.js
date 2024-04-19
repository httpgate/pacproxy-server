#!/usr/bin/env node

'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const pacProxy = require('pacproxy-js');
const app = require('./app.js');
const readline = require('readline-sync');
const path = require('path');
const dns = require('dns');
const CacheableLookup = require('cacheable-lookup');

var currentConfig = false;
var accountEmail = false;

exports.runServer = runServer;
exports.app = app;

if(process.argv[1].includes(__filename)) runServer();

function runServer(vConfig){
    if(!vConfig) {
        if(loadConfig()) startServer();
    } else {
        currentConfig = vConfig
        startServer();
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

    if(process.argv[2] && (process.argv[2].toLowerCase()=='forcert')) currentConfig.forcert = true;

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

    greenlock.init({
            packageRoot: process.cwd(),
            configDir: "./greenlock.d",
            maintainerEmail: accountEmail,
            cluster: false,
            packageAgent: 'pacproxy'
        })
        .ready(httpsWorker);
}

function httpsWorker(glx) {
    if(! ('https' in currentConfig)) currentConfig.https = true;
    if(!currentConfig.httpport) currentConfig.httpport = 80;
    if(!currentConfig.port) currentConfig.port = 443;
    if(!currentConfig.proxyport) currentConfig.proxyport = 443;
    if(! ('websocket' in currentConfig)) currentConfig.websocket = true;
    if(! ('behindTunnel' in currentConfig)) currentConfig.behindTunnel = false;

    if(currentConfig.onrequest) currentConfig.onrequest = app.onrequest;
    if(currentConfig.onconnection) currentConfig.onconnection = app.onconnection;

    var httpsServer = glx.httpsServer(null, function(req, res) {
        pacProxy.handleRequest(req, res);
    });

    let keydir1 = './greenlock.d/live/' + currentConfig.domain + '/privkey.pem';
    let certdir1 = './greenlock.d/live/' + currentConfig.domain + '/fullchain.pem';
    currentConfig.key  = path.resolve(process.cwd(), keydir1);
    currentConfig.cert  = path.resolve(process.cwd(), certdir1);

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    if(!currentConfig.https){}
    else if ((currentConfig.forcert) || (!fs.existsSync(currentConfig.key))){
        httpServer.listen(currentConfig.httpport, "0.0.0.0", function() {
            console.info("\r\n Http Listening on ", httpServer.address());
        });
    
        httpsServer.listen(currentConfig.port, "0.0.0.0", function() {
            console.info("\r\n Https Listening on ", httpsServer.address());
        });

        currentConfig.server = httpsServer;
        currentConfig.skiprequest = true;
    }

    const vlookup = dns.lookup;
    const cacheable = new CacheableLookup({lookup: vlookup});
    dns.lookup = cacheable.lookup;

    pacProxy.proxy(currentConfig);

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

