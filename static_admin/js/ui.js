
var UI = {
    timeout:null,
    T : {
        getTemplates : function(){
                $(document).ready(function(){
                    UI.T.popup = $('#popupTemplate').html();
                });
            }
        },
    /* displays standard message for miliseconds */
    popup: function(title, message, options){
        options = options || {};
        clearTimeout(UI.timeout);
        console.log('popup');
        var popup = $('#popupSpace');
        if(options.clone){
            popup = popup.clone();
            $('#'+options.id).remove();
            popup.attr('id',options.id);
            popup.toggleClass('level5 level4');
            $('body').append(popup);
        }
        popup.html(this.T.popup);
        popup.find('.popupTitle').html(title);
        popup.find('.popupMessage').html(message);
        popup.show('fast');
        if(options.millis!=undefined) this.timeout = setTimeout(function(){popup.hide('fast')},options.millis);
    }
};
UI.T.getTemplates();