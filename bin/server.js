
/* top level server entity.*/

var S = require('./static_admin/js/settings').Settings;
console.log('Starting up node server.  Here are settings \n', S);

/*  the globals.  Never reuse these names.  */
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

console.log('Listening for http requests on ', S.http_port);
console.log('Listening for commands on ', S.command_port);
console.log('Redis connected to '+S.host+':'+S.redis_port);
console.log('Database connected to '+S.host+':'+S.redis_port);
app.listen(S.http_port);
views.listen(app);
live.socket.listen(S.command_port).redis.listen(S.redis_port, S.host);
db.listen(S.redis_port, S.host);
