#ifndef XBEE_LIB_H
#define XBEE_LIB_H

#include "mbed.h"

void XBeeInit(Serial *pcLogger);

void XBeeSend(const char *message, int length);

void XBeeDestroy();

#endif