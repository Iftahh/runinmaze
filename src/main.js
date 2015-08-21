"strict mode"
var raf = require('./raf');
var rng = require('./rng');
var PARTICLE = require('./particle');

var stickman = require('./stickman');

var AUDIO = require('./audio');
var camera = require('./camera');
var player = require('./player');
require('./fpscounter');

var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

var Maze = require('./dfs_maze_gen');

var input = require('./input');

var rand = rng();

var totalElapsed = 0;

var maze = Maze(24,20);

var width, height, halfWidth, halfHeight;
window.onresize = function() {
  width=canvas.width = innerWidth;
  height=canvas.height = innerHeight;
  halfWidth = width >> 1;
  halfHeight = height >> 1;
}
onresize();
/*
var jetpack = PARTICLE.ParticlePointEmitter(350, {
	position: vector_create(),
	angle: 90,
	angleRandom: 10,
	duration: -1,
	finishColor: [200, 45, 10, 0],
	finishColorRandom: [40,40,40,0],
	gravity: vector_create(0,.03),
	lifeSpan: 1,
	positionRandom: vector_create(4,6),
	sharpness: 12,
	sharpnessRandom: 12,
	size: 30*SIZE_FACTOR|0,
	finishSize: 75*SIZE_FACTOR|0,
	colorEdge: [40,20,10,0],
	sizeRandom: 5*SIZE_FACTOR,
	speed: 4*SIZE_FACTOR,
	speedRandom: 1*SIZE_FACTOR,
	emissionRate: 140,
	startColor: [220, 188, 88, 1],
	startColorRandom: [32, 35, 38, 0],
	updateParticle: function(particle) {

	},
	wind: 0.1,
	area: 0.1
});*/


var KEYS = require('./input');
var flip = 0, playerX=0;
var anim = stickman.animations.walk;

var world = {
  cellSize: 32, //2*Math.min((canvas.width-20)/48, (canvas.height-20)/40);
  maze: maze,
  gravity: 0.5, // reduce speed Y every tick
  maxSpeedX: 6,
  maxSpeedY: 8,
  jumpFromGround: 7.5, // boost up speed when jumping off ground
  jumpFromAir: 0.1, // smaller gravity when pressing up even in air
  chanceJumpWall: 0.2,  // chance to be able to jump from
  wallFriction: 0.7,
}



raf.start(function(elapsed) {

  // Clear the screen
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, width, height);
	ctx.save();

  player.update(world);
  camera.update();

  ctx.translate(halfWidth, halfHeight); // zoom to mid of screen
  ctx.scale(camera.scale,camera.scale);
  ctx.translate(-camera.X, -camera.Y); // translate camera
  //maze should be 20x the width of the canvas


  maze.draw(ctx, world.cellSize);
  player.draw(ctx);
  ctx.restore();


  ctx.save();
  //ctx.scale(0.5, 0.8);
  ctx.translate(160, 200);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.beginPath()
  ctx.moveTo(0,0)
  ctx.lineTo(90,0)
  ctx.moveTo(180,0)
  ctx.lineTo(270,0)
  ctx.stroke();

  var move = false;
  if (KEYS[39]) {
    move = true;
    flip = false;
  playerX += anim.getOffset(elapsed);
  }
  if (KEYS[37]) {
    move = true;
    flip = true;
    playerX -= anim.getOffset(elapsed);
  }

  if (move) {
    if (flip) {
        totalElapsed -= elapsed;
    }
    else {
      totalElapsed += elapsed;
    }
  }
  else {
    //totalElapsed = 0;
  }


  ctx.translate(playerX, 0);
  // if (flip) {
  //   ctx.scale(-1,1);
  // }
  // if ((totalElapsed % 5) > 2.5) {
  // 	ctx.translate(300,0);
  // }
  anim.render(ctx, totalElapsed);


  ctx.restore();

	checkfps();
});
