import { objSizes } from "./constants.mjs";

export const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const ID = () =>
  "_" +
  Math.random()
    .toString(36)
    .substr(2, 9);

export const getMousePos = (canvas, e) => {
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  return [x, y];
};

export const distance = (posA, posB) =>
  Math.sqrt(Math.pow(posA[0] - posB[0], 2) + Math.pow(posA[1] - posB[1], 2));

export const getNewDeck = () => {
  let deck = [];
  for (let val = 1; val <= 13; val++) {
    for (let suit = 0; suit < 4; suit++) {
      deck.push({ suit, val, mode: "faceDown", id: ID() });
    }
  }
  return shuffle(deck);
};

export const getSuitNameAndCardNameFromCard = card => {
  let name;
  if (card.val === 1) {
    name = "Ace";
  } else if (card.val >= 2 && card.val <= 10) {
    name = card.val + "";
  } else if (card.val === 11) {
    name = "Jack";
  } else if (card.val === 12) {
    name = "Queen";
  } else if (card.val === 13) {
    name = "King";
  }
  const suits = ["Spades", "Clubs", "Hearts", "Diamonds"];
  const suit = suits[card.suit];
  return {
    name,
    suit
  };
};

export const getCardName = card =>
  `${card.name.toLowerCase()}_of_${card.suit.toLowerCase()}`;

export const objCollidesWPos = (obj, cPos) => {
  const { pos, type } = obj;
  let width;
  let height;
  if (type === "text" || type === "menuText" || type === 'player') {
    ({ width, height } = obj);
    // Fudge factor because text height doesn't include decenders
    height += 3;
  } else {
    [width, height] = objSizes[type];
  }
  if (cPos[0] > pos[0] && cPos[0] < pos[0] + width) {
    if (cPos[1] > pos[1] && cPos[1] < pos[1] + height) {
      return true;
    }
  }
  return false;
};

export const objCollidesWObj = (objA, objB, margin = 1) => {
  const [objAWidth, objAHeight] = objSizes[objA.type];
  const topLeft = [objA.pos[0] + margin, objA.pos[1] + margin];
  const topRight = [objA.pos[0] + objAWidth - margin, objA.pos[1] + margin];
  const bottomLeft = [objA.pos[0] + margin, objA.pos[1] - margin + objAHeight];
  const bottomRight = [
    objA.pos[0] + objAWidth - margin,
    objA.pos[1] - margin + objAHeight
  ];
  const corners = [topLeft, topRight, bottomLeft, bottomRight];
  for (const corner of corners) {
    if (objCollidesWPos(objB, corner)) {
      return true;
    }
  }
  return false;
};
