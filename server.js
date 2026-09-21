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
            rooms[currentRoom] = { red: null, black: null, userCount: 0 };
        }

        // Increment the total room user counter
        rooms[currentRoom].userCount++;

        let assignedRole = 0; // Spectator

        if (!rooms[currentRoom].red) {
            rooms[currentRoom].red = socket.id;
            assignedRole = 1;
        } else if (!rooms[currentRoom].black) {
            rooms[currentRoom].black = socket.id;
            assignedRole = 2;
        }

        socket.emit('assign-role', assignedRole);
        
        // Broadcast the updated count to everyone in this specific room
        io.to(currentRoom).emit('update-user-count', rooms[currentRoom].userCount);
        
        let identity = assignedRole === 1 ? "Red (Player 1)" : assignedRole === 2 ? "Black (Player 2)" : "A Spectator";
        io.to(currentRoom).emit('receive-chat', { user: "System", text: `${identity} has joined the room.` });
    });

    socket.on('send-move', (moveData) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('receive-move', moveData);
        }
    });

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
            // Decrement the total room user counter safely
            rooms[currentRoom].userCount--;
            if (rooms[currentRoom].userCount < 0) rooms[currentRoom].userCount = 0;

            if (rooms[currentRoom].red === socket.id) {
                rooms[currentRoom].red = null;
                io.to(currentRoom).emit('receive-chat', { user: "System", text: "Red Player left. Slot is vacant!" });
            } else if (rooms[currentRoom].black === socket.id) {
                rooms[currentRoom].black = null;
                io.to(currentRoom).emit('receive-chat', { user: "System", text: "Black Player left. Slot is vacant!" });
            }
            
            // Broadcast the newly updated count or clean up the room if empty
            if (rooms[currentRoom].userCount === 0 || (!rooms[currentRoom].red && !rooms[currentRoom].black && rooms[currentRoom].userCount <= 0)) {
                delete rooms[currentRoom];
            } else {
                io.to(currentRoom).emit('update-user-count', rooms[currentRoom].userCount);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening live on port ${PORT}`);
});
