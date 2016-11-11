var serialPort = require("browser-serialport");
var SerialPort = require("browser-serialport").SerialPort;
var xbee_api = require("xbee-api");
var main = document.getElementById('main');
var states = new Object();
var xbeeport = [];

//ToDo
//-Make graph stay consistent even with missing data
//-Seemless connection to usb port even on close reopen
//-Update time and temp


Toast.defaults.displayDuration=3000;
//Toast.success('Make sure you have an FTDI driver installed on your computer.', "We haven't found anything yet...",{displayDuration: 10000});

hideObject('turn-all', 1);
getCurrentSerialConnections();

//Parse/Send Xbee packets
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2});


//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    var dataArray = data.split('@');
    console.log(JSON.stringify(dataArray));
    if(!(states[dataArray[0]])){
        createStateAndComponent({name: dataArray[0], state: dataArray[2]});
    }
    if(dataArray.length > 3){
      if(dataArray[1] === "data"){
        dataArray[3] = dataArray[3].replace(/[^0-9.,]/g, "");
        if(dataArray[2] === '0'){
          states[dataArray[0]].data = " ";
          states[dataArray[0]].data += dataArray[3];
        } else if(dataArray[2] === '30'){
          states[dataArray[0]].data += "," + dataArray[3];
          var list = states[dataArray[0]].data.split(",");
          changeData(dataArray[0], list);
        } else {
          states[dataArray[0]].data += "," + dataArray[3];  
        }   
      } else if(dataArray[1] === 'temp' ){
        changeTemp({name: dataArray[0], temp: dataArray[2]});
      } else if(dataArray[1] === 'integ'){ 
        changeInteg({name: dataArray[0], integ: dataArray[2]});
      } else if(dataArray[1] === 'state'){
        changeState({name: dataArray[0], state: dataArray[2]});
      }
    }
});

function getCurrentSerialConnections(){
    serialPort.list(function (err, ports) {
        console.log("Serial Port List:");
        ports.forEach(function(port) {
            console.info(JSON.stringify(port));
            if(port.vendorId === '0x403'){
                connect(port.comName, "Xbee");
            }if(port.vendorId === '0xd28'){
                connect(port.comName, "FRDM Board");
            }
        });
    });
}

function connect(portName, name){
    if(portName.indexOf('/cu') == -1){
        var sp = new SerialPort(portName, {baudrate: 230400}, true);

        sp.on("open", function(){
            console.log("Connected to " + name);
            Toast.info('Connected to Serial Port');
            hideObject('turn-all', 1);
            hideObject('loader', 0);

            sp.write("TURN ON", function(err, results) {
                console.log('FIRST WRITE: ' + err + " " + JSON.stringify(results));
            });

            sp.on("error", function(er){
                console.log("Serial Port Error: " + JSON.stringify(er));
                Toast.error("Serial Port Error");
            });

            sp.on('data', function(data){
                console.log(" " + data);
                if(name = 'Xbee'){
                    xbeeAPI.parseRaw(data);
                }
            });
        });

        xbeeport.push(sp);
    }
}

function sendPacket(dataToSend){
    var frame_obj = {
        type: 0x11, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST 
        id: 0x01, // optional, nextFrameId() is called per default 
        destination64: "000000000000ffff", // default is broadcast address 
        destination16: "fffe", // default is "fffe" (unknown/broadcast) 
        sourceEndpoint: 0x00,
        destinationEndpoint: 0x00,
        clusterId: "1554",
        profileId: "C105",
        broadcastRadius: 0x00, // optional, 0x00 is default 
        options: 0x00, // optional, 0x00 is default 
        data: dataToSend // Can either be string or byte array. 
    };
}    

function reply_click(id){
    if(id === 'turn-all'){
        console.log("Here");
        hideObject('turn-all', 1);
        hideObject('loader', 0);
        getCurrentSerialConnections();
    }

    var clickFunction = id.split('@', 2);//Array [0] Name [1] ClickType
    var unit = clickFunction[0];
    
    if(clickFunction[1] === 'absorbleft'){
        console.log("Absorb Left");
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue > .2){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue - .1).toFixed(2);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'absorbright'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue < 1000){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue + .1).toFixed(2);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'power'){
        if(states[unit].state === 'OFF'){
            sendPacket(unit + "@state@on");
        } else if(states[unit].state === 'ON'){
            sendPacket(unit + "@state@off");
        }
    }
}

