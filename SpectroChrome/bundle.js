(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,Buffer){
'use strict';

var EE = require('events').EventEmitter;
var util = require('util');

var DATABITS = [7, 8];
var STOPBITS = [1, 2];
var PARITY = ['none', 'even', 'mark', 'odd', 'space'];
var FLOWCONTROLS = ['RTSCTS'];

var _options = {
  baudrate: 9600,
  parity: 'none',
  rtscts: false,
  databits: 8,
  stopbits: 1,
  buffersize: 256
};

function convertOptions(options){
  switch (options.dataBits) {
    case 7:
      options.dataBits = 'seven';
      break;
    case 8:
      options.dataBits = 'eight';
      break;
  }

  switch (options.stopBits) {
    case 1:
      options.stopBits = 'one';
      break;
    case 2:
      options.stopBits = 'two';
      break;
  }

  switch (options.parity) {
    case 'none':
      options.parity = 'no';
      break;
  }

  return options;
}

function SerialPort(path, options, openImmediately, callback) {

  EE.call(this);

  var self = this;

  var args = Array.prototype.slice.call(arguments);
  callback = args.pop();
  if (typeof(callback) !== 'function') {
    callback = null;
  }

  options = (typeof options !== 'function') && options || {};

  openImmediately = (openImmediately === undefined || openImmediately === null) ? true : openImmediately;

  callback = callback || function (err) {
    if (err) {
      self.emit('error', err);
    }
  };

  var err;

  options.baudRate = options.baudRate || options.baudrate || _options.baudrate;

  options.dataBits = options.dataBits || options.databits || _options.databits;
  if (DATABITS.indexOf(options.dataBits) === -1) {
    err = new Error('Invalid "databits": ' + options.dataBits);
    callback(err);
    return;
  }

  options.stopBits = options.stopBits || options.stopbits || _options.stopbits;
  if (STOPBITS.indexOf(options.stopBits) === -1) {
    err = new Error('Invalid "stopbits": ' + options.stopbits);
    callback(err);
    return;
  }

  options.parity = options.parity || _options.parity;
  if (PARITY.indexOf(options.parity) === -1) {
    err = new Error('Invalid "parity": ' + options.parity);
    callback(err);
    return;
  }

  if (!path) {
    err = new Error('Invalid port specified: ' + path);
    callback(err);
    return;
  }

  options.rtscts = _options.rtscts;

  if (options.flowControl || options.flowcontrol) {
    var fc = options.flowControl || options.flowcontrol;

    if (typeof fc === 'boolean') {
      options.rtscts = true;
    } else {
      var clean = fc.every(function (flowControl) {
        var fcup = flowControl.toUpperCase();
        var idx = FLOWCONTROLS.indexOf(fcup);
        if (idx < 0) {
          var err = new Error('Invalid "flowControl": ' + fcup + '. Valid options: ' + FLOWCONTROLS.join(', '));
          callback(err);
          return false;
        } else {

          // "XON", "XOFF", "XANY", "DTRDTS", "RTSCTS"
          switch (idx) {
            case 0: options.rtscts = true; break;
          }
          return true;
        }
      });
      if(!clean){
        return;
      }
    }
  }

  options.bufferSize = options.bufferSize || options.buffersize || _options.buffersize;

  // defaults to chrome.serial if no options.serial passed
  // inlined instead of on _options to allow mocking global chrome.serial for optional options test
  options.serial = options.serial || (typeof chrome !== 'undefined' && chrome.serial);

  if (!options.serial) {
    throw new Error('No access to serial ports. Try loading as a Chrome Application.');
  }

  this.options = convertOptions(options);

  this.options.serial.onReceiveError.addListener(function(info){

    switch (info.error) {

      case 'disconnected':
      case 'device_lost':
      case 'system_error':
        err = new Error('Disconnected');
        // send notification of disconnect
        if (self.options.disconnectedCallback) {
          self.options.disconnectedCallback(err);
        } else {
          self.emit('disconnect', err);
        }
        if(self.connectionId >= 0){
          self.close();
        }
        break;
      case 'timeout':
        break;
    }

  });

  this.path = path;

  if (openImmediately) {
    process.nextTick(function () {
      self.open(callback);
    });
  }
}

util.inherits(SerialPort, EE);

SerialPort.prototype.connectionId = -1;

SerialPort.prototype.open = function (callback) {
  var options = {
    bitrate: parseInt(this.options.baudRate, 10),
    dataBits: this.options.dataBits,
    parityBit: this.options.parity,
    stopBits: this.options.stopBits,
    ctsFlowControl: this.options.rtscts
  };

  this.options.serial.connect(this.path, options, this.proxy('onOpen', callback));
};

SerialPort.prototype.onOpen = function (callback, openInfo) {
  if(chrome.runtime.lastError){
    if(typeof callback === 'function'){
      callback(chrome.runtime.lastError);
    }else{
      this.emit('error', chrome.runtime.lastError);
    }
    return;
  }

  this.connectionId = openInfo.connectionId;

  if (this.connectionId === -1) {
    this.emit('error', new Error('Could not open port.'));
    return;
  }

  this.emit('open', openInfo);

  this._reader = this.proxy('onRead');

  this.options.serial.onReceive.addListener(this._reader);

  if(typeof callback === 'function'){
    callback(chrome.runtime.lastError, openInfo);
  }
};

SerialPort.prototype.onRead = function (readInfo) {
  if (readInfo && this.connectionId === readInfo.connectionId) {

    if (this.options.dataCallback) {
      this.options.dataCallback(toBuffer(readInfo.data));
    } else {
      this.emit('data', toBuffer(readInfo.data));
    }

  }
};

SerialPort.prototype.write = function (buffer, callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  if (typeof buffer === 'string') {
    buffer = str2ab(buffer);
  }

  //Make sure its not a browserify faux Buffer.
  if (buffer instanceof ArrayBuffer === false) {
    buffer = buffer2ArrayBuffer(buffer);
  }

  this.options.serial.send(this.connectionId, buffer, function(info) {
    if (typeof callback === 'function') {
      callback(chrome.runtime.lastError, info);
    }
  });
};


SerialPort.prototype.close = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  this.options.serial.disconnect(this.connectionId, this.proxy('onClose', callback));
};

SerialPort.prototype.onClose = function (callback, result) {
  this.connectionId = -1;
  this.emit('close');

  this.removeAllListeners();
  if(this._reader){
    this.options.serial.onReceive.removeListener(this._reader);
    this._reader = null;
  }

  if (typeof callback === 'function') {
    callback(chrome.runtime.lastError, result);
  }
};

SerialPort.prototype.flush = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  var self = this;

  this.options.serial.flush(this.connectionId, function(result) {
    if (chrome.runtime.lastError) {
      if (typeof callback === 'function') {
        callback(chrome.runtime.lastError, result);
      } else {
        self.emit('error', chrome.runtime.lastError);
      }
      return;
    } else {
      callback(null, result);
    }
  });
};

SerialPort.prototype.drain = function (callback) {
  if (this.connectionId < 0) {
    var err = new Error('Serialport not open.');
    if(typeof callback === 'function'){
      callback(err);
    }else{
      this.emit('error', err);
    }
    return;
  }

  if (typeof callback === 'function') {
    callback();
  }
};


SerialPort.prototype.proxy = function () {
  var self = this;
  var proxyArgs = [];

  //arguments isnt actually an array.
  for (var i = 0; i < arguments.length; i++) {
      proxyArgs[i] = arguments[i];
  }

  var functionName = proxyArgs.splice(0, 1)[0];

  var func = function() {
    var funcArgs = [];
    for (var i = 0; i < arguments.length; i++) {
        funcArgs[i] = arguments[i];
    }
    var allArgs = proxyArgs.concat(funcArgs);

    self[functionName].apply(self, allArgs);
  };

  return func;
};

SerialPort.prototype.set = function (options, callback) {
  this.options.serial.setControlSignals(this.connectionId, options, function(result){
    callback(chrome.runtime.lastError, result);
  });
};

function SerialPortList(callback) {
  if (typeof chrome != 'undefined' && chrome.serial) {
    chrome.serial.getDevices(function(ports) {
      var portObjects = new Array(ports.length);
      for (var i = 0; i < ports.length; i++) {
        portObjects[i] = {
          comName: ports[i].path,
          manufacturer: ports[i].displayName,
          serialNumber: '',
          pnpId: '',
          locationId:'',
          vendorId: '0x' + (ports[i].vendorId||0).toString(16),
          productId: '0x' + (ports[i].productId||0).toString(16)
        };
      }
      callback(chrome.runtime.lastError, portObjects);
    });
  } else {
    callback(new Error('No access to serial ports. Try loading as a Chrome Application.'), null);
  }
}

