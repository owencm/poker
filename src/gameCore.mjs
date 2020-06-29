import {
  objSizes,
  gameWidth,
  gameHeight,
  textHeight,
  menuPaddingV,
  menuPaddingH,
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
  let playerObj = {
    type: "player",
    name,
    pos,
    id
  }
  // Bit of a hack because we don't have a clean distinction between requesting add player and actually adding
  if (!onServer) { addSizeInfoToTextOrPlayerObj(playerObj) }
  gameState.playerObjs.push(playerObj);
};

export const addSizeInfoToTextOrPlayerObj = obj => {
  if (onServer) {
    throw "Should not be asked to use ctx on server";
  }
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  const ctx = canvas.getContext("2d");
  ctx.font = `${textHeight}px Arial`;
  obj.width = ctx.measureText(obj.text || obj.name).width;
  obj.height = textHeight;
};

const addSizeInfoToMenuObj = menuObj => {
  if (menuObj.options === undefined || menuObj.options.length === 0) {
    return;
  }
  menuObj.options.forEach(addSizeInfoToTextOrPlayerObj);
  menuObj.maxTextWidth = menuObj.options
    .map(x => x.width)
    .reduce((x, y) => Math.max(x, y));
  menuObj.width = menuObj.maxTextWidth + 2 * menuPaddingH;
  menuObj.height =
    menuObj.options.length * (textHeight + menuPaddingV) + menuPaddingV;
  let menuPos = [...menuObj.pos];
  if (menuPos[0] + menuObj.width > gameWidth) {
    // This isnt being set right for some reason
    menuPos[0] = gameWidth - menuObj.width;
  }
  if (menuPos[1] + menuObj.height > gameHeight) {
    menuPos[1] = gameHeight - menuObj.height;
  }
  menuObj.pos = menuPos;
  for (let i = 0; i < menuObj.options.length; i++) {
    menuObj.options[i].pos = [
      menuPaddingH + menuPos[0],
      menuPaddingV + menuPos[1] + (textHeight + menuPaddingV) * i
    ];
  }
};

const getMenuObjForObj = (obj, { customPos }) => {
  let menuObj = {
    type: "menu",
    relatedToObj: obj,
    options: []
  };
  menuObj.pos = customPos !== undefined ? customPos : menuObj.relatedToObj.pos
  if (obj.type === "cards") {
    const topCardFaceDown = obj.cards[obj.cards.length - 1].mode === 'faceDown'
    if (topCardFaceDown) {
      const peekAction = obj.cards[obj.cards.length - 1].peeking[localStorage.playerId] ? 'Unpeek' : 'Peek'
      const peekSuffix = obj.cards.length > 1 ? " at top card" : " at card"
      menuObj.options.push({
        text: peekAction + peekSuffix,
        type: "menuText",
        action: { actionType: "peek" }
      });
    }
    const flipPrefix = obj.cards.length > 1 ? "Flip top card" : "Flip card"
    const flipSuffix = topCardFaceDown ? ' (so all can see)' : ''
    menuObj.options.push({
      text: flipPrefix + flipSuffix,
      type: "menuText",
      action: { actionType: "flip" }
    });
    if (obj.cards.length > 1) {
      menuObj.options.push({
        text: "Grab card stack",
        type: "menuText",
        action: { actionType: "dragX", count: Infinity }
      });
    }
    const gatherAndShuffleOption = {
      text: "Gather all cards and shuffle",
      type: "menuText",
      action: { actionType: "gatherAndSetDeck" }
    };
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
    ...gameState.textObjs,
    ...gameState.playerObjs,
  ];
  const matchingObjs = objs.filter(o => o.id === id);
  if (matchingObjs.length > 0) {
    return matchingObjs[0];
  }
};

export const updateGameStateBasedOnActions = (actions, gameState) => {
  console.log("Will do actions", actions);
  for (const action of actions) {
    if (action.actionType === "resetClient") {
      location.reload();
    }
    if (action.actionType === "popTop") {
      let obj = getObjWId(gameState, action.fromObjWId);
      if (obj === undefined || (obj.type === 'cards' && obj.cards.length === 1) || (obj.type === 'chips' && obj.count === 1)) {
        console.warn("Could not take action", action);
        return { success: false }
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
        if (newInputState[key] === undefined) {
          console.warn(`Attempted to setInputState but obj by Id ${newInputState.objsById[key]} not available any more`)
          break;
        }
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
            return { success: false };
          }
        }
      }
      const obj = getObjWId(gameState, action.objId);
      if (obj === undefined) {
        console.warn("Could not take action", action);
        return { success: false };
      }
      obj.pos = action.pos;
    }
    if (action.actionType === "mergeObjs") {
      let objs = action.objIds.map(i => getObjWId(gameState, i));
      if (objs.filter(o => o === undefined).length > 0) {
        console.warn("Could not take action", action);
        return { success: false };
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
        return { success: false };
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
        return { success: false };
      }
      const menuObj = getMenuObjForObj(obj, { customPos: action.menuClickPos });
      menuObj.mouseDownPosOnRelatedObj = action.menuClickPos
      gameState.menuObjs.push(menuObj);
    }
    if (action.actionType === "closeMenus") {
      gameState.menuObjs = [];
    }
    if (action.actionType === "setPeekState") {
      const cardsObj = getObjWId(gameState, action.cardObjId);
      if (cardsObj === undefined || action.playerId === undefined) {
        console.warn("Could not take action", action);
        return { success: false };
      }
      const topCardObj = cardsObj.cards[cardsObj.cards.length - 1];
      topCardObj.peeking = topCardObj.peeking || [];
      topCardObj.peeking[action.playerId] = action.peekState;
    }
    if (action.actionType === "addPlayer") {
      addPlayer(gameState, action.playerName, action.id, action.pos);
    }
  }
  return { success: true }
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
    },
    {
      type: "text",
      text: "Dealer",
      pos: [40, 60],
      id: ID()
    }
  ];
  // initialTextObjs.forEach(o => alignTextObj(o, "center"));
  // initialTextObjs.forEach(addSizeInfoToTextOrPlayerObj);

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
  gameState.textObjs.forEach(addSizeInfoToTextOrPlayerObj);
};
