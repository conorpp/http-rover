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
    width:160,
    height:120,
    roverAddr:'/dev/ttyUSB1',
    gpsAddr:'/dev/ttyUSB0',
    logLevel:0,
    home:[44.646875, -68.95869]
};

try{
    exports.Settings = Settings;
}
catch(e){}
