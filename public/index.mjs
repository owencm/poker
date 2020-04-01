/*
  Todos:
    - Networking + backend
      - Maintain app state on server
        - Split code into rendering (and event listeners), core app logic, and make updateGameStateBasedOnActions distinguish between client and server
      - Serialize and send app state and following actions to clients that connect
      - Broadcast actions to all listening clients
      - Make some actions server only: add player
    - Switch from SVG to pngs for all cards and chips
    - Sound effects
    - Annotate players taking actions
    - Animations
    - Move and rename players
    - Edit text
    - Bank magically always has more money
      - Moving the bank or pot moves it's money
*/

import {
  shuffle,
  ID,
  getMousePos,
  distance,
  getNewDeck,
  getSuitNameAndCardNameFromCard,
  getCardName,
  objCollidesWPos,
  objCollidesWObj
} from "./common.mjs";
import {
  objSizes,
  gameWidth,
  gameHeight,
  textHeight,
  menuPadding,
  playerAlignment,
  playerPositions
} from "./constants.mjs";
import {
  getInitialGameState,
  updateGameStateBasedOnActions,
  getNewDeckObj,
  alignTextObj
} from "./gameCore.mjs";

// Globals
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
ctx.textBaseline = "top";
ctx.font = `${textHeight}px Arial`;

const getCardImage = (() => {
  const deckWithNames = getNewDeck().map(getSuitNameAndCardNameFromCard);

  let cardImages = [];
  for (const cardWName of deckWithNames) {
    let img = new Image();
    const cardName = getCardName(cardWName);
    img.src = `cards-svgs/${cardName}.svg`;
    cardImages[cardName] = img;
  }

  return card => {
    const cardWName = getSuitNameAndCardNameFromCard(card);
    const cardName = getCardName(cardWName);
    return cardImages[cardName];
  };
})();
let cardBackImage = new Image();
cardBackImage.src = `cards-svgs/card_back.svg`;

