/*
    Settings file for listening for command from deployment
*/

var Settings = {
    /* server */
    host:'surrogus.com',
    command_port:12133,
    http_port:27506,
    redis_port:14177
};

try{
    exports.Settings = Settings;
}
catch(e){}
