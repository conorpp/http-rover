

(function(){
    
var GPS = require('./gps');
var motors = require('./motors');

motors.connect();

/*

motors.left(), right .. 

*/
if (process.argv.indexOf('deploy') != -1) GPS.connect();
else GPS.test()

GPS.on('data', function(data){
    console.log(data);
    if (data.lat && data.lng && data.valid) {
        var dist = GPS.distance(data.lat, data.lng, GPS.home[0], GPS.home[1], 2.0902*Math.pow(10, 7));
        console.log('distance from home: ', dist);
    }
});



var obj = {
    
    i: 5,
    
    joinRover: function(){
        console.log('controlling rover .. . .');
        this.otherMethod();
    },
    
    otherMethod: function(){
        this.i++;
    }
};

obj.joinRover();

console.log('my object is in '+object.i+' state');












    
})()