const render = gameState => {
  document.querySelector("#addPlayer").style.display =
    localStorage.playerId === undefined ? "block" : "none";

  ctx.clearRect(0, 0, gameWidth, gameHeight);

  for (let player of gameState.playerObjs) {
    ctx.fillStyle = "black";
    ctx.fillText(player.name, player.pos[0], player.pos[1]);
  }
  for (let cardsObj of gameState.cardsObjs) {
    const { pos, cards } = cardsObj;
    const topCard = cards[cards.length - 1];
    topCard.peeking = topCard.peeking || [];

    if (topCard.mode === "faceUp") {
      ctx.drawImage(
        getCardImage(topCard),
        pos[0],
        pos[1],
        objSizes.cards[0],
        objSizes.cards[1]
      );
    } else {
      if (topCard.peeking[localStorage.playerId]) {
        ctx.globalAlpha = 0.7;
        ctx.drawImage(
          getCardImage(topCard),
          pos[0],
          pos[1],
          objSizes.cards[0],
          objSizes.cards[1]
        );
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(
          cardBackImage,
          pos[0],
          pos[1],
          objSizes.cards[0],
          objSizes.cards[1]
        );
      }
    }

    let cardDescr = cards.length > 1 ? `x${cards.length} ` : "";
    const othersWithPeekingState = Object.keys(topCard.peeking).filter(
      id => topCard.peeking[id] && id !== localStorage.playerId
    );
    cardDescr =
      othersWithPeekingState.length > 0 ? cardDescr + "👁️" : cardDescr;
    ctx.fillStyle = "black";
    ctx.fillText(cardDescr, pos[0], pos[1] + objSizes["cards"][1]);
  }
  for (let chipsObj of gameState.chipsObjs) {
    const { pos, count } = chipsObj;

    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(
      pos[0] + objSizes.chips[0] / 2,
      pos[1] + objSizes.chips[0] / 2,
      objSizes.chips[0] / 2.2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    const chipPathSize = 50;
    const scalingFactor = objSizes["chips"][0] / chipPathSize;
    const chipPath = new Path2D(
      "M 25 1 C 11.759318 1 1 11.759318 1 25 C 1 27.889887 1.5121634 30.661103 2.4511719 33.228516 C 2.453288 33.234301 2.4549108 33.24031 2.4570312 33.246094 C 2.5964788 33.635375 2.743374 34.020934 2.9003906 34.400391 L 2.9140625 34.392578 C 4.4930509 38.094551 6.9790423 41.316994 10.087891 43.789062 C 10.38006 44.021388 10.677478 44.246072 10.980469 44.464844 C 11.019857 44.49333 11.060038 44.52058 11.099609 44.548828 C 11.371996 44.743006 11.64708 44.93231 11.927734 45.115234 C 11.978264 45.148154 12.029278 45.180347 12.080078 45.212891 C 12.370962 45.399378 12.665591 45.579806 12.964844 45.753906 C 12.990837 45.76899 13.016912 45.78384 13.042969 45.798828 C 13.369274 45.987032 13.701387 46.166784 14.037109 46.339844 C 17.325532 48.034976 21.050219 49 25 49 C 38.240682 49 49 38.240682 49 25 C 49 19.520158 47.153666 14.468782 44.054688 10.425781 L 44.099609 10.400391 C 42.782707 8.7022793 41.221708 7.1768671 39.478516 5.8691406 C 39.40253 5.8115067 39.326688 5.7540121 39.25 5.6972656 C 39.082857 5.5748837 38.9126 5.4561718 38.742188 5.3378906 C 38.556802 5.2079794 38.370805 5.0798331 38.181641 4.9550781 C 38.096846 4.8996257 38.011313 4.8454523 37.925781 4.7910156 C 37.643011 4.6096132 37.357095 4.4333715 37.066406 4.2636719 C 37.065152 4.2629397 37.063754 4.2624507 37.0625 4.2617188 C 37.06075 4.2607041 37.058391 4.2607798 37.056641 4.2597656 C 33.511582 2.1922784 29.394237 1 25 1 z M 25 3 C 26.018664 3 27.018305 3.0752737 28 3.2089844 L 28 10.304688 C 27.029777 10.105433 26.026606 10 25 10 C 23.973394 10 22.970223 10.105433 22 10.304688 L 22 3.2089844 C 22.981695 3.0752737 23.981336 3 25 3 z M 42.318359 11.433594 C 43.567745 13.026801 44.601572 14.795566 45.376953 16.699219 L 39.216797 20.269531 C 38.557401 18.30537 37.500237 16.523628 36.142578 15.011719 L 42.318359 11.433594 z M 7.6386719 11.488281 L 13.851562 15.019531 C 12.514738 16.510155 11.470496 18.262558 10.810547 20.193359 L 4.6308594 16.681641 C 5.3965489 14.806503 6.4123178 13.062293 7.6386719 11.488281 z M 25 12 C 32.154545 12 38 17.845455 38 25 C 38 32.154545 32.154545 38 25 38 C 17.845455 38 12 32.154545 12 25 C 12 17.845455 17.845455 12 25 12 z M 39.216797 29.730469 L 45.376953 33.300781 C 44.62144 35.155655 43.620659 36.882165 42.414062 38.443359 L 36.207031 34.916016 C 37.533694 33.419564 38.567878 31.663423 39.216797 29.730469 z M 10.8125 29.814453 C 11.47411 31.746704 12.521842 33.499366 13.861328 34.990234 L 7.7070312 38.599609 C 6.464054 37.02073 5.4331954 35.268423 4.65625 33.382812 L 10.8125 29.814453 z M 28 39.695312 L 28 46.791016 C 27.018305 46.924726 26.018664 47 25 47 C 24.015652 47 23.049576 46.927727 22.099609 46.802734 L 22.099609 39.710938 C 23.039291 39.897308 24.007992 40 25 40 C 26.026606 40 27.029777 39.894567 28 39.695312 z"
    );
    ctx.save();
    ctx.translate(pos[0], pos[1]);
    ctx.transform(scalingFactor, 0, 0, scalingFactor, 0, 0);
    ctx.fillStyle = ["red", "black", "blue"][chipsObj.colorI];
    ctx.fill(chipPath);
    ctx.restore();

    ctx.fillStyle = "black";
    ctx.fillText(`x${count}`, pos[0], pos[1] + objSizes["chips"][0]);
  }

  for (let textObj of gameState.textObjs) {
    const { pos, text } = textObj;
    ctx.fillStyle = "black";
    ctx.fillText(text, pos[0], pos[1]);
  }

  for (let menuObj of gameState.menuObjs) {
    const pos = menuObj.pos;
    const { options, width, height } = menuObj;
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.beginPath();
    ctx.rect(pos[0], pos[1], width, height);
    ctx.fill();
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      ctx.fillStyle = "white";
      ctx.fillText(option.text, option.pos[0], option.pos[1]);
    }
  }
};

