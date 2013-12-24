

//serialPort = require("serialport").SerialPort;
//C = require('./lib/colorLog');


var GPS = {
    
    records:[],
    gprmc:'',
    started:false,
    maxRecords:100,
    ready:false,
    home:[44.64682833, -68.95867],
    
    connect: function(){
        serial_gps.on('open',function () {
            C.log('GPS Ready', {color:'green', font:'bold', logLevel:1});
            GPS.ready = true;
            serial_gps.on('data', function(data) {
               //C.log(data.toString('ascii'), {color:'yellow'});
                var h = data.toString('ascii');
                //hist += h;
                if (h == '$') {
                    GPS.started = true;
                }
                if (GPS.started) {
                    if (h == '\n') {
                        GPS.end();
                    }else{
                        GPS.add(h);
                    }
                }
        
                /*i++;
                if (i > 500) {
                    C.log(hist, {color:'yellow'});
                    i=0;
                }*/
            });
        });
        Number.prototype.toRad = function() {
          return this * Math.PI / 180;
        }
    },
    /* Set attributes for GPS program
        @param home - set coord pair [lat, long] for calculating distance.
    */
    set: function(params){
        if (params.home) {
            this.home = params.home;
        }
        return params;
    },
    /*
        Event handler implementation
        'data' - passes new data to callback.
    */
    newDataEvents:[],
    on: function(event, callback){
        if (event == 'data') {
            this.newDataEvents.push(callback);
        }
    },
    /* Returns last read data from GPS
        returns 0 if nothing yet.
        adds age attribute
    */
    read: function(){
        if (this.records.length){
            var rec = this.records[this.records.length-1];
            rec.age = new Date().getTime() - rec.date.getTime();
            return rec;
        }
        else return 0;
    },
    
    add: function(h){
        this.gprmc+=h;
        if (this.gprmc.length >= 6) {
            if (this.gprmc.substr(0,6) !== '$GPRMC') {
                this.redo();
            }
        }
    },
    
    end:function(){
        var record = this.parse(this.gprmc);
        C.log('New record ', record, {color:'green', logLevel:-1});
        for (var i in this.newDataEvents) this.newDataEvents[i](record);
        this.records.push(record);
        this.redo();
        while (this.records.length > this.maxRecords) {
            this.records.shift();
        }
        C.log('current record amount - ', this.records.length, ' (max: '+ this.maxRecords +')',{color:'blue', logLevel:-1});
    },
    
    parse: function(record){
        record = record.split(',');
        
        var _lat = record[3],
            latSign = (record[4] == 'N') ? 1 : -1, //N = +, S=-
            _lng = record[5],
            lngSign =(record[6] == 'E') ? 1 : -1;  //E = +, W=-
            
        var lat = parseInt(_lat.substr(0,2)),
            latMinutes = parseFloat(_lat.substr(2,8)),
            lat = (lat + latMinutes/60) * latSign;
            
        var lng = parseInt(_lng.substr(0,3)),
            lngMinutes = parseFloat(_lng.substr(3,8)),
            lng = (lng + lngMinutes/60) * lngSign;
        //C.log('Knots: ', record[7], {color:'yellow'});
        return {
            lat:lat,
            lng:lng,
            date:new Date(),
            mph:parseFloat(record[7]) * 1.15078,
            valid:record[2] == 'A' ? true : false, //V = void, A=valid
            angle: parseFloat(record[8]), //degrees
            distance: this.distance(this.home[0], this.home[1], lat, lng)
        };
        
    },
    
    print: function(){
        for (var i in this.records) {
            C.log(this.records[i], {color:'yellow'});
        }
    },
    
    redo: function(){
        this.gprmc = '';
        this.started = false;
    },
    
    //returns distance between to coords using haversines formula
    distance: function(lat1, lon1, lat2, lon2){
        //C.log(lat1, lon1, lat2, lon2);
        var R = 3958.75; // mi
        var dLat = (lat2-lat1).toRad();
        var dLon = (lon2-lon1).toRad();
        lat1 = lat1.toRad();
        lat2 = lat2.toRad();
        
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return  R * c;
    }
};

module.exports = GPS;


