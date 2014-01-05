/*
    Enables audio streaming on webserver.
*/
module.exports = (function(){
    
var BinaryServer = require('binaryjs').BinaryServer;

var websocket = BinaryServer({port: S.audio_port});

websocket.on('connection', function(client){
    console.log('Client connected');
    client.on('stream', function(stream, meta){
        if (meta.channel == 'audio' && live.isCommander(meta.id)) {
            stream.on('data', function(buf){
                if (!rinfo || typeof buf == 'string') return;
                srv.send(buf, 0, buf.length, rinfo.port, rinfo.address);
            });
        }
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

})();
