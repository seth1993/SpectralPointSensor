var express = require('express');
var app = require('express')();
var logger = require('morgan');
var template = require('jade').compileFile(__dirname + '/source/templates/homepage.jade');
var serialport = require('serialport');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var portsOpen = ["one","two"];
var xbee_api = require('xbee-api');

//Folders for front end use
app.use(logger('dev'));
app.use(express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/fonts'));

//Home Page
app.get('/', function (req, res, next) {
  try {
    var html = template({ title: 'Home'})
    res.send(html)
  } catch (e) {
    next(e)
  }
});

//Parse/Send Xbee packets
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2});

//Serial Ports --This needs to be on dynamic request
var openPorts = connect();

//App Server Port
server.listen(3000, function () {
  console.log('Listening on http://localhost:' + (3000))
});


//IO Socket Connection to Client
io.on('connection', function (socket){
    socket.on('server', function(data){//Recieving data from user
        console.log(data);
        interpretData(data);
    });
});

//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    console.log(data);
    decipherData(data);
});

/*
        Data recieving: 
            Client: interpretData(data)
            RF: decipherData(data)
        Data sending:
            Client: io.sockets.emit('client', data)
            RF: in progress
*/


function interpretData(data){
    if(data === 'finddevices'){
        console.log("We're working to find devices");
        console.log(JSON.stringify(portsOpen));
        //Need to have code here to actually find how many devices
        var numberOfDevices = 2;//For testing
        var deviceList = [];
        for(var i = 0; i < numberOfDevices; i++){
            if(i == 0){
                var o = new Object();
                o.name = 'alpha';
                o.state = 'OFF';
                deviceList.push(o);
            } else if(i == 1){
                var o = new Object();
                o.name = 'bravo';
                o.state = 'OFF';
                deviceList.push(o);
            }
        }
        io.sockets.emit('client', {devices: deviceList/*['ALPHA', 'BRAVO']*/});
    } else if(data === 'update'){
        var a = 'alpha@data@1@1,2,3,4,5';
        var b = 'bravo@data@2@6,7,8,9,10';
        //var c = 'alpha@data@3@11,12,13,14,15';
        decipherData(b);
        decipherData(a);
        //decipherData(b);
    } else if (data.state){
        var statechange;
        if(data.state === 'ON'){
            statechange = {state: 'ON', name: data.name}
        } else if(data.state === 'OFF'){
            statechange = {state: 'OFF', name: data.name}
        } else if(data.state === 'RUN'){
            statechange = {state: 'RUN', name: data.name}
        } else if(data.state === 'ERROR'){
            statechange = {state: 'ERROR', name: data.name}
        } if(statechange){
            io.sockets.emit('client', statechange);
        }
    }
}


function decipherData(data) {
  var incomingData;
  var arrayData = data.split('@', 4);//Splits at @ symbol, limit 4 splits
  if(arrayData[1] === 'data'){
      incomingData = {
          unit: arrayData[0],
          command: arrayData[1],
          message: arrayData[2],
          data: [1,2,3,4,5]//arrayData[3]
      }
  } else if(arrayData.length === 3){
      incomingData = {
          unit: arrayData[0],
          command: arrayData[1],
          message: arrayData[2]
      }
  } if(incomingData){
      io.sockets.emit('client', incomingData);
  }
}



function connect (name, baudRate, dataBits, stopBits, parity, bufferSize) {
      
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
                  decipherData(data);
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
                          decipherData(data);
                      });
                  });
                  portsOpen[1] = port.comName;

              } if(port.manufacturer === 'FTDI' || port.manufacturer === 'ftdi'){//If XBee dongle or shield
                  console.log("Found XBee Unit");

                  var portTwo = new serialport(port.comName, {baudRate: 230400, dataBits: dataBits, stopBits: stopBits, parity: parity, bufferSize: bufferSize, /*parser: serialport.parsers.readline('\n')*/parser: xbeeAPI.rawParser()} ,function (err) {
                      if (err) {
                          return console.log('Error: ', err.message);
                      }
                      portTwo.write('TURN ON', function(err) {
                          if (err) {
                              return console.log('Error on write: ', err.message);
                          }
                          console.log('XBEE - First Packet Sent');
                      });
                  });
                  portsOpen[2] = port.comName;
              }

          });
      });

      return portsOpen;

  }

  
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
    data: "Hey Jake! What's up!" // Can either be string or byte array. 
};
var message = xbeeAPI.buildFrame(frame_obj);



// var startingpoint = 72;
// setInterval(function(){
//     startingpoint++;
//     if(startingpoint > 80){
//         startingpoint = startingpoint - 15;
//     }
//     var data = new Object();
//     data.unit = 'ALPHA';
//     data.command = 'temp';
//     data.message = startingpoint;
//     io.sockets.emit('client',data);
// },5000);

// setInterval(function(){
//     var arrayOfRandom = [];
//     var data = new Object();
//     data.unit = 'ALPHA';
//     data.command = 'data';
//     for(var i = 0; i < 2048; i++){
//         arrayOfRandom.push(Math.random() + 4);
//     }
//     data.message = arrayOfRandom;
//     io.sockets.emit('client', data);
// },1000);



// function sendData(json) {
//   io.sockets.emit('client', json);
//   io.on('connection', function (socket){
//     //socket.emit('client', json);//Send data to user
//     socket.on('server', function(data){//Recieving data from user
//       console.log(data);
//     });
//   });
// }

