// Convert string to ArrayBuffer
function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Convert buffer to ArrayBuffer
function buffer2ArrayBuffer(buffer) {
  var buf = new ArrayBuffer(buffer.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < buffer.length; i++) {
    bufView[i] = buffer[i];
  }
  return buf;
}

function toBuffer(ab) {
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      buffer[i] = view[i];
  }
  return buffer;
}

module.exports = {
  SerialPort: SerialPort,
  list: SerialPortList,
  buffer2ArrayBuffer: buffer2ArrayBuffer,
  used: [] //TODO: Populate this somewhere.
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":15,"buffer":10,"events":14,"util":18}],2:[function(require,module,exports){
/*
 * xbee-api
 * https://github.com/jouz/xbee-api
 *
 * Copyright (c) 2013 Jan Kolkmeier
 * Licensed under the MIT license.
 */

'use strict';

exports = module.exports;

exports.START_BYTE = 0x7E;
exports.ESCAPE = 0x7D;
exports.XOFF = 0x13;
exports.XON = 0x11;
exports.ESCAPE_WITH = 0x20;

exports.UNKNOWN_16     = [ 0xff, 0xfe ];
exports.UNKNOWN_64     = [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff ];
exports.BROADCAST_16_XB= [ 0xff, 0xff ];
exports.COORDINATOR_16 = [ 0x00, 0x00 ];
exports.COORDINATOR_64 = [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ];

exports.ESCAPE_BYTES = [ 
  exports.START_BYTE,
  exports.ESCAPE,
  exports.XOFF,
  exports.XON
];

var ft = exports.FRAME_TYPE = {};
var diss = exports.DISCOVERY_STATUS = {};
var dels = exports.DELIVERY_STATUS = {};
var coms = exports.COMMAND_STATUS = {};
var ms = exports.MODEM_STATUS = {};
var ro = exports.RECEIVE_OPTIONS = {};
var dt = exports.DEVICE_TYPE = {};

var dc = exports.DIGITAL_CHANNELS = { MASK: {}, PIN:{} };
var ac = exports.ANALOG_CHANNELS = { MASK: {}, PIN:{} };
var pr = exports.PULLUP_RESISTOR = { MASK: {}, PIN:{} };
var ic = exports.CHANGE_DETECTION = { MASK: {}, PIN:{} };
var pm = exports.PIN_MODE = {};
var pc = exports.PIN_COMMAND = { PIN:{} };

exports.FRAME_TYPE_SETS = {
  "802.15.4": [0x00,0x01,0x08,0x09,0x17,0x80,0x81,0x82,0x83,0x88,0x89,0x8A,0x97],
  "ZNet": [0x08,0x09,0x10,0x11,0x17,0x88,0x8A,0x8B,0x90,0x91,0x92,0x94,0x95,0x97],
  "ZigBee": [0x08,0x09,0x10,0x11,0x17,0x21,0x24,0x88,0x8A,0x8B,0x90,0x91,0x92,0x94,0x95,0x97,0xA0,0xA1,0xA2,0xA3,0xA4,0xA5],
  "Any": [0x00,0x01,0x08,0x09,0x17,0x80,0x81,0x82,0x83,0x88,0x89,0x8a,0x97,0x10,0x11,0x8b,0x90,0x91,0x92,0x94,0x95,0x21,0x24,0xa0,0xa1,0xa2,0xa3,0xa4,0xa5]
};

// Device Type
dt.COORDINATOR = 0x00;
dt[0x00] = "Coordinator (0x00)";
dt.ROUTER = 0x01;
dt[0x01] = "Router (0x01)";
dt.END_DEVICE = 0x02;
dt[0x02] = "End Device (0x02)";

// Frame Type
ft.AT_COMMAND = 0x08;
ft[0x08] = "AT Command (0x08)";
ft.AT_COMMAND_QUEUE_PARAMETER_VALUE = 0x09;
ft[0x09] = "AT Command - Queue Parameter Value (0x09)";
ft.ZIGBEE_TRANSMIT_REQUEST = 0x10;
ft[0x10] = "ZigBee Transmit Request (0x10)";
ft.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME = 0x11;
ft[0x11] = "Explicit Addressing ZigBee Command Frame (0x11)";
ft.REMOTE_AT_COMMAND_REQUEST = 0x17;
ft[0x17] = "Remote Command Request (0x17)";
ft.CREATE_SOURCE_ROUTE = 0x21;
ft[0x21] = "Create Source Route (0x21)";
ft.REGISTER_JOINING_DEVICE = 0x24;
ft[0x24] = "Register Joining Device (0x24)";
ft.AT_COMMAND_RESPONSE = 0x88;
ft[0x88] = "AT Command Response (0x88)";
ft.MODEM_STATUS = 0x8A;
ft[0x8A] = "Modem Status (0x8A)";
ft.ZIGBEE_TRANSMIT_STATUS = 0x8B;
ft[0x8B] = "ZigBee Transmit Status (0x8B)";
ft.ZIGBEE_RECEIVE_PACKET = 0x90;
ft[0x90] = "ZigBee Receive Packet (AO=0) (0x90)";
ft.ZIGBEE_EXPLICIT_RX = 0x91;
ft[0x91] = "ZigBee Explicit Rx Indicator (AO=1) (0x91)";
ft.ZIGBEE_IO_DATA_SAMPLE_RX = 0x92;
ft[0x92] = "ZigBee IO Data Sample Rx Indicator (0x92)";
ft.XBEE_SENSOR_READ = 0x94;
ft[0x94] = "XBee Sensor Read Indicator (AO=0) (0x94)";
ft.NODE_IDENTIFICATION = 0x95;
ft[0x95] = "Node Identification Indicator (AO=0) (0x95)";
ft.REMOTE_COMMAND_RESPONSE = 0x97;
ft[0x97] = "Remote Command Response (0x97)";
ft.OTA_FIRMWARE_UPDATE_STATUS = 0xA0;
ft[0xA0] = "Over-the-Air Firmware Update Status (0xA0)";
ft.ROUTE_RECORD = 0xA1;
ft[0xA1] = "Route Record Indicator (0xA1)";
ft.DEVICE_AUTHENITCATED_INDICATOR = 0xA2;
ft[0xA2] = "Device Authenticated Indicator (0xA2)";
ft.MTO_ROUTE_REQUEST = 0xA3;
ft[0xA3] = "Many-to-One Route Request Indicator (0xA3)";
ft.REGISTER_JOINING_DEVICE_STATUS = 0xA4;
ft[0xA4] = "Register Joining Device Status (0xA4)";
ft.JOIN_NOTIFICATION_STATUS = 0xA5;
ft[0xA5] = "Join Notification Status (0xA5)";

// Series 1/802.15.4 Support
ft.TX_REQUEST_64 = 0x00;
ft[0x00] = "TX (Transmit) Request: 64-bit address (0x00)";
ft.TX_REQUEST_16 = 0x01;
ft[0x01] = "TX (Transmit) Request: 16-bit address (0x01)";
ft.TX_STATUS = 0x89;
ft[0x89] = "TX (Transmit) Status (0x89)";
ft.RX_PACKET_64 = 0x80;
ft[0x80] = "RX (Receive) Packet: 64-bit Address (0x80)";
ft.RX_PACKET_16 = 0x81;
ft[0x81] = "RX (Receive) Packet: 16-bit Address (0x81)";
ft.RX_PACKET_64_IO = 0x82;
ft[0x82] = "RX (Receive) Packet: 64-bit Address IO (0x82)";
ft.RX_PACKET_16_IO = 0x83;
ft[0x83] = "RX (Receive) Packet: 16-bit Address IO (0x83)";


// Modem Status
ms.HARDWARE_RESET = 0x00;
ms[0x00] = "Hardware Reset (0x00)";
ms.WATCHDOG_RESET = 0x01;
ms[0x01] = "Watchdog timer reset (0x01)";
ms.JOINED_NETWORK = 0x02;
ms[0x02] = "Joined Network (0x02)";
ms.DISASSOCIATED = 0x03;
ms[0x03] = "Disassociated (0x03)";
ms.COORDINATOR_STARTED = 0x06;
ms[0x06] = "Coordinator started (0x06)";
ms.SECURITY_KEY_UPDATED = 0x07;
ms[0x07] = "Network security key was updated (0x07)";
ms.VOLTAGE_SUPPLY_LIMIT_EXCEEDED = 0x0D;
ms[0x0D] = "Voltage supply limit exceeded (0x0D)";
ms.CONFIGURATION_CHANGED_DURING_JOIN = 0x11;
ms[0x11] = "Modem Configuration changed while join in progress (0x11)";
ms.STACK_ERROR = 0x80;
ms[0x80] = "Stack Error (0x80)";

// Command Status
coms.OK = 0x00;
coms[0x00] = "OK (0x00)";
coms.ERROR = 0x01;
coms[0x01] = "ERROR (0x01)";
coms.INVALID_COMMAND = 0x02;
coms[0x02] = "Invalid Command (0x02)";
coms.INVALID_PARAMETER = 0x03;
coms[0x03] = "Invalid Parameter (0x03)";
coms.REMOTE_CMD_TRANS_FAILURE = 0x04;
coms[0x04] = "Remote Command Transmission Failed (0x04)";

// Delivery Status
dels.SUCCESS = 0x00;
dels[0x00] = "Success (0x00)";
dels.MAC_ACK_FALIURE = 0x01;
dels[0x01] = "MAC ACK Failure (0x01)";
dels.CA_FAILURE = 0x02;
dels[0x02] = "CA Failure (0x02)";
dels.INVALID_DESTINATION_ENDPOINT = 0x15;
dels[0x15] = "Invalid destination endpoint (0x15)";
dels.NETWORK_ACK_FAILURE = 0x21;
dels[0x21] = "Network ACK Failure (0x21)";
dels.NOT_JOINED_TO_NETWORK = 0x22;
dels[0x22] = "Not Joined to Network (0x22)";
dels.SELF_ADDRESSED = 0x23;
dels[0x23] = "Self-addressed (0x23)";
dels.ADDRESS_NOT_FOUND = 0x24;
dels[0x24] = "Address Not Found (0x24)";
dels.ROUTE_NOT_FOUND = 0x25;
dels[0x25] = "Route Not Found (0x25)";
dels.BROADCAST_SOURCE_FAILED = 0x26;
dels[0x26] = "Broadcast source failed to hear a neighbor relay the message (0x26)";
dels.INVALID_BINDING_TABLE_INDEX = 0x2B;
dels[0x2B] = "Invalid binding table index (0x2B)";
dels.RESOURCE_ERROR = 0x2C;
dels[0x2C] = "Resource error lack of free buffers, timers, etc. (0x2C)";
dels.ATTEMPTED_BROADCAST_WITH_APS_TRANS = 0x2D;
dels[0x2D] = "Attempted broadcast with APS transmission (0x2D)";
dels.ATTEMPTED_BROADCAST_WITH_APS_TRANS_EE0 = 0x2D;
dels[0x2E] = "Attempted unicast with APS transmission, but EE=0 (0x2E)";
dels.RESOURCE_ERROR_B = 0x32;
dels[0x32] = "Resource error lack of free buffers, timers, etc. (0x32)";
dels.DATA_PAYLOAD_TOO_LARGE = 0x74;
dels[0x74] = "Data payload too large (0x74)";
dels.INDIRECT_MESSAGE_UNREQUESTED = 0x75;
dels[0x75] = "Indirect message unrequested (0x75)";

// Discovery Status
diss.NO_DISCOVERY_OVERHEAD = 0x00;
diss[0x00] = "No Discovery Overhead (0x00)";
diss.ADDRESS_DISCOVERY = 0x01;
diss[0x01] = "Address Discovery (0x01)";
diss.ROUTE_DISCOVERY = 0x02;
diss[0x02] = "Route Discovery (0x02)";
diss.ADDRESS_AND_ROUTE_DISCOVERY = 0x03;
diss[0x03] = "Address and Route (0x03)";
diss.EXTENDED_TIMEOUT_DISCOVERY = 0x40;
diss[0x40] = "Extended Timeout Discovery (0x40)";

// Receive Options
ro.PACKET_ACKNOWLEDGED = 0x01;
ro[0x01] = "Packet Acknowledged (0x01)";
ro.PACKET_WAS_BROADCAST = 0x02;
ro[0x02] = "Packet was a broadcast packet (0x02)";
ro.PACKET_ENCRYPTED = 0x20;
ro[0x20] = "Packet encrypted with APS encryption (0x20)";
ro.PACKET_SENT_FROM_END_DEVICE = 0x40;
ro[0x40] = "Packet was sent from an end device (if known) (0x40)";



//
// Digital Channel Mask/Pins
//
// Map mask to name
dc.MASK[0]  = ["DIO0", "AD0"];
dc.MASK[1]  = ["DIO1", "AD1"];
dc.MASK[2]  = ["DIO2", "AD2"];
dc.MASK[3]  = ["DIO3", "AD3"]; 
dc.MASK[4]  = ["DIO4"]; 
dc.MASK[5]  = ["DIO5", "ASSOCIATE"];
dc.MASK[6]  = ["DIO6", "RTS"]; 
dc.MASK[7]  = ["DIO7", "CTS"];
dc.MASK[10] = ["DIO10", "RSSI"]; 
dc.MASK[11] = ["DIO11", "PWM"]; 
dc.MASK[12] = ["DIO12", "CD"]; 
// Map pin/name to mask
ac.PIN[20] = dc.DIO0 = dc.AD0 = 0;
ac.PIN[19] = dc.DIO1 = dc.AD1 = 1;
ac.PIN[18] = dc.DIO2 = dc.AD2 = 2;
ac.PIN[17] = dc.DIO3 = dc.AD3 = 3;
ac.PIN[11] = dc.DIO4 = 4;
ac.PIN[15] = dc.DIO5 = dc.ASSOCIATE = 5;
ac.PIN[16] = dc.DIO6 = dc.RTS = 6;
ac.PIN[12] = dc.DIO7 = dc.CTS = 7;
ac.PIN[6]  = dc.DIO10 = dc.RSSI = 10;
ac.PIN[7]  = dc.DIO11 = dc.PWM = 11;
ac.PIN[4]  = dc.DIO12 = dc.CD = 12;

//
// Analog Channel Mask/Pins
//
// Map mask to name
ac.MASK[0] = ["AD0", "DIO0" ];
ac.MASK[1] = ["AD1", "DIO1" ];
ac.MASK[2] = ["AD2", "DIO2" ];
ac.MASK[3] = ["AD3", "DIO3" ];
ac.MASK[7] = ["SUPPLY"];
// map pin/name to mask
ac.PIN[20] = ac.AD0 = ac.DIO0 = 0;
ac.PIN[19] = ac.AD1 = ac.DIO1 = 1;
ac.PIN[18] = ac.AD2 = ac.AD3 = 3;
ac.PIN[17] = ac.SUPPLY = 7; // 17 True?


//
// Pullup-enable Mask/Pins
//
// Map mask to name
pr.MASK[0] = ["DIO4"];
pr.MASK[1] = ["DIO3", "AD3"];
pr.MASK[2] = ["DIO2", "AD2"];
pr.MASK[3] = ["DIO1", "AD1"];
pr.MASK[4] = ["DIO0", "AD0"];
pr.MASK[5] = ["DIO6", "RTS"];
pr.MASK[6] = ["DIO8", "DTR", "SLEEP_REQUEST"];
pr.MASK[7] = ["DIN", "CONFIG"];
pr.MASK[8] = ["DIO5", "ASSOCIATE"];
pr.MASK[9] = ["DIO9", "ON"];
pr.MASK[10] = ["DIO12"];
pr.MASK[11] = ["DIO10", "RSSI", "PWM0"];
pr.MASK[12] = ["DIO11", "PWM1"];
pr.MASK[13] = ["DIO7", "CTS"];
// Map pin/name to maks
pr.PIN[11] = pr.DIO4 = 0;
pr.PIN[17] = pr.AD3 = pr.DIO3 = 1; 
pr.PIN[18] = pr.AD2 = pr.DIO2 = 2;
pr.PIN[19] = pr.AD1 = pr.DIO1 = 3;
pr.PIN[20] = pr.AD0 = pr.DIO0 = 4;
pr.PIN[16] = pr.RTS = pr.DIO6 = 5;
pr.PIN[9] = pr.DIO8 = pr.DTR  = pr.SLEEP_REQUEST = 6;
pr.PIN[3] = pr.DIN  = pr.CONFIG = 7;
pr.PIN[15] = pr.ASSOCIATE = pr.DIO5 = 8;
pr.PIN[13] = pr.ON = pr.SLEEP = pr.DIO9 = 9;
pr.PIN[4] = pr.DIO12 = 10;
pr.PIN[6] = pr.PWM0 = pr.RSSI = pr.DIO10 = 11;
pr.PIN[7] = pr.PWM1 = pr.DIO11 = 12;
pr.PIN[12] = pr.CTS = pr.DIO7 = 13;


//
// Change Reporting Mask/Pins
//
// Map mask to name
ic.MASK[0] = ["DIO0"];
ic.MASK[1] = ["DIO1"];
ic.MASK[2] = ["DIO2"];
ic.MASK[3] = ["DIO3"]; 
ic.MASK[4] = ["DIO4"]; 
ic.MASK[5] = ["DIO5"]; 
ic.MASK[6] = ["DIO6"]; 
ic.MASK[7] = ["DIO7"]; 
ic.MASK[8] = ["DIO8"]; 
ic.MASK[9] = ["DIO9"]; 
ic.MASK[10] = ["DIO10"]; 
ic.MASK[11] = ["DIO11"]; 
// Map pin/name to mask
ic.PIN[20] = ic.DIO0 = 0;
ic.PIN[19] = ic.DIO1 = 1;
ic.PIN[18] = ic.DIO2 = 2;
ic.PIN[17] = ic.DIO3 = 3;
ic.PIN[11] = ic.DIO4 = 4;
ic.PIN[15] = ic.DIO5 = 5;
ic.PIN[16] = ic.DIO6 = 6;
ic.PIN[12] = ic.DIO7 = 7;
ic.PIN[9]  = ic.DIO8 = 8;
ic.PIN[13] = ic.DIO9 = 9;
ic.PIN[6]  = ic.DIO10 = 10;
ic.PIN[7]  = ic.DIO11 = 11;


// 
// Pin Modes
//
pm.P2 = pm.P1 = {
  UNMONITORED_INPUT: 0x00,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

pm.P0 = {
  DISABLED: 0x00,
  RSSI_PWM: 0x01,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

pm.D4 = {
  DISABLED: 0x00,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

pm.D7 = {
  DISABLED: 0x00,
  CTS_FLOW_CTRL: 0x01,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05,
  RS485_TX_LOW: 0x06,
  RS485_TX_HIGH: 0x07
};

pm.D5 = {
  DISABLED: 0x00,
  ASSOC_LED: 0x01,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

pm.D6 = {
  DISABLED: 0x00,
  RTS_FLOW_CTRL: 0x01,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

pm.D0 = pm.D1 = pm.D2 = pm.D3 = {
  DISABLED: 0x00,
  NODE_ID_ENABLED: 0x01, // Only valid for D0!
  ANALOG_INPUT: 0x02,
  DIGITAL_INPUT: 0x03,
  DIGITAL_OUTPUT_LOW: 0x04,
  DIGITAL_OUTPUT_HIGH: 0x05
};

for (var pin in pm) {
  for (var key in pm[pin]) {
    pm[pin][pm[pin][key]] = key;
  }
}

pc.PIN[6] = pc.PWM0 = pc.DIO10 = pc.RSSIM = "P0";
pc.PIN[7] = pc.DIO11 = pc.PWM1 = "P1";
pc.PIN[4] = pc.DIO12 = "P2";
pc.PIN[12] = pc.DIO7 = pc.CTS = "D7";
pc.PIN[16] = pc.DIO6 = "D6";
pc.PIN[20] = pc.AD0 = pc.DIO0 = "D0";
pc.PIN[19] = pc.AD1 = pc.DIO1 = "D1";
pc.PIN[18] = pc.AD2 = pc.DIO2 = "D2";
pc.PIN[17] = pc.AD3 = pc.DIO3 = "D3";
pc.PIN[11] = pc.DIO4 = "D4";
pc.PIN[15] = pc.DIO5 = pc.ASSOC = "D5";


},{}],3:[function(require,module,exports){
(function (Buffer){
/*
 * xbee-api
 * https://github.com/jouz/xbee-api
 *
 * Copyright (c) 2013 Jan Kolkmeier
 * Licensed under the MIT license.
 */

'use strict';

var assert = require('assert'),
    C = require('./constants');

var frame_builder = module.exports = {
  frameId: 0,
  nextFrameId: function nextFrameId() {
    this.frameId = this.frameId >= 0xff ? 1 : ++this.frameId;
    return this.frameId;
  },

  getFrameId: function getFrameId(frame) {
    assert(frame, 'Frame parameter must be supplied');
    var id = frame.id || (frame.id !== 0 && this.nextFrameId()) || frame.id;
    return frame.id = id;
  }
};


// Appends data provided as Array, String, or Buffer
function appendData(data, builder) {
  if(Array.isArray(data)) {
    data = new Buffer(data);
  } else {
    data = new Buffer(data, 'ascii');
  }

  builder.appendBuffer(data);
}

frame_builder[C.FRAME_TYPE.AT_COMMAND] = 
frame_builder[C.FRAME_TYPE.AT_COMMAND_QUEUE_PARAMETER_VALUE] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.command, 'ascii');
  appendData(frame.commandParameter, builder);
};

frame_builder[C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.destination64 || C.UNKNOWN_64, 'hex');
  builder.appendString(frame.destination16 || C.UNKNOWN_16, 'hex');
  builder.appendUInt8(frame.remoteCommandOptions || 0x02);
  builder.appendString(frame.command, 'ascii');
  appendData(frame.commandParameter, builder);
};

frame_builder[C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.destination64 || C.UNKNOWN_64, 'hex');
  builder.appendString(frame.destination16 || C.UNKNOWN_16, 'hex');
  builder.appendUInt8(frame.broadcastRadius || 0x00);
  builder.appendUInt8(frame.options || 0x00);
  appendData(frame.data, builder);
};


frame_builder[C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.destination64 || C.UNKNOWN_64, 'hex');
  builder.appendString(frame.destination16 || C.UNKNOWN_16, 'hex');
  builder.appendUInt8(frame.sourceEndpoint);
  builder.appendUInt8(frame.destinationEndpoint);

  if (typeof(frame.clusterId) === 'number') {
	  builder.appendUInt16BE(frame.clusterId, 'hex');
  } else {
	  builder.appendString(frame.clusterId, 'hex');
  }

  if (typeof(frame.profileId) === 'number') {
	  builder.appendUInt16BE(frame.profileId, 'hex');
  } else {
	  builder.appendString(frame.profileId, 'hex');
  }

  builder.appendUInt8(frame.broadcastRadius || 0x00);
  builder.appendUInt8(frame.options || 0x00);
  appendData(frame.data, builder);
};

frame_builder[C.FRAME_TYPE.CREATE_SOURCE_ROUTE] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(0); // Frame ID is always zero for this
  builder.appendString(frame.destination64, 'hex');
  builder.appendString(frame.destination16, 'hex');
  builder.appendUInt8(0); // Route command options always zero
  builder.appendUInt8(frame.addresses.length); // Number of hops
  for (var i = 0; i < frame.addresses.length; i++) {
    builder.appendUInt16BE(frame.addresses[i], 'hex');
  }
};

frame_builder[C.FRAME_TYPE.TX_REQUEST_64] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.destination64 || C.UNKNOWN_64, 'hex');
  builder.appendUInt8(frame.options || 0x00);
  appendData(frame.data, builder);
};

