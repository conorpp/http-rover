//script for admin page.
$(document).ready(function(){
    
    $('#send').click(function(){
        var title = $.trim($('#popupTitle').val());
        var message = $.trim($('#popupMessage').val());
        if (title=='' || message =='') {
            UI.popup('Error','You need to fill in a title and a message',{error:true, millis:350330});
            return;
        }
        announce(title, message);
        $('#popupTitle').val('');
        $('#popupMessage').val('');
    });
    
});

function announce(title, message){
    $.ajax({
        url : '/announce',
        type: "POST",
        data : {title:title, message:message},
        success:function(data, textStatus, jqXHR) {
            console.log('annoucement made successfully.');
        },
        
    });
}

