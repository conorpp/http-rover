
/* module for live events/functions */

module.exports =

(function(){

var redis = require('redis');

var live = {
    /* General */
    clientCount:0,  // Total of current number of people connected to website.
    
    /* Queue */
    queue:[],       // Queue for command
    time:1000*60,   // ms time for how long command lasts.
    secs: Math.floor(this.time/1000),
    _queueInterval: null,
    commandId:null, // ID of current client in command.
    
    /* Rover latency */
    lastPingSent: new Date().getTime(),    // Time stamps for calculating latency       
    lastPingReturn: new Date().getTime(),
    latency:0,              //current latency
    
    maxLatency: 6*1000,     //Time window for warning about being disconnected.
    disconnected:45*1000,
    
    roverAlive:false,       // indicator if rover is connected.
    
    
    /* for attempting to reload queue in quick server restarts. */
    initQueue: function(){
        var secs = 30*1000;
        db.store.get('queue', function(err, data){
            data = data ? JSON.parse(data) : data;
            if (!data || new Date().getTime() - data.timeStamp > secs)
                return;
            console.log('saved queue: ', data);
            live.persist = true;
            setTimeout(function(){ live.persist = false; },secs);
            for (var i in data.queue) {
                live.addQueue(data.queue[i].name, data.queue[i].id, null, data.queue[i].address);
            }
        });
    },
    
    /* Takes a snapshot of queue.  for reinitializing on server restarts */
    saveQueue: function(){
        var temp = [];
        for (var i in this.queue) {
            var obj = {};
            for (var key in this.queue[i]) {
                if (key != 'socket') 
                    obj[key] = this.queue[i][key];
                
            }
            temp.push(obj);
        }
        db.store.set('queue', JSON.stringify({ timeStamp: new Date().getTime(), queue:temp }));
    },
    
    saveMember: function(member){
        var copy = {};
        for (var key in member) {
            if (key != 'socket') 
                copy[key] = member[key];                
        }
        db.store.get('queueHistory', function(err, data){
            if (data)copy = '['+JSON.stringify(copy) +','+ data.substr(1, data.length);
            else copy = JSON.stringify([copy]);
            db.store.set('queueHistory',copy);
        });
        
    },
    
    /* adds to queue */
    addQueue:function(name, id, socket, addr){
        var secs = Math.floor(this.time/1000);
        this.queue.push({
            name:name,
            id:id,
            time:secs,
            position: this.queue.length +1,
            dateJoined: new Date(),
            socket:socket,
            address: socket ? socket.handshake.address : addr
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
        // Send html string to clients
        app.render('templates/queue', {queue:[context]}, function(err, html){
            context.html = html;
            live.socket.io.sockets.emit('addQueue', context);
        });
        live.saveQueue();
    },
    
    logInterval:null,
    beginQueue: function(){
        clearInterval(live._queueInterval);
        live._queueInterval = setInterval(function(){
            C.log('Interval executed. Changing command.  Length - ', live.queue.length, {color:'green', logLevel:1});
            
            live.changeCommand();
            
            if (live.queue.length <= 0 ) clearInterval(live._queueInterval);
            
        }, live.time);

        
    },
    
    /* for getting a queue member by an attribute
    return null if none.  Adds index as an attribute.
     usage: this.getQueue(name:'dude');
     or:    this.getQueue(id: 45);
    */
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
        return null;
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
        this.saveQueue();
        
    },
    //data is object in queue array
    //promotes socket if socket exists, otherwise
    // it will move to next in line.
    persist:false,
    promote: function(data){
        if (!data) {
            C.log('ERROR:  Promote() called with empty data arg! '.red().bold(), {logLevel:1});
            return;
        }
        if (data.socket) {
            data.socket.emit('promote', {millis:this.time, name:data.name});
        }else if (!this.persist){
            C.log('promote function given empty data, checking next in line.', {color:'red'});
            if (this.queue.length) {
                this.queue.splice(0,1);
                if (this.queue.length) {
                    C.log('Queue member found. moving on.  ', {color:'yellow'});
                    this.promote(this.queue[0]);
                }else C.log('Queue is now empty. ', {color:'yellow'});
            }
            return;
        }else{
            C.warn('Queue has no socket but is persisting anyways. ');
            data.serverRestarted = true;
        }
        C.log('Promoting next in queue ', {color:'green'});
        data.start = new Date().getTime();
        data.commanded = true;
        this.commandId = data.id;
        this.saveMember(data);
    },
    
    demote: function(data, position, kick){
        C.log('Demoting position ', position, ' in queue.', {color:'green'} );
        if (data && data.socket) {        
            data.socket.emit('demote', {kick:kick});
            live.socket.io.sockets.emit('removeQueue', {position:position || 1});
            this.queue.splice(position - 1, 1);
            this.commandId = null;
        } else C.log('Demoting position ', position, ' failed. Invalid socket.', data,{color:'red'});
    },
    
    /* Returns true if signed id matches client currently in command. */
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
                io.set('log level',1);
            });
            this.io = io;
            this.events();
            live.initQueue();
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
                    }else{
                        C.log('Command Denied.  ('+data.func+')', {color:'yellow'});
                        C.log('Demoting bad socket.'.yellow());
                        socket.emit('demote');
                    }
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
                    }else C.log('Failed to return command for client ', {color:'red'});
                });
                socket.on('subscribe', function(data){
                    if (data.room == 'admin' && !views.authent(data)) return;
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
                        live.popup({title:'No rover', message:'The rover is not connected.'}, socket);
                    }
                });
                socket.on('audio', function(data){
                    console.log('got audio data ', data);
                    live.redis.pub.publish('audio', JSON.stringify(data));
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
            var pingInter = 3*1000;
            setInterval(function(){
                live.redis.pub.publish('roverAdmin', JSON.stringify({func: 'ping'}));
                live.lastPingSent = new Date().getTime();
                live.latency = live.lastPingSent - live.lastPingReturn - pingInter;
                if (live.latency > live.maxLatency && live.latency < live.disconnected) {
                    C.log('Rover may be disconnected ', {color:'red'});
                    live.roverAlive = false;
                    live.popup({title:'Rover lost', message:'The rover may ' +
                                'may have lost connection.  It will attempt reconnecting and ' +
                                'we\'ll let you know when it comes back.  Sorry',
                                room:'rover', disconnect:true});
                }
                C.log(('Sending PING. latency: ' + live.latency).blue(), {logLevel:-1});
            }, pingInter);
            
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
                C.log('Recieved rover feed back', data.func, {logLevel:-2});
                switch (data.func) {
                    case 'popup':
                        C.log('Resetting video stream for all clients', {color:'blue'});
                        data.room = 'rover';
                        live.popup(data);
                    break;
                    case 'ping':    //recieve rover ping.
                        if (live.latency > live.maxLatency) {
                            live.popup({title:'Rover is back',
                                        message:'Internet has been returned to the rover.',
                                        disconnect:false, room:'rover' });
                            C.log('Rover is alive. ',new Date(), {color:'green', font:'bold'});
                        }
                        
                        live.roverAlive = true;
                        live.lastPingReturn = new Date().getTime();
                        live.latency = live.lastPingReturn - live.lastPingSent;
                        C.log('recieved PING.  latency: ', live.latency, {color:'blue', logLevel:-1});
                    break;
                    case 'info':        //set latest network stats
                        for (key in data) {
                            if (key == 'gps') {
                                if (!data[key].valid) continue;
                            }
                            db.store.set(key, JSON.stringify(data[key]));
                        }
                        C.log('Recieved info from rover.', {color:'green', logLevel:-2});
                        C.log('GPS : ', data.gps, {color:'green', logLevel:-2});
                        delete data.ifconfig;   //sensitive info
                        data.latency = live.latency;
                        live.socket.io.sockets.emit('info', data);
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
    },
    //Use this to send popups to clients
    /*
    socket - specify a socket.io socket to emit to only.
    @param global - sends to everyone on site.  annoying
    @param title, message - for popup
    @param room - part of site to send popup to. e.g. rover, admin
    */
    popup: function(params, socket){
        if (!params) return;
        if (params.global) {
            this.socket.io.sockets.emit('popup', params);
        }else if (socket){
            socket.emit('popup', params)
        }else if (params.room){
            this.socket.io.sockets.in(params.room).emit('popup', params);
        }
        return;
    }
}

return live;

})();