var utils = require('./utils');


var KEYS={};

var updateFromKeys = function(e, realEv) {
  var code= e.keyCode;
    KEYS[code]=  e.type == 'keydown';
    //console.log('code is ',code);
    var element = document.getElementById(code);
    if (element) {
      if (KEYS[code]) {
        element.classList.add('clicked');
      }
      else {
        element.classList.remove('clicked');
      }
      var player = world.player;
      player.up = KEYS[38];
      player.right = KEYS[39];
      player.left = KEYS[37];
      player.btnA = KEYS[83];
      player.btnB = KEYS[65];
      if (realEv && realEv.preventDefault) {
        realEv.preventDefault();
      }
      else {
        e.preventDefault();
      }
    }
}

showcontrols.onclick = function() {
  utils.each(document.querySelectorAll(".game"), function(el) {
    el.classList.toggle('hide');
  })
}


KEYS.bind = function() {
  document.addEventListener('keydown', updateFromKeys);
  document.addEventListener('keyup', updateFromKeys);

  utils.each(['mousedown','mouseup', 'touchstart','touchmove','touchend'], function(evName) {
    //document.getElementById("left")
    arrows.addEventListener(evName, function(event) {
        event.preventDefault();
        var type = event.type, x=event.clientX, y=event.clientY;
        if (type=='touchend') {
          updateFromKeys({type:0, keyCode: 39 }, event);
          updateFromKeys({type:0, keyCode: 38 }, event);
          updateFromKeys({type:0, keyCode: 37 }, event);
          return;
        }

        if (event.touches) {
          x = event.touches[0].clientX;
          y = event.touches[0].clientY;
        }
        var e = {type: (type == 'mouseup')? 0: 'keydown' };
        // UGLY - using hard coded values from CSS
        if (x < 10+55) {
          e.keyCode = 37; // left
          updateFromKeys(e, event);
          updateFromKeys({type:0, keyCode: 39 }, event);
        }
        else if (x<10+55+65+55 && 10+55+65 <x) {
          e.keyCode = 39; // right
          updateFromKeys(e, event);
          updateFromKeys({type:0, keyCode: 37 }, event);
        }
        var y = innerHeight - y;
        if (y < 10+55+65 && 10+65 <y) {
          e.keyCode = 38;
          updateFromKeys(e, event);
          updateFromKeys({type:0, keyCode: 40 }, event);
        }

    }, false);
  });

  utils.each(document.querySelectorAll(".button"), function(el) {
    utils.each(['mousedown','mouseup', 'touchstart','touchmove','touchend'], function(evName) {
      el.addEventListener(evName, function(event) {
        var type = event.type;
        console.log("event "+ type+ " "+event.target.id);
        var e = {type: (type == 'mouseup' || type=='touchend')? 0: 'keydown', keyCode: event.target.id };
        // fake a keydown/up event
        updateFromKeys(e, event);
      });
    });
  });

}

module.exports = KEYS;
