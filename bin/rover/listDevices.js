/* Lists USB device ID's for serial connecting */

var _serial = require('serialport');
var C = require('./lib/colorLog');

 _serial.list(function (err, ports) {
    //connect to port with correct ID. see `$ lspnp`
    var i = 0;
    ports.forEach(function(port) {
        i++;
        C.log(('Device '+i).green(), {logLevel:1});
        C.log('  Address: '.yellow().bold(),port.comName.yellow(), {logLevel:1});
        C.log('  pnpID: '.yellow().bold(),port.pnpId.yellow(), {logLevel:1});
    });
    if (!ports.length) {
        C.log('No devices.'.red());
    }
 });
 
 if (process.argv.indexOf('connect') != -1) {
   var _serialConstr = _serial.SerialPort;
   _serial.list(function (err, ports) {
      var addr;
      //connect to port with correct ID. see `$ lspnp`
      ports.forEach(function(port) {
         C.log(port, {color:'yellow', logLevel:-1});
         if (port.pnpId == 'usb-FTDI_FT232R_USB_UART_A901QJ43-if00-port0' ||
             port.pnpId == 'usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0'
             )
            addr = port.comName;
      });
      if (!addr) {
         C.log('Motors Fail', {color:'red', font:'bold', logLevel:1});
            return;
      }
      serial = new _serialConstr(addr, {
         baudrate: 9600
      });
      serial.on('data', function(data){
         console.log('Response: ', data);
      });
      
      serial.on('open', function(){
         //write( new Buffer( [0x8D, 0x7F] ) );
         
      });
   
   });
 }
 
 function write(buf){
   //write stop command to start off.
   buf = buf || new Buffer([0x88, 0x7F]);
   console.log('WRITING BUF : ', buf);
   serial.write(buf, function(err, results) {
      if (err) {
         C.log('Error writing: ' , err );
      }else if (results) {
         C.log('results ', results);
      }
      
   });
 }
 
process.stdin.resume();
 
process.stdin.on('data', function(data){
   if ((data+'').indexOf(',')) {
      data = (data+'').split(',');
      for (var i in data)
         data[i] = parseInt(data[i], 16);
   }else
      data = [parseInt(data, 16)];
   write(new Buffer(data));
});
 