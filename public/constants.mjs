/*
  Constants
*/

export const objSizes = {
  cards: [58, 84],
  chips: [20, 20]
};
export const gameWidth = 600;
export const gameHeight = 600;
export const textHeight = 15;
export const menuPadding = 5;

export const playerPositions = [
  [20, 20],
  [gameWidth / 2, 20],
  [gameWidth - 20, 20],
  [20, gameHeight - 20 - textHeight],
  [gameWidth / 2, gameHeight - 20 - textHeight],
  [gameWidth - 20, gameHeight - 20 - textHeight]
];
export const playerAlignment = [
  "left",
  "center",
  "right",
  "left",
  "center",
  "right"
];
