#include "mbed.h"
#include "nmea.h"
#include "SDFileSystem.h"
#include "SPI.h"
//#include "xbee.h"
#include "XBeeLib.h"
#include <sstream>
#include <string>

//the number of pixels to read from the spectrometer each read cycle
#define NUM_PIXELS 2048

// Temperatures when to turn on the cooling device, and when to shut off the light source
#define OVERHEATING_TEMP 33.0
#define START_COOLING_TEMP 28.0
#define STOP_COOLING 24.0

//used for parsing strings later
#define BUF_SIZE 1024


// TODO make a new file (name=timestamp) each time we start recording data
#define OUTPUT_FILE "/sd/data.csv"

using namespace std;

//Spectrometer pins
DigitalOut fifo_cs(PTB9, 1);
DigitalOut x_rst(PTA1, 0);
DigitalOut fifo_rst(PTB23, 0);
DigitalIn pixel_rdy(PTA2);
DigitalOut spi_cs(PTC2, 1);
DigitalOut adt_cs(PTC12, 1);
DigitalOut e2_cs(PTD0, 1);


//SPI connection for the spectrometer
SPI spi(PTD2, PTD3, PTD1); // mosi, miso, sclk

//control pins
DigitalOut spectro_ctl(PTC0, 1);
DigitalOut arduino_ctl(PTC9, 1);
DigitalOut light_scr_ttl_ctl(PTC8, 1);
DigitalOut cooler_ctl(PTC1, 0);
DigitalOut pump_ctl(PTB19, 1);
DigitalOut light_src_ctl(PTB18, 1);

// USB serial to PC
Serial pc(USBTX, USBRX);

//struct used to store the most recent GPS, TEMP, and spectrometer readings 
struct data_struct {
    uint16_t integration_time;//the integration time of the spectrometer
    uint16_t data[NUM_PIXELS];//the pixel data storage for spectrometer reads
    string GPRMC;//the string of information read from the GPS
    double temp;//the current temperature as read by the temp board (double)
    string curTime;//the current time as a string, read from the GPS
    string filename;//the name of the file currently being written to
    int readNum;//the number of times this board has been powered on and performed reads
    string ID;//the board ID of this board
    string state;
    int startupTime;//time when system was turned on
    int secondsSinceStartup;//total seconds since sgtartup
} data_s;

//used to initially gather and store the GPS and TEMP data
struct NMEA_data nmea;

// GPS connection (through arduino)
Serial duino(PTC4, PTC3);

/**************************************************
 **          SD FILE SYSTEM                       **
 **************************************************/
SDFileSystem sd(PTE3, PTE1, PTE2, PTE4, "sd");
FILE *fpData;

string device_ID = "Olivia_Noreen";




/**************************************************
 **          Function Prototypes                 **
 **************************************************/
//used to read the GPS and TEMP data from the arduino and temp boards
void arduino_read();

//resets the spectrometer FPGA and FIFO
void globalReset();

//reads the integration time of the spectrometer and prints it to the PC
//FOR DEBUGGING ONLY
void readIntegration();

//sets the integration time of the spectrometer
//for debugging AND UI spectrometer interaction
int setIntegration(unsigned short milliseconds);

//reads the pixels from the spectrometer and stores them in the data struct
int pixel_read();
void perform_setup();
void print_data();
void control_temp();
void xbee_send_spectrometer(int payload_length, int factor);
void writeToFile();//writes all the data we want to save to the file
void readFromFile();//reads the board information from the file to create filenames
void turnSystemOn();//turns on the system / puts the system in fully operational state
void turnSystemOff();//turns off the system / puts the system in low power mode
void xBeeSendState_Temp();//sends the current state and temperature to the home base over the XBee
void timeSinceStartup();//calculates the total time since startup and sets the variable in data_s
void setSecondsSinceStartup();//set the seconds since startup based on the current time



