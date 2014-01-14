
/*
    Reimplementation of console.log
    
    -added color and font features
    -allowed infinite args to be printed
    -added log levels
    
    Requirements:
        none
    
    usage example:
        var options = {
            color:'red',
            font:'bold',
            newline:true
        };
        C.log('This is my first print', 'second arg', 45, options);
        C.log('   second log', options);
        >> This is my first printsecondarg      //red and bold print.
        >>     second log

        //options not required but must be last arg to work.
        
    documentation:
        .log - the logging function.  Specify any number of args to dump
                and optional options for the print at end.
        .log options:
            newline
                set to false to disable the newline after each log.
                default true.
            color
                'red', 'blue', 'purple', 'cyan', 'white', 'black', 'green', 'random'
            background
                *same as color
            colorIntense
                bool to increase brightness increase on text color.
                default false.
            backgroundIntense
                bool to increase brightness increase on bg color.
                default false.
            font
                'bold', 'faint', 'underline', 'blink', 'blinkFast',
                'italic', 'inverse', 'cross', 'conceal', 'normal', 'random'
            logLevel
                number that will make log excluded if it's below
                logLevel attribute. Default 0.
        .err - same as .log but takes no options and uses {color:'red', logLevel:errLevel},
                where errLevel is 1 by default
        .warn - same as .err but yellow.
    setup:
        C.set({
            logLevel: 1  //Excludes all logs with logLevel less than 1. Default 0.
            errLevel: 1  //the default level .err sets logs to.
        });
                
*/

module.exports = (function(){

var C = {
    
    options:{},
    
    logLevel:0,
    
    errLevel:1,
    
    /* Settings for logger
        @param logLevel
    */
    set: function(params){
        params = params || {};
        if (params.logLevel) {
            this.logLevel = parseInt(params.logLevel);
        }
        if (params.errLevel) {
            this.errLevel = parseInt(params.errLevel);
        }
    },
    
    level: function(){
        var logLevel = this.options.logLevel != undefined ?
                                this.options.logLevel : 0;
        return (logLevel < this.logLevel);
    },
    
    err: function(){
        var args = Array.prototype.slice.call(arguments);
        args.push({color:'red', font:'bold', logLevel:this.errLevel});
        this.log.apply(this, args);  
    },

    warn: function(){
        var args = Array.prototype.slice.call(arguments);
        args.push({color:'yellow', font:'bold', logLevel:this.errLevel});
        this.log.apply(this, args);  
    },
    //all of the choices for options.  For option detection. (except logLevel)
    choices:['intense','color', 'background', 'bg', 'font', 'newline', 'logLevel'],
    
    log: function(){
        var length = arguments.length;
        //look for options
        if (typeof arguments[arguments.length-1] == "object" ){
            
            this.options = arguments[arguments.length-1];
            if (this.level()) return;
            
            var isOptions = false;
            
            for (key in this.choices) {
                if (this.options[this.choices[key]] != undefined) {
                    isOptions = true;
                    break;
                }
            }
            if (isOptions)
                length--;
            else
                this.options = {};
            
        }else{
            this.options = {};
            if (this.level()) return;
        }
                
        var args = '';
        for (var i = 0; i < length; i++){
            if (typeof arguments[i] == 'object') {
                args += JSON.stringify(arguments[i],undefined, 2);
            }else{
                args += arguments[i];
            }
        }
        args = this.format(args);

        /*if (args.indexOf('\\t') != -1) {
            var temp = args.split('\\t');
            var args = '';
            for (var a in temp) {
                args += temp[a];
            }
            args = '\r' + args;
        }else */ if (args.indexOf('\\n') != -1) {
            var temp = args.split('\\n');
            var args = '';
            for (var a in temp) {
                args += temp[a];
            }
        }else args += '\n';
        
        process.stdout.write(args,'utf-8');
    },
    
    format: function(raw){
        raw = (''+raw);     //convert to string
        var code = '';
        colorBase = 30;
        bgBase = 40;

        if (this.options.intense) {
            bgBase += 60,
            colorBase += 60;
        }
        if (this.options.color) {
            code += '\033[10;'+ (colorBase+this.color(this.options.color)) + 'm';
        }
        if (this.options.background) {
            code += '\033[10;'+ (bgBase+this.color(this.options.background)) + 'm';
        }else if (this.options.bg) {
            code += '\033[10;'+ (bgBase+this.color(this.options.bg)) + 'm'; 
        }
        if (this.options.font) {
            code += '\033[10;' +this.font(this.options.font)+ 'm';
        }
        code += raw + '\033[0m';
        if (C.options.noline == false) args += '\\n';
        return code;   //end with reset code.
    },
    
    //return color code
    color: function(color){
        color = (''+color).toLowerCase();
        switch (color) {
            case 'black':
                return 0;
            break;
            case 'red':
                return 1;
            break;
            case 'green':
                return 2;
            break;
            case 'yellow':
                return 3;
            break;
            case 'blue':
                return 4;
            break;
            case 'magenta':
                return 5;
            break;
            case 'purple':
                return 5;
            break;
            case 'cyan':
                return 6;
            break;
            case 'teal':
                return 6;
            break;
            case 'white':
                return 7;
            break;
            case 'random':
                var current = Math.floor(Math.random() * 7.9);
                if (this.last == current) {
                    if (current!=0)current = Math.floor(Math.random() * this.last);
                    else current = 8 - Math.floor(Math.random() * 6.9) -1;
                }
                this.last = current;
                return current;
            break;
        }
        return parseInt(color);
    },
    
    font: function(font){
        font = (font+'').toLowerCase();
        switch(font){
            case 'bold':
                return 1;
            break;
            case 'faint':
                return 2;
            break;
            case 'italic':
                return 3;
            break;
            case 'underline':
                return 4;
            break;
            case 'blink':
                return 5;
            break;
            case 'blinkfast':
                return 6;
            break;
            case 'inverse':
                return 7;
            break;
            case 'conceal':
                return 8;
            break;
            case 'cross':
                return 9;
            break;
            case 'normal':
                return 10;
            break;
            case 'random':
                var rand = Math.floor(Math.random() * 9.9) + 1;
                if (rand == 10) 
                    rand = Math.floor(Math.random() * 8.9) + 1;
                
                if (rand == 8) 
                    rand = Math.floor(Math.random() * 6.9) + 1;
                return rand;
            break;
        }
        return parseInt(font);
    }
};

var colors = ['red', 'purple', 'yellow',
              'blue', 'black',
              'white', 'green', 'teal',
              'random'];
var l = colors.length;

while (l--) {
    (function(){
        var val = colors[l];
        String.prototype[val] = function(){
            C.options = {color:val}; return C.format(this);
        };
        String.prototype['bg'+val] = function(){
            C.options = {bg:val}; return C.format(this);
        };
    })();
}

var fonts = ['bold', 'faint', 'italic',
            'underline', 'blink', 'blinkfast',
            'inverse', 'conceal', 'cross',
            'normal', 'random'];
l = fonts.length;
while (l--) {
    (function(){
        var val = fonts[l];
        if (val=='random') {
            val = 'font'+'Random';
        }
        String.prototype[val] = function(){
            C.options = {font:val}; return C.format(this);
        };
    })();
}


String.prototype.intense = function(){
    C.options = {intense:true}; return C.format(this);
};

String.prototype.noline = function(){
    return this + '\\n'
};
/*
String.prototype.replace = function(){
    return this + '\\t'
};*/

return C;
})();



