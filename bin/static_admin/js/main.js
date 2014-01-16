    
/*
    The control for implementing the functionality.  Top level entity.
    
    TODO:
    -move AJAX requests to interface
    -move seizeCOmmand event inner code to interface
*/

//For page reloads during command.
Command.id = Cookie.get('commandId');

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
var disconnectFlag = false;
Command.socket.on('popup', function(data){       //not client specific
    if (data.disconnect != undefined) {
        if (disconnectFlag && data.disconnect) {
            return;
        }
        disconnectFlag = data.disconnect;
    }
    data.announcement = true;
    UI.popup(data.title, data.message, data);
});
Command.socket.on('promote', function(data){        //is client specific
    Command.promote(data.millis, data.name);
    
});
Command.socket.on('demote', function(data){     //is client specific
    data = data || {};
    if (!data.kick) {
        Command.demote();
    }else{
        hidepopup = true;
        Command.demote(hidepopup);
        UI.popup('Kicked out.','You have been removed from the queue.',{millis: 6500});
    }
});

Command.socket.on('addQueue', function(data){   //not client specific
    console.log('new queue member , ', data);
    UI.addQueue(data.html, data.position);
});

Command.socket.on('removeQueue', function(data){    //not client specific
    console.log('removed que member , ', data);
    UI.removeQueue(data.position);
});

Command.socket.on('syncTime', function(data){       //not client specific
    console.log('got time sync data , ', data);
    UI.syncTime(data.queueTime);
});
Command.socket.on('info', function(data){       //not client specific
    console.log('got info , ', data);
    
    if (!data.gps) return;
    else if (!data.gps.valid) return;
    
    if (UI.marker && data.gps.lat && data.gps.lng )
        UI.marker.setLatLng([data.gps.lat, data.gps.lng]);
        
    if (data.gps.mph != undefined) {
        var num = parseFloat(data.gps.mph)*100,
            num = Math.floor(num)/100;
        $('#mph').html(num+' mph');
    }
    
    if (data.latency != undefined) {
        $('#latency').html(data.latency+' ms');
    }
});
Command.socket.on('kick', function(data){           //not client specific
    console.log('Kicked out');
    UI.popup('Queue emptied','The queue has been emptied by an admin.  Sorry if this is inconvenient', {millis:6500});
    hidepopup = true;
    Command.demote(hidepopup);
    UI.noQueue();
});

Command.socket.on('commandSeized', function (data) {
    console.log('command siezed ', data);
    if (data.first) {
        UI.popup('Command returned','You are back in control.',{millis:2500});
        if (!Command.inCommand) {
            Command.promote(data.millis, data.name);
        }
    }else{
        UI.popup('Connection recognized.','You are back in the queue.',{millis:2500});
    }
});
$(document).ready(function(){
    UI.createMap();
    getData();  //init queue, popup, ect.
    Command.joinRover();
    if (Command.id) {     //attempt to seize command
        Command.socket.emit('seizeCommand', {id:Command.id});
        UI.popup('Command or queue connection lost',
                 'Reconnecting you now . . .', {millis:3000, error:true});
    }
    var intervalId;
    
    
    //Event listeners put into functions
    //to try to solve buttons sticking on mobile.
    var stop = false;
    function bindButtons(){
        $('.command').on('mousedown touchstart', function(e){
            if (e.type == 'touchstart') {
                $(this).unbind('mousedown');
            }
            var id = this.id;
            clearInterval(intervalId);
            //extra precautions taken to make sure this interval doesn't
            //get stuck.
            stop = false;
            intervalId = setInterval(function(){
                if (stop) {
                    clearInterval(intervalId);
                    return;
                }
                Command.write(id);
            },10);
        });
    }
    
    bindButtons();
    
    function unbindButtons() {
        $('.command').unbind('touchstart');
    }
    
    $('body').on('click mouseup touchend touchcancel', function(){
        console.log('mouse left');
        clearInterval(intervalId);
       // hopefully prevent button sticking.
        unbindButtons();
        bindButtons();
        stop = true;
    });
    
    $('#stop').on('click mouseup touchend', function(){
        if (!Command.inCommand) return;
        clearInterval(intervalId);

        // hopefully prevent button sticking.
        unbindButtons();
        bindButtons();
        stop = true;
    });
    
     
    $('#record,.command').click(function(){    //step one: enter name
        if (Command.inCommand) return;
        UI.popup('Enter a name', UI.T.nameTemplate);
        $('input.name').focus();
    });
    $('#refresh').click(function(){    //refresh the stream
        var url = $('#stream').attr('src');
        $('#stream').attr('src','');
        $('#stream').attr('src',url);
    });
    
    $('#record').mousedown(function(){
        R.start();
        $(this).find('span')
            .removeClass('not-recording').addClass('recording');
    });
    $('#record').mouseup(function(){    
        R.stop();
        $(this).find('span')
            .removeClass('recording').addClass('not-recording');
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
    $(document).on('keyup', '#nameField', function(e){
        if (e.keyCode == 13) 
            $('.joinSubmit').trigger('click');
        
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
            console.log('got in queue , ', data);
            Command.id = data.id;
            Command.socket.emit('join', {id:data.id, name:data.name});
            
            if (data.position > 1) {
                UI.popup('In queue', 'Check your position in the queue below.  We will ' +
                         'remember you if the page refreshes.', {millis:8000});
            }
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
                UI.popup(data.popup.title, data.popup.message, {announcement:true, millis:15000, clone:true});
            }
            
        },
        
    });
}

