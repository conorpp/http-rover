var Settings = {
    /* server */
    host:'surrogus.com',
    command_port:12133,
    source_video_port: 19231,
    client_video_port:27376,
    //source_audio_port:8086,
    //client_audio_port:8088,
    http_port:27506,
    redis_port:14177,
    
    /* rover */

    /* client */
    
    /* video */
    width:640,      //make it divisible by two.
    height:480
    
};

try{
    exports.Settings = Settings;
}
catch(e){}
