/*
    Top level entity for rover.
    Handles requirements, scripts, and terminal args.
    
    requirements:
	nodejs - child_process
	npm - redis
	custom lib - colorLog, serial
	
    scripts:
	stream, rover, gps, admin
*/

//Determine which settings file to use.
if (process.argv.indexOf('deploy') != -1){		
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}
console.log('Startin up rover.  Here are the settings', S);

var redis = require('socket.io/node_modules/redis'),
    Stream = require('./stream'),
    Rover = require('./rover');
    
C = require('./lib/colorLog');

/* Global variables.  Do not reuse these names */
terminal = require('child_process');
GPS = require('./gps'),
Serial = require('./lib/serial');
pub = redis.createClient(S.redis_port, S.host);	//to server	
sub = redis.createClient(S.redis_port, S.host);	//from server
/********************************************************/

//communication channels
sub.subscribe('rover');
sub.subscribe('roverAdmin');

//Start dependent scripts.
Rover.connect();
GPS.connect();
require('./admin');

if (process.argv.indexOf('nostream') == -1) {
    Stream.connect();
}

//Set addition settings
GPS.set({home: S.home});

var idebug = process.argv.indexOf('-debug');
if (idebug != -1) {
	var level = process.argv[idebug+1];
	if (level) C.set({logLevel: parseInt(level)});
	else C.log('Warning: "-debug" flag given but no value '+
		   'specified.  0 is default.', {color:'yellow'});
}

//Kill necessary processes before exciting.  Necessary for ffmpeg & webcam.wow.
process.on('SIGINT', function() {
    var words = [' merrily', ' gracefully', ' sullenly', ' asap', '. wow such force', ' tomorrow (jk)', ' with you', ' in style', '. Good bye.', ' bye', ' k?', ' goodnight', ' wahh', 'town'];
    var index = words.length-1;
    var word = words[Math.floor(Math.random() * index)];
    C.log('Shutting down'+word, {color:'green', font:'bold',bg:'red'});
    Stream.kill();
    process.exit();
});
