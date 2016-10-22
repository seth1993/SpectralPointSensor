
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
    changeState('ALPHA', 'ON');
    //changeState('BRAVO', 'RUN');
    createChart(['ALPHA']);
});

// play.addEventListener('click', function(){

// });

function reply_click(id){
    console.log(id);
}