"use strict"
var express = require('express')
  , logger = require('morgan')
//  , app = express()
  , template = require('jade').compileFile(__dirname + '/source/templates/homepage.jade')
  , state = require('express-state')
  , exphbs = require('express3-handlebars')

var app = express();
state.extend(app);


app.expose(123, 'foo');

app.use(logger('dev'))
app.use(express.static(__dirname + '/static'))
app.use(express.static(__dirname + '/fonts'))

app.get('/', function (req, res, next) {
  try {
    var html = template({ title: 'Home' , dat: "Hello"})
    res.expose('data','thank you');
    res.send(html)
  } catch (e) {
    next(e)
  }
})

app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on http://localhost:' + (process.env.PORT || 3000))
})

var serialport = require('serialport');
//var serialPorts = require('./serialport.js');
//var portName = serialPorts.connect();

// let portOne;
// let portTwo;


// var portName = serialport.list(function (err, ports) {
//       ports.forEach(function(port) {
//           if(port.manufacturer === 'MBED'){
//               console.log("Found Freedom Board");
//                portOne = new serialport(port.comName, {baudRate: 115200} ,function (err) {
//                   if (err) {
//                     return console.log('Error: ', err.message);
//                   }
//                   portOne.write('main screen turn on', function(err) {
//                     if (err) {
//                       return console.log('Error on write: ', err.message);
//                     }
//                     console.log('FDBD message written');
//                   });
//                   portOne.on('data', function (data) {
//                     console.log('Data: ' + data);
//                   });
//                 });
//               return port.comName;
//           } else if(port.manufacturer === 'FTDI'){
//               console.log("Found Dongle");
//                 portTwo = new serialport(port.comName, {baudRate: 115200} ,function (err) {
//                   if (err) {
//                     return console.log('Error: ', err.message);
//                   }
//                   portTwo.write('main screen turn on', function(err) {
//                     if (err) {
//                       return console.log('Error on write: ', err.message);
//                     }
//                     console.log('FTDI message written');
//                   });
//                   portTwo.on('data', function (data) {
//                     console.log('Data: ' + data);
//                   });
//                 });
//           }
//           console.log(port.comName);
//           console.log(port.pnpId);
//           console.log(port.manufacturer);
//       });
// });













var item = 0;

//FTDI
// /dev/cu.usbserial-DN01ITG0 for Dongle
// /dev/cu.usbserial-fd12 for Xbee sheild






//console.log("Port: "+ portName);

 //var port = new serialport('/dev/cu.usbmodemFA132', {baudRate: 115200});//,function (err) {
//   if (err) {
//     return console.log('Error: ', err.message);
//   }
//   port.write('main screen turn on', function(err) {
//     if (err) {
//       return console.log('Error on write: ', err.message);
//     }
//     console.log('message written');
//   });
// });


// port.on('open', function() {
//   port.write('main screen turn on', function(err) {
//     if (err) {
//       return console.log('Error on write: ', err.message);
//     }
//     console.log('message written');
//   });
// });

// open errors will be emitted as an error event
// port.on('error', function(err) {
//   console.log('Error: ', err.message);
// })

// port.write("Message");

// port.on('data', function (data) {
//   console.log('Data: ' + data);
// });

// port.write("Yes");




var portOne = new serialport('/dev/cu.usbmodemFA132', {baudRate: 230400} ,function (err) {
    if (err) {
      return console.log('Error: ', err.message);
    }
    portOne.write('main screen turn on', function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
      console.log('FDBD message written');
    });
});

portOne.on('data', function (data) {
  console.log('Data: ' + data);
});


var portTwo = new serialport('/dev/cu.usbserial-fd12', {baudRate: 230400} ,function (err) {
  if (err) {
    return console.log('Error: ', err.message);
  }
  portTwo.write('main screen turn on', function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    console.log('FTDI message written');
  });
});

portTwo.on('data', function (data) {
  console.log('Data: ' + data);
});




















