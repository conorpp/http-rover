    

    var Command = {
        on:false,
        connect: function(){
            this.socket = io.connect(Settings.host, {port: Settings.command_port});
        },
        blink: function(){
            this.on = !this.on;
            this.socket.emit('blink', {on:this.on});
        },
        forward: function(){
            this.socket.emit('forward');
        },
        left: function(){
            this.socket.emit('left');
        },
        right: function(){
            this.socket.emit('right');
        },
        reverse: function(){
            this.socket.emit('reverse');
        },
        stop: function(){
            this.socket.emit('stop');
        },
        reset: function(){
            this.socket.emit('reset');
        }
    };
    Command.connect();
    
    Command.socket.on('reset', function(data){
        $('iframe').attr('src','');
        $('iframe').attr('src','/video');
        console.log('reset stream');
    });

    $('#forward').on('click', function(){
        Command.forward();
    });
    $('#left').on('click', function(){
        Command.left();
    });
    $('#right').on('click', function(){
        Command.right();
    });
    $('#reverse').on('click', function(){
        Command.reverse();
    });
     $('#stop').on('click', function(){
        Command.stop();
    });
     $('#reset').on('click', function(){
        Command.reset();
    });