'use strict';

const pacProxy = require('pacproxy-js');
const greenlock = require('greenlock-express');
const fs = require('fs');
var domain = false;
var domainConfig = false;
var accountEmail = false;

exports.load = load;
exports.startServer = startServer;

runServer();

function runServer(){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(load()) startServer();
}

function load(vdomain, vdomainConfig, vaccountEmail)
{

    if(!vdomain){
        if(!process.argv[2]) return false;
        domain = process.argv[2];
        console.log("\r\ndomain: " + domain + '\r\n');
    } else domain = vdomain;

    if(vdomainConfig) domainConfig = vdomainConfig;
    else if(fs.existsSync(domain)) domainConfig = require('./' + domain );
    else {
        console.log("/r/n Please add this domain use command: ./pacpadd.sh " + domain + "/r/n");
        return false;
    }

    domainConfig = require('./' + domain );

    console.log("\r\ndomain config: \r\n");
    console.log(domainConfig);
    if(!domainConfig) return false;

    if(vaccountEmail) accountEmail = vaccountEmail;
    else if(process.argv[3]) accountEmail = process.argv[3];
    else {
        let rawdata = fs.readFileSync('./greenlock.d/config.json');
        let config = JSON.parse(rawdata);
        accountEmail = config.defaults.subscriberEmail;
    }        
    console.log("maintainer: " + accountEmail + '\r\n');
    if(!accountEmail) return false;

    domainConfig.domain = domain;
    if(!domainConfig.https) domainConfig.https = true;
    if(!domainConfig.httpport) domainConfig.httpport = 80;
    if(!domainConfig.port) domainConfig.port = 443;
    if(!domainConfig.proxyport) domainConfig.proxyport = 443;

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
    
    var httpsServer = glx.httpsServer(null, function(req, res) {
        pacProxy.handleRequest(req, res);
    });

	httpsServer.on('connect', pacProxy.handleConnect);

    httpsServer.listen(domainConfig.port, "0.0.0.0", function() {
        console.info("Listening on ", httpsServer.address());
    });

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    httpServer.listen(domainConfig.httpport, "0.0.0.0", function() {
        console.info("Listening on ", httpServer.address());
        console.log("\r\nshare your pac url:  \r\n%s\r\n", 'https://'+ domainConfig.domain + domainConfig.paclink +"\r\n");
    });

}