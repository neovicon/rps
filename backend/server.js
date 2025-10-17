// server/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const games = {}; // { roomId: { players: [{id,name}], moves: {} } }

io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  // Create game
  socket.on("create_game", (username) => {
    if (!username) return socket.emit("error_msg", "Username required");

    let roomId;
    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (games[roomId]);

    games[roomId] = { players: [{ id: socket.id, name: username }], moves: {} };
    socket.join(roomId);

    socket.emit("game_created", { roomId });
    socket.emit("status", "Waiting for opponent to join...");
    console.log(`Game ${roomId} created by ${username}`);
  });

  // Join game
  socket.on("join_game", ({ roomId, username }) => {
    if (!roomId || !username) return socket.emit("error_msg", "Room & username required");
    roomId = roomId.toUpperCase();
    const game = games[roomId];
    if (!game) return socket.emit("error_msg", "Room not found");
    if (game.players.length >= 2) return socket.emit("error_msg", "Room full");

    game.players.push({ id: socket.id, name: username });
    socket.join(roomId);

    io.to(roomId).emit("game_joined", { roomId, players: game.players.map((p) => p.name) });
    io.to(roomId).emit("status", `${game.players[0].name} vs ${game.players[1].name}`);
    io.to(roomId).emit("start_timer");
  });

  // Handle move
  socket.on("move", ({ roomId, move }) => {
    if (!roomId || !move) return;
    roomId = roomId.toUpperCase();
    const game = games[roomId];
    if (!game) return;

    game.moves[socket.id] = move;
    socket.to(roomId).emit("opponent_chose");

    if (Object.keys(game.moves).length === 2) {
      const [p1, p2] = game.players;
      const m1 = game.moves[p1.id];
      const m2 = game.moves[p2.id];
      const winner = getWinner(m1, m2);
      let message, winnerId;

      if (winner === "draw") {
        message = `Draw! Both chose ${m1}`;
        winnerId = "draw";
      } else if (winner === "p1") {
        message = `${p1.name} wins! ${m1} beats ${m2}`;
        winnerId = p1.id;
      } else {
        message = `${p2.name} wins! ${m2} beats ${m1}`;
        winnerId = p2.id;
      }

      io.to(roomId).emit("result", { message, winnerId });
      game.moves = {};
    }
  });

  socket.on("rematch", (roomId) => {
    if (!roomId) return;
    roomId = roomId.toUpperCase();
    const game = games[roomId];
    if (!game) return;

    game.moves = {};
    io.to(roomId).emit("rematch_start");
    io.to(roomId).emit("start_timer");
  });

  socket.on("disconnect", () => {
    for (const roomId in games) {
      const game = games[roomId];
      game.players = game.players.filter((p) => p.id !== socket.id);
      if (game.players.length === 0) delete games[roomId];
    }
  });
});

function getWinner(a, b) {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  )
    return "p1";
  return "p2";
}

server.listen(3001, () => console.log("🚀 Server running on http://localhost:3001"));
