'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const app = require('./app.js');
const { get } = require('http');

var currentConfig = false;
var accountEmail = false;

exports.load = load;
exports.startServer = startServer;

runServer();

function runServer(currentConfig){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(!currentConfig) loadConfig();
    if(!currentConfig) return;
    app.currentConfig = currentConfig;
    startServer();
}

function loadConfig()
{
    if(fs.existsSync('current.site.cfg')) currentConfig = require('./current.site.cfg');
    else {
        fs.copyFileSync('example.site.cfg', 'current.site.cfg');
        console.log("/r/n Please Modify your site config file /r/n");
        return false;
    }
    currentConfig = require('./current.site.cfg');

    console.log("\r\ndomain config:");
    console.log(currentConfig);
    if(!currentConfig) return false;
 
    let rawdata = fs.readFileSync('./greenlock.d/config.json');
    let config = JSON.parse(rawdata);
    accountEmail = config.defaults.subscriberEmail;
    console.log("maintainer: " + accountEmail + '\r\n');
    if(!accountEmail) return false;

    if(!currentConfig.https) currentConfig.https = true;
    if(!currentConfig.httpport) currentConfig.httpport = 80;
    if(!currentConfig.port) currentConfig.port = 443;
    if(!currentConfig.proxyport) currentConfig.proxyport = 443;

    app.pacProxy.load(currentConfig);
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
        .ready(app.httpsWorker);
}