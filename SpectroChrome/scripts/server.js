//Disconnect on exit??

//Check for new devices every 15 sec
setInterval(function(){
    chrome.serial.getDevices(onGetDevices);
}, 15000);

var j = 0;
var onGetDevices = function(ports) {
  for (var i=0; i<ports.length; i++) {
    if(ports[i].vendorId == "3368" && j == 0){
        //FDRM board
        j++;
        connectToDevice(ports[i].path);
    } else if(ports[i].vendorId == "1027"){
        //Xbee 
    }
  }
}
chrome.serial.getDevices(onGetDevices);

function connectToDevice(portName){
    chrome.serial.connect(portName, {bitrate: 9600}, onConnect);
}

function onConnect(connectionInfo){
    console.info("ConnectionInfo: ",connectionInfo);
}

var stringReceived = '';

var onReceiveCallback = function(info) {
    if (info.data) {
      var str = convertArrayBufferToString(info.data);
      if (str.charAt(str.length-1) === '\n') {
        stringReceived += str.substring(0, str.length-1);
        onLineReceived(stringReceived);
        stringReceived = '';
      } else {
        stringReceived += str;
      }
    }
    if(stringReceived){
        console.log(stringReceived);
    }
  };



chrome.serial.onReceive.addListener(onReceiveCallback);
