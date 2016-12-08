#include "XBeeLib.h"
#include "xbee.h"

#define UINT64(msb,lsb)     (uint64_t)(((uint64_t)(msb) << 32) | (lsb))

#define REMOTE_NODE_ADDR64_MSB  ((uint32_t)0x0013A200)
#define REMOTE_NODE_ADDR64_LSB  ((uint32_t)0x41030E8A)
#define REMOTE_NODE_ADDR64      UINT64(REMOTE_NODE_ADDR64_MSB, REMOTE_NODE_ADDR64_LSB)

#define XBEE_BAUD_RATE 230400

#define MAX_BYTES 256
#define MAX_SIZE 512

Serial *log_serial;
XBee xbee;
Serial xbeeSerial(D1, D0); 

int frameID = 0;

void send_data_to_remote_node(char *data, int frame, int framePart, int length)
{
    unsigned char outFrame[MAX_SIZE];
    int frameLen = xbee.Send((unsigned char*)data, length, outFrame, REMOTE_NODE_ADDR64);
    
    //log_serial->printf("Message prepared to send\r\n");
    
    for (int i = 0; i < frameLen; i++) {
//        log_serial->printf("%02x ", outFrame[i]);
        xbeeSerial.putc(outFrame[i]);
    }
//    log_serial->printf("\r\n");
    //log_serial->printf("Message finished sending\r\n");
}

void XBeeInit(Serial *pcLogger)
{
    log_serial = pcLogger;
    xbeeSerial.baud(XBEE_BAUD_RATE);
}

void XBeeSend(const char *message, int length)
{
    //xbeeSerial.printf(message);
    int framePart = 0;
    for (int i = 0; i < length; i += MAX_BYTES) {
        //log_serial->printf("partition at %d\r\n", i);
        int arraySize = length - i;
        if (arraySize > MAX_BYTES + 1)
            arraySize = MAX_BYTES + 1;
            
        char partition[arraySize];
        int j;
        for (j = i; ((j - i) < MAX_BYTES) && (j < length); j++) {
            partition[j-i] = message[j];
        }
        
        send_data_to_remote_node(partition, frameID, framePart, j-i);
        
        wait_ms(25);
        
    }
    
    frameID++;
    //log_serial->printf("Test Message");
}

void XBeeDestroy()
{
    
}