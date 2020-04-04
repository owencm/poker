import {
  objSizes,
  gameWidth,
  gameHeight,
  textHeight,
  menuPadding,
  playerPositions,
  playerAlignment
} from "./constants.mjs";

import {
  ID,
  getNewDeck,
  getSuitNameAndCardNameFromCard,
  objCollidesWPos,
  objCollidesWObj
} from "./common.mjs";

let onServer = false;
export const setGameCoreServerMode = () => {
  onServer = true;
};

export const getNewDeckObj = () => {
  const deck = getNewDeck();
  return {
    type: "cards",
    cards: deck,
    pos: [20, gameHeight / 2 - 40],
    id: ID()
  };
};

const addPlayer = (gameState, name, id, pos) => {
  if (gameState.playerObjs.length < 6) {
    gameState.playerObjs.push({
      type: "player",
      name,
      pos,
      id
    });
  }
};

const addSizeInfoToTextObj = textObj => {
  if (onServer) {
    throw "Should not be asked to use ctx on server";
  }
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  const ctx = canvas.getContext("2d");
  ctx.font = `${textHeight}px Arial`;
  textObj.width = ctx.measureText(textObj.text).width;
  textObj.height = textHeight;
};

const addSizeInfoToMenuObj = menuObj => {
  if (menuObj.options === undefined || menuObj.options.length === 0) {
    return;
  }
  menuObj.options.forEach(addSizeInfoToTextObj);
  menuObj.maxTextWidth = menuObj.options
    .map(x => x.width)
    .reduce((x, y) => Math.max(x, y));
  menuObj.width = menuObj.maxTextWidth + menuPadding * 2;
  menuObj.height =
    menuObj.options.length * (textHeight + menuPadding) + menuPadding;
  let menuPos = [...menuObj.relatedToObj.pos];
  if (menuPos[0] + menuObj.width > gameWidth) {
    menuPos[0] = gameWidth - menuObj.width;
  }
  if (menuPos[1] + menuObj.height > gameHeight) {
    menuPos[1] = gameHeight - menuObj.height;
  }
  menuObj.pos = menuPos;
  for (let i = 0; i < menuObj.options.length; i++) {
    menuObj.options[i].pos = [
      menuPadding + menuPos[0],
      menuPadding + menuPos[1] + (textHeight + menuPadding) * i
    ];
  }
};

const getMenuObjForObj = obj => {
  let menuObj = {
    type: "menu",
    relatedToObj: obj,
    options: []
  };
  if (obj.type === "cards") {
    const gatherAndShuffleOption = {
      text: "Gather all cards and shuffle",
      type: "menuText",
      action: { actionType: "gatherAndSetDeck" }
    };
    menuObj.options.push({
      text: obj.cards.length > 1 ? "Flip top card" : "Flip card",
      type: "menuText",
      action: { actionType: "flip" }
    });
    menuObj.options.push({
      text: obj.cards.length > 1 ? "Peek at top card" : "Peek at card",
      type: "menuText",
      action: { actionType: "peek" }
    });
    if (obj.cards.length > 1) {
      menuObj.options.push({
        text: "Grab card stack",
        type: "menuText",
        action: { actionType: "dragX", count: Infinity }
      });
    }
    menuObj.options.push(gatherAndShuffleOption);
  }
  if (obj.type === "chips") {
    menuObj.options = [
      {
        text: "Grab chip",
        type: "menuText",
        action: { actionType: "dragX", count: 1 }
      }
    ];
    if (obj.count > 1) {
      menuObj.options.push({
        text: "Grab chip stack",
        type: "menuText",
        action: { actionType: "dragX", count: Infinity }
      });
    }
    if (obj.count > 5) {
      menuObj.options.push({
        text: "Grab 5 chips",
        type: "menuText",
        action: { actionType: "dragX", count: 5 }
      });
    }
  }
  addSizeInfoToMenuObj(menuObj);
  return menuObj.options.length > 0 ? menuObj : undefined;
};

export const alignTextObj = (textObj, mode = "center", measureText) => {
  if (mode === "center") {
    textObj.pos[0] -= measureText(textObj.text || textObj.name).width / 2;
  }
  if (mode === "right") {
    textObj.pos[0] -= measureText(textObj.text || textObj.name).width;
  }
};

const getObjWId = (gameState, id) => {
  const objs = [
    ...gameState.cardsObjs,
    ...gameState.chipsObjs,
    ...gameState.textObjs
  ];
  const matchingObjs = objs.filter(o => o.id === id);
  if (matchingObjs.length > 0) {
    return matchingObjs[0];
  }
};

