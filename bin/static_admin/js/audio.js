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

function makeWAV(leftchannel, rightchannel, recordingLength){
	//we flat the left and right channels down
	var leftBuffer = mergeBuffers ( leftchannel, recordingLength );
	var rightBuffer = mergeBuffers ( rightchannel, recordingLength );
	// we interleave both channels together
	var interleaved = interleave ( leftBuffer, rightBuffer );
	client.send('channel',interleaved);
	return;
	// create the buffer and view to create the .WAV file
	var buffer = new ArrayBuffer(44 + interleaved.length * 2);
	
	var view = new DataView(buffer);
 
	// write the WAV container, check spec at: https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
	// RIFF chunk descriptor
	writeUTFBytes(view, 0, 'RIFF');
	view.setUint32(4, 44 + interleaved.length * 2, true);
	writeUTFBytes(view, 8, 'WAVE');
	// FMT sub-chunk
	writeUTFBytes(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	// stereo (2 channels)
	view.setUint16(22, 2, true);
	view.setUint32(24, 44100, true);
	view.setUint32(28, 44100 * 4, true);
	view.setUint16(32, 4, true);
	view.setUint16(34, 16, true);
	// data sub-chunk
		writeUTFBytes(view, 36, 'data');
	view.setUint32(40, interleaved.length * 2, true);
		 
	// write the PCM samples
	var lng = interleaved.length;
	var index = 44;
	var volume = 1;
	for (var i = 0; i < lng; i++){
    	view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
	    index += 2;
	}
 
	// our final binary blob that we can hand off
	var blob = new Blob ( [ view ], { type : 'audio/wav' } );
	//var reader = new FileReader();
	//var arr = reader.readAsArrayBuffer(blob);
	//client.send(null, blob);
	//reader.addEventListener("loadend", function() {
	//	_blob = reader.result;
	//	client.send(_blob);
	//});
	//Command.socket.emit('audio', {leftchannel:leftchannel, rightchannel:rightchannel, recordingLength:recordingLength});
}
_blob=0;
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
		//console.log ('recording', left);
        	var right = AudioBuffer.inputBuffer.getChannelData (1);
        	// we clone the samples
		var weaved = interleave(left, right);
		
		var avg = 0;
		for (var i in weaved) {
			avg += weaved[i]
		}
		avg = avg/weaved.length;
		console.log('Avg: ', avg*100);
		client.send('channel', weaved);
        	//leftchannel.push (new Float32Array (left));
        	//rightchannel.push (new Float32Array (right));
        	//recordingLength += bufferSize;
    	}

    	// we connect the recorder
    	volume.connect (recorder);
    	recorder.connect (context.destination); 
    	//var button = document.getElementById('download');
    	//button.addEventListener("click", function(){
	setInterval(function(){
    		console.log('button clicked');
    		//makeWAV(leftchannel, rightchannel, recordingLength);
		leftchannel = [];
		rightchannel = [];
		recordingLength = 0;
	},200);
	//}, false);
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

client.on('stream', function(stream, meta){
	console.log('recieving stream ', stream, meta);
	/*if (_blob) {
		stream.write(_blob);
	}*/
});

