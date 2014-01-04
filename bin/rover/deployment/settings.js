/*
    Settings file for listening for command from deployment
*/

var Settings = {
    /* server */
    host:'surrogus.com',
    command_port:12133,
    http_port:27506,
    redis_port:14177,
    canvasClient:27376,
    canvasSource:11963,
    audio_port:17454,
    width:160,
    height:120,
    logLevel:5,
    home:[44.646875, -68.95869],
    ip:'184.173.103.51',
    udp_port:12554
};

try{
    exports.Settings = Settings;
}
catch(e){}
