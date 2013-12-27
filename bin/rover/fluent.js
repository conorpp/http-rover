
//Testing for ffmpeg node module.

//this is gay.

var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var infs = fs.createReadStream('/dev/video0');

var proc = new ffmpeg({ source: '/dev/video0' })
  .withSize('640x480')
  .withFps(30)
  .addOption('-an').addOption('-b','800k')
  .toFormat('mpeg1video')
  .saveToFile('http://localhost:8082/abc/640/480', function(stdout, stderr) {
    console.log('file has been converted succesfully');
  });
  
  //ffmpeg -s 640x480 -f video4linux2 -i
  ///dev/video19 -an -f mpeg1video -b 800k
  //-r 30 http://localhost:8082/abc/640/480
