var S = require('./static_admin/js/settings').Settings;
console.log('Starting up rover.  Here are settings ', S);

var redis = require('socket.io/node_modules/redis');
var sub = redis.createClient(S.redis_port, S.host);
sub.subscribe('rover');

//run the webcam stream async
var PASSWORD = 'abc';
var cmd = 'ffmpeg -s '+S.width+'x'+S.height+' -f video4linux2 -i /dev/video0 -f mpeg1video -b 800k -r 30 http://localhost:8082/'+PASSWORD;
var terminal = require('child_process');
var spawn = terminal.exec(cmd);
process.on('exit', function() {
  console.log('process pid ', spawn.pid);
  terminal.exec('kill -9 '+spawn.pid);
});

var five = require("johnny-five"),
    // or "./lib/johnny-five" when running from the source
    board = new five.Board();
    
board.on("ready", function() {
    console.log('board is ready');
    Rover.ready = true;
    Rover.led13 = new five.Led(13);
});

var Settings = {
    host:'http://localhost',
    commandPort:4000
};
var Rover = {
    ready:false,

    blink: function(on){
        if (!this.ready) {
            console.log('Board is not ready yet.');
            return;
        }
        if (on) {
            this.led13.on();
        }else{
            this.led13.off();
        }
    }
};

sub.on('message', function(channel, data){
    data = JSON.parse(data);

    switch (data.func) {
        case 'blink':
            console.log('Blinking');
            Rover.blink(data.on);
        break;
        default:
            console.log('No cases were met on pubsub.');
    }
});

 
