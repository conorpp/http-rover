
var UI = {
    timeout:null,
    T : {
        getTemplates : function(){
                $(document).ready(function(){
                    UI.T.popup = $('#popupTemplate').html();
                    UI.T.nameTemplate = $('#nameTemplate').html();
                });
            }
        },
    /* displays standard popup message. */
    popup: function(title, message, options){
        options = options || {};
        clearTimeout(UI.timeout);
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
        if (options.error) popup.find('.popupTitle').css('color', 'red');
        if (options.announcement) popup.find('.popupTitle').css('color', '#8d8cff');
        popup.show('fast');
        if(options.millis!=undefined) this.timeout = setTimeout(function(){popup.hide('fast')},options.millis);
    },
    //display timer
    timer: function(millis){
        var secs = Math.floor(millis/1000);
        $('#time').html(secs);
        var interval = setInterval(function(){
            secs--;
            if (secs<0) {
                clearInterval(interval);
                secs='';
            }
            $('#time').html(secs);
        },1000);
    },
    
    //for globally adding to queue ui
    addQueue: function(position, html){
        $('#queue').find('tbody').append(html);
        if (position==1) {
            $('#pos1').addClass('success');
        }
    },
    
    /* removes from queue and updates. global. */
    removeQueue: function(position){
        position = position || 1;
        $('#pos'+position).remove();
        $('.queueMember').each(function(){
            var newPos = parseInt(this.id.replace('pos',''))-1;
            if (newPos>=position) {
                $(this).attr('id', 'pos'+newPos);
            }
        });
        if (position==1) {
            $('#pos1').addClass('success');
        }
    }
};
UI.T.getTemplates();