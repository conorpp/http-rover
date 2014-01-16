/*
    Enables audio streaming on webserver.
*/
module.exports = (function(){
    
var BinaryServer = require('binaryjs').BinaryServer;

var websocket = BinaryServer({port: S.audio_port});

websocket.on('connection', function(client){
    C.log('Client\'s audio connected'.blue(), {logLevel:0});
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
        C.log('Audio server recieved ping'.blue(), {logLevel:-3});
        rinfo = _rinfo;
    }
});

srv.on("listening", function () {
  var address = srv.address();
  console.log(('UDP server listening ' + address.address + ':' + address.port).green().bold());
});

srv.on('error', function (err) {
  console.error('UDP server error ',err);
});

srv.bind(S.udp_port, S.ip);

})();
