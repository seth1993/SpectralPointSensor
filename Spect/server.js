"use strict"
let express = require('express')
  , logger = require('morgan')
  , app = express()
  , template = require('jade').compileFile(__dirname + '/source/templates/homepage.jade')
  , serialport = require('serialport')
  , serialPorts = require('./serialport.js');

app.use(logger('dev'))
app.use(express.static(__dirname + '/static'))
app.use(express.static(__dirname + '/fonts'))

//This is to retrieve HomePage
app.get('/', function (req, res, next) {
  try {
    var html = template({ title: 'Home' , dat: "Hello"})
    res.send(html)
  } catch (e) {
    next(e)
  }
})

//This sets up Server Port
app.listen(process.env.PORT || 3000, function () {
  console.log('Listening on http://localhost:' + (process.env.PORT || 3000))
})

//Serial Ports are detected/connected/changed
var openPorts = serialPorts.connect();


//console.log(openPorts);

























