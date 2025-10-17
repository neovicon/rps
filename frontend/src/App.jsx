import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import { BrowserRouter, useLocation } from "react-router-dom";

const socket = io("http://localhost:3001");

function GameApp() {
  const location = useLocation();
  const [mode, setMode] = useState("choose");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [timer, setTimer] = useState(null);
  const [opponentChose, setOpponentChose] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    const match = location.pathname.match(/\/join\/([A-Z0-9]+)/i);
    if (match) {
      const code = match[1].toUpperCase();
      setRoom(code);
      setMode("join");
    }
  }, [location]);

  const handleCreate = () => {
    if (!username) return alert("Enter username");
    socket.emit("create_game", username);
  };

  const handleJoin = () => {
    if (!room || !username) return alert("Enter username and room code");
    socket.emit("join_game", { roomId: room, username });
  };

  const chooseMove = (m) => {
    socket.emit("move", { roomId: room, move: m });
    setStatus(`You chose ${m}. Waiting for opponent...`);
  };

  const requestRematch = () => {
    socket.emit("rematch", room);
  };

  useEffect(() => {
    socket.on("game_created", ({ roomId }) => {
      setRoom(roomId);
      setMode("lobby");
      setStatus("Game created. Share this link:");
    });

    socket.on("game_joined", ({ roomId }) => {
      setRoom(roomId);
      setMode("playing");
      setStatus("Opponent joined. Game start!");
    });

    socket.on("status", setStatus);

    socket.on("start_timer", () => {
      let t = 10;
      setTimer(t);
      const id = setInterval(() => {
        t--;
        setTimer(t);
        if (t <= 0) {
          clearInterval(id);
          setTimer(null);
        }
      }, 1000);
    });

    socket.on("opponent_chose", () => setOpponentChose(true));

    socket.on("result", (d) => {
      let msg;
      if (d.winnerId === "draw") {
        msg = d.message;
      } else if (d.winnerId === socket.id) {
        msg = `You win! (${d.message})`;
      } else {
        msg = `Your opponent wins! (${d.message})`;
      }
      setResult(msg);
      setMode("result");
      setOpponentChose(false);
    });

    socket.on("rematch_start", () => {
      setResult("");
      setMode("playing");
      setStatus("Rematch started!");
    });

    socket.on("error_msg", alert);

    return () => {
      socket.off("game_created");
      socket.off("game_joined");
      socket.off("status");
      socket.off("start_timer");
      socket.off("opponent_chose");
      socket.off("result");
      socket.off("rematch_start");
      socket.off("error_msg");
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-bold mb-6 text-cyan-400 text-center"
        >
          ⚡ Cyber RPS Arena
        </motion.h1>

        {mode === "choose" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="w-full p-2 mb-4 bg-gray-900 rounded border border-cyan-600 text-center"
            />
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setMode("create")}
                className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700"
              >
                Create Game
              </button>
              <button
                onClick={() => setMode("join")}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                Join Game
              </button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <p>Create a game as <b>{username || "..."}</b></p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700"
            >
              Create
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="w-full p-2 mb-4 bg-gray-900 rounded border border-cyan-600 text-center"
            />
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
              placeholder="Room Code"
              className="w-full p-2 mb-4 bg-gray-900 rounded border border-cyan-600 text-center"
            />
            <button
              onClick={handleJoin}
              className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
            >
              Join
            </button>
          </div>
        )}

        {mode === "lobby" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <p className="mb-2">{status}</p>
            <div className="font-mono text-cyan-300 border border-cyan-600 rounded p-2 bg-black break-all">
              {`${window.location.origin}/join/${room}`}
            </div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/join/${room}`)
              }
              className="mt-4 px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700"
            >
              Copy Link
            </button>
          </div>
        )}

        {mode === "playing" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <p className="text-cyan-300 mb-2">{status}</p>
            {timer && <p className="text-yellow-300 mb-2">⏱ {timer}s left</p>}
            <div className="flex justify-center gap-3">
              {["rock", "paper", "scissors"].map((m) => (
                <button
                  key={m}
                  onClick={() => chooseMove(m)}
                  className="px-4 py-2 bg-cyan-700 rounded hover:bg-cyan-800"
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            {opponentChose && (
              <p className="mt-3 text-green-400 animate-pulse">
                Opponent has chosen!
              </p>
            )}
          </div>
        )}

        {mode === "result" && (
          <div className="bg-gray-800 p-6 rounded-lg text-center shadow-lg">
            <p className="text-yellow-300 text-lg mb-4">{result}</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={requestRematch}
                className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700"
              >
                Rematch
              </button>
              <button
                onClick={() => {
                  setMode("choose");
                  setResult("");
                  setRoom("");
                }}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-800"
              >
                Exit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameApp;
