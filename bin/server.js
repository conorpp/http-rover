/* top level server entity.*/

/*  the globals.  Never overwrite these names.  */

C = require('./rover/lib/colorLog'),    //globals
S = require('./static_admin/js/settings').Settings;
console.log('Starting up web server.  Here are settings ', S);
express = require('express'),
views = require('./views'),
db = require('./database'),
live = require('./live'),
AudioServer = require('./audioServer'),
crypto = require('crypto'),
app = express();
SECRET = 'wow such secret.';
/******************************************/

app.set('view engine','jade');

app.use(express.static('static_admin'));
app.use(express.cookieParser(SECRET));
app.use(express.bodyParser());

if (process.argv.indexOf('superdebug') != -1) 
  C.set({logLevel: -1});
else if (process.argv.indexOf('debug') != -1)
  C.set({logLevel: 0});
else
  C.set({logLevel: 1});


C.log('Listening for http requests on ', S.http_port, {logLevel:1, color:'green', font:'bold'});
C.log('Listening for commands on ', S.command_port, {logLevel:1, color:'green', font:'bold'});
C.log('Redis connected to '+S.host+':'+S.redis_port, {logLevel:1, color:'green', font:'bold'});
app.listen(S.http_port);
db.listen(S.redis_port, S.host);
views.listen(app);
live.socket.listen(S.command_port);
live.redis.listen(S.redis_port, S.host);


