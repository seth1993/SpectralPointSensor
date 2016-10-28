/*
    Events.js
        Search and Settings are static buttons
        All other buttons are handled by reply_click 

*/
var search = document.getElementById('search');
var settings = document.getElementById('settings');
var states = new Object();

function setDeviceSettings(name, state){
    states[name] = state;
}

search.addEventListener('click', function(){
    console.log("Finding Devices");
    //Send Request to Server
    //socket.emit('server', 'currentunits');
    sendDataToServer('finddevices');

});

settings.addEventListener('click', function(){
    changeState('ALPHA', 'ON');
    changeState('BRAVO', 'RUN');
    createChart(['ALPHA']);
});


function reply_click(id){
    var clickFunction = id.split('@', 2);//Array [0] Name [1] ClickType
    var unit = clickFunction[0];

    if(clickFunction[1] == 'templeft'){
        var currentvalue = parseInt(document.getElementById(unit+'@settemp').innerText);
        if(currentvalue > 1){
            document.getElementById(unit + '@settemp').innerText = currentvalue - 1;
        }

    } else if(clickFunction[1] === 'tempright'){
        var currentvalue = parseInt(document.getElementById(unit+'@settemp').innerText);
        if(currentvalue < 100){
            document.getElementById(unit + '@settemp').innerText = currentvalue + 1;
        }

    } else if(clickFunction[1] === 'absorbleft'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue > .2){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue - .1).toFixed(2);
        }
    } else if(clickFunction[1] === 'absorbright'){
        var currentvalue = parseFloat(document.getElementById(unit+'@absorbance').innerText);
        if(currentvalue < 1000){
            document.getElementById(unit + '@absorbance').innerText = (currentvalue + .1).toFixed(2);
        }
    } else if(clickFunction[1] === 'play' && states[unit] === 'ON'){
            var state = {state: 'RUN', name: unit};
            sendDataToServer(state);
    } else if(clickFunction[1] === 'stop' && states[unit] === 'RUN'){
            var state = {state: 'ON', name: unit};
            sendDataToServer(state);
    } else if(clickFunction[1] === 'power'){
        if(states[unit] === 'OFF'){
            var state = {state: 'ON', name: unit};
            sendDataToServer(state);
        } else if(states[unit] === 'ON'){
            var state = {state: 'OFF', name: unit};
            sendDataToServer(state);
        }
    }
}