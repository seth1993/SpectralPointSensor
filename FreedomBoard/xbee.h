#ifndef XBEE_H
#define XBEE_H

#include "mbed.h"

#define MAX_MESSAGE 256

class XBee {
    public:
        XBee(){;}
        ~XBee(){;}
        
        enum receive_state { INIT, LENGTH, TYPE, ADDR_LONG, ADDR_SHORT, OPTIONS, MESSAGE, CHECKSUM };
        
        int Receive(unsigned char *inbuf, int len, unsigned char *outbuf);
        int Send(unsigned char *buf, int len, unsigned char *outbuf, uint64_t addr);
    private:
        int escape(unsigned char *input, int inlen, unsigned char *output);
        int unescape(unsigned char *input, int inlen, unsigned char *output);
};
#endif