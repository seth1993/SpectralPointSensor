var serialPort = require("browser-serialport");
var SerialPort = require("browser-serialport").SerialPort;
var xbee_api = require("xbee-api");
var main = document.getElementById('main');
var states = new Object();
var xbeeport = [];

document.getElementById("close-ports").onclick = function(){ return reply_click("close-ports")};
document.getElementById("turn-all").onclick = function(){ return reply_click("turn-all")};
//document.getElementById("wave").onclick= function(){return sendPacket("crazy@temp@10.1")};

Toast.defaults.displayDuration=3000;
//Toast.success('Make sure you have an FTDI driver installed on your computer.', "We haven't found anything yet...",{displayDuration: 10000});

//-------------
hideObject('turn-all', 1);
//hideObject("loader", 1);
getCurrentSerialConnections();

//Parse/Send Xbee packets
var xbeeAPI = new xbee_api.XBeeAPI({ api_mode: 2});

//Recieving Data over RF link
xbeeAPI.on("frame_object", function(frame) {
    var data = frame.data + '';
    console.log(JSON.stringify(data));
    one(data);
});

//-------------
// createStateAndComponent({name: "alpha"});

// var j = 0;
// setInterval(function(){
//     console.log(states);
//     if(j > 1 && j < 10){
//         for(var i = 0; i < 31;i++){
//             var a = "alpha@data@" + i + "@8000, 8010, 8020, 8030, 8040,8050, 8060, 8070";
//             one(a);
//         }
//         one("alpha@time@11:31:00");
//     } else if(j > 10){
//         for(var i = 0; i < 31;i++){
//             var a = "alpha@data@" + i + "@48010, 48020, 48020, 48040, 48030,8050, 8060, 8070";
//             one(a);
//         }
//     }
//     j++;
// },3000);
//------------


function one(data){
    var dataArray = data.split('@');

    //If Box is not recognized, create it
    if(!(states[dataArray[0]])){
        createStateAndComponent({name: dataArray[0], state: dataArray[2]});
    }

    //(Either Data/Temp/Integ/State packet type)
    if(dataArray.length > 3 && dataArray[1] == "data"){//Check if data packet
        dataArray[3] = dataArray[3].replace(/[^0-9.,]/g, "");

        if(dataArray[2] == '30'){
            states[dataArray[0]].data += dataArray[3]; 
            var list = (states[dataArray[0]].data).split(",");
            changeData(dataArray[0], list, 0);
            if(states[dataArray[0]].saveboolean){
                changeData(dataArray[0], list, 1);
                states[dataArray[0]].saveboolean = 0;
            }
            states[dataArray[0]].data = [];
        } else if(dataArray[2] == '0') {
            states[dataArray[0]].data = dataArray[3] + ",";  
        } else {
            states[dataArray[0]].data += dataArray[3] + ","
        }  
    } else if(dataArray[1] === "temp"){
        changeTemp({name: dataArray[0], temp: dataArray[2]});
    } else if(dataArray[1] === 'integ'){ 
        changeInteg({name: dataArray[0], integ: dataArray[2]});
    } else if(dataArray[1] === 'state'){
        changeState({name: dataArray[0], state: dataArray[2]});
    } else if(dataArray[1] === 'time'){
        changeTime({name: dataArray[0], time: dataArray[2]});
    }
}

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
        setTimeout(function(){        
            hideObject('turn-all', 0);
            hideObject('loader', 1);
        },2000);
    });
}

