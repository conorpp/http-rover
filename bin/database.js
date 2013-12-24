
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
    },
    
    /*
        Get multiple values from redis given array of keys, or single key as string
    */
    get: function(keys, callback){
        if (typeof keys == 'string') {
            keys = [keys];
        }
        this._chainStart = keys.length;
        this._data = {};
        this._chain(callback);
        for (var i in keys) {
            db.store.get(keys[i], function(err, val){
                if (err) {
                    C.log('Error getting ', keys[i], ' from redis.', {color:'red'});
                }
                try{
                    if (val) database._data[keys[i]] = JSON.parse(val);
                    else database._data[keys[i]] = val;
                }catch(e){
                   database._data[keys[i]] = val; 
                }
                database._chainStart--;
            });
        }
        return keys;
    },
    _chainStart:0,
    _chainInter:null,
    _chain: function(callback){
        clearInterval(this._chainInter);
        this._chainInter = setInterval(function(){
            if (database._chainStart <= 0) {
                clearInterval(database._chainInter);
                callback(database._data);
            }
        },5);
        
    }
    
}

module.exports = database;