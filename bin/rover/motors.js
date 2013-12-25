/*
	Module for controlling motor driver.
	
	Requirements:
		custom lib - serial, colorLog (in server.js)
*/

var Rover = {
	
    ready:false,		//connection indicator
    isMoving:false,		//moving indicator
    stopInter:260,		//responsiveness vs jitteryness
    serial:null,
    
    /*
	Connect to rover and allow writing to it.
	tty - Usb tty address.  String.
    */
    connect: function(){
	if (this.ready) {
		C.log('Warning: board might already be connected.', {color:'yellow'});
	}
	
        Serial.link('motor',function(err, _data){
            if (_data && _data.serial) {
                _data.serial.open(function(){
                    C.log('Rover Ready', {color:'green', font:'bold', logLevel:1});
		    Rover.serial = _data.serial;
                    Rover.ready = true;
		    process.stdin.resume();
                    _data.serial.on('data', function(data){
			//Handle feedback from board here
                    });
		    var buf = new Buffer(1);
		    buf.writeUInt8(0x0,0);
		    _data.serial.write(buf, function(err, results) {
		       	if (err) {
				C.log('Error connecting rover: ' , err );
			}
 		    });
                });
            }else{
                C.log('Motors Failed', {color:'red', font:'bold', logLevel:1});
            }
        });

	/* accept a decimal number on range 0-255 
	   writes the hex conversion to usb.  STDIN.   */
	process.stdin.on('data', function(data){
	    Rover.write(data);
	});
	this.GPSListen();
    },
    
    /* writes all args to serial port. */
    write: function(){
        if (!this.ready) { 
            C.log('Board not ready yet.', {color:'red', background:'black'});
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
            Rover.serial.write(buf, function(err, results){
                if (err) console.error('Error writing to serial : ', err);
            });
        }

    },
    /* prevent infinite moving */
    timeout:null,
    moving:function(){
        this.isMoving = true;
        clearInterval(this.timeout);
        this.timeout = setInterval(function(){
	    Rover.stop();
        },this.stopInter);
    },

    blink: function(on){},
    
    stop: function(){
        C.log('stopping', {newline:false, color:'red',background:'white'});
        this.write(0,0);
        setTimeout(function(){      //safety
            Rover.write(0,0);    
        },10);
    },
    /*
	Call once to listen for commands.
	motor args:
	Left F fastest - 1
	Left F slowest - 60
	
	Left R fastest - 127
	Left R slowest - 68
	
	Right F fastest - 128
	Right F slowest - 185
	
	Right R fastest - 255
	Right R slowest - 195
    */


    
    GPSListen: function(){
	GPS.on('data', function(data){
	    if (!data || !data.valid) {
		C.log('GPS data is not valid', {color:'red'});
		return;
	    }
	   // C.log('Distance:  ',
		//data.distance,
		//{color:'blue'});
	   //C.log('Lat: ', data.lat, ' Lng: ', data.lng);
	    if (data.distance > 0.0032) {
		//C.log('OUT OF RANGE! ', {color:'red', font:'bold'});
	    }
	});
    }
    
};

module.exports = Rover;
