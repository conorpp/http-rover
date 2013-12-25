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
    width:640,
    height:480,
    logLevel:0,
    home:[44.646875, -68.95869]
    
};

try{
    exports.Settings = Settings;
}
catch(e){}
