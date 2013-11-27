
var S = require('./static_admin/js/settings').Settings;
console.log('Starting up node server.  Here are settings \n', S);


var express = require('express');
var hbs = require('hbs');
var app = express();
app.use(express.static('static_admin'));
app.set('view engine','html');
app.engine('html', hbs.__express);

var redis = require('socket.io/node_modules/redis');
var pub = redis.createClient(S.redis_port, S.host);
var sub = redis.createClient(S.redis_port, S.host);
sub.subscribe('feedback');
var io = require('socket.io').listen(S.command_port);
var PASSWORD = 'abc';
var STREAM_MAGIC_BYTES = 'jsmp';

app.get('/', function(request, response){
  response.render('index');
});
app.get('/video', function(request, response){
  response.render('video');
});

io.configure(function(){
    //io.set('authorization', function(data, accept){
	/*if (data.headers.cookie) {
            data.cookie = cookie_reader.parse(data.headers.cookie);
            return accept(null, true);
        }
        return accept('error',false);*/
    //});
    io.set('log level',1);
});

io.sockets.on('connection', function(socket){
    socket.rooms = [];
    console.log('User connected');
    socket.on('leave', function(data){
	console.log('user left room', data.pk);
        this.leave(data.pk);
	var i = this.rooms.indexOf(data.pk);
	this.rooms.splice(i,1);
    });
    
    socket.on('disconnect', function(data){
        console.log('User disconnected.');
    });
    
    socket.on('forward', function(data){
	console.log('forward');
	Command.forward();
    });

    socket.on('left', function(data){
	console.log('left');
	Command.left();
    });
    
    socket.on('right', function(data){
	console.log('right');
	Command.right();
    });
    
    socket.on('reverse', function(data){
	console.log('reverse');
	Command.reverse();
    });
    socket.on('stop', function(data){
	console.log('stop');
	Command.stop();
    });
    socket.on('reset', function(data){
	console.log('reset');
	Command.reset();
    });

    
}); // end io.sockets.on


/* namespace for sending command to rover. */
var Command = {
    on:false,
    blink:function(){
	this.on = !this.on;
	var data = {on:this.on, func:'blink'};
	pub.publish('rover', JSON.stringify(data));
    },
    forward:function(){
	var data = {func:'forward'};
	pub.publish('rover', JSON.stringify(data));
    },
    left: function(){
	var data = {func:'left'};
	pub.publish('rover', JSON.stringify(data));
    },
    right: function(){
	var data = {func:'right'};
	pub.publish('rover', JSON.stringify(data));
    },
    reverse: function(){
	var data = {func:'reverse'};
	pub.publish('rover', JSON.stringify(data));
    },
    stop: function(){
	var data = {func:'stop'};
	pub.publish('rover', JSON.stringify(data));
    },
    reset: function(){
	var data = {func:'reset'};
	pub.publish('rover', JSON.stringify(data));
    }
}

sub.on('message', function(channel, data){
    data = JSON.parse(data);

    switch (data.func) {
        case 'reset':
	    console.log('resetting clients');
	    io.sockets.emit('reset');
        break;
    default:
	console.log('no cases met.');
    }
});

console.log('Listening for commands on ', S.command_port);
console.log('Listening for http requests on ', S.http_port);
app.listen(S.http_port);

