#!/usr/bin/env node

'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const pacProxy = require('pacproxy-js');
const app = require('./app.js');
const readline = require('readline-sync');
const path = require('path');

var currentConfig = false;
var accountEmail = false;

exports.runServer = runServer;
exports.app = app;

runServer();

function runServer(vConfig){
    if(!vConfig) {
        if(!process.argv[1].includes(__filename)) return;  //used as a module
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
        fs.copyFileSync('example.site.cfg', 'current.site.cfg');
        console.log("/r/n Please Modify your site config file /r/n");
        return false;
    }

    console.log("\r\ndomain config:");
    console.log(currentConfig);
    if(!currentConfig) return false;
 
    try {
        let rawdata = fs.readFileSync(process.cwd()+'/greenlock.d/config.json');
        var config = JSON.parse(rawdata);
        accountEmail = config.defaults.subscriberEmail;
        console.log("maintainer: " + accountEmail + '\r\n');
    } catch(e) {
        //console.log(e);
    }

    let dm = readline.question('Add a new domain[no]?[no]: ');
    if((!dm) || dm.toLowerCase()=='n' || dm.toLowerCase()=='no'){
        if(accountEmail) return true;
        else return false;
    }
    else if(!checkDomain(dm)) {
        console.log('Wrong domain format错误的域名格式');
        return false;
    }

    let site = getSite(dm);
    if(accountEmail) return addsite(config, site);

    accountEmail = readline.question('Please input manager email: ');
    if(!checkEmail(accountEmail)) {
        console.log('Wrong email format');
        return false;
    }

    var config = getConfig(accountEmail);
    return addsite(config,site);
}


function startServer()
{
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
    if(!currentConfig.https) currentConfig.https = true;
    if(!currentConfig.httpport) currentConfig.httpport = 80;
    if(!currentConfig.port) currentConfig.port = 443;
    if(!currentConfig.proxyport) currentConfig.proxyport = 443;
    if(!currentConfig.innerport) currentConfig.innerport = 7513;
    currentConfig.onrequest = app.onrequest;
    currentConfig.onconnection = app.onconnection;

    var httpsServer = glx.httpsServer(null, function(req, res) {
        pacProxy.handleRequest(req, res);
    });

    //currentConfig.server = httpsServer;
    //currentConfig.skiprequest = true;
    let keydir1 = './greenlock.d/live/' + currentConfig.domain + '/privkey.pem';
    let certdir1 = './greenlock.d/live/' + currentConfig.domain + '/fullchain.pem';
    currentConfig.key  = path.resolve(process.cwd(), keydir1);
    currentConfig.cert  = path.resolve(process.cwd(), certdir1);

    pacProxy.proxy(currentConfig);

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    httpServer.listen(currentConfig.httpport, "0.0.0.0", function() {
        console.info("\r\n Http Listening on ", httpServer.address());
    });
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

    let domainExists = false;
    config.sites.forEach(element => {
        if(element.subject==site.subject) {
            console.warn('domain already exists 域名已经存在');
            domainExists = true;
        }
    });

    if(domainExists) return false;

    config.sites.push(site);
    try{
        if(fs.existsSync(process.cwd()+'/greenlock.d/config.json')) fs.renameSync(process.cwd()+'/greenlock.d/config.json',process.cwd()+'/greenlock.d/config.json.bak'); 
        var content = JSON.stringify(config);
        if(!fs.existsSync(process.cwd()+'/greenlock.d')) fs.mkdirSync(process.cwd()+'/greenlock.d');
        fs.writeFileSync(process.cwd()+'/greenlock.d/config.json', content);

        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}