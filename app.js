'use strict';

// if website is empty, you can add page request handler or websocket handler

exports.onrequest = false;
exports.onconnection = false;


//page request handler
function onrequest(req, res){
    console.log('all website url handled here except paclink' )
}

//websocket handler
function onconnection(ws, req){
    console.log('all websocket url handled here except wsslink' )
}