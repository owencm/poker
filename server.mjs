import express from "express";
import http from "http";
import socketio from "socket.io";
import {
  getInitialGameState,
  setGameCoreServerMode,
  updateGameStateBasedOnActions
} from "./src/gameCore.mjs";

const app = express();
const server = http.createServer(app);
const socket = socketio(server);
setGameCoreServerMode();

// app.use(express.static("built"));
app.use(express.static("src"));

let gameState = getInitialGameState();

socket.on("connection", client => {
  console.log("a user connected");
  client.on("get state", () => {
    client.emit("initial state", gameState);
  });
  client.on("action", action => {
    console.log("Got action from client", action);

    if (action.actionType === "endGame") {
      console.log(
        "Got reset request so broadcast reset and create new game state"
      );
      gameState = getInitialGameState();
      client.broadcast.emit("action", { actionType: 'resetClient' });
      client.emit("action", { actionType: 'resetClient' });
      return;
    }
    // TODO: check if action couldn't be executed. If not, send snapshot of whole game state to the client that sent it because they're out of sync now and need to reset
    const result = updateGameStateBasedOnActions([action], gameState);
    if (result.success === false) {
      console.log("Send reset to client because they sent an action that couldn't be taken", action);
      client.emit(
        "action",
        { actionType: 'resetGame' }
        // Object.assign(action, { actionType: "assignLock" })
      );
    } else {
      client.broadcast.emit("action", action);
    }
  });
});

server.listen(3000, function () {
  console.log("listening on *:3000");
});

// Idea: to take an action that requires a lock, you create a lock action that goes to server. Othet actions are queued behind this lock. The queue is blocked until you get a lock response back from the server
