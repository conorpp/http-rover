/*
    Top level entity for rover.
*/

//Requirements
var redis = require('socket.io/node_modules/redis'),
    Stream = require('./stream'),
    Rover = require('./rover'),
    serialPort = require("serialport").SerialPort;

//Handle terminal args
if (process.argv.indexOf('deploy') != -1){
    var S = require('./deployment/settings').Settings;
}else{
    var S = require('./../static_admin/js/settings').Settings;
}

console.log('Starting up rover.  Here are settings ', S);

/* Global variables for rover.  Do not reuse these names */
terminal = require('child_process');
pub = redis.createClient(S.redis_port, S.host);
sub = redis.createClient(S.redis_port, S.host);
serial = new serialPort("/dev/ttyUSB0", {
    baudrate: 9600
});
/********************************************************/

//Administrative commands.
sub.on('message', function(channel, data){
    data = JSON.parse(data);
    switch (data.func) {
        case 'reset':
	    if (channel != 'roverAdmin') {
		console.log('unauthorized attempt to reset cam.');
		return;
	    }
            console.log('Resetting stream . . .');
            Stream.reset();
        break;
        default:
	    if (channel == 'roverAdmin') {
		console.log('No cases met on admin channel.');
	    }
    }
});

process.on('SIGINT', function() {
    Stream.kill();
    process.exit();
});

Rover.connect();
if (process.argv.indexOf('nostream') == -1) {
    Stream.run();
}
