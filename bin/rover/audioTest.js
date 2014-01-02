var fs = require('fs');
var redis = require('redis');

if (process.argv.indexOf('deploy') != -1){		
    S = require('./deployment/settings').Settings;
}else{
    S = require('./../static_admin/js/settings').Settings;
}
console.log(S);
var pub = redis.createClient(S.redis_port, S.host);	//to server	
var sub = redis.createClient(S.redis_port, S.host);	//from server
//channels
sub.subscribe('audio');

sub.on('message', function(channel, data){
    console.log(channel, data);
    data = JSON.parse(data);
    speaker.write(new Buffer(data));
    
});

console.log('redis listening on audio channel');

// Create a new instance of node-core-audio
//var coreAudio = require("node-core-audio");

// Create a new audio engine
//var engine = coreAudio.createNewAudioEngine();

//var BinaryServer = require('binaryjs').BinaryServer;

//var server = BinaryServer({port: 9000});

/*
server.on('connection', function(client){
    console.log('Client connected');
    var strmed = false;
    client.on('stream', function(stream, data){
        console.log('got data ', data);
        //if (!strmed){
        //    stream.pipe(speaker);
        //speaker.write(data);
        //    strmed = true;
        //}
    });
});*/

var Speaker = require('speaker');

// Create the Speaker instance
var speaker = new Speaker({
  channels: 2,          // 2 channels
  bitDepth: 32,         // 16-bit samples
  sampleRate: 48000,     // 44,100 Hz sample rate
  signed:true
});

