
/*
    The interface/functionality for the UI.
    Add functionality here, don't implement.
    Try work with CSS/HTML/ect mostly here.
    
    Templates, timers, popup, queue
    
    TODO
    -Fix bugs with queue UI getting out of sync
*/

var UI = {
    timeout:null,
    queueInterval:null,      //for clearing intervals on global queue timer
    
    /*
        The HTML templates to be reused in the site.
    */
    T : {
        getTemplates : function(){
                //must wait for document to download or can cause errors
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
    @option clone - indicate to make a separate popup,
                    rather than replace the current one. Not tested. - bool
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
        if (options.pin) {
            var ele =  $(options.pin.element);
            var pos = ele.position();
            popup.css('position', 'absolute');
            popup.css('right', $(window).width()-(pos.left*5/4)).css('left', 'inherit');
            popup.css('top', pos.top);
            console.log('pnned popup at  ', pos);
        }
        if(options.millis!=undefined) this.timeout = setTimeout(function(){popup.hide('fast')},options.millis);
    },
    /*
        Display the big timer for when user is in command.
        
        millis - millisecond duration for countdown - number
    */
    timer: function(millis){
        var secs = Math.floor(millis/1000);
        $('#time').html(secs);
        var interval = setInterval(function(){
            secs = parseInt($('#time').text());
            secs--;
            if (secs<0) {
                clearInterval(interval);
                secs='';
            }
            $('#time').html(secs);
        },1000);
    },
    
    /*
        Adds html data from server to queue table.
        Handles the 'empty' message, unique ID's
        update ID's based on changing position.
        starts timer in queue table.
        
        Slightly buggy.
        
        html - string from server that is html for table entry
        position - number to specify position in queue, default 1.
    */
    addQueue: function(html, position){
        position = position || 1;
        if (html) $('#noQ').remove();
        if (position == 1 && $('#pos1').length && html) {
            $('#pos1').remove();
        }
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
    
    /*
     Remove client in queue from queue table,
     stop timer if needed.
     
     position - number to specify which position to remove, default 1
    */
    removeQueue: function(position){
        position = position || 1;
        $('#pos'+position).remove();
        clearInterval(this.queueInterval);
        if ($('tr.queueMember').length){
            $('.queueMember').each(function(){
                var newPos = parseInt(this.id.replace('pos',''))-1;
                $(this).find('td.pos').html(newPos);
                if (newPos>=position) {
                    $(this).attr('id', 'pos'+newPos);
                }
            });
        }else this.noQueue();
        this.addQueue(); //call it with no args to set first css class (the green table entry) and timer
    },
    
    /* show queue is empty message. */
    noQueue: function(){
        console.log('No queue');
        var noQ = '<tr><td id="noQ">Empty</td></tr>'
        $('tr.queueMember').remove();
        this.addQueue(noQ);
    },
    
    /*
        For updating time remaining with true value from server.
        For when client/server time values get out of sync.
    */
    syncTime: function(millis){
        var secs = Math.floor(millis/1000);
        $('#pos1').find('td.timer').html(secs); 
        if (Command.inCommand) {
            $('#timer').html(secs);
        }
    },
    
    showGPS: function(){
        
    },
    //Creates map with layer and
    //sets rover and home markers
    createMap: function(){
        try {
        if (!L) {return;}
        } catch(e) {
            return;
        }
        UI.map = L.map('map',{
            center: Settings.home,
            zoom: 17,
            zoomControl:false
        });
        L.mapbox.tileLayer('examples.map-y7l23tes').addTo(UI.map);
        UI.map.addControl(new L.Control.Zoom({ position: 'topright' }));
        UI.marker = L.marker(Settings.home);
        UI.homeMarker = L.marker(Settings.home);
        UI.marker.setIcon(L.icon({
                iconUrl:'/images/marker.png',
                iconAnchor:[15, 35],
                popupAnchor:[0, -35],
            }));
        UI.homeMarker.setIcon(L.icon({
                iconUrl:'/images/homeMarker.png',
                iconAnchor:[15, 35],
                popupAnchor:[0, -35],
            }));
        UI.marker.addTo(UI.map);
        UI.homeMarker.addTo(UI.map);
        UI.marker.bindPopup('<h4 class="color1">The rover</h4>').openPopup();
        UI.homeMarker.bindPopup('<h4 class="color1">Rover home point</h4>');
        //UI.marker.setLatLng();
    }
};
//get templates.
UI.T.getTemplates();
