    

var Command = {
    on:false,
    id:null,
    connect: function(){
        this.socket = io.connect(Settings.host, {port: Settings.command_port});
    },
    write: function(command){
        this.on = !this.on;
        this.socket.emit('command', {func:command});
    }
};
Command.connect();
    
/* display ui for stream being reset. */
Command.socket.on('reset', function(data){
    $('iframe').attr('src','');
    $('iframe').attr('src','/video');
    UI.popup('Stream Reset',
            'The stream may take up to 30 seconds ' +
            'to come back on.  The camera on the rover just rebooted.', {millis:10000});
});

/* display announcement as popup. */
Command.socket.on('announce', function(data){
    UI.popup(data.title, data.message, {announcement:true});
});

$(document).ready(function(){
    
    Command.id = Cookie.get('commandId');
    
    $('#forward').on('click', function(){
        Command.write('forward');
    });
    $('#left').on('click', function(){
        Command.write('left');
    });
    $('#right').on('click', function(){
        Command.write('right');
    });
    $('#reverse').on('click', function(){
        Command.write('reverse');
    });
     $('#stop').on('click', function(){
        Command.write('stop');
    });
     $('#reset').on('click', function(){
        Command.write('reset');
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
        join(name);
    });
    
    $(document).on('click','.pX', function(){
        var popup = $(this).parents('.popupSpace');
        popup.hide();
    });

});

function join(name){
    $.ajax({
        url : '/join',
        type: "POST",
        data : {name:name},
        success:function(data, textStatus, jqXHR) {
            console.log('got command id , ', data.id);
            command.id = data.id;
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
    }
};