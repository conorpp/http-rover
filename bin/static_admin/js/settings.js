/*
    Settings file for allowing project to work in different environments.
    Only make different copies of this file.
*/

var Settings = {
    /* server */
    host:'localhost',
    command_port:4000,
    http_port:8000,
    redis_port:6379,
    canvasClient:8084,
    canvasSource:8082,
    audio_port:9000,
    width:320,
    height:240,
    logLevel:0,
    home:[37.2316867, -80.42346629999997],
    ip:'127.0.0.1',
    udp_port:9000,
    audioBitDepth:16  //only supports 8,16, or 32
    
};

try{
    exports.Settings = Settings;
}
catch(e){}