int main()
{  
    stringstream fname;
    perform_setup();//set up the peripherals and serial connections
    
    //TESTING, SET UP THE DATA_S
    data_s.integration_time = 100;
    data_s.GPRMC = "$GPRMC,225446,A,4916.45,N,12311.12,W,000.5,054.7,191194,020.3,E*68";//stores both the temp and the GPS info
    data_s.temp = 23.75;
    data_s.curTime = "00:00:00";
    data_s.readNum = 0;
    data_s.ID = 1;
    
    readFromFile();//read from the BoardID file (or create a new one) to determine board ID
    //set the file to write to here
    fname << "/sd/Board" << data_s.ID << "_" << data_s.curTime[0] << data_s.curTime[1] << "_" << data_s.readNum << ".csv";//modify based on board name found in txt file

    data_s.filename = fname.str();//set the data_s filename
    fpData = fopen(data_s.filename.c_str(), "w+");//create the new file to be written
    fclose(fpData);//close the file to wait for file write input to correct
    
    int j = 0;
    while(true)
    {
        setIntegration(25);
        stringstream ss; 
        pc.printf("reading pixels\n\r"); 
        pixel_read();//read the pixel values and store them in the data struct, also print them to the terminal 
        
        //store the current time, this is used to write to files later on, important to keep here above arduino_read();
        ss << data_s.curTime[0] << data_s.curTime[1] << ":" << data_s.curTime[3] << data_s.curTime[4] << ":" << data_s.curTime[6]  << data_s.curTime[7];
      
        arduino_read();//read the TEMP and GPS from the arduino
        xbee_send_spectrometer(8, 8);
        if (j == 9) {//this variable can be any number, basically how often do we want to update the state and temp readings?
            //XbeeSendState_Temp();
        }

        //The following is test code for the sd file system
        if (j++ == 10) {//counter used to track when to send the temp and state over the XBee
            j = 0;
        }

        if (data_s.curTime[1] != ss.str()[1]) {//if the hour has changed, write to a new file
            stringstream st;
            st << "/sd/Board" << data_s.ID << "_" << ss.str()[0] << ss.str()[1] << "_" << data_s.readNum << ".csv";//the new filename
            data_s.filename = st.str();//set the filename
        } 
      data_s.curTime = ss.str();

      pc.printf("printing data\n\r");
      print_data();
      
      pc.printf("writing to file\n\r");
      
      control_temp();
      writeToFile();
      pc.printf("done\n\r");
      wait_ms(1000);
    }  
}


void setSecondsSinceStartup() {//
//NOTE  this will cause problems if called when there is no GPS lock, make sure GPS is locked before calling
    stringstream ss;
    int hours, minutes, sec;

    ss << data_s.GPRMC[6] << data_s.GPRMC[7] << " " <<  data_s.GPRMC[9] << data_s.GPRMC[10] << " " << data_s.GPRMC[12] << data_s.GPRMC[13]; 
    ss >> hours >> minutes >> sec;
    data_s.startupTime = sec + 60*minutes + 60*24*hours;        
}


void timeSinceStartup() {
//NOTE this has a serious bug between hour rollover, need to add logic to detect when the hour has changed from 11:59:59 to 00:00:00
    stringstream ss;
    int hours, minutes, sec, totalsec;

    ss << data_s.GPRMC[6] << data_s.GPRMC[7] << " " <<  data_s.GPRMC[9] << data_s.GPRMC[10] << " " << data_s.GPRMC[12] << data_s.GPRMC[13]; 
    ss >> hours >> minutes >> sec;
    totalsec = sec + 60*minutes + 60*24*hours;

    if (data_s.startupTime > totalsec) {//midnight rollover has occured
        data_s.secondsSinceStartup = 19439-data_s.startupTime + totalsec;//calculate total time by time from startup to midnight, plus time since midnight
    } else {
        data_s.secondsSinceStartup = totalsec - data_s.startupTime;
    }

}
    