const getActionsBasedOnInputState = (inputState, gameState) => {
  if (inputState !== undefined) {
    console.log(inputState);
  }
  let newInputState;
  let actions = [];
  if (inputState?.mode === "actions") {
    actions.push(inputState.action);
    actions.push({ actionType: "clearInputState" });
  }
  if (inputState?.mode === "readyToStartDragging") {
    if (
      inputState.objDragged.type === "cards" ||
      inputState.objDragged.type === "chips"
    ) {
      if (
        inputState.objDragged.cards?.length > 1 ||
        inputState.objDragged.count > 1
      ) {
        const lockId = ID();
        console.log("will queue up requestLock");
        actions.push({
          actionType: "requestLock",
          lockId,
          objId: inputState.objDragged.id
        });
        const newObjId = ID();
        actions.push({
          actionType: "popTop",
          fromObjWId: inputState.objDragged.id,
          newObjId
        });
        actions.push({
          actionType: "setInputState",
          newInputState: {
            mode: "dragging",
            objsById: {
              objDragged: newObjId
            },
            objInitPos: inputState.objInitPos,
            mouseDownPos: inputState.mouseDownPos,
            mousePos: inputState.mousePos
          }
        });
      } else {
        actions.push({
          actionType: "setInputState",
          newInputState: {
            mode: "dragging",
            objsById: {
              objDragged: inputState.objDragged.id
            },
            objInitPos: inputState.objInitPos,
            mouseDownPos: inputState.mouseDownPos
          }
        });
      }
    } else {
      actions.push({
        actionType: "setInputState",
        newInputState: {
          mode: "dragging",
          objsById: {
            objDragged: inputState.objDragged.id
          },
          objInitPos: inputState.objInitPos,
          mouseDownPos: inputState.mouseDownPos
        }
      });
    }
  }
  if (
    inputState?.mode === "dragging" ||
    inputState?.mode === "draggingMouseUp"
  ) {
    actions.push({
      actionType: "setObjPos",
      objId: inputState.objDragged.id,
      pos: [
        inputState.objInitPos[0] +
          inputState.mousePos[0] -
          inputState.mouseDownPos[0],
        inputState.objInitPos[1] +
          inputState.mousePos[1] -
          inputState.mouseDownPos[1]
      ]
    });
  }
  if (inputState?.mode === "doneDragging") {
    if (inputState?.objDraggedOnto) {
      if (inputState?.objDragged?.type === "cards") {
        actions.push({
          actionType: "mergeObjs",
          objIds: [inputState.objDragged.id, inputState.objDraggedOnto.id]
        });
      }
      if (inputState?.objDragged?.type === "chips") {
        if (inputState.objDraggedOnto.colorI === inputState.objDragged.colorI) {
          actions.push({
            actionType: "mergeObjs",
            objIds: [inputState.objDragged.id, inputState.objDraggedOnto.id]
          });
        }
      }
    }
    actions.push({ actionType: "clearInputState" });
  }
  if (inputState?.mode === "clicked") {
    if (inputState?.objClicked?.type === "menu") {
      const menuObjClicked = inputState.objClicked;
      const menuOptionObjClicked = inputState.optionTextObjClicked;
      if (menuOptionObjClicked.action.actionType === "flip") {
        const cardsObj = menuObjClicked.relatedToObj;
        const topCard = cardsObj.cards[cardsObj.cards.length - 1];
        const toFace = topCard.mode === "faceDown" ? "faceUp" : "faceDown";
        actions.push(
          Object.assign({}, menuOptionObjClicked.action, {
            objsById: { cardsObj: menuObjClicked.relatedToObj.id },
            toFace
          })
        );
        actions.push({ actionType: "clearInputState" });
      }
      if (menuOptionObjClicked.action.actionType === "peek") {
        if (localStorage.playerId === undefined) {
          alert("Please join the game to peek at cards");
        } else {
          const topCardObj =
            menuObjClicked.relatedToObj.cards[
              menuObjClicked.relatedToObj.cards.length - 1
            ];
          actions.push({
            actionType: "setPeekState",
            cardObjId: menuObjClicked.relatedToObj.id,
            peekState:
              topCardObj.peeking &&
              topCardObj.peeking[localStorage.playerId] === true
                ? false
                : true,
            playerId: localStorage.playerId
          });
        }
      }
      if (menuOptionObjClicked.action.actionType === "gatherAndSetDeck") {
        const cardsObj = menuObjClicked.relatedToObj;
        const newDeck = getNewDeckObj();
        newDeck.pos = cardsObj.pos;
        actions.push(
          Object.assign({}, menuOptionObjClicked.action, {
            newDeck
          })
        );
      }
      if (menuOptionObjClicked.action.actionType === "dragX") {
        const chipsObj = menuObjClicked.relatedToObj;
        console.log(chipsObj);
        const countToSplit = menuOptionObjClicked.action.count;
        if (countToSplit < chipsObj.count) {
          const newChipsId = ID();
          actions.push({
            actionType: "separateChips",
            chipsObjId: chipsObj.id,
            newChipsId,
            countToSplit
          });
        }
        actions.push({
          actionType: "setInputState",
          newInputState: {
            mode: "draggingMouseUp",
            objsById: {
              objDragged: chipsObj.id
            },
            mouseDownPos: menuObjClicked.mouseDownPosOnRelatedObj,
            mousePos: inputState.mouseDownPos,
            objInitPos: menuObjClicked.relatedToObj.pos
          }
        });
      }
      actions.push({ actionType: "closeMenus" });
    }
    if (
      inputState?.objClicked?.type === "cards" ||
      inputState?.objClicked?.type === "chips"
    ) {
      const menuAlreadyOpen = gameState.menuObjs.length > 0;
      if (menuAlreadyOpen) {
        actions.push({ actionType: "closeMenus" });
        //menuObjs = [];
      } else {
        actions.push({
          actionType: "openMenu",
          objId: inputState.objClicked.id,
          menuClickPos: inputState.mouseDownPos
        });
      }
    }
    if (inputState.objClicked === undefined) {
      actions.push({ actionType: "closeMenus" });
    }
    if (actions.filter(a => a.actionType === "setInputState").length === 0) {
      actions.push({ actionType: "clearInputState" });
    }
  }
  return actions;
};

