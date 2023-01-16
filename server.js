'use strict';

const pacProxy = require('pacProxy-js');
const fs = require('fs');

if(!process.argv[2]) return;
var domain = process.argv[2];
console.log("\r\ndomain: " + domain + '\r\n');

let domainConfig = require('./' + domain );

let rawdata = fs.readFileSync('./greenlock.d/config.json');
let config = JSON.parse(rawdata);
let accountEmail = config.defaults.subscriberEmail;
console.log("maintainer: " + config.defaults.subscriberEmail + '\r\n');


require('greenlock-express')
    .init({
        packageRoot: __dirname,
        configDir: "./greenlock.d",
        maintainerEmail: accountEmail,
        cluster: false
    })
    .ready(httpsWorker);

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