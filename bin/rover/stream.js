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
    connect: function(){
        //detect webcam addr automatically.
        Serial.link('webcam', function(err, data){
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
            if (err ) {
                C.log('Error with video stream : ',err, stderr, {color:'red', logLevel:-2});
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
    
    kill: function(callback){
        this.running = false;
        callback = callback || function(){};
        Terminal.exec('pkill -s INT ffmpeg', function(){
            //Serial.killUSB('QuickCam', function(){
                C.log('Reset webcam.');
                callback();
           // });
        });

    },
    
    /*
        Reset stream and get feedback.
        same options for run().
    */
    reset: function(options){
        C.log('Resetting stream.', {color:'blue'});
        this.kill(function(){
            Stream.connect(options);
            Emit.popup({title:'Reset video', message:'The webcam on the rover just reset.'+
                       '  It may take up to 30 seconds for it to come back.', global:true});
        });
    }
    
}

module.exports = Stream;


