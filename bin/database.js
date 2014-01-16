
/*
    module for storing/getting data

    Requirements:
        redis
        
        
    Keys Index:
        commandCount - (int) number of times queue entered.  Incremented every time.
        
        adminPopup - (str) JSON obj for popup.  For saving from admin page.
        
        ifconfig - (str) Last info on network config for rover.
        
        gps - (str) JSON obj for last known GPS data for rover.
        
        queueHistory - (str) JSON copy of everyone that commanded rover ever.
    
    TODO:
    HMSET index:
    
        roverInfo = {
            ifconfig: same as above,
            gps: same as above
        }
        
        serverInfo = {
            commandCount: same
            adminPopup: same
        }
        
*/
module.exports = (function(){
    
var redis = require('redis');

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
            C.log('commandCount - ', val, {logLevel:-1});
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
        var self = this;
        self._chainStart = keys.length;
        self._data = {};
        //this._chain(callback);
        for (var i in keys) {
            self.store.get(keys[i], function(err, val){
                var n = keys.length - self._chainStart;
                if (err) {
                    C.log('Error getting ', keys[n], ' from redis.', {color:'red'});
                }
                try{
                    if (val) self._data[keys[n]] = JSON.parse(val);
                    else self._data[keys[n]] = val;
                }catch(e){
                   self._data[keys[n]] = val; 
                }
                //console.log('got db val '+ keys[n], val);
                self._chainStart--;
                if (self._chainStart == 0) callback(self._data);
                    
            });
        }
        return keys;
    }
    
}

return database

})();
