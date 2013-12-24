
/*
    Reimplementation of console.log
    
    -added color and font features
    -allowed infinite args to be printed
    TODO: add log levels.
    
    usage example:
        var options = {
            color:'red',
            font:'bold',
            newline:false
        };
        C.log('This is my first print', 'second arg', 45, options);
        //options not required but must be last arg to work.
        
    documentation:
        options
            newline
                set to false to disable the newline after each log.
                default true.
            color
                'red', 'blue', 'purple', 'cyan', 'white', 'black', 'green'
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
                'italic', 'inverse', 'cross', 'conceal', 'normal'
            logLevel
                number that will make log excluded if it's below
                logLevel attribute. Default 0.
    setup:
        C.set({
            logLevel: 1  //Excludes all logs with logLevel less than 1. Default 0.
        });
                
*/
var C = {
    
    options:{},
    
    logLevel:0,
    
    /* Settings for logger
        @param logLevel
    */
    set: function(params){
        params = params || {};
        if (params.logLevel) {
            this.logLevel = parseInt(params.logLevel);
        }
    },
    
    log: function(){
        //look for options
        if (typeof arguments[arguments.length-1] == "object" ){
            this.options = arguments[arguments.length-1];
            var length = arguments.length-1;
        }else{
            this.options = {};
            var length = arguments.length;
        }
        
        this.options.logLevel = this.options.logLevel != undefined ?
                                this.options.logLevel : 0;
                                
        if (this.options.logLevel < this.logLevel) return;
        
        var args = '';
        for (var i = 0; i < length; i++){
            var arg = arguments[i];
            if (typeof arg == 'object') {
                arg = JSON.stringify(arg,undefined, 2);
            }
            var text = this.format(arg);
            args += text;
        }
        if (this.options.newline || this.options.newline == undefined) args += '\n';
        process.stdout.write(args,'utf-8');
    },
    
    format: function(raw){
        raw = (''+raw);     //convert to string
        var code = '';
        colorBase = 30;
        bgBase = 40;
        if (this.options.colorIntense) {
            colorBase += 60;
        }
        if (this.options.backgroundIntense) {
            bgBase += 60;
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

        //console.log()
        return code + raw + '\033[0m';   //end with reset code.
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
        }
        return '';
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
        }
        return 10;
    }
};

module.exports = C;