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





















//Chart stuff
//In Progress
var arrayOfRandom = [];
var arrayOfRandomTwo = [];
var index = [];
for(var i = 0; i < 2048; i++){
    index.push(i);
    arrayOfRandom.push(Math.random() + 4);
    arrayOfRandomTwo.push(Math.random()+ 4);
}


var canvas = document.getElementById('mychart'),
    ctx = canvas.getContext('2d'),
    startingData = {
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
var stuff = {
    type: 'line',
    data: startingData,
    options: options
};


var myLiveChart = new Chart(ctx, stuff);

setInterval(function(){
  // Get a random index point
  var indexToUpdate = Math.round(Math.random() * 2048);
  
  // Update one of the points in the second dataset
  myLiveChart.data.datasets[0].data[indexToUpdate] = Math.random() * 10;
  
  myLiveChart.update();
}, 1000);


