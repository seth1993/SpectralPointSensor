var server = require('./server.js');
var io = require('socket.io')(server);

console.log("Here");

io.on('connection', function (socket){
    socket.emit('client', 'Data recieved');//Send data to user
    socket.on('server', function(data){//Recieving data from user
      console.log(data);
    });
});


// module.exports = { 
//     send:function(json){
//         io.on('connection', function (socket){
//             socket.emit('client', 'Data sending');//Send data to user
//         });
//         a = 3;
//         return a;
//    }
//}