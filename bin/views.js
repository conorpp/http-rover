

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
        
        /* admin details.  check if admin cookie else login. */
        this.app.get('/admin', function(req, res){
            if (views.authent(req)) {
                res.render('admin', {stats:views.stats()});
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
                live.socket.io.sockets.emit('announce', {title: req.body.title, message: req.body.message});
            }else{
                res.writeHead(403);
            }
            res.end();
        });
        this.app.post('/join', function(req, res){
            //res.writeHead(200);
            if (req.signedCookies.command && false) {
                var rData = {error:'You\'re already in the queue'};
                res.end(JSON.stringify(rData));
            }else{
                var expire = live.time+live.time*.1;    
                var queueSecs = 60;
                var name = (req.body.name+'').substr(0,20);
                db.store.incr('commandCount');
                db.store.get('commandCount', function(err, id){
                    res.cookie('command', id, {maxAge:expire, signed:true});
                    var rData ={id:id, time:queueSecs, position:live.queue.length, name:name};
                    res.end(JSON.stringify(rData));
                });
            }
        });
        
        /* returns html for queue. */
        this.app.get('/queue', function(req, res){
            app.render('templates/queue', {queue:live.queue}, function(err, html){
                if (err) console.log('queue get error ', err);
                console.log('html  for queue ', html);
                res.end(JSON.stringify({html:html}));
            });
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
    /* returns live stats about server */
    stats: function(){

        return {
            'Client count': live.clientCount
            };
    }
    
};

module.exports = views;
