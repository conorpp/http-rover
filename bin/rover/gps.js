/*
    Responsible for reading GPS data and providing methods for
    disseminating that data.
    
    Requirements:
        custom lib - serial, colorLog 
*/
module.exports =

(function(){
    
Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

var C = require('./lib/colorLog');

var GPS =  {
    
    records:[],
    maxRecords:100,
    ready:false,
    home:[44.64682833, -68.95867],
    
    /*
        Begin connection and reading from GPS module.
    */
    connect: function(){
        var _serialport = require("serialport");
        var _serialConstr = _serialport.SerialPort;

        _serialport.list(function (err, ports) {
            var addr;
            ports.forEach(function(port) {
                C.log(port, {color:'yellow', logLevel:-1});
                if (/*port.pnpId == 'usb-FTDI_FT232R_USB_UART_A901QJ43-if00-port0' ||*/
                    port.pnpId == 'usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0')

                        addr = port.comName;
                
            });
            if (!addr) {
                C.log('GPS Fail', {color:'red', font:'bold', logLevel:1});
                return;
            }
            var serial = new _serialConstr(addr, {
                baudrate: 9600,
                parser: _serialport.parsers.readline("\n")
            });
            serial.on('open', function(){
                C.log('GPS Ready', {color:'green', font:'bold', logLevel:1});
                GPS.ready = true;
                serial.on('data', function(data){
                    GPS.parse(data);
                });
            });
        });

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
    
    parse: function(line){
        var start = line.substr(0,6);
        var record;
        switch (start) {
            case '$GPRMC':
                record = this.parse_RMC(line);
            break;
            case '$GPGGA':
                record = this.parse_GGA(line);
            break;
            case '$GPVTG':        
                record = this.parse_VTG(line);
            break;
            default:
                //not supported format.
            break;
        }
        if (record && record.valid){
            C.log('New record ', record, {color:'green', logLevel:-2});
            
            for (key in record) this.stat[key] = record[key];                   //update stat
            
            for (var i in this.newDataEvents) this.newDataEvents[i](record);    //emit event
            
            this.records.push(record);                                          //add to records                            
            
            while (this.records.length > this.maxRecords)                       //delete old records
                this.records.shift();
            
        }

    },
    /* Returns latest data from gps.  Adds age in ms
    */
    read: function(){
        var stat = this.stat
        stat.age = new Date().getTime() - stat.date.getTime();
        stat.type = 'all';
        return stat;
    },
    
    stat:{      //Latest valid data for .read()
        lat:null,
        lng:null,
        date: new Date(),
        direction:null,
        altitude:null,
        mph:0,
        kmph:0,
        distance:0,
        type:'all'
    },
    
    /*
        *PARSING functions: parse_RMC, parse_GGA, parse_VTG
        
        parse GPS strings from GPS, e.g. GPGGA,045103.000,4438.8155,N,06857.5148,W,1,11,0.89,95.4,M,-30.6,M,,*6A
        and returns it in object form.
        
        *the respective object keys must match that in this.stat
    */
    parse_RMC: function(record){
        record = record.split(',');
        if (record.length < 7) {
            console.log('Not parsing GPRMC record because its incomplete');
            return {valid:false};
        }
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
            
        return {
            type:'RMC',
            lat:lat,
            lng:lng,
            date:new Date(),
            mph:parseFloat(record[7]) * 1.15078,
            valid:record[2] == 'A' ? true : false, //V = void, A=valid
            direction: parseFloat(record[8]), //degrees
            distance: this.distance(this.home[0], this.home[1], lat, lng)
        };
        
    },
    //------date1--------lat2----------lng4--------valid6--#satel.7--dil.8--alt.9
    //GPGGA,045103.000,4438.8155,N,06857.5148,W,     1,     11     ,0.89,   95.4,M,-30.6,M,,*6A
    parse_GGA: function(record){
        record = record.split(',');
        if (record.length < 9) {
            C.err('Not parsing GPGGA record because its incomplete');
            return {valid:false};
        }
        var _lat = record[2],
            latSign = (record[3] == 'N') ? 1 : -1, //N = +, S=-
            _lng = record[4],
            lngSign =(record[5] == 'E') ? 1 : -1;  //E = +, W=-
            
        var lat = parseInt(_lat.substr(0,2)),
            latMinutes = parseFloat(_lat.substr(2,8)),
            lat = (lat + latMinutes/60) * latSign;
            
        var lng = parseInt(_lng.substr(0,3)),
            lngMinutes = parseFloat(_lng.substr(3,8)),
            lng = (lng + lngMinutes/60) * lngSign;
            
        return {
            type:'GGA',
            lat:lat,
            lng:lng,
            date:new Date(),
            valid:record[6] != '0' ? true : false, //V = void, A=valid
            distance: this.distance(this.home[0], this.home[1], lat, lng),
            altitude:parseFloat(record[9])
        };
        
    },//----------1direc--2true--3,4mag----5knots--6------7kilos
    //$GPVTG,    21.75,    T,    ,M      ,0.02    ,N    ,0.03    ,K   ,A*0D
    parse_VTG: function(record){
        record = record.split(',');
        if (record.length < 7) {
            C.err('Not parsing GPVTG record because its incomplete');
            return {valid:false};
        }
        return {
            type:'VTG',
            date:new Date(),
            mph:parseFloat(record[5]) * 1.15078,
            kmph:parseFloat(record[7]),
            direction: parseFloat(record[1]),
            valid:true
        };
        
    },
    
    /*
        Prints out the parsed records recorded from GPS
    */
    print: function(){
        for (var i in this.records) {
            C.log(this.records[i], {color:'green'});
        }
    },
    
    /*returns distance between to coords using haversines formula
        Miles is default unit
        Const - optional constant to multiply answer by for unit
            must be distance of earths radius in that unit
            e.g.
                mi: 3958.75
                km: 6371
                ft: 2.0902*Math.pow(10, 7) //2.0902*10^7
            
     */
    distance: function(lat1, lon1, lat2, lon2, Const){
        //C.log(lat1, lon1, lat2, lon2);
        var R = Const || 3958.75; // mi
        var dLat = (lat2-lat1).toRad();
        var dLon = (lon2-lon1).toRad();
        lat1 = lat1.toRad();
        lat2 = lat2.toRad();
        
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return  R * c;
    },
    
    //Simulate GPS by generating fake data
    isTesting:false,
    test: function(){
        if (this.isTesting) {
            C.warn('GPS is already testing fake data.  Ignored call.');
            return;
        }
        var generate = function(){
            GPS.stat.lat = GPS.home[0] - Math.random() * 0.0001;
            GPS.stat.lng = GPS.home[1] - Math.random() * 0.0001;
            GPS.stat.direction = 355 - Math.random() * 20;
            GPS.stat.kmph = Math.random() * 2;
            GPS.stat.mph = GPS.stat.kmph * 1.15078;
            GPS.stat.altitude = 98 - Math.random() * 15;
            GPS.stat.date = new Date();
            GPS.stat.distance = GPS.distance(GPS.stat.lat, GPS.stat.lng, GPS.home[0], GPS.home[1]);
            GPS.stat.valid = true;
            for (var i in GPS.newDataEvents) GPS.newDataEvents[i](GPS.stat)
        }
        setInterval(function(){
            generate();
        },250);
        this.isTesting=true;
    }
}

return GPS;

})();



