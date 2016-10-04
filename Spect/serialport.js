var serialport = require('serialport');
var port;

module.exports = {

    //Outside function which goes through ports 
    //and finds FRDM Board/Xbee units then connects
    connect: function () {
        serialport.list(function (err, ports) {
            ports.forEach(function(port) {
                if(port.manufacturer === 'MBED'){
                    console.log("Found Freedom Board");
                    //connectToType(port.comName);
                    return port.comName;
                } else if(port.manfacturer === 'XBEE'){
                    //connectToType(port.comName);
                }
                console.log(port.comName);
                console.log(port.pnpId);
                console.log(port.manufacturer);
            });
        });
    }

}

// function connectToType(portName){
//     port = new SerialPort(portName, { autoOpen: false });

//     port.open(function (err) {
//     if (err) {
//         return console.log('Error opening port: ', err.message);
//     }

//     // write errors will be emitted on the port since there is no callback to write
//     port.write('main screen turn on');
//     });

//     // the open event will always be emitted
//     port.on('open', function() {
//     // open logic
//     });
// }

// port.on('data', function(data) {
//     console.log(data);
// });