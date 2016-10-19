
var search = document.getElementById('search');
var settings = document.getElementById('settings');
//var play = document.getElementById('play');

search.addEventListener('click', function(){
    console.log("Finding Devices");
    //Send Request to Server
    //socket.emit('server', 'currentunits');
    sendDataToServer('finddevices');
});

settings.addEventListener('click', function(){

});

// play.addEventListener('click', function(){

// });

