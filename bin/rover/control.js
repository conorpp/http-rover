/*
    Top level entity for rover.
*/

//Requirements
var redis = require('socket.io/node_modules/redis'),
    Stream = require('./stream'),
    Rover = require('./rover'),
    serialPort = require("serialport").SerialPort;

//Handle terminal args.  *S is global.
if (process.argv.indexOf('deploy') != -1){
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}

var i = process.argv.indexOf('-usb');	//usb addr for board.
if (i!=-1) {
    var addr = process.argv[i+1];
}else var addr = '/dev/ttyUSB1'

console.log('Starting up rover.  Here are settings ', S);

/* Global variables for rover.  Do not reuse these names */
terminal = require('child_process');
pub = redis.createClient(S.redis_port, S.host);		//feedback channel
sub = redis.createClient(S.redis_port, S.host);
C = require('./lib/colorLog');
serial = new serialPort(addr, {
    baudrate: 9600
});
/********************************************************/
sub.subscribe('rover');			//communication channels
sub.subscribe('roverAdmin');

//Administrative commands.
sub.on('message', function(channel, data){
    data = JSON.parse(data);
    switch (data.func) {
        case 'reset':
	    if (channel != 'roverAdmin') {
		console.log('unauthorized attempt for ' + data.func + 'command');
		return;
	    }
            C.log('Resetting stream . . .', {color:'blue', newline:false});
            Stream.reset();
        break;
	case 'ping':
	    pub.publish('feedback', JSON.stringify({func:'ping'}));
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
if (process.argv.indexOf('nostream') == -1) {
    Stream.run();
}





