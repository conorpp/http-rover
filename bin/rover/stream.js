/*
  Interface for video and audio live streaming
  on the rover.
  $ ffmpeg <video options> -i <video source> <audio options> -i <audio source> <output options> <output destination>
*/

var Stream = {
    
    running: false,
        
    rtmpHost: 'rtmp://184.173.103.51:31002',
    
    app:'mystream',
    
    vSource:'/dev/video1',
    
    aSource:'hw:1,0',
    
    video : function(){
        return (
            'ffmpeg -f video4linux2 -s 320x240 -r 15 ' +        //video options
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
    
    //full stream tends to be slower
    fullStream: function(){
        return (
            'ffmpeg -f video4linux2 -s 320x240 -r 15 '+         //video options
            '-i '+ this.vSource +                               //video source
            ' -f alsa -ac 1 ' +                                 //audio options
            '-i '+ this.aSource +                               //audio source
            '-acodec libvo_aacenc -f flv ' +                    //output audio/video options
            this.rtmpHost + '/rovervideo/' + this.app           //destination
            );
    },
                
    /*
        Run the streams
        @option fullStream - run audio & video in single stream for better sync
                            slower.  default false. Gauruntees audio.
                            
        @option audio - run with or without audio.  Chance for better speed.
                        default true
    */
    run: function(options){
        options = options || {};
        console.log('Starting streams . . .');
        if (options.fullStream) {
            var vid = terminal.exec(this.fullStream());
            console.log(this.fullStream());
        }else{
            var vid = terminal.exec(this.video());
            console.log(this.video());
            if (options.audio == undefined || options.audio) {
                var aud = terminal.exec(this.audio());
                console.log(this.audio());
                aud.on('error', function(err){
                    console.log('Error streaming audio : ', err);
                });
            }
        }
        this.running = true;
        vid.on('error', function(err){
            console.log('Error streaming video : ', err);
            Stream.running = false;
        });
    },
    
    kill: function(){
        terminal.exec('pkill -s INT ffmpeg');
    },
    
    /*
        Reset stream and get feedback.
        same options for run.
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


