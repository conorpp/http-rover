/*
    Audio streaming
*/
S = require('./static_admin/js/settings').Settings;
var BinaryServer = require('binaryjs').BinaryServer;

var BSserver = BinaryServer({port: S.audio_port});

BSserver.on('connection', function(client){
    console.log('Client connected');
    client.on('stream', function(stream, buffer){
        if (rinfo)
            srv.send(buffer, 0, buffer.length, rinfo.port, rinfo.address);
        //console.log('length ', buffer.length);
    });
});
var dgram = require('dgram');
var srv = dgram.createSocket("udp4");
var rinfo;
srv.on("message", function (msg, _rinfo) {
    if (msg == 'ping') {
        console.log('ping recieved');
        rinfo = _rinfo;
    }
    console.log("server got: " + msg + " from " + _rinfo.address + ":" + _rinfo.port);
});

srv.on("listening", function () {
  var address = srv.address();
  console.log(" upd server listening " + address.address + ":" + address.port);
});

srv.on('error', function (err) {
  console.error('UDP server error ',err);
});

srv.bind(S.udp_port, S.ip);

//process.stdin.resume();

process.stdin.on('data', function(data){
    //socket.send(buf, offset, length, port, address, [callback])
    var buf = new Buffer(''+data, 'utf8');
    if (rinfo) 
        srv.send(buf, 0, buf.length, rinfo.port, rinfo.address);    
});