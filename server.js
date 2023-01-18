'use strict';

const pacProxy = require('pacproxy-js');
const fs = require('fs');
var domain = false;
var domainConfig = false;
var accountEmail = false;
var fatalError= false;

exports.load = load;
exports.startServer = startServer;

runServer();

function runServer(){
	if(!process.argv[1].includes(__filename)) return;  //used as a module
    if(load()) startServer();
}


function fatalHandler(err, result) {
    if(err) console.log('error', err);
    fatalError = err ? true : false;
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
    else if(fs.existsSync('default.site.cfg')) fs.copyFileSync('default.site.cfg', domain);
    else {
        console.log("/r/n Please Modify site config file: default.site.cfg and " + domain + "/r/n");
        fs.copyFileSync('example.site.domain', 'default.site.cfg');
        fs.copyFileSync('example.site.domain', domain);
    }
    if(!fatalError)  domainConfig = require('./' + domain );

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

    console.log("\r\nshare your pac url:  \r\n%s\r\n", 'https://'+ domainConfig.domain + domainConfig.paclink +"\r\n");
}