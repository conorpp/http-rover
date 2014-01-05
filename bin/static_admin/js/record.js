console.log('Hello webkit tester');

//var navigator = window.navigator;
function hasGetUserMedia() {
	return navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
}
function errorCallback(e){
	console.log('there was an error ', e);
}

function mergeBuffers(channelBuffer, recordingLength){
  var result = new Float32Array(recordingLength);
  var offset = 0;
  var lng = channelBuffer.length;
  for (var i = 0; i < lng; i++){
    var buffer = channelBuffer[i];
    result.set(buffer, offset);
    offset += buffer.length;
  }
  return result;
}
function interleave(leftChannel, rightChannel){
  var length = leftChannel.length + rightChannel.length;
  var result = new Float32Array(length);
 
  var inputIndex = 0;
 
  for (var index = 0; index < length; ){
    result[index++] = leftChannel[inputIndex];
    result[index++] = rightChannel[inputIndex];
    inputIndex++;
  }
  return result;
}
function writeUTFBytes(view, offset, string){
  var lng = string.length;
  for (var i = 0; i < lng; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


function setup(){

    navigator.getUserMedia({audio:true}, function (e){
    	// creates the audio context
    	audioContext = window.AudioContext || window.webkitAudioContext;
    	context = new audioContext();

    	// creates a gain node
    	volume = context.createGain();

    	// creates an audio node from the microphone incoming stream
    	audioInput = context.createMediaStreamSource(e);

    	// connect the stream to the gain node
    	audioInput.connect(volume);

    	/* From the spec: This value controls how frequently the audioprocess event is 
    	dispatched and how many sample-frames need to be processed each call. 
    	Lower values for buffer size will result in a lower (better) latency. 
    	Higher values will be necessary to avoid audio breakup and glitches */
    	var bufferSize = 2048;
    	context.createJavaScriptNode = context.createScriptProcessor || context.createJavaScriptNode;
    	recorder = context.createJavaScriptNode(bufferSize, 2, 2);
	var leftchannel = [];
	var rightchannel = [];
	var recordingLength = 0;
    	recorder.onaudioprocess = function(AudioBuffer){
        	
        	var left = AudioBuffer.inputBuffer.getChannelData (0);
        	var right = AudioBuffer.inputBuffer.getChannelData (1);
        	
		var weaved = interleave(left, right);
			
		var l = weaved.length;
		var bufI = new Int8Array(l)
		
		while (l--) {
			bufI[l] = (weaved[l]*0xFF); 	//convert to 8 bit
		}
			
		if (STREAM) STREAM.write(bufI.buffer);
		else console.log('not connected yet');

    	}

    	// we connect the recorder
    	volume.connect (recorder);
    	recorder.connect (context.destination); 

	}, errorCallback);
}
navigator.getUserMedia = hasGetUserMedia();

if (navigator.getUserMedia) {
  setup();
  console.log('setting up');
} else {
  console.log('not supported.');
}


var client = new BinaryClient('ws://'+Settings.host+':'+Settings.audio_port);
console.log('AUDIO BCLIENT at '+ Settings.host, Settings.audio_port);
client.on('stream', function(stream, meta){
	console.log('recieving stream ', stream, meta);
	/*if (_blob) {
		stream.write(_blob);
	}*/
});
var STREAM;
client.on('open', function(){
	STREAM = client.send('channel', {channel:'audio'});

});