frame_builder[C.FRAME_TYPE.TX_REQUEST_16] = function(frame, builder) {
  builder.appendUInt8(frame.type);
  builder.appendUInt8(this.getFrameId(frame));
  builder.appendString(frame.destination16 || C.BROADCAST_16_XB, 'hex');
  builder.appendUInt8(frame.options || 0x00);
  appendData(frame.data, builder);
};

}).call(this,require("buffer").Buffer)
},{"./constants":2,"assert":9,"buffer":10}],4:[function(require,module,exports){
/*
 * xbee-api
 * https://github.com/jouz/xbee-api
 *
 * Copyright (c) 2013 Jan Kolkmeier
 * Licensed under the MIT license.
 */

'use strict';

var C = require('./constants.js');

var frame_parser = module.exports = {};

frame_parser[C.FRAME_TYPE.NODE_IDENTIFICATION] = function(frame, reader, options) {
  frame.sender64 = reader.nextString(8, 'hex');
  frame.sender16 = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame_parser.parseNodeIdentificationPayload(frame, reader, options);
};

frame_parser[C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.ZIGBEE_EXPLICIT_RX] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.sourceEndpoint = reader.nextString(1, 'hex');
  frame.destinationEndpoint = reader.nextString(1, 'hex');
  frame.clusterId = reader.nextString(2, 'hex');
  frame.profileId = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.XBEE_SENSOR_READ] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame.sensors = reader.nextUInt8();
  frame.sensorValues = {
      AD0: Math.round(1000 * (reader.nextUInt16BE() * 5.1) / 255.0),
      AD1: Math.round(1000 * (reader.nextUInt16BE() * 5.1) / 255.0),
      AD2: Math.round(1000 * (reader.nextUInt16BE() * 5.1) / 255.0),
      AD3: Math.round(1000 * (reader.nextUInt16BE() * 5.1) / 255.0),
      T:   reader.nextUInt16BE(),
      temperature: undefined,
      relativeHumidity: undefined,
      trueHumidity: undefined,
      waterPresent: frame.sensors === 0x60
  };

  if (frame.sensors === 2 || frame.sensors === 3) {
    if (frame.sensorValues.T < 2048) {
      frame.sensorValues.temperature = frame.sensorValues.T / 16;
    } else {
      frame.sensorValues.temperature = -(frame.sensorValues.T & 0x7ff) / 16;
    }
  }

  if (frame.sensors === 1 || frame.sensors === 3) {
    frame.sensorValues.relativeHumidity = Math.round(100 *
        (((frame.sensorValues.AD3 / frame.sensorValues.AD2) -
            0.16) / (0.0062))) / 100;
  }

  if (frame.sensors === 3) {
    frame.sensorValues.trueHumidity = Math.round(100 *
        (frame.sensorValues.relativeHumidity / (1.0546 -
            (0.00216 * frame.sensorValues.temperature)))) / 100;
  }

};

