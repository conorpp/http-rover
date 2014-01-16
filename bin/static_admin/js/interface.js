/*
    The backend functionality for the client side.
    Implement these methods in main.js
    Add functionality by changing this file.
    
    TODO
    -fix bugs with queue UI 
*/

/*
    Object for communicating via websocket to server for controling rover
    and controlling the queue.  See ui.js for more on queue.
*/
var Command = {
    
    id:null,            //id for authentication
    inCommand:false,    //indicator if in control
    disconnect:false,   //indicator if disconnected
    
    keys:{},    //arrow keys store here when pressed. deleted when released.
    
    /*
        Establish websocket connection with server.  Call only once.
        Establishes popup handling for connection issues as well.
    */
    connect: function(){    
        this.socket = io.connect(Settings.host, {port: Settings.command_port});
        this.socket.on('reconnecting', function(){
            UI.popup('Lost connection','Attempting to reconnect . . . ');
        });
        this.socket.on('reconnect_failed', function () {
            UI.popup('Disconnected','We failed to reconnect you.  Sorry about that.',{millis:4000});
        });
        this.socket.on('reconnect', function () {
            if (Command.disconnect) {
                var lost = 'You may have to wait a moment to send commands again.';
            }else var lost = '';
            UI.popup('Connected','We successfully reconnected you. <br>'+lost,{millis:4100});
            if (Command.inCommand) {     //attempt to seize command
                Command.socket.emit('seizeCommand', {id:Command.id});
            }
        });
        this.socket.on('connect', function () {
            console.log('socket connected');
        });

        this.socket.on('disconnect', function () {
            Command.disconnect = Command.inCommand;
            UI.popup('Disconnected','');
        });
    },
    
    //Join chatroom for page
    joinRover: function(){
        var pageRoom = $.trim($('#pageRoom').val());
        this.socket.emit('subscribe', {room:pageRoom});
        console.log('Joining ', pageRoom);
    },
    
    /*
        Writes a command to the server to control rover.
        id must be valid to be accepted.
        
        command - string to specify what command to execute.  See rover.js
    */
    millis: new Date().getTime(),
    write: function(command){
        var debounce = new Date().getTime() - this.millis;
        if (debounce > 125) {
            console.log('incommand?', this.inCommand);
            this.millis = new Date().getTime();
            if (!this.inCommand) return;
            this.socket.emit('command', {func:command, id:this.id});
        }
    },
    
    /*
        Start timer for command and init arrow keys to send commands
        arrow key events are done here because of e.preventDefault(),
        we still want user to be able to scroll outside command.
        
        millis - number that is length of timer in milliseconds. default 60,000
    */
    promote: function(millis, name){
        millis = millis || 1000*60;
        this.id = Cookie.get('commandId');
        console.log('you have been promoted.', Cookie.get('commandId'));
        var secs = Math.floor(millis/1000);
        UI.popup( name+', you are in control',
                 'You have '+secs+' seconds.',
                 {millis:2500});
        UI.timer(millis);
        this.keyupUnbind();
        console.log('about to call this.keyupListen();');
        this.keyupListen();
        this.inCommand = true;
        //audio
        R.init();
        setTimeout(function(){ if (Command.inCommand) Command.demote(); }, millis+5000);
    },
    
    /*
        Remove timer and command id. Send UI for no longer in command
    */
    demote: function(hidePopup){
        console.log('you have been demoted.');
        hidePopup = hidePopup || false;
        if (!hidePopup) 
            UI.popup('Game over', 'Time is up.  Thanks for commanding the rover!'+
                     '<br>Tell us what you think at '+
                     '<span style="color:rgb(141, 140, 255);" >conorpp@vt.edu<span>');
        Cookie.del('commandId');
        $('#time').html('');
        this.id = null;
        this.inCommand = false;
        this.keyupUnbind();
        //audio
        R.destroy();
    
    },
    
    keyupListen: function(){
        console.log('keys are listening.');
        $('html,body').keydown(function(e){
            Command.keys[e.which] = true;
            var c = Command.getCommand();
            console.log('got key '+c);
            if (c) {
                e.preventDefault();
                Command.write(c);
                for (var key in Command.keys) {
                    $('#'+Command.getCommand(key)).addClass('active');
                    console.log('activating key '+Command.getCommand(key)+'  key: '+key);
                }
                
            }
        });
        $('html, body').keyup(function(e){
            for (var key in Command.keys) {
                $('#'+Command.getCommand(key)).removeClass('active');
            }
            delete Command.keys[e.which];
        });
    },
    
    keyupUnbind: function(){
        $('html,body').unbind('keydown keyup');
        this.keys = {};
    },
    
    /*
        Checks keycode combinations and returns proper string for a rover command.
        Can send this value like Command.write(value);
    */
    getCommand: function(keyCode){
        if (keyCode == undefined) {
            if (this.keys['38'] && this.keys['37']) {
                return 'forwardleft';
            }else if (this.keys['38'] && this.keys['39']) {
                return 'forwardright';
            }
            for (var key in this.keys) {
                keyCode = parseInt(key);
                break;
            }
        }
        switch (parseInt(keyCode)) {
            case 37:
                return 'left';
            break;
            case 38:
                return 'forward';
            break;
            case 39:
                return 'right';
            break;
            case 40:
                return 'reverse';
            break;
            default:
                return false;
            break;
        }
        return false;
    }
    
};

/* for easily working with cookies. */
var Cookie = {
    
    set: function(c_name,value,exdays){
        var exdate=new Date();
        exdate.setDate(exdate.getDate() + exdays);
        var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
        document.cookie=c_name + "=" + c_value;
    },
    
    get: function(c_name){
        var c_value = document.cookie;
        var c_start = c_value.indexOf(" " + c_name + "=");
        if (c_start == -1) c_start = c_value.indexOf(c_name + "=");
        if (c_start == -1) c_value = null;
        else{
            c_start = c_value.indexOf("=", c_start) + 1;
            var c_end = c_value.indexOf(";", c_start);
            if (c_end == -1) c_end = c_value.length;
            c_value = unescape(c_value.substring(c_start,c_end));
        }
        return c_value;
    },
    
    del : function(name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
};