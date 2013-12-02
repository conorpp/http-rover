    

var Command = {
    on:false,
    id:null,
    inCommand:false,
    
    connect: function(){
        this.socket = io.connect(Settings.host, {port: Settings.command_port});
    },
    
    millis: new Date().getTime(),
    
    write: function(command){
        var debounce = new Date().getTime() - this.millis;
        if (debounce > 200) {
            console.log('incommand?', this.inCommand);
            this.millis = new Date().getTime();
            if (!this.inCommand) return;
            this.socket.emit('command', {func:command, id:this.id});
        }
    },
    
    promote: function(millis){
        millis = millis || 1000*60;
        console.log('you have been promoted.');
        var secs = Math.floor(millis/1000);
        UI.popup('Command',
                 'You can now control the rover. You have '+secs+' seconds.',
                 {millis:2500});
        UI.timer(millis);
        this.id = Cookie.get('commandId');
        this.inCommand = true;
        $('html,body').keydown(function(e){
            var c = Command.getCommand(e.keyCode);
            if (c) {
                e.preventDefault();
                Command.write(c);
                $('#'+c).addClass('active');
            }
        });
        $('html, body').keyup(function(e){
            var c = Command.getCommand(e.keyCode);
            if (c) $('#'+c).removeClass('active');
        });
    },
    
    demote: function(){
        console.log('you have been demoted.');
        UI.popup('Game over', 'Time is up.  Thanks for commanding the rover!', {millis:5500});
        Cookie.del('commandId');
        this.id = null;
        this.inCommand = false;
        $('html,body').unbind('keydown keyup');
    },
    
    getCommand: function(keyCode){
        switch (keyCode) {
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
Command.connect();
    
/* display ui for stream being reset. */
Command.socket.on('reset', function(data){
    $('iframe').attr('src','');
    $('iframe').attr('src','/video');
    UI.popup('Stream Reset',
            'The stream may take up to 30 seconds ' +
            'to come back on.  The camera on the rover just rebooted.',
            {millis:10000, announcement:true});
});

/* display announcement as popup. */
Command.socket.on('announce', function(data){
    UI.popup(data.title, data.message, {announcement:true});
});
Command.socket.on('promote', function(data){
    Command.promote(data.millis);
});
Command.socket.on('demote', function(data){
    Command.demote();
});
Command.socket.on('changeCommand', function(data){
    console.log('the command has changed.');
});
Command.socket.on('addQueue', function(data){
    console.log('new queue member , ', data);
    UI.addQueue(data.html, data.position);
});

Command.socket.on('removeQueue', function(data){
    console.log('removed que member , ', data);
    UI.removeQueue(data.position);
});
Command.socket.on('syncTime', function(data){
    console.log('got time sync data , ', data);
    UI.syncTime(data.queueTime);
});
$(document).ready(function(){
    
    getData();

    Command.id = Cookie.get('commandId');
    
    var intervalId;
    $('.command').on('mousedown', function(){
        var id = this.id;
        intervalId = setInterval(function(){
            Command.write(id);
        },200);
    }).bind('mouseup', function(){
        console.log('mouse left');
        clearInterval(intervalId);
    });
    
    $('html,body').keydown(function(e){
        switch (e.keyCode) {
            case 37:
                var c = 'left';
            break;
            case 38:
                var c = 'forward';
            break;
            case 39:
                var c = 'right';
            break;
            case 40:
                var c = 'reverse';
            break;
            default:
                return;
            break;
        }
        e.preventDefault();
        Command.write(c);
        $('#'+c).addClass('active');
    });
    $('html, body').keyup(function(e){
        switch (e.keyCode) {
            case 37:
                var c = 'left';
            break;
            case 38:
                var c = 'forward';
            break;
            case 39:
                var c = 'right';
            break;
            case 40:
                var c = 'reverse';
            break;
            default:
                return;
            break;
        }
        $('#'+c).removeClass('active');
    });

     
    $('#join').click(function(){    //step one: enter name
        UI.popup('Enter a name', UI.T.nameTemplate);
    });
     
    $(document).on('click', '.joinSubmit', function(){
        var name = $.trim($(this).siblings('input.name').val());
        if (name=='') {
            $(this).siblings('.errors').html('what\'s your name?');
            return;
        }
        $(this).parents('.popupSpace').hide();
        join(name.substr(0,20));
    });
    
    $(document).on('click','.pX', function(){
        $(this).parents('.popupSpace').hide();
    });

});

/* for joining the queue. */
function join(name){
    $.ajax({
        url : '/join',
        type: "POST",
        data : {name:name},
        dataType: 'json',
        success:function(data, textStatus, jqXHR) {
            if (data.error) {
                UI.popup('Error', data.error, {error:true, millis:3800});
                return;
            }
            console.log('got command id , ', data.id);
            Command.id = data.id;
            Command.socket.emit('join', {id:data.id, name:data.name});
        },
        
    });
}

/* for loading current data when page loads. */
function getData(){
    $.ajax({
        url : '/data',
        type: "GET",
        dataType: 'json',
        success:function(data, textStatus, jqXHR) {
            console.log('got data data', data);
            if (data.error) {                   //queue
                UI.popup('Error', data.error, {error:true, millis:3800});
            }else if (data.html) {
                console.log('got queue  , ', data);
                UI.addQueue(data.html);
            }else{
                UI.noQueue();
            }
            if (data.popup) {
                data.popup = JSON.parse(data.popup);
                UI.popup(data.popup.title, data.popup.message, {announcement:true, millis:5000});
            }
            
        },
        
    });
}

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