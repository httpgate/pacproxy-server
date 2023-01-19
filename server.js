'use strict';

const greenlock = require('greenlock-express');
const fs = require('fs');
const app = require('./app.js');

var domainConfig = false;
var accountEmail = false;

exports.load = load;
exports.startServer = startServer;

runServer();

function runServer(){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(load()) startServer();
}

function load(vdomainConfig)
{
    if(vdomainConfig) domainConfig = vdomainConfig;
    else if(fs.existsSync('current.site.cfg')) domainConfig = require('./current.site.cfg');
    else {
        fs.copyFileSync('example.site.cfg', 'current.site.cfg');
        console.log("/r/n Please Modify your site config file /r/n");
        return false;
    }
    domainConfig = require('./current.site.cfg');

    console.log("\r\ndomain config:");
    console.log(domainConfig);
    if(!domainConfig) return false;
 
    let rawdata = fs.readFileSync('./greenlock.d/config.json');
    let config = JSON.parse(rawdata);
    accountEmail = config.defaults.subscriberEmail;
    console.log("maintainer: " + accountEmail + '\r\n');
    if(!accountEmail) return false;

    if(!domainConfig.https) domainConfig.https = true;
    if(!domainConfig.httpport) domainConfig.httpport = 80;
    if(!domainConfig.port) domainConfig.port = 443;
    if(!domainConfig.proxyport) domainConfig.proxyport = 443;

    app.pacProxy.load(domainConfig);

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

