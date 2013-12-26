/*
    Top level entity for rover.
    Handles scripts, settings, globals and terminal args.
    
    requirements:
	nodejs - child_process
	custom lib - colorLog, serial
	
    scripts:
	stream, motors, gps, admin, comm
*/
var SETUP = function(){
//Determine which settings file to use.
if (process.argv.indexOf('deploy') != -1){		
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}
console.log('Startin up rover.  Here are the settings', S);


/* Global variables.  Do not overwrite these names! */
Terminal = require('child_process'),
C = require('./lib/colorLog'),
Serial = require('./lib/serial'),
GPS = require('./gps'),
Stream = require('./stream'),
Rover = require('./motors'),
Emit = require('./comm');

//Start dependent scripts.
Rover.connect();
GPS.connect();
Emit.info();
if (process.argv.indexOf('nostream') == -1) {
    Stream.connect();
    setInterval(function(){
	Stream.reset();
    },1000*60*10);
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

//Kill necessary processes before exciting.  Necessary for ffmpeg & webcam. wow.
process.on('SIGINT', function() {
    var words = [' merrily', ' gracefully', ' sullenly', ' asap', '. wow such force', ' tomorrow (jk)', ' with you', ' in style', '. Good bye.', ' bye', ' k?', ' goodnight', ' wahh', 'town', ' your application for you', ' again',' baby',' such speed.', ' wow.','<3',''];
    C.log('           Shutting down'+words[Math.floor(Math.random() * (words.length-1))]+'                 ',
	  {color:'random', font:'random', bg:'random', intense:true});
    Stream.kill();
    process.exit();
});
}//end setup

if (process.argv.indexOf('now') != -1) {
    SETUP();
}else{
    setTimeout(function(){
	SETUP();
    },10*1000);
}

