//THIS CODE WORKS AS IS
//will output GPS and TEMP data to the terminal at 115200 baud
//connect USB mini cable to PC
//connect 3V on arduino to Vin on temp board
//connect GND on arduino to GND on temp board
//connect pin 4 on duino to SCL on temp board
//connect pin 5 on duino to SDA on temp board



#include <Adafruit_GPS.h>
#include <SoftwareSerial.h>

#include <Wire.h>
#include "Adafruit_MCP9808.h"



// Connect the GPS Power pin to 5V
// Connect the GPS Ground pin to ground

// If using software serial (sketch example default):
//   Connect the GPS TX (transmit) pin to Digital 8
//   Connect the GPS RX (receive) pin to Digital 7

SoftwareSerial mySerial(8, 7);
Adafruit_GPS GPS(&mySerial);

// Create the MCP9808 temperature sensor object
Adafruit_MCP9808 tempsensor = Adafruit_MCP9808();

// Set GPSECHO to 'false' to turn off echoing the GPS data to the Serial console
// Set to 'true' if you want to debug and listen to the raw GPS sentences
#define GPSECHO  true

// this keeps track of whether we're using the interrupt
// off by default!
boolean usingInterrupt = false;
void useInterrupt(boolean); // Func prototype keeps Arduino 0023 happy

void setup()  
{    
  // connect at 115200 so we can read the GPS fast enuf and
  // also spit it out
  Serial.begin(9600);
  Serial.println("Testing the Adafruit GPS and TEMP sensor");

  // Make sure the sensor is found, you can also pass in a different i2c
  // address with tempsensor.begin(0x19) for example
  if (!tempsensor.begin()) {
    Serial.println("Couldn't find MCP9808!");
//    while (1);
  }
  


  // 9600 NMEA is the default baud rate for MTK - some use 4800
  GPS.begin(9600);
  GPS.sendCommand(PMTK_SET_NMEA_OUTPUT_RMCGGA);
  
  // Set the update rate
  // Note you must send both commands below to change both the output rate (how often the position
  // is written to the serial line), and the position fix rate.
  // 1 Hz update rate
  GPS.sendCommand(PMTK_SET_NMEA_UPDATE_1HZ);
  GPS.sendCommand(PMTK_API_SET_FIX_CTL_1HZ);
  // 5 Hz update rate- for 9600 baud you'll have to set the output to RMC or RMCGGA only (see above)
  //GPS.sendCommand(PMTK_SET_NMEA_UPDATE_5HZ);
  //GPS.sendCommand(PMTK_API_SET_FIX_CTL_5HZ);
  // 10 Hz update rate - for 9600 baud you'll have to set the output to RMC only (see above)
  // Note the position can only be updated at most 5 times a second so it will lag behind serial output.
  //GPS.sendCommand(PMTK_SET_NMEA_UPDATE_10HZ);
  //GPS.sendCommand(PMTK_API_SET_FIX_CTL_5HZ);

  // Request updates on antenna status, comment out to keep quiet
  //GPS.sendCommand(PGCMD_ANTENNA);

  // the nice thing about this code is you can have a timer0 interrupt go off
  // every 1 millisecond, and read data from the GPS for you. that makes the
  // loop code a heck of a lot easier!
  useInterrupt(true);
  
  delay(1000);
}

// Interrupt is called once a millisecond, looks for any new GPS data, and stores it
SIGNAL(TIMER0_COMPA_vect) {
  char c = GPS.read();
  // if you want to debug, this is a good time to do it!
  if (GPSECHO)
    if (c) UDR0 = c;  
    // writing direct to UDR0 is much much faster than Serial.print 
    // but only one character can be written at a time. 
}

void useInterrupt(boolean v) {
  if (v) {
    // Timer0 is already used for millis() - we'll just interrupt somewhere
    // in the middle and call the "Compare A" function above
    OCR0A = 0xAF;
    TIMSK0 |= _BV(OCIE0A);
    usingInterrupt = true;
  } else {
    // do not call the interrupt function COMPA anymore
    TIMSK0 &= ~_BV(OCIE0A);
    usingInterrupt = false;
  }
}


void loop() {
  tempsensor.shutdown_wake(0);   // Don't remove this line! required before reading temp

  // Read and print out the temperature, then convert to *F
  useInterrupt(false);
  float c = tempsensor.readTempC();
//  float f = c * 9.0 / 5.0 + 32;
  Serial.print("$Temp: "); Serial.print(c); Serial.print(" *C\n\r"); 
//  Serial.print(f); Serial.println("*F");
  useInterrupt(true);
  delay(250);
  tempsensor.shutdown_wake(1); // shutdown MSP9808 - power consumption ~0.1 mikro Ampere
  
  delay(750);
}
