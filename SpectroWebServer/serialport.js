"use strict"
let serialport = require('serialport');
//let io = require("./socket.js");//Use io.sendData(json) to send to client
let server = require('./server.js');
var a = server.socket();

//Serial port (Just for reference)
//
//-------------Windows------------------
// FTDI & FRDM Board are usually COMX
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
            var portNew = new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize, parser: serialport.parsers.readline('\n')} ,function (err) {
                if (err) {
                    return console.log('Error: ', err.message);
                }
                portNew.write('TURN ON', function(err) {
                    if (err) {
                        return console.log('Error on write: ', err.message);
                    }
                    console.log('First Packet Sent(TURN ON)');
                });
                portNew.on('data', function (data) {
                    console.log(data);
                    a.emit('client', 's');
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
            parity = "none";
        }
        if(bufferSize === undefined){
            bufferSize = 65536;
        }


        var portsOpen = ["one","two"];


        //Finds available USB connections. Specifically FRDM Board & XBee serial ports
        serialport.list(function (err, ports) {
            ports.forEach(function(port) {

                console.log("Found port info:" + port.comName + "     " + port.pnpId + "     " + port.manufacturer);

                if(port.manufacturer === 'MBED' || port.manufacturer === 'mbed'){//If Freedom Board
                    console.log("Found Freedom Board");

                    var portOne = new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize, parser: serialport.parsers.readline('\n')} ,function (err) {
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
                            console.log(data);
                            a.emit('client', 's');
                        });
                    });
                    portsOpen[1] = port.comName;

                } if(port.manfacturer === 'FTDI' || port.manufacturer === 'ftdi'){//If XBee dongle or shield
                    console.log("Found XBee Unit");

                    var portTwo = new serialport(port.comName, {baudRate: baudRate, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize, parser: serialport.parsers.readline('\n')} ,function (err) {
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
                            console.log(data);
                        });
                    });
                    portsOpen[2] = port.comName;
                }

            });
        });



        return portsOpen;

    }

}