function connect(portName, name){
    if(portName.indexOf('/cu') == -1){
        var sp = new SerialPort(portName, {baudrate: 230400}, true);

        sp.on("open", function(){
            console.log("Connected to " + name);
            Toast.info('Connected to Serial Port');

            sp.write("TURN ON", function(err, results) {
                //console.log('FIRST WRITE: ' + err + " " + JSON.stringify(results));
            });

            sp.on("error", function(er){
                console.log("Serial Port Error: " + JSON.stringify(er));
                Toast.error("Serial Port Error");
            });

            sp.on('data', function(data){
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
    for(var i = 0; i < xbeeport.length; i++){
        xbeeport[i].write(xbeeAPI.buildFrame(frame_obj));
    }
}    

function reply_click(id){
    if(id === 'turn-all'){
        hideObject('turn-all', 1);
        hideObject('loader', 0);
        getCurrentSerialConnections();
    } if(id === 'close-ports'){
        chrome.serial.getConnections(function(data){
            for(var i = 0; i < data.length; i++){
                chrome.serial.disconnect(data[i].connectionId, function(){console.log("Closed Serial Port"); Toast.info("Closed Serial Port");});
            }
        });
        xbeeport = [];//Empty local handler list
        states = [];
        main.innerHTML = "";
    }

    var clickFunction = id.split('@', 2);//Array: [0] Name [1] ClickType
    console.log(clickFunction);
    var unit = clickFunction[0];
    
    if(clickFunction[1] === 'absorbleft'){
        console.log("Absorb Left");
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue > .004){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue - .005).toFixed(3);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'absorbright'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue < 1000){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue + .005).toFixed(3);
            sendPacket(unit + "@absorbance@" + currentvalue);
        }
    } else if(clickFunction[1] === 'power'){
        if(states[unit].state === 'OFF'){
            sendPacket(unit + "@state@on");
        } else if(states[unit].state === 'ON'){
            sendPacket(unit + "@state@off");
        }
    } else if(clickFunction[1] === 'set'){
        states[unit].saveboolean = 1;
    }
}

function createStateAndComponent(data){
    var name = data.name;
    states[name] = {name : data.name, temp: 0, integ: 1, state: "ON"};
    htmlObject = '<div id="'+ name +'"> <section> <canvas id="'+name+'mychart" width="700" height="150"></canvas> </section> <section><p class="titlegraph">Intensity vs Wavelength (nm)</p><article> <h4 id="'+name+'@name">'+ name.toUpperCase() +'</h4> <p id="'+name+'@time">00:00:00</p> <p id="'+name+'@temp">70</p><p>°</p><p>  |  SET REFERENCE LINE </p><a id="'+name +'set"><span class="icon-pushpin"></span></a></article></section> </div>';
    main.innerHTML += htmlObject;
    //changeState(name, "OFF");
    //createChart(name);
    //Create Button Handlers
    // document.getElementById(data.name + "@absorbleft").onclick = function(){ return reply_click(data.name + "@absorbleft")};;
    // document.getElementById(data.name + "@absorbright").onclick = function(){ return reply_click(data.name + "@absorbright")};;
    // document.getElementById(data.name + "@power").onclick = function(){ return reply_click(data.name + "@power")};;
    document.getElementById(data.name + "set").onclick = function(){ return reply_click(data.name + "@set")};

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
    htmlTemp.innerText = (parseFloat(info.temp) * (9.0/5.0) + 32).toFixed(1);
}

function changeInteg(info){
    var htmlInteg = document.getElementById(info.name + '@integ');
    htmlInteg.innerText = parseFloat(info.integ).toFixed(3);
}

function changeTime(info){
    var htmlTime = document.getElementById(info.name + '@time');
    htmlTime.innerText = info.time + "";
}

function hideObject(toHide, bool) {
    if(bool){
        var hide = document.getElementById(toHide);
        hide.style.height = 0;
        hide.style.visibility = 'hidden';
        //hide.style.padding = 0;
    } else {
        var hide = document.getElementById(toHide);
        hide.style.height = '30px';
        hide.style.visibility = 'visible';
        //hide.style.padding = '4px';
    }
}

// function changeColor(name, type, color){
//     if(type === 'power'){
//         document.getElementById(name+'1'+type).className = color;
//     }
// };

//Chart Random Array and Chart Defaults
var initialArray = makeArrayZero(217);
var index = makeArray(217);

var options = {
        scales: {
            xAxes: [{
                display: true,
                ticks: {
                    autoSkipPadding: 20
                }
            }],
            yAxes: [{
                ticks: {
                    max: 50000,
                    min: 6000
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

            borderColor: "rgb(52, 152, 219)",
            borderWidth: 1.4,
            data: initialArray,
            fill: false
        },
        {
            borderColor: "rgb(153, 153, 153)",
            borderWidth: 1.4,
            data: [0],
            fill: false
        }
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

function changeData(name,data,arraynumber){
    if(states[name].chart && data){
        console.log(data);
        states[name].chart.data.datasets[arraynumber].data = data;
        states[name].chart.data.labels = makeArray(data.length);
        states[name].chart.update();
    } else {
        console.log("Created Chart");
        createChart(name);
    }
};

function makeArray(num){
    var a = [];
    for(var i = 0; i < num; i++){
        a.push(parseInt(parseFloat(i)/parseFloat(num)*796.0+201));
    }
    return a;
}

function makeArrayZero(num){
    var a = [];
    for(var i = 0; i < num; i++){
        a.push(0);
    }
    return a;
}