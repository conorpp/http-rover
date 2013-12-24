/*
    Top level entity for rover.
*/
//GOT UPDATES!!!
//Requirements
var redis = require('socket.io/node_modules/redisPPPP'),
    Stream = require('./stream'),
    Rover = require('./rover'),
    serialPort = require("serialport").SerialPort;

//Handle terminal args.  *  S and C are global.
if (process.argv.indexOf('deploy') != -1){
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}
C = require('./lib/colorLog');

var i = process.argv.indexOf('-rover');	//usb addr for rover.
if (i!=-1) {
    var rover = process.argv[i+1];
}else var rover = S.roverAddr;

i = process.argv.indexOf('-gps');	//usb addr for gps.
if (i!=-1) {
    var gps = process.argv[i+1];
}else var gps = S.gpsAddr;

C.log('Starting up rover.  Here are settings ', S, {color:'green'});

/* Global variables for rover.  Do not reuse these names */
terminal = require('child_process');
GPS = require('./gps'),
pub = redis.createClient(S.redis_port, S.host);		//feedback channel
sub = redis.createClient(S.redis_port, S.host);
serial_rover = new serialPort(rover, {
    baudrate: 9600
}, true, function(err){
    if (!err) return;
    C.log('Rover not connected', {color:'red', font:'bold'});
});
serial_gps = new serialPort(gps, {
    baudrate: 9600
}, true, function(err){
    if (!err) return;
    C.log('GPS not connected', {color:'red', font:'bold'});
});
/********************************************************/
sub.subscribe('rover');			//communication channels
sub.subscribe('roverAdmin');

//Administrative commands.
sub.on('message', function(channel, data){
    data = JSON.parse(data);
    //C.log('got data', data, {color:'red'});
    switch (data.func) {
        case 'reset':
	    if (channel != 'roverAdmin') {
		C.log('unauthorized attempt for ' + data.func + 'command', {color:'red', logLevel:1});
		return;
	    }
            C.log('Resetting stream', {color:'blue'});
            Stream.reset();
        break;
	case 'ping':
	    pub.publish('feedback', JSON.stringify({func:'ping'}));
	break;
	case 'execute':
	    if (channel != 'roverAdmin') {
		C.log('unauthorized attempt for ' + data.func + 'command', {color:'red', logLevel:1});
		return;
	    }
	    C.log('about to exec command ', data, {color:'yellow'});
	    terminal.exec(data.command, function(err, stdout, stdin){
		var error = err || stdin;
		if (error && error != '') {
		    C.log('Error with exec command : ', error, {color:'red', logLevel:1});
		}
		pub.publish('feedback',
			    JSON.stringify({func:'stdout',stdout:stdout, error:error, command:data.command}));
	    });
	break;
        default:
	    if (channel=='roverAdmin') {
		C.log('No cases met on admin channel.', {color:red});
	    }
    }
});

process.on('SIGINT', function() {
    Stream.kill();
    process.exit();
});

//Start dependent scripts.
Rover.connect();
GPS.connect();

if (process.argv.indexOf('nostream') == -1) {
    Stream.detectAddr(function(){
	Stream.run();
    });
}
if (process.argv.indexOf('debug') != -1) {
  C.set({logLevel: -1});
}else{
  C.set({logLevel: S.logLevel});
}
GPS.set({home: S.home});