frame_parser[C.FRAME_TYPE.MODEM_STATUS] = function(frame, reader, options) {
  frame.modemStatus = reader.nextUInt8();
};

frame_parser[C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame_parser.ParseIOSamplePayload(frame, reader, options);
};

frame_parser[C.FRAME_TYPE.AT_COMMAND_RESPONSE] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.command = reader.nextString(2, 'ascii');
  frame.commandStatus = reader.nextUInt8();
  if ((frame.command === "ND") && (frame.commandStatus == C.COMMAND_STATUS.OK) && (reader.buf.length > reader.tell())) {
    frame.nodeIdentification = {};
    frame_parser.parseNodeIdentificationPayload(frame.nodeIdentification, reader);
  } else {
    frame.commandData = reader.nextAll();
  }
};

frame_parser[C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.command = reader.nextString(2, 'ascii');
  frame.commandStatus = reader.nextUInt8();
  if(frame.command === "IS") {
    frame_parser.ParseIOSamplePayload(frame, reader, options);
  } else if ((frame.command === "ND") && (frame.commandStatus == C.COMMAND_STATUS.OK)) {
    frame.nodeIdentification = {};
    frame_parser.parseNodeIdentificationPayload(frame.nodeIdentification, reader);
  } else {
    frame.commandData = reader.nextAll();
  }
};