const addEventListeners = gameState => {
  const getNewInputStateWithObjDraggedOnto = (inputState, gameState) => {
    let newInputState = {
      mode: "doneDragging",
      objDragged: inputState.objDragged
    };
    if (inputState?.objDragged?.type === "cards") {
      for (const obj of gameState.cardsObjs.filter(
        cO => cO !== inputState.objDragged
      )) {
        if (objCollidesWObj(obj, inputState.objDragged, 10)) {
          newInputState.objDraggedOnto = obj;
          break;
        }
      }
    }
    if (inputState?.objDragged?.type === "chips") {
      for (const obj of gameState.chipsObjs.filter(
        cO => cO !== inputState.objDragged
      )) {
        if (objCollidesWObj(obj, inputState.objDragged, 5)) {
          newInputState.objDraggedOnto = obj;
          break;
        }
      }
    }
    return newInputState;
  };

  canvas.addEventListener("mousedown", e => {
    if (gameState.blockedActionsAndMeta.blockedActions.length > 0) {
      return;
    }
    // console.log("mousedown");
    let newInputState;
    const mousePos = getMousePos(canvas, e);
    if (gameState.inputState === undefined) {
      // Check if the user selected anything
      const allClickableOrDraggableObjs = [
        ...gameState.cardsObjs,
        ...gameState.chipsObjs,
        ...gameState.textObjs
      ];
      for (const menuObj of gameState.menuObjs) {
        for (const textObj of menuObj.options) {
          if (objCollidesWPos(textObj, mousePos)) {
            newInputState = {
              mode: "clicked",
              objClicked: menuObj,
              optionTextObjClicked: textObj,
              mouseDownPos: mousePos
            };
          }
        }
      }
      if (newInputState === undefined) {
        let collidedChipCount = Infinity;
        for (const obj of allClickableOrDraggableObjs) {
          if (objCollidesWPos(obj, mousePos)) {
            if (
              obj.type !== "chips" ||
              (obj.type === "chips" && obj.count < collidedChipCount)
            ) {
              newInputState = {
                mode: "clickedMaybeWillDrag",
                objDragged: obj,
                mouseDownTime: Date.now(),
                mouseDownPos: mousePos
              };
              collidedChipCount =
                obj.count !== undefined ? obj.count : collidedChipCount;
            }
          }
        }
      }
    }
    if (gameState.inputState?.mode === "draggingMouseUp") {
      newInputState = getNewInputStateWithObjDraggedOnto(
        gameState.inputState,
        gameState
      );
    }
    if (newInputState !== undefined) {
      gameState.inputState = newInputState;
      // console.log("inputState set to", JSON.stringify(newInputState));
    }
  });

  canvas.addEventListener("mousemove", e => {
    e.preventDefault();
    if (gameState.blockedActionsAndMeta.blockedActions.length > 0) {
      return;
    }
    // console.log("mousemove");
    let newInputState;
    const mousePos = getMousePos(canvas, e);
    if (gameState.inputState?.mode === "clickedMaybeWillDrag") {
      if (distance(mousePos, gameState.inputState.mouseDownPos) > 10) {
        newInputState = {
          mode: "readyToStartDragging",
          objDragged: gameState.inputState.objDragged,
          mouseDownPos: gameState.inputState.mouseDownPos,
          mousePos,
          objInitPos: gameState.inputState.objDragged.pos
        };
      }
    }
    if (
      gameState.inputState?.mode === "dragging" ||
      gameState.inputState?.mode === "draggingMouseUp"
    ) {
      // console.log("dragging");
      newInputState = Object.assign({}, gameState.inputState, { mousePos });
    }
    if (newInputState !== undefined) {
      gameState.inputState = newInputState;
      // console.log("inputState set to", JSON.stringify(newInputState));
    }
  });

  const mouseUpOrLeaveCanvas = e => {
    if (gameState.blockedActionsAndMeta.blockedActions.length > 0) {
      return;
    }
    // console.log("mouseup");
    const mousePos = getMousePos(canvas, e);
    let newInputState;
    if (gameState.inputState?.mode === "dragging") {
      newInputState = getNewInputStateWithObjDraggedOnto(
        gameState.inputState,
        gameState
      );
      // console.log("done dragging");
    }
    if (gameState.inputState?.mode === "clickedMaybeWillDrag") {
      newInputState = {
        mode: "clicked",
        objClicked: gameState.inputState.objDragged,
        mouseDownPos: gameState.inputState.mouseDownPos
      };
    }
    if (gameState.inputState === undefined) {
      // Clicked on nothing
      newInputState = {
        mode: "clicked",
        objClicked: undefined,
        mouseDownPos: mousePos
      };
    }
    if (newInputState !== undefined) {
      gameState.inputState = newInputState;
      // console.log("inputState set to", JSON.stringify(newInputState));
    }
  };
  canvas.addEventListener("mouseup", mouseUpOrLeaveCanvas);
  canvas.addEventListener("mouseout", mouseUpOrLeaveCanvas);

  const addPlayerFromTextBox = () => {
    const textBox = document.querySelector("input");
    if (textBox.value.length > 0) {
      const playerId = ID();
      const tempTextObjForDeterminingPos = {
        type: "text",
        text: textBox.value,
        pos: playerPositions[gameState.playerObjs.length]
      };
      alignTextObj(
        tempTextObjForDeterminingPos,
        playerAlignment[gameState.playerObjs.length],
        text => ctx.measureText(text)
      );
      gameState.inputState = {
        mode: "actions",
        action: {
          actionType: "addPlayer",
          playerName: textBox.value,
          id: playerId,
          pos: tempTextObjForDeterminingPos.pos
        }
      };
      localStorage.playerId = playerId;
      textBox.value = "";
    }
  };
  document
    .querySelector("#addPlayerButton")
    .addEventListener("click", addPlayerFromTextBox);
  document.querySelector("input").addEventListener("keypress", e => {
    if (e.key === "Enter") {
      addPlayerFromTextBox();
    }
  });
  document.querySelector("#resetGameButton").addEventListener("click", () => {
    if (
      confirm(
        "This will remove all progress and cannot be undone. Are you sure?"
      )
    ) {
      gameState.inputState = {
        mode: "actions",
        action: {
          actionType: "resetGame"
        }
      };
    }
  });
};

