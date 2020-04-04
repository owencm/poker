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

app.use(express.static("built"));

let gameState = getInitialGameState();

socket.on("connection", client => {
  console.log("a user connected");
  client.on("get state", () => {
    client.emit("initial state", gameState);
  });
  client.on("action", action => {
    console.log("Got action from client", action);

    if (action.actionType === "resetGame") {
      console.log(
        "Got reset request so broadcast reset and create new game state"
      );
      client.broadcast.emit("action", action);
      client.emit("action", action);
      gameState = getInitialGameState();
      return;
    }
    updateGameStateBasedOnActions([action], gameState);
    if (action.actionType === "requestLock") {
      console.log("Send action to client", action);
      client.emit(
        "action",
        Object.assign(action, { actionType: "assignLock" })
      );
    } else {
      client.broadcast.emit("action", action);
    }
    // if (action.actionType !== "setObjPos") {
    // client.emit("action", Object.assign(action, { fromServer: true }));
    // }
  });
});

server.listen(3000, function() {
  console.log("listening on *:3000");
});

// Idea: to take an action that requires a lock, you create a lock action that goes to server. Othet actions are queued behind this lock. The queue is blocked until you get a lock response back from the server