frame_parser[C.FRAME_TYPE.ZIGBEE_TRANSMIT_STATUS] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.remote16 = reader.nextString(2, 'hex');
  frame.transmitRetryCount = reader.nextUInt8();
  frame.deliveryStatus = reader.nextUInt8();
  frame.discoveryStatus = reader.nextUInt8();
};

frame_parser[C.FRAME_TYPE.ROUTE_RECORD] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.remote16 = reader.nextString(2, 'hex');
  frame.receiveOptions = reader.nextUInt8();
  frame.hopCount = reader.nextUInt8();
  frame.addresses = [];
  for (var i=0; i<frame.hopCount; i++) {
    frame.addresses.push(reader.nextUInt16BE());
  }
};

frame_parser[C.FRAME_TYPE.AT_COMMAND] = 
frame_parser[C.FRAME_TYPE.AT_COMMAND_QUEUE_PARAMETER_VALUE] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.command = reader.nextString(2, 'ascii');
  frame.commandParameter = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.destination64 = reader.nextString(8, 'hex');
  frame.destination16 = reader.nextString(2, 'hex');
  frame.remoteCommandOptions = reader.nextUInt8();
  frame.command = reader.nextString(2, 'ascii');
  frame.commandParameter = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.destination64 = reader.nextString(8, 'hex');
  frame.destination16 = reader.nextString(2, 'hex');
  frame.broadcastRadius = reader.nextUInt8();
  frame.options = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.EXPLICIT_ADDRESSING_ZIGBEE_COMMAND_FRAME] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.destination64 = reader.nextString(8, 'hex');
  frame.destination16 = reader.nextString(2, 'hex');
  frame.sourceEndpoint = reader.nextUInt8();
  frame.destinationEndpoint = reader.nextUInt8();
  frame.clusterId = reader.nextUInt16BE();
  frame.profileId = reader.nextUInt16BE();
  frame.broadcastRadius = reader.nextUInt8();
  frame.options = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.TX_REQUEST_64] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.destination64 = reader.nextString(8, 'hex');
  frame.options = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.TX_REQUEST_16] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.destination16 = reader.nextString(2, 'hex');
  frame.options = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser.parseNodeIdentificationPayload = function(frame, reader, options) {
  frame.remote16 = reader.nextString(2, 'hex');
  frame.remote64 = reader.nextString(8, 'hex');

  // Extract the NI string from the buffer
  frame.nodeIdentifier = reader.nextStringZero('ascii');

  if(reader.buf.length > reader.tell()) {
    frame.remoteParent16 = reader.nextString(2, 'hex');
    frame.deviceType = reader.nextUInt8();
    frame.sourceEvent = reader.nextUInt8();
    frame.digiProfileID = reader.nextString(2, 'hex');
    frame.digiManufacturerID = reader.nextString(2, 'hex');
  }
};

frame_parser.ParseIOSamplePayload = function(frame, reader, options) {
  frame.digitalSamples = {};
  frame.analogSamples = {};
  frame.numSamples = 0;
  // When parsing responses to ATIS, there is no data to parse if IO lines are not enabled
  if (frame.commandStatus !== undefined && frame.commandStatus !== 0) return;
  frame.numSamples = reader.nextUInt8();
  var mskD = reader.nextUInt16BE(); 
  var mskA = reader.nextUInt8();

  if (mskD > 0) {
    var valD = reader.nextUInt16BE();
    for (var dbit in C.DIGITAL_CHANNELS.MASK) {
      if ((mskD & (1 << dbit)) >> dbit) {
        frame.digitalSamples[C.DIGITAL_CHANNELS.MASK[dbit][0]] = (valD & (1 << dbit)) >> dbit;
      }
    }
  }

  if (mskA > 0) {
    for (var abit in C.ANALOG_CHANNELS.MASK) {
      if ((mskA & (1 << abit)) >> abit) {
        var valA = reader.nextUInt16BE();
        
        if (!options.convert_adc) {
          frame.analogSamples[C.ANALOG_CHANNELS.MASK[abit][0]] = valA;
        } else {
        // Convert to mV, resolution is < 1mV, so rounding is OK
          frame.analogSamples[C.ANALOG_CHANNELS.MASK[abit][0]] = Math.round((valA * options.vref_adc) / 1023);
        }
      }
    }
  }
};

// Series 1 Support
frame_parser.Recieved16BitPacketIO = function(frame, reader, options) {
  var hasDigital = 0;
  var data = {};
  // OFFSET 4
 //reader.move(4);
  data.sampleQuantity = reader.nextUInt8();
  data.channelMask    = reader.nextUInt16BE(); 
  data.channels       = {};
  data.analogSamples  = [];
  data.digitalSamples = [];

  //analog channels
  for( var a=0; a<=5; a++ ){
    // exponent looks odd here because analog pins start at 0000001000000000
    if( Boolean(data.channelMask & Math.pow(2,a+9)) ){
      data.channels['ADC'+a] = 1;
    }
  }

  // if any of the DIO pins are active, parse the digital samples 
  // 0x1ff = 0000000111111111
  if(data.channelMask & 0x1ff){
    hasDigital = 1;
    for( var i=0; i < data.sampleQuantity; i++ ){
      data.digitalSamples.push( reader.nextUInt16BE().toString(2) );
    }

    //digital channels
    for( var d=0; d<=8; d++ ){
      if( Boolean(data.channelMask & Math.pow(2,d)) ){
        data.channels['DIO'+d] = 1;
      }
    }
  }

  for( var si=0; si < data.sampleQuantity; si++ ){
    var sample = {};
    for( var j=0; j <= 5; j++ ){
      if( data.channels['ADC'+j] ){
        // starts at the 7th byte and moved down by the Digital Samples section
        sample['ADC'+j] = reader.nextUInt16BE();
      }
    }
    data.analogSamples.push(sample);
  }

  frame.data = data;
};

frame_parser[C.FRAME_TYPE.TX_STATUS] = function(frame, reader, options) {
  frame.id = reader.nextUInt8();
  frame.deliveryStatus = reader.nextUInt8();
};

frame_parser[C.FRAME_TYPE.RX_PACKET_64] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.rssi = reader.nextUInt8();
  frame.receiveOptions = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.RX_PACKET_16] = function(frame, reader, options) {
  frame.remote16 = reader.nextString(2, 'hex');
  frame.rssi = reader.nextUInt8();
  frame.receiveOptions = reader.nextUInt8();
  frame.data = reader.nextAll();
};

frame_parser[C.FRAME_TYPE.RX_PACKET_64_IO] = function(frame, reader, options) {
  frame.remote64 = reader.nextString(8, 'hex');
  frame.rssi = reader.nextUInt8();
  frame.receiveOptions = reader.nextUInt8();
  frame.data = reader.nextAll();
  // TODO: Parse I/O Data?
};


