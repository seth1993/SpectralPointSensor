var socket = io.connect('http://localhost:3000');
var co = document.getElementById("console");
var main = document.getElementById('main');


socket.on('client', function (data) {
    console.log(data);
    readIncomingData(data);
});


function sendDataToServer(dataToSend) {
    socket.emit('server', dataToSend);
}

function readIncomingData(data){
    if(data.devices){
        for(var i = 0; i < data.devices.length; i++){
            createComponent(data.devices[i]);
            console.log('Create');
        }
    } if(data.command && data.message){
        var addedstring = data.command.toString().toUpperCase() + ":  \t" + data.message + " \n";
        var para = document.createElement("p");
        var node = document.createTextNode(addedstring);
        para.appendChild(node);
        co.appendChild(para);
    }
}

function createComponent(name){
    var htmlObject = '<div id="'+ name +'"><section><span id="'+name+'power" onClick="reply_click(this.id)" class="icon-switch"></span><article><h4 id="'+name+'name" onClick="reply_click(this.id)">'+ name +'</h4><span id="'+ name +'play" onClick="reply_click(this.id)" class="icon-play3"></span><span id="'+name+'stop" onClick="reply_click(this.id)" class="icon-stop2"></span></article><article><p id="'+name+'time">00:00:00</p></article><article><p>TEMP:</p><span id="'+name+'templeft" onClick="reply_click(this.id)" class="icon-circle-left"></span><p id="'+name+'settemp">72</p><span id="'+name+'tempright" onClick="reply_click(this.id)" class="icon-circle-right"></span><p id="'+name+'temp">70</p><p>°</p></article><article><p>FILE NAME OF TEST:</p><textarea id="'+name+'filename">101716_03:44:20_01.csv</textarea></article><article><p>ABSORB:</p><span id="'+name+'absorbleft" onClick="reply_click(this.id)" class="icon-circle-left"></span><p id="'+name+'absorbance">01.00</p><span id="'+name+'absorbright" onClick="reply_click(this.id)" class="icon-circle-right"></span><p>sec</p></article></section><section><canvas id="'+name+'mychart" width="700" height="200"></canvas></section></div>';
    main.innerHTML += htmlObject;
    //hideObject(name + 'play');
    hideObject(name + 'stop', 1);
    changeColor(name + 'power', 'red');
    createChart(name + 'mychart');
}

function hideObject(toHide, bool) {
    if(bool){
        var hide = document.getElementById(toHide);
        hide.style.width = 0;
        hide.style.visibility = 'hidden';
        hide.style.padding = 0;
    } else {
        var hide = document.getElementById(toHide);
        hide.style.width = 30;
        hide.style.visibility = 'visible';
        hide.style.padding = 4;
    }
}

function changeColor(colorChange, color){
    var element = document.getElementById(colorChange);
    element.style.color = color;
}


//I need to probably save state on 
function changeState(name, state){
    if(state === 'OFF'){
        hideObject(name + 'stop', 1);
        changeColor(name + 'power', 'red');
    }if(state === 'ON'){
        changeColor(name + 'power', 'green');
        changeColor(name + 'play', 'lightgreen');
    }if(state === 'RUN'){
        hideObject(name + 'play', 1);
        hideObject(name + 'stop', 0);
        changeColor(name + 'stop', 'black')
    }if(state === 'ERROR'){
        //Figure out
    }
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

function createChart(idOfChart){
    var canvas = document.getElementById(idOfChart);
    var ctx = canvas.getContext('2d');
    var myLiveChart = new Chart(ctx, stuff);
    setInterval(function(){
        var indexToUpdate = Math.round(Math.random() * 2048);
        myLiveChart.data.datasets[0].data[indexToUpdate] = Math.random() * 10; 
        myLiveChart.update();
    }, 1000);
}







