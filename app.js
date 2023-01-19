'use strict';
const pacProxy = require('pacproxy-js');
this.currentConfig = false;

function httpsWorker(glx) {
    pacProxy.load(this.currentConfig);

    var httpsServer = glx.httpsServer(null, function(req, res) {
        pacProxy.handleRequest(req, res);
    });

	httpsServer.on('connect', pacProxy.handleConnect);

    httpsServer.listen(this.currentConfig.port, "0.0.0.0", function() {
        console.info("Listening on ", httpsServer.address());
    });

    // Note:
    // You must ALSO listen on port 80 for ACME HTTP-01 Challenges
    // (the ACME and http->https middleware are loaded by glx.httpServer)
    var httpServer = glx.httpServer();

    httpServer.listen(this.currentConfig.httpport, "0.0.0.0", function() {
        console.info("Listening on ", httpServer.address());
        console.log("\r\nshare your pac url:  \r\n%s\r\n", 'https://'+ this.currentConfig.domain + this.currentConfig.paclink +"\r\n");
    });

}

exports.httpsWorker = httpsWorker;
exports.currentConfig = this.currentConfig;
