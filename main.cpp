/*
    Starting Point - Microcontroller Code
    -------------------------------------

*/
#include "mbed.h"       //MBED microcontroller
#include "sdCardFile.h" //Methods to write to SD
#include "tempSensor.h" //Read from temp sensor
#include "xBeeLib.h"    //Send data via RF 
#include "spi.h"        //Pins Read/Write
#include "nmea.h"       //GPS/Timestamp

//--------------Pin Setup-----------------
/* 
    A picture of labeled pins can be found at:
    https://developer.mbed.org/platforms/FRDM-K64F/#board-pinout
*/

// Pins for SSR's:
// PTB9 -> Spectrometer
// PTA0 -> Light Source
// PTD0 -> Cooling Unit
DigitalOut spectrometer_ssr(PTB9);
DigitalOut lightsource_ssr(PTA0);
DigitalOut cooling_ssr(PTD0);

// Pins for Light Source TTL
// PTC1  -> Halogen Bulb
// PTB19 -> Deuterium Bulb
// PTB18 -> Shutter Control
DigitalOut halogen_ttl(PTC1);
DigitalOut deuterium_ttl(PTB19);
DigitalOut shutter_ttl(PTB18);

// Pins for Spectrometer
// PTD2 -> Mosi (#8)
// PTD3 -> Miso (#7)
// PTD1 -> Sclk (#9) 
SPI spi(PTD2, PTD3, PTD1); // mosi, miso, sclk

// PTC2 -> spi_cs (#10) 
DigitalOut spi_cs(PTC2);

// PTA1 -> Pixel_rdy (#6)
// PTB23 -> Fifo_cs (#3) 
// PTA2 -> Trigger (#13) 
DigitalIn pixel_rdy(PTA1);
DigitalOut fifo_cs(PTB23);
DigitalOut trigger(PTA2);

// Blinking red LED
DigitalOut led(LED_RED);

// GPS connection (through arduino)
Serial duino(PTC4, PTC3);

// USB serial to PC
Serial pc(USBTX, USBRX);

// Setup SD card
SDFileSystem sd(PTE3, PTE1, PTE2, PTE4, "sd");
FILE *fpData;
//------------------------------------------

//--------------Set Values------------------
#define NUM_PIXELS 2048
#define BUF_SIZE 1024
#define SPECTROMETER_TIMEOUT 1000

// Temperatures when to turn on the cooling device, and when to shut off the light source
#define OVERHEATING_TEMP 33.0
#define START_COOLING_TEMP 28.0

// TODO make a new file (name=timestamp) each time we start recording data
#define OUTPUT_FILE "/sd/data.csv"
//------------------------------------------

void read_pixels()
{
    pc.printf("Start reading pixels\n\r");
    char data[NUM_PIXELS];
    int cycles_waited = 0;
    for (int i = 0; i < NUM_PIXELS; i++) {
        while (!pixel_rdy) {
                cycles_waited++;
                if (cycles_waited > SPECTROMETER_TIMEOUT)
                    break;
            }
        fifo_cs = 0;
        data[i] = spi.write(0x00); // write a dummy byte just to read the data
        fifo_cs = 1;

        if (cycles_waited > SPECTROMETER_TIMEOUT)
            pc.printf("timed out\r\n");
        cycles_waited = 0;
    }

    // write to file and pc
    fpData = fopen(OUTPUT_FILE, "a");
    for (int i = 0; i < NUM_PIXELS; i++) {
        pc.printf(",%d", data[i]);
        fprintf(fpData, ",%d", data[i]);
    }
    pc.printf("\r\n");
    fprintf(fpData, "\r\n");
    fclose(fpData);
    
    pc.printf("Finished reading pixels\n\r");
    XBeeSend((const char *)data, 2048);
}

void gps_read() {
    pc.printf("Start GPS Read\n\r");
    char buffer[BUF_SIZE];
    
    get_nmea(&duino, buffer, BUF_SIZE);

    struct NMEA_data nmea = parse_line(buffer);

    // determine whether there's a lock
    char lock_str[BUF_SIZE];
    if ( nmea.lock_flag == 'A' )
        sprintf(lock_str, "Has lock");
    else
        sprintf(lock_str, "No lock");

    // assemble data into summary string
    char status_str[BUF_SIZE];
    sprintf(status_str, "%02d:%02d:%02d,%d/%d/%d,%dd %lf' %c %dd %lf' %c,%s",
            nmea.hours, nmea.minutes, nmea.seconds,
            nmea.month, nmea.day, nmea.year,
            nmea.latitude, nmea.latitude_minutes, nmea.latitude_direction,
            nmea.longitude, nmea.longitude_minutes, nmea.longitude_direction, lock_str);

    // print to pc, sd card
    pc.printf("%s", status_str);

    fpData = fopen(OUTPUT_FILE, "a");
    fprintf(fpData, "%s", status_str);
    fclose(fpData);
    
    pc.printf("Finish GPS Read\n\r");
    XBeeSend((const char *)status_str, strlen(status_str));
}

nt main()
{
    int ledValue = 0;
    // turn on light source & spectrometer, start with cooling unit off
    lightsource_ssr = 1;
    spectrometer_ssr = 1;
    cooling_ssr = 0;
    
    // Wait a half a second before turning the bulbs on
    // More code be added to only turn these on if everything seems to be working
    wait(0.5f);
    halogen_ttl = 1;
    deuterium_ttl = 1;
    shutter_ttl = 1;
    
    pc.baud(115200); // make sure to set computer TERA Term or whatever to 115200 baud!!!
    duino.baud(9600);
    pc.printf("Initializing ...\r\n");

    XBeeInit(&pc);
    fifo_cs = 1;
    trigger = 0;
    wait(0.5f);
    
    init_temp_sensor(); // TODO: stop execution & send error message if can't init temp sensor (or other things)


    while (true) {
        pc.printf("Begin Loop\n\r");
        led = ledValue;
        ledValue = !ledValue;

        gps_read();
        pc.printf("Start reading temp\n\r");
        check_temp();
        pc.printf("Finish reading temp\n\r");
        // Display result
        pc.printf(",%s", TempCelsiusDisplay);
        fpData = fopen(OUTPUT_FILE, "a");
        fprintf(fpData, ",%s", TempCelsiusDisplay);
        fclose(fpData);

                // Trigger an acquisition from spectrometer
        trigger = 1;
        wait_ms(1);
        trigger = 0;
        read_pixels();
        
        if (tempCelsiusDouble > OVERHEATING_TEMP) {
            // Turn off the bulbs and the shutter
            halogen_ttl = 0;
            deuterium_ttl = 0;
            shutter_ttl = 0;
            // turn off light source & spectrometer
            lightsource_ssr = 0;
            spectrometer_ssr = 0;
            cooling_ssr = 1;
            pc.printf("Overheating, now shutting off\n\r");
            
            // spin here -- just need to cool off.
            // Can turn back on if you want by breaking out of this loop.
            // For now just turn off forever.
            while (1);
        } 
        
        if (tempCelsiusDouble > START_COOLING_TEMP) {
            // turn on cooling
            pc.printf("Turning on cooling\n\r");
            cooling_ssr = 1;
        } else {
            // turn off cooling
            pc.printf("Turning off cooling\n\r");
            cooling_ssr = 0;
        }   
        
        pc.printf("End loop, waiting\n\r");
        wait(0.5f);
    }
}