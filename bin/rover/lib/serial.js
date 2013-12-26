/*
    Adds on to serialport node module.
    
    -Auto detection for webcam, motor driver, and GPS module
    -Devices are connected one at a time for stability.
    
    *****unstable, don't use this.  wow deprecated.
    
    requirements:
        npm - serialport
    
    usage:
        serial.link('gps', function(err, obj){
        
            if (err) console.log('error: ', err);
            
            obj.serial.on('data', function(data){   //this is the regular serial obj.
                console.log('GPS data ', data);
            });
            
            console.log('Connected address ', obj.addr);
            
            console.log('Addresses seen ', obj.devices );
        });
*/

var serial = {
    
    serialPort : require("serialport").SerialPort,
    i:0,
    
    webcam_keyword:'video',     //Set these to something that matches in ~/dev/
    gps_keyword:'ttyUSB',
    motor_keyword:'ttyUSB',
    
    _linking:false,
    _funcs:[],
    _next: function(func){
        
        if (!this._funcs.length){
            this._linking = false;
            C.log('Finished connecting devices.', {logLevel:-2});
            return;
        }
        this._linking = false;
        var pair = this._funcs.pop();
        C.log('Going on to next device to connect ', pair, {color:'yellow', logLevel:-2});
        serial.link(pair.device, pair.callback);
    },
     
    link: function(device, callback){
        device = (device+'').toLowerCase();
        if (this._linking){
            this._funcs.push({device:device, callback:callback});
            C.log('Adding device ', device, this._funcs, {color:'teal', logLevel:-2});
            return;
        }
        callback = this.callbackWrap(callback);
        switch (device) {
            case 'gps':
                this._linking = true;
                this.detectGPS(callback);
            break;
            case 'motor':
                this._linking = true;
                this.detectMotor(callback);
            break;
            case 'webcam':
                this._linking = true;
                this.detectWebcam(callback);
            break;
            default:
                C.log('Error linking.  "', device, '" is not a supported device.', {color:'red'});
            break;
        }
    },
    
    //callback function wrapper.  Gets called at end of detection.
    //Handles callback if theres an error or needs to close serial port
    //before passing it on.
    callbackWrap: function(_callback){
        return function(err, data){
            if (data && data.serial) {
                data.serial.pause();
                data.serial.close(function(){
                    data.serial.flush(function(){
                        if (!err && data.addr) {
                            serial.linkedDevices.push(data.addr);
                        }
                        serial._next();
                        _callback(null, data);
                    });
                });
            }else{
                if (!err && data && data.addr) {
                    serial.linkedDevices.push(data.addr);
                }
                serial._next();
                _callback(err, data);
            }
        }
    },
    
    linkedDevices:[],  
    detector: function(callback){
        var D = {
            callback:callback,
            _devices:[],
            devices:[],
            i:0,
            port:null,
            
            find: function(addr, params){
                params.connect = params.connect == undefined ? true : params.connect;
                Terminal.exec('ls -s /dev | grep '+addr, function(err, stdout, stderr){
                    D.devices = stdout.match(new RegExp(addr +'[0-9]*','gi')),//new RegExp('/'+ addr +'[0-9]/g')),
                    D._devices = D.devices;
                    if (params.connect) {
                        D.connect();
                    }
                    else{
                        D.callback(null, {serial:null, devices:D._devices, addr:null});
                        D.notConnecting = true;
                    }
                });
            },
            
            connect: function(params){
                C.log('Not connecting? ', this.notConnecting, {color:'purple', logLevel:-2});
                params = params || {};
                if (D.devices && D.devices.length) {
                    var addr = '/dev/'+D.devices[0];
                    var i = serial.linkedDevices.indexOf(addr);
                    if (i != -1) {
                        C.log('No more devices', {logLevel:-2});
                        this.callback('No devices', null);
                        return;
                    }
                    
                    serial.linkedDevices.push(D.devices[0]);
                    this.port = new serial.serialPort(addr, {
                        baudrate: params.baudrate || 9600
                    }, true, function(err){
                        if (err){
                            C.log('ERRR', err, {color:'yellow', logLevel:-2});
                            D.skip();
                            return;
                        }else{
                            C.log('connected to ',addr, {color:'green', logLevel:-2});
                            D.callback(null, {serial:D.port, devices:D._devices, addr:addr});
                        }
                    });
                }else{
                    C.log('No more devices',{logLevel:-2});
                    this.callback('No devices', null);
                }
            },
            
            skip: function(port){
                C.log('error connecting to ', {color:'red', font:'bold', logLevel:-2});
                C.log('Checking next connection . . .', {logLevel:-2});
                
                if (D.devices && D.devices.length){
                    this.devices.shift();
                }
                
                this.port = port || this.port;
                if (this.port) {
                    this.port.pause();
                    this.port.close(function(){
                        D.connect();
                        return;
                    });
                }else {
                    D.connect();
                    return;
                }
                
            }
        };

        return D;
    },
    
    detectGPS: function(callback){
        C.log('GPS getting connecting . . .',{logLevel:-2});

        D = new this.detector(function(err, data){
                if (err) {
                    callback(err, data);
                    return;
                }
                var track = [];
                var time = 8000;
                var start = new Date().getTime();
                data.serial.on('data', function(d){
                    track.push(d);
                    C.log('Checking GPS . . . ', {color:'purple', logLevel:-2});
                    if (track.length > 8 && (new Date().getTime() - start < time)) {
                        callback(err, data);
                    }else if ((new Date().getTime() - start > time)) {
                        C.log('Wrong serial port for GPS.  Skipping . . .',{logLevel:-2});
                        D.skip();
                    }
                });

            });
        D.find(this.gps_keyword, {});
    },
    
    detectMotor: function(callback){
        D = new this.detector(function(err, data){
                if (err) {
                    callback(err, data);
                    return;
                }
                var track = [];
                var time = 8000;
                var start = new Date().getTime();
                data.serial.on('data', function(d){
                    track.push(d);
                    C.log('Checking Motors . . . ', {color:'purple', logLevel:-2});
                    if (track.length < 8 && (new Date().getTime() - start > time)) {
                        callback(err, data);
                    }else if (track.length > 10) {
                        C.log('Wrong serial port for Motors.  Skipping . . .', {color:'purple', logLevel:-2});
                        D.skip(data.serial);
                    }
                });

            });
        D.find(this.motor_keyword, {});
    },
    //Only returns the address.
    detectWebcam: function(callback){
        D = new this.detector(function(err, data){
                if (err) {
                    callback(err, data);
                    return;
                }
                var max = 0;
                for (var i in data.devices) {
                    num = parseInt(data.devices[i].replace(serial.webcam_keyword,''));
                    if (num > max) {
                        max = num;
                    }
                }
                C.log('THe max is ',max,' for webcam addr',{logLevel:-2});
                callback(err, {addr:'/dev/video'+max});
            });
        D.find(this.webcam_keyword, {connect:false});
    },
    //Read connected USB devices
    busDevices:{},
    lsusb: function(callback){
        callback = callback || function(){};
        Terminal.exec('lsusb',function(err, stdout, stderr){
            var devices = stdout.match(/[^\n]+(?:\n|$)/g); //split by newlines
            var obj = {};
            
            for (var i in devices) {
                var dev = devices[i].split(' ');
                var name = '';
                for (var n=6; n<dev.length-1; n++) name+=' ' + dev[n];
                obj[name] = {
                    bus:dev[1],
                    device:dev[3].replace(':',''),
                    id:dev[5]
                };
            }
            serial.busDevices = obj;
            //C.log('lsusb ', obj, {color:'purple'});
            callback(obj);
        });
    },
    
    findBus: function(keyword){
        for (dev in this.busDevices) {
            if (dev.indexOf(keyword) != -1) {
                return this.busDevices[dev];
            }
        }
        return null;
    },
    
    killUSB: function(keyword, callback){
        callback = callback || function(){};
        this.lsusb(function(){
            var device = serial.findBus(keyword);
            if (!device) {
                C.err('device by keword', keyword,'doesnt exist.');
                callback({});
                return;
            }
            C.log('about to reset this devices ', device, {color:'purple'});
            var cmd = 'sudo '+ __dirname+'/resetusb /dev/bus/usb/'
                        +device.bus+'/'+device.device;
            C.log('used this cmd ', cmd, {color:'blue'});
            Terminal.exec(cmd, function(err, stdout, stderr){
                if (!err) {
                    C.log('Reset ', keyword, ' device', {color:'green'});
                }else{
                    C.err('Error reseting device', err, stdout);
                    
                }
                callback(device);
            });
        });

    },

};

module.exports = serial;