export const updateGameStateBasedOnActions = (actions, gameState) => {
  console.log("will do actions", actions);
  for (const action of actions) {
    if (action.actionType === "resetGame") {
      location.reload();
    }
    if (action.actionType === "assignLock") {
      if (
        gameState.blockedActionsAndMeta.blockedOnAcquiringLockId ===
        action.lockId
      ) {
        gameState.blockedActionsAndMeta.unblocked = true;
      }
    }
    if (action.actionType === "popTop") {
      let obj = getObjWId(gameState, action.fromObjWId);
      if (obj === undefined) {
        console.warn("Could not take action", action);
        break;
      }
      if (obj.type === "cards") {
        const topCard = obj.cards.pop();
        const topCardObj = {
          type: "cards",
          cards: [topCard],
          pos: obj.pos,
          id: action.newObjId
        };
        gameState.cardsObjs.push(topCardObj);
      }
      if (obj.type === "chips") {
        obj.count--;
        const topChipObj = {
          type: "chips",
          count: 1,
          pos: obj.pos,
          colorI: obj.colorI,
          id: action.newObjId
        };
        gameState.chipsObjs.push(topChipObj);
      }
    }
    if (action.actionType === "setInputState") {
      let newInputState = action.newInputState;
      for (let key of Object.keys(newInputState.objsById)) {
        newInputState[key] = getObjWId(gameState, newInputState.objsById[key]);
      }
      delete newInputState.objsById;
      gameState.inputState = newInputState;
      console.log(gameState.inputState);
    }
    if (action.actionType === "setObjPos") {
      // If sent setObjPos from server for something we're moving, we get overridden
      if (action.fromServer) {
        if (gameState.inputState?.mode === "dragging") {
          if (action.objId === gameState.inputState.objDragged?.id) {
            gameState.inputState = undefined;
            break;
          }
        }
      }
      const obj = getObjWId(gameState, action.objId);
      if (obj === undefined) {
        console.warn("Could not take action", action);
        break;
      }
      obj.pos = action.pos;
    }
    if (action.actionType === "mergeObjs") {
      let objs = action.objIds.map(i => getObjWId(gameState, i));
      if (objs.filter(o => o === undefined).length > 0) {
        console.warn("Could not take action", action);
        break;
      }
      if (objs[0].type === "chips") {
        gameState.chipsObjs = gameState.chipsObjs.filter(cO => cO !== objs[0]);
        objs[1].count += objs[0].count;
      }
      if (objs[0].type === "cards") {
        gameState.cardsObjs = gameState.cardsObjs.filter(cO => cO !== objs[0]);
        objs[1].cards = [...objs[1].cards, ...objs[0].cards];
      }
    }
    if (action.actionType === "clearInputState") {
      gameState.inputState = undefined;
    }
    if (action.actionType === "flip") {
      const cardsObj = getObjWId(gameState, action.objsById.cardsObj);
      const topCardObj = cardsObj.cards[cardsObj.cards.length - 1];
      topCardObj.mode = action.toFace;
    }
    if (action.actionType === "gatherAndSetDeck") {
      gameState.cardsObjs = [action.newDeck];
    }
    if (action.actionType === "separateChips") {
      const chipsObj = getObjWId(gameState, action.chipsObjId);
      if (chipsObj === undefined) {
        console.warn("Could not take action", action);
        break;
      }
      gameState.chipsObjs.push({
        type: "chips",
        count: chipsObj.count - action.countToSplit,
        pos: chipsObj.pos,
        colorI: chipsObj.colorI,
        id: action.newChipsId
      });
      chipsObj.count = action.countToSplit;
    }
    if (action.actionType === "openMenu") {
      const obj = getObjWId(gameState, action.objId);
      if (obj === undefined) {
        console.warn("Could not take action", action);
        break;
      }
      const menuObj = getMenuObjForObj(obj);
      menuObj.mouseDownPosOnRelatedObj = action.menuClickPos;
      gameState.menuObjs.push(menuObj);
    }
    if (action.actionType === "closeMenus") {
      gameState.menuObjs = [];
    }
    if (action.actionType === "setPeekState") {
      const cardsObj = getObjWId(gameState, action.cardObjId);
      if (cardsObj === undefined || action.playerId === undefined) {
        console.warn("Could not take action", action);
        break;
      }
      const topCardObj = cardsObj.cards[cardsObj.cards.length - 1];
      topCardObj.peeking = topCardObj.peeking || [];
      topCardObj.peeking[action.playerId] = action.peekState;
    }
    if (action.actionType === "addPlayer") {
      addPlayer(gameState, action.playerName, action.id, action.pos);
    }
  }
};

export const getInitialGameState = () => {
  const initialChipsObjs = [
    {
      type: "chips",
      colorI: 0,
      count: 25,
      pos: [gameWidth - 80, gameHeight / 2 - 50],
      id: ID()
    },
    {
      type: "chips",
      colorI: 0,
      count: 25,
      pos: [gameWidth - 110, gameHeight / 2 - 50],
      id: ID()
    },
    {
      type: "chips",
      colorI: 0,
      count: 25,
      pos: [gameWidth - 50, gameHeight / 2 - 50],
      id: ID()
    },
    {
      type: "chips",
      colorI: 2,
      count: 25,
      pos: [gameWidth - 80, gameHeight / 2],
      id: ID()
    },
    {
      type: "chips",
      colorI: 2,
      count: 25,
      pos: [gameWidth - 110, gameHeight / 2],
      id: ID()
    },
    {
      type: "chips",
      colorI: 1,
      count: 25,
      pos: [gameWidth - 80, gameHeight / 2 + 50],
      id: ID()
    },
    {
      type: "chips",
      colorI: 1,
      count: 25,
      pos: [gameWidth - 110, gameHeight / 2 + 50],
      id: ID()
    }
  ];

  let initialTextObjs = [
    {
      type: "text",
      text: "Bank",
      pos: [gameWidth - 85, gameHeight / 2 - 80],
      id: ID()
    },
    {
      type: "text",
      text: "Pot",
      pos: [gameWidth / 2 - textHeight * 1.5, gameHeight / 2 + 70],
      id: ID()
    },
    {
      type: "text",
      text: "Communal Cards",
      pos: [gameWidth / 2 - 70, gameHeight / 2 - 50],
      id: ID()
    }
  ];
  // initialTextObjs.forEach(o => alignTextObj(o, "center"));
  // initialTextObjs.forEach(addSizeInfoToTextObj);

  let gameState = {
    cardsObjs: [getNewDeckObj()],
    playerObjs: [],
    chipsObjs: initialChipsObjs,
    textObjs: initialTextObjs,
    menuObjs: [],
    inputState: undefined
  };

  return gameState;
};

const updateGameStateInWayOnlyClientCan = gameState => {
  gameState.textObjs.forEach(addSizeInfoToTextObj);
};
