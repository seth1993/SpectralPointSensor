var express = require('express')
  , logger = require('morgan')
  , app = express()
  , template = require('jade').compileFile(__dirname + '/source/templates/homepage.jade')
  , serialport = require('serialport')
  , serialPorts = require('./serialport.js')
  , expressWs = require('express-ws')(app);




app.use(logger('dev'))
app.use(express.static(__dirname + '/static'))
app.use(express.static(__dirname + '/fonts'))


app.use(function (req, res, next){
  console.log('middleware');
  req.testing = 'testing';
  return next();
})

//This is to retrieve HomePage
app.get('/', function (req, res, next) {
  console.log('get route', req.testing);
  try {
    var html = template({ title: 'Home' , dat: "Hello"})
    res.send(html)
  } catch (e) {
    next(e)
  }
})

//Sets up web socket to send serial data to client
app.ws('/', function(ws,req){
  ws.on('message', function(msg) {
    //ws.send(msg);
    console.log(msg);
  });
  console.log("socket", req.testing);
});

//This sets up Server Port
app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on http://localhost:' + (process.env.PORT || 3000))
})

//Serial Ports are detected/connected/changed
//var openPorts = serialPorts.connect();



























