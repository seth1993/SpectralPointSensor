#include "mbed.h"
#include "I2C.h"

extern volatile char TempCelsiusDisplay[];
extern double tempCelsiusDouble;
void init_temp_sensor();
void check_temp();