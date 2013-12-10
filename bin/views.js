

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
                var stats = views.stats();
                db.store.get('adminPopup', function(err, popup){
                    console.log('admin popup : ', popup);
                    if (popup) {
                        popup = JSON.parse(popup);
                        var message = popup.message,
                            title = popup.title,
                            checked=true;
                    }else var message = '',
                            title = '',
                            checked = false;
                    res.render('admin', {stats:stats, popup:popup, title:title, message:message, checked:checked});
                });
            }else{
                res.render('login');
            }
        });
        /* log in validation */
        this.app.post('/admin', function(req, res){
            if(views.login(req)){
                var days3 = 1000*60*60*24*3;
                res.cookie('admin', views.adminStatus, {maxAge:days3, signed:true});
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
            }else{
                var expire = (live.time * (live.queue.length+1)) + live.time*.1;    
                var queueSecs = Math.floor(live.time/1000);
                var name = (req.body.name+'').substr(0,20);
                db.store.incr('commandCount');
                db.store.get('commandCount', function(err, id){
                    var hash = crypto.createHmac('sha1', SECRET).update(id).digest('hex');
                    res.cookie('commandId', id+':'+hash, {maxAge:expire});
                    var rData ={id:id, time:queueSecs, position:live.queue.length, name:name};
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
                console.log('admin command: ', req.body.func);
                live.redis.pub.publish('roverAdmin', JSON.stringify(req.body));
            }else console.log('admin command denied. : ', req.body.func);
        });
        
        /* admin kicking */
        this.app.post('/kick', function(req, res){
            console.log('kicking.  everyone :  ', req.body.everyone);
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
        return (req.signedCookies.admin == this.adminStatus);
    },
    /* returns sync live stats about server for admin */
    stats: function(){

        return {
            'Connected users': live.clientCount,
            'Queue length': live.queue.length,
            'Command total': live.commandCount
            };
    }
    
};

module.exports = views;
