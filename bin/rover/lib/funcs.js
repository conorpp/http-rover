/*
    Extra functions for convenience.
*/
module.exports =

(function(){

/*
 Turns unix timestamp number into natural time, e.g. '11 minutes ago'
*/
Number.prototype.naturaltime = function(){
  var time = '';
  var diff = new Date().getTime() - this;
  
  var seconds = Math.floor(diff/1000),
      minutes = Math.floor(seconds/60),
      hours = Math.floor(minutes/60),
      days = Math.floor(hours/24),
      seconds = seconds % 60,
      minutes = minutes % 60,
      hours = hours % 24;
  
  if (days) {
    time += days + ' days';
  }
  if (hours) {
    if (time) time += ', ';
    time += hours + ' hours'
  }
  if (!days) {
    if (minutes && hours < 4) {
      if (time) time += ', ';
      time += minutes + ' minutes'
    }
    if (!hours && minutes < 6) {
      if (seconds) {
        if (time) time += ', ';
        time += seconds + ' seconds'
      }
    }
  }
  if (time) {
    return time + ' ago';
  }else return 'just now';
  
};



})();


