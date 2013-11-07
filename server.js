
var S = require('./static_admin/js/settings').Settings;
console.log('Starting up node server.  Here are settings ', S);


var express = require('express');
var hbs = require('hbs');
var app = express();
app.use(express.static('static_admin'));
app.set('view engine','html');
app.engine('html', hbs.__express);

var redis = require('socket.io/node_modules/redis');
var pub = redis.createClient(S.redis_port, S.host);
var io = require('socket.io').listen(S.command_port);
var PASSWORD = 'abc';
var STREAM_MAGIC_BYTES = 'jsmp';

	
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
    
    socket.on('blink', function(data){
	console.log('blink');
	Command.blink();
    });
    
    socket.on('message', function(data){
	if (data.board) {
	    if (data.pass == PASSWORD) {
		console.log('board connected.');
		B.Board = this;
	    }
	}
    });
    
}); // end io.sockets.on

app.get('/', function(request, response){
  response.render('stream-example');
});

/* namespace for sending command to rover. */
var Command = {
    on:false,
    blink:function(){
	this.on = !this.on;
	var data = {on:this.on, func:'blink'};
	console.log('publishing data : ', data);
	pub.publish('rover', JSON.stringify(data));
    }
}

//server to send video stream to all connected clients.
var socketServer = new (require('ws').Server)({port: S.client_video_port});
socketServer.on('connection', function(socket) {
        // Send magic bytes and video size to the newly connected socket
        // struct { char magic[4]; unsigned short width, height;}
        var streamHeader = new Buffer(8);
        streamHeader.write(STREAM_MAGIC_BYTES);
        streamHeader.writeUInt16BE(S.width, 4);
        streamHeader.writeUInt16BE(S.height, 6);
        socket.send(streamHeader, {binary:true});

        console.log( 'New WebSocket Connection ('+socketServer.clients.length+' total)' );
        
        socket.on('close', function(code, message){
                console.log( 'Disconnected WebSocket ('+socketServer.clients.length+' total)' );
        });
});

socketServer.broadcast = function(data, opts) {
        for( var i in this.clients ) {
                this.clients[i].send(data, opts);
        }
};


// HTTP Server to accept incomming MPEG Stream
var streamServer = require('http').createServer( function(request, response) {
        var params = request.url.substr(1).split('/');

        if( params[0] == PASSWORD ) {
                console.log(
                        'Stream Connected: ' + request.socket.remoteAddress  );
                request.on('data', function(data){
                        socketServer.broadcast(data, {binary:true});
                });
        }
        else {
                console.log(
                        'Failed Stream Connection: '+ request.socket.remoteAddress + 
                        request.socket.remotePort + ' - wrong secret.'
                );
                response.end();
        }
}).listen(S.source_video_port);

console.log('Listening for MPEG Stream on http://127.0.0.1:'+S.source_video_port+'/<password>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:'+S.client_video_port);
console.log('Listening for commands on '+S.command_port);
app.listen(S.http_port);

/*
the console command to get ffmeg going
$ ffmpeg -s 640x480 -f video4linux2 -i /dev/video0 -f mpeg1video -b 800k -r 30 http://localhost:8082/abc/
*/