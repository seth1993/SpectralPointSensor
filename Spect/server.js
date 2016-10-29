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
        sendDataToRF(data);
    });
});

//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    console.log(data);
    sendDataToClient(data);
});

var testData = [
    {
        name: 'alpha',
        temp: '71.2',
        state: 'OFF'
    },
    {
        name: 'bravo',
        temp: '71.3',
        state: 'ON'
    }
]

var savedstates = new Object();

function sendDataToRF(data){
    console.info("From Client: " + JSON.stringify(data));
    if(data === 'finddevices'){
        if(portsOpen[0] != 'one' || portsOpen[1] != 'two'){
            sendPacket('TURN ON');
        }
        //Testing
        io.sockets.emit('client', {devices: testData});
    } if (data.state){
        sendPacket(data.name + '@statechange@'+ data.state);

        //Testing
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
    } if(data.temp){
        sendPacket(data.name + '@changetemp@' + data.temp);
    } if(data.integTime){
        sendPacket(data.name + '@changeinteg@' + data.integTime);
    }
}


function sendDataToClient(datastring) {  
  var incomingData;
  var data = datastring.split('@');//Splits at @ symbol

  //If device isnt listed, save it
  if(!savedstates[data[0]]){
      //Defaults
      savedstates[data[0]] = {
          temp: 72,
          state: 'OFF',
          integTime: 1
      }
  }

  if(data[1] === 'temp'){
      savedstates[data[0]].temp = data[2];
      io.sockets.emit('client', {name: data[0],temp: data[2]})
  } else if(data[1] === 'state'){
      savedstates[data[0]].state = data[2];
      io.sockets.emit('client', {name: data[0],state: data[2]})
  } else if(data[1] === 'data'){
      data[3] = data[3].replace(/[^0-9.,]/g, "");//Error handling
      //Beggining of new set - send old one
      if(data[2] === '1'){
          if(savedstates[data[0]].data){
            var listofdata = savedstates[data[0]].data.split(",");
            io.sockets.emit('client', {name: data[0], data: listofdata});
          }
          savedstates[data[0]].data = data[3];
      } else {
          savedstates[data[0]].data += "," + data[3];
      }
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
                  sendDataToClient(data);
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
                          sendDataToClient(data);
                      });
                  });
                  portsOpen[0] = port.comName;

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
                  portsOpen[1] = port.comName;
              }

          });
      });

      return portsOpen;

  }

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
    var message = xbeeAPI.buildFrame(frame_obj);
}



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

var n = 0;
setInterval(function(){
    if(n == 0){
        sendDataToClient('bravo@data@1@'+ createFakeData(0,100));
    } else if(n == 1){
        sendDataToClient('bravo@data@2@'+ createFakeData(100,200));
    } else if(n == 2){
        sendDataToClient('bravo@data@1@'+ createFakeData(200,300));
        n = 0;
    }// else if(n == 3){
    //     sendDataToClient('alpha@data@1@'+ createFakeData(800,1000));
    // } else if(n == 4){
    //     n = 0;
    // }

    n++;
}, 2000);


function createFakeData(one, two){
    var d = " " ;
    for(var i = one; i < two; i++) {
        if(i == 0){
            d = "18000";
        } else if(i < 320){
            d += "," + (Math.random()*150 + 18000 + i);
        } else {
             d += "," + (Math.random()*250 + 18220 - i);
        }
    }
    return d;
}




























