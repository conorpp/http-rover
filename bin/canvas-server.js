
/*
	Responible for distributing ffmpeg stream via websockets
	I took this code else where and barely know how it works.
	
	Will work on phones!
*/
var S = require('./static_admin/js/settings').Settings;
var C = require('./rover/lib/colorLog');    //globals
//var canvas = {
	//stream: function(){
		var STREAM_SECRET = 'abc',
			STREAM_PORT = S.canvasSource,
			WEBSOCKET_PORT = S.canvasClient,
			STREAM_MAGIC_BYTES = 'jsmp'; // Must be 4 bytes
			
		var width = S.width,
		    height = S.height;

		
		// Websocket Server
		var socketServer = new (require('ws').Server)({port: WEBSOCKET_PORT});
		socketServer.on('connection', function(socket) {
			// Send magic bytes and video size to the newly connected socket
			// struct { char magic[4]; unsigned short width, height;}
			var streamHeader = new Buffer(8);
			streamHeader.write(STREAM_MAGIC_BYTES);
			streamHeader.writeUInt16BE(width, 4);
			streamHeader.writeUInt16BE(height, 6);
			socket.send(streamHeader, {binary:true});
		
			C.log( 'New video client connection (' + socketServer.clients.length + ' total)', {color:'blue', logLevel:-1});
			
			socket.on('close', function(code, message){
				C.log( 'Disconnected video client connection (' + socketServer.clients.length + ' total)', {color:'blue', logLevel:-1});
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
			
			try {
				if (params[1] && params[2]){
					width = parseInt(params[1]) || width;
					height = parseInt(params[2]) || height;
					C.log('Height and width overwritten for video stream. ', params, {color:'yellow'});
				}
			}catch(e){}
			
			width = width|0;
			height = height|0;
			C.log('video stream width ', width, {color:'blue'});
			C.log('video stream height ', height, {color:'blue'});
		
			if( params[0] == STREAM_SECRET ) {
				C.log(
					'Stream Connected: ' + request.socket.remoteAddress + 
					':' + request.socket.remotePort + ' size: ' + width + 'x' + height,
					{color:'green'}
				);
				request.on('data', function(data){
					socketServer.broadcast(data, {binary:true});
				});
				//streamServer.close();
				//streamServer.close();
				//console.log(streamServer);
				console.log('stream connections - ',streamServer.connections);

			}
			else {
				C.log(
					'Failed Stream Connection: '+ request.socket.remoteAddress + 
					request.socket.remotePort + ' - wrong secret.',
					{color:'green'}
				);
				response.end();
			}
		}).listen(S.canvasSource);
		
		C.log('Listening for MPEG Stream on http://127.0.0.1:'+S.canvasSource+'/<secret>/<width>/<height>', {color:'blue'});
		C.log('Awaiting WebSocket connections on ws://127.0.0.1:'+S.canvasClient+'/', {color:'blue'});
	//}
//};

//module.exports = canvas;
