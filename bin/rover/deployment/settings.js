/*
    Settings file for deployment
*/

var Settings = {
    /* server */
    host:'surrogus.com',
    ip:'184.173.103.51',
    
    /* video resolution */
    width:640,
    height:480,
    
    /* logging */
    logLevel:5,
    
    /* GPS */
    home:[37.2316867, -80.42346629999997],
    
    
    /* audio recording */
    audioBitDepth:16,  //Only can be 8, 16, or 32
    
    /* ports for processes to listen on */
    command_port:12133,
    http_port:27506,
    redis_port:14177,
    canvasClient:27376,
    canvasSource:11963,
    audio_port:17454,
    udp_port:12554
};

try{
    exports.Settings = Settings;
}
catch(e){}
