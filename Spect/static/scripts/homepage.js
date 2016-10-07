console.log("homepage.js added");

var socket = io.connect('http://localhost:3000');
socket.on('client', function (data) {
    //readIncomingData(data);
    console.log(data);
    //socket.emit('server', { commandFromClient: 'data' });
    var co = document.getElementById("console");
    var json = data;
    if(json.command && json.message){
        var addedstring = json.command.toString().toUpperCase() + ":  \t" + json.message + " \n";
        var para = document.createElement("p");
        var node = document.createTextNode(addedstring);
        para.appendChild(node);
        co.appendChild(para);
    }
});

//unit
//command 
//message

createBlock(1);

var unitone;//One for now
var block = document.getElementById("one").style.visibility;

function readIncomingData(json) {
    if(json.name === unitone){
        //Get Command 
        var console = document.getElementById("console");
        if(json.command && json.message){
            var addedstring = json.command.toString().toUpperCase() + ":  \t" + json.message + " \n";
            var para = document.createElement("p");
            var node = document.createTextNode(addedstring);
            para.appendChild(node);
            console.appendChild(para);
        }
    } else {
        unitone = json.name;
        block = "visible";
        createBlock(1);
    }
}




function createBlock(json){
    var smoothie = new SmoothieChart();
    smoothie.streamTo(document.getElementById("mycanvas"));

    // Data
    var line1 = new TimeSeries();
    // Add a random value to each line every second
    setInterval(function() {
        line1.append(new Date().getTime(), Math.random());
    }, 1000);

    // Add to SmoothieChart
    smoothie.addTimeSeries(line1);
    smoothie.streamTo(document.getElementById("mycanvas"), 1000 /*delay*/);
}