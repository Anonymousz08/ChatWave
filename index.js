const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public" folder
app.use(express.static("public"));

// Optional homepage fallback (avoid 404 on root)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Store rooms and their user counts
const rooms = {};
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
  "Mysterious", "Shadow", "Enigmatic", "Phantom", "Secret", "Hidden",
  "Silent", "Veiled", "Cryptic", "Elusive", "Ghostly", "Mystic",
  "Obscure", "Stealth", "Twilight", "Whisper", "Nebulous", "Ethereal",
  "Arcane", "Covert", "Cosmic", "Furtive", "Masked", "Occult",
];

const nouns = [
  "Wanderer", "Specter", "Wraith", "Voyager", "Nomad", "Hunter",
  "Watcher", "Traveler", "Sentinel", "Raven", "Phoenix", "Shade",
  "Ghost", "Owl", "Wolf", "Stranger", "Oracle", "Guardian", "Knight",
  "Echo", "Phantom", "Cipher", "Shadow", "Agent",
];

// Initialize category rooms
categoryRooms.forEach((room) => {
  rooms[room] = 0;
});

// Generate a mysterious name
function generateMysteriousName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

io.on("connection", (socket) => {
  console.log("New user connected", socket.id);
  userNames[socket.id] = generateMysteriousName();

  socket.on("join room", (room) => {
    if (socket.room) {
      socket.leave(socket.room);
      if (rooms[socket.room]) {
        rooms[socket.room]--;
        if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
          delete rooms[socket.room];
        } else {
          socket.to(socket.room).emit("user left", {
            userCount: rooms[socket.room],
          });
        }
      }
    }

    socket.join(room);
    socket.room = room;
    if (!rooms[room]) rooms[room] = 0;
    rooms[room]++;

    socket.to(room).emit("user joined", {
      userCount: rooms[room],
    });

    socket.emit("room users", {
      userCount: rooms[room],
    });

    socket.emit("assign name", {
      name: userNames[socket.id],
    });

    console.log(
      `User ${socket.id} (${userNames[socket.id]}) joined room: ${room}. Users: ${rooms[room]}`
    );
  });

  socket.on("leave room", () => {
    if (socket.room) {
      socket.leave(socket.room);
      if (rooms[socket.room]) {
        rooms[socket.room]--;
        if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
          delete rooms[socket.room];
        } else {
          socket.to(socket.room).emit("user left", {
            userCount: rooms[socket.room],
          });
        }
      }

      console.log(`User ${socket.id} (${userNames[socket.id]}) left ${socket.room}`);
      socket.room = null;
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
    if (socket.room === room) {
      socket.to(room).emit("typing", userNames[socket.id]);
    }
  });

  socket.on("stop typing", (room) => {
    if (socket.room === room) {
      socket.to(room).emit("stop typing");
    }
  });

  socket.on("get active rooms", () => {
    const activeRooms = Object.entries(rooms)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({ name, userCount: count }))
      .sort((a, b) => b.userCount - a.userCount);

    socket.emit("active rooms", { rooms: activeRooms });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);

    if (socket.room && rooms[socket.room]) {
      rooms[socket.room]--;
      if (rooms[socket.room] <= 0 && !categoryRooms.includes(socket.room)) {
        delete rooms[socket.room];
      } else {
        socket.to(socket.room).emit("user left", {
          userCount: rooms[socket.room],
        });
      }
    }

    delete userNames[socket.id];
  });
});

// ✅ Listen on dynamic port for Render/Heroku or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
