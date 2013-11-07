var Settings = {
    /* server */
    host:'localhost',
    command_port:4000,
    source_video_port: 8082,
    client_video_port:8084,
    http_port:8000,
    redis_port:6379,
    
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
