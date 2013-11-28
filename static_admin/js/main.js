    

var Command = {
    on:false,
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
    $(document).on('click','.pX', function(){
        var popup = $(this).parents('.popupSpace');
        popup.hide();
    });

});