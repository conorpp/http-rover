
/* module for live events/functions */

var live = {
    
    // data
    clientCount:0,
    queue:[],
    time:1000*50,          //ms
    secs: Math.floor(this.time/1000),
    queueInterval: setTimeout(),
    commandId:null,
    commandCount:0,       //total of people commanded rover.
    
    /* for attempting to reload queue in quick server restarts. */
    initQueue: function(){

    },
    
    /* adds to queue and returns id. */
    addQueue:function(name, id, socket){
        var secs = Math.floor(this.time/1000);
        this.queue.push({
            name:name,
            id:id,
            time:secs,
            position: this.queue.length+1,
            socket:socket
        });
        console.log('queue added to. length: '+this.queue.length);
        if (live.queue.length == 1) {
            console.log('interval started.');
            this.changeCommand(true);   //true indicates to promote
            this.beginQueue();
        }
        //render html to string.
        var context = {
            name:name,
            position:this.queue.length,
            time:secs
        }

        app.render('templates/queue', {queue:[context]}, function(err, html){
            context.html = html;
            live.socket.io.sockets.emit('addQueue', context);
        });
    },
    
    logInterval:null,
    beginQueue: function(){
        live.queueInterval = setInterval(function(){
            console.log('interval executed. length - ', live.queue.length);
            
            live.changeCommand();
            
            if (live.queue.length <= 0 ) clearInterval(live.queueInterval);
            
        }, live.time);
        
        //logging purposes.
      /*  clearInterval(this.logInterval);
        var copyTime = Math.floor(this.time/1000);
        console.log('current queue time - ', copyTime);
        this.logInterval = setInterval(function(){
            copyTime--;
            console.log('current queue time - ', copyTime);
            if (copyTime <= 0)  clearInterval(live.logInterval);
            
        },1000);*/
        
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
        data.socket.emit('promote', {millis:this.time});
        data.start = new Date().getTime();
        this.commandId = data.id;
        this.commandCount++;
        
    },
    demote: function(data, position){
        data.socket.emit('demote');
        
        live.socket.io.sockets.emit('removeQueue', {position:position || 1});
    },
    
    isCommander: function(id){
        var split = id.split(':');
        var sign = split[1],
            val = split[0];
        var hash = crypto.createHmac('sha1', SECRET).update(val).digest('hex');
        return (sign == hash);
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
                    if (live.isCommander(data.id)) {
                        console.log('command: ', data.func);
                        live.redis.pub.publish('rover', JSON.stringify(data));
                    }else console.log('Command Denied.  ('+data.func+')');
                });
                
                socket.on('join', function(data){
                    live.addQueue(data.name, data.id, socket);
                });
                
            });
            
            /* for keeping times synced with all clients */
            setInterval(function(){
                if (live.queue.length && live.queue[0].start) {
                    var queueTime = live.time - (new Date().getTime() - live.queue[0].start);
                    live.socket.io.sockets.emit('syncTime', {queueTime:queueTime});
                }
            },10*1000);
        },
        
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
