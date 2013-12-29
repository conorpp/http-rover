
//Detects if flash is installed.
//relocates to canvas player if not.

var hasFlash = false;
try {
  var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
  if(fo) hasFlash = true;
}catch(e){
  if(navigator.mimeTypes ["application/x-shockwave-flash"] != undefined) hasFlash = true;
}

if (!hasFlash) {
    console.log('Flash is not installed');
    window.location = '/canvas'
}else{
    console.log('Flash is installed');
}