/*
    Settings file for allowing project to work in different environments.
    Only make different copies of this file.
*/

var Settings = {
    /* server */
    host:'localhost',
    command_port:4000,
    source_video_port: 8082,    //not used
    client_video_port:8084,     //not used
    //source_audio_port:8086,
    //client_audio_port:8088,
    http_port:8000,
    redis_port:6379,

    /* video */
    width:320,      
    height:240
    
};

try{
    exports.Settings = Settings;
}
catch(e){}
