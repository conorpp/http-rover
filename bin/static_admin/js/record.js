
/*
	Interface for recording audio and streaming it to server.
	
	Must first call init()
	then use stop() and start() freely.
*/

var R = {
	
	context: null,
	volume:null,
	socket:null,
	client:null,
	isRecording:false,
	
	/*
		Sets up recording audio and opens websocket connection for streaming.
		Handles cross-browser methods.
		
	*/
	init: function(){
	    //audio
	    navigator.getUserMedia = this.hasUserMedia();
	    if (!navigator.getUserMedia) {
		console.log('web audio api is not supported.'); return;
	    }
	    audioContext = window.AudioContext || window.webkitAudioContext;
	    this.context = new audioContext();
	    this.volume = this.context.createGain();
	    this.context.createJavaScriptNode = this.context.createScriptProcessor ||
						this.context.createJavaScriptNode;
	    //websocket
	    this.client = new BinaryClient('ws://'+Settings.host+':'+Settings.audio_port);
	    this.client.on('open', function(){
		console.log('audio socket connected.');
		R._createSocket();
	    });
	    this._record();
	},
	
	_createSocket: function(){
		R.socket = R.client.send('channel', {channel:'audio', id:Command.id});
	},
	
	/*	See if web audio api is supported.	*/
	hasUserMedia: function(){
	    return  navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia;
	},
	
	mergeBuffers: function(channelBuffer, recordingLength){
	    var result = new Float32Array(recordingLength);
	    var offset = 0;
	    var lng = channelBuffer.length;
	    for (var i = 0; i < lng; i++){
		var buffer = channelBuffer[i];
		result.set(buffer, offset);
		offset += buffer.length;
	    }
	    return result;
	},
	interleave: function(leftChannel, rightChannel){
		var length = leftChannel.length + rightChannel.length;
		var result = new Float32Array(length);
	       
		var inputIndex = 0;
	       
		for (var index = 0; index < length; ){
		  result[index++] = leftChannel[inputIndex];
		  result[index++] = rightChannel[inputIndex];
		  inputIndex++;
		}
		return result;
	},
	
	_stream: function(AudioBuffer){
		if (!Command.inCommand) return; 
        	var left = AudioBuffer.inputBuffer.getChannelData (0);
        	var right = AudioBuffer.inputBuffer.getChannelData (1);
		var weaved = R.interleave(left, right);
			
		var l = weaved.length;
		var buf = new Int8Array(l)
		
		while (l--) {
			buf[l] = (weaved[l]*0xFF); 	//convert to 8 bit
		}
			
		if (R.socket) R.socket.write(buf.buffer);
		else console.log('not connected yet');
		
	},
	/*	Prompt browser to get mic recording	*/
	_recorder: null,
	_record: function(){
	    navigator.getUserMedia({audio:true}, function (e){
		// creates an audio node from the microphone incoming stream
		audioInput = R.context.createMediaStreamSource(e);
	    
		// connect the stream to the gain node
		audioInput.connect(R.volume);
	    
		/* From the spec: This value controls how frequently the audioprocess event is 
		dispatched and how many sample-frames need to be processed each call. 
		Lower values for buffer size will result in a lower (better) latency. 
		Higher values will be necessary to avoid audio breakup and glitches */
		var bufferSize = 2048/2;
		R._recorder = R.context.createJavaScriptNode(bufferSize, 2, 2);
	    
		//R._recorder.onaudioprocess = null;//R._stream;
	    
		R.volume.connect (R._recorder);
		R._recorder.connect (R.context.destination);
		R.isRecording = true;
	    
	    }, function(e){ console.log('getUserMedia error: ', e); });
	},
	/*  Start/stop streaming the recording.  */
	start: function(){
	    if (this._recorder) 
		this._recorder.onaudioprocess = this._stream;
	    else
		console.log('Error: R not initialized');
	    //if (this.socket) this.socket.resume();
	    
	},
	
	stop: function(){
	    if (this._recorder) R._recorder.onaudioprocess = null;
	    if (this.socket) this._resetStream();
	},
	/*	Stops and kills everything.  init() must be called
		before recording again
	*/
	destroy: function(){
	    this.stop();
	    this.context = this.volume = this._recorder = null;
	    if (R.client) R.client.close();
	},
	//For attempting to improve latency
	_resetStream: function(){
		this.socket.destroy();
		this._createSocket();
	}
};



