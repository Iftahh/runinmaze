'use strict';

var io = require('sandbox-io');
var Maze = require('./dfs_maze_gen');

/*********
1. player 1 connect - get game state, join game if possible
   - game state:  waiting for more players
2. player 2..N opens game - join game
   - game state:  can Start
3. player 1..N change color/name - update server, server updates 1..N
3. player X starts game
   - game state: started, level created
4. player 1..N updates server every 33ms
5. server moves NPCs and updates 1..N players every 33ms
6. game ends - goes back to waiting for users
**********/


var
  WAITING_FOR_GAME_START = 0,
  GAME_STARTING = 1,
  GAME_STARTED = 2,

  players= [],
  bulbs = {},
  sockets={},
  maze= [],
  id = 'g'+Math.random(),  // TODO: support multiple games
  state = WAITING_FOR_GAME_START;

function findPlayer(player) {
  for (var i=0; i<players.length; i++) {
    if (players[i].id == player.id) {
      return players[i];
    }
  }
}

function playerStarted(player,data) {
  log("Game starting!");
  state = GAME_STARTING;

  io.to(id)
    .emit('news', { message: player.name+' started the game!' })
    .emit('state', { state: state, players: players });

  // repeat "game starting in X seconds, for 'repeat' times, then start the game"
  var repeat = 3;//6 ;
  var bulbsOfs = [];

  var repeater = function() {
    if (state != GAME_STARTING) {
      return;
    }
    repeat--;
    if (repeat <= 0 && bulbsOfs.length > 5) {
      state = GAME_STARTED;
      var blueInd = Math.random()*2|0;
      io.to(id).emit('state', { state: state,
        mazeX:48, mazeY:40, maze:maze,
        //places: maze.places,
        red:bulbsOfs[1-blueInd], blue:bulbsOfs[blueInd],
        bulbs:bulbs });

      // start updating the game state -
      setTimeout(function gameTick() {
        if (state != GAME_STARTED) return;
        io.to(id).emit('state', {
          state:state,
          players:players,
          bulbs: bulbs
        });
        setTimeout(gameTick, 33);
      }, 33);

    }
    else {
      io.to(id).emit('news', { message: 'Game starting in '+repeat+'!' });
    }
    setTimeout(repeater, 1000);
  };
  repeater();

  // generate a maze with enough potential places for bulb lights
  var potentials = [];
  while (potentials.length < 11) {
    log("Generating Maze");
    maze = Maze(24,20);
    potentials = maze.places.bottomDE.concat(maze.places.horizDE);
  }
  // find places for bulb lights - farthest places of the potentials starting with from the first
  var maxOfs= Math.random()*potentials.length|0;
  bulbsOfs.push(potentials.splice(maxOfs,1)[0]);
  while (bulbsOfs.length < 7) {
    maze.BFS(bulbsOfs); // calculate distance from bulbs so far
    // find the farthest potential place, add repeat
    var max=0;
    for (var i=0; i<potentials.length; i++) {
      if (maze[potentials[i]] > max) {
        max = maze[potentials[i]];
        maxOfs = i;
      }
    }
    bulbsOfs.push(potentials.splice(maxOfs,1)[0]);
  }
  // found 7 distant places with bulbs - 1st place will be blue team, 2nd place will be red team
  bulbs = {}
  for (var i=2; i<bulbsOfs.length; i++) {
    bulbs[bulbsOfs[i]] = 0; // color white
  }
  for (var i=0; i<maze.cycles.length; i++) {
    bulbs[maze.cycles[i]] = 1;
  }
}

function playerUpdate(player, data) {
  if (state != GAME_STARTED) {
    // expect player updates when game is ongoing
    return;
  }
  for (k in data) {
    player[k] = data[k];
  }
}

function playerInfo(player,data) {
  if (state != WAITING_FOR_GAME_START) {
    // allow changing player name/color only before game start
    return;
  }
  for (k in data) {
    player[k] = data[k];
  }

  var found = findPlayer(player);
  if (!found) {
    players.push(player);
    log('Player connected', { name: player.name });
    sockets[player.id].join(id);
    io.to(id).emit('news', { message: player.name+' joined the game', player: player });
  }
  else {
    log('Player updated', data);
  }

  io.to(id)
    .emit('state', { state: state, players: players });

}

function onExit(player) {
  log('Player exit', { name: player.name, color: player.color });
  var found = findPlayer(player);
  if (found) {
    players.splice(players.indexOf(found),1);
    sockets[player.id].disconnect();
    delete sockets[player.id];
    var msg = '';
    if (players.length < 2) {
      msg = player.name+' left the game,<br> not enough players remained -<br> THE END';
      log(msg);
      state = WAITING_FOR_GAME_START;
      io.to(id)
        .emit('state', { state: state, players: players, endMsg:msg });
    }
    io.to(id)
      .emit('news', { message: player.name+' left the game'})
  }
}

var color = 1;
io.on('connection', function(socket) {
  log('New connection', socket.id);

  color = 3-color; // toggle 1,2
  var player = {
    id: 'p'+Math.random(),
    color: color
  };
  sockets[player.id] = socket;
  socket.on('playerInfo', function(d) { playerInfo(player,d)});
  socket.on('startGame', function(d) { playerStarted(player,d)});
  socket.on('update', function(d) { playerUpdate(player,d)});
  socket.on('bulbUpdate', function(d) { log("bulb "+d.ofs+" updated to "+d.color); bulbs[d.ofs] = d.color ; });
  socket.on('disconnect', onExit.bind(0,player));

  socket.emit('yourId', {id: player.id, color: color});
});
