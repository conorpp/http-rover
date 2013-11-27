
var SerialPort = require("serialport").SerialPort

var tty = 'ttyUSB2';

var serialPort = new SerialPort("/dev/"+tty, {
  baudrate: 9600
  
}); 

serialPort.on('open',function () {

  serialPort.on('data', function(data) {});
  var buf = new Buffer(1);
  buf.writeUInt8(0x0,0);

  serialPort.write(buf, function(err, results) {
    if (err) {
        console.error('Error connecting : ' , err );
    }else{
        console.log('Connected Successfully.');
    }
  });
});

process.stdin.resume();
/* accept a decimal number on range 0-255
   writes the hex conversion to usb   */
process.stdin.on('data', function(data){
    var num = parseInt(data);
    if (num < 0 || num > 255 || isNaN(num)) {
        console.error('You must enter a decimal in range of 0-255');
        return;
    }
    var hex = num.toString(16);
    var buf = new Buffer(1);
    buf.writeUInt8('0x'+hex,0);
    console.log('got stdin data : ', buf);
    serialPort.write(buf, function(err, results){
        if (err) {
            console.error('Error writing to port : ', err);
        }
    });
});
