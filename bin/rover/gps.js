/*
    Responsible for reading GPS data and providing methods for
    disseminating that data.
    
    Requirements:
        custom lib - serial, colorLog 
*/

var GPS = {
    
    records:[],
    gprmc:'',
    started:false,
    maxRecords:100,
    ready:false,
    home:[44.64682833, -68.95867],
    
    /*
        Begin connection and reading from GPS module.
    */
    connect: function(){
        var SER = require("serialport").SerialPort;
        var SERIAL = new SER('/dev/ttyUSB1', {
                        baudrate: 9600
                    });
        /*SERIAL.on('open', function(){
                    C.log('GPS Ready', {color:'green', font:'bold', logLevel:1});
                    GPS.ready = true;
                    SERIAL.on('data', function(data){
                        //console.log('dater', data);
                        var h = data.toString('ascii');
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
                    });
        });*/
        Serial.link('gps',function(err, _data){
            if (_data && _data.serial) {
                _data.serial.open(function(){
                    C.log('GPS Ready', {color:'green', font:'bold', logLevel:1});
                    GPS.ready = true;
                    var hist = '';
                    i = 0;
                    _data.serial.on('data', function(data){
                        //console.log('GPS DATA!', data);
                        var h = data.toString('ascii');
                        
                        if (GPS.started) {
                            if (h == '\n' || h=='$') {
                                //console.log('ENDED ', h);
                                GPS.end();
                            }else{
                                
                                GPS.add(h);
                            }
                        }else{
                            if (h == '$') {
                                GPS.started = true;
                                //console.log('STARTED', h);
                            }
                        }
                       // hist+=h;
                        //i++;
                        //if (i>180) {
                         //   i=0;
                         //   console.log('RAW GPS RECORD: ', hist);
                       // }
                        
                    });
                });
            }else{
                C.log('GPS Failed', {color:'red', font:'bold', logLevel:1});
            }
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
        event 'data' - passes new data to callback.
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
    
    /*
        Adds an ascii character from GPS module to string record.
        
        Current record standards supported : GPRMC
    */
    add: function(h){
        this.gprmc+=h;
            console.log('progress ', this.gprmc);
            console.log('length? ', this.gprmc.length);
        if (this.gprmc.length >= 5) {
            if (this.gprmc.substr(0,5) != 'GPRMC') {
                this.redo();
            }
       }
        //if (i>79) {
        //    console.log('raw 2 GPS :', this.gprmc);
       // }
    },
    
    end:function(){
        console.log('END CALLED!');
        var record = this.parse(this.gprmc);
        C.log('New record ', record, {color:'green', logLevel:-1});
        if (record.valid) for (var i in this.newDataEvents) this.newDataEvents[i](record);
        this.records.push(record);
        this.redo();
        while (this.records.length > this.maxRecords) {
            this.records.shift();
        }
        C.log('current record amount - ', this.records.length, ' (max: '+ this.maxRecords +')',{color:'blue', logLevel:-1});
    },
    
    /*
        Turns a GPRMC string into an obj
    */
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
    
    /*
        Prints out the records recorded from GPS
    */
    print: function(){
        for (var i in this.records) {
            C.log(this.records[i], {color:'yellow'});
        }
    },
    //Wipes current string record.  For when non supported standard is read.
    redo: function(){
        console.log('REDO!');
        this.gprmc = '';
        this.started = false;
    },
    
    /*returns distance between to coords using haversines formula
        Miles is default unit
        C - optional constant to multiply answer by
     */
    distance: function(lat1, lon1, lat2, lon2, C){
        //C.log(lat1, lon1, lat2, lon2);
        var R = C || 3958.75; // mi
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



