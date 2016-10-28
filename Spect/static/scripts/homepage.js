var socket = io.connect('http://localhost:3000');
var co = document.getElementById("console");
var main = document.getElementById('main');
var graphs = [];

sendDataToServer('finddevices');

socket.on('client', function (data) {
    console.log(data);
    readIncomingData(data);
});


function sendDataToServer(dataToSend) {
    socket.emit('server', dataToSend);
}


//Important: Seperates Incoming Server Data into different concerns
function readIncomingData(data){
    if(data.devices){
        createComponent(data.devices);
    } if(data.command && data.message){
        var addedstring = data.command.toString().toUpperCase() + ":  \t" + data.message + " \n";
        var para = document.createElement("p");
        var node = document.createTextNode(addedstring);
        para.appendChild(node);
        co.appendChild(para);
    } if(data.command === 'data'){
        changeData(data.message);
    } if(data.state){
        changeState(data.name, data.state);
    }
}


function createComponent(graphs){
    main.innerHTML = '';
    for(var i = 0; i < graphs.length; i++){
        var name = graphs[i].name.toUpperCase();
        var htmlObject = '<div id="'+ name +'"><section><a id="'+name+'1power"><span id="'+name+'@power" onClick="reply_click(this.id)" class="icon-switch"></span></a><h4 id="'+name+'@name" >'+ name +'</h4><article><a id="'+ name +'1play" ><span id="'+name+'@play" onClick="reply_click(this.id)" class="icon-play3"></span></a><a id="'+name+'1stop" ><span id="'+name+'@stop" onClick="reply_click(this.id)" class="icon-stop2"></span></a></article><article><p id="'+name+'@time">00:00:00</p></article><article><p>TEMP:</p><span id="'+name+'@templeft" onClick="reply_click(this.id)" class="icon-circle-left"></span><p id="'+name+'@settemp">72</p><span id="'+name+'@tempright" onClick="reply_click(this.id)" class="icon-circle-right"></span><p id="'+name+'@temp">70</p><p>°</p></article><article><p>FILE NAME OF TEST:</p><textarea id="'+name+'@filename">101716_03:44:20_01.csv</textarea></article><article><p>INTEG:</p><span id="'+name+'@absorbleft" onClick="reply_click(this.id)" class="icon-circle-left"></span><p id="'+name+'@absorbance">01.00</p><span id="'+name+'@absorbright" onClick="reply_click(this.id)" class="icon-circle-right"></span><p>sec</p></article></section><section><canvas id="'+name+'mychart" width="700" height="200"></canvas></section></div>';
        main.innerHTML += htmlObject;
        changeState(name, graphs[i].state);
    }
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
        hide.style.padding = '4px';
    }
}

function changeColor(name, type, color){
    if(type === 'play'){
        document.getElementById(name+'1'+type).className = color;
    } if(type === 'stop'){
        document.getElementById(name+'1'+type).className = color;
    } if(type === 'power'){
        document.getElementById(name+'1'+type).className = color;
    }
};


//I need to probably save state on 
function changeState(name, state){
    if(state === 'OFF'){
        hideObject(name + '1stop', 1);
        hideObject(name + '1play', 0);
        changeColor(name, 'power', 'off');
        changeColor(name, 'play', 'lightgrey');
    }if(state === 'ON'){
        hideObject(name + '1stop', 1);
        hideObject(name + '1play', 0);
        changeColor(name, 'power', 'on');
        changeColor(name, 'play', 'green');
    }if(state === 'RUN'){
        hideObject(name + '1play', 1);
        hideObject(name + '1stop', 0);
        changeColor(name, 'power', 'lightgrey');
        changeColor(name, 'stop', 'red');
    }if(state === 'ERROR'){
        //Figure out
    }
    setDeviceSettings(name, state);
}

//Chart Random Array and Chart Defaults
var arrayOfRandom = [];
var arrayOfRandomTwo = [];
var index = [];
for(var i = 0; i < 2048; i++){
    index.push(i);
    arrayOfRandom.push(Math.random() + 4);
    arrayOfRandomTwo.push(Math.random()+ 4);
}

var options = {
        scales: {
            xAxes: [{
                display: false
            }]
        },
        elements: {
            point: {
                radius: 0
            }
        },
        legend: {
            display: false
        }
};

var startingData = {
    type: 'line',
    labels: index,
    datasets: [
        {
            backgroundColor: "rgba(0,4,128)",
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

var stuff = {
    type: 'line',
    data: startingData,
    options: options
};



var myLiveChart;

function createChart(graphs){
    for(var i = 0; i < graphs.length; i++){
        var canvas = document.getElementById(graphs[i]+ 'mychart');
        var ctx = canvas.getContext('2d');
        myLiveChart = new Chart(ctx, stuff);
    }
}


function changeData(data){
    //var indexToUpdate = Math.round(Math.random() * 2048);
    //myLiveChart.data.datasets[0].data[indexToUpdate] = Math.random() * 10; 
    myLiveChart.data.datasets[0].data = data;
    myLiveChart.update();
};


