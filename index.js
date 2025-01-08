const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Set up the app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware: Allow cross-origin requests
app.use(cors());  // This lets other domains communicate with our server
app.use(express.static('.'));  // Serve static files (like the game page)

// Variable to track the number of rooms
let rooms = 0;

// Serve the game HTML page when someone accesses the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));  // Send the game page to the client
});

// Handle socket connections
io.on('connection', (socket) => {
    // When a user creates a new game, set up the room and notify them
    socket.on('createGame', (data) => createGame(socket, data));

    // When a user tries to join an existing game, check if the room is available
    socket.on('joinGame', (data) => joinGame(socket, data));

    // When a player makes a move, broadcast it to the other player
    socket.on('playTurn', (data) => playTurn(socket, data));

    // When the game ends, notify the other player about it
    socket.on('gameEnded', (data) => gameEnded(socket, data));
});

// Function to handle creating a new game room
function createGame(socket, data) {
    // Generate a new room and join it
    const room = `room-${++rooms}`;
    socket.join(room);

    // Notify the player who created the room
    socket.emit('newGame', { name: data.name, room });
}

// Function to handle joining an existing game
function joinGame(socket, data) {
    // Check if the room exists and has only 1 player (so the second player can join)
    const room = io.sockets.adapter.rooms[data.room];

    if (room && room.length === 1) {  // The room is available for Player 2
        socket.join(data.room);

        // Notify Player 2 that they've successfully joined
        socket.emit('player2', { name: data.name, room: data.room });

        // Let Player 1 know that Player 2 has joined
        socket.broadcast.to(data.room).emit('player1', {});
    } else {
        // If the room is full or doesn't exist, let the player know
        socket.emit('err', { message: 'Sorry, the room is full or does not exist.' });
    }
}

// Function to handle a player making a move (their turn)
function playTurn(socket, data) {
    // Notify the other player about the turn that was played
    socket.broadcast.to(data.room).emit('turnPlayed', {
        tile: data.tile,  // The tile they played (e.g., X or O)
        room: data.room
    });
}

// Function to notify players that the game has ended
function gameEnded(socket, data) {
    // Broadcast to the other player that the game has ended
    socket.broadcast.to(data.room).emit('gameEnd', data);
}

// Start the server and listen on the specified port (or 5000 if not specified)
server.listen(process.env.PORT || 5000, () => {
    console.log('Server is running...');  // Log when the server is up and running
});
