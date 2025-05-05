const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Store rooms and their user counts
const rooms = {};

// Store user name mappings
const userNames = {};

// Predefined category rooms
const categoryRooms = [
  "music",
  "gaming",
  "movies",
  "tech",
  "sports",
  "books",
  "travel",
  "food",
];

// Arrays for generating random mysterious names
const adjectives = [
  "Mysterious",
  "Shadow",
  "Enigmatic",
  "Phantom",
  "Secret",
  "Hidden",
  "Silent",
  "Veiled",
  "Cryptic",
  "Elusive",
  "Ghostly",
  "Mystic",
  "Obscure",
  "Stealth",
  "Twilight",
  "Whisper",
  "Nebulous",
  "Ethereal",
  "Arcane",
  "Covert",
  "Cosmic",
  "Furtive",
  "Masked",
  "Occult",
];

const nouns = [
  "Wanderer",
  "Specter",
  "Wraith",
  "Voyager",
  "Nomad",
  "Hunter",
  "Watcher",
  "Traveler",
  "Sentinel",
  "Raven",
  "Phoenix",
  "Shade",
  "Ghost",
  "Owl",
  "Wolf",
  "Stranger",
  "Oracle",
  "Guardian",
  "Knight",
  "Echo",
  "Phantom",
  "Cipher",
  "Shadow",
  "Agent",
];

// Initialize category rooms with 0 users
categoryRooms.forEach((room) => {
  rooms[room] = 0;
});

// Generate a random mysterious name
function generateMysteriousName() {
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${randomAdjective}${randomNoun}${randomNumber}`;
}

io.on("connection", (socket) => {
  console.log("New user connected", socket.id);

  // Assign a random mysterious name to this user
  userNames[socket.id] = generateMysteriousName();

  socket.on("join room", (room) => {
    // Leave previous room if any
    if (socket.room) {
      socket.leave(socket.room);

      // Update user count in previous room
      if (rooms[socket.room]) {
        rooms[socket.room]--;

        // Don't delete category rooms even if empty
        if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
          delete rooms[socket.room];
        } else {
          // Notify room that user left
          socket.to(socket.room).emit("user left", {
            userCount: rooms[socket.room],
          });
        }
      }
    }

    // Join new room
    socket.join(room);
    socket.room = room;

    // Update room user count
    if (!rooms[room]) {
      rooms[room] = 0;
    }
    rooms[room]++;

    // Notify room that user joined
    socket.to(room).emit("user joined", {
      userCount: rooms[room],
    });

    // Send room user count to the new user
    socket.emit("room users", {
      userCount: rooms[room],
    });

    // Send user their mysterious name
    socket.emit("assign name", {
      name: userNames[socket.id],
    });

    console.log(
      `User ${socket.id} (${
        userNames[socket.id]
      }) joined room: ${room}. Current users: ${rooms[room]}`
    );
  });

  socket.on("leave room", (room) => {
    if (socket.room) {
      socket.leave(socket.room);

      // Update room user count
      if (rooms[socket.room]) {
        rooms[socket.room]--;

        // Don't delete category rooms even if empty
        if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
          delete rooms[socket.room];
        } else {
          // Notify room that user left
          socket.to(socket.room).emit("user left", {
            userCount: rooms[socket.room],
          });
        }
      }

      console.log(
        `User ${socket.id} (${userNames[socket.id]}) left room: ${socket.room}`
      );
      socket.room = null;

      // Generate a new mysterious name for the user
      userNames[socket.id] = generateMysteriousName();
    }
  });

  socket.on("chat message", (data) => {
    if (socket.room && data.room === socket.room) {
      io.to(data.room).emit("chat message", {
        message: data.message,
        sender: userNames[socket.id],
        isCurrentUser: false,
      });
    }
  });

  socket.on("typing", (room) => {
    if (socket.room && room === socket.room) {
      socket.to(room).emit("typing", userNames[socket.id]);
    }
  });

  socket.on("stop typing", (room) => {
    if (socket.room && room === socket.room) {
      socket.to(room).emit("stop typing");
    }
  });

  socket.on("get active rooms", () => {
    const activeRooms = [];

    for (const [roomName, userCount] of Object.entries(rooms)) {
      if (userCount > 0) {
        activeRooms.push({
          name: roomName,
          userCount: userCount,
        });
      }
    }

    // Sort by user count (descending)
    activeRooms.sort((a, b) => b.userCount - a.userCount);

    socket.emit("active rooms", { rooms: activeRooms });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);

    if (socket.room) {
      // Update room user count
      if (rooms[socket.room]) {
        rooms[socket.room]--;

        // Don't delete category rooms even if empty
        if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
          delete rooms[socket.room];
        } else {
          // Notify room that user left
          socket.to(socket.room).emit("user left", {
            userCount: rooms[socket.room],
          });
        }
      }
    }

    // Remove the user's name mapping
    delete userNames[socket.id];
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});