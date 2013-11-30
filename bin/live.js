
/* module for live events/functions */

var live = {
    
    // data
    clientCount:0,
    queue:[],
    time:1000*6,          //ms
    queueInterval: setTimeout(),
    
    /* for attempting to reload queue in quick server restarts. */
    initQueue: function(){
    /*    db.store.get('queue', function(err, val){
            if (!val) return;
            live.queue = JSON.parse(val);
            console.log('the queue has been loaded.  length - ', live.queue.length);
            if (live.queue.length) {
                var time = live.time - (live.queue[0].start - Date().getTime());    //recalculate time remaining.
                setTimeout(function(){
                    live.changeCommand();
                    if (live.queue.length) live.beginQueue();
                }, time);
            }
        });*/
    },
    
    /* adds to queue and returns id. */
    addQueue:function(name, id, socket){
        
        this.queue.push({
            name:name,
            id:id,
            socket:socket
        });
        console.log('queue added to. length: '+this.queue.length);
        if (live.queue.length == 1) {
            console.log('interval started.');
            this.changeCommand(true);   //true indicates to promote
            this.beginQueue();
        }
    },
    
    beginQueue: function(){
        live.queueInterval = setInterval(function(){
            console.log('interval executed. length - ', live.queue.length);
            
            live.changeCommand();
            
            if (live.queue.length <= 0) clearInterval(live.queueInterval);
            
        }, live.time);
    },
    
    /* move queue, change command.  promote is bool to indicate promote or demote current socket.  default false. */
    changeCommand: function(promote){
        
        if (promote) {
            this.promote(this.queue[0]);
            
        }else{
            this.demote(this.queue[0]);
            this.queue.shift();
            if (this.queue.length) {
                this.promote(this.queue[0]);
            }else console.log('queue depleted.');
        }

        this.socket.io.sockets.emit('changeCommand');
    },
    
    promote: function(data){
        data.socket.emit('promote');
        data.start = new Date().getTime();
        
    },
    demote: function(data){
        data.socket.emit('demote');
    },
    
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
                
                socket.on('join', function(data){
                    console.log('cookies?', socket.handshake.headers);
                    live.addQueue(data.name, data.id, socket);
                    
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
