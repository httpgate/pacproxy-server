'use strict';
const pacProxy = require('pacproxy-js');
var currentConfig = false;

function httpsWorker(glx) {
    pacProxy.load(currentConfig);

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

exports.httpsWorker = httpsWorker;
exports.currentConfig = currentConfig;
