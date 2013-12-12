/*
  Interface for video and audio live streaming
  on the rover.
  $ ffmpeg <video options> -i <video source> <audio options> -i <audio source> <output options> <output destination>
*/

var Stream = {
    
    running: false,
        
    rtmpHost: 'rtmp://184.173.103.51:31002',
    
    app:'mystream',
    
    vSource:'/dev/video0',
    
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
            ' -acodec libvo_aacenc -f flv ' +                   //output options
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
    
    // for mobile devices.  Append to video command.
    canvas: function(){
        return(
            'ffmpeg -s '+S.width+'x'+S.height+' -f video4linux2 ' +
            '-i ' + this.vSource +
            ' -an -f mpeg1video -b 800k -r 30 ' +
            'http://' + S.host + ':' + S.canvasSource +'/'+ this.password
               );    
    },
    /*
        Run the streams
        @option fullStream - run audio & video in single stream for better sync
                            slower.  default false. Gauruntees audio. Deprecated
                            
        @option audio - run with or without audio.  Chance for better speed.
                        default true
    */
    run: function(options){
        options = options || {};
        console.log('Starting streams . . .');
        if (options.fullStream) {
            var vid = this.fullStream();
        }else{
            var vid = this.canvas();
            if (options.audio == undefined || options.audio) {
                var aud = terminal.exec(this.audio());
                console.log(this.audio());
            }
        }

        console.log(vid);
        terminal.exec(vid);
        this.running = true;
        
    },
    
    kill: function(){
        terminal.exec('pkill -s INT ffmpeg');
    },
    
    /*
        Reset stream and get feedback.
        same options for run().
    */
    reset: function(options){
        console.log('Resetting stream.');
        this.kill();
        setTimeout(function(){
            Stream.run(options);
        },120);
        var data = JSON.stringify({func:'reset'});
        pub.publish('feedback', data);
    }
    
}

module.exports = Stream;


