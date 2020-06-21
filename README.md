![screenshot](https://i.ibb.co/MDNwsTx/Screen-Shot-2020-04-03-at-6-15-56-PM-copy.png)

To run locally:
* Switch index.html to referencing index.js instead of bundle.js
* Switch server to listen to 3000
* Switch server to static serve 'src' instead of 'built'
* node --experimental-modules server.js

To run on server:
* Switch above to inverse
* Build with Babel (TODO: add notes on how)
* Copy relevant files to server
* ssh in, then something like nohup forever node --experimental-modules server.js