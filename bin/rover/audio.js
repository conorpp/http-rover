/*
    Listens for PCM stream on udp socket with webserver.
    Plays stream on speakers.
*/


module.exports = (function(){

var Speaker = require('speaker');

// Create the Speaker instance
var speaker = new Speaker({
  channels: 2,          
  bitDepth: S.audioBitDepth,          
  sampleRate: 48000,    
  signed:true
});

var Audio = {
    
    srv: null,
    
    listen: function(){
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
            Audio.srv.send(buf, 0, buf.length, S.udp_port, S.ip);
        }, 5000);
    },
    
    handlers: function(){
        
        /*  Play the PCM  */
        this.srv.on("message", function (msg, rinfo) {
            speaker.write(msg); 
        });
        
        
        this.srv.on("listening", function () {
          var address = Audio.srv.address();
          C.log('Speakers ready', {color:'green', font:'bold', logLevel:1});
        });
        
        this.srv.on('error', function (err) {
          console.error('UDP err ',err);
        });

    }
};

return Audio;

})();


