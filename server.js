const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(__dirname));
let rooms = {};

io.on('connection', (socket) => {
    let currentRoom = null;
    let mySpectatorNumber = null;

    socket.on('join-room', (roomCode) => {
        currentRoom = roomCode.trim().toLowerCase();
        socket.join(currentRoom);
        if (!rooms[currentRoom]) {
            rooms[currentRoom] = { red: null, black: null, userCount: 0, nextSpecNumber: 1 };
        }
        rooms[currentRoom].userCount++;
        let assignedRole = 0; 
        let identity = "";
        if (!rooms[currentRoom].red) {
            rooms[currentRoom].red = socket.id;
            assignedRole = 1;
            identity = "Red";
        } else if (!rooms[currentRoom].black) {
            rooms[currentRoom].black = socket.id;
            assignedRole = 2;
            identity = "Black";
        } else {
            mySpectatorNumber = rooms[currentRoom].nextSpecNumber++;
            identity = `Spectator ${mySpectatorNumber}`;
        }
        socket.emit('assign-role', { role: assignedRole, specNum: mySpectatorNumber });
        io.to(currentRoom).emit('update-user-count', rooms[currentRoom].userCount);
        io.to(currentRoom).emit('receive-chat', { user: "System", text: `${identity} has joined the room.` });
    });

    socket.on('send-move', (moveData) => {
        if (currentRoom) socket.to(currentRoom).emit('receive-move', moveData);
    });

    socket.on('send-chat', (messageText) => {
        if (currentRoom) {
            let senderRole = `Spectator ${mySpectatorNumber}`;
            if (rooms[currentRoom]?.red === socket.id) senderRole = "Red";
            if (rooms[currentRoom]?.black === socket.id) senderRole = "Black";
            io.to(currentRoom).emit('receive-chat', { user: senderRole, text: messageText });
        }
    });

    socket.on('disconnect', () => {
        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom].userCount--;
            let identity = `Spectator ${mySpectatorNumber}`;
            if (rooms[currentRoom].red === socket.id) { rooms[currentRoom].red = null; identity = "Red"; }
            else if (rooms[currentRoom].black === socket.id) { rooms[currentRoom].black = null; identity = "Black"; }
            io.to(currentRoom).emit('receive-chat', { user: "System", text: `${identity} left the room.` });
            io.to(currentRoom).emit('update-user-count', rooms[currentRoom].userCount);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
