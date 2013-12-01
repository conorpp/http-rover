
var UI = {
    timeout:null,
    queueInterval:null,             //for clearing interval on global queue timer
    
    T : {
        getTemplates : function(){
                $(document).ready(function(){
                    UI.T.popup = $('#popupTemplate').html();
                    UI.T.nameTemplate = $('#nameTemplate').html();
                });
            }
        },
    /* displays standard popup message. */
    /*
    @option error - displays error type popup - bool 
    @option announcment - displays announcemet type popup - bool
    @option millis - ms for popup to display.  default forever - number
    */
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
    addQueue: function(html, position){
        position = position || 1;
        if (html) $('#noQ').remove();
        $('#queue').find('tbody').append(html);
        if (position==1 && $('#pos1').length) {
            $('#pos1').addClass('success');
            var time = $('#pos1').find('td.timer');
            var secs = parseInt(time.text());
            UI.queueInterval = setInterval(function(){
                secs = parseInt(time.text()) - 1;
                if (secs<0) {
                    clearInterval(UI.queueInterval);
                    secs='';
                }
                time.html(secs);
            },1000);
        }
    },
    
    /* removes from queue and updates. global. */
    removeQueue: function(position){
        position = position || 1;
        $('#pos'+position).remove();
        clearInterval(this.queueInterval);
        if ($('tr.queueMember').length){
            $('.queueMember').each(function(){
                var newPos = parseInt(this.id.replace('pos',''))-1;
                if (newPos>=position) {
                    $(this).attr('id', 'pos'+newPos);
                }
            });
        }else this.noQueue();
        this.addQueue(); //call it with no args to set new css class and timer
    },
    
    /* show queue is empty message. */
    noQueue: function(){
        console.log('No queue');
        var noQ = '<tr><td id="noQ">Empty</td></tr>'
        this.addQueue(noQ);
    },
    
    syncTime: function(millis){
        $('#pos1').find('td.timer').html(Math.floor(millis/1000));
    }
};

UI.T.getTemplates();
