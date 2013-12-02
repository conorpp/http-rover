//script for admin page.



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
    
});

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

