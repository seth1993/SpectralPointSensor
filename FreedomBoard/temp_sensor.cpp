#include "temp_sensor.h"

/* MCP9808 high accuracy temp sensor from adafruit (no address pins pulled up) */ 
#define MCP9808_REG_TEMP (0x05) // Temperature Register
#define MCP9808_REG_CONF (0x01) // Configuration Register
#define MCP9808_ADDR     (0x30) // MCP9808 base address 0x18<<1
 
I2C i2c(PTE25, PTE24);

char data_write[3];
char data_read[2];
int tempval;

volatile char TempCelsiusDisplay[] = "+abc.dd C";
double tempCelsiusDouble;

void init_temp_sensor() {
    
    wait(3);
    i2c.frequency(10000); // default is 100000
    
    /* Configure the Temperature sensor device MCP9808:
    - Thermostat mode Interrupt not used
    - Fault tolerance: 0
    */
    data_write[0] = MCP9808_REG_CONF;
    data_write[1] = 0x00;  // config msb
    data_write[2] = 0x00;  // config lsb
    int status = i2c.write(MCP9808_ADDR, data_write, 3, 0);
    if (status != 0) { // Error
//        pc.printf("  error status = 0x%08x\r\n", status);
//        while (1) {
//            myled = !myled;
//            wait(0.2);
//        }
    }
    
}

void check_temp() {
    // Read temperature register
    data_write[0] = MCP9808_REG_TEMP;
    i2c.write(MCP9808_ADDR, data_write, 1, 1); // no stop
    i2c.read(MCP9808_ADDR, data_read, 2, 0);

    if(data_read[0] & 0xE0) {
        data_read[0] = data_read[0] & 0x1F;  // clear flag bits
    }
    if((data_read[0] & 0x10) == 0x10) { 
        data_read[0] = data_read[0] & 0x0F;
        TempCelsiusDisplay[0] = '-';
        tempval = 256 - (data_read[0] << 4) + (data_read[1] >> 4);
    } else {
        TempCelsiusDisplay[0] = '+';
        tempval = (data_read[0] << 4) + (data_read[1] >> 4);
    }

    // fractional part (0.25°C precision)
    if (data_read[1] & 0x08) {
        if(data_read[1] & 0x04) {
            TempCelsiusDisplay[5] = '7';
            TempCelsiusDisplay[6] = '5';
        } else {
            TempCelsiusDisplay[5] = '5';
            TempCelsiusDisplay[6] = '0';
        }
    } else {
        if(data_read[1] & 0x04) {
            TempCelsiusDisplay[5] = '2';
            TempCelsiusDisplay[6] = '5';
        }else{
            TempCelsiusDisplay[5] = '0';
            TempCelsiusDisplay[6] = '0';
        }
    }

    // Integer part
    TempCelsiusDisplay[1] = (tempval / 100) + 0x30;
    TempCelsiusDisplay[2] = ((tempval % 100) / 10) + 0x30;
    TempCelsiusDisplay[3] = ((tempval % 100) % 10) + 0x30;
    
    if (TempCelsiusDisplay[0] == '+') {
        sscanf((const char *)TempCelsiusDisplay, "+%lf C", &tempCelsiusDouble);
    } else {
        // negative
        sscanf((const char *)TempCelsiusDisplay, "%lf C", &tempCelsiusDouble);
    }
}


 
