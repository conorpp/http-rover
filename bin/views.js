

//module for views.
var views = {
    app:null,
    username:'conorpp',
    password:'root',
    adminStatus:'wow very authent',
    listen: function(app){
        this.app = app;
        this.get();
    },
    get: function(){
        /*public views*/
        this.app.get('/', function(req, res){
            res.render('index');
        });
        
        this.app.get('/video', function(req, res){
          res.render('video');
        });
        
        this.app.get('/about', function(req, res){
          res.render('about');
        });
        this.app.get('/webm', function(req, res){
          res.render('webm');
        });
        this.app.get('/canvas', function(req, res){
          res.render('canvas');
        });
        /* admin details.  check if admin cookie else login. */
        this.app.get('/admin', function(req, res){
            if (views.authent(req)) {
                var stats = views.stats(function(info){
                    C.log('info for adim ', info, {color:'blue', logLevel:-1});
                    res.render('admin', {stats:stats.sync,
                               popup:info.adminPopup,
                               title: info.adminPopup ? info.adminPopup.title : null,
                               message:info.adminPopup ? info.adminPopup.message : null,
                               checked:info.adminPopup ? true : false,
                               ifconfig:info.ifconfig
                            });
                 });
                //});
            }else{
                res.render('login');
            }
        });
        /* log in validation */
        this.app.post('/admin', function(req, res){
            if(views.login(req)){
                var days3 = 1000*60*60*24*3;
                var hash = crypto.createHmac('sha1', SECRET).update('admin').digest('hex');
                res.cookie('admin', hash, {maxAge:days3});
                res.redirect('/admin');
            }else{
                var data = {error:'Invalid credentials dude'};
                res.write(JSON.stringify(data));
            }
            res.end();
        });
        
        this.app.post('/logout', function(req, res){
            res.clearCookie('admin');
            res.redirect('/');
        });
        
        /* sends popup announcement to all clients. */
        this.app.post('/announce', function(req, res){
            if (views.authent(req)) {
                var context =  {title: req.body.title, message: req.body.message};
                if (req.body.title) {
                    live.socket.io.sockets.emit('announce', context);
                }
                console.log('req body', req.body);
                if (req.body.save && JSON.parse(req.body.save)) {
                    db.store.set('adminPopup', JSON.stringify(context));
                }else db.store.del('adminPopup');
                
            }else{
                res.writeHead(403);
            }
            
            res.end();
        });
        /*
            client data api
        */
        
        //For joining the queue.
        /* - need name.
         */
        this.app.post('/join', function(req, res){
            if (req.cookies.commandId && live.queue.length) {
                var rData = {error:'You\'re already in the queue'};
                res.end(JSON.stringify(rData));
                C.log('Rejected join request because commander cookie exists ', {color:'blue'});
            }else{
                var expire = (live.time * (live.queue.length+1)) + live.time*.1;    
                var queueSecs = Math.floor(live.time/1000);
                var name = (req.body.name+'').substr(0,20);
                db.store.incr('commandCount');
                db.store.get('commandCount', function(err, id){
                    var hash = crypto.createHmac('sha1', SECRET).update(id).digest('hex');
                    res.cookie('commandId', id+':'+hash, {maxAge:expire});
                    //Not in queue until socket request made.
                    var rData ={id:id, time:queueSecs, position:live.queue.length+1, name:name};
                    res.end(JSON.stringify(rData));
                });
            }
        });
        
        //Returns data for the client
        /* - queue html
         * - admin popup if there is one.
        */
        this.app.get('/data', function(req, res){
            app.render('templates/queue', {queue:live.queue}, function(err, html){
                db.store.get('adminPopup', function(err2, popup){
                    if (err || err2) console.log('queue get error '+ err+'\n'+err2);
                    res.end(JSON.stringify({html:html, popup:popup}));
                });
            });
        });
        
        /* for admins sending commands from ajax. */
        this.app.post('/command', function(req, res){
            if (views.authent(req)) {
                C.log('admin command: ', req.body.func, {color:'blue'});
                live.redis.pub.publish('roverAdmin', JSON.stringify(req.body));
            }else C.log('admin command denied. : ', req.body.func, {color:'red'});
        });
        
        /* admin kicking */
        this.app.post('/kick', function(req, res){
            C.log('kicking.  everyone :  ', req.body.everyone, {color:'yellow'});
            if (!views.authent(req)) return;
            if (req.body.everyone) {
                live.socket.io.sockets.emit('kick');
                live.queue = [];
            }else if (req.body.name) {
                var member = live.getQueue({name:req.body.name});
                var kick = true;
                live.demote(member, member.index+1, kick);
            }
            res.end();
        });
        
        /* command sent to rover terminal */
        this.app.post('/execute', function(req, res){
            C.log('sending terminal command to rover: ', req.body.command, {color:'blue'});
            if (!views.authent(req)) return;
            var command = req.body.command;
            live.redis.pub.publish('roverAdmin',
                                   JSON.stringify({func:'execute', command:command}));
            res.end();
        });
    },
    
    /*
     * login - return true/false if request has correct login creds.
     * authent - return true/false if authent cookie is legit.
    */
    login: function(req){
        return  (req.body.password == this.password &&
                 req.body.username == this.username);
    },
    authent: function(req){
        //return (req.signedCookies.admin == this.adminStatus);
        var id = req.admin ? req.admin : req.cookies.admin;
        if (id){        
            var hash = crypto.createHmac('sha1', SECRET).update('admin').digest('hex');
            return (id == hash);
        }else return false;
    },
    
    /* returns sync && async live stats about server for admin */
    storeVals:['adminPopup', 'ifconfig'],       //add redis values here.
    stats: function(callback){
        
        this._data = {
            sync:{
                'Connected users': live.clientCount,    //add sync values here.
                'Queue length': live.queue.length,
                'Command total': live.commandCount
                }
            
            };
        this._chain(callback);
        for (var i in this.storeVals) {
            db.store.get(this.storeVals[i], function(err, val){
                try{
                    if (val) views._data[views.storeVals[i]] = JSON.parse(val);
                    else views._data[views.storeVals[i]] = val;
                }catch(e){
                   views._data[views.storeVals[i]] = val; 
                }
                views._chainStart--;
            });
        }
        return this._data;
    },
    _chainStart:0,
    _chainInter:null,
    _chain: function(callback){
        this._chainStart = views.storeVals.length;
        clearInterval(this._chainInter);
        this._chainInter = setInterval(function(){
            if (views._chainStart <= 0) {
                clearInterval(views._chainInter);
                callback(views._data);
            }
        },5);
        
    }
    
};

module.exports = views;
