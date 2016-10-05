"use strict"
let serialport = require('serialport');

//Serial port
//
//---------------MAC--------------------
//FTDI
// /dev/cu.usbserial-DN01ITG0 for Dongle
// /dev/cu.usbserial-fd12 for Xbee sheild
//
//FRDM Board
// /dev/cu.usbmodemFA132
//--------------------------------------

module.exports = {

    //Outside function which goes through ports 
    //and finds FRDM Board/Xbee units then connects
    connect: function (name, baudRate, dataBits, stopBits, parity, bufferSize) {
        
        //Closes connection & reopens with correct properties
        if(name != 'none' && name != undefined){
            name.close();
            console.log("Closed connection: " + name);
            return new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize} ,function (err) {
                if (err) {
                    return console.log('Error: ', err.message);
                }
                portOne.write('TURN ON', function(err) {
                if (err) {
                    return console.log('Error on write: ', err.message);
                }
                console.log('First Packet Sent');
                });
            });
        }

        //Sets Defaults
        if(baudRate === undefined){
            baudRate = 9600;
        } 
        if(dataBits === undefined){
            dataBits = 8;
        }
        if(stopBits === undefined){
            stopBits = 1;
        }
        if(parity === undefined){
            parity = "none"
        }
        if(bufferSize === undefined){
            bufferSize = 65536
        }


        let portsOpen = ["one","two"];


        //Finds available USB connections. Specifically FRDM Board & XBee serial ports
        serialport.list(function (err, ports) {
            ports.forEach(function(port) {

                console.log("Found port info:" + port.comName + "     " + port.pnpId + "     " + port.manufacturer);

                if(port.manufacturer === 'MBED' || port.manufacturer === 'mbed'){//If Freedom Board
                    console.log("Found Freedom Board");

                    let portOne = new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize} ,function (err) {
                        if (err) {
                            return console.log('Error: ', err.message);
                        }
                        portOne.write('TURN ON', function(err) {
                            if (err) {
                                return console.log('Error on write: ', err.message);
                            }
                            console.log('mbed - First Packet Sent');
                        });
                        portOne.on('data', function (data) {
                            console.log('F ' + data);
                        });
                    });
                    portsOpen[1] = port.comName;

                } if(port.manfacturer === 'FTDI' || port.manufacturer === 'ftdi'){//If XBee dongle or shield
                    console.log("Found XBee Unit");

                    let portTwo = new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize} ,function (err) {
                        if (err) {
                            return console.log('Error: ', err.message);
                        }
                        portTwo.write('TURN ON', function(err) {
                            if (err) {
                                return console.log('Error on write: ', err.message);
                            }
                            console.log('XBEE - First Packet Sent');
                        });
                        portTwo.on('data', function (data) {
                            console.log('X ' + data);
                        });
                    });
                    portsOpen[2] = port.comName;
                }

            });
        });


        return portsOpen;

    }

}
