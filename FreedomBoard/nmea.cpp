#include "nmea.h"
#include <sstream>
#define GPS_TIMEOUT 10000

Serial pd(USBTX, USBRX);
uint16_t timer;


string get_line(Serial *s, char *buffer, int buflen)
{
    stringstream ss;
    char *end = buffer + buflen - 1; /* Allow space for null terminator */
    char *dst = buffer;
    char c = s->getc();
    int lineCount = 0;
        
    while (c != '$') {
        pd.printf("%c", c);
        c = s->getc();
    }
    
    
    while (dst < end && lineCount <3) {
        dst++;
        ss << c;
        c = s->getc();
        if (c == '\n') {
            lineCount++;
        }
    }
    pd.printf("STRINGSTREAM IS:\n\r%s\n\n\r",ss.str().c_str());

return ss.str();    
}

bool StartsWith(const char *a, const char *b)
{
   if(strncmp(a, b, strlen(b)) == 0) return 1;
   return 0;
}

void get_nmea(Serial *s, char *buffer, int buflen)
{
    //do {
        get_line(s, buffer, buflen);
        return;  
    //} while (!StartsWith(buffer, "$GPRMC"));
}

struct NMEA_data empty_nmea()
{
    struct NMEA_data ret = { };
    return ret;
}

struct NMEA_data parse_line(char *str, NMEA_data& nmea)
{

      //  pd.printf("PARSING LINE: %s\n\r",str);

    char line_begin[] = "$GPRMC,";
    char templine_begin[] = "Temp:";

    if (StartsWith(str, templine_begin)) {
        nmea.TempC = str;
        return nmea;
    }
  
    //if (!StartsWith(str, line_begin))
    //    return empty_nmea();
    // Else, continue to parse the line
    char* str_ptr = line_begin + strlen(line_begin);
    
    // Now parse the rest of the line
    sscanf(str, "$GPRMC,%2d%2d%2d.000,%c,%2d%lf,%c,%3d%lf,%c,%lf,%lf,%2d%2d%2d", 
        &nmea.hours, &nmea.minutes, &nmea.seconds, &nmea.lock_flag, 
        // latitude
        &nmea.latitude, &nmea.latitude_minutes, &nmea.latitude_direction,
        // longitude
        &nmea.longitude, &nmea.longitude_minutes, &nmea.longitude_direction,
        // bearing
        &nmea.speed, &nmea.tracking_angle,
        // date
        &nmea.day, &nmea.month, &nmea.year );
      
    if (nmea.lock_flag != 'A') {
        // No lock -- get rid of garbage data (everything except time)
        nmea.latitude = 0;
        nmea.latitude_minutes = 0.00;
        nmea.latitude_direction = 'N';
        
        nmea.longitude = 0;
        nmea.longitude_minutes = 0.00;
        nmea.longitude_direction = 'E';
        
        nmea.speed = 0.00;
        nmea.tracking_angle = 0.00;
        
        nmea.day = 0;
        nmea.month = 0;
        nmea.year = 0;
    }

    return nmea;
}
