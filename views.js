

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
