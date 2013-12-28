/*
    This script is for making the admin page work.
    It mustn't be linked to any page except the admin.
    
    TODO:
    -add option to set queue period
*/


$(document).ready(function(){
    
    $('#send').click(function(){
        var title = $.trim($('#popupTitle').val());
        var message = $.trim($('#popupMessage').val());
        if (title=='' || message =='') {
            UI.popup('Error','You need to fill in a title and a message',{error:true, millis:3500});
            return;
        }
        announce({title:title, message:message});
        $('#popupTitle').val('');
        $('#popupMessage').val('');
    });
    
    $('#deletePopup').click(function(){
        announce({del:true});     //overwrite with blank 
        $('#savePopup').attr('checked', false);
    });
    
    $('#reset').on('click', function(){
        ajaxCommand('reset');
    });
    
    $('#kick').on('click', function(){
        var name = $.trim($('#kickName').val());
        var everyone = $('#kickEveryone').is(':checked');
        console.log(everyone);
        if (name == '' && !everyone) {
            UI.popup('No name', 'Specify a name of someone that\'s in the queue to kick.', {millis:3500, error:true});
            return;
        }
        kick(name, everyone);
    });
    var cmds = [];
    var cmdI = 0;
    var current = '';
    /*$('#execute').click(function(){
        var command = $('#execCommand').val();
        execute(command);
        console.log(command);
    });*/
    $('#execCommand').keyup(function(e){

        if (e.keyCode == 13) {
            command = $('#execCommand').val();
            cmds.unshift(command);
            execute(command);
            command = '';
            
        }else if (e.keyCode == 38) { //up
            e.preventDefault();
            if (cmds.length) $('#execCommand').val(cmds[cmdI]);
            cmdI++;
            if (cmdI > cmds.length - 1) cmdI = cmds.length - 1;
        }else if (e.keyCode == 40) { //down
            e.preventDefault();
            cmdI--;
            if (cmdI < 0){
                cmdI = 0;
                $('#execCommand').val(command);
                return;
            }
            $('#execCommand').val(cmds[cmdI]);
        }else{
            command = $('#execCommand').val();
        }
        
    });
});


/*
    For setting single/temporary announcement for clients.
    
    @context.del - bool to specify to delete current popup
    @context.message, context.title - required string for popup contents
    @context.save - specify to save popup on every page load until deletion.
*/
function announce(context){
    context = context || {};
    if (!context.del) context.save = $('#savePopup').is(':checked');
    $.ajax({
        url : '/announce',
        type: "POST",
        data : context,
        success:function(data, textStatus, jqXHR) {
            console.log('annoucement made successfully.');
            if (context.del && !data.error) {
                UI.popup('Popup removed', 'The popup won\'t display on every page load now.', {millis:5000});
            }

        },
        
    });
}

/*
    For sending a command to a rover, regardless of queue.
    Good for resetting streams.
    
    func - string signaling the command for the rover.  See rover.js
*/
function ajaxCommand(func){
    $.ajax({
        url : '/command',
        type: "POST",
        data : {func:func},
        success:function(data, textStatus, jqXHR) {
            console.log('command made successfully.');
        },
        
    });
}

/*
    For kicking out someone by name
    or everyone.
*/
function kick(name, everyone){
    var data = {name:name};
    if (everyone) {
        data.everyone = everyone
    }
    $.ajax({
        url : '/kick',
        type: "POST",
        data : data,
        success:function(data, textStatus, jqXHR) {
            console.log('kick made successfully.');
        }
        
    });
}
/*
    Send a command to be executed in rovers terminal
*/
function execute(command) {

    Command.socket.emit('execute', {command:command, admin: Cookie.get('admin')});
}


Command.socket.emit('subscribe', {room:'admin', admin:Cookie.get('admin')});

Command.socket.on('stdout', function(data){
    console.log('got stdout!', data);
    $('#execCommand').val('');
    var text = data.stdout != '' ? data.stdout : data.error;
    if (typeof text == 'object') {
        text = JSON.stringify(text);
    }
    //console.log(text);
    //console.log(text.replace(/(\r)/gm,"<br>"));
    //console.log(text.replace(/(\n)/gm,"&nbsp;&nbsp;&nbsp;"));
    //text = text.replace(/(\n)/gm,"&nbsp;&nbsp;&nbsp;");
    $('#stdout').append(text+'<br>');
    $('#stdout').scrollTop(99999);
});

