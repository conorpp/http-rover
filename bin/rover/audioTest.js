
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
  bitDepth: 8,          // 16-bit samples
  sampleRate: 48000,    // 44,100 Hz sample rate
  signed:true
});

var UDP = {
    
    srv: null,
    
    connect: function(){
        var dgram = require('dgram');
        this.srv = dgram.createSocket("udp4");
        this.srv.bind(9004);
        this.handlers();
        this.heartBeat();
    },
    
    /*   Pings server to maintain connection.   */
    heartBeat: function(){
        var buf = new Buffer('ping', 'utf8');
        this.srv.send(buf, 0, buf.length, S.udp_port, S.ip);
        setInterval(function(){
            var buf = new Buffer('ping', 'utf8');
            UDP.srv.send(buf, 0, buf.length, S.udp_port, S.ip);
        }, 5000);
    },
    
    handlers: function(){
        
        /*  Play the PCM  */
        this.srv.on("message", function (msg, rinfo) {
            speaker.write(msg); 
        });
        
        
        this.srv.on("listening", function () {
          var address = UDP.srv.address();
          console.log(" UDP server listening " + address.address + ":" + address.port);
        });
        
        this.srv.on('error', function (err) {
          console.error('UDP err ',err);
        });

    }
    
};

UDP.connect();


