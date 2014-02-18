/*
    Responible for controlling servos
*/

module.exports =

(function(){
    
var C = require('./lib/colorLog');    
var _serialport = require("serialport");
var _serialConstr = _serialport.SerialPort;
var serial;
var Terminal = require('child_process');
var BAUD = 1000000;

_serialport.list(function (err, ports) {
    var addr;
    //connect to port with correct ID. see `$ lspnp`
    ports.forEach(function(port) {
        C.log(port, {color:'yellow', logLevel:1});
        if (
	    port.pnpId == 'usb-FTDI_FT232R_USB_UART_A901QJ43-if00-port0'
	    || port.pnpId == 'usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0' 
	    )
                addr = port.comName;
    });
    if (!addr) {
        C.log('Servos Fail', {color:'red', font:'bold', logLevel:1});
        return;
    }
    // Use dynamixel_util to set baud to 9600 before establishing connection
    var changeBaudCmd = 'dynamixel_util Path='+addr+' Baud=1000000 baud rate '+BAUD;
    C.log(('Changing Baud with $ \n'+changeBaudCmd).blue().bold());
    Terminal.exec(changeBaudCmd, function(){
        __connect();
    });
    var __connect = function(){
        serial = new _serialConstr(addr, {
            baudrate: BAUD,
            disconnectedCallback: function(d){ console.log('DDDDDDDDCCCCCCCCCCC\'d', d);}
        });
        serial.on('data', function(buf){
            console.log('Servo driver feedback: ', buf);
	    if (Servo._reading) {
		Servo._reader(buf);
	    }
        });
        serial.on('open', function(){
            C.log('Servo connection ready'.green().bold());
            Servo.ready = true;
            Servo.serial = serial;
	    Servo.set(Servo.stats);
	    
        });
        serial.on('error', function(){
            C.err('SERVO ERRRRRORRR');
        });
        serial.on('close', function(){
            C.log('SERIAL PORT IS CLOSED');
        });
    }
});

var Servo = {
    ready:false,
    _reading:false,
    serial:serial,
    /* forms command packet for servo and writes it.
     * need params (number array) .
     * id (number) defaults to global 254.
     * e.g. Servo.write({id:234, params:[0x23, 0x45]});
     */
    write: function(args, callback){
        if (!Servo.ready) {
            C.log('Servo connection not ready.'); return;
        }
        var id = args.id || 254;
        args.params = args.params || [];
        var length = args.params.length + 2;
        var checksum = id + length + (args._instruction || 0x3);
        for (var i in args.params) 
            checksum += args.params[i];
        checksum = ~checksum;
        if (checksum > 0x100) {
            checksum = checksum - 0x100;
        }
        var cmd = [0xff, 0xff, id, length, args._instruction || 0x3];
        cmd = cmd.concat(args.params);
        cmd.push(checksum);
        Servo.serial.write(new Buffer(cmd), function(err, results){
            console.log('Wrote buf: ', new Buffer(cmd));
            if (err){
		console.error('Error writing to Servo serial : ', err, Servo.serial);
	    }
            if (typeof callback == 'function') callback(err, results);
        });
    },
    // reads data and id.  iffy.
    read: function(){
	this.write({params:[0x3], _instruction:0x2}, function(err, results){
	    Servo._reading = true;
	    console.log('servo responded: '.blue(), err, results);
	});
    },
    _data:[],
    _reader: function(buf){
	if (buf[0] == 0xff) this._data.push(buf);
	else if (this._data.length == 2) {
	    console.log('your id is ', buf[0]);
	    this._data = [];
	    this._reading = false;
	}
    },
    /*
        instuctions:
            read: 0x2
            write: 0x3
            see http://support.robotis.com/en/techsupport_eng.htm#product/dynamixel/ax_series/dxl_ax_actuator.htm
        params:
            see http://support.robotis.com/en/techsupport_eng.htm#product/dynamixel/ax_series/dxl_ax_actuator.htm
    */
    position:0,
    torque:0xff,
    /*
        Goes to degree position
        pos is number 0-360
    */
    goTo:function(pos){
        if (pos < 0) {
            C.err('goal servo position out of range: '+pos);
            return;
        }
        this.position = ((pos/360) * 1023) | 0;
        C.log(('Going to position '+this.position+'/1023').purple());
        var buf = new Buffer([this.position]);
        var cb = function(){ /*rvo.blinkLED(); */};
        this.write({params:[0x1e,  this.position & 0xff,
			    (this.position & 0xff00) >> 8 ] });	
    },
    
    blinkLED: function(blinkInter){
        C.log('Blinking'.green());
        Servo.write({
            params:[0x19, 0x1] });
        /*setTimeout(function(){
            Servo.write({
                params:[0x19, 0] //turn off
            });
        }, blinkInter/2);*/
    
    },

    stats:{
	maxTorque: 1023,	//0-1023
	CWLimit: 0, 		//0-1023, both 0 limits means no limit
	CCWLimit: 0, 		//0-1023, both 0 limits means no limit
	movingSpeed: 1023,	// 0-1023 if limit, 0-2047 if no limit
	ID:4,
	baud: 9600		// see baudRates()
    },
    
    /*asynchronously sets servo attributes for all applicable commands
     *see stats.
     */
    set: function(params){
	for (var p in params) 
	    this.stats[p] = params[p];
	
	if (params.CWLimit) {	// range from 0 to 1023.  0 means no limit.
	    this.write({params:[0x06,  params.CWLimit & 0xff,
				(params.CWLimit & 0xff00) >> 8] });	
	}
	if (params.CCWLimit) {
	    this.write({params:[0x08,  params.CCWLimit & 0xff,
				(params.CCWLimit & 0xff00) >> 8] });	
	}
        if (params.maxTorque){
	    this.write({params:[0x0e,  params.maxTorque & 0xff,
				(params.maxTorque & 0xff00) >> 8] });	
        }
        if (params.movingSpeed){
	    this.write({params:[0x20,  params.movingSpeed & 0xff,
				(params.movingSpeed & 0xff00) >> 8] });	
        }
	// uncomment to set an id
        if (params.ID){
	    //this.write({params:[0x3,  params.ID ] });	//upper byte
	    //C.log('SETTING ID');
        }
        if (params.baud){
	    //this.write({params:[0x4,  this._baudPrescale(params.baud)] });	
        }
        
    },
    
    _baudPrescale: function(_baud){
	switch (_baud) {
	    case 1000000:
		return 1;
	    break;
	    case 115200:
		return 16;
	    break;
	    case  57600:
		return 34;
	    break;
	    case 19200:
		return 103;
	    break;
	    case 9600:
		return 207;
	    break;
	}
	return 207;
    }
    
    
};

process.stdin.resume();
process.stdin.on('data', function(d){
    if (d.toString().indexOf('reset') != -1) {
	Servo.write({params:[], _instruction:0x6}, function(err, results){
	    console.log('RESET SERVO '.blue(), err, results);
	}); return;
    }
    if (d.toString().indexOf('r') != -1) {
	Servo.read(); return;
    }

    d = parseInt(d);
    Servo.goTo(d);
});

var blinkInter = 200;
setInterval( function(){   Servo.blinkLED(blinkInter);    }, blinkInter);

return Servo;

})();


