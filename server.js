#!/usr/bin/env node

'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const pacProxy = require('pacproxy-js');
const app = require('./app.js');

var currentConfig = false;
var accountEmail = false;

exports.startServer = startServer;
runServer();

function runServer(vConfig){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(!vConfig) {
        if(loadConfig()) startServer();
    } else {
        currentConfig = vConfig
        startServer();
    }
}

function loadConfig()
{
    if(fs.existsSync('current.site.cfg')) currentConfig = require('./current.site.cfg');
    else {
        fs.copyFileSync('example.site.cfg', 'current.site.cfg');
        console.log("/r/n Please Modify your site config file /r/n");
        return false;
    }

    console.log("\r\ndomain config:");
    console.log(currentConfig);
    if(!currentConfig) return false;
 
    let rawdata = fs.readFileSync('./greenlock.d/config.json');
    let config = JSON.parse(rawdata);
    accountEmail = config.defaults.subscriberEmail;
    console.log("maintainer: " + accountEmail + '\r\n');
    if(!accountEmail) return false;

    return true;
}


function startServer()
{
    greenlock.init({
            packageRoot: __dirname,
            configDir: "./greenlock.d",
            maintainerEmail: accountEmail,
            cluster: false
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
    currentConfig.server = httpsServer;
    currentConfig.skiprequest = true;
    pacProxy.proxy(currentConfig);

    httpsServer.listen(currentConfig.port, "0.0.0.0", function() {
        console.info("/r/n Https Listening on ", httpsServer.address());
        console.info("/r/n Share your pacproxy link:  ", pacProxy.getShareLink('http'));
        console.info("/r/n Share your wssproxy link:  ", pacProxy.getShareLink('ws'));
    });

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    httpServer.listen(currentConfig.httpport, "0.0.0.0", function() {
        console.info("/r/n Http Listening on ", httpServer.address());
    });

}

