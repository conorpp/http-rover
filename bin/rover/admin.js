
/*
    Admin commands for communication
    
    Requirements:
        redis (in server.js)
*/

module.exports = (function(){
    C.log('Admin is listening . . .' ,{color:'green', logLevel:-1});
    sub.on('message', function(channel, data){
        data = JSON.parse(data);
        var asked = true;
        switch (data.func) {
            case 'reset':
                C.log('Resetting stream', {color:'blue'});
                Stream.reset();
            break;
            case 'ping':
                pub.publish('feedback', JSON.stringify({func:'ping'}));
            break;
            case 'execute':
                C.log('about to exec command ', data, {color:'yellow', logLevel:-1});
                terminal.exec(data.command, function(err, stdout, stdin){
                    var error = err || stdin;
                    if (error && error != '') {
                        C.log('Error with exec command : ', error, {color:'red', logLevel:1});
                    }
                    pub.publish('feedback',
                        JSON.stringify({func:'stdout',stdout:stdout, error:error, command:data.command}));
                });
            break;
            default:
                asked = false;
                if (channel=='roverAdmin') {
                    C.log('No cases met on admin channel.', {color:red});
                }
        }
        //Check to see if hack.  This should hopefully never run.
        if (channel != 'roverAdmin' && asked) {
            C.log('Unauthorized attempt for ' + data.func + 'command', {color:'red',font:'bold', logLevel:1});
            return;
        }
    });
})();