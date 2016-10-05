var express = require('express');
var app = require('express')();
var logger = require('morgan');
var template = require('jade').compileFile(__dirname + '/source/templates/homepage.jade');
var serialport = require('serialport');
var serialPorts = require('./serialport.js');
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(logger('dev'));
app.use(express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/fonts'));

//This is to retrieve HomePage
app.get('/', function (req, res, next) {
  try {
    var html = template({ title: 'Home' , dat: "Hello"})
    res.send(html)
  } catch (e) {
    next(e)
  }
})

io.on('connection', function (socket){
  socket.emit('news', { server: 'world'});
  socket.on('my other event', function(data){
    console.log(data);
  });
});


//This sets up Server Port
server.listen(process.env.PORT || 80, function () {
  console.log('Listening on http://localhost:' + (process.env.PORT || 80))
})

//Serial Ports are detected/connected/changed
//var openPorts = serialPorts.connect();