// const getServerActionsBasedOnClientActions = (actions, gameState) => {
//   for (const action of actions) {
//     if (action.actionType === "addPlayer") {
//       action.pos = playerPositions[gameState.playerObjs.length];
//     }
//   }
//   return actions;
// };

const splitActionsByBlockedAndNonBlocked = actions => {
  const lockRequestActions = actions.filter(
    action => action.actionType === "requestLock"
  );
  const lockRequestIndex =
    lockRequestActions.length > 0 ? actions.indexOf(lockRequestActions[0]) : -1;
  return {
    nonBlockedActionsForServerAndClient:
      lockRequestActions.length > 0
        ? actions.slice(0, lockRequestIndex + 1)
        : actions,
    blockedActions:
      lockRequestActions.length > 0 ? actions.slice(lockRequestIndex + 1) : [],
    blockedOnAcquiringLockId:
      lockRequestActions.length > 0 ? lockRequestActions[0].lockId : undefined
  };
};

let frameVal = 0;
// Get game state
// Continually: generate actions (do client only, send toServer actions to server), do server actions
const gameCycle = ({
  gameState,
  fromServerActionContainer,
  sendActionsToServer
}) => {
  // Process queued input
  frameVal = (frameVal + 1) % 4;
  if (frameVal === 0) {
    if (fromServerActionContainer.actions.length > 0) {
      console.log("Doing action from server");
      updateGameStateBasedOnActions(
        fromServerActionContainer.actions,
        gameState
      );
      console.log("Clearing fromServerActionContainer");
      fromServerActionContainer.actions = [];
    }

    let nonBlockedActions = [];
    if (
      gameState.blockedActionsAndMeta.blockedActions.length === 0 ||
      gameState.blockedActionsAndMeta.unblocked
    ) {
      // If we just got unblocked, do the unblocked actions before getting new ones
      const clientGeneratedActions = gameState.blockedActionsAndMeta.unblocked
        ? []
        : getActionsBasedOnInputState(gameState.inputState, gameState);
      const {
        nonBlockedActionsForServerAndClient,
        blockedActions,
        blockedOnAcquiringLockId
      } = splitActionsByBlockedAndNonBlocked([
        ...gameState.blockedActionsAndMeta.blockedActions,
        ...clientGeneratedActions
      ]);
      // console.log({
      //   nonBlockedActionsForServerAndClient,
      //   blockedActions,
      //   blockedOnAcquiringLockId
      // });
      gameState.blockedActionsAndMeta = {
        blockedOnAcquiringLockId,
        blockedActions
      };
      sendActionsToServer(
        nonBlockedActionsForServerAndClient.filter(
          a =>
            [
              "closeMenus",
              "openMenu",
              "setInputState",
              "clearInputState"
            ].indexOf(a.actionType) === -1
        )
      );
      if (nonBlockedActionsForServerAndClient.length > 0) {
        updateGameStateBasedOnActions(
          nonBlockedActionsForServerAndClient,
          gameState
        );
      }
    } else {
      console.log("blocked", gameState.blockedActionsAndMeta);
    }
    render(gameState);
  }
  // Update game state
  requestAnimationFrame(() => {
    gameCycle({ gameState, fromServerActionContainer, sendActionsToServer });
  });
};

const startGame = () => {
  const socket = io();

  let fromServerActionContainer = { actions: [] };
  const sendActionsToServer = actions => {
    if (actions.length > 0) {
      console.log("queued sending actions to server", actions);
      actions.forEach(action => {
        setTimeout(() => {
          console.log("Sent action to server", action);
          socket.emit("action", action);
        }, 50);
      });
    }
  };

  socket.on("initial state", initialGameState => {
    console.log("Got initial state from server", initialGameState);

    if (
      initialGameState.playerObjs.filter(p => p.id === localStorage.playerId)
        .length === 0
    ) {
      delete localStorage.playerId;
    }

    addEventListeners(initialGameState);

    gameCycle({
      gameState: Object.assign(initialGameState, {
        blockedActionsAndMeta: {
          blockedOnAcquiringLockId: undefined,
          blockedActions: []
        }
      }),
      fromServerActionContainer,
      sendActionsToServer
    });
  });
  socket.emit("get state");

  socket.on("action", action => {
    setTimeout(() => {
      console.log("Got action from server", action);
      fromServerActionContainer.actions.push(action);
    }, 50);
  });
};

startGame();
