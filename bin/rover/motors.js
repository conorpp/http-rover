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
		C.warn('Warning: board might already be connected.');
	}
        var _serialport = require("serialport");
        var _serialConstr = _serialport.SerialPort;
        _serialport.list(function (err, ports) {
            var addr;
	    //connect to port with correct ID. see `$ lspnp`
            ports.forEach(function(port) {
                C.log(port, {color:'yellow', logLevel:-1});
                if (port.pnpId == 'usb-FTDI_FT232R_USB_UART_A901QJ43-if00-port0')
                        addr = port.comName;
            });
            if (!addr) {
                C.log('Motors Fail', {color:'red', font:'bold', logLevel:1});
                return;
            }
            Rover.serial = new _serialConstr(addr, {
                baudrate: 9600
            });
            Rover.serial.on('data', function(data){
		//Handle feedback from board here
		console.log('motor driver data ', data);
            });
	    //write stop command to start off.
	    /*var buf = new Buffer([0x88, 0x7F]);
	    console.log('WRITING BUF : ', buf);
	    Rover.serial.write(buf, function(err, results) {
		if (err) {
		    C.log('Error connecting rover: ' , err );
	    	}
		if (results) {
		    console.log('results ', results);
		}
    	    });*/
	    
	    Rover.ready = true;
	});
	
	/* accept a decimal number on range 0-255 
	   writes the hex conversion to usb.  STDIN.   */
	process.stdin.resume();
	process.stdin.on('data', function(data){
	    Rover.write(data);
	});
	this.GPSListen();
    },
    
    /* writes a buffer to serial port. */
    write: function(){
        if (!this.ready) { 
            C.log('Board not ready yet.', {color:'red', background:'black'});
            return;
        }
	var buf = new Buffer(Array.prototype.slice.call(arguments));
        Rover.serial.write(buf, function(err, results){
            if (err) console.error('Error writing to serial : ', err);
        });
    },
    /*
	Motor Channel right - reverse: 0x88, forward: 8A
	Motor Channel left - reverse: 0x8c, forward: 0x8e
	
	speed - 0x0 - 0x7f
	
	command format e.g.: 0x88, 0x7f
    */
    forward: function(){
	var speed = 0x7f;
	this.write( 0x8a, speed );
	this.write( 0x8e, speed );
	Rover.moving();
    },
    
    reverse: function(){
	var speed = 0x7f;
	this.write( 0x88, speed );
	this.write( 0x8c, speed );
	Rover.moving();
    },
    
    left: function(){
	var speed = 0x7f;
	this.write( 0x8a, speed) ;
	this.write( 0x8c, speed );
	Rover.moving();
    },
    
    right: function(){
	var speed = 0x7f;
	this.write( 0x88, speed );
	this.write( 0x8e, speed );
	Rover.moving();
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
        this.write(0x88,0);
        this.write(0x8a,0);
        this.write(0x8c,0);
        this.write(0x8e,0);
        setTimeout(function(){      //safety
	    Rover.write(0x88,0);
	    Rover.write(0x8a,0);
	    Rover.write(0x8c,0);
	    Rover.write(0x8e,0);
        },5);
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

	});
    }
    
};

module.exports = Rover;

