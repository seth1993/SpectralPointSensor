# Spectro
![Spectro](SpectroGraph.png?raw=true "Light Source Standard")

## Project Overview
Spectro is our Fall 2016 Senior Project. The concept in summary is to remotely sense chemical concentrations. The spectrometer and mircocontroller are concealed in a gas tight box. This box has a RF link using Digis Xbee 900HP to a user interface that displays the raw spectral data. This repo has four folders:

1. ArduinoTempSensor
2. FreedomBoard
3. SpectroChromeApp
4. SpectroWebServer

The SpectroChromeApp and SpectroWebServer are two versions of the UI that read over the Xbee serial port. The FreedomBoard is cpp microcontroller code that connects and reads from the spectrometer. The ArduinoTempSensor is code to read current temperatures, GPS, and time data from inside the sealed box.

## SpectroChromeApp
This folder uses the following libaries:
* Browser-SerialPort
* Xbee-api
* Chart.js

Browser-SerialPort uses the Chrome Serial Port APIs to read from the Xbee port. This folder is hosted as an app in the Chrome App store. 

## SpectroWebServer
This folder uses the following libaries:
* Node-SerialPort
* Xbee-api
* Chart.js
* Node/Express
* Socket.io

#### Installation
1. Make sure node.js is installed on your machine. You can check with 'node -v' command.
2. cd into directory
3. npm install

#### To Run Server
* 'npm run watch' This will run the server and watch and update if changes are made to the code. 

##FreedomBoard
To compile this code for the FRDM Board the code must be on their online MBED development enviroment: https://developer.mbed.org/platforms/FRDM-K64F/. Click on compiler. 

##ArduinoTempSensor
This folder has code that can be compiled for the Arduino microcontroller. 