void xBeeSendState_Temp() {//sends the current state and temperature to the home base over the XBee
    stringstream ss;
    
    ss << device_ID + "@state@" << data_s.state;
    //XBeeSend((const char*)ss.str().c_str(), strlen(ss.str())); //Send over Xbee
    ss.str("");
    
    ss << device_ID + "@temp@" << data_s.temp;
    //XBeeSend((const char*)ss.str().c_str(), strlen(ss.str())); //Send over Xbee
    return;
}



void turnSystemOn() {
    data_s.state = "On";//set the state
    setSecondsSinceStartup();
    spectro_ctl.write(1);//turn on the spectrometer
    light_scr_ttl_ctl.write(1);
    pump_ctl.write(1);//turn on the pump
    light_src_ctl.write(1);//turn on the light source
    globalReset();//reset the spectrometer FPGA
    adt_cs.write(1);
}

void turnSystemOff() {
    data_s.state = "Off";//set the state
    spectro_ctl.write(0);//turn off the spectrometer
    light_scr_ttl_ctl.write(0);
    pump_ctl.write(0);//turn off the pump
    light_src_ctl.write(0);//turn off the light source
    //do not turn off the arduino, we want to keepthe GPS lock and power consumption is minimal
}


void readFromFile() {
    FILE* fp;
    pc.printf("Starting file read\n\r");
    fp = fopen("/sd/BoardID.txt", "r+");
    if (fp == NULL) {
        fp = fopen("/sd/BoardID.txt","w+");
        fprintf(fp,"BoardID: 01\nBoardWriteTimes: 00");
        fclose(fp);
        fp = fopen("/sd/BoardID.txt","r+");
    }
    
    pc.printf("HEREfile\n\r");
    int readNum;
    string ID;
    for (int i = 0; i < 9; i++) {
        char c = fgetc(fp);
        pc.printf("%d, %c  ",i,c);
    }
    stringstream sr;
    pc.printf("THEREfile\n\r");
    char c0 = fgetc(fp);
    sr << c0 << (char)fgetc(fp);
    sr >> ID;
    pc.printf("ID: %s\n\r",ID.c_str());
    data_s.ID = ID;
    for (int i = 0; i < 18; i++) {fgetc(fp);}
    stringstream st;
    st << (char)fgetc(fp) << (char)fgetc(fp);
    pc.printf("st is %s",st.str().c_str());
    st >> readNum;    
    data_s.readNum = readNum++;    
    fclose(fp);
    fp = fopen("/sd/BoardID.txt", "w+");
    fprintf(fp,"BoardID: %s\n\rBoardWriteTimes: %d",ID.c_str(),readNum);
    fclose(fp);
}

void writeToFile() {   
    
    fclose(fpData);
    fpData = fopen(data_s.filename.c_str(), "a");    
    fprintf(fpData, "%s,",data_s.curTime.c_str());
    for (int i = 0; i < NUM_PIXELS-1; i++) {
        fprintf(fpData, "%d,",data_s.data[i]);   
    }
    fprintf(fpData, "%d\n\r\n\r",data_s.data[NUM_PIXELS-1]);
    fclose(fpData);
}
    
    


//Logic to control cooler states and ensure safe temperature operation of system
void control_temp()
{
    //pc.printf("controlling...\r\n");
    
    if (data_s.temp > OVERHEATING_TEMP) //Safe limit for system operation (mainly light source)
    {
        pc.printf("way too hot, all turned off...\r\n");
        cooler_ctl = 1;
        spectro_ctl = 0;
        arduino_ctl = 1;
        light_scr_ttl_ctl = 0;
        pump_ctl = 0;
        light_src_ctl = 0;
      
        //Leave the arduino and cooler running until the temperature is under control.
        while(data_s.temp > STOP_COOLING)
        {
            arduino_read();   //Get an update on the temperature
            wait(5);          //  every 5 seconds. Stay in this block until controlled temp reached.
        }
        
        //pc.printf("coming off shutdown...\r\n");
        //Coming off shutdown, turn things back on. Cooler off
        cooler_ctl = 0;
        spectro_ctl = 1;
        arduino_ctl = 1;
        light_scr_ttl_ctl = 1;
        pump_ctl = 1;
        light_src_ctl = 1;
    } 
    else if (cooler_ctl == 0 && data_s.temp > START_COOLING_TEMP) //It's starting to get too hot, cool down the system.
    {
        pc.printf("cool down system...\r\n");
        cooler_ctl = 1;
    } 
    else if (cooler_ctl == 1 && data_s.temp < STOP_COOLING)    //Safe temperature, turn off cooler.
    {
        pc.printf("coming off cooldown...\r\n");
        cooler_ctl = 0;    
    }
}

