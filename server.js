'use strict';

const pacProxy = require('pacProxy-js');
const fs = require('fs');
var domain = false;
var domainConfig = false;
var accountEmail = false;

exports.load = load;
exports.startServer = startServer;

run();

function run(){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(load()) startServer();
}


function load(vdomain, vdomainConfig)
{

    if(!vdomain){
        if(!process.argv[2]) return false;
        domain = process.argv[2];
        console.log("\r\ndomain: " + domain + '\r\n');
    } else domain = vdomain;

    if(!vdomainConfig) domainConfig = require('./' + domain );
    else domainConfig = vdomainConfig;

    if(!domainConfig) return false;

    let rawdata = fs.readFileSync('./greenlock.d/config.json');
    let config = JSON.parse(rawdata);
    accountEmail = config.defaults.subscriberEmail;
    if(!accountEmail) return false;
    console.log("maintainer: " + config.defaults.subscriberEmail + '\r\n');

    return true;
}


function startServer()
{
    require('greenlock-express')
        .init({
            packageRoot: __dirname,
            configDir: "./greenlock.d",
            maintainerEmail: accountEmail,
            cluster: false
        })
        .ready(httpsWorker);
}


function httpsWorker(glx) {
    domainConfig.https = true;
    domainConfig.port = 443;
    domainConfig.domain = domain;
    domainConfig.proxyport = 443;

    pacProxy.load(domainConfig);
    
    var httpsServer = glx.httpsServer(null, function(req, res) {
        pacProxy.handleRequest(req, res);
    });

	httpsServer.on('connect', pacProxy.handleConnect);


    httpsServer.listen(443, "0.0.0.0", function() {
        console.info("Listening on ", httpsServer.address());
    });

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    httpServer.listen(80, "0.0.0.0", function() {
        console.info("Listening on ", httpServer.address());
    });

    console.log("\r\nshare your pac url:  \r\n%s\r\n", 'https://'+ domainConfig.domain +domainConfig.paclink );
}