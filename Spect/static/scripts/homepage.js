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





var arrayOfRandom = [];
var arrayOfRandomTwo = [];
var index = [];
for(var i = 0; i < 1000; i++){
    index.push(i);
    arrayOfRandom.push(Math.random()* 4);
    arrayOfRandomTwo.push(Math.random()* 4);
}


var canvas = document.getElementById('mychart'),
    ctx = canvas.getContext('2d'),
    startingData = {
      type: 'line',
      labels: index,
      datasets: [
          {
              fillColor: "rgba(220,220,220,0.2)",
              strokeColor: "rgba(220,220,220,.1)",
              pointColor: "rgba(220,220,220,.1)",
              pointStrokeColor: "#fff",
              data: arrayOfRandom
          },
          {
              fillColor: "rgba(151,187,205,0.2)",
              strokeColor: "rgba(151,187,205,.1)",
              pointColor: "rgba(151,187,205,.1)",
              pointStrokeColor: "#fff",
              data: arrayOfRandomTwo
          }
      ]
    };
var stuff = {
    type: 'line',
    data: startingData
};

var options = {
        scales: {
            gridLines: [{
                display: false
            }]
        },
        elements: {
            point: {
                radius: 0
            }
        }
};

// Reduce the animation steps for demo clarity.
var myLiveChart = new Chart(ctx, stuff);
myLiveChart.options.elements.point.radius = 0;

setInterval(function(){
  // Get a random index point
  var indexToUpdate = Math.round(Math.random() * 1000);
  
  // Update one of the points in the second dataset
  myLiveChart.data.datasets[1].data[indexToUpdate] = Math.random() * 100;
  
  myLiveChart.update();
}, 1000);


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