void xbee_send_spectrometer(int payload_length, int factor){
    //for (int i = 0; i < 2048-1; i++) {  //fill array with numbers
    //   data_s.data[i] = i;    
    //}
    
    int newdata_length = NUM_PIXELS/factor;  //size of compressed array
    uint16_t newdata[newdata_length];  //create new array
    
    for (int i = 0; i < newdata_length - 1; i++){  //iterate through number of elements in new array
        uint16_t data = (data_s.data[factor*i]/8);
        
        for (int j = 0; j < factor - 1; j++){  //add up "factor" of words 
            data += (data_s.data[factor*i+j]/8);
        }
        newdata[i] = data;
    }
    
    
    
    for (int i = 0; i < newdata_length/payload_length - 1; i++){  //iterate through number of packets to be sent
        stringstream ss;
        ss << i;
        string data_index = ss.str();
        string data_string = device_ID + "@data@" + data_index + "@{";
        for (int j = 0; j < payload_length - 1; j++){  //Assemble the packets with payload_length bytes
            string data_string_old = data_string;
            stringstream ss;
            ss << newdata[payload_length*i+j];
            string data_string_new = "";
            if (j == payload_length - 2) {
                data_string_new = ss.str();
            }
            else {
                data_string_new = ss.str() + ", ";
            }
            data_string = data_string_old + data_string_new;
        }
        string data_string_old = data_string;
        data_string = data_string_old + "} \n\r";
        const char *data_string_cstr = data_string.c_str();  //Cast data to string
        XBeeSend((const char *)data_string_cstr, strlen(data_string_cstr)); //Send over Xbee
        ss.str("");
        ss << data_s.temp;
       
        //pc.printf(data_string_cstr);
    }        
}
    
//takes in a 3 lines string, parses it for all the data
void parse(string s) {
//    pc.printf("\n\n\rPARSING the string %s\n\r",s.c_str());
    stringstream ss;
    ss << s;
    while (getline(ss, s)) {
        //File Ideas:
        //open the file up top in setup section
        //write into the same file (don't close it) until an hour has passed
        //have an if to close the file and open a new file
        if (s[1] == 'T') {//TEMP line, grab the temp
            stringstream stoi;//create a stringstream to do int/string conversion
            stoi << s;//put the temp line into stoi
            stoi >> s;//get the TEMP: out
            stoi >> data_s.temp;//store the temperature in C
            //pc.printf("~~~~Temp is %f\n\r",data_s.temp);
         }    
         if (s[3] == 'R') {//we have the GPRMC line
            stringstream time;
            data_s.GPRMC = s;//save the whole string in GPRMC
            time << s[7] << s[8] << ":" << s[9] << s[10] << ":" << s[11] << s[12];//store the time info as a string into the ss
            if (s[8] != data_s.curTime[1]) {//if the time has changed,
            
            //    pc.printf("s[8]: %c, curTime[1]: %c",s[8], data_s.curTime[1]);
                if (fpData != NULL) {fclose(fpData);}
            //    pc.printf("1\n\r");
                stringstream fname;
            //    pc.printf("2\n\r");
                fname << "/sd/" << "Board" << data_s.ID << s[7] << s[8] << ".csv";
            //    pc.printf("3\n\r");
                data_s.filename = fname.str();
                fpData = fopen(data_s.filename.c_str(), "w+");
            
            
                fclose(fpData);
            
            
            
            }
            data_s.curTime = time.str();//store in the data struct
          //  pc.printf("~~~~GPRMC is: %s\n\r~~~~Time is: %s\n\r",data_s.GPRMC, data_s.curTime); 
        }
    }
    
 }


