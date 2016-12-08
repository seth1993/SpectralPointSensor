# Spectro
![Spectro](SpectroGraph.png?raw=true "Light Source Standard")

## Project Overview
Spectro is our Fall 2016 Senior Project. The concept is summary to remotely sense chemical concentrations. The spectrometer and mircocontroller are concealed in a gas tight box. This box has a RF link using Digis Xbee 900HP to a user interface that displays the raw spectral data. This repo has four folders:
1. ArduinoTempSensor
2. FreedomBoard
3. SpectroChromeApp
4. SpectroWebServer

The SpectroChromeApp and SpectroWebServer are two versions of the UI that read over the Xbee serial port. The FreedomBoard is where all our cpp microcontroller code is to read from the spectrometer. The ArduinoTempSensor is code to read current temperatures from inside the sealed box and GPS and time data.

## SpectroChromeApp
This folder uses the following libaries:
* Browser-SerialPort
* Xbee-api
* Chart.js

Browser-SerialPort uses the Chrome Serial Port Apis to read from the Xbee port. This folder is hosted as an app in the Chrome App store. 

## SpectroWebServer
This folder uses the following libaries:
* Node-SerialPort
* Xbee-api
* Chart.js
* Node/Express
* Socket.io