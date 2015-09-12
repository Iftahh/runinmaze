var camera = require('./camera');
var rng = require('./rng');
var StickMan = require('./stickman'),

  WIDTH=15, HEIGHT=25,
  BLUE=1, RED=2;

module.exports = function Player() {
  // private
  var x=5, y=0,
    vx=0,vy=0,
    onGround= 1,
    onWall=0,
    reversed=0,
    reverseStack = [], // stack of intersections visited for reverse powerup
    reverseDirections = [], // directions of cells to step through to get to the next intersection

    stickman = new StickMan(70,70,170),
    run = stickman.animations.run,
    stand = stickman.animations.stand,
    notMoving = 0,
    lastFired= 0,

    totalElapsed=0,
    curAnim=0,
    direction=0;

  function setAnim(anim) {
    if (anim != curAnim) {
      curAnim = anim;
      // console.log("Setting anim to "+anim.name);
      totalElapsed = 0;
    }
  }

  // public
  this.name = 'Player '+rng.int(100);

  this.up = this.left = this.right = this.btnA = this.btnB = 0;

  this.serialize= function() {
    return {
      x: x, y:y, vx:vx, vy:vy,
      anim:curAnim.name, dir:direction,
      up: this.up, left: this.left, right: this.right
    }
  };
  this.setCamera = function() {
    camera.setTarget(x,y);
  };

  this.deserialize= function(p) {
    if (undefined !== p.x) x=p.x;
    if (undefined !== p.y) y=p.y;
    if (undefined !== p.vx) vx=p.vx;
    if (undefined !== p.vy) vy=p.vy;
    if (undefined !== p.anim) setAnim(stickman.animations[p.anim]);
    if (undefined !== p.dir) direction = p.dir;
    if (undefined !== p.up) up=p.up;
    if (undefined !== p.left) left=p.left;
    if (undefined !== p.right) right=p.right;
  };

  this.isCollide = function(left, top, width, height) {
    return (Math.abs(left - x) * 2 < (width + WIDTH)) &&
         (Math.abs(top - y) * 2 < (height + HEIGHT));
  }

  this.setColor= function(col) {
    this.color = col;
    stickman = new StickMan(col==1?70:170, 70, col!=1?70:170);
    if (this.emitPlayerInfo) {
      this.emitPlayerInfo();
    }
  };
  this.setColor(BLUE);

  this.setName= function(name) {
    if (name != this.name) {
      this.name = name;
      if (this.emitPlayerInfo) {
        this.emitPlayerInfo();
      }
    }
  };

  this.draw= function(ctx,dt) {
    ctx.save()
    // ctx.translate(x,y)
    // ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // ctx.translate(WIDTH/2, HEIGHT);
    ctx.translate(x+WIDTH/2, y+HEIGHT);
    if (this.self) {
      ctx.fillStyle = '#ff0';
    }
    else {
      ctx.fillStyle = stickman.col3;
    }
    ctx.fillText(this.name, 0,-HEIGHT-5);

    ctx.scale(0.15, 0.15);
    ctx.lineWidth = 15;
    ctx.lineJoin = 'bevel';
    if (direction) {
      ctx.scale(-1,1);
    }
    curAnim.render(ctx, stickman, totalElapsed, reversed);

    ctx.restore()
  }

  this.reverseMovement = function(world,elapsed) {
    // update reverse movement
    var maze = world.maze,
      cellX = Math.floor((x+WIDTH/2) / world.cellSize),
      cellY = Math.floor((y+HEIGHT/2) / world.cellSize),
      ofs = maze.xyToOfs(cellX,cellY);
    if (!reversed) {
      reverseDirections = [];
    }
    reversed = 1;
    // find offset of cell to move to:
    totalElapsed -= elapsed;

    if (ofs == reverseStack[reverseStack.length-1]) {
      //console.log("Reached ofs at top reverseStack of len ", reverseStack.length);
      reverseStack.pop();
      reverseDirections = [];
      if (reverseStack.length == 0) {
        vx=vy=0;
        //console.log("Reached end of reverse stack, stop reversing");
        reverseStack.push(ofs);
        //this.update(world, elapsed); // stop reversing
        return;
      }
    }

    // at this point we know the offset at the top of the reverse stack (previous intersection) isn't our location
    // so we have to move back to that intersection, check if we have directions ready

    if (!reverseDirections.length) {
      //console.log("No reverse directions, generating");
      // generate reverse directions to next intersection
      // from next intersection, to current location
      maze.BFS([reverseStack[reverseStack.length-1]], ofs);
      var ofs0 = ofs;
      while (ofs != reverseStack[reverseStack.length-1]) {
        var score = maze[ofs] - 1;
        if (maze[ofs+1] == score) {
          ofs = ofs+1;
          reverseDirections.push([1,0, ofs]);
        } else if (maze[ofs-1] == score) {
          ofs = ofs-1;
          reverseDirections.push([-1,0, ofs]);
        }
        else if (maze[ofs-maze.MAZE_X] == score) {
          ofs = ofs-maze.MAZE_X;
          reverseDirections.push([0,-1, ofs]);
        }
        else if (maze[ofs+maze.MAZE_X] == score) {
          ofs = ofs+maze.MAZE_X;
          reverseDirections.push([0,1, ofs]);
        }
        else {
          // TODO remove
          console.log("can't find direction matching expected score!!! ",score);
          debugger;
          break;
        }
        //console.log("Reverse directions ", reverseDirections);
      }
      ofs = ofs0;
    }

    // at this point we have directions that will lead us to the previous intersection
    var dirToMove = reverseDirections[0];
    if (dirToMove[2] == ofs) {
      // we are at the offset that the direction wants us to go
      // place player at the cell center, and go to the next step in the directions
      x = world.cellSize*(ofs%maze.MAZE_X + 0.5);
      y = world.cellSize*(ofs/maze.MAZE_X|0);
      reverseDirections.shift();
      // if (reverseDirections.length == 0) {
      //   console.log("Reached end of directions but not reached the next intersection?!");
      //   debugger;
      // }
      dirToMove = reverseDirections[0];
    }

    // follow the step we got from the reverse direction
    direction = dirToMove[0] > 0; // look left or right - opposite of normal move - move right and look to the left
    vx = dirToMove[0]*1.1*world.maxSpeedX;
    vy = dirToMove[1]*1.1*world.maxSpeedX; // on purpose using maxSpeedX - speedY is too fast, but must remain fast enough to jump and climb
    if (dirToMove[0]) {
      setAnim(run);
    }
    if (dirToMove[1]) {
      setAnim(stickman.animations.fall);
    }

    x += vx;
    y += vy;
  }

  this.normalMove = function(world,elapsed) {
    totalElapsed += elapsed;
    var step = world.cellSize/60;
    reversed = 0;
    // update speed
    /*if (KEYS[40]) {
      vy += step;
      vy = Math.min(vy, world.cellSize);
    }
    else*/ if (this.up) {
      if (onGround) {
        vy -= world.jumpFromGround;
      }
      else {
        vy -= world.jumpFromAir;
      }
      vy = Math.max(vy, -world.maxSpeedY);

    }
    vy += world.gravity;
    vy = Math.min(vy, world.maxSpeedY);

    var groundAnim = run;
    if (this.right) {
      vx += step;
      vx = Math.min(vx, world.maxSpeedX);
      direction = 0;
    }
    else if (this.left) {
      vx -= step;
      vx = Math.max(vx, -world.maxSpeedX);
      direction = 1;
    }
    else {
      vx *= .2;
      if (Math.abs(vx) < 0.01) {
        vx = 0;
        groundAnim = stand;
      }
    }

    if (onGround && !onWall) {
      if (notMoving && this.btnA) {
        notMoving = 0.1; // don't allow zoom out while firing
        setAnim(stickman.animations.fire);
        if (!lastFired) {
          lastFired = +new Date();
          console.log("BOOM");
        }
        else {
          console.log("already fired");
        }
      }
      else {
        if (this.self) {
          lastFired = 0;
        }
        // walk, run, brakes, stand,  these should be set only if on ground and not sliding on wall
        setAnim(groundAnim);
      }
    }
    else {
      lastFired = 0;
    }

    // COLLISION DETECTION

    // find maze cell for collision check
    // initially checking Y collision, use smaller X
    var cellXLeft = Math.floor((x+vx+2) / world.cellSize),
      cellXRight = Math.floor((WIDTH-3+x+vx) / world.cellSize),
      cellYTop = Math.floor((y+vy) / world.cellSize),
      cellYBottom = Math.floor((HEIGHT+y+vy) / world.cellSize);


    onWall=onGround = 0;
    if (vy > 0) {
      //moving down
      if (!world.maze.get(cellXLeft, cellYBottom) || !world.maze.get(cellXRight, cellYBottom)) {
          // collided down, move to closest to top edge of cell
        y = cellYBottom * world.cellSize - HEIGHT;
        vy = 0;
        onGround = 1;
      }
    }
    else if (vy < 0) {
      if (!world.maze.get(cellXLeft, cellYTop) || !world.maze.get(cellXRight, cellYTop)) {
          // collided up, move to bottom edge of cell
        y = (cellYTop+1)*world.cellSize;
        vy = 0;
      }
    }

    // checking X collision, use smaller Y
    var cellXLeft = Math.floor((x+vx) / world.cellSize),
      cellXRight = Math.floor((WIDTH+x+vx) / world.cellSize),
      cellYTop = Math.floor((y+vy+2) / world.cellSize),
      cellYBottom = Math.floor((HEIGHT-1+y+vy-2) / world.cellSize);

    var wallSlide = 0;
    if (vx > 0) {
      //moving right
      if (!world.maze.get(cellXRight, cellYTop) || !world.maze.get(cellXRight, cellYBottom)) {
          // collided right, move to closest to left edge of cell
        x = cellXRight * world.cellSize - WIDTH-1;
        vx = 0;
        wallSlide = this.right && vy > 0;
      }
    }
    else if (vx < 0) {
      if (!world.maze.get(cellXLeft, cellYTop) || !world.maze.get(cellXLeft, cellYBottom)) {
          // collided left, move to right edge of cell
        x = (cellXLeft+1)*world.cellSize+1;
        vx = 0;
        wallSlide = this.left && vy > 0;
      }
    }

    if (wallSlide) {
      vy *= world.wallFriction;
      onGround = Math.random() < world.chanceJumpWall;  // small chance to be "onGround" and be able to jump
      onWall = 1;
    }

    // TODO: on wall animation

    if (this.self) {
      if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
        notMoving = 0;
      }
      else {
        notMoving += elapsed;
        if (notMoving > 3) {
          camera.scale = Math.max(camera.scale - 0.004, 0.5);
        }
        //console.log("scale "+camera.scale);
      }

      if (!notMoving || this.btnA) {
        camera.scale = Math.min(camera.scale + 0.1, 1.7);
        //console.log("scale "+camera.scale);
      }
    }

    if (!onGround) {
      if (vy > 0) {
        setAnim(stickman.animations.fall);
      }
      else {
        setAnim(stickman.animations.jump);
      }
    }


    x += vx;
    y += vy;

    // keep track of intersections for undo later
    if (world.intersections && this.self) {
      var cellX = Math.floor(x / world.cellSize),
        cellY = Math.floor(y / world.cellSize),
        ofs = world.maze.xyToOfs(cellX,cellY);
      if (world.intersections[ofs] && reverseStack[reverseStack.length-1] != ofs) {
        console.log("Pushing "+cellX+","+cellY+"  ofs:"+ofs+" to reverse stack");
        reverseStack.push(ofs);
        // not likely the stack will increase to this size but I hate having arrays growing to infinity
        if (reverseStack.length > 300) {
          reverseStack.shift();
        }
      }
    }
  }

  this.update= function(world, elapsed) {
    if (this.btnB && reverseStack.length) {
      this.reverseMovement(world,elapsed);
    }
    else {
      this.normalMove(world,elapsed);
    }

  }

  return this;
}
