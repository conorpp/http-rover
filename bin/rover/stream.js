/*
    Interface for video and audio live streaming
    on the rover.
    $ ffmpeg <video options> -i <video source> <audio options> -i <audio source> <output options> <output destination>
    
    Requirements:
        ffmpeg
        custom lib - colorLog, serial 
*/

var Stream = {
    
    running: false,
        
    rtmpHost: 'rtmp://184.173.103.51:31002',
    
    app:'mystream',
    
    vSource:'/dev/video1',
    
    aSource:'hw:1,0',
    
    password:'abc',
    
    
    //deprecated.  Just replaced by canvas.
    video : function(){
        return (
            'ffmpeg -f video4linux2 -s '+S.width+'x'+S.height+' -r 15 ' +        //video options
            '-i '+ this.vSource +                               //video source
            ' -an -f flv ' +                                    //output options
            this.rtmpHost + '/rovervideo/' + this.app           //destination
            );
    },
            
    audio: function(){
        return (
            'ffmpeg -f alsa -ac 1 ' +                           //audio options
            '-i '+ this.aSource +                               //audio source
            ' -acodec libvo_aacen -f flv ' +                   //output options
            this.rtmpHost + '/roveraudio/' + this.app           //destination
            );
    },
    
    //full stream tends to be slower.  Deprecated.
    fullStream: function(){
        return (
            'ffmpeg -f video4linux2 -s '+S.width+'x'+S.height+' -r 15 '+         //video options
            '-i '+ this.vSource +                               //video source
            ' -f alsa -ac 1 ' +                                 //audio options
            '-i '+ this.aSource +                               //audio source
            ' -acodec libvo_aacenc -f flv ' +                    //output audio/video options
            this.rtmpHost + '/rovervideo/' + this.app           //destination
            );
    },
    
    // for mobile devices.  
    canvas: function(){
        return(
            'ffmpeg -s '+S.width+'x'+S.height+' -f video4linux2 ' +
            '-i ' + this.vSource +
            ' -an -f mpeg1video -b 800k -r 30 ' +
            'http://' + S.host + ':' + S.canvasSource +'/'+ this.password
            + '/'+S.width+'/'+S.height
               );    
    },
    //settings
    set: function(params){
        if (params.resetTime) {
            this.resetTime = parseInt(params.resetTime);
        }
    },
    /*
        Autodetect video addr and starts webcam
    */
    timesConnected:-1,
    firstRun:true,
    connect: function(){
        this.timesConnected++;
        if (this.timesConnected == 0 && this.firstRun) {
            this.firstRun = false;
            this.reset();
            this.resetInter();
            return;
        }
        //detect webcam addr automatically.
        this.detectAddr(function(err, data){
            if (err){
                C.log('Error detecting webcam: ', err, {color:'red', font:'bold'});
            }else{
                Stream.vSource = data.addr;
                Stream.run();
            }
        });
        this.monitor();

    },
    
    //monitor ffmpeg and reset when it crashes.
    checkInter:null,
    monitor: function(){
        if (this.checkInter == null) {   
            clearInterval(this.checkInter);//safety
            var didCheck = true;
            this.checkInter = setInterval(function(){
                if (!didCheck) return;
                if (!Stream.running) return;
                didCheck = false;
                var cmd = 'ps x | grep -v "grep" | grep -c ffmpeg';
                Terminal.exec(cmd, function(err, stdout, stderr){
                    var num = parseInt(stdout);
                    didCheck = true;
                    if (num == 0) {
                        Stream.reset({noPopup:true});
                    }
                });
            },1500);
        }
    },
    ffmpeg_video:null,
    ffmpeg_audio:null,
    run: function(options){
        options = options || {};
        /*var a_args = ['-f', 'alsa',
                      '-ac','1',
                      '-i', this.aSource,
                      '-acodec', 'nellymoser',
                      '-f', 'flv',
                      this.rtmpHost+'/roveraudio/'+this.app
                      ];*/
        var v_args = ['-s',S.width+'x'+S.height,
                    '-f', 'video4linux2',
                    '-i', this.vSource,
                    '-f', 'mpeg1video',
                    '-b', '800k',
                    '-an','-r', '30',   //canvas
                    'http://' + S.host + ':' + S.canvasSource +'/'+ this.password
                     + '/'+S.width+'/'+S.height,
                    '-an','-f', 'flv',    //flash
                    this.rtmpHost+'/rovervideo/'+this.app,
                    '-f', 'alsa',
                    '-ac', '1',
                    '-i', this.aSource,
                    '-acodec', 'nellymoser',
                    '-vn','-f', 'flv',
                    this.rtmpHost+'/roveraudio/'+this.app
                    ];
        C.log('VIDEO COMMAND: '.blue().bold(),'ffmpeg'.blue(), {newline:false});
        for (var a1 in v_args) C.log(' '+v_args[a1], {newline:false, color:'blue'});
        C.log('');
        //C.log('AUDIO COMMAND: '.blue().bold(),'ffmpeg'.blue(), {newline:false});
        //for (var a2 in a_args) C.log(' '+a_args[a2], {newline:false, color:'blue'});
        //C.log('\n');
        
        this.ffmpeg_video = Terminal.spawn('ffmpeg', v_args, { detached: true});
       // this.ffmpeg_audio = Terminal.spawn('ffmpeg', a_args, { detached: true});
        var error = false;
        var errorCatcher = function(data){
            data = (''+data);
            var cases = data.indexOf('busy') != -1||
                        data.indexOf('error') != -1 ||
                        data.indexOf('failed') != -1;
            if (cases) {
                error = true;
                C.err('Error with ffmpeg: ', data);
                Emit.errors.webcam = data;
            }
        }
        this.ffmpeg_video.stderr.on('data', errorCatcher);
        //this.ffmpeg_audio.stderr.on('data', errorCatcher);

        
        var inter = setTimeout(function(){
            if (!error) {
                C.log('Video Ready',{color:'green', font:'bold', logLevel:1});
            }
            Stream.running = true;
            clearTimeout(inter);
        },2500);
        
    },
    
    /*
        Kills the ffmpeg stream and resets the USB connection
        for webcam using a c script.  Make sure resetusb.c is
        compiled by machine running it.  Must be sudo.
        *Stable.
    */
    kill: function(callback){
        this.running = false;
        callback = callback || function(){};
        if (this.ffmpeg_video) this.ffmpeg_video.kill('SIGINT');
        if (this.ffmpeg_audio) this.ffmpeg_audio.kill('SIGINT');
        Terminal.exec('sudo pkill -SIGINT ffmpeg', function(){
            
            
            Terminal.exec('lsusb',function(err, stdout, stderr){
                var devices = stdout.match(/[^\n]+(?:\n|$)/g); //split by newlines
                var device;
                for (var i in devices) {
                    var dev = devices[i].split(' ');
                    //check id of device.  See lsusb.
                    if (dev[5] == '046d:0990') {
                        device = {
                            bus:dev[1],
                            device:dev[3].replace(':',''),
                            id:dev[5]
                        };
                    }
                }
                if (!device) {
                    callback('No webcam ', {});
                    Emit.errors.webcam = 'webcam is not connected.';
                    return;
                }else
                    if (Emit.errors.webcam) 
                        delete Emit.errors.webcam;
                
                C.log('about to reset this device ', device, {color:'yellow'});
                var cmd = 'sudo '+ __dirname+'/lib/resetusb /dev/bus/usb/'
                            +device.bus+'/'+device.device;
                C.log('used this cmd ', cmd, {color:'blue'});
                Terminal.exec(cmd, function(err, stdout, stderr){
                    if (!err) {
                    C.log('Reset webcam device', {color:'green'});
                        callback(null, device);
                    }else{
                        callback(err, {});
                    }
                });
            });
        });

    },
    
    /*
        Reset stream and get feedback.
        same options for run().
    */
    resetParams:{},
    reset: function(options){
        this.resetParams == options || {};
        C.log('Resetting stream.', {color:'blue'});
        this.running = false;
        this.kill(function(err, device){
            if (err && err.killed) {
                C.log('Error resetting cam ', err, {color:'red'});
                Emit.errors.webcam = err;
                return;
            }
            if (Stream.timesConnected >= 1 && !Stream.resetParams.noPopup){
                Emit.popup({title:'Reset video', message:'The webcam on the rover just reset.'+
                    '  It may take up to 20 seconds for it to come back.', global:true});
            }else C.log('Not emitting video reset popup!' , {color:'yellow', logLevel:-1});
            Stream.connect(options);
        });
    },
    
    detectAddr: function(callback){
        
        Terminal.exec('ls -s /dev | grep video', function(err, stdout, stderr){
            var devices = stdout.match(/video[0-9]*/g);
            if (err) {
                callback(err, null);
                return;
            }
            var max = 0;
            for (var i in devices) {
                num = parseInt(devices[i].replace('video',''));
                if (num > max) {
                    max = num;
                }
            }
            C.log('The max is ',max,' for webcam addr',{logLevel:-1});
            callback(err, {addr:'/dev/video'+max});
        });

    },
    
    /*   Interval to regularly reset stream   */
    resetTime: 1000*60*15,      //15min
    resetInter: function(){
        setInterval(function(){
            Stream.reset();
        }, this.resetTime);
    }
    
}

module.exports = Stream;


