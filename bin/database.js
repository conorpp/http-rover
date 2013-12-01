
/* module for storing/getting data */

var database = {
    
    store:null,
    
    listen: function(port, host){
        this.store = redis.createClient(port, host);
        this.initStore();
        return database;
    },
    
    initStore: function(){
        database.store.get('commandCount',function(err, val){
            if (!val) database.store.set('commandCount', 1);
            console.log('commandCount - ', val);
            live.commandCount = val;
        });
    }
    
}

module.exports = database;