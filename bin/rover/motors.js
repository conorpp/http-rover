/*
	Module for controlling motor driver.
	
	Requirements:
		custom lib - serial, colorLog (in server.js)
*/

module.exports =
(function (args) {

var C = require('./lib/colorLog');

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
                if (
		    port.pnpId == 'usb-FTDI_FT232R_USB_UART_A901QJ43-if00-port0'
		   // port.pnpId == 'usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0' 
		    || port.pnpId == 'usb-Arduino__www.arduino.cc__0042_7523230313535110E0B2-if00'
		    )
                        addr = port.comName;
            });
            if (!addr) {
                C.log('Motors Fail', {color:'red', font:'bold', logLevel:1});
                return;
            }
            Rover.serial = new _serialConstr(addr, {
                baudrate: 9600,
		disconnectedCallback: function(d){ console.log('DDDDDDDDCCCCCCCCCCC\'d', d);}
            });
            Rover.serial.on('data', function(data){
		console.log('motor driver feedback: ', data);
            });
            Rover.serial.on('open', function(){
		C.log('Motor connection ready'.green().bold());
		Rover.ready = true;
                Rover.resetInter = setTimeout(function(){ Rover.reset() }, 42000);

            });

	    
	});
	

	//this.GPSListen();
    },
    
    /* writes a buffer to serial port. */
    write: function(){
        if (!Rover.ready) { 
            C.log('Board not ready yet.', {color:'red', background:'black'});
            return;
        }
	var buf = new Buffer(Array.prototype.slice.call(arguments));
        Rover.serial.write(buf, function(err, results){
            if (err){
		console.error('Error writing to serial : ', err, Rover.serial);
		Rover.reset();
	    }
        });
    },
    /*
	Motor Channel right - reverse: 0x88, forward: 8A
	Motor Channel left - reverse: 0x8c, forward: 0x8e
	
	speed - 0x0 - 0x7f
	
	command format e.g.: 0x88, 0x7f
    */
    
    /*
     Set speed where scale is float ranging 0 - 1,
     0 being stop and 1 being full speed.
    */ 
    setSpeed: function(scale){
	scale = parseFloat(scale),
	scale = (scale <= 1) ? scale : 1;
	this.speed = 0x7f * scale;
    },
    speed: 0x7f,
    forward: function(){
	this.write( 0x8a, this.speed );
	this.write( 0x8e, this.speed );
	Rover.moving();
    },
    
    reverse: function(){
	this.write( 0x88, this.speed );
	this.write( 0x8c, this.speed );
	Rover.moving();
    },
    
    left: function(){
	this.write( 0x8a, this.speed) ;
	this.write( 0x8c, this.speed );
	Rover.moving();
    },
    
    right: function(){
	this.write( 0x88, this.speed );
	this.write( 0x8e, this.speed );
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
    
    //right - 0x86, left - 0x87
    /*
	Set braking power with float scale,
	0 being coast and 1 being full stop
    */
    setBrake: function(scale){
	scale = parseFloat(scale),
	scale = (scale <= 1) ? scale : 1;
	this.brake = 0x7f * scale;
    },
    brake: 0x64,
    stop: function(){
        C.log('stopping', {newline:false, color:'red',background:'white'});
        this.write(0x86, this.brake);
        this.write(0x87, this.brake);
        setTimeout(function(){      //safety
	    Rover.write(0x86, this.brake);
	    Rover.write(0x87, this.brake);
        },5);
    },
    
    reset: function(){
	C.log('RESETING motors');
	//clearInterval(this.timeout);
	this.ready = false;
	clearTimeout(Rover.resetInter);
	//this.serial.drain(function(){
	    Rover.serial.close(function(){
		Rover.connect();
	    });
	    
	//});
    },
    
    GPSListen: function(){
	GPS.on('data', function(data){

	});
    }
    
};

if (process.argv.indexOf('connect') != -1) {
    
    C = require('./lib/colorLog');
    C.log('Testing rover motors . . .');
    Rover.connect();
    
    process.stdin.resume();
    
    process.stdin.on('data', function(data){
	
	data = (data.toString() + '').replace(' ','');
	    if (data.indexOf('f') != -1) 
		Rover.forward();
		
	    else if (data.indexOf('r') != -1) 
		Rover.right();
		
	    else if (data.indexOf('l') != -1)
		Rover.left();
		
	    else if (data.indexOf('r') != -1) 
		Rover.reverse();

    });
}


return Rover;

})();


