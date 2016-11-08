console.log("Here");
import SerialPort from 'browser-serialport';
import xbee_api from 'xbee-api';
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2 });

//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    console.log("R: " + data);
    sendDataToClient(data);
});

//Send Data over RF link
function sendPacket(dataToSend){
    var frame_obj = {
        type: 0x11, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST 
        id: 0x01, // optional, nextFrameId() is called per default 
        destination64: "000000000000ffff", // default is broadcast address 
        destination16: "fffe", // default is "fffe" (unknown/broadcast) 
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        clusterId: "1554",
        profileId: "C105",
        broadcastRadius: 0x00, // optional, 0x00 is default 
        options: 0x00, // optional, 0x00 is default 
        data: dataToSend // Can either be string or byte array. 
    };
    console.log("S: " + dataToSend);
    var message = xbeeAPI.buildFrame(frame_obj);
}