frame_parser[C.FRAME_TYPE.RX_PACKET_16_IO] = function(frame, reader, options) {
  frame.remote16 = reader.nextString(2, 'hex');
  frame.rssi = reader.nextUInt8();
  frame.receiveOptions = reader.nextUInt8();
  frame_parser.Recieved16BitPacketIO(frame, reader, options);
};

},{"./constants.js":2}],5:[function(require,module,exports){
(function (Buffer){
/*
 * xbee-api
 * https://github.com/jouz/xbee-api
 *
 * Copyright (c) 2013 Jan Kolkmeier
 * Licensed under the MIT license.
 */

'use strict';

var util = require('util'),
    assert = require('assert'),
    events = require('events'),
    BufferBuilder = require('buffer-builder'),
    BufferReader = require('buffer-reader');

exports = module.exports;

var C       = exports.constants = require('./constants.js');
var frame_parser = exports._frame_parser = require('./frame-parser');
var frame_builder = exports._frame_builder = require('./frame-builder');

var _options = {
  raw_frames: false,
  api_mode: 1,
  module: "Any",
  convert_adc: true,
  vref_adc: 1200,
};

function XBeeAPI(options) {
  events.EventEmitter.call(this);
  options = options || {};
  options.__proto__ = _options;
  this.options = options;

  this.parseState = {
    buffer: new Buffer(128),
    offset: 0,         // Offset in buffer
    length: 0,         // Packet Length
    total: 0,          // To test Checksum
    checksum: 0x00,    // Checksum byte
    b: 0x00,           // Working byte
    escape_next: false,// For escaping in AP=2
    waiting: true
  };

  return this;
}
util.inherits(XBeeAPI, events.EventEmitter);

exports.XBeeAPI = XBeeAPI;

XBeeAPI.prototype.escape = function(buffer) {
  if (this.escapeBuffer === undefined)
    this.escapeBuffer = new Buffer(512);

  var offset = 0;
  this.escapeBuffer.writeUInt8(buffer[0], offset++);
  for (var i = 1; i < buffer.length; i++) {
    if (C.ESCAPE_BYTES.indexOf(buffer[i]) > -1) {
      this.escapeBuffer.writeUInt8(C.ESCAPE, offset++);
      this.escapeBuffer.writeUInt8(buffer[i] ^ C.ESCAPE_WITH, offset++);
    } else {
      this.escapeBuffer.writeUInt8(buffer[i], offset++);
    }
  }

  return new Buffer(this.escapeBuffer.slice(0, offset));
};

XBeeAPI.prototype.buildFrame = function(frame) {
  assert(frame, 'Frame parameter must be a frame object');

  var packet = new Buffer(256); // Packet buffer
  var payload = packet.slice(3); // Reference the buffer past the header
  var builder = new BufferBuilder(payload);

  if(!frame_builder[frame.type])
    throw new Error('This library does not implement building the %d frame type.', frame.type);

  // Let the builder fill the payload
  frame_builder[frame.type](frame, builder);

  // Calculate & Append Checksum
  var checksum = 0;
  for (var i = 0; i < builder.length; i++) checksum += payload[i];
  builder.appendUInt8(255 - (checksum % 256));
  
  // Get just the payload
  payload = payload.slice(0, builder.length);

  // Build the header at the start of the packet buffer
  builder = new BufferBuilder(packet);
  builder.appendUInt8(C.START_BYTE);
  builder.appendUInt16BE(payload.length - 1); // Sans checksum

  // Get the header and payload as one contiguous buffer
  packet = packet.slice(0, builder.length + payload.length);

  // Escape the packet, if needed
  return this.options.api_mode === 2 ? this.escape(packet) : packet;
};

// Note that this expects the whole frame to be escaped!
XBeeAPI.prototype.parseFrame = function(rawFrame) {
  // Trim the header and trailing checksum
  var reader = new BufferReader(rawFrame.slice(3, rawFrame.length -1));

  var frame = {
    type: reader.nextUInt8() // Read Frame Type
  };

  // Frame type specific parsing.
  frame_parser[frame.type](frame, reader, this.options);

  return frame;
};

XBeeAPI.prototype.canParse = function(buffer) {
  var type = buffer.readUInt8(3);
  return type in frame_parser;
};

XBeeAPI.prototype.canBuild = function(type) {
  return type in frame_builder;
};

XBeeAPI.prototype.nextFrameId = function() {
  return frame_builder.nextFrameId();
};

XBeeAPI.prototype.rawParser = function() {
  return function(emitter, buffer) {
    this.parseRaw(buffer);
  }.bind(this);
};

XBeeAPI.prototype.parseRaw = function(buffer) {
  var S = this.parseState;
  for(var i = 0; i < buffer.length; i++) {
    S.b = buffer[i];
    if (S.b === C.START_BYTE) {
      S.buffer = new Buffer(128);
      S.length = 0;
      S.total = 0;
      S.checksum = 0x00;
      S.offset = 0;
      S.escape_next = false;
      S.waiting = false;
    }

    if (this.options.api_mode === 2 && S.b === C.ESCAPE) {
      S.escape_next = true;
      continue;
    }

    if (S.escape_next) {
      S.b = 0x20 ^ S.b;
      S.escape_next = false;
    }

    if (!S.waiting) {
        if (S.buffer.length > S.offset) {
          S.buffer.writeUInt8(S.b, S.offset++);
        } else {
            console.log("We would have a problem...");
            S.waiting = true;
        }
    }
    
    if (S.offset === 1) {
      continue;
    }

    if (S.offset === 2) {
      S.length  = S.b << 8; // most sign. bit of the length
      continue;
    }
    if (S.offset === 3) {
      S.length += S.b;     // least sign. bit of the length
      continue;
    }

    if (S.offset > 3) { // unnessary check
      if (S.offset < S.length+4) {
        S.total += S.b;
        continue;
      } else {
        S.checksum = S.b;
      }
    }

    if (S.length > 0 && S.offset === S.length + 4) {
      S.waiting = true;
      if (S.checksum !== (255 - (S.total % 256))) {
        var err = new Error("Checksum Mismatch " + JSON.stringify(S));
        this.emit('error', err);
      }

      var rawFrame = S.buffer.slice(0, S.offset);
      if (this.options.raw_frames || !this.canParse(rawFrame)) {
        this.emit("frame_raw", rawFrame);
      } else {
        var frame = this.parseFrame(rawFrame);
        this.emit("frame_object", frame);
      }
    }
  }
};

}).call(this,require("buffer").Buffer)
},{"./constants.js":2,"./frame-builder":3,"./frame-parser":4,"assert":9,"buffer":10,"buffer-builder":6,"buffer-reader":7,"events":14,"util":18}],6:[function(require,module,exports){
(function (Buffer){
module.exports = BufferBuilder;

function BufferBuilder(initialCapacity) {
  var buffer = Buffer.isBuffer(initialCapacity) ? initialCapacity : new Buffer(initialCapacity || 512);
  this.buffers = [buffer];

  this.writeIndex = 0;
  this.length = 0;
}

/* Append a (subsequence of a) Buffer */
BufferBuilder.prototype.appendBuffer = function(source) {
  if (source.length === 0) return this;
  
  var tail = this.buffers[this.buffers.length-1];
  
  var spaceInCurrent = tail.length - this.writeIndex;
  if (source.length <= spaceInCurrent) {
    // We can fit the whole thing in the current buffer
    source.copy(tail, this.writeIndex);
    this.writeIndex += source.length;
  } else {
    // Copy as much as we can into the current buffer
    if (spaceInCurrent) { // Buffer.copy does not handle the degenerate case well
      source.copy(tail, this.writeIndex);//, start, start + spaceInCurrent);
    }
    // Fit the rest into a new buffer. Make sure it is at least as big as
    // what we're being asked to add, and also follow our double-previous-buffer pattern.
    var newBuf = new Buffer(Math.max(tail.length*2, source.length));
    
    this.buffers.push(newBuf);
    this.writeIndex = source.copy(newBuf, 0, spaceInCurrent);
  }
  
  this.length += source.length;
  
  return this;
};

function makeAppender(encoder, size) {
  return function(x) {
    var buf = this.buffers[this.buffers.length-1];
    if (this.writeIndex + size <= buf.length) {
      encoder.call(buf, x, this.writeIndex, true);
      this.writeIndex += size;
      this.length += size;
    } else {
      var scratchBuffer = new Buffer(size);
      encoder.call(scratchBuffer, x, 0, true);
      this.appendBuffer(scratchBuffer);
    }
    
    return this;
  };
}

BufferBuilder.prototype.appendUInt8 = makeAppender(Buffer.prototype.writeUInt8, 1);
BufferBuilder.prototype.appendUInt16LE = makeAppender(Buffer.prototype.writeUInt16LE, 2);
BufferBuilder.prototype.appendUInt16BE = makeAppender(Buffer.prototype.writeUInt16BE, 2);
BufferBuilder.prototype.appendUInt32LE = makeAppender(Buffer.prototype.writeUInt32LE, 4);
BufferBuilder.prototype.appendUInt32BE = makeAppender(Buffer.prototype.writeUInt32BE, 4);
BufferBuilder.prototype.appendInt8 = makeAppender(Buffer.prototype.writeInt8, 1);
BufferBuilder.prototype.appendInt16LE = makeAppender(Buffer.prototype.writeInt16LE, 2);
BufferBuilder.prototype.appendInt16BE = makeAppender(Buffer.prototype.writeInt16BE, 2);
BufferBuilder.prototype.appendInt32LE = makeAppender(Buffer.prototype.writeInt32LE, 4);
BufferBuilder.prototype.appendInt32BE = makeAppender(Buffer.prototype.writeInt32BE, 4);
BufferBuilder.prototype.appendFloatLE = makeAppender(Buffer.prototype.writeFloatLE, 4);
BufferBuilder.prototype.appendFloatBE = makeAppender(Buffer.prototype.writeFloatBE, 4);
BufferBuilder.prototype.appendDoubleLE = makeAppender(Buffer.prototype.writeDoubleLE, 8);
BufferBuilder.prototype.appendDoubleBE = makeAppender(Buffer.prototype.writeDoubleBE, 8);

BufferBuilder.prototype.appendString = function(str, encoding) {
  return this.appendBuffer(new Buffer(str, encoding));
};

BufferBuilder.prototype.appendStringZero = function(str, encoding) {
  return this.appendString(str + '\0', encoding);
}

BufferBuilder.prototype.appendFill = function(value, count) {
  if (!count) return;
  
  var tail = this.buffers[this.buffers.length-1];
  
  var spaceInCurrent = tail.length - this.writeIndex;
  if (count <= spaceInCurrent) {
    // We can fit the whole thing in the current buffer
    tail.fill(value, this.writeIndex, this.writeIndex + count);
    this.writeIndex += count;
  } else {
    // Copy as much as we can into the current buffer
    if (spaceInCurrent) { // does not handle the degenerate case well
      tail.fill(value, this.writeIndex);
    }
    // Fit the rest into a new buffer. Make sure it is at least as big as
    // what we're being asked to add, and also follow our double-previous-buffer pattern.
    var newBuf = new Buffer(Math.max(tail.length*2, count));
    var couldNotFit = count - spaceInCurrent;
    newBuf.fill(value, 0, couldNotFit);
    this.buffers.push(newBuf);
    this.writeIndex = couldNotFit;
  }
  
  this.length += count;
  
  return this;
};

/* Convert to a plain Buffer */
BufferBuilder.prototype.get = function() {
  var concatted = new Buffer(this.length);
  this.copy(concatted);
  return concatted;
};

/* Copy into targetBuffer */
BufferBuilder.prototype.copy = function(targetBuffer, targetStart, sourceStart, sourceEnd) {
  targetStart || (targetStart = 0);
  sourceStart || (sourceStart = 0);
  sourceEnd !== undefined || (sourceEnd = this.length);
  
  // Validation. Besides making us fail nicely, this makes it so we can skip checks below.
  if (targetStart < 0 || (targetStart>0 && targetStart >= targetBuffer.length)) {
    throw new Error('targetStart is out of bounds');
  }
  if (sourceEnd < sourceStart) {
    throw new Error('sourceEnd < sourceStart');
  }
  if (sourceStart < 0 || (sourceStart>0 && sourceStart >= this.length)) {
    throw new Error('sourceStart is out of bounds');
  }
  if (sourceEnd > this.length) {
    throw new Error('sourceEnd out of bounds');
  }
  
  sourceEnd = Math.min(sourceEnd, sourceStart + (targetBuffer.length-targetStart));
  var targetWriteIdx = targetStart;
  var readBuffer = 0;
  
  // Skip through our buffers until we get to where the copying should start.
  var copyLength = sourceEnd - sourceStart;
  var skipped = 0;
  while (skipped < sourceStart) {
    var buffer = this.buffers[readBuffer];
    if (buffer.length + skipped < targetStart) {
      skipped += buffer.length;
    } else {
      // Do the first copy. This one is different from the others in that it
      // does not start from the beginning of one of our internal buffers.
      var copyStart = sourceStart - skipped;
      var inThisBuffer = Math.min(copyLength, buffer.length - copyStart);
      
      buffer.copy(targetBuffer, targetWriteIdx, copyStart, copyStart + inThisBuffer);
      targetWriteIdx += inThisBuffer;
      copyLength -= inThisBuffer;
      readBuffer++;
      break;
    }
    readBuffer++;
  }
  
  // Copy the rest. Note that we can't run off of our end because we validated the range up above
  while (copyLength > 0) {
    var buffer = this.buffers[readBuffer];
    var toCopy = Math.min(buffer.length, copyLength);
    
    buffer.copy(targetBuffer, targetWriteIdx, 0, toCopy);
    copyLength -= toCopy;
    targetWriteIdx += toCopy;
    readBuffer++;
  }
  
  // Return how many bytes were copied
  return sourceEnd - sourceStart;
};

}).call(this,require("buffer").Buffer)
},{"buffer":10}],7:[function(require,module,exports){
(function (Buffer){
"use strict";

var assert = require('assert');

function BufferReader(buffer) {
    buffer = buffer || new Buffer(0);
    assert(Buffer.isBuffer(buffer), 'A Buffer must be provided');
    this.buf = buffer;
    this.offset = 0;
}

BufferReader.prototype.append = function(buffer) {
    assert(Buffer.isBuffer(buffer), 'A Buffer must be provided');
    this.buf = Buffer.concat([this.buf, buffer]);
    return this;
};

BufferReader.prototype.tell = function() {
    return this.offset;
};

BufferReader.prototype.seek = function(pos) {
    assert(pos >= 0 && pos <= this.buf.length, 'Position is Invalid');
    this.offset = pos;
    return this;
};

BufferReader.prototype.move = function(diff) {
    assert(this.offset + diff >= 0 && this.offset + diff <= this.buf.length, 'Difference is Invalid');
    this.offset += diff;
    return this;
};


BufferReader.prototype.nextAll =
BufferReader.prototype.restAll = function() {
    var remain = this.buf.length - this.offset;
    assert(remain >= 0, 'Buffer is not in normal state: offset > totalLength');
    var buf = new Buffer(remain);
    this.buf.copy(buf, 0, this.offset);
    this.offset = this.buf.length;
    return buf;
};


BufferReader.prototype.nextBuffer = function(length) {
    assert(length >= 0, 'Length must be no negative');
    assert(this.offset + length <= this.buf.length, "Out of Original Buffer's Boundary");
    var buf = new Buffer(length);
    this.buf.copy(buf, 0, this.offset, this.offset + length);
    this.offset += length;
    return buf;
};

BufferReader.prototype.nextString = function(length, encoding) {
    assert(length >= 0, 'Length must be no negative');
    assert(this.offset + length <= this.buf.length, "Out of Original Buffer's Boundary");

    this.offset += length;
    return this.buf.toString(encoding, this.offset - length, this.offset);
};

BufferReader.prototype.nextStringZero = function(encoding) {
    // Find null by end of buffer
    for(var length = 0; length + this.offset < this.buf.length && this.buf[this.offset + length] !== 0x00; length++) ;
    
    assert(length <= this.buf.length && this.buf[this.offset + length] === 0x00, "Out of Original Buffer's Boundary");

    this.offset += length + 1;
    return this.buf.toString(encoding, this.offset - length - 1, this.offset - 1);
};


function MAKE_NEXT_READER(valueName, size) {
    valueName = cap(valueName);
    BufferReader.prototype['next' + valueName] = function() {
        assert(this.offset + size <= this.buf.length, "Out of Original Buffer's Boundary");
        var val = this.buf['read' + valueName](this.offset);
        this.offset += size;
        return val;
    };
}

function MAKE_NEXT_READER_BOTH(valueName, size) {
    MAKE_NEXT_READER(valueName + 'LE', size);
    MAKE_NEXT_READER(valueName + 'BE', size);
}

MAKE_NEXT_READER('Int8', 1);
MAKE_NEXT_READER('UInt8', 1);
MAKE_NEXT_READER_BOTH('UInt16', 2);
MAKE_NEXT_READER_BOTH('Int16', 2);
MAKE_NEXT_READER_BOTH('UInt32', 4);
MAKE_NEXT_READER_BOTH('Int32', 4);
MAKE_NEXT_READER_BOTH('Float', 4);
MAKE_NEXT_READER_BOTH('Double', 8);

function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


module.exports = BufferReader;

}).call(this,require("buffer").Buffer)
},{"assert":9,"buffer":10}],8:[function(require,module,exports){
var serialPort = require("browser-serialport");
var SerialPort = require("browser-serialport").SerialPort;
var xbee_api = require("xbee-api");
var main = document.getElementById('main');
var states = new Object();
var xbeeport;

Toast.defaults.displayDuration=6000;
Toast.success('Make sure you have an FTDI driver installed on your computer.', "We haven't found anything yet...");

//Get current serial ports
getCurrentSerialConnections();

//Parse/Send Xbee packets
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2});

