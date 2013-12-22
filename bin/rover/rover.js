/*
	Module for driving rover.
*/

var Rover = {
	
    ready:false,					//connection indicator
    isMoving:false,					//moving indicator
    stopInter:260,					//responsiveness vs jitteryness
    
    /*
	Connect to rover and allow writing to it.
	tty - Usb tty address.  String.
    */
    connect: function(){
	if (this.ready) {
		console.log('Warning: board might already be connected.');
	}
	this.listen();
	serial.on('open',function () {
		Rover.ready = true;
		process.stdin.resume();
		serial.on('data', function(data) {
			//handle feedback here.
		});
		var buf = new Buffer(1);
		buf.writeUInt8(0x0,0);
		serial.write(buf, function(err, results) {
			if (err) {
				console.error('Error connecting : ' , err );
			}else{
				console.log('Board connected successfully.');
			}
		});
	});
	/* accept a decimal number on range 0-255 
	   writes the hex conversion to usb.  STDIN.   */
	process.stdin.on('data', function(data){
	    Rover.write(data);
	});
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
            serial.write(buf, function(err, results){
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
        console.log('stopping');
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
    listen: function(){
	console.log('listening for commands . . .');
	sub.on('message', function(channel, data){
	    if (channel!='rover') return;
	    data = JSON.parse(data);
	    console.log('Command : ',data.func);
	    switch (data.func) {
		
		case 'forward':
		    Rover.moving();
		    Rover.write(127,255);
		break;
		case 'left':
		    Rover.moving();
		    Rover.write(107,158);
		break;
		case 'right':
		    Rover.moving();
		    Rover.write(21,235);
		break;
		case 'forwardleft':
		    Rover.moving();
		    Rover.write(31,128);
		    
		break;
		case 'forwardright':
		    Rover.moving();
		    Rover.write(1,160);
		break;
		case 'stop':
		    Rover.stop();
		break;
		case 'reverse':
		    Rover.moving();
		    Rover.write(1,128);
		break;

		default:
		console.log('No cases were met on rover pubsub.');
	    }
	});
    }
    
};

module.exports = Rover;

