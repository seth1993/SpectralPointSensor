var serialport = require('bundle.js');
//var serialport = require("browser-serialport").SerialPort;


serialport.list(function (err, ports) {
    ports.forEach(function(port) {
        console.log("Found port info:" + port.comName + "     " + port.pnpId + "     " + port.manufacturer);
    });
});