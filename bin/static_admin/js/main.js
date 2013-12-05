    
/*
    The control for implementing the functionality.  Top level entity.
    
    TODO:
    -move AJAX requests to interface
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
Command.socket.on('announce', function(data){       //not client specific
    UI.popup(data.title, data.message, {announcement:true});
});
Command.socket.on('promote', function(data){        //is client specific
    Command.promote(data.millis);
});
Command.socket.on('demote', function(data){     //is client specific
    Command.demote();
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

$(document).ready(function(){
    
    getData();  //init queue, popup, ect.
    
    var intervalId;
    $('.command').on('mousedown', function(){
        var id = this.id;
        intervalId = setInterval(function(){
            Command.write(id);
        },10);
    });
    $('body').on('click mouseup touchend touchcancel', function(e){
        console.log('mouse left');
        clearInterval(intervalId);
       // alert('mouse up event test');
    });
    
     
    $('#join').click(function(){    //step one: enter name
        UI.popup('Enter a name', UI.T.nameTemplate);
        $('input.name').focus();
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