//used to read the GPS and TEMP data from the arduino and temp boards
void arduino_read() {
    //pc.printf("Start GPS Read\n\r");
    char buffer[BUF_SIZE];//used for storing / parsing the input string
    string str = get_line(&duino, buffer, BUF_SIZE);//fill the string with all 3 lines
    //pc.printf("String to Parse is::\n\r\n\r%s",str);
    parse(str);
}

//resets the spectrometer FPGA and FIFO
void globalReset()
{
    wait_ms(100);
    x_rst = 1;   //global reset.
    wait_us(1);
    x_rst = 0;
    wait_ms(100);
}

//reads the integration time of the spectrometer and prints it to the PC
//FOR DEBUGGING ONLY
void readIntegration()
{
    //globalReset();
    spi_cs = 0;
    
    spi.format(8,0);
    spi.write(0x18);    //Read from the integration time register.
    spi.format(16,0);  
    
    data_s.integration_time = spi.write(0x0000);//read the integration time
    pc.printf("Integration time (in milliseconds): %hu\r\n", data_s.integration_time);
    
    spi_cs = 1; 
}

//sets the integration time of the spectrometer
//for debugging AND UI spectrometer interaction
int setIntegration(unsigned short milliseconds)
{
    globalReset();   
    spi_cs = 0;
    
    spi.format(8,0);
    spi.write(0x19);    //Write to the integration time register.
    spi.format(16,0);
    
    spi.write(milliseconds);    
    
    spi_cs = 1;
    readIntegration();//verify that integration was set and update data_struct
    return 0;
}

//reads the pixels from the spectrometer and stores them in the data struct
int pixel_read()
{
    
    fifo_rst = 1;
    wait_us(1);
    fifo_rst = 0;
    wait_us(1); //870ish nanoseconds   
    
    pc.printf("Start reading pixels\n\r");
    int samples_to_avg = 5;
    
    //Clear the data array in the struct
    for (int i = 0; i < 2048; i++) 
        data_s.data[i] = 0;
    
    //Take 5 samples and save the average data.
    for (int avg = 0; avg < samples_to_avg; avg++)
    {
        for (int i = 0; i < 2048; i++) 
        {
            while(!pixel_rdy);  //wait until it goes high
            pc.printf("Pixel\n\r");
            fifo_cs = 0;
            data_s.data[i] += spi.write(0x0000)/samples_to_avg; // write dummy 16 bits just to clock the SPI bus and get data back
            fifo_cs = 1;
        }
    }

    pc.printf("Finished reading pixels\n\r");
    return 0;
}



void perform_setup() {
    setIntegration(100);
    data_s.integration_time = 100;//6ms to start
    globalReset();//reset the spectrometer FPGA
    data_s.state = "On";
    spi.frequency(8000000);//set the SPI connection frequency to 1MHz
    pc.baud(230400); // make sure to set computer TERA Term or pc terminal to 115200 baud
    duino.baud(9600);//set the arduino board connection to 115200 baud
    pc.printf("starting\n\r");

    sd.mount();//mount the SD card for file writing
    XBeeInit(&pc);
}

void print_data() {
    pc.printf("~~Integration Time: %d\n\r",data_s.integration_time);
    pc.printf("~~GPRMC: %s\n\r",data_s.GPRMC.c_str());
    pc.printf("~~Temp: %f\n\r",data_s.temp);
    pc.printf("~~Time: %s\n\r",data_s.curTime.c_str());
    pc.printf("~~FileName: %s\n\r",data_s.filename.c_str());
    pc.printf("~~Data: ");
    for (int i = 0; i < NUM_PIXELS; i++) {
        pc.printf("%d, ",data_s.data[i]);     
    }
}