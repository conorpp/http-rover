
/* module for live events/functions */

var live = {
    
    // data
    clientCount:0,
    queue:[],
    
    socket:{
        
        listen: function(port){
            this.port = port;
            var io = require('socket.io').listen(port);
            io.configure(function(){
                /*io.set('authorization', function(data, accept){
                    
                    if (data.headers.cookie) {
                        data.cookie = cookie_reader.parse(data.headers.cookie);
                        return accept(null, true);
                    }
                    return accept('error',false);
                });*/
                io.set('log level',1);
            });
            this.io = io;
            this.events();
            return live;
        },
        
        /* the live events for sockets. */
        events: function(){
            this.io.sockets.on('connection', function(socket){
                
                socket.rooms = [];
                live.clientCount++;
                console.log('User connected.  total: ', live.clientCount);
                
                
                socket.on('leave', function(data){
                    console.log('user left room', data.pk);
                    this.leave(data.pk);
                    var i = this.rooms.indexOf(data.pk);
                    this.rooms.splice(i,1);
                });
                
                socket.on('disconnect', function(data){
                    live.clientCount--;
                    console.log('User disconnected. total: ', live.clientCount);
                });
                
                socket.on('command', function(data){
                    console.log('command: ', data.func);
                    live.redis.pub.publish('rover', JSON.stringify(data));
                });
                
                
            });
        }
    },
    
    redis: {
        listen: function(port, host){
            //redis is a global from server.js
            this.pub = redis.createClient(port, host);
            this.sub = redis.createClient(port, host);
            this.sub.subscribe('feedback');
            this.events();
            return live;
        },
        
        events: function(){
            //feedback from rover.
            this.sub.on('message', function(channel, data){
                data = JSON.parse(data);
            
                switch (data.func) {
                    case 'reset':
                        console.log('resetting clients');
                        live.socket.io.sockets.emit('reset');
                    break;
                default:
                    console.log('no cases met in redis case statement.');
                }
            });
        }
    }
}

module.exports = live;
