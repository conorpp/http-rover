
/* top level server entity */

var S = require('./static_admin/js/settings').Settings;
console.log('Starting up node server.  Here are settings \n', S);

//globals
express = require('express'),
stylus = require('stylus'),
nib = require('nib'),
redis = require('socket.io/node_modules/redis'),
views = require('./views'),
db = require('./database'),
live = require('./live');
    
var app = express();

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

app.set('view engine','jade');

app.use(express.logger('dev'));
app.use(stylus.middleware({
    src: __dirname + '/public',
    compile: compile
}));
app.use(express.static('static_admin'));
app.use(express.cookieParser('super secret'));
app.use(express.bodyParser());

console.log('Listening for http requests on ', S.http_port);
console.log('Listening for commands on ', S.command_port);
console.log('Redis connected to '+S.host+':'+S.redis_port);
console.log('Database connected to '+S.host+':'+S.redis_port);
app.listen(S.http_port);
views.listen(app);
live.socket.listen(S.command_port).redis.listen(S.redis_port, S.host);
db.listen(S.redis_port, S.host);
