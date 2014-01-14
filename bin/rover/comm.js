
/*
    Communication for rover.
    
    Requirements:
        npm - redis
        custom lib - colorLog
        
    TODO: 
*/

module.exports = (function(){
    var redis = require('redis');
    var pub = redis.createClient(S.redis_port, S.host);	//to server	
    var subRover = redis.createClient(S.redis_port, S.host);	//from server
    var subAdmin = redis.createClient(S.redis_port, S.host);	//from server
    //channels
    subRover.subscribe('rover');
    subAdmin.subscribe('roverAdmin');
    C.log('Communication is live . . .' ,{color:'green', logLevel:-1});
        
    /*
        switch statements handle all receiving date from webserver.
        
        Channels:
            1. roverAdmin - for admin commands
                a. reset - resets the webcam & ffmpeg stream.
                b. ping - indicator reciprocated regularly to show connection is still good.
                c. execute - terminal command to be executed.
            
            2. rover - for commands made by clients
                a. forward, left, right, reverse, forwardright, forwardleft, stop
                    - directions for motors.
    */
    subAdmin.on('message', function(channel, data){
        data = JSON.parse(data);
        var asked = true;
        switch (data.func) {
            case 'reset':
                C.log('Resetting stream', {color:'blue'});
                Stream.reset();
            break;
            case 'ping':
                _emit.ping();
            break;
            case 'execute':
                C.log('about to exec command ', data, {color:'yellow', logLevel:-1});
                if (data.command.indexOf('sudo')!=-1) {
                    if (data.command != 'sudo reboot') {
                        _emit._parse({func:'stdout',stdout:'<h1>You suck</h1>', command:data.command});
                        return;
                    }
                }
                Terminal.exec(data.command, function(err, stdout, stderr){
                    var error = stderr;
                    if (error && error != '') {
                        C.log('Error with exec command : ', error, {color:'red', logLevel:1});
                    }
                    C.log('Got stdout ', stdout, {color:'yellow'});
                    _emit._parse({func:'stdout',stdout:stdout, error:error, command:data.command});
                });
            break;
            default:
                asked = false;
                if (channel=='roverAdmin') {
                    C.log('No cases met on admin channel.', {color:red});
                }
            break;
        }
    });
    subRover.on('message', function(channel, data){
        data = JSON.parse(data);
        console.log('rover func : ', data.func);
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
                C.err('Error: No cases were met on rover pubsub.');
            break;
        }

    });
    
    /*
        Responsible for sending data to webserver
    */
    var _emit = {
        
        infoInter:null,
        infoTime:1500,
        
        errors:{},
        
        set: function(params){
            params = params || {};
            if (params.infoTime) {
                this.infoTime = parseInt(params.infoTime);
            }
        },
        /* Sends information to webserver. Will be saved in db.
        */
        lastInfo: new Date().getTime() - 31*1000,
        info: function(){
            if (this.infoInter == null) {
                clearInterval(this.infoInter);
                this.infoInter = setInterval(function(){
                    _emit.info();
                }, this.infoTime);
            }
            var lastPing = this.lastInfo - new Date().getTime();
            var data = {func:'info'};
            if (lastPing < 30 * 1000) {
                data.errors = _emit.errors;
                data.gps = GPS.read();
                C.log('sending config ', {color:'green', logLevel:-2});
                _emit._parse(data);
                return;
            }
            this.lastInfo = new Date().getTime();
            Terminal.exec('ifconfig', function(err, stdout, stderr){
                if (err) C.log('err in info ', err, {color:'red'});
                data.ifconfig = stdout;
                data.errors = _emit.errors;
                data.gps = GPS.read();
                C.log('sending config ', {color:'green', logLevel:-2});
                _emit._parse(data);
            });
        },
        
        ping: function(){
            this._parse({func:'ping'});
        },
                
        popup: function(data){
            C.log('sendig popup ', data, {logLevel:-1});
            data.func = 'popup';
            this._parse(data);
        },
        
        _parse: function(data){
            C.log('Sending feedback ', data.func, {color:'purple', logLevel:-1});
            pub.publish('feedback', JSON.stringify(data));
        }
    };
    
    return _emit;
})();