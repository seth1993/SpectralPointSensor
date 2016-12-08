#include "mbed.h"
#include <string>
using namespace std;

// latitude is N/S, has 2 digits
// longitude is E/W, has 3 digits
struct NMEA_data {
    // time
    int hours;
    int minutes;
    int seconds;
    
    // date
    int day;
    int month; 
    int year;
    
    // location
    int longitude;
    double longitude_minutes;
    char longitude_direction;
    int latitude;
    double latitude_minutes;
    char latitude_direction;
    
    // A = active (has lock), V = void (no lock)
    char lock_flag;
    
    // bearing
    double speed;
    double tracking_angle;
    
    
    /*****///Added
    char* TempC;
    
};

void get_nmea(Serial *s, char *buffer, int buflen);
string get_line(Serial *s, char *buffer, int buflen);

struct NMEA_data empty_nmea();

struct NMEA_data parse_line(char *str, NMEA_data& nmea);
