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
    
    /*
        Autodetect video addr and starts webcam
    */
    timesConnected:-1,
    connect: function(){
        this.timesConnected++;
        if (this.timesConnected == 0) {
            this.firstRun = true;
            this.reset();
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
    },

    run: function(options){
        options = options || {};
        C.log('Stream commands: ', {color:'cyan', logLevel:-1});
        
        var vid = this.canvas();
        
        Terminal.exec(this.audio());
        C.log(this.audio(), {color:'blue', logLevel:-1});
        C.log(vid, {color:'blue', logLevel:-1});
        
        this.running = true;
        Terminal.exec(vid, function(err, stdout, stderr){
            if (err && err.killed ) {
                C.log('Error with video stream : ',err, stderr, {color:'red', logLevel:-1});
                C.log('Video Failed.  trying again in 3s', {color:'red', font:'bold', logLevel:1});
                setTimeout(function(){Stream.reset()}, 3000);
                Stream.running = false;
            }
        });
        var inter = setTimeout(function(){
            if (Stream.running) {
                C.log('Video Ready',{color:'green', font:'bold', logLevel:1});
            }
            clearTimeout(inter);
        },3500);
        
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
                }
                C.log('about to reset this devices ', device, {color:'yellow'});
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
    reset: function(options){
        C.log('Resetting stream.', {color:'blue'});
        this.kill(function(err, device){
            if (err && err.killed) {
                C.log('Error resetting cam ', err, {color:'red'});
                C.log('trying again');
                setTimeout(function(){
                    Stream.reset();
                },3500);
                return;
            }
            Stream.connect(options);
            Emit.popup({title:'Reset video', message:'The webcam on the rover just reset.'+
                       '  It may take up to 30 seconds for it to come back.', global:true});
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

    }
    
}

module.exports = Stream;