//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    var dataArray = data.split('@');
    console.log(JSON.stringify(dataArray));
    if(!(states[dataArray[0]])){
        createStateAndComponent({name: dataArray[0], state: dataArray[2]});
    }
    if(dataArray.length > 3){
      if(dataArray[1] === "data"){
        dataArray[3] = dataArray[3].replace(/[^0-9.,]/g, "");
        if(dataArray[2] === '0'){
          states[dataArray[0]].data = " ";
          states[dataArray[0]].data += dataArray[3];
        } else if(dataArray[2] === '30'){
          states[dataArray[0]].data += "," + dataArray[3];
          var list = states[dataArray[0]].data.split(",");
          changeData(dataArray[0], list);
        } else {
          states[dataArray[0]].data += "," + dataArray[3];  
        }   
      } else if(dataArray[1] === 'temp' ){
        changeTemp({name: dataArray[0], temp: dataArray[2]});
      } else if(dataArray[1] === 'integ'){ 
        changeInteg({name: dataArray[0], integ: dataArray[2]});
      } else if(dataArray[1] === 'state'){
        changeState({name: dataArray[0], state: dataArray[2]});
      }
    }
});

function getCurrentSerialConnections(){
  serialPort.list(function (err, ports) {
    ports.forEach(function(port) {
        console.info(port);
      if(port.vendorId === '0x403'){
        console.log("Found Xbee");
        savedstates = new Object();
        xbeeport = new SerialPort("/dev/tty.usbserial-DN01ITGO", {baudRate: 230400}, function(err){
            if(err){
                return console.log('Error: ', err.message);
            }
            xbeeport.on("open", function(){
                //xbeeport.write(sendPacket("TURN ON"));
                xbeeport.on('data', function(data){
                    xbeeAPI.parseRaw(data);
                });
            });
        });
      }if(port.vendorId === '0xd28'){
          console.log("Found FRDM");
      }
    });
  });
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
}    

