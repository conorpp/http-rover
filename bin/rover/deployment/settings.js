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
    width:640,
    height:480
};

try{
    exports.Settings = Settings;
}
catch(e){}
