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

    socket.on('join-room', (roomCode) => {
        currentRoom = roomCode.trim().toLowerCase();
        socket.join(currentRoom);

        if (!rooms[currentRoom]) {
            rooms[currentRoom] = { red: null, black: null };
        }

        let assignedRole = 0; // Spectator

        if (!rooms[currentRoom].red) {
            rooms[currentRoom].red = socket.id;
            assignedRole = 1;
        } else if (!rooms[currentRoom].black) {
            rooms[currentRoom].black = socket.id;
            assignedRole = 2;
        }

        socket.emit('assign-role', assignedRole);
        
        let identity = assignedRole === 1 ? "Red (Player 1)" : assignedRole === 2 ? "Black (Player 2)" : "A Spectator";
        io.to(currentRoom).emit('receive-chat', { user: "System", text: `${identity} has joined the room.` });
    });

    socket.on('send-move', (moveData) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('receive-move', moveData);
        }
    });

    // FIXED: This now relays the message to everyone in the room perfectly
    socket.on('send-chat', (messageText) => {
        if (currentRoom) {
            let senderRole = "Spectator";
            if (rooms[currentRoom]?.red === socket.id) senderRole = "Red";
            if (rooms[currentRoom]?.black === socket.id) senderRole = "Black";

            io.to(currentRoom).emit('receive-chat', { user: senderRole, text: messageText });
        }
    });

    socket.on('disconnect', () => {
        if (currentRoom && rooms[currentRoom]) {
            if (rooms[currentRoom].red === socket.id) {
                rooms[currentRoom].red = null;
                io.to(currentRoom).emit('receive-chat', { user: "System", text: "Red Player left. Slot is vacant!" });
            } else if (rooms[currentRoom].black === socket.id) {
                rooms[currentRoom].black = null;
                io.to(currentRoom).emit('receive-chat', { user: "System", text: "Black Player left. Slot is vacant!" });
            }
            if (!rooms[currentRoom].red && !rooms[currentRoom].black) {
                delete rooms[currentRoom];
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening live on port ${PORT}`);
});
