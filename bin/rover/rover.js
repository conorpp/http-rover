
if (process.argv.indexOf('deploy') != -1){
	console.log('DEPLOYMENT');
    var S = require('./deployment/settings').Settings;
}else{
    var S = require('./../static_admin/js/settings').Settings;
}
console.log(process.argv)
if (process.argv.indexOf('nostream') == -1) {
	var stream = true;
}else var stream = false;

console.log('Starting up rover.  Here are settings ', S);

var redis = require('socket.io/node_modules/redis');
var pub = redis.createClient(S.redis_port, S.host);
var sub = redis.createClient(S.redis_port, S.host);
sub.subscribe('rover');
sub.subscribe('roverAdmin');

//run/restart the webcam stream async
var spawns = [];
var cmds = [];
var PASSWORD = 'abc';
var terminal = require('child_process');
console.log('Starting video and audio streams . . .');
//ffmpeg <video options> -i <video source> <audio options> -i <audio source> <output options> <output destination>
/*
whole command:
$ffmpeg -f video4linux2 -s 320x240 -r 15 -i /dev/video1 -f alsa -ac 1 -i hw:1,0 -acodec libvo_aacenc -f flv rtmp://184.173.103.51:31002/rovervideo/mystream
*/
var fullStream = 'ffmpeg -f video4linux2 -s 320x240 -r 15 -i /dev/video1 -f alsa -ac 1 -i hw:1,0 -acodec libvo_aacenc -f flv rtmp://184.173.103.51:31002/rovervideo/mystream';
var video = 'ffmpeg -f video4linux2 -s 320x240 -r 15 -i /dev/video1 -an -f flv rtmp://184.173.103.51:31002/rovervideo/mystream';
var audio = 'ffmpeg -f alsa -ac 1 -i hw:1,0 -acodec libvo_aacenc -f flv rtmp://184.173.103.51:31002/roveraudio/mystream';
if (stream && process.argv.indexOf('fullstream') != -1) {
	cmds.push(fullStream);	//unstable,slow
	terminal.exec(fullStream);
} else if (stream) {
	cmds.push(video);
	cmds.push(audio);
	terminal.exec(video);
	terminal.exec(audio);
}
function killSpawns(reset){
    reset = reset || false;
    terminal.exec('pkill -9 ffmpeg');
    if (reset) {
        console.log('reset');
        setTimeout(function(){
            for (var i in cmds) {
                terminal.exec(cmds[i]);
            }
            var data = JSON.stringify({func:'reset'});
            pub.publish('feedback', data);
        },100);
    }
}
process.on('SIGINT', function() {
    killSpawns();
    process.exit();
});
/* init the board */

var SerialPort = require("serialport").SerialPort
var tty = 'ttyUSB0';

var serialPort = new SerialPort("/dev/"+tty, {
  baudrate: 9600
}); 

serialPort.on('open',function () {
  Rover.init();
  process.stdin.resume();
  serialPort.on('data', function(data) {});
  var buf = new Buffer(1);
  buf.writeUInt8(0x0,0);

  serialPort.write(buf, function(err, results) {
    if (err) {
        console.error('Error connecting : ' , err );
    }else{
        console.log('Connected Successfully.');
    }
  });
});

/* accept a decimal number on range 0-255 
   writes the hex conversion to usb.  STDIN.   */
process.stdin.on('data', function(data){
    Rover.write(data);
});



var Settings = {
    host:'http://localhost',
    commandPort:4000
};
var Rover = {
    ready:false,
    isMoving:false,
    stopInter:260,		//responsiveness vs jitteryness
    
    init: function(){
        this.ready = true;
        /*setInterval(function(){
            if (this.isMoving) return;
            Rover.stop();
        },this.stopInter);*/
    },
    
    /* writes all args to serial port. */
    write: function(){
        if (!this.ready) { 
            console.log('Board not ready yet.');
            return;
        }
        for (var i = 0; i < arguments.length; i++) {
            var num = parseInt(arguments[i]);
            var errs = num<0 || num>255 ||isNaN(num);
            if (errs) {
                console.error('You must enter a decimal in range of 0-255');
                return;
            }
            var hex = num.toString(16);
            var buf = new Buffer(1);
            buf.writeUInt8('0x'+hex,0);
            serialPort.write(buf, function(err, results){
                if (err) console.error('Error writing to c1 : ', err);
            });
        }

    },
    /* prevents  infinite moving */
    timeout:null,
    moving:function(){
        this.isMoving = true;
        clearInterval(this.timeout);
        this.timeout = setInterval(function(){
	    Rover.stop();
           // clearTimeout(Rover.timeout);
        },this.stopInter);
    },

    blink: function(on){
    },
    
    forward:function(){
        this.moving();
        this.write(1,128);
    },
    
    left: function(){
        this.moving();
        this.write(107,158);
    },
    
    right:function(){
        this.moving();
	this.write(21,235);
    },
    
    reverse:function(){
        this.moving();
        this.write(127,255);
    },
    
    stop: function(){
        console.log('stopping');
        this.write(0,0);
        setTimeout(function(){      //safety
            Rover.write(0,0);    
        },10);
    }
    
};

sub.on('message', function(channel, data){
    data = JSON.parse(data);
	console.log(data.func);
    switch (data.func) {
        case 'blink':
            console.log('Blinking');
            Rover.blink(data.on);
        break;
            
        case 'forward':
            Rover.forward();
        break;
        case 'left':
            Rover.left();
        break;
        case 'right':
            Rover.right();
        break;
        case 'forwardleft':
		Rover.moving();
	    Rover.write(31,128);
	    
        break;
        case 'forwardright':
		Rover.moving();
            Rover.write(1,158);
        break;
        case 'stop':
            Rover.stop();
        break;
        case 'reverse':
            Rover.reverse();
        break;
        case 'reset':
	    if (channel != 'roverAdmin') {
		console.log('unauthorized attempt to reset cam.');
		return;
	    }
            console.log('Resetting spawns . . .');
            var reset = true;
            killSpawns(reset);
        break;
        default:
            console.log('No cases were met on pubsub.');
    }
});

 
//ffmpeg -f alsa -i plughw:CARD=PCH,DEV=0 -acodec libmp3lame -t 20 output.mp4