function reply_click(id){
    var clickFunction = id.split('@', 2);//Array [0] Name [1] ClickType
    var unit = clickFunction[0];

    if(clickFunction[1] == 'templeft'){
        var currentvalue = parseInt(document.getElementById(unit+'@settemp').innerText);
        if(currentvalue > 1){
            document.getElementById(unit + '@settemp').innerText = currentvalue - 1;
            sendPacket(unit + "@temp@" + currentvalue);
        }
    } else if(clickFunction[1] === 'tempright'){
        var currentvalue = parseInt(document.getElementById(unit+'@settemp').innerText);
        if(currentvalue < 100){
            document.getElementById(unit + '@settemp').innerText = currentvalue + 1;
            sendPacket(unit + "@temp@" + currentvalue);
        }
    } else if(clickFunction[1] === 'absorbleft'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue > .2){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue - .1).toFixed(2);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'absorbright'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue < 1000){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue + .1).toFixed(2);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'play' && states[unit].state === 'ON'){
            sendPacket(unit + "@state@run");
    } else if(clickFunction[1] === 'stop' && states[unit].state === 'RUN'){
            sendPacket(unit + "@state@on");
    } else if(clickFunction[1] === 'power'){
        if(states[unit].state === 'OFF'){
            sendPacket(unit + "@state@on");
        } else if(states[unit].state === 'ON'){
            sendPacket(unit + "@state@off");
        }
    }
}

function createStateAndComponent(data){
    //main.innerHTML = '';
    var name = data.name;
    states[name] = {name : data.name, temp: 72, integ: 1, state: "OFF"};
    htmlObject = '<div id="'+ name +'"> <section> <canvas id="'+name+'mychart" width="700" height="150"></canvas> </section> <section> <article> <a id="'+name+'1power"> <span id="'+name+'@power" onClick="reply_click(this.id)" class="icon-switch"></span> </a> <h4 id="'+name+'@name">'+ name.toUpperCase() +'</h4> <a id="'+ name +'1play"> <span id="'+name+'@play" onClick="reply_click(this.id)" class="icon-play3"></span> </a> <a id="'+name+'1stop"> <span id="'+name+'@stop" onClick="reply_click(this.id)" class="icon-stop2"></span> </a> <p id="'+name+'@time">00:00:00</p> <p id="'+name+'@temp">70</p> <p>°</p> </article> <article> <p>TEMP:</p> <span id="'+name+'@templeft" onClick="reply_click(this.id)" class="icon-circle-left"></span> <p id="'+name+'@settemp">72</p> <span id="'+name+'@tempright" onClick="reply_click(this.id)" class="icon-circle-right"></span> <p>| INTEG:</p> <span id="'+name+'@absorbleft" onClick="reply_click(this.id)" class="icon-circle-left"></span> <p id="'+name+'@absorbance">01.00</p> <span id="'+name+'@absorbright" onClick="reply_click(this.id)" class="icon-circle-right"></span> <p>SEC</p> </article> <article> <p>TEST:</p> <textarea id="'+name+'@filename">101716_03:44:20_01.csv</textarea> </article> </section> </div>';
    main.innerHTML += htmlObject;
    changeState(name, "OFF");
    createChart(name);
}

function changeState(name, newState){
    if(newState === 'OFF'){
        hideObject(name + '1stop', 1);
        hideObject(name + '1play', 0);
        changeColor(name, 'power', 'off');
        changeColor(name, 'play', 'lightgrey');
    }if(newState === 'ON'){
        hideObject(name + '1stop', 1);
        hideObject(name + '1play', 0);
        changeColor(name, 'power', 'on');
        changeColor(name, 'play', 'green');
    }if(newState === 'RUN'){
        hideObject(name + '1play', 1);
        hideObject(name + '1stop', 0);
        changeColor(name, 'power', 'lightgrey');
        changeColor(name, 'stop', 'red');
    }if(newState === 'ERROR'){
        //Figure out
    }
    if(states[name]){
        states[name].state = newState;
    }
}

function changeTemp(){
    
}

function hideObject(toHide, bool) {
    if(bool){
        var hide = document.getElementById(toHide);
        hide.style.height = 0;
        hide.style.visibility = 'hidden';
        hide.style.padding = 0;
    } else {
        var hide = document.getElementById(toHide);
        hide.style.height = '30px';
        hide.style.visibility = 'visible';
        hide.style.padding = '4px';
    }
}

function changeColor(name, type, color){
    if(type === 'play'){
        document.getElementById(name+'1'+type).className = color;
    } if(type === 'stop'){
        document.getElementById(name+'1'+type).className = color;
    } if(type === 'power'){
        document.getElementById(name+'1'+type).className = color;
    }
};

//Chart Random Array and Chart Defaults
var arrayOfRandom = [];
var arrayOfRandomTwo = [];
var index = [];
for(var i = 0; i < 2048; i++){
    index.push(i);
    arrayOfRandom.push(Math.random() + 4);
    arrayOfRandomTwo.push(Math.random()+ 4);
}

var options = {
        scales: {
            xAxes: [{
                display: true,
                ticks: {
                    autoSkipPadding: 20
                }
            }]
        },
        elements: {
            point: {
                radius: 0
            }
        },
        legend: {
            display: false
        },
        defaultColor: "rgb(255, 255, 255)",
        defaultFontColor: "rgb(253, 253, 253)",
        defaultFontSize: "16px"
};

var startingData = {
    type: 'line',
    labels: index,
    datasets: [
        {
            backgroundColor: "rgb(246, 246, 246)",
            data: arrayOfRandom
        }/*,
        {
            fillColor: "rgba(151,187,205,0.2)",
            strokeColor: "rgba(151,187,205,.1)",
            pointColor: "rgba(151,187,205,.1)",
            pointStrokeColor: "#fff",
            data: arrayOfRandomTwo
        }*/
    ]
};

var details = {
    type: 'line',
    data: startingData,
    options: options
};

function createChart(name){
    var canvas = document.getElementById(name + 'mychart');
    var ctx = canvas.getContext('2d');
    states[name].chart = new Chart(ctx, details);
}

function changeData(name,data){
    if(states[name].chart && data){
        states[name].chart.data.datasets[0].data = data;
        states[name].chart.data.labels = makeArray(data.length);
        states[name].chart.update();
    } else {
        createChart(name);
    }
};

function makeArray(num){
    var a = [];
    for(var i = 0; i < num; i++){
        a.push(i);
    }
    return a;
}

},{"browser-serialport":1,"xbee-api":5}],9:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":18}],10:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":11,"ieee754":12,"isarray":13}],11:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],12:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],13:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],15:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],16:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],17:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],18:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":17,"_process":15,"inherits":16}]},{},[8]);
