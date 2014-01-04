
/* top level server entity.*/

/*  the globals.  Never reuse these names.  */

C = require('./rover/lib/colorLog'),    //globals
S = require('./static_admin/js/settings').Settings;
C.log('Starting up node server.  Here are settings \n', S, {logLevel:1, color:'green'});
express = require('express'),
redis = require('socket.io/node_modules/redis'),
views = require('./views'),
db = require('./database'),
live = require('./live'),
crypto = require('crypto'),
app = express();
SECRET = 'wow such secret.';
/******************************************/

app.set('view engine','jade');

app.use(express.logger('dev'));

app.use(express.static('static_admin'));
app.use(express.cookieParser(SECRET));
app.use(express.bodyParser());

if (process.argv.indexOf('superdebug') != -1) {
  C.set({logLevel: -1});
}else if (process.argv.indexOf('debug') != -1){
  C.set({logLevel: 0});
}else{
  C.set({logLevel: 1});
}

C.log('Listening for http requests on ', S.http_port, {logLevel:1, color:'blue'});
C.log('Listening for commands on ', S.command_port, {logLevel:1, color:'blue'});
C.log('Redis connected to '+S.host+':'+S.redis_port, {logLevel:1, color:'blue'});
app.listen(S.http_port);
views.listen(app);
live.socket.listen(S.command_port).redis.listen(S.redis_port, S.host);
db.listen(S.redis_port, S.host);
//canvas.stream();

//testing stuff:***********************************

