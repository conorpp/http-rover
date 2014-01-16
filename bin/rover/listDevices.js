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