function createStateAndComponent(data){
    var name = data.name;
    states[name] = {name : data.name, temp: 72, integ: 1, state: "OFF"};
    htmlObject = '<div id="'+ name +'"> <section> <canvas id="'+name+'mychart" width="700" height="150"></canvas> </section> <section> <article> <a id="'+name+'1power"> <span id="'+name+'@power" onClick="reply_click(this.id)" class="icon-switch"></span> </a> <h4 id="'+name+'@name">'+ name.toUpperCase() +'</h4> <p id="'+name+'@time">00:00:00</p> <p id="'+name+'@temp">70</p> <p>°</p> </article> <article> <p>INTEG:</p> <span id="'+name+'@absorbleft" onClick="reply_click(this.id)" class="icon-circle-left"></span> <p id="'+name+'@absorbance">01.00</p> <span id="'+name+'@absorbright" onClick="reply_click(this.id)" class="icon-circle-right"></span> <p>SEC</p> </article> <article> <p>TEST:</p> <textarea id="'+name+'@filename">101716_03:44:20_01.csv</textarea> </article> </section> </div>';
    main.innerHTML += htmlObject;
    changeState(name, "OFF");
    createChart(name);
}

function changeState(name, newState){
    if(newState === 'OFF'){
        changeColor(name, 'power', 'off');
    }if(newState === 'ON'){
        changeColor(name, 'power', 'on');
    }if(newState === 'ERROR'){
        //Figure out
    }if(states[name]){
        states[name].state = newState;
    }
}

function changeTemp(info){
    var htmlTemp = document.getElementById(info.name + '@temp');
    htmlTemp.innerHTML = parserFloat(info.temp) * (9.0/5.0) + 32;
}

function hideObject(toHide, bool) {
    if(bool){
        var hide = document.getElementById(toHide);
        hide.style.height = 0;
        hide.style.visibility = 'hidden';
        hide.style.padding = 0;
    } else {
        var hide = document.getElementById(toHide);
        hide.style.height = '30px';
        hide.style.visibility = 'visible';
        //hide.style.padding = '4px';
    }
}

function changeColor(name, type, color){
    if(type === 'power'){
        document.getElementById(name+'1'+type).className = color;
    }
};

//Chart Random Array and Chart Defaults
var arrayOfRandom = [];
var arrayOfRandomTwo = [];
var index = [];
for(var i = 0; i < 2048; i++){
    index.push(i);
    arrayOfRandom.push(0);
    arrayOfRandomTwo.push(Math.random()+ 4);
}

var options = {
        scales: {
            xAxes: [{
                display: true,
                ticks: {
                    autoSkipPadding: 20
                }
            }]
        },
        elements: {
            point: {
                radius: 0
            }
        },
        legend: {
            display: false
        },
        defaultColor: "rgb(255, 255, 255)",
        defaultFontColor: "rgb(253, 253, 253)",
        defaultFontSize: "16px"
};

var startingData = {
    type: 'line',
    labels: index,
    datasets: [
        {
            backgroundColor: "rgb(246, 246, 246)",
            data: arrayOfRandom
        }/*,
        {
            fillColor: "rgba(151,187,205,0.2)",
            strokeColor: "rgba(151,187,205,.1)",
            pointColor: "rgba(151,187,205,.1)",
            pointStrokeColor: "#fff",
            data: arrayOfRandomTwo
        }*/
    ]
};

var details = {
    type: 'line',
    data: startingData,
    options: options
};

function createChart(name){
    var canvas = document.getElementById(name + 'mychart');
    var ctx = canvas.getContext('2d');
    states[name].chart = new Chart(ctx, details);
}

function changeData(name,data){
    if(states[name].chart && data){
        states[name].chart.data.datasets[0].data = data;
        states[name].chart.data.labels = makeArray(data.length);
        states[name].chart.update();
    } else {
        createChart(name);
    }
};

function makeArray(num){
    var a = [];
    for(var i = 0; i < num; i++){
        a.push(i);
    }
    return a;
}
