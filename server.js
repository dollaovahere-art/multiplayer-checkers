const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Allows phones, tablets, and laptops to connect smoothly
});

// Automatically serve your index.html file
app.use(express.static(__dirname));

let players = {
    red: null,   // Holds socket.id of Player 1
    black: null  // Holds socket.id of Player 2
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Assign available roles dynamically
    let assignedRole = 0; // 0 = Spectator, 1 = Red, 2 = Black

    if (!players.red) {
        players.red = socket.id;
        assignedRole = 1;
        console.log(`Assigned ${socket.id} to RED (Player 1)`);
    } else if (!players.black) {
        players.black = socket.id;
        assignedRole = 2;
        console.log(`Assigned ${socket.id} to BLACK (Player 2)`);
    } else {
        console.log(`Room full. ${socket.id} joined as a SPECTATOR`);
    }

    // Tell the client which role they received
    socket.emit('assign-role', assignedRole);

    // Relay move updates to the opponent in real-time
    socket.on('send-move', (moveData) => {
        socket.broadcast.emit('receive-move', moveData);
    });

    // Handle user disconnects and free up slots instantly
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        if (players.red === socket.id) {
            players.red = null;
            console.log("RED slot is now vacant.");
        } else if (players.black === socket.id) {
            players.black = null;
            console.log("BLACK slot is now vacant.");
        }
    });
});

const PORT = process.env.PORT || 3000;
// '0.0.0.0' exposes the server to your local home network (Wi-Fi)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Checkers server is running!`);
    console.log(`💻 On your laptop, open: http://localhost:${PORT}`);
    console.log(`📱 On phones/tablets, use your laptop's local IP address`);
    console.log(`======================================================\n`);
});
