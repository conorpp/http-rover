
/* module for live events/functions */

var live = {
    
    // data
    clientCount:0,
    queue:[],
    time:1000*60,           //ms
    secs: Math.floor(this.time/1000),
    queueInterval: setTimeout(),
    commandId:null,
    commandCount:0,         //total of people commanded rover.
    pings:0,                //init track of unresponded pings to rover
    maxPings:2,             //max of consecutive unresponded pings to send distress popup
    roverAlive:false,
    
    
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
            position: this.queue.length +1,
            socket:socket
        });
        C.log('queue added to. length:', this.queue.length, {color:'green'});
        if (live.queue.length == 1) {
            C.log('Queue interval started.', {color:'green'});
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
            C.log('Interval executed. Changing command.  Length - ', live.queue.length, {color:'green', logLevel:1});
            
            live.changeCommand();
            
            if (live.queue.length <= 0 ) clearInterval(live.queueInterval);
            
        }, live.time);
        
        //logging purposes.
        /*clearInterval(this.logInterval);
        var copyTime = Math.floor(this.time/1000);
        console.log('current queue time - ', copyTime);
        this.logInterval = setInterval(function(){
            
            if(live.queue[0].start){
                
                var timeleft = live.time - (new Date().getTime() - live.queue[0].start);
                console.log('secs left : ', Math.floor(timeleft/1000));
            }
            //live.time;
            copyTime--;
            
            //console.log('current queue time - ', copyTime);
            if (copyTime <= 0)  clearInterval(live.logInterval);
            
        },1000);*/
        
    },
    
    //for getting a queue member by an attribute
    //return 0 if none.  Adds index as an attribute.
    // usage: this.getQueue(name:'dude');
    // or:    this.getQueue(id: 45);
    getQueue: function(filter){
        for (i in filter) {
            var key = i;
            var val = filter[i];
            break;
        }
        for (s in this.queue) {
            if (this.queue[s][key] == val) {
                this.queue[s].index = parseInt(s);
                return this.queue[s];
            }
        }
        return 0;
    },
    
    /* move queue, change command.  promote is bool to indicate promote or demote current socket.  default false. */
    changeCommand: function(promote){
        
        if (promote) {
            this.promote(this.queue[0]);
            
        }else{
            this.demote(this.queue[0]);
            if (this.queue.length) {
                this.promote(this.queue[0]);
            }else C.log('Queue depleted. ', {color:'yellow'});
        }
        for (q in this.queue) {
            this.queue[q].position = this.queue.indexOf(this.queue[q])+1;
        }
        
    },
    //data is object in queue array
    //promotes socket if socket exists, otherwise
    // it will move to next in line.
    promote: function(data){
        if (data.socket) {
            C.log('Promoting next in queue ', {color:'green'});
            data.socket.emit('promote', {millis:this.time, name:data.name});
            data.start = new Date().getTime();
            this.commandId = data.id;
            this.commandCount++;
        }else{
            C.log('promote function given empty data, checking next in line.', {color:'red'});
            if (this.queue.length) {
                this.queue.splice(0,1);
                if (this.queue.length) {
                    C.log('Queue member found. moving on.  ', {color:'yellow'});
                    this.promote(this.queue[0]);
                }else C.log('Queue is now empty. ', {color:'yellow'});
            }
        }
    },
    
    demote: function(data, position, kick){
        C.log('Demoting position ', position, ' in queue.', {color:'green'} );
        if (data && data.socket) {        
            data.socket.emit('demote', {kick:kick});
            live.socket.io.sockets.emit('removeQueue', {position:position || 1});
            this.queue.splice(position - 1, 1);
            this.commandId = null;
        } else C.log('Demoting position ', position, ' failed. Invalid socket.', {color:'red'});
    },
    
    //validate
    isCommander: function(id){
        if (id){        //fast.
            var split = id.split(':');
            var sign = split[1],
                val = split[0];
            var hash = crypto.createHmac('sha1', SECRET).update(val).digest('hex');
            return (sign == hash && this.commandId == val);
        }else{
            C.log('Commander validation failed. ' , {color:'yellow'});
            return false;
        }
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
                C.log('User connected.  total: ', live.clientCount, {color:'blue'});
                
                
                socket.on('leave', function(data){
                    C.log('user left room', data, {color:'blue'});
                    this.leave(data.pk);
                    var i = this.rooms.indexOf(data.pk);
                    this.rooms.splice(i,1);
                });
                
                socket.on('disconnect', function(data){
                    live.clientCount--;
                    C.log('User disconnected. total: ', live.clientCount, {color:'blue'});
                    if (this.commandId) {   //lose queue
                       /* for(var i in live.queue){
                            if (live.queue[i].id == this.commandId) {
                                live.demote(live.queue[i]);
                                live.queue.splice(i, 1);
                            }
                        } */
                    }
                });
                
                socket.on('command', function(data){
                    if (live.isCommander(data.id)) {
                        C.log('command: ', data.func, {color:'blue'});
                        live.redis.pub.publish('rover', JSON.stringify(data));
                    }else C.log('Command Denied.  ('+data.func+')', {color:'yellow'});
                });
                
                socket.on('join', function(data){
                    socket.commandId = data.id;
                    live.addQueue(data.name, data.id, socket);
                });
                
                socket.on('seizeCommand', function(data){   //attempt to give command back to socket.
                    C.log('Attempting to reseize command for client...', {color:'blue'});
                    var id = data.id.split(':')[0];
                    socket.commandId = id;
                    var member = live.getQueue({id:id});
                    if (member) {
                            member.socket = socket;
                            var first = (member.index == 0);
                            if (member.start) {
                                var millis = live.time - (new Date().getTime() - member.start);
                            }else millis = live.time;
                            socket.emit('commandSeized', {
                                first:first,
                                name:member.name,
                                millis: millis
                            });
                            if (first)C.log('Client returned to command ', {color:'green'});
                            else C.log('Client returned to queue. ', {color:'green'});
                    }else{C.log('Failed to return command for client ', {color:'red'})}
                });
                socket.on('subscribe', function(data){
                    if (!views.authent(data) && data.room == 'admin') return;
                    socket.join(data.room);
                    C.log('Client joined room ', data.room, {color:'blue'});
                });
        
                /* command sent to rover terminal */
                socket.on('execute', function(data){
                    C.log('sending terminal command to rover: ', data.command, {color:'blue'});
                    if (!views.authent(data)) return;
                    var command = data.command;
                    live.redis.pub.publish('roverAdmin',
                                           JSON.stringify({func:'execute', command:command}));
                    if (!live.roverAlive) {
                        socket.emit('announce', {title:'No rover', message:'The rover is not connected.'});
                    }
                });
            });
            
            /* for keeping times synced with all clients */
            setInterval(function(){
                if (live.queue.length && live.queue[0].start) {
                    var queueTime = live.time - (new Date().getTime() - live.queue[0].start);
                    live.socket.io.sockets.emit('syncTime', {queueTime:queueTime});
                }else if (!live.queue.length) {
                    //nobody in queue code.
                }
                C.log('Syncing time ', {color:'teal', logLevel:-1})
            },10*1000);
            
            /* for checking the rovers connection */
            setInterval(function(){
                live.pings++;           //reset in redis pub.
                live.redis.pub.publish('roverAdmin', JSON.stringify({func: 'ping'}));
                if (live.pings >= live.maxPings) {
                    C.log('Rover may be disconnected ', {color:'red'});
                    live.roverAlive = false;
                    live.socket.io.sockets.emit('announce', {title:'Rover lost', message:'The rover may '+
                                                'may have lost connection.  It will attempt reconnecting and ' +
                                                'we\'ll let you know when it comes back.  Sorry', disconnect:true});
                }
            },3*1000);
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
                    case 'popup':
                        C.log('Resetting video stream for all clients', {color:'blue'});
                        live.socket.io.sockets.emit('announce', data);
                    break;
                    case 'ping':    //recieve rover ping.
                        if (live.pings >= live.maxPings) {
                            live.socket.io.sockets.emit('announce', {title:'Rover is back',
                                                        message:'Internet has been returned to the rover.',
                                                        disconnect:false});
                            C.log('Rover is alive. ',new Date(), {color:'green', font:'bold'});
                        }
                        live.roverAlive = true;
                        live.pings = 0;
                    break;
                    case 'info':        //set latest network stats
                        for (key in data) {
                            db.store.set(data[key], JSON.stringify(data[key]));
                        }
                        C.log('Recieved info from rover.', {color:'green'});
                        C.log('GPS : ', data.gps, {color:'green'});
                        live.socket.io.sockets.emit('info', {gps:data.gps});
                    break;
                    case 'stdout':      //return stdout from rover
                        C.log('stdout ',data, {color:'blue'});
                        live.socket.io.sockets.in('admin').emit('stdout', data);
                    break;
                default:
                    C.log('no cases met in redis case statement.',{color:'red'});
                }
            });
        }
    }
}

module.exports = live;
