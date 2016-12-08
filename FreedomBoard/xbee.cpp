#include <string.h>
#include "xbee.h"


int XBee::Receive(unsigned char *inBuff, int len, unsigned char *outBuff){
    int unescapeLen = 0;
    unsigned char checksum = 0;
    unsigned char LSB = 0;

    if (inBuff[0] != 0x7E)
        return 0;

    if (len < 10)
        return 0;

    unescapeLen = unescape(inBuff, len, outBuff);

    // Check we have at least the amount of bytes indicated by LSB
    LSB = outBuff[2]; 
    if (LSB > (unescapeLen - 4))
        return 0;

    // Calculate our checksum
    // (char will overflow, no need to AND for lower bytes)
    for (int i=3; i<LSB+4; i++){
        checksum += outBuff[i];
    }

    if (checksum != 0xFF)
        return 0;

    return LSB+4;
}


int XBee::Send(unsigned char *msg, int len, unsigned char *outBuff, const uint64_t addr){
    unsigned char buf[len + 15];
    int escapedLen = 0;
    unsigned char checksum = 0;

    buf[0] = 0x7E;
    buf[1] = (len + 11) >> 8;
    buf[2] = len + 11;
    buf[3] = 0x00;  // transmit request
    buf[4] = 0x00;  // Frame ID
    buf[5] = addr >> 56;
    buf[6] = addr >> 48;
    buf[7] = addr >> 40;
    buf[8] = addr >> 32;
    buf[9] = addr >> 24;
    buf[10] = addr >> 16;
    buf[11] = addr >> 8;
    buf[12] = addr;
    buf[13] = 0x01;  // Disable acknowledge
    memcpy(&buf[14], msg, len);

    for (int i=3;i<len+14;i++){
        checksum += buf[i];
    }

    buf[len+14] = 0xFF - checksum;
    escapedLen = escape(buf, len+15, outBuff);

    return escapedLen;
}

int XBee::escape(unsigned char *input, int inLen, unsigned char *output){
    int pos = 1;

    output[0] = input[0];
    for (int i=1; i<inLen; i++){
        switch(input[i]){
            case 0x7D:
            case 0x7E:
            case 0x11:
            case 0x13:
                output[pos++] = 0x7D;
                output[pos++] = input[i] ^ 0x20;
                break;
            default:
                output[pos++] = input[i];
                break;
      }
   }

   return pos;
}

int XBee::unescape(unsigned char *input, int inLen, unsigned char *output){
    int pos = 1;
    bool skip = false;
    unsigned char curr = 0;

    output[0] = input[0];
    for (int i=1; i<inLen; i++) {
        if (skip){
            skip = false;
            continue;
        }

        if (input[i] == 0x7D){
            curr = input[i+1] ^ 0x20;
            skip = true;
        }else{
            curr = input[i];
        }

        output[pos] = curr;
        pos++;
    }

    return pos;
}