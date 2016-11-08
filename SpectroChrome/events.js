

function recieveData(data){
    console.log("Received Data");
}

setInterval(function(){
    sendPacket("alpha@state@off");
}, 5000);