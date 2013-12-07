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
    
};

try{
    exports.Settings = Settings;
}
catch(e){}
