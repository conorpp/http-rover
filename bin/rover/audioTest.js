
if (process.argv.indexOf('deploy') != -1){		
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}
console.log(S);

var Speaker = require('speaker');

// Create the Speaker instance
var speaker = new Speaker({
  channels: 2,          // 2 channels
  bitDepth: 32,          // 16-bit samples
  sampleRate: 48000,    // 44,100 Hz sample rate
  signed:true
});

console.log('speaker obj ', speaker);

var dgram = require('dgram');
var srv = dgram.createSocket("udp4");
var i = 0;
var bufs = [];
/*****************------------************************/
var audBufs = [];
srv.on("message", function (msg, rinfo) {
    audBufs.push(msg);
   // if (audBufs.length > 100) {
   //     for (var n in audBufs) {
           speaker.write((msg)); 
   //    }
   //     audBufs = [];
   // }
});
/*********************------------********************/

srv.on("listening", function () {
  var address = srv.address();
  console.log(" upd server listening " + address.address + ":" + address.port);
});

srv.on('error', function (err) {
  console.error(err);
  process.exit(0);
});

srv.bind(9002);

    var buf = new Buffer('ping', 'utf8');
    srv.send(buf, 0, buf.length, S.udp_port, S.ip);
setInterval(function(){
    console.log('sending UPD packet');
    //socket.send(buf, offset, length, port, address, [callback])
    
    var buf = new Buffer('ping', 'utf8');
    srv.send(buf, 0, buf.length, S.udp_port, S.ip);
    
},5050);
