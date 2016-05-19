(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
function createPhysics(cfg){
  var shape = cfg.shape;
  var options = cfg.options;
  var body = null;

  //  http://brm.io/matter-js/docs/classes/Bodies.html
  if (shape.type === "circle"){
    body = Matter.Bodies.circle(cfg.position.x,cfg.position.y,cfg.shape.radius,cfg);
  }
  else if(shape.type === "rectangle"){
    body = Matter.bodies.rectangle(shape.x||0,shape.y||0,shape.width||1,shape.height||1,options);
  }
  else {
    console.log(shape.type + " not supported");
  }
  return body;
}


//Entity
var Entity = function(cfg){
  /*
  cfg = cfg || {
    name : "unknown",
    physics: {
      shape:{
        type:"circle",
        radius:5
      }
    }
  };
  */
  this.name = cfg.name;
  this.deleted = false;
  this.body = createPhysics(cfg.physics);
  this.body.entity = this;

  /*Override these methods with your own logic*/
  this.update = function(dt){};
  this.collideStart = function(entity){};
  this.collideEnd = function(entity){};
  this.collideActive = function(entity){};
}



//Manager
var Manager = function(engine){
  this.entities = [];
  this.deletedEntities = [];

  //Handle collisions
  Matter.Events.on(engine,'collisionStart',function(evt){
    for (var x in evt.pairs){
      var a = evt.pairs[x].bodyA,
          b = evt.pairs[x].bodyB;
      if (a.entity && b.entity){
        a.entity.collideStart(b.entity);
        b.entity.collideStart(a.entity);
      }
    };
  });

  Matter.Events.on(engine,'collisionEnd',function(evt){
    for (var x in evt.pairs){
      var a = evt.pairs[x].bodyA,
          b = evt.pairs[x].bodyB;
      if (a.entity && b.entity){
        a.entity.collideEnd(b.entity);
        b.entity.collideEnd(a.entity);
      }
    };
  });

  Matter.Events.on(engine,'collisionActive',function(evt){
    for (var x in evt.pairs){
      var a = evt.pairs[x].bodyA,
          b = evt.pairs[x].bodyB;
      if (a.entity && b.entity){
        a.entity.collideActive(b.entity);
        b.entity.collideActive(a.entity);
      }
    };
  });

};

Manager.prototype = {
  createEntity : function(cfg){
    console.log(cfg);
    //var e = new Entity(cfg);
    //this.entities.push(e);
    //return e;
  },


  update: function(dt){
    //update entities
    for (var i=0; i < this.entities.size; i++){
      if (this.entities[i].update)
        this.entities[i].update(dt);

      if (this.entities[i].deleted)
        this.removedEntites.push(this.entities[i])
    }

    //remove deleted entities
    for (var i=0; i < this.deletedEntities.size; i++){
      Matter.World.remove(this.engine.world,this.deletedEntities[i].bodies);
      var x = this.entities.indexOf(this.deletedEntities[i]);
      this.entities.splice(x,1);
    }
  }
}

module.exports = Manager;

},{}],3:[function(require,module,exports){

// https://www.npmjs.com/package/gameloop
var Game = require("gameloop");
// http://brm.io/matter-js
var Matter = require("matter-js");

var EntityManager = require("./EntityManager.js");

//This is a singleton class. Requiring this module always returns the same
// game object

var game = new Game({
  fps:15
});


game.physics = Matter.Engine.create();
game.physics.world.gravity = {x:0,y:.5};

game.entityManager = new EntityManager(game.physics);


var debugRender = true;

if (debugRender){
 game.renderer = Matter.Render.create({
     element: document.body,
     engine: game.physics,
     options: {
       width:800,
       height:600
     }
 });
}

game.on('start', function () {

  var world = game.physics.world;

  //var ball = game.entityManager.createEntity();

  //ball = Matter.Bodies.circle(400,0,30,{restitution:.5}),
  //floor = Matter.Bodies.rectangle(400,600,800,50,{isStatic:true});
  Matter.World.add(world,[ball,floor]);
});

game.on('end', function (state) {

});

game.on('resume', function () {

});

game.on('pause', function () {

});

game.on('update', function(dt){
  Matter.Engine.update(this.physics,1000/this.fps);
  this.entityManager.update(dt);
});

game.on('draw', function (renderer, dt) {
  if (debugRender){
    Matter.Render.world(renderer,this.physics);
  }
});

module.exports = game;

},{"./EntityManager.js":2,"gameloop":5,"matter-js":37}],4:[function(require,module,exports){
var game = require("./Game.js");

game.start();

},{"./Game.js":3}],5:[function(require,module,exports){
var Emitter = require('eventemitter2').EventEmitter2
var now = require('performance-now')
var inherits = require('inherits')
var raf = require('raf')

module.exports = Game
inherits(Game, Emitter)

/**
* Create the game
* @name createGame
* @param {Object} options
* @param {Object} options.renderer
* @param {Number} options.fps
* @example
* var createGame = require('gameloop')
*
* var game = createGame({
*   renderer: document.createElement('canvas').getContext('2d')
* })
*/
function Game (options) {
  if (!(this instanceof Game)) return new Game(options)
  options = options || {}
  Emitter.call(this)
  this.paused = true
  this.renderer = options.renderer || {}
  this.fps = options.fps || 60
  this.step = 1 / this.fps
}

/**
* Start the game. Emits the `start` event.
* @name game.start
* @fires Game#start
* @param {Object} state – arbitrary starting game state emitted by `start` event.
* @example
* game.start()
*/
Game.prototype.start = function gameloop_start (state) {
  this.paused = false
  this.last = now()
  this.time = 0
  this.accumulator = 0
  this.emit('start', state)
  raf(this.frame.bind(this))
}

/**
* Execute a frame
* @name game.frame
* @private
*/
Game.prototype.frame = function gameloop_frame (time) {
  if (!this.paused) {
    var newTime = now()
    var dt = (newTime - this.last) / 1000
    if (dt > 0.2) dt = this.step
    this.accumulator += dt
    this.last = newTime

    while (this.accumulator >= this.step) {
      this.update(this.step, this.time)
      this.time += dt
      this.accumulator -= this.step
    }

    this.draw(this.renderer, this.accumulator / this.step)
    raf(this.frame.bind(this))
  }
}

/**
* Update the game state. Emits the `update` event. You'll likely never call this method, but you may need to override it. Make sure to always emit the update event with the `delta` time.
* @name game.update
* @param {Number} interval – interval between each frame
* @param {Number} time – total time elapsed
* @fires Game#update
*/
Game.prototype.update = function gameloop_update (interval, time) {
  this.emit('update', interval, time)
}

/**
* Draw the game. Emits the `draw` event. You'll likely never call this method, but you may need to override it. Make sure to always emit the update event with the renderer and `delta` time.
* @name game.draw
* @param {Object} renderer
* @param {Number} deltaTime – time remaining until game.update is called
* @fires Game#draw
*/
Game.prototype.draw = function gameloop_draw (renderer, frameState) {
  this.emit('draw', renderer, frameState)
}

/**
* End the game. Emits the `end` event/
* @name game.end
* @param {Object} state – state of end game conditions
* @fires Game#end
* @example
* game.end()
*/
Game.prototype.end = function gameloop_end (state) {
  this.emit('end', state)
}

/**
* Pause the game. Emits the `pause` event.
* @name game.pause
* @fires Game#pause
* @example
* game.pause()
*/
Game.prototype.pause = function gameloop_pause () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

/**
* Resume the game. Emits the `resume` event.
* @name game.resume
* @fires Game#resume
* @example
* game.resume()
*/
Game.prototype.resume = function gameloop_resume () {
  if (this.paused) {
    this.start()
    this.emit('resume')
  }
}

/**
* Pause or start game depending on game state. Emits either the `pause` or `resume` event.
* @name game.toggle
* @example
* game.toggle()
*/
Game.prototype.toggle = function gameloop_toggle () {
  if (this.paused) this.resume()
  else this.pause()
}

/* Event documentation */

/**
* Start event. Fired when `game.start()` is called.
*
* @event Game#start
* @example
* game.on('start', function () {})
*/

/**
* End event. Fired when `game.end()` is called.
*
* @event Game#end
* @param {Object} state - state of end game conditions
* @example
* game.on('end', function (state) {})
*/

/**
* Update event.
*
* @event Game#update
* @param {Number} interval – interval between each frame
* @param {Number} frameState – current state of the completion of the frame
* @param {Number} time – total time elapsed
* @example
* game.on('update', function (interval, time) {
*   console.log(interval)
* })
*/

/**
* Draw event.
*
* @event Game#draw
* @param {Number} frameState – current state of the completion of the frame
* @param {Number} delta
* @example
* game.on('draw', function (renderer, dt) {
*   console.log(dt)
* })
*/

/**
* Pause event. Fired when `game.pause()` is called.
*
* @event Game#pause
* @example
* game.on('pause', function () {})
*/

/**
* Resume event. Fired when `game.resume()` is called.
*
* @event Game#resume
* @example
* game.on('resume', function () {})
*/

},{"eventemitter2":6,"inherits":7,"performance-now":8,"raf":9}],6:[function(require,module,exports){
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */
;!function(undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {

      this._conf = conf;

      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }

    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }

        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;

            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  }

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    }

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {

    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {

      if (!this._all &&
        !this._events.error &&
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || !!this._all;
    }
    else {
      return !!this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {

    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;

        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    if(!this._all) {
      this._all = [];
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          continue;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1);
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
        return this;
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
     // AMD. Register as an anonymous module.
    define(function() {
      return EventEmitter;
    });
  } else if (typeof exports === 'object') {
    // CommonJS
    exports.EventEmitter2 = EventEmitter;
  }
  else {
    // Browser global.
    window.EventEmitter2 = EventEmitter;
  }
}();

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

}).call(this,require('_process'))

},{"_process":1}],9:[function(require,module,exports){
(function (global){
var now = require('performance-now')
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function() {
  root.requestAnimationFrame = raf
  root.cancelAnimationFrame = caf
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"performance-now":8}],10:[function(require,module,exports){
/**
* The `Matter.Body` module contains methods for creating and manipulating body models.
* A `Matter.Body` is a rigid body that can be simulated by a `Matter.Engine`.
* Factories for commonly used body configurations (such as rectangles, circles and other polygons) can be found in the module `Matter.Bodies`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).

* @class Body
*/

var Body = {};

module.exports = Body;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Sleeping = require('../core/Sleeping');
var Render = require('../render/Render');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');
var Axes = require('../geometry/Axes');

(function() {

    Body._inertiaScale = 4;
    Body._nextCollidingGroupId = 1;
    Body._nextNonCollidingGroupId = -1;
    Body._nextCategory = 0x0001;

    /**
     * Creates a new rigid body model. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} options
     * @return {body} body
     */
    Body.create = function(options) {
        var defaults = {
            id: Common.nextId(),
            type: 'body',
            label: 'Body',
            parts: [],
            angle: 0,
            vertices: Vertices.fromPath('L 0 0 L 40 0 L 40 40 L 0 40'),
            position: { x: 0, y: 0 },
            force: { x: 0, y: 0 },
            torque: 0,
            positionImpulse: { x: 0, y: 0 },
            constraintImpulse: { x: 0, y: 0, angle: 0 },
            totalContacts: 0,
            speed: 0,
            angularSpeed: 0,
            velocity: { x: 0, y: 0 },
            angularVelocity: 0,
            isSensor: false,
            isStatic: false,
            isSleeping: false,
            motion: 0,
            sleepThreshold: 60,
            density: 0.001,
            restitution: 0,
            friction: 0.1,
            frictionStatic: 0.5,
            frictionAir: 0.01,
            collisionFilter: {
                category: 0x0001,
                mask: 0xFFFFFFFF,
                group: 0
            },
            slop: 0.05,
            timeScale: 1,
            render: {
                visible: true,
                opacity: 1,
                sprite: {
                    xScale: 1,
                    yScale: 1,
                    xOffset: 0,
                    yOffset: 0
                },
                lineWidth: 1.5
            }
        };

        var body = Common.extend(defaults, options);

        _initProperties(body, options);

        return body;
    };

    /**
     * Returns the next unique group index for which bodies will collide.
     * If `isNonColliding` is `true`, returns the next unique group index for which bodies will _not_ collide.
     * See `body.collisionFilter` for more information.
     * @method nextGroup
     * @param {bool} [isNonColliding=false]
     * @return {Number} Unique group index
     */
    Body.nextGroup = function(isNonColliding) {
        if (isNonColliding)
            return Body._nextNonCollidingGroupId--;

        return Body._nextCollidingGroupId++;
    };

    /**
     * Returns the next unique category bitfield (starting after the initial default category `0x0001`).
     * There are 32 available. See `body.collisionFilter` for more information.
     * @method nextCategory
     * @return {Number} Unique category bitfield
     */
    Body.nextCategory = function() {
        Body._nextCategory = Body._nextCategory << 1;
        return Body._nextCategory;
    };

    /**
     * Initialises body properties.
     * @method _initProperties
     * @private
     * @param {body} body
     * @param {} options
     */
    var _initProperties = function(body, options) {
        // init required properties (order is important)
        Body.set(body, {
            bounds: body.bounds || Bounds.create(body.vertices),
            positionPrev: body.positionPrev || Vector.clone(body.position),
            anglePrev: body.anglePrev || body.angle,
            vertices: body.vertices,
            parts: body.parts || [body],
            isStatic: body.isStatic,
            isSleeping: body.isSleeping,
            parent: body.parent || body
        });

        Vertices.rotate(body.vertices, body.angle, body.position);
        Axes.rotate(body.axes, body.angle);
        Bounds.update(body.bounds, body.vertices, body.velocity);

        // allow options to override the automatically calculated properties
        Body.set(body, {
            axes: options.axes || body.axes,
            area: options.area || body.area,
            mass: options.mass || body.mass,
            inertia: options.inertia || body.inertia
        });

        // render properties
        var defaultFillStyle = (body.isStatic ? '#eeeeee' : Common.choose(['#556270', '#4ECDC4', '#C7F464', '#FF6B6B', '#C44D58'])),
            defaultStrokeStyle = Common.shadeColor(defaultFillStyle, -20);
        body.render.fillStyle = body.render.fillStyle || defaultFillStyle;
        body.render.strokeStyle = body.render.strokeStyle || defaultStrokeStyle;
        body.render.sprite.xOffset += -(body.bounds.min.x - body.position.x) / (body.bounds.max.x - body.bounds.min.x);
        body.render.sprite.yOffset += -(body.bounds.min.y - body.position.y) / (body.bounds.max.y - body.bounds.min.y);
    };

    /**
     * Given a property and a value (or map of), sets the property(s) on the body, using the appropriate setter functions if they exist.
     * Prefer to use the actual setter functions in performance critical situations.
     * @method set
     * @param {body} body
     * @param {} settings A property name (or map of properties and values) to set on the body.
     * @param {} value The value to set if `settings` is a single property name.
     */
    Body.set = function(body, settings, value) {
        var property;

        if (typeof settings === 'string') {
            property = settings;
            settings = {};
            settings[property] = value;
        }

        for (property in settings) {
            value = settings[property];

            if (!settings.hasOwnProperty(property))
                continue;

            switch (property) {

            case 'isStatic':
                Body.setStatic(body, value);
                break;
            case 'isSleeping':
                Sleeping.set(body, value);
                break;
            case 'mass':
                Body.setMass(body, value);
                break;
            case 'density':
                Body.setDensity(body, value);
                break;
            case 'inertia':
                Body.setInertia(body, value);
                break;
            case 'vertices':
                Body.setVertices(body, value);
                break;
            case 'position':
                Body.setPosition(body, value);
                break;
            case 'angle':
                Body.setAngle(body, value);
                break;
            case 'velocity':
                Body.setVelocity(body, value);
                break;
            case 'angularVelocity':
                Body.setAngularVelocity(body, value);
                break;
            case 'parts':
                Body.setParts(body, value);
                break;
            default:
                body[property] = value;

            }
        }
    };

    /**
     * Sets the body as static, including isStatic flag and setting mass and inertia to Infinity.
     * @method setStatic
     * @param {body} body
     * @param {bool} isStatic
     */
    Body.setStatic = function(body, isStatic) {
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.isStatic = isStatic;

            if (isStatic) {
                part.restitution = 0;
                part.friction = 1;
                part.mass = part.inertia = part.density = Infinity;
                part.inverseMass = part.inverseInertia = 0;

                part.positionPrev.x = part.position.x;
                part.positionPrev.y = part.position.y;
                part.anglePrev = part.angle;
                part.angularVelocity = 0;
                part.speed = 0;
                part.angularSpeed = 0;
                part.motion = 0;
            }
        }
    };

    /**
     * Sets the mass of the body. Inverse mass and density are automatically updated to reflect the change.
     * @method setMass
     * @param {body} body
     * @param {number} mass
     */
    Body.setMass = function(body, mass) {
        body.mass = mass;
        body.inverseMass = 1 / body.mass;
        body.density = body.mass / body.area;
    };

    /**
     * Sets the density of the body. Mass is automatically updated to reflect the change.
     * @method setDensity
     * @param {body} body
     * @param {number} density
     */
    Body.setDensity = function(body, density) {
        Body.setMass(body, density * body.area);
        body.density = density;
    };

    /**
     * Sets the moment of inertia (i.e. second moment of area) of the body of the body. 
     * Inverse inertia is automatically updated to reflect the change. Mass is not changed.
     * @method setInertia
     * @param {body} body
     * @param {number} inertia
     */
    Body.setInertia = function(body, inertia) {
        body.inertia = inertia;
        body.inverseInertia = 1 / body.inertia;
    };

    /**
     * Sets the body's vertices and updates body properties accordingly, including inertia, area and mass (with respect to `body.density`).
     * Vertices will be automatically transformed to be orientated around their centre of mass as the origin.
     * They are then automatically translated to world space based on `body.position`.
     *
     * The `vertices` argument should be passed as an array of `Matter.Vector` points (or a `Matter.Vertices` array).
     * Vertices must form a convex hull, concave hulls are not supported.
     *
     * @method setVertices
     * @param {body} body
     * @param {vector[]} vertices
     */
    Body.setVertices = function(body, vertices) {
        // change vertices
        if (vertices[0].body === body) {
            body.vertices = vertices;
        } else {
            body.vertices = Vertices.create(vertices, body);
        }

        // update properties
        body.axes = Axes.fromVertices(body.vertices);
        body.area = Vertices.area(body.vertices);
        Body.setMass(body, body.density * body.area);

        // orient vertices around the centre of mass at origin (0, 0)
        var centre = Vertices.centre(body.vertices);
        Vertices.translate(body.vertices, centre, -1);

        // update inertia while vertices are at origin (0, 0)
        Body.setInertia(body, Body._inertiaScale * Vertices.inertia(body.vertices, body.mass));

        // update geometry
        Vertices.translate(body.vertices, body.position);
        Bounds.update(body.bounds, body.vertices, body.velocity);
    };

    /**
     * Sets the parts of the `body` and updates mass, inertia and centroid.
     * Each part will have its parent set to `body`.
     * By default the convex hull will be automatically computed and set on `body`, unless `autoHull` is set to `false.`
     * Note that this method will ensure that the first part in `body.parts` will always be the `body`.
     * @method setParts
     * @param {body} body
     * @param [body] parts
     * @param {bool} [autoHull=true]
     */
    Body.setParts = function(body, parts, autoHull) {
        var i;

        // add all the parts, ensuring that the first part is always the parent body
        parts = parts.slice(0);
        body.parts.length = 0;
        body.parts.push(body);
        body.parent = body;

        for (i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part !== body) {
                part.parent = body;
                body.parts.push(part);
            }
        }

        if (body.parts.length === 1)
            return;

        autoHull = typeof autoHull !== 'undefined' ? autoHull : true;

        // find the convex hull of all parts to set on the parent body
        if (autoHull) {
            var vertices = [];
            for (i = 0; i < parts.length; i++) {
                vertices = vertices.concat(parts[i].vertices);
            }

            Vertices.clockwiseSort(vertices);

            var hull = Vertices.hull(vertices),
                hullCentre = Vertices.centre(hull);

            Body.setVertices(body, hull);
            Vertices.translate(body.vertices, hullCentre);
        }

        // sum the properties of all compound parts of the parent body
        var total = _totalProperties(body);

        body.area = total.area;
        body.parent = body;
        body.position.x = total.centre.x;
        body.position.y = total.centre.y;
        body.positionPrev.x = total.centre.x;
        body.positionPrev.y = total.centre.y;

        Body.setMass(body, total.mass);
        Body.setInertia(body, total.inertia);
        Body.setPosition(body, total.centre);
    };

    /**
     * Sets the position of the body instantly. Velocity, angle, force etc. are unchanged.
     * @method setPosition
     * @param {body} body
     * @param {vector} position
     */
    Body.setPosition = function(body, position) {
        var delta = Vector.sub(position, body.position);
        body.positionPrev.x += delta.x;
        body.positionPrev.y += delta.y;

        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.position.x += delta.x;
            part.position.y += delta.y;
            Vertices.translate(part.vertices, delta);
            Bounds.update(part.bounds, part.vertices, body.velocity);
        }
    };

    /**
     * Sets the angle of the body instantly. Angular velocity, position, force etc. are unchanged.
     * @method setAngle
     * @param {body} body
     * @param {number} angle
     */
    Body.setAngle = function(body, angle) {
        var delta = angle - body.angle;
        body.anglePrev += delta;

        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];
            part.angle += delta;
            Vertices.rotate(part.vertices, delta, body.position);
            Axes.rotate(part.axes, delta);
            Bounds.update(part.bounds, part.vertices, body.velocity);
            if (i > 0) {
                Vector.rotateAbout(part.position, delta, body.position, part.position);
            }
        }
    };

    /**
     * Sets the linear velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
     * @method setVelocity
     * @param {body} body
     * @param {vector} velocity
     */
    Body.setVelocity = function(body, velocity) {
        body.positionPrev.x = body.position.x - velocity.x;
        body.positionPrev.y = body.position.y - velocity.y;
        body.velocity.x = velocity.x;
        body.velocity.y = velocity.y;
        body.speed = Vector.magnitude(body.velocity);
    };

    /**
     * Sets the angular velocity of the body instantly. Position, angle, force etc. are unchanged. See also `Body.applyForce`.
     * @method setAngularVelocity
     * @param {body} body
     * @param {number} velocity
     */
    Body.setAngularVelocity = function(body, velocity) {
        body.anglePrev = body.angle - velocity;
        body.angularVelocity = velocity;
        body.angularSpeed = Math.abs(body.angularVelocity);
    };

    /**
     * Moves a body by a given vector relative to its current position, without imparting any velocity.
     * @method translate
     * @param {body} body
     * @param {vector} translation
     */
    Body.translate = function(body, translation) {
        Body.setPosition(body, Vector.add(body.position, translation));
    };

    /**
     * Rotates a body by a given angle relative to its current angle, without imparting any angular velocity.
     * @method rotate
     * @param {body} body
     * @param {number} rotation
     */
    Body.rotate = function(body, rotation) {
        Body.setAngle(body, body.angle + rotation);
    };

    /**
     * Scales the body, including updating physical properties (mass, area, axes, inertia), from a world-space point (default is body centre).
     * @method scale
     * @param {body} body
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} [point]
     */
    Body.scale = function(body, scaleX, scaleY, point) {
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];

            // scale vertices
            Vertices.scale(part.vertices, scaleX, scaleY, body.position);

            // update properties
            part.axes = Axes.fromVertices(part.vertices);

            if (!body.isStatic) {
                part.area = Vertices.area(part.vertices);
                Body.setMass(part, body.density * part.area);

                // update inertia (requires vertices to be at origin)
                Vertices.translate(part.vertices, { x: -part.position.x, y: -part.position.y });
                Body.setInertia(part, Vertices.inertia(part.vertices, part.mass));
                Vertices.translate(part.vertices, { x: part.position.x, y: part.position.y });
            }

            // update bounds
            Bounds.update(part.bounds, part.vertices, body.velocity);
        }

        // handle circles
        if (body.circleRadius) { 
            if (scaleX === scaleY) {
                body.circleRadius *= scaleX;
            } else {
                // body is no longer a circle
                body.circleRadius = null;
            }
        }

        if (!body.isStatic) {
            var total = _totalProperties(body);
            body.area = total.area;
            Body.setMass(body, total.mass);
            Body.setInertia(body, total.inertia);
        }
    };

    /**
     * Performs a simulation step for the given `body`, including updating position and angle using Verlet integration.
     * @method update
     * @param {body} body
     * @param {number} deltaTime
     * @param {number} timeScale
     * @param {number} correction
     */
    Body.update = function(body, deltaTime, timeScale, correction) {
        var deltaTimeSquared = Math.pow(deltaTime * timeScale * body.timeScale, 2);

        // from the previous step
        var frictionAir = 1 - body.frictionAir * timeScale * body.timeScale,
            velocityPrevX = body.position.x - body.positionPrev.x,
            velocityPrevY = body.position.y - body.positionPrev.y;

        // update velocity with Verlet integration
        body.velocity.x = (velocityPrevX * frictionAir * correction) + (body.force.x / body.mass) * deltaTimeSquared;
        body.velocity.y = (velocityPrevY * frictionAir * correction) + (body.force.y / body.mass) * deltaTimeSquared;

        body.positionPrev.x = body.position.x;
        body.positionPrev.y = body.position.y;
        body.position.x += body.velocity.x;
        body.position.y += body.velocity.y;

        // update angular velocity with Verlet integration
        body.angularVelocity = ((body.angle - body.anglePrev) * frictionAir * correction) + (body.torque / body.inertia) * deltaTimeSquared;
        body.anglePrev = body.angle;
        body.angle += body.angularVelocity;

        // track speed and acceleration
        body.speed = Vector.magnitude(body.velocity);
        body.angularSpeed = Math.abs(body.angularVelocity);

        // transform the body geometry
        for (var i = 0; i < body.parts.length; i++) {
            var part = body.parts[i];

            Vertices.translate(part.vertices, body.velocity);
            
            if (i > 0) {
                part.position.x += body.velocity.x;
                part.position.y += body.velocity.y;
            }

            if (body.angularVelocity !== 0) {
                Vertices.rotate(part.vertices, body.angularVelocity, body.position);
                Axes.rotate(part.axes, body.angularVelocity);
                if (i > 0) {
                    Vector.rotateAbout(part.position, body.angularVelocity, body.position, part.position);
                }
            }

            Bounds.update(part.bounds, part.vertices, body.velocity);
        }
    };

    /**
     * Applies a force to a body from a given world-space position, including resulting torque.
     * @method applyForce
     * @param {body} body
     * @param {vector} position
     * @param {vector} force
     */
    Body.applyForce = function(body, position, force) {
        body.force.x += force.x;
        body.force.y += force.y;
        var offset = { x: position.x - body.position.x, y: position.y - body.position.y };
        body.torque += offset.x * force.y - offset.y * force.x;
    };

    /**
     * Returns the sums of the properties of all compound parts of the parent body.
     * @method _totalProperties
     * @private
     * @param {body} body
     * @return {}
     */
    var _totalProperties = function(body) {
        // https://ecourses.ou.edu/cgi-bin/ebook.cgi?doc=&topic=st&chap_sec=07.2&page=theory
        // http://output.to/sideway/default.asp?qno=121100087

        var properties = {
            mass: 0,
            area: 0,
            inertia: 0,
            centre: { x: 0, y: 0 }
        };

        // sum the properties of all compound parts of the parent body
        for (var i = body.parts.length === 1 ? 0 : 1; i < body.parts.length; i++) {
            var part = body.parts[i];
            properties.mass += part.mass;
            properties.area += part.area;
            properties.inertia += part.inertia;
            properties.centre = Vector.add(properties.centre, 
                                           Vector.mult(part.position, part.mass !== Infinity ? part.mass : 1));
        }

        properties.centre = Vector.div(properties.centre, 
                                       properties.mass !== Infinity ? properties.mass : body.parts.length);

        return properties;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when a body starts sleeping (where `this` is the body).
    *
    * @event sleepStart
    * @this {body} The body that has started sleeping
    * @param {} event An event object
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a body ends sleeping (where `this` is the body).
    *
    * @event sleepEnd
    * @this {body} The body that has ended sleeping
    * @param {} event An event object
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Body.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "body"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage bodies.
     *
     * @property label
     * @type string
     * @default "Body"
     */

    /**
     * An array of bodies that make up this body. 
     * The first body in the array must always be a self reference to the current body instance.
     * All bodies in the `parts` array together form a single rigid compound body.
     * Parts are allowed to overlap, have gaps or holes or even form concave bodies.
     * Parts themselves should never be added to a `World`, only the parent body should be.
     * Use `Body.setParts` when setting parts to ensure correct updates of all properties.
     *
     * @property parts
     * @type body[]
     */

    /**
     * A self reference if the body is _not_ a part of another body.
     * Otherwise this is a reference to the body that this is a part of.
     * See `body.parts`.
     *
     * @property parent
     * @type body
     */

    /**
     * A `Number` specifying the angle of the body, in radians.
     *
     * @property angle
     * @type number
     * @default 0
     */

    /**
     * An array of `Vector` objects that specify the convex hull of the rigid body.
     * These should be provided about the origin `(0, 0)`. E.g.
     *
     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
     *
     * When passed via `Body.create`, the vertices are translated relative to `body.position` (i.e. world-space, and constantly updated by `Body.update` during simulation).
     * The `Vector` objects are also augmented with additional properties required for efficient collision detection. 
     *
     * Other properties such as `inertia` and `bounds` are automatically calculated from the passed vertices (unless provided via `options`).
     * Concave hulls are not currently supported. The module `Matter.Vertices` contains useful methods for working with vertices.
     *
     * @property vertices
     * @type vector[]
     */

    /**
     * A `Vector` that specifies the current world-space position of the body.
     *
     * @property position
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Vector` that specifies the force to apply in the current step. It is zeroed after every `Body.update`. See also `Body.applyForce`.
     *
     * @property force
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that specifies the torque (turning force) to apply in the current step. It is zeroed after every `Body.update`.
     *
     * @property torque
     * @type number
     * @default 0
     */

    /**
     * A `Number` that _measures_ the current speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.velocity`).
     *
     * @readOnly
     * @property speed
     * @type number
     * @default 0
     */

    /**
     * A `Number` that _measures_ the current angular speed of the body after the last `Body.update`. It is read-only and always positive (it's the magnitude of `body.angularVelocity`).
     *
     * @readOnly
     * @property angularSpeed
     * @type number
     * @default 0
     */

    /**
     * A `Vector` that _measures_ the current velocity of the body after the last `Body.update`. It is read-only. 
     * If you need to modify a body's velocity directly, you should either apply a force or simply change the body's `position` (as the engine uses position-Verlet integration).
     *
     * @readOnly
     * @property velocity
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that _measures_ the current angular velocity of the body after the last `Body.update`. It is read-only. 
     * If you need to modify a body's angular velocity directly, you should apply a torque or simply change the body's `angle` (as the engine uses position-Verlet integration).
     *
     * @readOnly
     * @property angularVelocity
     * @type number
     * @default 0
     */

    /**
     * A flag that indicates whether a body is considered static. A static body can never change position or angle and is completely fixed.
     * If you need to set a body as static after its creation, you should use `Body.setStatic` as this requires more than just setting this flag.
     *
     * @property isStatic
     * @type boolean
     * @default false
     */

    /**
     * A flag that indicates whether a body is a sensor. Sensor triggers collision events, but doesn't react with colliding body physically.
     *
     * @property isSensor
     * @type boolean
     * @default false
     */

    /**
     * A flag that indicates whether the body is considered sleeping. A sleeping body acts similar to a static body, except it is only temporary and can be awoken.
     * If you need to set a body as sleeping, you should use `Sleeping.set` as this requires more than just setting this flag.
     *
     * @property isSleeping
     * @type boolean
     * @default false
     */

    /**
     * A `Number` that _measures_ the amount of movement a body currently has (a combination of `speed` and `angularSpeed`). It is read-only and always positive.
     * It is used and updated by the `Matter.Sleeping` module during simulation to decide if a body has come to rest.
     *
     * @readOnly
     * @property motion
     * @type number
     * @default 0
     */

    /**
     * A `Number` that defines the number of updates in which this body must have near-zero velocity before it is set as sleeping by the `Matter.Sleeping` module (if sleeping is enabled by the engine).
     *
     * @property sleepThreshold
     * @type number
     * @default 60
     */

    /**
     * A `Number` that defines the density of the body, that is its mass per unit area.
     * If you pass the density via `Body.create` the `mass` property is automatically calculated for you based on the size (area) of the object.
     * This is generally preferable to simply setting mass and allows for more intuitive definition of materials (e.g. rock has a higher density than wood).
     *
     * @property density
     * @type number
     * @default 0.001
     */

    /**
     * A `Number` that defines the mass of the body, although it may be more appropriate to specify the `density` property instead.
     * If you modify this value, you must also modify the `body.inverseMass` property (`1 / mass`).
     *
     * @property mass
     * @type number
     */

    /**
     * A `Number` that defines the inverse mass of the body (`1 / mass`).
     * If you modify this value, you must also modify the `body.mass` property.
     *
     * @property inverseMass
     * @type number
     */

    /**
     * A `Number` that defines the moment of inertia (i.e. second moment of area) of the body.
     * It is automatically calculated from the given convex hull (`vertices` array) and density in `Body.create`.
     * If you modify this value, you must also modify the `body.inverseInertia` property (`1 / inertia`).
     *
     * @property inertia
     * @type number
     */

    /**
     * A `Number` that defines the inverse moment of inertia of the body (`1 / inertia`).
     * If you modify this value, you must also modify the `body.inertia` property.
     *
     * @property inverseInertia
     * @type number
     */

    /**
     * A `Number` that defines the restitution (elasticity) of the body. The value is always positive and is in the range `(0, 1)`.
     * A value of `0` means collisions may be perfectly inelastic and no bouncing may occur. 
     * A value of `0.8` means the body may bounce back with approximately 80% of its kinetic energy.
     * Note that collision response is based on _pairs_ of bodies, and that `restitution` values are _combined_ with the following formula:
     *
     *     Math.max(bodyA.restitution, bodyB.restitution)
     *
     * @property restitution
     * @type number
     * @default 0
     */

    /**
     * A `Number` that defines the friction of the body. The value is always positive and is in the range `(0, 1)`.
     * A value of `0` means that the body may slide indefinitely.
     * A value of `1` means the body may come to a stop almost instantly after a force is applied.
     *
     * The effects of the value may be non-linear. 
     * High values may be unstable depending on the body.
     * The engine uses a Coulomb friction model including static and kinetic friction.
     * Note that collision response is based on _pairs_ of bodies, and that `friction` values are _combined_ with the following formula:
     *
     *     Math.min(bodyA.friction, bodyB.friction)
     *
     * @property friction
     * @type number
     * @default 0.1
     */

    /**
     * A `Number` that defines the static friction of the body (in the Coulomb friction model). 
     * A value of `0` means the body will never 'stick' when it is nearly stationary and only dynamic `friction` is used.
     * The higher the value (e.g. `10`), the more force it will take to initially get the body moving when nearly stationary.
     * This value is multiplied with the `friction` property to make it easier to change `friction` and maintain an appropriate amount of static friction.
     *
     * @property frictionStatic
     * @type number
     * @default 0.5
     */

    /**
     * A `Number` that defines the air friction of the body (air resistance). 
     * A value of `0` means the body will never slow as it moves through space.
     * The higher the value, the faster a body slows when moving through space.
     * The effects of the value are non-linear. 
     *
     * @property frictionAir
     * @type number
     * @default 0.01
     */

    /**
     * An `Object` that specifies the collision filtering properties of this body.
     *
     * Collisions between two bodies will obey the following rules:
     * - If the two bodies have the same non-zero value of `collisionFilter.group`,
     *   they will always collide if the value is positive, and they will never collide
     *   if the value is negative.
     * - If the two bodies have different values of `collisionFilter.group` or if one
     *   (or both) of the bodies has a value of 0, then the category/mask rules apply as follows:
     *
     * Each body belongs to a collision category, given by `collisionFilter.category`. This
     * value is used as a bit field and the category should have only one bit set, meaning that
     * the value of this property is a power of two in the range [1, 2^31]. Thus, there are 32
     * different collision categories available.
     *
     * Each body also defines a collision bitmask, given by `collisionFilter.mask` which specifies
     * the categories it collides with (the value is the bitwise AND value of all these categories).
     *
     * Using the category/mask rules, two bodies `A` and `B` collide if each includes the other's
     * category in its mask, i.e. `(categoryA & maskB) !== 0` and `(categoryB & maskA) !== 0`
     * are both true.
     *
     * @property collisionFilter
     * @type object
     */

    /**
     * An Integer `Number`, that specifies the collision group this body belongs to.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.group
     * @type object
     * @default 0
     */

    /**
     * A bit field that specifies the collision category this body belongs to.
     * The category value should have only one bit set, for example `0x0001`.
     * This means there are up to 32 unique collision categories available.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.category
     * @type object
     * @default 1
     */

    /**
     * A bit mask that specifies the collision categories this body may collide with.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter.mask
     * @type object
     * @default -1
     */

    /**
     * A `Number` that specifies a tolerance on how far a body is allowed to 'sink' or rotate into other bodies.
     * Avoid changing this value unless you understand the purpose of `slop` in physics engines.
     * The default should generally suffice, although very large bodies may require larger values for stable stacking.
     *
     * @property slop
     * @type number
     * @default 0.05
     */

    /**
     * A `Number` that allows per-body time scaling, e.g. a force-field where bodies inside are in slow-motion, while others are at full speed.
     *
     * @property timeScale
     * @type number
     * @default 1
     */

    /**
     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
     *
     * @property render
     * @type object
     */

    /**
     * A flag that indicates if the body should be rendered.
     *
     * @property render.visible
     * @type boolean
     * @default true
     */

    /**
     * Sets the opacity to use when rendering.
     *
     * @property render.opacity
     * @type number
     * @default 1
    */

    /**
     * An `Object` that defines the sprite properties to use when rendering, if any.
     *
     * @property render.sprite
     * @type object
     */

    /**
     * An `String` that defines the path to the image to use as the sprite texture, if any.
     *
     * @property render.sprite.texture
     * @type string
     */
     
    /**
     * A `Number` that defines the scaling in the x-axis for the sprite, if any.
     *
     * @property render.sprite.xScale
     * @type number
     * @default 1
     */

    /**
     * A `Number` that defines the scaling in the y-axis for the sprite, if any.
     *
     * @property render.sprite.yScale
     * @type number
     * @default 1
     */

     /**
      * A `Number` that defines the offset in the x-axis for the sprite (normalised by texture width).
      *
      * @property render.sprite.xOffset
      * @type number
      * @default 0
      */

     /**
      * A `Number` that defines the offset in the y-axis for the sprite (normalised by texture height).
      *
      * @property render.sprite.yOffset
      * @type number
      * @default 0
      */

    /**
     * A `Number` that defines the line width to use when rendering the body outline (if a sprite is not defined).
     * A value of `0` means no outline will be rendered.
     *
     * @property render.lineWidth
     * @type number
     * @default 1.5
     */

    /**
     * A `String` that defines the fill style to use when rendering the body (if a sprite is not defined).
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.fillStyle
     * @type string
     * @default a random colour
     */

    /**
     * A `String` that defines the stroke style to use when rendering the body outline (if a sprite is not defined).
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.strokeStyle
     * @type string
     * @default a random colour
     */

    /**
     * An array of unique axis vectors (edge normals) used for collision detection.
     * These are automatically calculated from the given convex hull (`vertices` array) in `Body.create`.
     * They are constantly updated by `Body.update` during the simulation.
     *
     * @property axes
     * @type vector[]
     */
     
    /**
     * A `Number` that _measures_ the area of the body's convex hull, calculated at creation by `Body.create`.
     *
     * @property area
     * @type string
     * @default 
     */

    /**
     * A `Bounds` object that defines the AABB region for the body.
     * It is automatically calculated from the given convex hull (`vertices` array) in `Body.create` and constantly updated by `Body.update` during simulation.
     *
     * @property bounds
     * @type bounds
     */

})();

},{"../core/Common":23,"../core/Sleeping":29,"../geometry/Axes":32,"../geometry/Bounds":33,"../geometry/Vector":35,"../geometry/Vertices":36,"../render/Render":38}],11:[function(require,module,exports){
/**
* The `Matter.Composite` module contains methods for creating and manipulating composite bodies.
* A composite body is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`, therefore composites form a tree structure.
* It is important to use the functions in this module to modify composites, rather than directly modifying their properties.
* Note that the `Matter.World` object is also a type of `Matter.Composite` and as such all composite methods here can also operate on a `Matter.World`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Composite
*/

var Composite = {};

module.exports = Composite;

var Events = require('../core/Events');
var Common = require('../core/Common');
var Body = require('./Body');

(function() {

    /**
     * Creates a new composite. The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properites section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} [options]
     * @return {composite} A new composite
     */
    Composite.create = function(options) {
        return Common.extend({ 
            id: Common.nextId(),
            type: 'composite',
            parent: null,
            isModified: false,
            bodies: [], 
            constraints: [], 
            composites: [],
            label: 'Composite'
        }, options);
    };

    /**
     * Sets the composite's `isModified` flag. 
     * If `updateParents` is true, all parents will be set (default: false).
     * If `updateChildren` is true, all children will be set (default: false).
     * @method setModified
     * @param {composite} composite
     * @param {boolean} isModified
     * @param {boolean} [updateParents=false]
     * @param {boolean} [updateChildren=false]
     */
    Composite.setModified = function(composite, isModified, updateParents, updateChildren) {
        composite.isModified = isModified;

        if (updateParents && composite.parent) {
            Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
        }

        if (updateChildren) {
            for(var i = 0; i < composite.composites.length; i++) {
                var childComposite = composite.composites[i];
                Composite.setModified(childComposite, isModified, updateParents, updateChildren);
            }
        }
    };

    /**
     * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Triggers `beforeAdd` and `afterAdd` events on the `composite`.
     * @method add
     * @param {composite} composite
     * @param {} object
     * @return {composite} The original composite with the objects added
     */
    Composite.add = function(composite, object) {
        var objects = [].concat(object);

        Events.trigger(composite, 'beforeAdd', { object: object });

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                // skip adding compound parts
                if (obj.parent !== obj) {
                    Common.log('Composite.add: skipped adding a compound body part (you must add its parent instead)', 'warn');
                    break;
                }

                Composite.addBody(composite, obj);
                break;
            case 'constraint':
                Composite.addConstraint(composite, obj);
                break;
            case 'composite':
                Composite.addComposite(composite, obj);
                break;
            case 'mouseConstraint':
                Composite.addConstraint(composite, obj.constraint);
                break;

            }
        }

        Events.trigger(composite, 'afterAdd', { object: object });

        return composite;
    };

    /**
     * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Optionally searching its children recursively.
     * Triggers `beforeRemove` and `afterRemove` events on the `composite`.
     * @method remove
     * @param {composite} composite
     * @param {} object
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the objects removed
     */
    Composite.remove = function(composite, object, deep) {
        var objects = [].concat(object);

        Events.trigger(composite, 'beforeRemove', { object: object });

        for (var i = 0; i < objects.length; i++) {
            var obj = objects[i];

            switch (obj.type) {

            case 'body':
                Composite.removeBody(composite, obj, deep);
                break;
            case 'constraint':
                Composite.removeConstraint(composite, obj, deep);
                break;
            case 'composite':
                Composite.removeComposite(composite, obj, deep);
                break;
            case 'mouseConstraint':
                Composite.removeConstraint(composite, obj.constraint);
                break;

            }
        }

        Events.trigger(composite, 'afterRemove', { object: object });

        return composite;
    };

    /**
     * Adds a composite to the given composite.
     * @private
     * @method addComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @return {composite} The original compositeA with the objects from compositeB added
     */
    Composite.addComposite = function(compositeA, compositeB) {
        compositeA.composites.push(compositeB);
        compositeB.parent = compositeA;
        Composite.setModified(compositeA, true, true, false);
        return compositeA;
    };

    /**
     * Removes a composite from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @param {boolean} [deep=false]
     * @return {composite} The original compositeA with the composite removed
     */
    Composite.removeComposite = function(compositeA, compositeB, deep) {
        var position = Common.indexOf(compositeA.composites, compositeB);
        if (position !== -1) {
            Composite.removeCompositeAt(compositeA, position);
            Composite.setModified(compositeA, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < compositeA.composites.length; i++){
                Composite.removeComposite(compositeA.composites[i], compositeB, true);
            }
        }

        return compositeA;
    };

    /**
     * Removes a composite from the given composite.
     * @private
     * @method removeCompositeAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the composite removed
     */
    Composite.removeCompositeAt = function(composite, position) {
        composite.composites.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Adds a body to the given composite.
     * @private
     * @method addBody
     * @param {composite} composite
     * @param {body} body
     * @return {composite} The original composite with the body added
     */
    Composite.addBody = function(composite, body) {
        composite.bodies.push(body);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a body from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeBody
     * @param {composite} composite
     * @param {body} body
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBody = function(composite, body, deep) {
        var position = Common.indexOf(composite.bodies, body);
        if (position !== -1) {
            Composite.removeBodyAt(composite, position);
            Composite.setModified(composite, true, true, false);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeBody(composite.composites[i], body, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeBodyAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBodyAt = function(composite, position) {
        composite.bodies.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Adds a constraint to the given composite.
     * @private
     * @method addConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @return {composite} The original composite with the constraint added
     */
    Composite.addConstraint = function(composite, constraint) {
        composite.constraints.push(constraint);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes a constraint from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraint = function(composite, constraint, deep) {
        var position = Common.indexOf(composite.constraints, constraint);
        if (position !== -1) {
            Composite.removeConstraintAt(composite, position);
        }

        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.removeConstraint(composite.composites[i], constraint, true);
            }
        }

        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeConstraintAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraintAt = function(composite, position) {
        composite.constraints.splice(position, 1);
        Composite.setModified(composite, true, true, false);
        return composite;
    };

    /**
     * Removes all bodies, constraints and composites from the given composite.
     * Optionally clearing its children recursively.
     * @method clear
     * @param {composite} composite
     * @param {boolean} keepStatic
     * @param {boolean} [deep=false]
     */
    Composite.clear = function(composite, keepStatic, deep) {
        if (deep) {
            for (var i = 0; i < composite.composites.length; i++){
                Composite.clear(composite.composites[i], keepStatic, true);
            }
        }
        
        if (keepStatic) {
            composite.bodies = composite.bodies.filter(function(body) { return body.isStatic; });
        } else {
            composite.bodies.length = 0;
        }

        composite.constraints.length = 0;
        composite.composites.length = 0;
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Returns all bodies in the given composite, including all bodies in its children, recursively.
     * @method allBodies
     * @param {composite} composite
     * @return {body[]} All the bodies
     */
    Composite.allBodies = function(composite) {
        var bodies = [].concat(composite.bodies);

        for (var i = 0; i < composite.composites.length; i++)
            bodies = bodies.concat(Composite.allBodies(composite.composites[i]));

        return bodies;
    };

    /**
     * Returns all constraints in the given composite, including all constraints in its children, recursively.
     * @method allConstraints
     * @param {composite} composite
     * @return {constraint[]} All the constraints
     */
    Composite.allConstraints = function(composite) {
        var constraints = [].concat(composite.constraints);

        for (var i = 0; i < composite.composites.length; i++)
            constraints = constraints.concat(Composite.allConstraints(composite.composites[i]));

        return constraints;
    };

    /**
     * Returns all composites in the given composite, including all composites in its children, recursively.
     * @method allComposites
     * @param {composite} composite
     * @return {composite[]} All the composites
     */
    Composite.allComposites = function(composite) {
        var composites = [].concat(composite.composites);

        for (var i = 0; i < composite.composites.length; i++)
            composites = composites.concat(Composite.allComposites(composite.composites[i]));

        return composites;
    };

    /**
     * Searches the composite recursively for an object matching the type and id supplied, null if not found.
     * @method get
     * @param {composite} composite
     * @param {number} id
     * @param {string} type
     * @return {object} The requested object, if found
     */
    Composite.get = function(composite, id, type) {
        var objects,
            object;

        switch (type) {
        case 'body':
            objects = Composite.allBodies(composite);
            break;
        case 'constraint':
            objects = Composite.allConstraints(composite);
            break;
        case 'composite':
            objects = Composite.allComposites(composite).concat(composite);
            break;
        }

        if (!objects)
            return null;

        object = objects.filter(function(object) { 
            return object.id.toString() === id.toString(); 
        });

        return object.length === 0 ? null : object[0];
    };

    /**
     * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add).
     * @method move
     * @param {compositeA} compositeA
     * @param {object[]} objects
     * @param {compositeB} compositeB
     * @return {composite} Returns compositeA
     */
    Composite.move = function(compositeA, objects, compositeB) {
        Composite.remove(compositeA, objects);
        Composite.add(compositeB, objects);
        return compositeA;
    };

    /**
     * Assigns new ids for all objects in the composite, recursively.
     * @method rebase
     * @param {composite} composite
     * @return {composite} Returns composite
     */
    Composite.rebase = function(composite) {
        var objects = Composite.allBodies(composite)
                        .concat(Composite.allConstraints(composite))
                        .concat(Composite.allComposites(composite));

        for (var i = 0; i < objects.length; i++) {
            objects[i].id = Common.nextId();
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Translates all children in the composite by a given vector relative to their current positions, 
     * without imparting any velocity.
     * @method translate
     * @param {composite} composite
     * @param {vector} translation
     * @param {bool} [recursive=true]
     */
    Composite.translate = function(composite, translation, recursive) {
        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            Body.translate(bodies[i], translation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Rotates all children in the composite by a given angle about the given point, without imparting any angular velocity.
     * @method rotate
     * @param {composite} composite
     * @param {number} rotation
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.rotate = function(composite, rotation, point, recursive) {
        var cos = Math.cos(rotation),
            sin = Math.sin(rotation),
            bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                dx = body.position.x - point.x,
                dy = body.position.y - point.y;
                
            Body.setPosition(body, {
                x: point.x + (dx * cos - dy * sin),
                y: point.y + (dx * sin + dy * cos)
            });

            Body.rotate(body, rotation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Scales all children in the composite, including updating physical properties (mass, area, axes, inertia), from a world-space point.
     * @method scale
     * @param {composite} composite
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.scale = function(composite, scaleX, scaleY, point, recursive) {
        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                dx = body.position.x - point.x,
                dy = body.position.y - point.y;
                
            Body.setPosition(body, {
                x: point.x + dx * scaleX,
                y: point.y + dy * scaleY
            });

            Body.scale(body, scaleX, scaleY);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when a call to `Composite.add` is made, before objects have been added.
    *
    * @event beforeAdd
    * @param {} event An event object
    * @param {} event.object The object(s) to be added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.add` is made, after objects have been added.
    *
    * @event afterAdd
    * @param {} event An event object
    * @param {} event.object The object(s) that have been added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, before objects have been removed.
    *
    * @event beforeRemove
    * @param {} event An event object
    * @param {} event.object The object(s) to be removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, after objects have been removed.
    *
    * @event afterRemove
    * @param {} event An event object
    * @param {} event.object The object(s) that have been removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "composite"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage composites.
     *
     * @property label
     * @type string
     * @default "Composite"
     */

    /**
     * A flag that specifies whether the composite has been modified during the current step.
     * Most `Matter.Composite` methods will automatically set this flag to `true` to inform the engine of changes to be handled.
     * If you need to change it manually, you should use the `Composite.setModified` method.
     *
     * @property isModified
     * @type boolean
     * @default false
     */

    /**
     * The `Composite` that is the parent of this composite. It is automatically managed by the `Matter.Composite` methods.
     *
     * @property parent
     * @type composite
     * @default null
     */

    /**
     * An array of `Body` that are _direct_ children of this composite.
     * To add or remove bodies you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allBodies` method.
     *
     * @property bodies
     * @type body[]
     * @default []
     */

    /**
     * An array of `Constraint` that are _direct_ children of this composite.
     * To add or remove constraints you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allConstraints` method.
     *
     * @property constraints
     * @type constraint[]
     * @default []
     */

    /**
     * An array of `Composite` that are _direct_ children of this composite.
     * To add or remove composites you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allComposites` method.
     *
     * @property composites
     * @type composite[]
     * @default []
     */

})();

},{"../core/Common":23,"../core/Events":25,"./Body":10}],12:[function(require,module,exports){
/**
* The `Matter.World` module contains methods for creating and manipulating the world composite.
* A `Matter.World` is a `Matter.Composite` body, which is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`.
* A `Matter.World` has a few additional properties including `gravity` and `bounds`.
* It is important to use the functions in the `Matter.Composite` module to modify the world composite, rather than directly modifying its properties.
* There are also a few methods here that alias those in `Matter.Composite` for easier readability.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class World
* @extends Composite
*/

var World = {};

module.exports = World;

var Composite = require('./Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new world composite. The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @constructor
     * @param {} options
     * @return {world} A new world
     */
    World.create = function(options) {
        var composite = Composite.create();

        var defaults = {
            label: 'World',
            gravity: {
                x: 0,
                y: 1,
                scale: 0.001
            },
            bounds: { 
                min: { x: -Infinity, y: -Infinity }, 
                max: { x: Infinity, y: Infinity } 
            }
        };
        
        return Common.extend(composite, defaults, options);
    };

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * The gravity to apply on the world.
     *
     * @property gravity
     * @type object
     */

    /**
     * The gravity x component.
     *
     * @property gravity.x
     * @type object
     * @default 0
     */

    /**
     * The gravity y component.
     *
     * @property gravity.y
     * @type object
     * @default 1
     */

    /**
     * The gravity scale factor.
     *
     * @property gravity.scale
     * @type object
     * @default 0.001
     */

    /**
     * A `Bounds` object that defines the world bounds for collision detection.
     *
     * @property bounds
     * @type bounds
     * @default { min: { x: -Infinity, y: -Infinity }, max: { x: Infinity, y: Infinity } }
     */

    // World is a Composite body
    // see src/module/Outro.js for these aliases:
    
    /**
     * An alias for Composite.clear
     * @method clear
     * @param {world} world
     * @param {boolean} keepStatic
     */

    /**
     * An alias for Composite.add
     * @method addComposite
     * @param {world} world
     * @param {composite} composite
     * @return {world} The original world with the objects from composite added
     */
    
     /**
      * An alias for Composite.addBody
      * @method addBody
      * @param {world} world
      * @param {body} body
      * @return {world} The original world with the body added
      */

     /**
      * An alias for Composite.addConstraint
      * @method addConstraint
      * @param {world} world
      * @param {constraint} constraint
      * @return {world} The original world with the constraint added
      */

})();

},{"../constraint/Constraint":21,"../core/Common":23,"./Composite":11}],13:[function(require,module,exports){
/**
* The `Matter.Contact` module contains methods for creating and manipulating collision contacts.
*
* @class Contact
*/

var Contact = {};

module.exports = Contact;

(function() {

    /**
     * Creates a new contact.
     * @method create
     * @param {vertex} vertex
     * @return {contact} A new contact
     */
    Contact.create = function(vertex) {
        return {
            id: Contact.id(vertex),
            vertex: vertex,
            normalImpulse: 0,
            tangentImpulse: 0
        };
    };
    
    /**
     * Generates a contact id.
     * @method id
     * @param {vertex} vertex
     * @return {string} Unique contactID
     */
    Contact.id = function(vertex) {
        return vertex.body.id + '_' + vertex.index;
    };

})();

},{}],14:[function(require,module,exports){
/**
* The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
*
* @class Detector
*/

// TODO: speculative contacts

var Detector = {};

module.exports = Detector;

var SAT = require('./SAT');
var Pair = require('./Pair');
var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Finds all collisions given a list of pairs.
     * @method collisions
     * @param {pair[]} broadphasePairs
     * @param {engine} engine
     * @return {array} collisions
     */
    Detector.collisions = function(broadphasePairs, engine) {
        var collisions = [],
            pairsTable = engine.pairs.table;

        // @if DEBUG
        var metrics = engine.metrics;
        // @endif
        
        for (var i = 0; i < broadphasePairs.length; i++) {
            var bodyA = broadphasePairs[i][0], 
                bodyB = broadphasePairs[i][1];

            if ((bodyA.isStatic || bodyA.isSleeping) && (bodyB.isStatic || bodyB.isSleeping))
                continue;
            
            if (!Detector.canCollide(bodyA.collisionFilter, bodyB.collisionFilter))
                continue;

            // @if DEBUG
            metrics.midphaseTests += 1;
            // @endif

            // mid phase
            if (Bounds.overlaps(bodyA.bounds, bodyB.bounds)) {
                for (var j = bodyA.parts.length > 1 ? 1 : 0; j < bodyA.parts.length; j++) {
                    var partA = bodyA.parts[j];

                    for (var k = bodyB.parts.length > 1 ? 1 : 0; k < bodyB.parts.length; k++) {
                        var partB = bodyB.parts[k];

                        if ((partA === bodyA && partB === bodyB) || Bounds.overlaps(partA.bounds, partB.bounds)) {
                            // find a previous collision we could reuse
                            var pairId = Pair.id(partA, partB),
                                pair = pairsTable[pairId],
                                previousCollision;

                            if (pair && pair.isActive) {
                                previousCollision = pair.collision;
                            } else {
                                previousCollision = null;
                            }

                            // narrow phase
                            var collision = SAT.collides(partA, partB, previousCollision);

                            // @if DEBUG
                            metrics.narrowphaseTests += 1;
                            if (collision.reused)
                                metrics.narrowReuseCount += 1;
                            // @endif

                            if (collision.collided) {
                                collisions.push(collision);
                                // @if DEBUG
                                metrics.narrowDetections += 1;
                                // @endif
                            }
                        }
                    }
                }
            }
        }

        return collisions;
    };

    /**
     * Returns `true` if both supplied collision filters will allow a collision to occur.
     * See `body.collisionFilter` for more information.
     * @method canCollide
     * @param {} filterA
     * @param {} filterB
     * @return {bool} `true` if collision can occur
     */
    Detector.canCollide = function(filterA, filterB) {
        if (filterA.group === filterB.group && filterA.group !== 0)
            return filterA.group > 0;

        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
    };

})();

},{"../geometry/Bounds":33,"./Pair":16,"./SAT":20}],15:[function(require,module,exports){
/**
* The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
*
* @class Grid
*/

var Grid = {};

module.exports = Grid;

var Pair = require('./Pair');
var Detector = require('./Detector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new grid.
     * @method create
     * @param {} options
     * @return {grid} A new grid
     */
    Grid.create = function(options) {
        var defaults = {
            controller: Grid,
            detector: Detector.collisions,
            buckets: {},
            pairs: {},
            pairsList: [],
            bucketWidth: 48,
            bucketHeight: 48
        };

        return Common.extend(defaults, options);
    };

    /**
     * The width of a single grid bucket.
     *
     * @property bucketWidth
     * @type number
     * @default 48
     */

    /**
     * The height of a single grid bucket.
     *
     * @property bucketHeight
     * @type number
     * @default 48
     */

    /**
     * Updates the grid.
     * @method update
     * @param {grid} grid
     * @param {body[]} bodies
     * @param {engine} engine
     * @param {boolean} forceUpdate
     */
    Grid.update = function(grid, bodies, engine, forceUpdate) {
        var i, col, row,
            world = engine.world,
            buckets = grid.buckets,
            bucket,
            bucketId,
            gridChanged = false;

        // @if DEBUG
        var metrics = engine.metrics;
        metrics.broadphaseTests = 0;
        // @endif

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isSleeping && !forceUpdate)
                continue;

            // don't update out of world bodies
            if (body.bounds.max.x < world.bounds.min.x || body.bounds.min.x > world.bounds.max.x
                || body.bounds.max.y < world.bounds.min.y || body.bounds.min.y > world.bounds.max.y)
                continue;

            var newRegion = _getRegion(grid, body);

            // if the body has changed grid region
            if (!body.region || newRegion.id !== body.region.id || forceUpdate) {

                // @if DEBUG
                metrics.broadphaseTests += 1;
                // @endif

                if (!body.region || forceUpdate)
                    body.region = newRegion;

                var union = _regionUnion(newRegion, body.region);

                // update grid buckets affected by region change
                // iterate over the union of both regions
                for (col = union.startCol; col <= union.endCol; col++) {
                    for (row = union.startRow; row <= union.endRow; row++) {
                        bucketId = _getBucketId(col, row);
                        bucket = buckets[bucketId];

                        var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
                                                && row >= newRegion.startRow && row <= newRegion.endRow);

                        var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
                                                && row >= body.region.startRow && row <= body.region.endRow);

                        // remove from old region buckets
                        if (!isInsideNewRegion && isInsideOldRegion) {
                            if (isInsideOldRegion) {
                                if (bucket)
                                    _bucketRemoveBody(grid, bucket, body);
                            }
                        }

                        // add to new region buckets
                        if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
                            if (!bucket)
                                bucket = _createBucket(buckets, bucketId);
                            _bucketAddBody(grid, bucket, body);
                        }
                    }
                }

                // set the new region
                body.region = newRegion;

                // flag changes so we can update pairs
                gridChanged = true;
            }
        }

        // update pairs list only if pairs changed (i.e. a body changed region)
        if (gridChanged)
            grid.pairsList = _createActivePairsList(grid);
    };

    /**
     * Clears the grid.
     * @method clear
     * @param {grid} grid
     */
    Grid.clear = function(grid) {
        grid.buckets = {};
        grid.pairs = {};
        grid.pairsList = [];
    };

    /**
     * Finds the union of two regions.
     * @method _regionUnion
     * @private
     * @param {} regionA
     * @param {} regionB
     * @return {} region
     */
    var _regionUnion = function(regionA, regionB) {
        var startCol = Math.min(regionA.startCol, regionB.startCol),
            endCol = Math.max(regionA.endCol, regionB.endCol),
            startRow = Math.min(regionA.startRow, regionB.startRow),
            endRow = Math.max(regionA.endRow, regionB.endRow);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Gets the region a given body falls in for a given grid.
     * @method _getRegion
     * @private
     * @param {} grid
     * @param {} body
     * @return {} region
     */
    var _getRegion = function(grid, body) {
        var bounds = body.bounds,
            startCol = Math.floor(bounds.min.x / grid.bucketWidth),
            endCol = Math.floor(bounds.max.x / grid.bucketWidth),
            startRow = Math.floor(bounds.min.y / grid.bucketHeight),
            endRow = Math.floor(bounds.max.y / grid.bucketHeight);

        return _createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Creates a region.
     * @method _createRegion
     * @private
     * @param {} startCol
     * @param {} endCol
     * @param {} startRow
     * @param {} endRow
     * @return {} region
     */
    var _createRegion = function(startCol, endCol, startRow, endRow) {
        return { 
            id: startCol + ',' + endCol + ',' + startRow + ',' + endRow,
            startCol: startCol, 
            endCol: endCol, 
            startRow: startRow, 
            endRow: endRow 
        };
    };

    /**
     * Gets the bucket id at the given position.
     * @method _getBucketId
     * @private
     * @param {} column
     * @param {} row
     * @return {string} bucket id
     */
    var _getBucketId = function(column, row) {
        return column + ',' + row;
    };

    /**
     * Creates a bucket.
     * @method _createBucket
     * @private
     * @param {} buckets
     * @param {} bucketId
     * @return {} bucket
     */
    var _createBucket = function(buckets, bucketId) {
        var bucket = buckets[bucketId] = [];
        return bucket;
    };

    /**
     * Adds a body to a bucket.
     * @method _bucketAddBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketAddBody = function(grid, bucket, body) {
        // add new pairs
        for (var i = 0; i < bucket.length; i++) {
            var bodyB = bucket[i];

            if (body.id === bodyB.id || (body.isStatic && bodyB.isStatic))
                continue;

            // keep track of the number of buckets the pair exists in
            // important for Grid.update to work
            var pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair) {
                pair[2] += 1;
            } else {
                grid.pairs[pairId] = [body, bodyB, 1];
            }
        }

        // add to bodies (after pairs, otherwise pairs with self)
        bucket.push(body);
    };

    /**
     * Removes a body from a bucket.
     * @method _bucketRemoveBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    var _bucketRemoveBody = function(grid, bucket, body) {
        // remove from bucket
        bucket.splice(Common.indexOf(bucket, body), 1);

        // update pair counts
        for (var i = 0; i < bucket.length; i++) {
            // keep track of the number of buckets the pair exists in
            // important for _createActivePairsList to work
            var bodyB = bucket[i],
                pairId = Pair.id(body, bodyB),
                pair = grid.pairs[pairId];

            if (pair)
                pair[2] -= 1;
        }
    };

    /**
     * Generates a list of the active pairs in the grid.
     * @method _createActivePairsList
     * @private
     * @param {} grid
     * @return [] pairs
     */
    var _createActivePairsList = function(grid) {
        var pairKeys,
            pair,
            pairs = [];

        // grid.pairs is used as a hashmap
        pairKeys = Common.keys(grid.pairs);

        // iterate over grid.pairs
        for (var k = 0; k < pairKeys.length; k++) {
            pair = grid.pairs[pairKeys[k]];

            // if pair exists in at least one bucket
            // it is a pair that needs further collision testing so push it
            if (pair[2] > 0) {
                pairs.push(pair);
            } else {
                delete grid.pairs[pairKeys[k]];
            }
        }

        return pairs;
    };
    
})();

},{"../core/Common":23,"./Detector":14,"./Pair":16}],16:[function(require,module,exports){
/**
* The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
*
* @class Pair
*/

var Pair = {};

module.exports = Pair;

var Contact = require('./Contact');

(function() {
    
    /**
     * Creates a pair.
     * @method create
     * @param {collision} collision
     * @param {number} timestamp
     * @return {pair} A new pair
     */
    Pair.create = function(collision, timestamp) {
        var bodyA = collision.bodyA,
            bodyB = collision.bodyB,
            parentA = collision.parentA,
            parentB = collision.parentB;

        var pair = {
            id: Pair.id(bodyA, bodyB),
            bodyA: bodyA,
            bodyB: bodyB,
            contacts: {},
            activeContacts: [],
            separation: 0,
            isActive: true,
            isSensor: bodyA.isSensor || bodyB.isSensor,
            timeCreated: timestamp,
            timeUpdated: timestamp,
            inverseMass: parentA.inverseMass + parentB.inverseMass,
            friction: Math.min(parentA.friction, parentB.friction),
            frictionStatic: Math.max(parentA.frictionStatic, parentB.frictionStatic),
            restitution: Math.max(parentA.restitution, parentB.restitution),
            slop: Math.max(parentA.slop, parentB.slop)
        };

        Pair.update(pair, collision, timestamp);

        return pair;
    };

    /**
     * Updates a pair given a collision.
     * @method update
     * @param {pair} pair
     * @param {collision} collision
     * @param {number} timestamp
     */
    Pair.update = function(pair, collision, timestamp) {
        var contacts = pair.contacts,
            supports = collision.supports,
            activeContacts = pair.activeContacts,
            parentA = collision.parentA,
            parentB = collision.parentB;
        
        pair.collision = collision;
        pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
        pair.friction = Math.min(parentA.friction, parentB.friction);
        pair.frictionStatic = Math.max(parentA.frictionStatic, parentB.frictionStatic);
        pair.restitution = Math.max(parentA.restitution, parentB.restitution);
        pair.slop = Math.max(parentA.slop, parentB.slop);
        activeContacts.length = 0;
        
        if (collision.collided) {
            for (var i = 0; i < supports.length; i++) {
                var support = supports[i],
                    contactId = Contact.id(support),
                    contact = contacts[contactId];

                if (contact) {
                    activeContacts.push(contact);
                } else {
                    activeContacts.push(contacts[contactId] = Contact.create(support));
                }
            }

            pair.separation = collision.depth;
            Pair.setActive(pair, true, timestamp);
        } else {
            if (pair.isActive === true)
                Pair.setActive(pair, false, timestamp);
        }
    };
    
    /**
     * Set a pair as active or inactive.
     * @method setActive
     * @param {pair} pair
     * @param {bool} isActive
     * @param {number} timestamp
     */
    Pair.setActive = function(pair, isActive, timestamp) {
        if (isActive) {
            pair.isActive = true;
            pair.timeUpdated = timestamp;
        } else {
            pair.isActive = false;
            pair.activeContacts.length = 0;
        }
    };

    /**
     * Get the id for the given pair.
     * @method id
     * @param {body} bodyA
     * @param {body} bodyB
     * @return {string} Unique pairId
     */
    Pair.id = function(bodyA, bodyB) {
        if (bodyA.id < bodyB.id) {
            return bodyA.id + '_' + bodyB.id;
        } else {
            return bodyB.id + '_' + bodyA.id;
        }
    };

})();

},{"./Contact":13}],17:[function(require,module,exports){
/**
* The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
*
* @class Pairs
*/

var Pairs = {};

module.exports = Pairs;

var Pair = require('./Pair');
var Common = require('../core/Common');

(function() {
    
    var _pairMaxIdleLife = 1000;

    /**
     * Creates a new pairs structure.
     * @method create
     * @param {object} options
     * @return {pairs} A new pairs structure
     */
    Pairs.create = function(options) {
        return Common.extend({ 
            table: {},
            list: [],
            collisionStart: [],
            collisionActive: [],
            collisionEnd: []
        }, options);
    };

    /**
     * Updates pairs given a list of collisions.
     * @method update
     * @param {object} pairs
     * @param {collision[]} collisions
     * @param {number} timestamp
     */
    Pairs.update = function(pairs, collisions, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            collisionStart = pairs.collisionStart,
            collisionEnd = pairs.collisionEnd,
            collisionActive = pairs.collisionActive,
            activePairIds = [],
            collision,
            pairId,
            pair,
            i;

        // clear collision state arrays, but maintain old reference
        collisionStart.length = 0;
        collisionEnd.length = 0;
        collisionActive.length = 0;

        for (i = 0; i < collisions.length; i++) {
            collision = collisions[i];

            if (collision.collided) {
                pairId = Pair.id(collision.bodyA, collision.bodyB);
                activePairIds.push(pairId);

                pair = pairsTable[pairId];
                
                if (pair) {
                    // pair already exists (but may or may not be active)
                    if (pair.isActive) {
                        // pair exists and is active
                        collisionActive.push(pair);
                    } else {
                        // pair exists but was inactive, so a collision has just started again
                        collisionStart.push(pair);
                    }

                    // update the pair
                    Pair.update(pair, collision, timestamp);
                } else {
                    // pair did not exist, create a new pair
                    pair = Pair.create(collision, timestamp);
                    pairsTable[pairId] = pair;

                    // push the new pair
                    collisionStart.push(pair);
                    pairsList.push(pair);
                }
            }
        }

        // deactivate previously active pairs that are now inactive
        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            if (pair.isActive && Common.indexOf(activePairIds, pair.id) === -1) {
                Pair.setActive(pair, false, timestamp);
                collisionEnd.push(pair);
            }
        }
    };
    
    /**
     * Finds and removes pairs that have been inactive for a set amount of time.
     * @method removeOld
     * @param {object} pairs
     * @param {number} timestamp
     */
    Pairs.removeOld = function(pairs, timestamp) {
        var pairsList = pairs.list,
            pairsTable = pairs.table,
            indexesToRemove = [],
            pair,
            collision,
            pairIndex,
            i;

        for (i = 0; i < pairsList.length; i++) {
            pair = pairsList[i];
            collision = pair.collision;
            
            // never remove sleeping pairs
            if (collision.bodyA.isSleeping || collision.bodyB.isSleeping) {
                pair.timeUpdated = timestamp;
                continue;
            }

            // if pair is inactive for too long, mark it to be removed
            if (timestamp - pair.timeUpdated > _pairMaxIdleLife) {
                indexesToRemove.push(i);
            }
        }

        // remove marked pairs
        for (i = 0; i < indexesToRemove.length; i++) {
            pairIndex = indexesToRemove[i] - i;
            pair = pairsList[pairIndex];
            delete pairsTable[pair.id];
            pairsList.splice(pairIndex, 1);
        }
    };

    /**
     * Clears the given pairs structure.
     * @method clear
     * @param {pairs} pairs
     * @return {pairs} pairs
     */
    Pairs.clear = function(pairs) {
        pairs.table = {};
        pairs.list.length = 0;
        pairs.collisionStart.length = 0;
        pairs.collisionActive.length = 0;
        pairs.collisionEnd.length = 0;
        return pairs;
    };

})();

},{"../core/Common":23,"./Pair":16}],18:[function(require,module,exports){
/**
* The `Matter.Query` module contains methods for performing collision queries.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Query
*/

var Query = {};

module.exports = Query;

var Vector = require('../geometry/Vector');
var SAT = require('./SAT');
var Bounds = require('../geometry/Bounds');
var Bodies = require('../factory/Bodies');
var Vertices = require('../geometry/Vertices');

(function() {

    /**
     * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
     * @method ray
     * @param {body[]} bodies
     * @param {vector} startPoint
     * @param {vector} endPoint
     * @param {number} [rayWidth]
     * @return {object[]} Collisions
     */
    Query.ray = function(bodies, startPoint, endPoint, rayWidth) {
        rayWidth = rayWidth || 1e-100;

        var rayAngle = Vector.angle(startPoint, endPoint),
            rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
            rayX = (endPoint.x + startPoint.x) * 0.5,
            rayY = (endPoint.y + startPoint.y) * 0.5,
            ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
            collisions = [];

        for (var i = 0; i < bodies.length; i++) {
            var bodyA = bodies[i];
            
            if (Bounds.overlaps(bodyA.bounds, ray.bounds)) {
                for (var j = bodyA.parts.length === 1 ? 0 : 1; j < bodyA.parts.length; j++) {
                    var part = bodyA.parts[j];

                    if (Bounds.overlaps(part.bounds, ray.bounds)) {
                        var collision = SAT.collides(part, ray);
                        if (collision.collided) {
                            collision.body = collision.bodyA = collision.bodyB = bodyA;
                            collisions.push(collision);
                            break;
                        }
                    }
                }
            }
        }

        return collisions;
    };

    /**
     * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
     * @method region
     * @param {body[]} bodies
     * @param {bounds} bounds
     * @param {bool} [outside=false]
     * @return {body[]} The bodies matching the query
     */
    Query.region = function(bodies, bounds, outside) {
        var result = [];

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                overlaps = Bounds.overlaps(body.bounds, bounds);
            if ((overlaps && !outside) || (!overlaps && outside))
                result.push(body);
        }

        return result;
    };

    /**
     * Returns all bodies whose vertices contain the given point, from the given set of bodies.
     * @method point
     * @param {body[]} bodies
     * @param {vector} point
     * @return {body[]} The bodies matching the query
     */
    Query.point = function(bodies, point) {
        var result = [];

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];
            
            if (Bounds.contains(body.bounds, point)) {
                for (var j = body.parts.length === 1 ? 0 : 1; j < body.parts.length; j++) {
                    var part = body.parts[j];

                    if (Bounds.contains(part.bounds, point)
                        && Vertices.contains(part.vertices, point)) {
                        result.push(body);
                        break;
                    }
                }
            }
        }

        return result;
    };

})();

},{"../factory/Bodies":30,"../geometry/Bounds":33,"../geometry/Vector":35,"../geometry/Vertices":36,"./SAT":20}],19:[function(require,module,exports){
/**
* The `Matter.Resolver` module contains methods for resolving collision pairs.
*
* @class Resolver
*/

var Resolver = {};

module.exports = Resolver;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');

(function() {

    Resolver._restingThresh = 4;
    Resolver._restingThreshTangent = 6;
    Resolver._positionDampen = 0.9;
    Resolver._positionWarming = 0.8;
    Resolver._frictionNormalMultiplier = 5;

    /**
     * Prepare pairs for position solving.
     * @method preSolvePosition
     * @param {pair[]} pairs
     */
    Resolver.preSolvePosition = function(pairs) {
        var i,
            pair,
            activeCount;

        // find total contacts on each body
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive)
                continue;
            
            activeCount = pair.activeContacts.length;
            pair.collision.parentA.totalContacts += activeCount;
            pair.collision.parentB.totalContacts += activeCount;
        }
    };

    /**
     * Find a solution for pair positions.
     * @method solvePosition
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solvePosition = function(pairs, timeScale) {
        var i,
            pair,
            collision,
            bodyA,
            bodyB,
            normal,
            bodyBtoA,
            contactShare,
            positionImpulse,
            contactCount = {},
            tempA = Vector._temp[0],
            tempB = Vector._temp[1],
            tempC = Vector._temp[2],
            tempD = Vector._temp[3];

        // find impulses required to resolve penetration
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;

            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;

            // get current separation between body edges involved in collision
            bodyBtoA = Vector.sub(Vector.add(bodyB.positionImpulse, bodyB.position, tempA), 
                                    Vector.add(bodyA.positionImpulse, 
                                        Vector.sub(bodyB.position, collision.penetration, tempB), tempC), tempD);

            pair.separation = Vector.dot(normal, bodyBtoA);
        }
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive || pair.isSensor || pair.separation < 0)
                continue;
            
            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;
            positionImpulse = (pair.separation - pair.slop) * timeScale;

            if (bodyA.isStatic || bodyB.isStatic)
                positionImpulse *= 2;
            
            if (!(bodyA.isStatic || bodyA.isSleeping)) {
                contactShare = Resolver._positionDampen / bodyA.totalContacts;
                bodyA.positionImpulse.x += normal.x * positionImpulse * contactShare;
                bodyA.positionImpulse.y += normal.y * positionImpulse * contactShare;
            }

            if (!(bodyB.isStatic || bodyB.isSleeping)) {
                contactShare = Resolver._positionDampen / bodyB.totalContacts;
                bodyB.positionImpulse.x -= normal.x * positionImpulse * contactShare;
                bodyB.positionImpulse.y -= normal.y * positionImpulse * contactShare;
            }
        }
    };

    /**
     * Apply position resolution.
     * @method postSolvePosition
     * @param {body[]} bodies
     */
    Resolver.postSolvePosition = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            // reset contact count
            body.totalContacts = 0;

            if (body.positionImpulse.x !== 0 || body.positionImpulse.y !== 0) {
                // update body geometry
                for (var j = 0; j < body.parts.length; j++) {
                    var part = body.parts[j];
                    Vertices.translate(part.vertices, body.positionImpulse);
                    Bounds.update(part.bounds, part.vertices, body.velocity);
                    part.position.x += body.positionImpulse.x;
                    part.position.y += body.positionImpulse.y;
                }

                // move the body without changing velocity
                body.positionPrev.x += body.positionImpulse.x;
                body.positionPrev.y += body.positionImpulse.y;

                if (Vector.dot(body.positionImpulse, body.velocity) < 0) {
                    // reset cached impulse if the body has velocity along it
                    body.positionImpulse.x = 0;
                    body.positionImpulse.y = 0;
                } else {
                    // warm the next iteration
                    body.positionImpulse.x *= Resolver._positionWarming;
                    body.positionImpulse.y *= Resolver._positionWarming;
                }
            }
        }
    };

    /**
     * Prepare pairs for velocity solving.
     * @method preSolveVelocity
     * @param {pair[]} pairs
     */
    Resolver.preSolveVelocity = function(pairs) {
        var i,
            j,
            pair,
            contacts,
            collision,
            bodyA,
            bodyB,
            normal,
            tangent,
            contact,
            contactVertex,
            normalImpulse,
            tangentImpulse,
            offset,
            impulse = Vector._temp[0],
            tempA = Vector._temp[1];
        
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;
            
            contacts = pair.activeContacts;
            collision = pair.collision;
            bodyA = collision.parentA;
            bodyB = collision.parentB;
            normal = collision.normal;
            tangent = collision.tangent;

            // resolve each contact
            for (j = 0; j < contacts.length; j++) {
                contact = contacts[j];
                contactVertex = contact.vertex;
                normalImpulse = contact.normalImpulse;
                tangentImpulse = contact.tangentImpulse;

                if (normalImpulse !== 0 || tangentImpulse !== 0) {
                    // total impulse from contact
                    impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                    impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                    
                    // apply impulse from contact
                    if (!(bodyA.isStatic || bodyA.isSleeping)) {
                        offset = Vector.sub(contactVertex, bodyA.position, tempA);
                        bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                        bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                        bodyA.anglePrev += Vector.cross(offset, impulse) * bodyA.inverseInertia;
                    }

                    if (!(bodyB.isStatic || bodyB.isSleeping)) {
                        offset = Vector.sub(contactVertex, bodyB.position, tempA);
                        bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                        bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                        bodyB.anglePrev -= Vector.cross(offset, impulse) * bodyB.inverseInertia;
                    }
                }
            }
        }
    };

    /**
     * Find a solution for pair velocities.
     * @method solveVelocity
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solveVelocity = function(pairs, timeScale) {
        var timeScaleSquared = timeScale * timeScale,
            impulse = Vector._temp[0],
            tempA = Vector._temp[1],
            tempB = Vector._temp[2],
            tempC = Vector._temp[3],
            tempD = Vector._temp[4],
            tempE = Vector._temp[5];
        
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            if (!pair.isActive || pair.isSensor)
                continue;
            
            var collision = pair.collision,
                bodyA = collision.parentA,
                bodyB = collision.parentB,
                normal = collision.normal,
                tangent = collision.tangent,
                contacts = pair.activeContacts,
                contactShare = 1 / contacts.length;

            // update body velocities
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // resolve each contact
            for (var j = 0; j < contacts.length; j++) {
                var contact = contacts[j],
                    contactVertex = contact.vertex,
                    offsetA = Vector.sub(contactVertex, bodyA.position, tempA),
                    offsetB = Vector.sub(contactVertex, bodyB.position, tempB),
                    velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity), tempC),
                    velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity), tempD), 
                    relativeVelocity = Vector.sub(velocityPointA, velocityPointB, tempE),
                    normalVelocity = Vector.dot(normal, relativeVelocity);

                var tangentVelocity = Vector.dot(tangent, relativeVelocity),
                    tangentSpeed = Math.abs(tangentVelocity),
                    tangentVelocityDirection = Common.sign(tangentVelocity);

                // raw impulses
                var normalImpulse = (1 + pair.restitution) * normalVelocity,
                    normalForce = Common.clamp(pair.separation + normalVelocity, 0, 1) * Resolver._frictionNormalMultiplier;

                // coulomb friction
                var tangentImpulse = tangentVelocity,
                    maxFriction = Infinity;

                if (tangentSpeed > pair.friction * pair.frictionStatic * normalForce * timeScaleSquared) {
                    maxFriction = tangentSpeed;
                    tangentImpulse = Common.clamp(
                        pair.friction * tangentVelocityDirection * timeScaleSquared,
                        -maxFriction, maxFriction
                    );
                }

                // modify impulses accounting for mass, inertia and offset
                var oAcN = Vector.cross(offsetA, normal),
                    oBcN = Vector.cross(offsetB, normal),
                    share = contactShare / (bodyA.inverseMass + bodyB.inverseMass + bodyA.inverseInertia * oAcN * oAcN  + bodyB.inverseInertia * oBcN * oBcN);

                normalImpulse *= share;
                tangentImpulse *= share;

                // handle high velocity and resting collisions separately
                if (normalVelocity < 0 && normalVelocity * normalVelocity > Resolver._restingThresh * timeScaleSquared) {
                    // high normal velocity so clear cached contact normal impulse
                    contact.normalImpulse = 0;
                } else {
                    // solve resting collision constraints using Erin Catto's method (GDC08)
                    // impulse constraint tends to 0
                    var contactNormalImpulse = contact.normalImpulse;
                    contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                    normalImpulse = contact.normalImpulse - contactNormalImpulse;
                }

                // handle high velocity and resting collisions separately
                if (tangentVelocity * tangentVelocity > Resolver._restingThreshTangent * timeScaleSquared) {
                    // high tangent velocity so clear cached contact tangent impulse
                    contact.tangentImpulse = 0;
                } else {
                    // solve resting collision constraints using Erin Catto's method (GDC08)
                    // tangent impulse tends to -tangentSpeed or +tangentSpeed
                    var contactTangentImpulse = contact.tangentImpulse;
                    contact.tangentImpulse = Common.clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
                    tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                }

                // total impulse from contact
                impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);
                
                // apply impulse from contact
                if (!(bodyA.isStatic || bodyA.isSleeping)) {
                    bodyA.positionPrev.x += impulse.x * bodyA.inverseMass;
                    bodyA.positionPrev.y += impulse.y * bodyA.inverseMass;
                    bodyA.anglePrev += Vector.cross(offsetA, impulse) * bodyA.inverseInertia;
                }

                if (!(bodyB.isStatic || bodyB.isSleeping)) {
                    bodyB.positionPrev.x -= impulse.x * bodyB.inverseMass;
                    bodyB.positionPrev.y -= impulse.y * bodyB.inverseMass;
                    bodyB.anglePrev -= Vector.cross(offsetB, impulse) * bodyB.inverseInertia;
                }
            }
        }
    };

})();

},{"../core/Common":23,"../geometry/Bounds":33,"../geometry/Vector":35,"../geometry/Vertices":36}],20:[function(require,module,exports){
/**
* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
*
* @class SAT
*/

// TODO: true circles and curves

var SAT = {};

module.exports = SAT;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');

(function() {

    /**
     * Detect collision between two bodies using the Separating Axis Theorem.
     * @method collides
     * @param {body} bodyA
     * @param {body} bodyB
     * @param {collision} previousCollision
     * @return {collision} collision
     */
    SAT.collides = function(bodyA, bodyB, previousCollision) {
        var overlapAB,
            overlapBA, 
            minOverlap,
            collision,
            prevCol = previousCollision,
            canReusePrevCol = false;

        if (prevCol) {
            // estimate total motion
            var parentA = bodyA.parent,
                parentB = bodyB.parent,
                motion = parentA.speed * parentA.speed + parentA.angularSpeed * parentA.angularSpeed
                       + parentB.speed * parentB.speed + parentB.angularSpeed * parentB.angularSpeed;

            // we may be able to (partially) reuse collision result 
            // but only safe if collision was resting
            canReusePrevCol = prevCol && prevCol.collided && motion < 0.2;

            // reuse collision object
            collision = prevCol;
        } else {
            collision = { collided: false, bodyA: bodyA, bodyB: bodyB };
        }

        if (prevCol && canReusePrevCol) {
            // if we can reuse the collision result
            // we only need to test the previously found axis
            var axisBodyA = collision.axisBody,
                axisBodyB = axisBodyA === bodyA ? bodyB : bodyA,
                axes = [axisBodyA.axes[prevCol.axisNumber]];

            minOverlap = _overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
            collision.reused = true;

            if (minOverlap.overlap <= 0) {
                collision.collided = false;
                return collision;
            }
        } else {
            // if we can't reuse a result, perform a full SAT test

            overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

            if (overlapAB.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

            if (overlapBA.overlap <= 0) {
                collision.collided = false;
                return collision;
            }

            if (overlapAB.overlap < overlapBA.overlap) {
                minOverlap = overlapAB;
                collision.axisBody = bodyA;
            } else {
                minOverlap = overlapBA;
                collision.axisBody = bodyB;
            }

            // important for reuse later
            collision.axisNumber = minOverlap.axisNumber;
        }

        collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
        collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
        collision.collided = true;
        collision.normal = minOverlap.axis;
        collision.depth = minOverlap.overlap;
        collision.parentA = collision.bodyA.parent;
        collision.parentB = collision.bodyB.parent;
        
        bodyA = collision.bodyA;
        bodyB = collision.bodyB;

        // ensure normal is facing away from bodyA
        if (Vector.dot(collision.normal, Vector.sub(bodyB.position, bodyA.position)) > 0) 
            collision.normal = Vector.neg(collision.normal);

        collision.tangent = Vector.perp(collision.normal);

        collision.penetration = { 
            x: collision.normal.x * collision.depth, 
            y: collision.normal.y * collision.depth 
        };

        // find support points, there is always either exactly one or two
        var verticesB = _findSupports(bodyA, bodyB, collision.normal),
            supports = collision.supports || [];
        supports.length = 0;

        // find the supports from bodyB that are inside bodyA
        if (Vertices.contains(bodyA.vertices, verticesB[0]))
            supports.push(verticesB[0]);

        if (Vertices.contains(bodyA.vertices, verticesB[1]))
            supports.push(verticesB[1]);

        // find the supports from bodyA that are inside bodyB
        if (supports.length < 2) {
            var verticesA = _findSupports(bodyB, bodyA, Vector.neg(collision.normal));
                
            if (Vertices.contains(bodyB.vertices, verticesA[0]))
                supports.push(verticesA[0]);

            if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
                supports.push(verticesA[1]);
        }

        // account for the edge case of overlapping but no vertex containment
        if (supports.length < 1)
            supports = [verticesB[0]];
        
        collision.supports = supports;

        return collision;
    };

    /**
     * Find the overlap between two sets of vertices.
     * @method _overlapAxes
     * @private
     * @param {} verticesA
     * @param {} verticesB
     * @param {} axes
     * @return result
     */
    var _overlapAxes = function(verticesA, verticesB, axes) {
        var projectionA = Vector._temp[0], 
            projectionB = Vector._temp[1],
            result = { overlap: Number.MAX_VALUE },
            overlap,
            axis;

        for (var i = 0; i < axes.length; i++) {
            axis = axes[i];

            _projectToAxis(projectionA, verticesA, axis);
            _projectToAxis(projectionB, verticesB, axis);

            overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

            if (overlap <= 0) {
                result.overlap = overlap;
                return result;
            }

            if (overlap < result.overlap) {
                result.overlap = overlap;
                result.axis = axis;
                result.axisNumber = i;
            }
        }

        return result;
    };

    /**
     * Projects vertices on an axis and returns an interval.
     * @method _projectToAxis
     * @private
     * @param {} projection
     * @param {} vertices
     * @param {} axis
     */
    var _projectToAxis = function(projection, vertices, axis) {
        var min = Vector.dot(vertices[0], axis),
            max = min;

        for (var i = 1; i < vertices.length; i += 1) {
            var dot = Vector.dot(vertices[i], axis);

            if (dot > max) { 
                max = dot; 
            } else if (dot < min) { 
                min = dot; 
            }
        }

        projection.min = min;
        projection.max = max;
    };
    
    /**
     * Finds supporting vertices given two bodies along a given direction using hill-climbing.
     * @method _findSupports
     * @private
     * @param {} bodyA
     * @param {} bodyB
     * @param {} normal
     * @return [vector]
     */
    var _findSupports = function(bodyA, bodyB, normal) {
        var nearestDistance = Number.MAX_VALUE,
            vertexToBody = Vector._temp[0],
            vertices = bodyB.vertices,
            bodyAPosition = bodyA.position,
            distance,
            vertex,
            vertexA,
            vertexB;

        // find closest vertex on bodyB
        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            vertexToBody.x = vertex.x - bodyAPosition.x;
            vertexToBody.y = vertex.y - bodyAPosition.y;
            distance = -Vector.dot(normal, vertexToBody);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                vertexA = vertex;
            }
        }

        // find next closest vertex using the two connected to it
        var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
        vertex = vertices[prevIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        nearestDistance = -Vector.dot(normal, vertexToBody);
        vertexB = vertex;

        var nextIndex = (vertexA.index + 1) % vertices.length;
        vertex = vertices[nextIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;
        distance = -Vector.dot(normal, vertexToBody);
        if (distance < nearestDistance) {
            vertexB = vertex;
        }

        return [vertexA, vertexB];
    };

})();

},{"../geometry/Vector":35,"../geometry/Vertices":36}],21:[function(require,module,exports){
/**
* The `Matter.Constraint` module contains methods for creating and manipulating constraints.
* Constraints are used for specifying that a fixed distance must be maintained between two bodies (or a body and a fixed world-space position).
* The stiffness of constraints can be modified to create springs or elastic.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Constraint
*/

// TODO: fix instability issues with torque
// TODO: linked constraints
// TODO: breakable constraints
// TODO: collision constraints
// TODO: allow constrained bodies to sleep
// TODO: handle 0 length constraints properly
// TODO: impulse caching and warming

var Constraint = {};

module.exports = Constraint;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');
var Sleeping = require('../core/Sleeping');
var Bounds = require('../geometry/Bounds');
var Axes = require('../geometry/Axes');
var Common = require('../core/Common');

(function() {

    var _minLength = 0.000001,
        _minDifference = 0.001;

    /**
     * Creates a new constraint.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} options
     * @return {constraint} constraint
     */
    Constraint.create = function(options) {
        var constraint = options;

        // if bodies defined but no points, use body centre
        if (constraint.bodyA && !constraint.pointA)
            constraint.pointA = { x: 0, y: 0 };
        if (constraint.bodyB && !constraint.pointB)
            constraint.pointB = { x: 0, y: 0 };

        // calculate static length using initial world space points
        var initialPointA = constraint.bodyA ? Vector.add(constraint.bodyA.position, constraint.pointA) : constraint.pointA,
            initialPointB = constraint.bodyB ? Vector.add(constraint.bodyB.position, constraint.pointB) : constraint.pointB,
            length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
    
        constraint.length = constraint.length || length || _minLength;

        // render
        var render = {
            visible: true,
            lineWidth: 2,
            strokeStyle: '#666'
        };
        
        constraint.render = Common.extend(render, constraint.render);

        // option defaults
        constraint.id = constraint.id || Common.nextId();
        constraint.label = constraint.label || 'Constraint';
        constraint.type = 'constraint';
        constraint.stiffness = constraint.stiffness || 1;
        constraint.angularStiffness = constraint.angularStiffness || 0;
        constraint.angleA = constraint.bodyA ? constraint.bodyA.angle : constraint.angleA;
        constraint.angleB = constraint.bodyB ? constraint.bodyB.angle : constraint.angleB;

        return constraint;
    };

    /**
     * Solves all constraints in a list of collisions.
     * @private
     * @method solveAll
     * @param {constraint[]} constraints
     * @param {number} timeScale
     */
    Constraint.solveAll = function(constraints, timeScale) {
        for (var i = 0; i < constraints.length; i++) {
            Constraint.solve(constraints[i], timeScale);
        }
    };

    /**
     * Solves a distance constraint with Gauss-Siedel method.
     * @private
     * @method solve
     * @param {constraint} constraint
     * @param {number} timeScale
     */
    Constraint.solve = function(constraint, timeScale) {
        var bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB;

        // update reference angle
        if (bodyA && !bodyA.isStatic) {
            constraint.pointA = Vector.rotate(pointA, bodyA.angle - constraint.angleA);
            constraint.angleA = bodyA.angle;
        }
        
        // update reference angle
        if (bodyB && !bodyB.isStatic) {
            constraint.pointB = Vector.rotate(pointB, bodyB.angle - constraint.angleB);
            constraint.angleB = bodyB.angle;
        }

        var pointAWorld = pointA,
            pointBWorld = pointB;

        if (bodyA) pointAWorld = Vector.add(bodyA.position, pointA);
        if (bodyB) pointBWorld = Vector.add(bodyB.position, pointB);

        if (!pointAWorld || !pointBWorld)
            return;

        var delta = Vector.sub(pointAWorld, pointBWorld),
            currentLength = Vector.magnitude(delta);

        // prevent singularity
        if (currentLength === 0)
            currentLength = _minLength;

        // solve distance constraint with Gauss-Siedel method
        var difference = (currentLength - constraint.length) / currentLength,
            normal = Vector.div(delta, currentLength),
            force = Vector.mult(delta, difference * 0.5 * constraint.stiffness * timeScale * timeScale);
        
        // if difference is very small, we can skip
        if (Math.abs(1 - (currentLength / constraint.length)) < _minDifference * timeScale)
            return;

        var velocityPointA,
            velocityPointB,
            offsetA,
            offsetB,
            oAn,
            oBn,
            bodyADenom,
            bodyBDenom;
    
        if (bodyA && !bodyA.isStatic) {
            // point body offset
            offsetA = { 
                x: pointAWorld.x - bodyA.position.x + force.x, 
                y: pointAWorld.y - bodyA.position.y + force.y
            };
            
            // update velocity
            bodyA.velocity.x = bodyA.position.x - bodyA.positionPrev.x;
            bodyA.velocity.y = bodyA.position.y - bodyA.positionPrev.y;
            bodyA.angularVelocity = bodyA.angle - bodyA.anglePrev;
            
            // find point velocity and body mass
            velocityPointA = Vector.add(bodyA.velocity, Vector.mult(Vector.perp(offsetA), bodyA.angularVelocity));
            oAn = Vector.dot(offsetA, normal);
            bodyADenom = bodyA.inverseMass + bodyA.inverseInertia * oAn * oAn;
        } else {
            velocityPointA = { x: 0, y: 0 };
            bodyADenom = bodyA ? bodyA.inverseMass : 0;
        }
            
        if (bodyB && !bodyB.isStatic) {
            // point body offset
            offsetB = { 
                x: pointBWorld.x - bodyB.position.x - force.x, 
                y: pointBWorld.y - bodyB.position.y - force.y 
            };
            
            // update velocity
            bodyB.velocity.x = bodyB.position.x - bodyB.positionPrev.x;
            bodyB.velocity.y = bodyB.position.y - bodyB.positionPrev.y;
            bodyB.angularVelocity = bodyB.angle - bodyB.anglePrev;

            // find point velocity and body mass
            velocityPointB = Vector.add(bodyB.velocity, Vector.mult(Vector.perp(offsetB), bodyB.angularVelocity));
            oBn = Vector.dot(offsetB, normal);
            bodyBDenom = bodyB.inverseMass + bodyB.inverseInertia * oBn * oBn;
        } else {
            velocityPointB = { x: 0, y: 0 };
            bodyBDenom = bodyB ? bodyB.inverseMass : 0;
        }
        
        var relativeVelocity = Vector.sub(velocityPointB, velocityPointA),
            normalImpulse = Vector.dot(normal, relativeVelocity) / (bodyADenom + bodyBDenom);
    
        if (normalImpulse > 0) normalImpulse = 0;
    
        var normalVelocity = {
            x: normal.x * normalImpulse, 
            y: normal.y * normalImpulse
        };

        var torque;
 
        if (bodyA && !bodyA.isStatic) {
            torque = Vector.cross(offsetA, normalVelocity) * bodyA.inverseInertia * (1 - constraint.angularStiffness);

            // keep track of applied impulses for post solving
            bodyA.constraintImpulse.x -= force.x;
            bodyA.constraintImpulse.y -= force.y;
            bodyA.constraintImpulse.angle += torque;

            // apply forces
            bodyA.position.x -= force.x;
            bodyA.position.y -= force.y;
            bodyA.angle += torque;
        }

        if (bodyB && !bodyB.isStatic) {
            torque = Vector.cross(offsetB, normalVelocity) * bodyB.inverseInertia * (1 - constraint.angularStiffness);

            // keep track of applied impulses for post solving
            bodyB.constraintImpulse.x += force.x;
            bodyB.constraintImpulse.y += force.y;
            bodyB.constraintImpulse.angle -= torque;
            
            // apply forces
            bodyB.position.x += force.x;
            bodyB.position.y += force.y;
            bodyB.angle -= torque;
        }

    };

    /**
     * Performs body updates required after solving constraints.
     * @private
     * @method postSolveAll
     * @param {body[]} bodies
     */
    Constraint.postSolveAll = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                impulse = body.constraintImpulse;

            if (impulse.x === 0 && impulse.y === 0 && impulse.angle === 0) {
                continue;
            }

            Sleeping.set(body, false);

            // update geometry and reset
            for (var j = 0; j < body.parts.length; j++) {
                var part = body.parts[j];
                
                Vertices.translate(part.vertices, impulse);

                if (j > 0) {
                    part.position.x += impulse.x;
                    part.position.y += impulse.y;
                }

                if (impulse.angle !== 0) {
                    Vertices.rotate(part.vertices, impulse.angle, body.position);
                    Axes.rotate(part.axes, impulse.angle);
                    if (j > 0) {
                        Vector.rotateAbout(part.position, impulse.angle, body.position, part.position);
                    }
                }

                Bounds.update(part.bounds, part.vertices, body.velocity);
            }

            impulse.angle = 0;
            impulse.x = 0;
            impulse.y = 0;
        }
    };

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "constraint"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage bodies.
     *
     * @property label
     * @type string
     * @default "Constraint"
     */

    /**
     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
     *
     * @property render
     * @type object
     */

    /**
     * A flag that indicates if the constraint should be rendered.
     *
     * @property render.visible
     * @type boolean
     * @default true
     */

    /**
     * A `Number` that defines the line width to use when rendering the constraint outline.
     * A value of `0` means no outline will be rendered.
     *
     * @property render.lineWidth
     * @type number
     * @default 2
     */

    /**
     * A `String` that defines the stroke style to use when rendering the constraint outline.
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.strokeStyle
     * @type string
     * @default a random colour
     */

    /**
     * The first possible `Body` that this constraint is attached to.
     *
     * @property bodyA
     * @type body
     * @default null
     */

    /**
     * The second possible `Body` that this constraint is attached to.
     *
     * @property bodyB
     * @type body
     * @default null
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
     *
     * @property pointA
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
     *
     * @property pointB
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that specifies the stiffness of the constraint, i.e. the rate at which it returns to its resting `constraint.length`.
     * A value of `1` means the constraint should be very stiff.
     * A value of `0.2` means the constraint acts like a soft spring.
     *
     * @property stiffness
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the target resting length of the constraint. 
     * It is calculated automatically in `Constraint.create` from initial positions of the `constraint.bodyA` and `constraint.bodyB`.
     *
     * @property length
     * @type number
     */

})();

},{"../core/Common":23,"../core/Sleeping":29,"../geometry/Axes":32,"../geometry/Bounds":33,"../geometry/Vector":35,"../geometry/Vertices":36}],22:[function(require,module,exports){
/**
* The `Matter.MouseConstraint` module contains methods for creating mouse constraints.
* Mouse constraints are used for allowing user interaction, providing the ability to move bodies via the mouse or touch.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class MouseConstraint
*/

var MouseConstraint = {};

module.exports = MouseConstraint;

var Vertices = require('../geometry/Vertices');
var Sleeping = require('../core/Sleeping');
var Mouse = require('../core/Mouse');
var Events = require('../core/Events');
var Detector = require('../collision/Detector');
var Constraint = require('./Constraint');
var Composite = require('../body/Composite');
var Common = require('../core/Common');
var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Creates a new mouse constraint.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {engine} engine
     * @param {} options
     * @return {MouseConstraint} A new MouseConstraint
     */
    MouseConstraint.create = function(engine, options) {
        var mouse = (engine ? engine.mouse : null) || (options ? options.mouse : null);

        if (!mouse) {
            if (engine && engine.render && engine.render.canvas) {
                mouse = Mouse.create(engine.render.canvas);
            } else if (options && options.element) {
                mouse = Mouse.create(options.element);
            } else {
                mouse = Mouse.create();
                Common.log('MouseConstraint.create: options.mouse was undefined, options.element was undefined, may not function as expected', 'warn');
            }
        }

        var constraint = Constraint.create({ 
            label: 'Mouse Constraint',
            pointA: mouse.position,
            pointB: { x: 0, y: 0 },
            length: 0.01, 
            stiffness: 0.1,
            angularStiffness: 1,
            render: {
                strokeStyle: '#90EE90',
                lineWidth: 3
            }
        });

        var defaults = {
            type: 'mouseConstraint',
            mouse: mouse,
            element: null,
            body: null,
            constraint: constraint,
            collisionFilter: {
                category: 0x0001,
                mask: 0xFFFFFFFF,
                group: 0
            }
        };

        var mouseConstraint = Common.extend(defaults, options);

        Events.on(engine, 'tick', function() {
            var allBodies = Composite.allBodies(engine.world);
            MouseConstraint.update(mouseConstraint, allBodies);
            _triggerEvents(mouseConstraint);
        });

        return mouseConstraint;
    };

    /**
     * Updates the given mouse constraint.
     * @private
     * @method update
     * @param {MouseConstraint} mouseConstraint
     * @param {body[]} bodies
     */
    MouseConstraint.update = function(mouseConstraint, bodies) {
        var mouse = mouseConstraint.mouse,
            constraint = mouseConstraint.constraint,
            body = mouseConstraint.body;

        if (mouse.button === 0) {
            if (!constraint.bodyB) {
                for (var i = 0; i < bodies.length; i++) {
                    body = bodies[i];
                    if (Bounds.contains(body.bounds, mouse.position) 
                            && Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter)) {
                        for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
                            var part = body.parts[j];
                            if (Vertices.contains(part.vertices, mouse.position)) {
                                constraint.pointA = mouse.position;
                                constraint.bodyB = mouseConstraint.body = body;
                                constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                                constraint.angleB = body.angle;

                                Sleeping.set(body, false);
                                Events.trigger(mouseConstraint, 'startdrag', { mouse: mouse, body: body });

                                break;
                            }
                        }
                    }
                }
            } else {
                Sleeping.set(constraint.bodyB, false);
                constraint.pointA = mouse.position;
            }
        } else {
            constraint.bodyB = mouseConstraint.body = null;
            constraint.pointB = null;

            if (body)
                Events.trigger(mouseConstraint, 'enddrag', { mouse: mouse, body: body });
        }
    };

    /**
     * Triggers mouse constraint events.
     * @method _triggerEvents
     * @private
     * @param {mouse} mouseConstraint
     */
    var _triggerEvents = function(mouseConstraint) {
        var mouse = mouseConstraint.mouse,
            mouseEvents = mouse.sourceEvents;

        if (mouseEvents.mousemove)
            Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });

        if (mouseEvents.mousedown)
            Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });

        if (mouseEvents.mouseup)
            Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });

        // reset the mouse state ready for the next step
        Mouse.clearSourceEvents(mouse);
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when the mouse has moved (or a touch moves) during the last step
    *
    * @event mousemove
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is down (or a touch has started) during the last step
    *
    * @event mousedown
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the mouse is up (or a touch has ended) during the last step
    *
    * @event mouseup
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the user starts dragging a body
    *
    * @event startdrag
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {body} event.body The body being dragged
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when the user ends dragging a body
    *
    * @event enddrag
    * @param {} event An event object
    * @param {mouse} event.mouse The engine's mouse instance
    * @param {body} event.body The body that has stopped being dragged
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "constraint"
     * @readOnly
     */

    /**
     * The `Mouse` instance in use. If not supplied in `MouseConstraint.create`, one will be created.
     *
     * @property mouse
     * @type mouse
     * @default mouse
     */

    /**
     * The `Body` that is currently being moved by the user, or `null` if no body.
     *
     * @property body
     * @type body
     * @default null
     */

    /**
     * The `Constraint` object that is used to move the body during interaction.
     *
     * @property constraint
     * @type constraint
     */

    /**
     * An `Object` that specifies the collision filter properties.
     * The collision filter allows the user to define which types of body this mouse constraint can interact with.
     * See `body.collisionFilter` for more information.
     *
     * @property collisionFilter
     * @type object
     */

})();

},{"../body/Composite":11,"../collision/Detector":14,"../core/Common":23,"../core/Events":25,"../core/Mouse":27,"../core/Sleeping":29,"../geometry/Bounds":33,"../geometry/Vertices":36,"./Constraint":21}],23:[function(require,module,exports){
/**
* The `Matter.Common` module contains utility functions that are common to all modules.
*
* @class Common
*/

var Common = {};

module.exports = Common;

(function() {

    Common._nextId = 0;
    Common._seed = 0;

    /**
     * Extends the object in the first argument using the object in the second argument.
     * @method extend
     * @param {} obj
     * @param {boolean} deep
     * @return {} obj extended
     */
    Common.extend = function(obj, deep) {
        var argsStart,
            args,
            deepClone;

        if (typeof deep === 'boolean') {
            argsStart = 2;
            deepClone = deep;
        } else {
            argsStart = 1;
            deepClone = true;
        }

        args = Array.prototype.slice.call(arguments, argsStart);

        for (var i = 0; i < args.length; i++) {
            var source = args[i];

            if (source) {
                for (var prop in source) {
                    if (deepClone && source[prop] && source[prop].constructor === Object) {
                        if (!obj[prop] || obj[prop].constructor === Object) {
                            obj[prop] = obj[prop] || {};
                            Common.extend(obj[prop], deepClone, source[prop]);
                        } else {
                            obj[prop] = source[prop];
                        }
                    } else {
                        obj[prop] = source[prop];
                    }
                }
            }
        }
        
        return obj;
    };

    /**
     * Creates a new clone of the object, if deep is true references will also be cloned.
     * @method clone
     * @param {} obj
     * @param {bool} deep
     * @return {} obj cloned
     */
    Common.clone = function(obj, deep) {
        return Common.extend({}, deep, obj);
    };

    /**
     * Returns the list of keys for the given object.
     * @method keys
     * @param {} obj
     * @return {string[]} keys
     */
    Common.keys = function(obj) {
        if (Object.keys)
            return Object.keys(obj);

        // avoid hasOwnProperty for performance
        var keys = [];
        for (var key in obj)
            keys.push(key);
        return keys;
    };

    /**
     * Returns the list of values for the given object.
     * @method values
     * @param {} obj
     * @return {array} Array of the objects property values
     */
    Common.values = function(obj) {
        var values = [];
        
        if (Object.keys) {
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                values.push(obj[keys[i]]);
            }
            return values;
        }
        
        // avoid hasOwnProperty for performance
        for (var key in obj)
            values.push(obj[key]);
        return values;
    };

    /**
     * Returns a hex colour string made by lightening or darkening color by percent.
     * @method shadeColor
     * @param {string} color
     * @param {number} percent
     * @return {string} A hex colour
     */
    Common.shadeColor = function(color, percent) {   
        // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color
        var colorInteger = parseInt(color.slice(1),16), 
            amount = Math.round(2.55 * percent), 
            R = (colorInteger >> 16) + amount, 
            B = (colorInteger >> 8 & 0x00FF) + amount, 
            G = (colorInteger & 0x0000FF) + amount;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R :255) * 0x10000 
                + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 
                + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    };

    /**
     * Shuffles the given array in-place.
     * The function uses a seeded random generator.
     * @method shuffle
     * @param {array} array
     * @return {array} array shuffled randomly
     */
    Common.shuffle = function(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Common.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    };

    /**
     * Randomly chooses a value from a list with equal probability.
     * The function uses a seeded random generator.
     * @method choose
     * @param {array} choices
     * @return {object} A random choice object from the array
     */
    Common.choose = function(choices) {
        return choices[Math.floor(Common.random() * choices.length)];
    };

    /**
     * Returns true if the object is a HTMLElement, otherwise false.
     * @method isElement
     * @param {object} obj
     * @return {boolean} True if the object is a HTMLElement, otherwise false
     */
    Common.isElement = function(obj) {
        // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
        try {
            return obj instanceof HTMLElement;
        }
        catch(e){
            return (typeof obj==="object") &&
              (obj.nodeType===1) && (typeof obj.style === "object") &&
              (typeof obj.ownerDocument ==="object");
        }
    };

    /**
     * Returns true if the object is an array.
     * @method isArray
     * @param {object} obj
     * @return {boolean} True if the object is an array, otherwise false
     */
    Common.isArray = function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };
    
    /**
     * Returns the given value clamped between a minimum and maximum value.
     * @method clamp
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @return {number} The value clamped between min and max inclusive
     */
    Common.clamp = function(value, min, max) {
        if (value < min)
            return min;
        if (value > max)
            return max;
        return value;
    };
    
    /**
     * Returns the sign of the given value.
     * @method sign
     * @param {number} value
     * @return {number} -1 if negative, +1 if 0 or positive
     */
    Common.sign = function(value) {
        return value < 0 ? -1 : 1;
    };
    
    /**
     * Returns the current timestamp (high-res if available).
     * @method now
     * @return {number} the current timestamp (high-res if available)
     */
    Common.now = function() {
        // http://stackoverflow.com/questions/221294/how-do-you-get-a-timestamp-in-javascript
        // https://gist.github.com/davidwaterston/2982531

        var performance = window.performance || {};

        performance.now = (function() {
            return performance.now    ||
            performance.webkitNow     ||
            performance.msNow         ||
            performance.oNow          ||
            performance.mozNow        ||
            function() { return +(new Date()); };
        })();
              
        return performance.now();
    };

    
    /**
     * Returns a random value between a minimum and a maximum value inclusive.
     * The function uses a seeded random generator.
     * @method random
     * @param {number} min
     * @param {number} max
     * @return {number} A random number between min and max inclusive
     */
    Common.random = function(min, max) {
        min = (typeof min !== "undefined") ? min : 0;
        max = (typeof max !== "undefined") ? max : 1;
        return min + _seededRandom() * (max - min);
    };

    /**
     * Converts a CSS hex colour string into an integer.
     * @method colorToNumber
     * @param {string} colorString
     * @return {number} An integer representing the CSS hex string
     */
    Common.colorToNumber = function(colorString) {
        colorString = colorString.replace('#','');

        if (colorString.length == 3) {
            colorString = colorString.charAt(0) + colorString.charAt(0)
                        + colorString.charAt(1) + colorString.charAt(1)
                        + colorString.charAt(2) + colorString.charAt(2);
        }

        return parseInt(colorString, 16);
    };

    /**
     * A wrapper for console.log, for providing errors and warnings.
     * @method log
     * @param {string} message
     * @param {string} type
     */
    Common.log = function(message, type) {
        if (!console || !console.log || !console.warn)
            return;

        switch (type) {

        case 'warn':
            console.warn('Matter.js:', message);
            break;
        case 'error':
            console.log('Matter.js:', message);
            break;

        }
    };

    /**
     * Returns the next unique sequential ID.
     * @method nextId
     * @return {Number} Unique sequential ID
     */
    Common.nextId = function() {
        return Common._nextId++;
    };

    /**
     * A cross browser compatible indexOf implementation.
     * @method indexOf
     * @param {array} haystack
     * @param {object} needle
     */
    Common.indexOf = function(haystack, needle) {
        if (haystack.indexOf)
            return haystack.indexOf(needle);

        for (var i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle)
                return i;
        }

        return -1;
    };

    var _seededRandom = function() {
        // https://gist.github.com/ngryman/3830489
        Common._seed = (Common._seed * 9301 + 49297) % 233280;
        return Common._seed / 233280;
    };

})();

},{}],24:[function(require,module,exports){
/**
* The `Matter.Engine` module contains methods for creating and manipulating engines.
* An engine is a controller that manages updating the simulation of the world.
* See `Matter.Runner` for an optional game loop utility.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Engine
*/

var Engine = {};

module.exports = Engine;

var World = require('../body/World');
var Sleeping = require('./Sleeping');
var Resolver = require('../collision/Resolver');
var Render = require('../render/Render');
var Pairs = require('../collision/Pairs');
var Metrics = require('./Metrics');
var Grid = require('../collision/Grid');
var Events = require('./Events');
var Composite = require('../body/Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('./Common');
var Body = require('../body/Body');

(function() {

    /**
     * Creates a new engine. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {object} [options]
     * @return {engine} engine
     */
    Engine.create = function(element, options) {
        // options may be passed as the first (and only) argument
        options = Common.isElement(element) ? options : element;
        element = Common.isElement(element) ? element : null;
        options = options || {};

        if (element || options.render) {
            Common.log('Engine.create: engine.render is deprecated (see docs)', 'warn');
        }

        var defaults = {
            positionIterations: 6,
            velocityIterations: 4,
            constraintIterations: 2,
            enableSleeping: false,
            events: [],
            timing: {
                timestamp: 0,
                timeScale: 1
            },
            broadphase: {
                controller: Grid
            }
        };

        var engine = Common.extend(defaults, options);

        // @deprecated
        if (element || engine.render) {
            var renderDefaults = {
                element: element,
                controller: Render
            };
            
            engine.render = Common.extend(renderDefaults, engine.render);
        }

        // @deprecated
        if (engine.render && engine.render.controller) {
            engine.render = engine.render.controller.create(engine.render);
        }

        // @deprecated
        if (engine.render) {
            engine.render.engine = engine;
        }

        engine.world = options.world || World.create(engine.world);
        engine.pairs = Pairs.create();
        engine.broadphase = engine.broadphase.controller.create(engine.broadphase);
        engine.metrics = engine.metrics || { extended: false };

        // @if DEBUG
        engine.metrics = Metrics.create(engine.metrics);
        // @endif

        return engine;
    };

    /**
     * Moves the simulation forward in time by `delta` ms.
     * The `correction` argument is an optional `Number` that specifies the time correction factor to apply to the update.
     * This can help improve the accuracy of the simulation in cases where `delta` is changing between updates.
     * The value of `correction` is defined as `delta / lastDelta`, i.e. the percentage change of `delta` over the last step.
     * Therefore the value is always `1` (no correction) when `delta` constant (or when no correction is desired, which is the default).
     * See the paper on <a href="http://lonesock.net/article/verlet.html">Time Corrected Verlet</a> for more information.
     *
     * Triggers `beforeUpdate` and `afterUpdate` events.
     * Triggers `collisionStart`, `collisionActive` and `collisionEnd` events.
     * @method update
     * @param {engine} engine
     * @param {number} [delta=16.666]
     * @param {number} [correction=1]
     */
    Engine.update = function(engine, delta, correction) {
        delta = delta || 1000 / 60;
        correction = correction || 1;

        var world = engine.world,
            timing = engine.timing,
            broadphase = engine.broadphase,
            broadphasePairs = [],
            i;

        // increment timestamp
        timing.timestamp += delta * timing.timeScale;

        // create an event object
        var event = {
            timestamp: timing.timestamp
        };

        Events.trigger(engine, 'beforeUpdate', event);

        // get lists of all bodies and constraints, no matter what composites they are in
        var allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world);

        // @if DEBUG
        // reset metrics logging
        Metrics.reset(engine.metrics);
        // @endif

        // if sleeping enabled, call the sleeping controller
        if (engine.enableSleeping)
            Sleeping.update(allBodies, timing.timeScale);

        // applies gravity to all bodies
        _bodiesApplyGravity(allBodies, world.gravity);

        // update all body position and rotation by integration
        _bodiesUpdate(allBodies, delta, timing.timeScale, correction, world.bounds);

        // update all constraints
        for (i = 0; i < engine.constraintIterations; i++) {
            Constraint.solveAll(allConstraints, timing.timeScale);
        }
        Constraint.postSolveAll(allBodies);

        // broadphase pass: find potential collision pairs
        if (broadphase.controller) {

            // if world is dirty, we must flush the whole grid
            if (world.isModified)
                broadphase.controller.clear(broadphase);

            // update the grid buckets based on current bodies
            broadphase.controller.update(broadphase, allBodies, engine, world.isModified);
            broadphasePairs = broadphase.pairsList;
        } else {

            // if no broadphase set, we just pass all bodies
            broadphasePairs = allBodies;
        }

        // clear all composite modified flags
        if (world.isModified) {
            Composite.setModified(world, false, false, true);
        }

        // narrowphase pass: find actual collisions, then create or update collision pairs
        var collisions = broadphase.detector(broadphasePairs, engine);

        // update collision pairs
        var pairs = engine.pairs,
            timestamp = timing.timestamp;
        Pairs.update(pairs, collisions, timestamp);
        Pairs.removeOld(pairs, timestamp);

        // wake up bodies involved in collisions
        if (engine.enableSleeping)
            Sleeping.afterCollisions(pairs.list, timing.timeScale);

        // trigger collision events
        if (pairs.collisionStart.length > 0)
            Events.trigger(engine, 'collisionStart', { pairs: pairs.collisionStart });

        // iteratively resolve position between collisions
        Resolver.preSolvePosition(pairs.list);
        for (i = 0; i < engine.positionIterations; i++) {
            Resolver.solvePosition(pairs.list, timing.timeScale);
        }
        Resolver.postSolvePosition(allBodies);

        // iteratively resolve velocity between collisions
        Resolver.preSolveVelocity(pairs.list);
        for (i = 0; i < engine.velocityIterations; i++) {
            Resolver.solveVelocity(pairs.list, timing.timeScale);
        }

        // trigger collision events
        if (pairs.collisionActive.length > 0)
            Events.trigger(engine, 'collisionActive', { pairs: pairs.collisionActive });

        if (pairs.collisionEnd.length > 0)
            Events.trigger(engine, 'collisionEnd', { pairs: pairs.collisionEnd });

        // @if DEBUG
        // update metrics log
        Metrics.update(engine.metrics, engine);
        // @endif

        // clear force buffers
        _bodiesClearForces(allBodies);

        Events.trigger(engine, 'afterUpdate', event);

        return engine;
    };
    
    /**
     * Merges two engines by keeping the configuration of `engineA` but replacing the world with the one from `engineB`.
     * @method merge
     * @param {engine} engineA
     * @param {engine} engineB
     */
    Engine.merge = function(engineA, engineB) {
        Common.extend(engineA, engineB);
        
        if (engineB.world) {
            engineA.world = engineB.world;

            Engine.clear(engineA);

            var bodies = Composite.allBodies(engineA.world);

            for (var i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                Sleeping.set(body, false);
                body.id = Common.nextId();
            }
        }
    };

    /**
     * Clears the engine including the world, pairs and broadphase.
     * @method clear
     * @param {engine} engine
     */
    Engine.clear = function(engine) {
        var world = engine.world;
        
        Pairs.clear(engine.pairs);

        var broadphase = engine.broadphase;
        if (broadphase.controller) {
            var bodies = Composite.allBodies(world);
            broadphase.controller.clear(broadphase);
            broadphase.controller.update(broadphase, bodies, engine, true);
        }
    };

    /**
     * Zeroes the `body.force` and `body.torque` force buffers.
     * @method bodiesClearForces
     * @private
     * @param {body[]} bodies
     */
    var _bodiesClearForces = function(bodies) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            // reset force buffers
            body.force.x = 0;
            body.force.y = 0;
            body.torque = 0;
        }
    };

    /**
     * Applys a mass dependant force to all given bodies.
     * @method bodiesApplyGravity
     * @private
     * @param {body[]} bodies
     * @param {vector} gravity
     */
    var _bodiesApplyGravity = function(bodies, gravity) {
        var gravityScale = typeof gravity.scale !== 'undefined' ? gravity.scale : 0.001;

        if ((gravity.x === 0 && gravity.y === 0) || gravityScale === 0) {
            return;
        }
        
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            // apply gravity
            body.force.y += body.mass * gravity.y * gravityScale;
            body.force.x += body.mass * gravity.x * gravityScale;
        }
    };

    /**
     * Applys `Body.update` to all given `bodies`.
     * @method updateAll
     * @private
     * @param {body[]} bodies
     * @param {number} deltaTime 
     * The amount of time elapsed between updates
     * @param {number} timeScale
     * @param {number} correction 
     * The Verlet correction factor (deltaTime / lastDeltaTime)
     * @param {bounds} worldBounds
     */
    var _bodiesUpdate = function(bodies, deltaTime, timeScale, correction, worldBounds) {
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isStatic || body.isSleeping)
                continue;

            Body.update(body, deltaTime, timeScale, correction);
        }
    };

    /**
     * An alias for `Runner.run`, see `Matter.Runner` for more information.
     * @method run
     * @param {engine} engine
     */

    /**
    * Fired just before an update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update and all collision events
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have started to collide in the current tick (if any)
    *
    * @event collisionStart
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that are colliding in the current tick (if any)
    *
    * @event collisionActive
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have ended collision in the current tick (if any)
    *
    * @event collisionEnd
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` that specifies the number of position iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property positionIterations
     * @type number
     * @default 6
     */

    /**
     * An integer `Number` that specifies the number of velocity iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property velocityIterations
     * @type number
     * @default 4
     */

    /**
     * An integer `Number` that specifies the number of constraint iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     * The default value of `2` is usually very adequate.
     *
     * @property constraintIterations
     * @type number
     * @default 2
     */

    /**
     * A flag that specifies whether the engine should allow sleeping via the `Matter.Sleeping` module.
     * Sleeping can improve stability and performance, but often at the expense of accuracy.
     *
     * @property enableSleeping
     * @type boolean
     * @default false
     */

    /**
     * An `Object` containing properties regarding the timing systems of the engine. 
     *
     * @property timing
     * @type object
     */

    /**
     * A `Number` that specifies the global scaling factor of time for all bodies.
     * A value of `0` freezes the simulation.
     * A value of `0.1` gives a slow-motion effect.
     * A value of `1.2` gives a speed-up effect.
     *
     * @property timing.timeScale
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the current simulation-time in milliseconds starting from `0`. 
     * It is incremented on every `Engine.update` by the given `delta` argument. 
     *
     * @property timing.timestamp
     * @type number
     * @default 0
     */

    /**
     * An instance of a `Render` controller. The default value is a `Matter.Render` instance created by `Engine.create`.
     * One may also develop a custom renderer module based on `Matter.Render` and pass an instance of it to `Engine.create` via `options.render`.
     *
     * A minimal custom renderer object must define at least three functions: `create`, `clear` and `world` (see `Matter.Render`).
     * It is also possible to instead pass the _module_ reference via `options.render.controller` and `Engine.create` will instantiate one for you.
     *
     * @property render
     * @type render
     * @deprecated see Demo.js for an example of creating a renderer
     * @default a Matter.Render instance
     */

    /**
     * An instance of a broadphase controller. The default value is a `Matter.Grid` instance created by `Engine.create`.
     *
     * @property broadphase
     * @type grid
     * @default a Matter.Grid instance
     */

    /**
     * A `World` composite object that will contain all simulated bodies and constraints.
     *
     * @property world
     * @type world
     * @default a Matter.World instance
     */

})();

},{"../body/Body":10,"../body/Composite":11,"../body/World":12,"../collision/Grid":15,"../collision/Pairs":17,"../collision/Resolver":19,"../constraint/Constraint":21,"../render/Render":38,"./Common":23,"./Events":25,"./Metrics":26,"./Sleeping":29}],25:[function(require,module,exports){
/**
* The `Matter.Events` module contains methods to fire and listen to events on other objects.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Events
*/

var Events = {};

module.exports = Events;

var Common = require('./Common');

(function() {

    /**
     * Subscribes a callback function to the given object's `eventName`.
     * @method on
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.on = function(object, eventNames, callback) {
        var names = eventNames.split(' '),
            name;

        for (var i = 0; i < names.length; i++) {
            name = names[i];
            object.events = object.events || {};
            object.events[name] = object.events[name] || [];
            object.events[name].push(callback);
        }

        return callback;
    };

    /**
     * Removes the given event callback. If no callback, clears all callbacks in `eventNames`. If no `eventNames`, clears all events.
     * @method off
     * @param {} object
     * @param {string} eventNames
     * @param {function} callback
     */
    Events.off = function(object, eventNames, callback) {
        if (!eventNames) {
            object.events = {};
            return;
        }

        // handle Events.off(object, callback)
        if (typeof eventNames === 'function') {
            callback = eventNames;
            eventNames = Common.keys(object.events).join(' ');
        }

        var names = eventNames.split(' ');

        for (var i = 0; i < names.length; i++) {
            var callbacks = object.events[names[i]],
                newCallbacks = [];

            if (callback && callbacks) {
                for (var j = 0; j < callbacks.length; j++) {
                    if (callbacks[j] !== callback)
                        newCallbacks.push(callbacks[j]);
                }
            }

            object.events[names[i]] = newCallbacks;
        }
    };

    /**
     * Fires all the callbacks subscribed to the given object's `eventName`, in the order they subscribed, if any.
     * @method trigger
     * @param {} object
     * @param {string} eventNames
     * @param {} event
     */
    Events.trigger = function(object, eventNames, event) {
        var names,
            name,
            callbacks,
            eventClone;

        if (object.events) {
            if (!event)
                event = {};

            names = eventNames.split(' ');

            for (var i = 0; i < names.length; i++) {
                name = names[i];
                callbacks = object.events[name];

                if (callbacks) {
                    eventClone = Common.clone(event, false);
                    eventClone.name = name;
                    eventClone.source = object;

                    for (var j = 0; j < callbacks.length; j++) {
                        callbacks[j].apply(object, [eventClone]);
                    }
                }
            }
        }
    };

})();

},{"./Common":23}],26:[function(require,module,exports){
// @if DEBUG
/**
* _Internal Class_, not generally used outside of the engine's internals.
*
*/

var Metrics = {};

module.exports = Metrics;

var Composite = require('../body/Composite');
var Common = require('./Common');

(function() {

    /**
     * Creates a new metrics.
     * @method create
     * @private
     * @return {metrics} A new metrics
     */
    Metrics.create = function(options) {
        var defaults = {
            extended: false,
            narrowDetections: 0,
            narrowphaseTests: 0,
            narrowReuse: 0,
            narrowReuseCount: 0,
            midphaseTests: 0,
            broadphaseTests: 0,
            narrowEff: 0.0001,
            midEff: 0.0001,
            broadEff: 0.0001,
            collisions: 0,
            buckets: 0,
            bodies: 0,
            pairs: 0
        };

        return Common.extend(defaults, false, options);
    };

    /**
     * Resets metrics.
     * @method reset
     * @private
     * @param {metrics} metrics
     */
    Metrics.reset = function(metrics) {
        if (metrics.extended) {
            metrics.narrowDetections = 0;
            metrics.narrowphaseTests = 0;
            metrics.narrowReuse = 0;
            metrics.narrowReuseCount = 0;
            metrics.midphaseTests = 0;
            metrics.broadphaseTests = 0;
            metrics.narrowEff = 0;
            metrics.midEff = 0;
            metrics.broadEff = 0;
            metrics.collisions = 0;
            metrics.buckets = 0;
            metrics.pairs = 0;
            metrics.bodies = 0;
        }
    };

    /**
     * Updates metrics.
     * @method update
     * @private
     * @param {metrics} metrics
     * @param {engine} engine
     */
    Metrics.update = function(metrics, engine) {
        if (metrics.extended) {
            var world = engine.world,
                bodies = Composite.allBodies(world);

            metrics.collisions = metrics.narrowDetections;
            metrics.pairs = engine.pairs.list.length;
            metrics.bodies = bodies.length;
            metrics.midEff = (metrics.narrowDetections / (metrics.midphaseTests || 1)).toFixed(2);
            metrics.narrowEff = (metrics.narrowDetections / (metrics.narrowphaseTests || 1)).toFixed(2);
            metrics.broadEff = (1 - (metrics.broadphaseTests / (bodies.length || 1))).toFixed(2);
            metrics.narrowReuse = (metrics.narrowReuseCount / (metrics.narrowphaseTests || 1)).toFixed(2);
            //var broadphase = engine.broadphase[engine.broadphase.current];
            //if (broadphase.instance)
            //    metrics.buckets = Common.keys(broadphase.instance.buckets).length;
        }
    };

})();
// @endif

},{"../body/Composite":11,"./Common":23}],27:[function(require,module,exports){
/**
* The `Matter.Mouse` module contains methods for creating and manipulating mouse inputs.
*
* @class Mouse
*/

var Mouse = {};

module.exports = Mouse;

var Common = require('../core/Common');

(function() {

    /**
     * Creates a mouse input.
     * @method create
     * @param {HTMLElement} element
     * @return {mouse} A new mouse
     */
    Mouse.create = function(element) {
        var mouse = {};

        if (!element) {
            Common.log('Mouse.create: element was undefined, defaulting to document.body', 'warn');
        }
        
        mouse.element = element || document.body;
        mouse.absolute = { x: 0, y: 0 };
        mouse.position = { x: 0, y: 0 };
        mouse.mousedownPosition = { x: 0, y: 0 };
        mouse.mouseupPosition = { x: 0, y: 0 };
        mouse.offset = { x: 0, y: 0 };
        mouse.scale = { x: 1, y: 1 };
        mouse.wheelDelta = 0;
        mouse.button = -1;
        mouse.pixelRatio = mouse.element.getAttribute('data-pixel-ratio') || 1;

        mouse.sourceEvents = {
            mousemove: null,
            mousedown: null,
            mouseup: null,
            mousewheel: null
        };
        
        mouse.mousemove = function(event) { 
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.sourceEvents.mousemove = event;
        };
        
        mouse.mousedown = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                mouse.button = 0;
                event.preventDefault();
            } else {
                mouse.button = event.button;
            }

            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mousedownPosition.x = mouse.position.x;
            mouse.mousedownPosition.y = mouse.position.y;
            mouse.sourceEvents.mousedown = event;
        };
        
        mouse.mouseup = function(event) {
            var position = _getRelativeMousePosition(event, mouse.element, mouse.pixelRatio),
                touches = event.changedTouches;

            if (touches) {
                event.preventDefault();
            }
            
            mouse.button = -1;
            mouse.absolute.x = position.x;
            mouse.absolute.y = position.y;
            mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
            mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
            mouse.mouseupPosition.x = mouse.position.x;
            mouse.mouseupPosition.y = mouse.position.y;
            mouse.sourceEvents.mouseup = event;
        };

        mouse.mousewheel = function(event) {
            mouse.wheelDelta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
            event.preventDefault();
        };

        Mouse.setElement(mouse, mouse.element);

        return mouse;
    };

    /**
     * Sets the element the mouse is bound to (and relative to).
     * @method setElement
     * @param {mouse} mouse
     * @param {HTMLElement} element
     */
    Mouse.setElement = function(mouse, element) {
        mouse.element = element;

        element.addEventListener('mousemove', mouse.mousemove);
        element.addEventListener('mousedown', mouse.mousedown);
        element.addEventListener('mouseup', mouse.mouseup);
        
        element.addEventListener('mousewheel', mouse.mousewheel);
        element.addEventListener('DOMMouseScroll', mouse.mousewheel);

        element.addEventListener('touchmove', mouse.mousemove);
        element.addEventListener('touchstart', mouse.mousedown);
        element.addEventListener('touchend', mouse.mouseup);
    };

    /**
     * Clears all captured source events.
     * @method clearSourceEvents
     * @param {mouse} mouse
     */
    Mouse.clearSourceEvents = function(mouse) {
        mouse.sourceEvents.mousemove = null;
        mouse.sourceEvents.mousedown = null;
        mouse.sourceEvents.mouseup = null;
        mouse.sourceEvents.mousewheel = null;
        mouse.wheelDelta = 0;
    };

    /**
     * Sets the mouse position offset.
     * @method setOffset
     * @param {mouse} mouse
     * @param {vector} offset
     */
    Mouse.setOffset = function(mouse, offset) {
        mouse.offset.x = offset.x;
        mouse.offset.y = offset.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };

    /**
     * Sets the mouse position scale.
     * @method setScale
     * @param {mouse} mouse
     * @param {vector} scale
     */
    Mouse.setScale = function(mouse, scale) {
        mouse.scale.x = scale.x;
        mouse.scale.y = scale.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
    };
    
    /**
     * Gets the mouse position relative to an element given a screen pixel ratio.
     * @method _getRelativeMousePosition
     * @private
     * @param {} event
     * @param {} element
     * @param {number} pixelRatio
     * @return {}
     */
    var _getRelativeMousePosition = function(event, element, pixelRatio) {
        var elementBounds = element.getBoundingClientRect(),
            rootNode = (document.documentElement || document.body.parentNode || document.body),
            scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft,
            scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop,
            touches = event.changedTouches,
            x, y;
        
        if (touches) {
            x = touches[0].pageX - elementBounds.left - scrollX;
            y = touches[0].pageY - elementBounds.top - scrollY;
        } else {
            x = event.pageX - elementBounds.left - scrollX;
            y = event.pageY - elementBounds.top - scrollY;
        }

        return { 
            x: x / (element.clientWidth / element.width * pixelRatio),
            y: y / (element.clientHeight / element.height * pixelRatio)
        };
    };

})();

},{"../core/Common":23}],28:[function(require,module,exports){
/**
* The `Matter.Runner` module is an optional utility which provides a game loop, 
* that handles continuously updating a `Matter.Engine` for you within a browser.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* If you are using your own game loop instead, then you do not need the `Matter.Runner` module.
* Instead just call `Engine.update(engine, delta)` in your own loop.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Runner
*/

var Runner = {};

module.exports = Runner;

var Events = require('./Events');
var Engine = require('./Engine');
var Common = require('./Common');

(function() {

    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }

    /**
     * Creates a new Runner. The options parameter is an object that specifies any properties you wish to override the defaults.
     * @method create
     * @param {} options
     */
    Runner.create = function(options) {
        var defaults = {
            fps: 60,
            correction: 1,
            deltaSampleSize: 60,
            counterTimestamp: 0,
            frameCounter: 0,
            deltaHistory: [],
            timePrev: null,
            timeScalePrev: 1,
            frameRequestId: null,
            isFixed: false,
            enabled: true
        };

        var runner = Common.extend(defaults, options);

        runner.delta = runner.delta || 1000 / runner.fps;
        runner.deltaMin = runner.deltaMin || 1000 / runner.fps;
        runner.deltaMax = runner.deltaMax || 1000 / (runner.fps * 0.5);
        runner.fps = 1000 / runner.delta;

        return runner;
    };

    /**
     * Continuously ticks a `Matter.Engine` by calling `Runner.tick` on the `requestAnimationFrame` event.
     * @method run
     * @param {engine} engine
     */
    Runner.run = function(runner, engine) {
        // create runner if engine is first argument
        if (typeof runner.positionIterations !== 'undefined') {
            engine = runner;
            runner = Runner.create();
        }

        (function render(time){
            runner.frameRequestId = _requestAnimationFrame(render);

            if (time && runner.enabled) {
                Runner.tick(runner, engine, time);
            }
        })();

        return runner;
    };

    /**
     * A game loop utility that updates the engine and renderer by one step (a 'tick').
     * Features delta smoothing, time correction and fixed or dynamic timing.
     * Triggers `beforeTick`, `tick` and `afterTick` events on the engine.
     * Consider just `Engine.update(engine, delta)` if you're using your own loop.
     * @method tick
     * @param {runner} runner
     * @param {engine} engine
     * @param {number} time
     */
    Runner.tick = function(runner, engine, time) {
        var timing = engine.timing,
            correction = 1,
            delta;

        // create an event object
        var event = {
            timestamp: timing.timestamp
        };

        Events.trigger(runner, 'beforeTick', event);
        Events.trigger(engine, 'beforeTick', event); // @deprecated

        if (runner.isFixed) {
            // fixed timestep
            delta = runner.delta;
        } else {
            // dynamic timestep based on wall clock between calls
            delta = (time - runner.timePrev) || runner.delta;
            runner.timePrev = time;

            // optimistically filter delta over a few frames, to improve stability
            runner.deltaHistory.push(delta);
            runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize);
            delta = Math.min.apply(null, runner.deltaHistory);
            
            // limit delta
            delta = delta < runner.deltaMin ? runner.deltaMin : delta;
            delta = delta > runner.deltaMax ? runner.deltaMax : delta;

            // correction for delta
            correction = delta / runner.delta;

            // update engine timing object
            runner.delta = delta;
        }

        // time correction for time scaling
        if (runner.timeScalePrev !== 0)
            correction *= timing.timeScale / runner.timeScalePrev;

        if (timing.timeScale === 0)
            correction = 0;

        runner.timeScalePrev = timing.timeScale;
        runner.correction = correction;

        // fps counter
        runner.frameCounter += 1;
        if (time - runner.counterTimestamp >= 1000) {
            runner.fps = runner.frameCounter * ((time - runner.counterTimestamp) / 1000);
            runner.counterTimestamp = time;
            runner.frameCounter = 0;
        }

        Events.trigger(runner, 'tick', event);
        Events.trigger(engine, 'tick', event); // @deprecated

        // if world has been modified, clear the render scene graph
        if (engine.world.isModified 
            && engine.render
            && engine.render.controller
            && engine.render.controller.clear) {
            engine.render.controller.clear(engine.render);
        }

        // update
        Events.trigger(runner, 'beforeUpdate', event);
        Engine.update(engine, delta, correction);
        Events.trigger(runner, 'afterUpdate', event);

        // render
        // @deprecated
        if (engine.render && engine.render.controller) {
            Events.trigger(runner, 'beforeRender', event);
            Events.trigger(engine, 'beforeRender', event); // @deprecated

            engine.render.controller.world(engine.render);

            Events.trigger(runner, 'afterRender', event);
            Events.trigger(engine, 'afterRender', event); // @deprecated
        }

        Events.trigger(runner, 'afterTick', event);
        Events.trigger(engine, 'afterTick', event); // @deprecated
    };

    /**
     * Ends execution of `Runner.run` on the given `runner`, by canceling the animation frame request event loop.
     * If you wish to only temporarily pause the engine, see `engine.enabled` instead.
     * @method stop
     * @param {runner} runner
     */
    Runner.stop = function(runner) {
        _cancelAnimationFrame(runner.frameRequestId);
    };

    /**
     * Alias for `Runner.run`.
     * @method start
     * @param {runner} runner
     * @param {engine} engine
     */
    Runner.start = function(runner, engine) {
        Runner.run(runner, engine);
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired at the start of a tick, before any updates to the engine or timing
    *
    * @event beforeTick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine timing updated, but just before update
    *
    * @event tick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired at the end of a tick, after engine update and after rendering
    *
    * @event afterTick
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired before update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after update
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired before rendering
    *
    * @event beforeRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    * @deprecated
    */

    /**
    * Fired after rendering
    *
    * @event afterRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    * @deprecated
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A flag that specifies whether the runner is running or not.
     *
     * @property enabled
     * @type boolean
     * @default true
     */

    /**
     * A `Boolean` that specifies if the runner should use a fixed timestep (otherwise it is variable).
     * If timing is fixed, then the apparent simulation speed will change depending on the frame rate (but behaviour will be deterministic).
     * If the timing is variable, then the apparent simulation speed will be constant (approximately, but at the cost of determininism).
     *
     * @property isFixed
     * @type boolean
     * @default false
     */

    /**
     * A `Number` that specifies the time step between updates in milliseconds.
     * If `engine.timing.isFixed` is set to `true`, then `delta` is fixed.
     * If it is `false`, then `delta` can dynamically change to maintain the correct apparent simulation speed.
     *
     * @property delta
     * @type number
     * @default 1000 / 60
     */

})();

},{"./Common":23,"./Engine":24,"./Events":25}],29:[function(require,module,exports){
/**
* The `Matter.Sleeping` module contains methods to manage the sleeping state of bodies.
*
* @class Sleeping
*/

var Sleeping = {};

module.exports = Sleeping;

var Events = require('./Events');

(function() {

    Sleeping._motionWakeThreshold = 0.18;
    Sleeping._motionSleepThreshold = 0.08;
    Sleeping._minBias = 0.9;

    /**
     * Puts bodies to sleep or wakes them up depending on their motion.
     * @method update
     * @param {body[]} bodies
     * @param {number} timeScale
     */
    Sleeping.update = function(bodies, timeScale) {
        var timeFactor = timeScale * timeScale * timeScale;

        // update bodies sleeping status
        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                motion = body.speed * body.speed + body.angularSpeed * body.angularSpeed;

            // wake up bodies if they have a force applied
            if (body.force.x !== 0 || body.force.y !== 0) {
                Sleeping.set(body, false);
                continue;
            }

            var minMotion = Math.min(body.motion, motion),
                maxMotion = Math.max(body.motion, motion);
        
            // biased average motion estimation between frames
            body.motion = Sleeping._minBias * minMotion + (1 - Sleeping._minBias) * maxMotion;
            
            if (body.sleepThreshold > 0 && body.motion < Sleeping._motionSleepThreshold * timeFactor) {
                body.sleepCounter += 1;
                
                if (body.sleepCounter >= body.sleepThreshold)
                    Sleeping.set(body, true);
            } else if (body.sleepCounter > 0) {
                body.sleepCounter -= 1;
            }
        }
    };

    /**
     * Given a set of colliding pairs, wakes the sleeping bodies involved.
     * @method afterCollisions
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Sleeping.afterCollisions = function(pairs, timeScale) {
        var timeFactor = timeScale * timeScale * timeScale;

        // wake up bodies involved in collisions
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            
            // don't wake inactive pairs
            if (!pair.isActive)
                continue;

            var collision = pair.collision,
                bodyA = collision.bodyA.parent, 
                bodyB = collision.bodyB.parent;
        
            // don't wake if at least one body is static
            if ((bodyA.isSleeping && bodyB.isSleeping) || bodyA.isStatic || bodyB.isStatic)
                continue;
        
            if (bodyA.isSleeping || bodyB.isSleeping) {
                var sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                    movingBody = sleepingBody === bodyA ? bodyB : bodyA;

                if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) {
                    Sleeping.set(sleepingBody, false);
                }
            }
        }
    };
  
    /**
     * Set a body as sleeping or awake.
     * @method set
     * @param {body} body
     * @param {boolean} isSleeping
     */
    Sleeping.set = function(body, isSleeping) {
        var wasSleeping = body.isSleeping;

        if (isSleeping) {
            body.isSleeping = true;
            body.sleepCounter = body.sleepThreshold;

            body.positionImpulse.x = 0;
            body.positionImpulse.y = 0;

            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;

            body.anglePrev = body.angle;
            body.speed = 0;
            body.angularSpeed = 0;
            body.motion = 0;

            if (!wasSleeping) {
                Events.trigger(body, 'sleepStart');
            }
        } else {
            body.isSleeping = false;
            body.sleepCounter = 0;

            if (wasSleeping) {
                Events.trigger(body, 'sleepEnd');
            }
        }
    };

})();

},{"./Events":25}],30:[function(require,module,exports){
/**
* The `Matter.Bodies` module contains factory methods for creating rigid body models 
* with commonly used body configurations (such as rectangles, circles and other polygons).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Bodies
*/

// TODO: true circle bodies

var Bodies = {};

module.exports = Bodies;

var Vertices = require('../geometry/Vertices');
var Common = require('../core/Common');
var Body = require('../body/Body');
var Bounds = require('../geometry/Bounds');
var Vector = require('../geometry/Vector');

(function() {

    /**
     * Creates a new rigid body model with a rectangle hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method rectangle
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {object} [options]
     * @return {body} A new rectangle body
     */
    Bodies.rectangle = function(x, y, width, height, options) {
        options = options || {};

        var rectangle = { 
            label: 'Rectangle Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath('L 0 0 L ' + width + ' 0 L ' + width + ' ' + height + ' L 0 ' + height)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            rectangle.vertices = Vertices.chamfer(rectangle.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, rectangle, options));
    };
    
    /**
     * Creates a new rigid body model with a trapezoid hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method trapezoid
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} slope
     * @param {object} [options]
     * @return {body} A new trapezoid body
     */
    Bodies.trapezoid = function(x, y, width, height, slope, options) {
        options = options || {};

        slope *= 0.5;
        var roof = (1 - (slope * 2)) * width;
        
        var x1 = width * slope,
            x2 = x1 + roof,
            x3 = x2 + x1,
            verticesPath;

        if (slope < 0.5) {
            verticesPath = 'L 0 0 L ' + x1 + ' ' + (-height) + ' L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
        } else {
            verticesPath = 'L 0 0 L ' + x2 + ' ' + (-height) + ' L ' + x3 + ' 0';
        }

        var trapezoid = { 
            label: 'Trapezoid Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath(verticesPath)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            trapezoid.vertices = Vertices.chamfer(trapezoid.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, trapezoid, options));
    };

    /**
     * Creates a new rigid body model with a circle hull. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method circle
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {object} [options]
     * @param {number} [maxSides]
     * @return {body} A new circle body
     */
    Bodies.circle = function(x, y, radius, options, maxSides) {
        options = options || {};

        var circle = {
            label: 'Circle Body',
            circleRadius: radius
        };
        
        // approximate circles with polygons until true circles implemented in SAT
        maxSides = maxSides || 25;
        var sides = Math.ceil(Math.max(10, Math.min(maxSides, radius)));

        // optimisation: always use even number of sides (half the number of unique axes)
        if (sides % 2 === 1)
            sides += 1;

        return Bodies.polygon(x, y, sides, radius, Common.extend({}, circle, options));
    };

    /**
     * Creates a new rigid body model with a regular polygon hull with the given number of sides. 
     * The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method polygon
     * @param {number} x
     * @param {number} y
     * @param {number} sides
     * @param {number} radius
     * @param {object} [options]
     * @return {body} A new regular polygon body
     */
    Bodies.polygon = function(x, y, sides, radius, options) {
        options = options || {};

        if (sides < 3)
            return Bodies.circle(x, y, radius, options);

        var theta = 2 * Math.PI / sides,
            path = '',
            offset = theta * 0.5;

        for (var i = 0; i < sides; i += 1) {
            var angle = offset + (i * theta),
                xx = Math.cos(angle) * radius,
                yy = Math.sin(angle) * radius;

            path += 'L ' + xx.toFixed(3) + ' ' + yy.toFixed(3) + ' ';
        }

        var polygon = { 
            label: 'Polygon Body',
            position: { x: x, y: y },
            vertices: Vertices.fromPath(path)
        };

        if (options.chamfer) {
            var chamfer = options.chamfer;
            polygon.vertices = Vertices.chamfer(polygon.vertices, chamfer.radius, 
                                    chamfer.quality, chamfer.qualityMin, chamfer.qualityMax);
            delete options.chamfer;
        }

        return Body.create(Common.extend({}, polygon, options));
    };

    /**
     * Creates a body using the supplied vertices (or an array containing multiple sets of vertices).
     * If the vertices are convex, they will pass through as supplied.
     * Otherwise if the vertices are concave, they will be decomposed if [poly-decomp.js](https://github.com/schteppe/poly-decomp.js) is available.
     * Note that this process is not guaranteed to support complex sets of vertices (e.g. those with holes may fail).
     * By default the decomposition will discard collinear edges (to improve performance).
     * It can also optionally discard any parts that have an area less than `minimumArea`.
     * If the vertices can not be decomposed, the result will fall back to using the convex hull.
     * The options parameter is an object that specifies any `Matter.Body` properties you wish to override the defaults.
     * See the properties section of the `Matter.Body` module for detailed information on what you can pass via the `options` object.
     * @method fromVertices
     * @param {number} x
     * @param {number} y
     * @param [[vector]] vertexSets
     * @param {object} [options]
     * @param {bool} [flagInternal=false]
     * @param {number} [removeCollinear=0.01]
     * @param {number} [minimumArea=10]
     * @return {body}
     */
    Bodies.fromVertices = function(x, y, vertexSets, options, flagInternal, removeCollinear, minimumArea) {
        var body,
            parts,
            isConvex,
            vertices,
            i,
            j,
            k,
            v,
            z;

        options = options || {};
        parts = [];

        flagInternal = typeof flagInternal !== 'undefined' ? flagInternal : false;
        removeCollinear = typeof removeCollinear !== 'undefined' ? removeCollinear : 0.01;
        minimumArea = typeof minimumArea !== 'undefined' ? minimumArea : 10;

        if (!window.decomp) {
            Common.log('Bodies.fromVertices: poly-decomp.js required. Could not decompose vertices. Fallback to convex hull.', 'warn');
        }

        // ensure vertexSets is an array of arrays
        if (!Common.isArray(vertexSets[0])) {
            vertexSets = [vertexSets];
        }

        for (v = 0; v < vertexSets.length; v += 1) {
            vertices = vertexSets[v];
            isConvex = Vertices.isConvex(vertices);

            if (isConvex || !window.decomp) {
                if (isConvex) {
                    vertices = Vertices.clockwiseSort(vertices);
                } else {
                    // fallback to convex hull when decomposition is not possible
                    vertices = Vertices.hull(vertices);
                }

                parts.push({
                    position: { x: x, y: y },
                    vertices: vertices
                });
            } else {
                // initialise a decomposition
                var concave = new decomp.Polygon();
                for (i = 0; i < vertices.length; i++) {
                    concave.vertices.push([vertices[i].x, vertices[i].y]);
                }

                // vertices are concave and simple, we can decompose into parts
                concave.makeCCW();
                if (removeCollinear !== false)
                    concave.removeCollinearPoints(removeCollinear);

                // use the quick decomposition algorithm (Bayazit)
                var decomposed = concave.quickDecomp();

                // for each decomposed chunk
                for (i = 0; i < decomposed.length; i++) {
                    var chunk = decomposed[i],
                        chunkVertices = [];

                    // convert vertices into the correct structure
                    for (j = 0; j < chunk.vertices.length; j++) {
                        chunkVertices.push({ x: chunk.vertices[j][0], y: chunk.vertices[j][1] });
                    }

                    // skip small chunks
                    if (minimumArea > 0 && Vertices.area(chunkVertices) < minimumArea)
                        continue;

                    // create a compound part
                    parts.push({
                        position: Vertices.centre(chunkVertices),
                        vertices: chunkVertices
                    });
                }
            }
        }

        // create body parts
        for (i = 0; i < parts.length; i++) {
            parts[i] = Body.create(Common.extend(parts[i], options));
        }

        // flag internal edges (coincident part edges)
        if (flagInternal) {
            var coincident_max_dist = 5;

            for (i = 0; i < parts.length; i++) {
                var partA = parts[i];

                for (j = i + 1; j < parts.length; j++) {
                    var partB = parts[j];

                    if (Bounds.overlaps(partA.bounds, partB.bounds)) {
                        var pav = partA.vertices,
                            pbv = partB.vertices;

                        // iterate vertices of both parts
                        for (k = 0; k < partA.vertices.length; k++) {
                            for (z = 0; z < partB.vertices.length; z++) {
                                // find distances between the vertices
                                var da = Vector.magnitudeSquared(Vector.sub(pav[(k + 1) % pav.length], pbv[z])),
                                    db = Vector.magnitudeSquared(Vector.sub(pav[k], pbv[(z + 1) % pbv.length]));

                                // if both vertices are very close, consider the edge concident (internal)
                                if (da < coincident_max_dist && db < coincident_max_dist) {
                                    pav[k].isInternal = true;
                                    pbv[z].isInternal = true;
                                }
                            }
                        }

                    }
                }
            }
        }

        if (parts.length > 1) {
            // create the parent body to be returned, that contains generated compound parts
            body = Body.create(Common.extend({ parts: parts.slice(0) }, options));
            Body.setPosition(body, { x: x, y: y });

            return body;
        } else {
            return parts[0];
        }
    };

})();
},{"../body/Body":10,"../core/Common":23,"../geometry/Bounds":33,"../geometry/Vector":35,"../geometry/Vertices":36}],31:[function(require,module,exports){
/**
* The `Matter.Composites` module contains factory methods for creating composite bodies
* with commonly used configurations (such as stacks and chains).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Composites
*/

var Composites = {};

module.exports = Composites;

var Composite = require('../body/Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('../core/Common');
var Body = require('../body/Body');
var Bodies = require('./Bodies');

(function() {

    /**
     * Create a new composite containing bodies created in the callback in a grid arrangement.
     * This function uses the body's bounds to prevent overlaps.
     * @method stack
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.stack = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        var stack = Composite.create({ label: 'Stack' }),
            x = xx,
            y = yy,
            lastBody,
            i = 0;

        for (var row = 0; row < rows; row++) {
            var maxHeight = 0;
            
            for (var column = 0; column < columns; column++) {
                var body = callback(x, y, column, row, lastBody, i);
                    
                if (body) {
                    var bodyHeight = body.bounds.max.y - body.bounds.min.y,
                        bodyWidth = body.bounds.max.x - body.bounds.min.x; 

                    if (bodyHeight > maxHeight)
                        maxHeight = bodyHeight;
                    
                    Body.translate(body, { x: bodyWidth * 0.5, y: bodyHeight * 0.5 });

                    x = body.bounds.max.x + columnGap;

                    Composite.addBody(stack, body);
                    
                    lastBody = body;
                    i += 1;
                } else {
                    x += columnGap;
                }
            }
            
            y += maxHeight + rowGap;
            x = xx;
        }

        return stack;
    };
    
    /**
     * Chains all bodies in the given composite together using constraints.
     * @method chain
     * @param {composite} composite
     * @param {number} xOffsetA
     * @param {number} yOffsetA
     * @param {number} xOffsetB
     * @param {number} yOffsetB
     * @param {object} options
     * @return {composite} A new composite containing objects chained together with constraints
     */
    Composites.chain = function(composite, xOffsetA, yOffsetA, xOffsetB, yOffsetB, options) {
        var bodies = composite.bodies;
        
        for (var i = 1; i < bodies.length; i++) {
            var bodyA = bodies[i - 1],
                bodyB = bodies[i],
                bodyAHeight = bodyA.bounds.max.y - bodyA.bounds.min.y,
                bodyAWidth = bodyA.bounds.max.x - bodyA.bounds.min.x, 
                bodyBHeight = bodyB.bounds.max.y - bodyB.bounds.min.y,
                bodyBWidth = bodyB.bounds.max.x - bodyB.bounds.min.x;
        
            var defaults = {
                bodyA: bodyA,
                pointA: { x: bodyAWidth * xOffsetA, y: bodyAHeight * yOffsetA },
                bodyB: bodyB,
                pointB: { x: bodyBWidth * xOffsetB, y: bodyBHeight * yOffsetB }
            };
            
            var constraint = Common.extend(defaults, options);
        
            Composite.addConstraint(composite, Constraint.create(constraint));
        }

        composite.label += ' Chain';
        
        return composite;
    };

    /**
     * Connects bodies in the composite with constraints in a grid pattern, with optional cross braces.
     * @method mesh
     * @param {composite} composite
     * @param {number} columns
     * @param {number} rows
     * @param {boolean} crossBrace
     * @param {object} options
     * @return {composite} The composite containing objects meshed together with constraints
     */
    Composites.mesh = function(composite, columns, rows, crossBrace, options) {
        var bodies = composite.bodies,
            row,
            col,
            bodyA,
            bodyB,
            bodyC;
        
        for (row = 0; row < rows; row++) {
            for (col = 1; col < columns; col++) {
                bodyA = bodies[(col - 1) + (row * columns)];
                bodyB = bodies[col + (row * columns)];
                Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));
            }

            if (row > 0) {
                for (col = 0; col < columns; col++) {
                    bodyA = bodies[col + ((row - 1) * columns)];
                    bodyB = bodies[col + (row * columns)];
                    Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyA, bodyB: bodyB }, options)));

                    if (crossBrace && col > 0) {
                        bodyC = bodies[(col - 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }

                    if (crossBrace && col < columns - 1) {
                        bodyC = bodies[(col + 1) + ((row - 1) * columns)];
                        Composite.addConstraint(composite, Constraint.create(Common.extend({ bodyA: bodyC, bodyB: bodyB }, options)));
                    }
                }
            }
        }

        composite.label += ' Mesh';
        
        return composite;
    };
    
    /**
     * Create a new composite containing bodies created in the callback in a pyramid arrangement.
     * This function uses the body's bounds to prevent overlaps.
     * @method pyramid
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {function} callback
     * @return {composite} A new composite containing objects created in the callback
     */
    Composites.pyramid = function(xx, yy, columns, rows, columnGap, rowGap, callback) {
        return Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y, column, row, lastBody, i) {
            var actualRows = Math.min(rows, Math.ceil(columns / 2)),
                lastBodyWidth = lastBody ? lastBody.bounds.max.x - lastBody.bounds.min.x : 0;
            
            if (row > actualRows)
                return;
            
            // reverse row order
            row = actualRows - row;
            
            var start = row,
                end = columns - 1 - row;

            if (column < start || column > end)
                return;
            
            // retroactively fix the first body's position, since width was unknown
            if (i === 1) {
                Body.translate(lastBody, { x: (column + (columns % 2 === 1 ? 1 : -1)) * lastBodyWidth, y: 0 });
            }

            var xOffset = lastBody ? column * lastBodyWidth : 0;
            
            return callback(xx + xOffset + column * columnGap, y, column, row, lastBody, i);
        });
    };

    /**
     * Creates a composite with a Newton's Cradle setup of bodies and constraints.
     * @method newtonsCradle
     * @param {number} xx
     * @param {number} yy
     * @param {number} number
     * @param {number} size
     * @param {number} length
     * @return {composite} A new composite newtonsCradle body
     */
    Composites.newtonsCradle = function(xx, yy, number, size, length) {
        var newtonsCradle = Composite.create({ label: 'Newtons Cradle' });

        for (var i = 0; i < number; i++) {
            var separation = 1.9,
                circle = Bodies.circle(xx + i * (size * separation), yy + length, size, 
                            { inertia: Infinity, restitution: 1, friction: 0, frictionAir: 0.0001, slop: 1 }),
                constraint = Constraint.create({ pointA: { x: xx + i * (size * separation), y: yy }, bodyB: circle });

            Composite.addBody(newtonsCradle, circle);
            Composite.addConstraint(newtonsCradle, constraint);
        }

        return newtonsCradle;
    };
    
    /**
     * Creates a composite with simple car setup of bodies and constraints.
     * @method car
     * @param {number} xx
     * @param {number} yy
     * @param {number} width
     * @param {number} height
     * @param {number} wheelSize
     * @return {composite} A new composite car body
     */
    Composites.car = function(xx, yy, width, height, wheelSize) {
        var group = Body.nextGroup(true),
            wheelBase = -20,
            wheelAOffset = -width * 0.5 + wheelBase,
            wheelBOffset = width * 0.5 - wheelBase,
            wheelYOffset = 0;
    
        var car = Composite.create({ label: 'Car' }),
            body = Bodies.trapezoid(xx, yy, width, height, 0.3, { 
                collisionFilter: {
                    group: group
                },
                friction: 0.01,
                chamfer: {
                    radius: 10
                }
            });
    
        var wheelA = Bodies.circle(xx + wheelAOffset, yy + wheelYOffset, wheelSize, { 
            collisionFilter: {
                group: group
            },
            friction: 0.8,
            density: 0.01
        });
                    
        var wheelB = Bodies.circle(xx + wheelBOffset, yy + wheelYOffset, wheelSize, { 
            collisionFilter: {
                group: group
            },
            friction: 0.8,
            density: 0.01
        });
                    
        var axelA = Constraint.create({
            bodyA: body,
            pointA: { x: wheelAOffset, y: wheelYOffset },
            bodyB: wheelA,
            stiffness: 0.2
        });
                        
        var axelB = Constraint.create({
            bodyA: body,
            pointA: { x: wheelBOffset, y: wheelYOffset },
            bodyB: wheelB,
            stiffness: 0.2
        });
        
        Composite.addBody(car, body);
        Composite.addBody(car, wheelA);
        Composite.addBody(car, wheelB);
        Composite.addConstraint(car, axelA);
        Composite.addConstraint(car, axelB);

        return car;
    };

    /**
     * Creates a simple soft body like object.
     * @method softBody
     * @param {number} xx
     * @param {number} yy
     * @param {number} columns
     * @param {number} rows
     * @param {number} columnGap
     * @param {number} rowGap
     * @param {boolean} crossBrace
     * @param {number} particleRadius
     * @param {} particleOptions
     * @param {} constraintOptions
     * @return {composite} A new composite softBody
     */
    Composites.softBody = function(xx, yy, columns, rows, columnGap, rowGap, crossBrace, particleRadius, particleOptions, constraintOptions) {
        particleOptions = Common.extend({ inertia: Infinity }, particleOptions);
        constraintOptions = Common.extend({ stiffness: 0.4 }, constraintOptions);

        var softBody = Composites.stack(xx, yy, columns, rows, columnGap, rowGap, function(x, y) {
            return Bodies.circle(x, y, particleRadius, particleOptions);
        });

        Composites.mesh(softBody, columns, rows, crossBrace, constraintOptions);

        softBody.label = 'Soft Body';

        return softBody;
    };

})();

},{"../body/Body":10,"../body/Composite":11,"../constraint/Constraint":21,"../core/Common":23,"./Bodies":30}],32:[function(require,module,exports){
/**
* The `Matter.Axes` module contains methods for creating and manipulating sets of axes.
*
* @class Axes
*/

var Axes = {};

module.exports = Axes;

var Vector = require('../geometry/Vector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of axes from the given vertices.
     * @method fromVertices
     * @param {vertices} vertices
     * @return {axes} A new axes from the given vertices
     */
    Axes.fromVertices = function(vertices) {
        var axes = {};

        // find the unique axes, using edge normal gradients
        for (var i = 0; i < vertices.length; i++) {
            var j = (i + 1) % vertices.length, 
                normal = Vector.normalise({ 
                    x: vertices[j].y - vertices[i].y, 
                    y: vertices[i].x - vertices[j].x
                }),
                gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);
            
            // limit precision
            gradient = gradient.toFixed(3).toString();
            axes[gradient] = normal;
        }

        return Common.values(axes);
    };

    /**
     * Rotates a set of axes by the given angle.
     * @method rotate
     * @param {axes} axes
     * @param {number} angle
     */
    Axes.rotate = function(axes, angle) {
        if (angle === 0)
            return;
        
        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i],
                xx;
            xx = axis.x * cos - axis.y * sin;
            axis.y = axis.x * sin + axis.y * cos;
            axis.x = xx;
        }
    };

})();

},{"../core/Common":23,"../geometry/Vector":35}],33:[function(require,module,exports){
/**
* The `Matter.Bounds` module contains methods for creating and manipulating axis-aligned bounding boxes (AABB).
*
* @class Bounds
*/

var Bounds = {};

module.exports = Bounds;

(function() {

    /**
     * Creates a new axis-aligned bounding box (AABB) for the given vertices.
     * @method create
     * @param {vertices} vertices
     * @return {bounds} A new bounds object
     */
    Bounds.create = function(vertices) {
        var bounds = { 
            min: { x: 0, y: 0 }, 
            max: { x: 0, y: 0 }
        };

        if (vertices)
            Bounds.update(bounds, vertices);
        
        return bounds;
    };

    /**
     * Updates bounds using the given vertices and extends the bounds given a velocity.
     * @method update
     * @param {bounds} bounds
     * @param {vertices} vertices
     * @param {vector} velocity
     */
    Bounds.update = function(bounds, vertices, velocity) {
        bounds.min.x = Infinity;
        bounds.max.x = -Infinity;
        bounds.min.y = Infinity;
        bounds.max.y = -Infinity;

        for (var i = 0; i < vertices.length; i++) {
            var vertex = vertices[i];
            if (vertex.x > bounds.max.x) bounds.max.x = vertex.x;
            if (vertex.x < bounds.min.x) bounds.min.x = vertex.x;
            if (vertex.y > bounds.max.y) bounds.max.y = vertex.y;
            if (vertex.y < bounds.min.y) bounds.min.y = vertex.y;
        }
        
        if (velocity) {
            if (velocity.x > 0) {
                bounds.max.x += velocity.x;
            } else {
                bounds.min.x += velocity.x;
            }
            
            if (velocity.y > 0) {
                bounds.max.y += velocity.y;
            } else {
                bounds.min.y += velocity.y;
            }
        }
    };

    /**
     * Returns true if the bounds contains the given point.
     * @method contains
     * @param {bounds} bounds
     * @param {vector} point
     * @return {boolean} True if the bounds contain the point, otherwise false
     */
    Bounds.contains = function(bounds, point) {
        return point.x >= bounds.min.x && point.x <= bounds.max.x 
               && point.y >= bounds.min.y && point.y <= bounds.max.y;
    };

    /**
     * Returns true if the two bounds intersect.
     * @method overlaps
     * @param {bounds} boundsA
     * @param {bounds} boundsB
     * @return {boolean} True if the bounds overlap, otherwise false
     */
    Bounds.overlaps = function(boundsA, boundsB) {
        return (boundsA.min.x <= boundsB.max.x && boundsA.max.x >= boundsB.min.x
                && boundsA.max.y >= boundsB.min.y && boundsA.min.y <= boundsB.max.y);
    };

    /**
     * Translates the bounds by the given vector.
     * @method translate
     * @param {bounds} bounds
     * @param {vector} vector
     */
    Bounds.translate = function(bounds, vector) {
        bounds.min.x += vector.x;
        bounds.max.x += vector.x;
        bounds.min.y += vector.y;
        bounds.max.y += vector.y;
    };

    /**
     * Shifts the bounds to the given position.
     * @method shift
     * @param {bounds} bounds
     * @param {vector} position
     */
    Bounds.shift = function(bounds, position) {
        var deltaX = bounds.max.x - bounds.min.x,
            deltaY = bounds.max.y - bounds.min.y;
            
        bounds.min.x = position.x;
        bounds.max.x = position.x + deltaX;
        bounds.min.y = position.y;
        bounds.max.y = position.y + deltaY;
    };
    
})();

},{}],34:[function(require,module,exports){
/**
* The `Matter.Svg` module contains methods for converting SVG images into an array of vector points.
*
* To use this module you also need the SVGPathSeg polyfill: https://github.com/progers/pathseg
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Svg
*/

var Svg = {};

module.exports = Svg;

var Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Converts an SVG path into an array of vector points.
     * If the input path forms a concave shape, you must decompose the result into convex parts before use.
     * See `Bodies.fromVertices` which provides support for this.
     * Note that this function is not guaranteed to support complex paths (such as those with holes).
     * @method pathToVertices
     * @param {SVGPathElement} path
     * @param {Number} [sampleLength=15]
     * @return {Vector[]} points
     */
    Svg.pathToVertices = function(path, sampleLength) {
        // https://github.com/wout/svg.topoly.js/blob/master/svg.topoly.js
        var i, il, total, point, segment, segments, 
            segmentsQueue, lastSegment, 
            lastPoint, segmentIndex, points = [],
            lx, ly, length = 0, x = 0, y = 0;

        sampleLength = sampleLength || 15;

        var addPoint = function(px, py, pathSegType) {
            // all odd-numbered path types are relative except PATHSEG_CLOSEPATH (1)
            var isRelative = pathSegType % 2 === 1 && pathSegType > 1;

            // when the last point doesn't equal the current point add the current point
            if (!lastPoint || px != lastPoint.x || py != lastPoint.y) {
                if (lastPoint && isRelative) {
                    lx = lastPoint.x;
                    ly = lastPoint.y;
                } else {
                    lx = 0;
                    ly = 0;
                }

                var point = {
                    x: lx + px,
                    y: ly + py
                };

                // set last point
                if (isRelative || !lastPoint) {
                    lastPoint = point;
                }

                points.push(point);

                x = lx + px;
                y = ly + py;
            }
        };

        var addSegmentPoint = function(segment) {
            var segType = segment.pathSegTypeAsLetter.toUpperCase();

            // skip path ends
            if (segType === 'Z') 
                return;

            // map segment to x and y
            switch (segType) {

            case 'M':
            case 'L':
            case 'T':
            case 'C':
            case 'S':
            case 'Q':
                x = segment.x;
                y = segment.y;
                break;
            case 'H':
                x = segment.x;
                break;
            case 'V':
                y = segment.y;
                break;
            }

            addPoint(x, y, segment.pathSegType);
        };

        // ensure path is absolute
        _svgPathToAbsolute(path);

        // get total length
        total = path.getTotalLength();

        // queue segments
        segments = [];
        for (i = 0; i < path.pathSegList.numberOfItems; i += 1)
            segments.push(path.pathSegList.getItem(i));

        segmentsQueue = segments.concat();

        // sample through path
        while (length < total) {
            // get segment at position
            segmentIndex = path.getPathSegAtLength(length);
            segment = segments[segmentIndex];

            // new segment
            if (segment != lastSegment) {
                while (segmentsQueue.length && segmentsQueue[0] != segment)
                    addSegmentPoint(segmentsQueue.shift());

                lastSegment = segment;
            }

            // add points in between when curving
            // TODO: adaptive sampling
            switch (segment.pathSegTypeAsLetter.toUpperCase()) {

            case 'C':
            case 'T':
            case 'S':
            case 'Q':
            case 'A':
                point = path.getPointAtLength(length);
                addPoint(point.x, point.y, 0);
                break;

            }

            // increment by sample value
            length += sampleLength;
        }

        // add remaining segments not passed by sampling
        for (i = 0, il = segmentsQueue.length; i < il; ++i)
            addSegmentPoint(segmentsQueue[i]);

        return points;
    };

    var _svgPathToAbsolute = function(path) {
        // http://phrogz.net/convert-svg-path-to-all-absolute-commands
        var x0, y0, x1, y1, x2, y2, segs = path.pathSegList,
            x = 0, y = 0, len = segs.numberOfItems;

        for (var i = 0; i < len; ++i) {
            var seg = segs.getItem(i),
                segType = seg.pathSegTypeAsLetter;

            if (/[MLHVCSQTA]/.test(segType)) {
                if ('x' in seg) x = seg.x;
                if ('y' in seg) y = seg.y;
            } else {
                if ('x1' in seg) x1 = x + seg.x1;
                if ('x2' in seg) x2 = x + seg.x2;
                if ('y1' in seg) y1 = y + seg.y1;
                if ('y2' in seg) y2 = y + seg.y2;
                if ('x' in seg) x += seg.x;
                if ('y' in seg) y += seg.y;

                switch (segType) {

                case 'm':
                    segs.replaceItem(path.createSVGPathSegMovetoAbs(x, y), i);
                    break;
                case 'l':
                    segs.replaceItem(path.createSVGPathSegLinetoAbs(x, y), i);
                    break;
                case 'h':
                    segs.replaceItem(path.createSVGPathSegLinetoHorizontalAbs(x), i);
                    break;
                case 'v':
                    segs.replaceItem(path.createSVGPathSegLinetoVerticalAbs(y), i);
                    break;
                case 'c':
                    segs.replaceItem(path.createSVGPathSegCurvetoCubicAbs(x, y, x1, y1, x2, y2), i);
                    break;
                case 's':
                    segs.replaceItem(path.createSVGPathSegCurvetoCubicSmoothAbs(x, y, x2, y2), i);
                    break;
                case 'q':
                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticAbs(x, y, x1, y1), i);
                    break;
                case 't':
                    segs.replaceItem(path.createSVGPathSegCurvetoQuadraticSmoothAbs(x, y), i);
                    break;
                case 'a':
                    segs.replaceItem(path.createSVGPathSegArcAbs(x, y, seg.r1, seg.r2, seg.angle, seg.largeArcFlag, seg.sweepFlag), i);
                    break;
                case 'z':
                case 'Z':
                    x = x0;
                    y = y0;
                    break;

                }
            }

            if (segType == 'M' || segType == 'm') {
                x0 = x;
                y0 = y;
            }
        }
    };

})();
},{"../geometry/Bounds":33}],35:[function(require,module,exports){
/**
* The `Matter.Vector` module contains methods for creating and manipulating vectors.
* Vectors are the basis of all the geometry related operations in the engine.
* A `Matter.Vector` object is of the form `{ x: 0, y: 0 }`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vector
*/

// TODO: consider params for reusing vector objects

var Vector = {};

module.exports = Vector;

(function() {

    /**
     * Creates a new vector.
     * @method create
     * @param {number} x
     * @param {number} y
     * @return {vector} A new vector
     */
    Vector.create = function(x, y) {
        return { x: x || 0, y: y || 0 };
    };

    /**
     * Returns a new vector with `x` and `y` copied from the given `vector`.
     * @method clone
     * @param {vector} vector
     * @return {vector} A new cloned vector
     */
    Vector.clone = function(vector) {
        return { x: vector.x, y: vector.y };
    };

    /**
     * Returns the magnitude (length) of a vector.
     * @method magnitude
     * @param {vector} vector
     * @return {number} The magnitude of the vector
     */
    Vector.magnitude = function(vector) {
        return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
    };

    /**
     * Returns the magnitude (length) of a vector (therefore saving a `sqrt` operation).
     * @method magnitudeSquared
     * @param {vector} vector
     * @return {number} The squared magnitude of the vector
     */
    Vector.magnitudeSquared = function(vector) {
        return (vector.x * vector.x) + (vector.y * vector.y);
    };

    /**
     * Rotates the vector about (0, 0) by specified angle.
     * @method rotate
     * @param {vector} vector
     * @param {number} angle
     * @return {vector} A new vector rotated about (0, 0)
     */
    Vector.rotate = function(vector, angle) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        return {
            x: vector.x * cos - vector.y * sin,
            y: vector.x * sin + vector.y * cos
        };
    };

    /**
     * Rotates the vector about a specified point by specified angle.
     * @method rotateAbout
     * @param {vector} vector
     * @param {number} angle
     * @param {vector} point
     * @param {vector} [output]
     * @return {vector} A new vector rotated about the point
     */
    Vector.rotateAbout = function(vector, angle, point, output) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        if (!output) output = {};
        var x = point.x + ((vector.x - point.x) * cos - (vector.y - point.y) * sin);
        output.y = point.y + ((vector.x - point.x) * sin + (vector.y - point.y) * cos);
        output.x = x;
        return output;
    };

    /**
     * Normalises a vector (such that its magnitude is `1`).
     * @method normalise
     * @param {vector} vector
     * @return {vector} A new vector normalised
     */
    Vector.normalise = function(vector) {
        var magnitude = Vector.magnitude(vector);
        if (magnitude === 0)
            return { x: 0, y: 0 };
        return { x: vector.x / magnitude, y: vector.y / magnitude };
    };

    /**
     * Returns the dot-product of two vectors.
     * @method dot
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The dot product of the two vectors
     */
    Vector.dot = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.x) + (vectorA.y * vectorB.y);
    };

    /**
     * Returns the cross-product of two vectors.
     * @method cross
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The cross product of the two vectors
     */
    Vector.cross = function(vectorA, vectorB) {
        return (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
    };

    /**
     * Returns the cross-product of three vectors.
     * @method cross3
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} vectorC
     * @return {number} The cross product of the three vectors
     */
    Vector.cross3 = function(vectorA, vectorB, vectorC) {
        return (vectorB.x - vectorA.x) * (vectorC.y - vectorA.y) - (vectorB.y - vectorA.y) * (vectorC.x - vectorA.x);
    };

    /**
     * Adds the two vectors.
     * @method add
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB added
     */
    Vector.add = function(vectorA, vectorB, output) {
        if (!output) output = {};
        output.x = vectorA.x + vectorB.x;
        output.y = vectorA.y + vectorB.y;
        return output;
    };

    /**
     * Subtracts the two vectors.
     * @method sub
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB subtracted
     */
    Vector.sub = function(vectorA, vectorB, output) {
        if (!output) output = {};
        output.x = vectorA.x - vectorB.x;
        output.y = vectorA.y - vectorB.y;
        return output;
    };

    /**
     * Multiplies a vector and a scalar.
     * @method mult
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector multiplied by scalar
     */
    Vector.mult = function(vector, scalar) {
        return { x: vector.x * scalar, y: vector.y * scalar };
    };

    /**
     * Divides a vector and a scalar.
     * @method div
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector divided by scalar
     */
    Vector.div = function(vector, scalar) {
        return { x: vector.x / scalar, y: vector.y / scalar };
    };

    /**
     * Returns the perpendicular vector. Set `negate` to true for the perpendicular in the opposite direction.
     * @method perp
     * @param {vector} vector
     * @param {bool} [negate=false]
     * @return {vector} The perpendicular vector
     */
    Vector.perp = function(vector, negate) {
        negate = negate === true ? -1 : 1;
        return { x: negate * -vector.y, y: negate * vector.x };
    };

    /**
     * Negates both components of a vector such that it points in the opposite direction.
     * @method neg
     * @param {vector} vector
     * @return {vector} The negated vector
     */
    Vector.neg = function(vector) {
        return { x: -vector.x, y: -vector.y };
    };

    /**
     * Returns the angle in radians between the two vectors relative to the x-axis.
     * @method angle
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The angle in radians
     */
    Vector.angle = function(vectorA, vectorB) {
        return Math.atan2(vectorB.y - vectorA.y, vectorB.x - vectorA.x);
    };

    /**
     * Temporary vector pool (not thread-safe).
     * @property _temp
     * @type {vector[]}
     * @private
     */
    Vector._temp = [Vector.create(), Vector.create(), 
                    Vector.create(), Vector.create(), 
                    Vector.create(), Vector.create()];

})();
},{}],36:[function(require,module,exports){
/**
* The `Matter.Vertices` module contains methods for creating and manipulating sets of vertices.
* A set of vertices is an array of `Matter.Vector` with additional indexing properties inserted by `Vertices.create`.
* A `Matter.Body` maintains a set of vertices to represent the shape of the object (its convex hull).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vertices
*/

var Vertices = {};

module.exports = Vertices;

var Vector = require('../geometry/Vector');
var Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of `Matter.Body` compatible vertices.
     * The `points` argument accepts an array of `Matter.Vector` points orientated around the origin `(0, 0)`, for example:
     *
     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
     *
     * The `Vertices.create` method returns a new array of vertices, which are similar to Matter.Vector objects,
     * but with some additional references required for efficient collision detection routines.
     *
     * Note that the `body` argument is not optional, a `Matter.Body` reference must be provided.
     *
     * @method create
     * @param {vector[]} points
     * @param {body} body
     */
    Vertices.create = function(points, body) {
        var vertices = [];

        for (var i = 0; i < points.length; i++) {
            var point = points[i],
                vertex = {
                    x: point.x,
                    y: point.y,
                    index: i,
                    body: body,
                    isInternal: false
                };

            vertices.push(vertex);
        }

        return vertices;
    };

    /**
     * Parses a string containing ordered x y pairs separated by spaces (and optionally commas), 
     * into a `Matter.Vertices` object for the given `Matter.Body`.
     * For parsing SVG paths, see `Svg.pathToVertices`.
     * @method fromPath
     * @param {string} path
     * @param {body} body
     * @return {vertices} vertices
     */
    Vertices.fromPath = function(path, body) {
        var pathPattern = /L?\s*([\-\d\.e]+)[\s,]*([\-\d\.e]+)*/ig,
            points = [];

        path.replace(pathPattern, function(match, x, y) {
            points.push({ x: parseFloat(x), y: parseFloat(y) });
        });

        return Vertices.create(points, body);
    };

    /**
     * Returns the centre (centroid) of the set of vertices.
     * @method centre
     * @param {vertices} vertices
     * @return {vector} The centre point
     */
    Vertices.centre = function(vertices) {
        var area = Vertices.area(vertices, true),
            centre = { x: 0, y: 0 },
            cross,
            temp,
            j;

        for (var i = 0; i < vertices.length; i++) {
            j = (i + 1) % vertices.length;
            cross = Vector.cross(vertices[i], vertices[j]);
            temp = Vector.mult(Vector.add(vertices[i], vertices[j]), cross);
            centre = Vector.add(centre, temp);
        }

        return Vector.div(centre, 6 * area);
    };

    /**
     * Returns the average (mean) of the set of vertices.
     * @method mean
     * @param {vertices} vertices
     * @return {vector} The average point
     */
    Vertices.mean = function(vertices) {
        var average = { x: 0, y: 0 };

        for (var i = 0; i < vertices.length; i++) {
            average.x += vertices[i].x;
            average.y += vertices[i].y;
        }

        return Vector.div(average, vertices.length);
    };

    /**
     * Returns the area of the set of vertices.
     * @method area
     * @param {vertices} vertices
     * @param {bool} signed
     * @return {number} The area
     */
    Vertices.area = function(vertices, signed) {
        var area = 0,
            j = vertices.length - 1;

        for (var i = 0; i < vertices.length; i++) {
            area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
            j = i;
        }

        if (signed)
            return area / 2;

        return Math.abs(area) / 2;
    };

    /**
     * Returns the moment of inertia (second moment of area) of the set of vertices given the total mass.
     * @method inertia
     * @param {vertices} vertices
     * @param {number} mass
     * @return {number} The polygon's moment of inertia
     */
    Vertices.inertia = function(vertices, mass) {
        var numerator = 0,
            denominator = 0,
            v = vertices,
            cross,
            j;

        // find the polygon's moment of inertia, using second moment of area
        // http://www.physicsforums.com/showthread.php?t=25293
        for (var n = 0; n < v.length; n++) {
            j = (n + 1) % v.length;
            cross = Math.abs(Vector.cross(v[j], v[n]));
            numerator += cross * (Vector.dot(v[j], v[j]) + Vector.dot(v[j], v[n]) + Vector.dot(v[n], v[n]));
            denominator += cross;
        }

        return (mass / 6) * (numerator / denominator);
    };

    /**
     * Translates the set of vertices in-place.
     * @method translate
     * @param {vertices} vertices
     * @param {vector} vector
     * @param {number} scalar
     */
    Vertices.translate = function(vertices, vector, scalar) {
        var i;
        if (scalar) {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x * scalar;
                vertices[i].y += vector.y * scalar;
            }
        } else {
            for (i = 0; i < vertices.length; i++) {
                vertices[i].x += vector.x;
                vertices[i].y += vector.y;
            }
        }

        return vertices;
    };

    /**
     * Rotates the set of vertices in-place.
     * @method rotate
     * @param {vertices} vertices
     * @param {number} angle
     * @param {vector} point
     */
    Vertices.rotate = function(vertices, angle, point) {
        if (angle === 0)
            return;

        var cos = Math.cos(angle),
            sin = Math.sin(angle);

        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                dx = vertice.x - point.x,
                dy = vertice.y - point.y;
                
            vertice.x = point.x + (dx * cos - dy * sin);
            vertice.y = point.y + (dx * sin + dy * cos);
        }

        return vertices;
    };

    /**
     * Returns `true` if the `point` is inside the set of `vertices`.
     * @method contains
     * @param {vertices} vertices
     * @param {vector} point
     * @return {boolean} True if the vertices contains point, otherwise false
     */
    Vertices.contains = function(vertices, point) {
        for (var i = 0; i < vertices.length; i++) {
            var vertice = vertices[i],
                nextVertice = vertices[(i + 1) % vertices.length];
            if ((point.x - vertice.x) * (nextVertice.y - vertice.y) + (point.y - vertice.y) * (vertice.x - nextVertice.x) > 0) {
                return false;
            }
        }

        return true;
    };

    /**
     * Scales the vertices from a point (default is centre) in-place.
     * @method scale
     * @param {vertices} vertices
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     */
    Vertices.scale = function(vertices, scaleX, scaleY, point) {
        if (scaleX === 1 && scaleY === 1)
            return vertices;

        point = point || Vertices.centre(vertices);

        var vertex,
            delta;

        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            delta = Vector.sub(vertex, point);
            vertices[i].x = point.x + delta.x * scaleX;
            vertices[i].y = point.y + delta.y * scaleY;
        }

        return vertices;
    };

    /**
     * Chamfers a set of vertices by giving them rounded corners, returns a new set of vertices.
     * The radius parameter is a single number or an array to specify the radius for each vertex.
     * @method chamfer
     * @param {vertices} vertices
     * @param {number[]} radius
     * @param {number} quality
     * @param {number} qualityMin
     * @param {number} qualityMax
     */
    Vertices.chamfer = function(vertices, radius, quality, qualityMin, qualityMax) {
        radius = radius || [8];

        if (!radius.length)
            radius = [radius];

        // quality defaults to -1, which is auto
        quality = (typeof quality !== 'undefined') ? quality : -1;
        qualityMin = qualityMin || 2;
        qualityMax = qualityMax || 14;

        var newVertices = [];

        for (var i = 0; i < vertices.length; i++) {
            var prevVertex = vertices[i - 1 >= 0 ? i - 1 : vertices.length - 1],
                vertex = vertices[i],
                nextVertex = vertices[(i + 1) % vertices.length],
                currentRadius = radius[i < radius.length ? i : radius.length - 1];

            if (currentRadius === 0) {
                newVertices.push(vertex);
                continue;
            }

            var prevNormal = Vector.normalise({ 
                x: vertex.y - prevVertex.y, 
                y: prevVertex.x - vertex.x
            });

            var nextNormal = Vector.normalise({ 
                x: nextVertex.y - vertex.y, 
                y: vertex.x - nextVertex.x
            });

            var diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2)),
                radiusVector = Vector.mult(Common.clone(prevNormal), currentRadius),
                midNormal = Vector.normalise(Vector.mult(Vector.add(prevNormal, nextNormal), 0.5)),
                scaledVertex = Vector.sub(vertex, Vector.mult(midNormal, diagonalRadius));

            var precision = quality;

            if (quality === -1) {
                // automatically decide precision
                precision = Math.pow(currentRadius, 0.32) * 1.75;
            }

            precision = Common.clamp(precision, qualityMin, qualityMax);

            // use an even value for precision, more likely to reduce axes by using symmetry
            if (precision % 2 === 1)
                precision += 1;

            var alpha = Math.acos(Vector.dot(prevNormal, nextNormal)),
                theta = alpha / precision;

            for (var j = 0; j < precision; j++) {
                newVertices.push(Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex));
            }
        }

        return newVertices;
    };

    /**
     * Sorts the input vertices into clockwise order in place.
     * @method clockwiseSort
     * @param {vertices} vertices
     * @return {vertices} vertices
     */
    Vertices.clockwiseSort = function(vertices) {
        var centre = Vertices.mean(vertices);

        vertices.sort(function(vertexA, vertexB) {
            return Vector.angle(centre, vertexA) - Vector.angle(centre, vertexB);
        });

        return vertices;
    };

    /**
     * Returns true if the vertices form a convex shape (vertices must be in clockwise order).
     * @method isConvex
     * @param {vertices} vertices
     * @return {bool} `true` if the `vertices` are convex, `false` if not (or `null` if not computable).
     */
    Vertices.isConvex = function(vertices) {
        // http://paulbourke.net/geometry/polygonmesh/

        var flag = 0,
            n = vertices.length,
            i,
            j,
            k,
            z;

        if (n < 3)
            return null;

        for (i = 0; i < n; i++) {
            j = (i + 1) % n;
            k = (i + 2) % n;
            z = (vertices[j].x - vertices[i].x) * (vertices[k].y - vertices[j].y);
            z -= (vertices[j].y - vertices[i].y) * (vertices[k].x - vertices[j].x);

            if (z < 0) {
                flag |= 1;
            } else if (z > 0) {
                flag |= 2;
            }

            if (flag === 3) {
                return false;
            }
        }

        if (flag !== 0){
            return true;
        } else {
            return null;
        }
    };

    /**
     * Returns the convex hull of the input vertices as a new array of points.
     * @method hull
     * @param {vertices} vertices
     * @return [vertex] vertices
     */
    Vertices.hull = function(vertices) {
        // http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain

        var upper = [],
            lower = [], 
            vertex,
            i;

        // sort vertices on x-axis (y-axis for ties)
        vertices = vertices.slice(0);
        vertices.sort(function(vertexA, vertexB) {
            var dx = vertexA.x - vertexB.x;
            return dx !== 0 ? dx : vertexA.y - vertexB.y;
        });

        // build lower hull
        for (i = 0; i < vertices.length; i++) {
            vertex = vertices[i];

            while (lower.length >= 2 
                   && Vector.cross3(lower[lower.length - 2], lower[lower.length - 1], vertex) <= 0) {
                lower.pop();
            }

            lower.push(vertex);
        }

        // build upper hull
        for (i = vertices.length - 1; i >= 0; i--) {
            vertex = vertices[i];

            while (upper.length >= 2 
                   && Vector.cross3(upper[upper.length - 2], upper[upper.length - 1], vertex) <= 0) {
                upper.pop();
            }

            upper.push(vertex);
        }

        // concatenation of the lower and upper hulls gives the convex hull
        // omit last points because they are repeated at the beginning of the other list
        upper.pop();
        lower.pop();

        return upper.concat(lower);
    };

})();

},{"../core/Common":23,"../geometry/Vector":35}],37:[function(require,module,exports){
var Matter = module.exports = {};
Matter.version = 'master';

Matter.Body = require('../body/Body');
Matter.Composite = require('../body/Composite');
Matter.World = require('../body/World');

Matter.Contact = require('../collision/Contact');
Matter.Detector = require('../collision/Detector');
Matter.Grid = require('../collision/Grid');
Matter.Pairs = require('../collision/Pairs');
Matter.Pair = require('../collision/Pair');
Matter.Query = require('../collision/Query');
Matter.Resolver = require('../collision/Resolver');
Matter.SAT = require('../collision/SAT');

Matter.Constraint = require('../constraint/Constraint');
Matter.MouseConstraint = require('../constraint/MouseConstraint');

Matter.Common = require('../core/Common');
Matter.Engine = require('../core/Engine');
Matter.Events = require('../core/Events');
Matter.Mouse = require('../core/Mouse');
Matter.Runner = require('../core/Runner');
Matter.Sleeping = require('../core/Sleeping');

// @if DEBUG
Matter.Metrics = require('../core/Metrics');
// @endif

Matter.Bodies = require('../factory/Bodies');
Matter.Composites = require('../factory/Composites');

Matter.Axes = require('../geometry/Axes');
Matter.Bounds = require('../geometry/Bounds');
Matter.Svg = require('../geometry/Svg');
Matter.Vector = require('../geometry/Vector');
Matter.Vertices = require('../geometry/Vertices');

Matter.Render = require('../render/Render');
Matter.RenderPixi = require('../render/RenderPixi');

// aliases

Matter.World.add = Matter.Composite.add;
Matter.World.remove = Matter.Composite.remove;
Matter.World.addComposite = Matter.Composite.addComposite;
Matter.World.addBody = Matter.Composite.addBody;
Matter.World.addConstraint = Matter.Composite.addConstraint;
Matter.World.clear = Matter.Composite.clear;
Matter.Engine.run = Matter.Runner.run;

},{"../body/Body":10,"../body/Composite":11,"../body/World":12,"../collision/Contact":13,"../collision/Detector":14,"../collision/Grid":15,"../collision/Pair":16,"../collision/Pairs":17,"../collision/Query":18,"../collision/Resolver":19,"../collision/SAT":20,"../constraint/Constraint":21,"../constraint/MouseConstraint":22,"../core/Common":23,"../core/Engine":24,"../core/Events":25,"../core/Metrics":26,"../core/Mouse":27,"../core/Runner":28,"../core/Sleeping":29,"../factory/Bodies":30,"../factory/Composites":31,"../geometry/Axes":32,"../geometry/Bounds":33,"../geometry/Svg":34,"../geometry/Vector":35,"../geometry/Vertices":36,"../render/Render":38,"../render/RenderPixi":39}],38:[function(require,module,exports){
/**
* The `Matter.Render` module is a simple HTML5 canvas based renderer for visualising instances of `Matter.Engine`.
* It is intended for development and debugging purposes, but may also be suitable for simple games.
* It includes a number of drawing options including wireframe, vector with support for sprites and viewports.
*
* @class Render
*/

var Render = {};

module.exports = Render;

var Common = require('../core/Common');
var Composite = require('../body/Composite');
var Bounds = require('../geometry/Bounds');
var Events = require('../core/Events');
var Grid = require('../collision/Grid');
var Vector = require('../geometry/Vector');

(function() {
    
    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }

    /**
     * Creates a new renderer. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {object} [options]
     * @return {render} A new renderer
     */
    Render.create = function(options) {
        var defaults = {
            controller: Render,
            engine: null,
            element: null,
            canvas: null,
            mouse: null,
            frameRequestId: null,
            options: {
                width: 800,
                height: 600,
                pixelRatio: 1,
                background: '#fafafa',
                wireframeBackground: '#222',
                hasBounds: !!options.bounds,
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showSeparations: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false,
                showVertexNumbers: false,
                showConvexHulls: false,
                showInternalEdges: false,
                showMousePosition: false
            }
        };

        var render = Common.extend(defaults, options);

        if (render.canvas) {
            render.canvas.width = render.options.width || render.canvas.width;
            render.canvas.height = render.options.height || render.canvas.height;
        }

        render.mouse = options.mouse;
        render.engine = options.engine;
        render.canvas = render.canvas || _createCanvas(render.options.width, render.options.height);
        render.context = render.canvas.getContext('2d');
        render.textures = {};

        render.bounds = render.bounds || { 
            min: { 
                x: 0,
                y: 0
            }, 
            max: { 
                x: render.canvas.width,
                y: render.canvas.height
            }
        };

        if (render.options.pixelRatio !== 1) {
            Render.setPixelRatio(render, render.options.pixelRatio);
        }

        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('Render.create: options.element was undefined, render.canvas was created but not appended', 'warn');
        }

        return render;
    };

    /**
     * Continuously updates the render canvas on the `requestAnimationFrame` event.
     * @method run
     * @param {render} render
     */
    Render.run = function(render) {
        (function loop(time){
            render.frameRequestId = _requestAnimationFrame(loop);
            Render.world(render);
        })();
    };

    /**
     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
     * @method stop
     * @param {render} render
     */
    Render.stop = function(render) {
        _cancelAnimationFrame(render.frameRequestId);
    };

    /**
     * Sets the pixel ratio of the renderer and updates the canvas.
     * To automatically detect the correct ratio, pass the string `'auto'` for `pixelRatio`.
     * @method setPixelRatio
     * @param {render} render
     * @param {number} pixelRatio
     */
    Render.setPixelRatio = function(render, pixelRatio) {
        var options = render.options,
            canvas = render.canvas;

        if (pixelRatio === 'auto') {
            pixelRatio = _getPixelRatio(canvas);
        }

        options.pixelRatio = pixelRatio;
        canvas.setAttribute('data-pixel-ratio', pixelRatio);
        canvas.width = options.width * pixelRatio;
        canvas.height = options.height * pixelRatio;
        canvas.style.width = options.width + 'px';
        canvas.style.height = options.height + 'px';
        render.context.scale(pixelRatio, pixelRatio);
    };

    /**
     * Renders the given `engine`'s `Matter.World` object.
     * This is the entry point for all rendering and should be called every time the scene changes.
     * @method world
     * @param {render} render
     */
    Render.world = function(render) {
        var engine = render.engine,
            world = engine.world,
            canvas = render.canvas,
            context = render.context,
            options = render.options,
            allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world),
            background = options.wireframes ? options.wireframeBackground : options.background,
            bodies = [],
            constraints = [],
            i;

        var event = {
            timestamp: engine.timing.timestamp
        };

        Events.trigger(render, 'beforeRender', event);

        // apply background if it has changed
        if (render.currentBackground !== background)
            _applyBackground(render, background);

        // clear the canvas with a transparent fill, to allow the canvas background to show
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = "transparent";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';

        // handle bounds
        if (options.hasBounds) {
            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
                boundsHeight = render.bounds.max.y - render.bounds.min.y,
                boundsScaleX = boundsWidth / options.width,
                boundsScaleY = boundsHeight / options.height;

            // filter out bodies that are not in view
            for (i = 0; i < allBodies.length; i++) {
                var body = allBodies[i];
                if (Bounds.overlaps(body.bounds, render.bounds))
                    bodies.push(body);
            }

            // filter out constraints that are not in view
            for (i = 0; i < allConstraints.length; i++) {
                var constraint = allConstraints[i],
                    bodyA = constraint.bodyA,
                    bodyB = constraint.bodyB,
                    pointAWorld = constraint.pointA,
                    pointBWorld = constraint.pointB;

                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

                if (!pointAWorld || !pointBWorld)
                    continue;

                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
                    constraints.push(constraint);
            }

            // transform the view
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        } else {
            constraints = allConstraints;
            bodies = allBodies;
        }

        if (!options.wireframes || (engine.enableSleeping && options.showSleeping)) {
            // fully featured rendering of bodies
            Render.bodies(render, bodies, context);
        } else {
            if (options.showConvexHulls)
                Render.bodyConvexHulls(render, bodies, context);

            // optimised method for wireframes only
            Render.bodyWireframes(render, bodies, context);
        }

        if (options.showBounds)
            Render.bodyBounds(render, bodies, context);

        if (options.showAxes || options.showAngleIndicator)
            Render.bodyAxes(render, bodies, context);
        
        if (options.showPositions)
            Render.bodyPositions(render, bodies, context);

        if (options.showVelocity)
            Render.bodyVelocity(render, bodies, context);

        if (options.showIds)
            Render.bodyIds(render, bodies, context);

        if (options.showSeparations)
            Render.separations(render, engine.pairs.list, context);

        if (options.showCollisions)
            Render.collisions(render, engine.pairs.list, context);

        if (options.showVertexNumbers)
            Render.vertexNumbers(render, bodies, context);

        if (options.showMousePosition)
            Render.mousePosition(render, render.mouse, context);

        Render.constraints(constraints, context);

        if (options.showBroadphase && engine.broadphase.controller === Grid)
            Render.grid(render, engine.broadphase, context);

        if (options.showDebug)
            Render.debug(render, context);

        if (options.hasBounds) {
            // revert view transforms
            context.setTransform(options.pixelRatio, 0, 0, options.pixelRatio, 0, 0);
        }

        Events.trigger(render, 'afterRender', event);
    };

    /**
     * Description
     * @private
     * @method debug
     * @param {render} render
     * @param {RenderingContext} context
     */
    Render.debug = function(render, context) {
        var c = context,
            engine = render.engine,
            world = engine.world,
            metrics = engine.metrics,
            options = render.options,
            bodies = Composite.allBodies(world),
            space = "    ";

        if (engine.timing.timestamp - (render.debugTimestamp || 0) >= 500) {
            var text = "";

            if (metrics.timing) {
                text += "fps: " + Math.round(metrics.timing.fps) + space;
            }

            // @if DEBUG
            if (metrics.extended) {
                if (metrics.timing) {
                    text += "delta: " + metrics.timing.delta.toFixed(3) + space;
                    text += "correction: " + metrics.timing.correction.toFixed(3) + space;
                }

                text += "bodies: " + bodies.length + space;

                if (engine.broadphase.controller === Grid)
                    text += "buckets: " + metrics.buckets + space;

                text += "\n";

                text += "collisions: " + metrics.collisions + space;
                text += "pairs: " + engine.pairs.list.length + space;
                text += "broad: " + metrics.broadEff + space;
                text += "mid: " + metrics.midEff + space;
                text += "narrow: " + metrics.narrowEff + space;
            }
            // @endif            

            render.debugString = text;
            render.debugTimestamp = engine.timing.timestamp;
        }

        if (render.debugString) {
            c.font = "12px Arial";

            if (options.wireframes) {
                c.fillStyle = 'rgba(255,255,255,0.5)';
            } else {
                c.fillStyle = 'rgba(0,0,0,0.5)';
            }

            var split = render.debugString.split('\n');

            for (var i = 0; i < split.length; i++) {
                c.fillText(split[i], 50, 50 + i * 18);
            }
        }
    };

    /**
     * Description
     * @private
     * @method constraints
     * @param {constraint[]} constraints
     * @param {RenderingContext} context
     */
    Render.constraints = function(constraints, context) {
        var c = context;

        for (var i = 0; i < constraints.length; i++) {
            var constraint = constraints[i];

            if (!constraint.render.visible || !constraint.pointA || !constraint.pointB)
                continue;

            var bodyA = constraint.bodyA,
                bodyB = constraint.bodyB;

            if (bodyA) {
                c.beginPath();
                c.moveTo(bodyA.position.x + constraint.pointA.x, bodyA.position.y + constraint.pointA.y);
            } else {
                c.beginPath();
                c.moveTo(constraint.pointA.x, constraint.pointA.y);
            }

            if (bodyB) {
                c.lineTo(bodyB.position.x + constraint.pointB.x, bodyB.position.y + constraint.pointB.y);
            } else {
                c.lineTo(constraint.pointB.x, constraint.pointB.y);
            }

            c.lineWidth = constraint.render.lineWidth;
            c.strokeStyle = constraint.render.strokeStyle;
            c.stroke();
        }
    };
    
    /**
     * Description
     * @private
     * @method bodyShadows
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyShadows = function(render, bodies, context) {
        var c = context,
            engine = render.engine;

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            if (body.circleRadius) {
                c.beginPath();
                c.arc(body.position.x, body.position.y, body.circleRadius, 0, 2 * Math.PI);
                c.closePath();
            } else {
                c.beginPath();
                c.moveTo(body.vertices[0].x, body.vertices[0].y);
                for (var j = 1; j < body.vertices.length; j++) {
                    c.lineTo(body.vertices[j].x, body.vertices[j].y);
                }
                c.closePath();
            }

            var distanceX = body.position.x - render.options.width * 0.5,
                distanceY = body.position.y - render.options.height * 0.2,
                distance = Math.abs(distanceX) + Math.abs(distanceY);

            c.shadowColor = 'rgba(0,0,0,0.15)';
            c.shadowOffsetX = 0.05 * distanceX;
            c.shadowOffsetY = 0.05 * distanceY;
            c.shadowBlur = 1 + 12 * Math.min(1, distance / 1000);

            c.fill();

            c.shadowColor = null;
            c.shadowOffsetX = null;
            c.shadowOffsetY = null;
            c.shadowBlur = null;
        }
    };

    /**
     * Description
     * @private
     * @method bodies
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodies = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            showInternalEdges = options.showInternalEdges || !options.wireframes,
            body,
            part,
            i,
            k;

        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                if (!part.render.visible)
                    continue;

                if (options.showSleeping && body.isSleeping) {
                    c.globalAlpha = 0.5 * part.render.opacity;
                } else if (part.render.opacity !== 1) {
                    c.globalAlpha = part.render.opacity;
                }

                if (part.render.sprite && part.render.sprite.texture && !options.wireframes) {
                    // part sprite
                    var sprite = part.render.sprite,
                        texture = _getTexture(render, sprite.texture);

                    c.translate(part.position.x, part.position.y); 
                    c.rotate(part.angle);

                    c.drawImage(
                        texture,
                        texture.width * -sprite.xOffset * sprite.xScale, 
                        texture.height * -sprite.yOffset * sprite.yScale, 
                        texture.width * sprite.xScale, 
                        texture.height * sprite.yScale
                    );

                    // revert translation, hopefully faster than save / restore
                    c.rotate(-part.angle);
                    c.translate(-part.position.x, -part.position.y); 
                } else {
                    // part polygon
                    if (part.circleRadius) {
                        c.beginPath();
                        c.arc(part.position.x, part.position.y, part.circleRadius, 0, 2 * Math.PI);
                    } else {
                        c.beginPath();
                        c.moveTo(part.vertices[0].x, part.vertices[0].y);

                        for (var j = 1; j < part.vertices.length; j++) {
                            if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                                c.lineTo(part.vertices[j].x, part.vertices[j].y);
                            } else {
                                c.moveTo(part.vertices[j].x, part.vertices[j].y);
                            }

                            if (part.vertices[j].isInternal && !showInternalEdges) {
                                c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
                            }
                        }
                        
                        c.lineTo(part.vertices[0].x, part.vertices[0].y);
                        c.closePath();
                    }

                    if (!options.wireframes) {
                        c.fillStyle = part.render.fillStyle;
                        c.lineWidth = part.render.lineWidth;
                        c.strokeStyle = part.render.strokeStyle;
                        c.fill();
                    } else {
                        c.lineWidth = 1;
                        c.strokeStyle = '#bbb';
                    }

                    c.stroke();
                }

                c.globalAlpha = 1;
            }
        }
    };

    /**
     * Optimised method for drawing body wireframes in one pass
     * @private
     * @method bodyWireframes
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyWireframes = function(render, bodies, context) {
        var c = context,
            showInternalEdges = render.options.showInternalEdges,
            body,
            part,
            i,
            j,
            k;

        c.beginPath();

        // render all bodies
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
                part = body.parts[k];

                c.moveTo(part.vertices[0].x, part.vertices[0].y);

                for (j = 1; j < part.vertices.length; j++) {
                    if (!part.vertices[j - 1].isInternal || showInternalEdges) {
                        c.lineTo(part.vertices[j].x, part.vertices[j].y);
                    } else {
                        c.moveTo(part.vertices[j].x, part.vertices[j].y);
                    }

                    if (part.vertices[j].isInternal && !showInternalEdges) {
                        c.moveTo(part.vertices[(j + 1) % part.vertices.length].x, part.vertices[(j + 1) % part.vertices.length].y);
                    }
                }
                
                c.lineTo(part.vertices[0].x, part.vertices[0].y);
            }
        }

        c.lineWidth = 1;
        c.strokeStyle = '#bbb';
        c.stroke();
    };

    /**
     * Optimised method for drawing body convex hull wireframes in one pass
     * @private
     * @method bodyConvexHulls
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyConvexHulls = function(render, bodies, context) {
        var c = context,
            body,
            part,
            i,
            j,
            k;

        c.beginPath();

        // render convex hulls
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible || body.parts.length === 1)
                continue;

            c.moveTo(body.vertices[0].x, body.vertices[0].y);

            for (j = 1; j < body.vertices.length; j++) {
                c.lineTo(body.vertices[j].x, body.vertices[j].y);
            }
            
            c.lineTo(body.vertices[0].x, body.vertices[0].y);
        }

        c.lineWidth = 1;
        c.strokeStyle = 'rgba(255,255,255,0.2)';
        c.stroke();
    };

    /**
     * Renders body vertex numbers.
     * @private
     * @method vertexNumbers
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.vertexNumbers = function(render, bodies, context) {
        var c = context,
            i,
            j,
            k;

        for (i = 0; i < bodies.length; i++) {
            var parts = bodies[i].parts;
            for (k = parts.length > 1 ? 1 : 0; k < parts.length; k++) {
                var part = parts[k];
                for (j = 0; j < part.vertices.length; j++) {
                    c.fillStyle = 'rgba(255,255,255,0.2)';
                    c.fillText(i + '_' + j, part.position.x + (part.vertices[j].x - part.position.x) * 0.8, part.position.y + (part.vertices[j].y - part.position.y) * 0.8);
                }
            }
        }
    };

    /**
     * Renders mouse position.
     * @private
     * @method mousePosition
     * @param {render} render
     * @param {mouse} mouse
     * @param {RenderingContext} context
     */
    Render.mousePosition = function(render, mouse, context) {
        var c = context;
        c.fillStyle = 'rgba(255,255,255,0.8)';
        c.fillText(mouse.position.x + '  ' + mouse.position.y, mouse.position.x + 5, mouse.position.y - 5);
    };

    /**
     * Draws body bounds
     * @private
     * @method bodyBounds
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyBounds = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.render.visible) {
                var parts = bodies[i].parts;
                for (var j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    var part = parts[j];
                    c.rect(part.bounds.min.x, part.bounds.min.y, part.bounds.max.x - part.bounds.min.x, part.bounds.max.y - part.bounds.min.y);
                }
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,255,255,0.08)';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.1)';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Draws body angle indicators and axes
     * @private
     * @method bodyAxes
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyAxes = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            part,
            i,
            j,
            k;

        c.beginPath();

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i],
                parts = body.parts;

            if (!body.render.visible)
                continue;

            if (options.showAxes) {
                // render all axes
                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    part = parts[j];
                    for (k = 0; k < part.axes.length; k++) {
                        var axis = part.axes[k];
                        c.moveTo(part.position.x, part.position.y);
                        c.lineTo(part.position.x + axis.x * 20, part.position.y + axis.y * 20);
                    }
                }
            } else {
                for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                    part = parts[j];
                    for (k = 0; k < part.axes.length; k++) {
                        // render a single axis indicator
                        c.moveTo(part.position.x, part.position.y);
                        c.lineTo((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2, 
                                 (part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2);
                    }
                }
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'indianred';
        } else {
            c.strokeStyle = 'rgba(0,0,0,0.8)';
            c.globalCompositeOperation = 'overlay';
        }

        c.lineWidth = 1;
        c.stroke();
        c.globalCompositeOperation = 'source-over';
    };

    /**
     * Draws body positions
     * @private
     * @method bodyPositions
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyPositions = function(render, bodies, context) {
        var c = context,
            engine = render.engine,
            options = render.options,
            body,
            part,
            i,
            k;

        c.beginPath();

        // render current positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];

            if (!body.render.visible)
                continue;

            // handle compound parts
            for (k = 0; k < body.parts.length; k++) {
                part = body.parts[k];
                c.arc(part.position.x, part.position.y, 3, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'indianred';
        } else {
            c.fillStyle = 'rgba(0,0,0,0.5)';
        }
        c.fill();

        c.beginPath();

        // render previous positions
        for (i = 0; i < bodies.length; i++) {
            body = bodies[i];
            if (body.render.visible) {
                c.arc(body.positionPrev.x, body.positionPrev.y, 2, 0, 2 * Math.PI, false);
                c.closePath();
            }
        }

        c.fillStyle = 'rgba(255,165,0,0.8)';
        c.fill();
    };

    /**
     * Draws body velocity
     * @private
     * @method bodyVelocity
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyVelocity = function(render, bodies, context) {
        var c = context;

        c.beginPath();

        for (var i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (!body.render.visible)
                continue;

            c.moveTo(body.position.x, body.position.y);
            c.lineTo(body.position.x + (body.position.x - body.positionPrev.x) * 2, body.position.y + (body.position.y - body.positionPrev.y) * 2);
        }

        c.lineWidth = 3;
        c.strokeStyle = 'cornflowerblue';
        c.stroke();
    };

    /**
     * Draws body ids
     * @private
     * @method bodyIds
     * @param {render} render
     * @param {body[]} bodies
     * @param {RenderingContext} context
     */
    Render.bodyIds = function(render, bodies, context) {
        var c = context,
            i,
            j;

        for (i = 0; i < bodies.length; i++) {
            if (!bodies[i].render.visible)
                continue;

            var parts = bodies[i].parts;
            for (j = parts.length > 1 ? 1 : 0; j < parts.length; j++) {
                var part = parts[j];
                c.font = "12px Arial";
                c.fillStyle = 'rgba(255,255,255,0.5)';
                c.fillText(part.id, part.position.x + 10, part.position.y - 10);
            }
        }
    };

    /**
     * Description
     * @private
     * @method collisions
     * @param {render} render
     * @param {pair[]} pairs
     * @param {RenderingContext} context
     */
    Render.collisions = function(render, pairs, context) {
        var c = context,
            options = render.options,
            pair,
            collision,
            corrected,
            bodyA,
            bodyB,
            i,
            j;

        c.beginPath();

        // render collision positions
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;
            for (j = 0; j < pair.activeContacts.length; j++) {
                var contact = pair.activeContacts[j],
                    vertex = contact.vertex;
                c.rect(vertex.x - 1.5, vertex.y - 1.5, 3.5, 3.5);
            }
        }

        if (options.wireframes) {
            c.fillStyle = 'rgba(255,255,255,0.7)';
        } else {
            c.fillStyle = 'orange';
        }
        c.fill();

        c.beginPath();
            
        // render collision normals
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;

            if (pair.activeContacts.length > 0) {
                var normalPosX = pair.activeContacts[0].vertex.x,
                    normalPosY = pair.activeContacts[0].vertex.y;

                if (pair.activeContacts.length === 2) {
                    normalPosX = (pair.activeContacts[0].vertex.x + pair.activeContacts[1].vertex.x) / 2;
                    normalPosY = (pair.activeContacts[0].vertex.y + pair.activeContacts[1].vertex.y) / 2;
                }
                
                if (collision.bodyB === collision.supports[0].body || collision.bodyA.isStatic === true) {
                    c.moveTo(normalPosX - collision.normal.x * 8, normalPosY - collision.normal.y * 8);
                } else {
                    c.moveTo(normalPosX + collision.normal.x * 8, normalPosY + collision.normal.y * 8);
                }

                c.lineTo(normalPosX, normalPosY);
            }
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,165,0,0.7)';
        } else {
            c.strokeStyle = 'orange';
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method separations
     * @param {render} render
     * @param {pair[]} pairs
     * @param {RenderingContext} context
     */
    Render.separations = function(render, pairs, context) {
        var c = context,
            options = render.options,
            pair,
            collision,
            corrected,
            bodyA,
            bodyB,
            i,
            j;

        c.beginPath();

        // render separations
        for (i = 0; i < pairs.length; i++) {
            pair = pairs[i];

            if (!pair.isActive)
                continue;

            collision = pair.collision;
            bodyA = collision.bodyA;
            bodyB = collision.bodyB;

            var k = 1;

            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
            if (bodyB.isStatic) k = 0;

            c.moveTo(bodyB.position.x, bodyB.position.y);
            c.lineTo(bodyB.position.x - collision.penetration.x * k, bodyB.position.y - collision.penetration.y * k);

            k = 1;

            if (!bodyB.isStatic && !bodyA.isStatic) k = 0.5;
            if (bodyA.isStatic) k = 0;

            c.moveTo(bodyA.position.x, bodyA.position.y);
            c.lineTo(bodyA.position.x + collision.penetration.x * k, bodyA.position.y + collision.penetration.y * k);
        }

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,165,0,0.5)';
        } else {
            c.strokeStyle = 'orange';
        }
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method grid
     * @param {render} render
     * @param {grid} grid
     * @param {RenderingContext} context
     */
    Render.grid = function(render, grid, context) {
        var c = context,
            options = render.options;

        if (options.wireframes) {
            c.strokeStyle = 'rgba(255,180,0,0.1)';
        } else {
            c.strokeStyle = 'rgba(255,180,0,0.5)';
        }

        c.beginPath();

        var bucketKeys = Common.keys(grid.buckets);

        for (var i = 0; i < bucketKeys.length; i++) {
            var bucketId = bucketKeys[i];

            if (grid.buckets[bucketId].length < 2)
                continue;

            var region = bucketId.split(',');
            c.rect(0.5 + parseInt(region[0], 10) * grid.bucketWidth, 
                    0.5 + parseInt(region[1], 10) * grid.bucketHeight, 
                    grid.bucketWidth, 
                    grid.bucketHeight);
        }

        c.lineWidth = 1;
        c.stroke();
    };

    /**
     * Description
     * @private
     * @method inspector
     * @param {inspector} inspector
     * @param {RenderingContext} context
     */
    Render.inspector = function(inspector, context) {
        var engine = inspector.engine,
            selected = inspector.selected,
            render = inspector.render,
            options = render.options,
            bounds;

        if (options.hasBounds) {
            var boundsWidth = render.bounds.max.x - render.bounds.min.x,
                boundsHeight = render.bounds.max.y - render.bounds.min.y,
                boundsScaleX = boundsWidth / render.options.width,
                boundsScaleY = boundsHeight / render.options.height;
            
            context.scale(1 / boundsScaleX, 1 / boundsScaleY);
            context.translate(-render.bounds.min.x, -render.bounds.min.y);
        }

        for (var i = 0; i < selected.length; i++) {
            var item = selected[i].data;

            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.9)';
            context.setLineDash([1,2]);

            switch (item.type) {

            case 'body':

                // render body selections
                bounds = item.bounds;
                context.beginPath();
                context.rect(Math.floor(bounds.min.x - 3), Math.floor(bounds.min.y - 3), 
                             Math.floor(bounds.max.x - bounds.min.x + 6), Math.floor(bounds.max.y - bounds.min.y + 6));
                context.closePath();
                context.stroke();

                break;

            case 'constraint':

                // render constraint selections
                var point = item.pointA;
                if (item.bodyA)
                    point = item.pointB;
                context.beginPath();
                context.arc(point.x, point.y, 10, 0, 2 * Math.PI);
                context.closePath();
                context.stroke();

                break;

            }

            context.setLineDash([]);
            context.translate(-0.5, -0.5);
        }

        // render selection region
        if (inspector.selectStart !== null) {
            context.translate(0.5, 0.5);
            context.lineWidth = 1;
            context.strokeStyle = 'rgba(255,165,0,0.6)';
            context.fillStyle = 'rgba(255,165,0,0.1)';
            bounds = inspector.selectBounds;
            context.beginPath();
            context.rect(Math.floor(bounds.min.x), Math.floor(bounds.min.y), 
                         Math.floor(bounds.max.x - bounds.min.x), Math.floor(bounds.max.y - bounds.min.y));
            context.closePath();
            context.stroke();
            context.fill();
            context.translate(-0.5, -0.5);
        }

        if (options.hasBounds)
            context.setTransform(1, 0, 0, 1, 0, 0);
    };

    /**
     * Description
     * @method _createCanvas
     * @private
     * @param {} width
     * @param {} height
     * @return canvas
     */
    var _createCanvas = function(width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.oncontextmenu = function() { return false; };
        canvas.onselectstart = function() { return false; };
        return canvas;
    };

    /**
     * Gets the pixel ratio of the canvas.
     * @method _getPixelRatio
     * @private
     * @param {HTMLElement} canvas
     * @return {Number} pixel ratio
     */
    var _getPixelRatio = function(canvas) {
        var context = canvas.getContext('2d'),
            devicePixelRatio = window.devicePixelRatio || 1,
            backingStorePixelRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio
                                      || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio
                                      || context.backingStorePixelRatio || 1;

        return devicePixelRatio / backingStorePixelRatio;
    };

    /**
     * Gets the requested texture (an Image) via its path
     * @method _getTexture
     * @private
     * @param {render} render
     * @param {string} imagePath
     * @return {Image} texture
     */
    var _getTexture = function(render, imagePath) {
        var image = render.textures[imagePath];

        if (image)
            return image;

        image = render.textures[imagePath] = new Image();
        image.src = imagePath;

        return image;
    };

    /**
     * Applies the background to the canvas using CSS.
     * @method applyBackground
     * @private
     * @param {render} render
     * @param {string} background
     */
    var _applyBackground = function(render, background) {
        var cssBackground = background;

        if (/(jpg|gif|png)$/.test(background))
            cssBackground = 'url(' + background + ')';

        render.canvas.style.background = cssBackground;
        render.canvas.style.backgroundSize = "contain";
        render.currentBackground = background;
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired before rendering
    *
    * @event beforeRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after rendering
    *
    * @event afterRender
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * A back-reference to the `Matter.Render` module.
     *
     * @property controller
     * @type render
     */

    /**
     * A reference to the `Matter.Engine` instance to be used.
     *
     * @property engine
     * @type engine
     */

    /**
     * A reference to the element where the canvas is to be inserted (if `render.canvas` has not been specified)
     *
     * @property element
     * @type HTMLElement
     * @default null
     */

    /**
     * The canvas element to render to. If not specified, one will be created if `render.element` has been specified.
     *
     * @property canvas
     * @type HTMLCanvasElement
     * @default null
     */

    /**
     * The configuration options of the renderer.
     *
     * @property options
     * @type {}
     */

    /**
     * The target width in pixels of the `render.canvas` to be created.
     *
     * @property options.width
     * @type number
     * @default 800
     */

    /**
     * The target height in pixels of the `render.canvas` to be created.
     *
     * @property options.height
     * @type number
     * @default 600
     */

    /**
     * A flag that specifies if `render.bounds` should be used when rendering.
     *
     * @property options.hasBounds
     * @type boolean
     * @default false
     */

    /**
     * A `Bounds` object that specifies the drawing view region. 
     * Rendering will be automatically transformed and scaled to fit within the canvas size (`render.options.width` and `render.options.height`).
     * This allows for creating views that can pan or zoom around the scene.
     * You must also set `render.options.hasBounds` to `true` to enable bounded rendering.
     *
     * @property bounds
     * @type bounds
     */

    /**
     * The 2d rendering context from the `render.canvas` element.
     *
     * @property context
     * @type CanvasRenderingContext2D
     */

    /**
     * The sprite texture cache.
     *
     * @property textures
     * @type {}
     */

})();

},{"../body/Composite":11,"../collision/Grid":15,"../core/Common":23,"../core/Events":25,"../geometry/Bounds":33,"../geometry/Vector":35}],39:[function(require,module,exports){
/**
* The `Matter.RenderPixi` module is an example renderer using pixi.js.
* See also `Matter.Render` for a canvas based renderer.
*
* @class RenderPixi
* @deprecated the Matter.RenderPixi module will soon be removed from the Matter.js core.
* It will likely be moved to its own repository (but maintenance will be limited).
*/

var RenderPixi = {};

module.exports = RenderPixi;

var Composite = require('../body/Composite');
var Common = require('../core/Common');

(function() {

    var _requestAnimationFrame,
        _cancelAnimationFrame;

    if (typeof window !== 'undefined') {
        _requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame
                                      || window.mozRequestAnimationFrame || window.msRequestAnimationFrame 
                                      || function(callback){ window.setTimeout(function() { callback(Common.now()); }, 1000 / 60); };
   
        _cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame 
                                      || window.webkitCancelAnimationFrame || window.msCancelAnimationFrame;
    }
    
    /**
     * Creates a new Pixi.js WebGL renderer
     * @method create
     * @param {object} options
     * @return {RenderPixi} A new renderer
     * @deprecated
     */
    RenderPixi.create = function(options) {
        Common.log('RenderPixi.create: Matter.RenderPixi is deprecated (see docs)', 'warn');

        var defaults = {
            controller: RenderPixi,
            engine: null,
            element: null,
            frameRequestId: null,
            canvas: null,
            renderer: null,
            container: null,
            spriteContainer: null,
            pixiOptions: null,
            options: {
                width: 800,
                height: 600,
                background: '#fafafa',
                wireframeBackground: '#222',
                hasBounds: false,
                enabled: true,
                wireframes: true,
                showSleeping: true,
                showDebug: false,
                showBroadphase: false,
                showBounds: false,
                showVelocity: false,
                showCollisions: false,
                showAxes: false,
                showPositions: false,
                showAngleIndicator: false,
                showIds: false,
                showShadows: false
            }
        };

        var render = Common.extend(defaults, options),
            transparent = !render.options.wireframes && render.options.background === 'transparent';

        // init pixi
        render.pixiOptions = render.pixiOptions || {
            view: render.canvas,
            transparent: transparent,
            antialias: true,
            backgroundColor: options.background
        };

        render.mouse = options.mouse;
        render.engine = options.engine;
        render.renderer = render.renderer || new PIXI.WebGLRenderer(render.options.width, render.options.height, render.pixiOptions);
        render.container = render.container || new PIXI.Container();
        render.spriteContainer = render.spriteContainer || new PIXI.Container();
        render.canvas = render.canvas || render.renderer.view;
        render.bounds = render.bounds || { 
            min: {
                x: 0,
                y: 0
            }, 
            max: { 
                x: render.options.width,
                y: render.options.height
            }
        };

        // caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // use a sprite batch for performance
        render.container.addChild(render.spriteContainer);

        // insert canvas
        if (Common.isElement(render.element)) {
            render.element.appendChild(render.canvas);
        } else {
            Common.log('No "render.element" passed, "render.canvas" was not inserted into document.', 'warn');
        }

        // prevent menus on canvas
        render.canvas.oncontextmenu = function() { return false; };
        render.canvas.onselectstart = function() { return false; };

        return render;
    };

    /**
     * Continuously updates the render canvas on the `requestAnimationFrame` event.
     * @method run
     * @param {render} render
     * @deprecated
     */
    RenderPixi.run = function(render) {
        (function loop(time){
            render.frameRequestId = _requestAnimationFrame(loop);
            RenderPixi.world(render);
        })();
    };

    /**
     * Ends execution of `Render.run` on the given `render`, by canceling the animation frame request event loop.
     * @method stop
     * @param {render} render
     * @deprecated
     */
    RenderPixi.stop = function(render) {
        _cancelAnimationFrame(render.frameRequestId);
    };

    /**
     * Clears the scene graph
     * @method clear
     * @param {RenderPixi} render
     * @deprecated
     */
    RenderPixi.clear = function(render) {
        var container = render.container,
            spriteContainer = render.spriteContainer;

        // clear stage container
        while (container.children[0]) { 
            container.removeChild(container.children[0]); 
        }

        // clear sprite batch
        while (spriteContainer.children[0]) { 
            spriteContainer.removeChild(spriteContainer.children[0]); 
        }

        var bgSprite = render.sprites['bg-0'];

        // clear caches
        render.textures = {};
        render.sprites = {};
        render.primitives = {};

        // set background sprite
        render.sprites['bg-0'] = bgSprite;
        if (bgSprite)
            container.addChildAt(bgSprite, 0);

        // add sprite batch back into container
        render.container.addChild(render.spriteContainer);

        // reset background state
        render.currentBackground = null;

        // reset bounds transforms
        container.scale.set(1, 1);
        container.position.set(0, 0);
    };

    /**
     * Sets the background of the canvas 
     * @method setBackground
     * @param {RenderPixi} render
     * @param {string} background
     * @deprecated
     */
    RenderPixi.setBackground = function(render, background) {
        if (render.currentBackground !== background) {
            var isColor = background.indexOf && background.indexOf('#') !== -1,
                bgSprite = render.sprites['bg-0'];

            if (isColor) {
                // if solid background color
                var color = Common.colorToNumber(background);
                render.renderer.backgroundColor = color;

                // remove background sprite if existing
                if (bgSprite)
                    render.container.removeChild(bgSprite); 
            } else {
                // initialise background sprite if needed
                if (!bgSprite) {
                    var texture = _getTexture(render, background);

                    bgSprite = render.sprites['bg-0'] = new PIXI.Sprite(texture);
                    bgSprite.position.x = 0;
                    bgSprite.position.y = 0;
                    render.container.addChildAt(bgSprite, 0);
                }
            }

            render.currentBackground = background;
        }
    };

    /**
     * Description
     * @method world
     * @param {engine} engine
     * @deprecated
     */
    RenderPixi.world = function(render) {
        var engine = render.engine,
            world = engine.world,
            renderer = render.renderer,
            container = render.container,
            options = render.options,
            bodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world),
            constraints = [],
            i;

        if (options.wireframes) {
            RenderPixi.setBackground(render, options.wireframeBackground);
        } else {
            RenderPixi.setBackground(render, options.background);
        }

        // handle bounds
        var boundsWidth = render.bounds.max.x - render.bounds.min.x,
            boundsHeight = render.bounds.max.y - render.bounds.min.y,
            boundsScaleX = boundsWidth / render.options.width,
            boundsScaleY = boundsHeight / render.options.height;

        if (options.hasBounds) {
            // Hide bodies that are not in view
            for (i = 0; i < bodies.length; i++) {
                var body = bodies[i];
                body.render.sprite.visible = Bounds.overlaps(body.bounds, render.bounds);
            }

            // filter out constraints that are not in view
            for (i = 0; i < allConstraints.length; i++) {
                var constraint = allConstraints[i],
                    bodyA = constraint.bodyA,
                    bodyB = constraint.bodyB,
                    pointAWorld = constraint.pointA,
                    pointBWorld = constraint.pointB;

                if (bodyA) pointAWorld = Vector.add(bodyA.position, constraint.pointA);
                if (bodyB) pointBWorld = Vector.add(bodyB.position, constraint.pointB);

                if (!pointAWorld || !pointBWorld)
                    continue;

                if (Bounds.contains(render.bounds, pointAWorld) || Bounds.contains(render.bounds, pointBWorld))
                    constraints.push(constraint);
            }

            // transform the view
            container.scale.set(1 / boundsScaleX, 1 / boundsScaleY);
            container.position.set(-render.bounds.min.x * (1 / boundsScaleX), -render.bounds.min.y * (1 / boundsScaleY));
        } else {
            constraints = allConstraints;
        }

        for (i = 0; i < bodies.length; i++)
            RenderPixi.body(render, bodies[i]);

        for (i = 0; i < constraints.length; i++)
            RenderPixi.constraint(render, constraints[i]);

        renderer.render(container);
    };


    /**
     * Description
     * @method constraint
     * @param {engine} engine
     * @param {constraint} constraint
     * @deprecated
     */
    RenderPixi.constraint = function(render, constraint) {
        var engine = render.engine,
            bodyA = constraint.bodyA,
            bodyB = constraint.bodyB,
            pointA = constraint.pointA,
            pointB = constraint.pointB,
            container = render.container,
            constraintRender = constraint.render,
            primitiveId = 'c-' + constraint.id,
            primitive = render.primitives[primitiveId];

        // initialise constraint primitive if not existing
        if (!primitive)
            primitive = render.primitives[primitiveId] = new PIXI.Graphics();

        // don't render if constraint does not have two end points
        if (!constraintRender.visible || !constraint.pointA || !constraint.pointB) {
            primitive.clear();
            return;
        }

        // add to scene graph if not already there
        if (Common.indexOf(container.children, primitive) === -1)
            container.addChild(primitive);

        // render the constraint on every update, since they can change dynamically
        primitive.clear();
        primitive.beginFill(0, 0);
        primitive.lineStyle(constraintRender.lineWidth, Common.colorToNumber(constraintRender.strokeStyle), 1);
        
        if (bodyA) {
            primitive.moveTo(bodyA.position.x + pointA.x, bodyA.position.y + pointA.y);
        } else {
            primitive.moveTo(pointA.x, pointA.y);
        }

        if (bodyB) {
            primitive.lineTo(bodyB.position.x + pointB.x, bodyB.position.y + pointB.y);
        } else {
            primitive.lineTo(pointB.x, pointB.y);
        }

        primitive.endFill();
    };
    
    /**
     * Description
     * @method body
     * @param {engine} engine
     * @param {body} body
     * @deprecated
     */
    RenderPixi.body = function(render, body) {
        var engine = render.engine,
            bodyRender = body.render;

        if (!bodyRender.visible)
            return;

        if (bodyRender.sprite && bodyRender.sprite.texture) {
            var spriteId = 'b-' + body.id,
                sprite = render.sprites[spriteId],
                spriteContainer = render.spriteContainer;

            // initialise body sprite if not existing
            if (!sprite)
                sprite = render.sprites[spriteId] = _createBodySprite(render, body);

            // add to scene graph if not already there
            if (Common.indexOf(spriteContainer.children, sprite) === -1)
                spriteContainer.addChild(sprite);

            // update body sprite
            sprite.position.x = body.position.x;
            sprite.position.y = body.position.y;
            sprite.rotation = body.angle;
            sprite.scale.x = bodyRender.sprite.xScale || 1;
            sprite.scale.y = bodyRender.sprite.yScale || 1;
        } else {
            var primitiveId = 'b-' + body.id,
                primitive = render.primitives[primitiveId],
                container = render.container;

            // initialise body primitive if not existing
            if (!primitive) {
                primitive = render.primitives[primitiveId] = _createBodyPrimitive(render, body);
                primitive.initialAngle = body.angle;
            }

            // add to scene graph if not already there
            if (Common.indexOf(container.children, primitive) === -1)
                container.addChild(primitive);

            // update body primitive
            primitive.position.x = body.position.x;
            primitive.position.y = body.position.y;
            primitive.rotation = body.angle - primitive.initialAngle;
        }
    };

    /**
     * Creates a body sprite
     * @method _createBodySprite
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Sprite} sprite
     * @deprecated
     */
    var _createBodySprite = function(render, body) {
        var bodyRender = body.render,
            texturePath = bodyRender.sprite.texture,
            texture = _getTexture(render, texturePath),
            sprite = new PIXI.Sprite(texture);

        sprite.anchor.x = body.render.sprite.xOffset;
        sprite.anchor.y = body.render.sprite.yOffset;

        return sprite;
    };

    /**
     * Creates a body primitive
     * @method _createBodyPrimitive
     * @private
     * @param {RenderPixi} render
     * @param {body} body
     * @return {PIXI.Graphics} graphics
     * @deprecated
     */
    var _createBodyPrimitive = function(render, body) {
        var bodyRender = body.render,
            options = render.options,
            primitive = new PIXI.Graphics(),
            fillStyle = Common.colorToNumber(bodyRender.fillStyle),
            strokeStyle = Common.colorToNumber(bodyRender.strokeStyle),
            strokeStyleIndicator = Common.colorToNumber(bodyRender.strokeStyle),
            strokeStyleWireframe = Common.colorToNumber('#bbb'),
            strokeStyleWireframeIndicator = Common.colorToNumber('#CD5C5C'),
            part;

        primitive.clear();

        // handle compound parts
        for (var k = body.parts.length > 1 ? 1 : 0; k < body.parts.length; k++) {
            part = body.parts[k];

            if (!options.wireframes) {
                primitive.beginFill(fillStyle, 1);
                primitive.lineStyle(bodyRender.lineWidth, strokeStyle, 1);
            } else {
                primitive.beginFill(0, 0);
                primitive.lineStyle(1, strokeStyleWireframe, 1);
            }

            primitive.moveTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

            for (var j = 1; j < part.vertices.length; j++) {
                primitive.lineTo(part.vertices[j].x - body.position.x, part.vertices[j].y - body.position.y);
            }

            primitive.lineTo(part.vertices[0].x - body.position.x, part.vertices[0].y - body.position.y);

            primitive.endFill();

            // angle indicator
            if (options.showAngleIndicator || options.showAxes) {
                primitive.beginFill(0, 0);

                if (options.wireframes) {
                    primitive.lineStyle(1, strokeStyleWireframeIndicator, 1);
                } else {
                    primitive.lineStyle(1, strokeStyleIndicator);
                }

                primitive.moveTo(part.position.x - body.position.x, part.position.y - body.position.y);
                primitive.lineTo(((part.vertices[0].x + part.vertices[part.vertices.length-1].x) / 2 - body.position.x), 
                                 ((part.vertices[0].y + part.vertices[part.vertices.length-1].y) / 2 - body.position.y));

                primitive.endFill();
            }
        }

        return primitive;
    };

    /**
     * Gets the requested texture (a PIXI.Texture) via its path
     * @method _getTexture
     * @private
     * @param {RenderPixi} render
     * @param {string} imagePath
     * @return {PIXI.Texture} texture
     * @deprecated
     */
    var _getTexture = function(render, imagePath) {
        var texture = render.textures[imagePath];

        if (!texture)
            texture = render.textures[imagePath] = PIXI.Texture.fromImage(imagePath);

        return texture;
    };

})();

},{"../body/Composite":11,"../core/Common":23}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiRW50aXR5TWFuYWdlci5qcyIsIkdhbWUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvcGVyZm9ybWFuY2Utbm93L2xpYi9wZXJmb3JtYW5jZS1ub3cuanMiLCJub2RlX21vZHVsZXMvZ2FtZWxvb3Avbm9kZV9tb2R1bGVzL3JhZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2JvZHkvQm9keS5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2JvZHkvQ29tcG9zaXRlLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvYm9keS9Xb3JsZC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9Db250YWN0LmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29sbGlzaW9uL0RldGVjdG9yLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29sbGlzaW9uL0dyaWQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb2xsaXNpb24vUGFpci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9QYWlycy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9RdWVyeS5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9SZXNvbHZlci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9TQVQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb25zdHJhaW50L0NvbnN0cmFpbnQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb25zdHJhaW50L01vdXNlQ29uc3RyYWludC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvQ29tbW9uLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29yZS9FbmdpbmUuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb3JlL0V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvTWV0cmljcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvTW91c2UuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb3JlL1J1bm5lci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvU2xlZXBpbmcuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9mYWN0b3J5L0JvZGllcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2ZhY3RvcnkvQ29tcG9zaXRlcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2dlb21ldHJ5L0F4ZXMuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9Cb3VuZHMuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9TdmcuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9WZWN0b3IuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9WZXJ0aWNlcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL21vZHVsZS9tYWluLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvcmVuZGVyL1JlbmRlci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL3JlbmRlci9SZW5kZXJQaXhpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25VQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4ekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiZnVuY3Rpb24gY3JlYXRlUGh5c2ljcyhjZmcpe1xyXG4gIHZhciBzaGFwZSA9IGNmZy5zaGFwZTtcclxuICB2YXIgb3B0aW9ucyA9IGNmZy5vcHRpb25zO1xyXG4gIHZhciBib2R5ID0gbnVsbDtcclxuXHJcbiAgLy8gIGh0dHA6Ly9icm0uaW8vbWF0dGVyLWpzL2RvY3MvY2xhc3Nlcy9Cb2RpZXMuaHRtbFxyXG4gIGlmIChzaGFwZS50eXBlID09PSBcImNpcmNsZVwiKXtcclxuICAgIGJvZHkgPSBNYXR0ZXIuQm9kaWVzLmNpcmNsZShjZmcucG9zaXRpb24ueCxjZmcucG9zaXRpb24ueSxjZmcuc2hhcGUucmFkaXVzLGNmZyk7XHJcbiAgfVxyXG4gIGVsc2UgaWYoc2hhcGUudHlwZSA9PT0gXCJyZWN0YW5nbGVcIil7XHJcbiAgICBib2R5ID0gTWF0dGVyLmJvZGllcy5yZWN0YW5nbGUoc2hhcGUueHx8MCxzaGFwZS55fHwwLHNoYXBlLndpZHRofHwxLHNoYXBlLmhlaWdodHx8MSxvcHRpb25zKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICBjb25zb2xlLmxvZyhzaGFwZS50eXBlICsgXCIgbm90IHN1cHBvcnRlZFwiKTtcclxuICB9XHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcblxyXG4vL0VudGl0eVxyXG52YXIgRW50aXR5ID0gZnVuY3Rpb24oY2ZnKXtcclxuICAvKlxyXG4gIGNmZyA9IGNmZyB8fCB7XHJcbiAgICBuYW1lIDogXCJ1bmtub3duXCIsXHJcbiAgICBwaHlzaWNzOiB7XHJcbiAgICAgIHNoYXBlOntcclxuICAgICAgICB0eXBlOlwiY2lyY2xlXCIsXHJcbiAgICAgICAgcmFkaXVzOjVcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcbiAgKi9cclxuICB0aGlzLm5hbWUgPSBjZmcubmFtZTtcclxuICB0aGlzLmRlbGV0ZWQgPSBmYWxzZTtcclxuICB0aGlzLmJvZHkgPSBjcmVhdGVQaHlzaWNzKGNmZy5waHlzaWNzKTtcclxuICB0aGlzLmJvZHkuZW50aXR5ID0gdGhpcztcclxuXHJcbiAgLypPdmVycmlkZSB0aGVzZSBtZXRob2RzIHdpdGggeW91ciBvd24gbG9naWMqL1xyXG4gIHRoaXMudXBkYXRlID0gZnVuY3Rpb24oZHQpe307XHJcbiAgdGhpcy5jb2xsaWRlU3RhcnQgPSBmdW5jdGlvbihlbnRpdHkpe307XHJcbiAgdGhpcy5jb2xsaWRlRW5kID0gZnVuY3Rpb24oZW50aXR5KXt9O1xyXG4gIHRoaXMuY29sbGlkZUFjdGl2ZSA9IGZ1bmN0aW9uKGVudGl0eSl7fTtcclxufVxyXG5cclxuXHJcblxyXG4vL01hbmFnZXJcclxudmFyIE1hbmFnZXIgPSBmdW5jdGlvbihlbmdpbmUpe1xyXG4gIHRoaXMuZW50aXRpZXMgPSBbXTtcclxuICB0aGlzLmRlbGV0ZWRFbnRpdGllcyA9IFtdO1xyXG5cclxuICAvL0hhbmRsZSBjb2xsaXNpb25zXHJcbiAgTWF0dGVyLkV2ZW50cy5vbihlbmdpbmUsJ2NvbGxpc2lvblN0YXJ0JyxmdW5jdGlvbihldnQpe1xyXG4gICAgZm9yICh2YXIgeCBpbiBldnQucGFpcnMpe1xyXG4gICAgICB2YXIgYSA9IGV2dC5wYWlyc1t4XS5ib2R5QSxcclxuICAgICAgICAgIGIgPSBldnQucGFpcnNbeF0uYm9keUI7XHJcbiAgICAgIGlmIChhLmVudGl0eSAmJiBiLmVudGl0eSl7XHJcbiAgICAgICAgYS5lbnRpdHkuY29sbGlkZVN0YXJ0KGIuZW50aXR5KTtcclxuICAgICAgICBiLmVudGl0eS5jb2xsaWRlU3RhcnQoYS5lbnRpdHkpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBNYXR0ZXIuRXZlbnRzLm9uKGVuZ2luZSwnY29sbGlzaW9uRW5kJyxmdW5jdGlvbihldnQpe1xyXG4gICAgZm9yICh2YXIgeCBpbiBldnQucGFpcnMpe1xyXG4gICAgICB2YXIgYSA9IGV2dC5wYWlyc1t4XS5ib2R5QSxcclxuICAgICAgICAgIGIgPSBldnQucGFpcnNbeF0uYm9keUI7XHJcbiAgICAgIGlmIChhLmVudGl0eSAmJiBiLmVudGl0eSl7XHJcbiAgICAgICAgYS5lbnRpdHkuY29sbGlkZUVuZChiLmVudGl0eSk7XHJcbiAgICAgICAgYi5lbnRpdHkuY29sbGlkZUVuZChhLmVudGl0eSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcblxyXG4gIE1hdHRlci5FdmVudHMub24oZW5naW5lLCdjb2xsaXNpb25BY3RpdmUnLGZ1bmN0aW9uKGV2dCl7XHJcbiAgICBmb3IgKHZhciB4IGluIGV2dC5wYWlycyl7XHJcbiAgICAgIHZhciBhID0gZXZ0LnBhaXJzW3hdLmJvZHlBLFxyXG4gICAgICAgICAgYiA9IGV2dC5wYWlyc1t4XS5ib2R5QjtcclxuICAgICAgaWYgKGEuZW50aXR5ICYmIGIuZW50aXR5KXtcclxuICAgICAgICBhLmVudGl0eS5jb2xsaWRlQWN0aXZlKGIuZW50aXR5KTtcclxuICAgICAgICBiLmVudGl0eS5jb2xsaWRlQWN0aXZlKGEuZW50aXR5KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KTtcclxuXHJcbn07XHJcblxyXG5NYW5hZ2VyLnByb3RvdHlwZSA9IHtcclxuICBjcmVhdGVFbnRpdHkgOiBmdW5jdGlvbihjZmcpe1xyXG4gICAgY29uc29sZS5sb2coY2ZnKTtcclxuICAgIC8vdmFyIGUgPSBuZXcgRW50aXR5KGNmZyk7XHJcbiAgICAvL3RoaXMuZW50aXRpZXMucHVzaChlKTtcclxuICAgIC8vcmV0dXJuIGU7XHJcbiAgfSxcclxuXHJcblxyXG4gIHVwZGF0ZTogZnVuY3Rpb24oZHQpe1xyXG4gICAgLy91cGRhdGUgZW50aXRpZXNcclxuICAgIGZvciAodmFyIGk9MDsgaSA8IHRoaXMuZW50aXRpZXMuc2l6ZTsgaSsrKXtcclxuICAgICAgaWYgKHRoaXMuZW50aXRpZXNbaV0udXBkYXRlKVxyXG4gICAgICAgIHRoaXMuZW50aXRpZXNbaV0udXBkYXRlKGR0KTtcclxuXHJcbiAgICAgIGlmICh0aGlzLmVudGl0aWVzW2ldLmRlbGV0ZWQpXHJcbiAgICAgICAgdGhpcy5yZW1vdmVkRW50aXRlcy5wdXNoKHRoaXMuZW50aXRpZXNbaV0pXHJcbiAgICB9XHJcblxyXG4gICAgLy9yZW1vdmUgZGVsZXRlZCBlbnRpdGllc1xyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgdGhpcy5kZWxldGVkRW50aXRpZXMuc2l6ZTsgaSsrKXtcclxuICAgICAgTWF0dGVyLldvcmxkLnJlbW92ZSh0aGlzLmVuZ2luZS53b3JsZCx0aGlzLmRlbGV0ZWRFbnRpdGllc1tpXS5ib2RpZXMpO1xyXG4gICAgICB2YXIgeCA9IHRoaXMuZW50aXRpZXMuaW5kZXhPZih0aGlzLmRlbGV0ZWRFbnRpdGllc1tpXSk7XHJcbiAgICAgIHRoaXMuZW50aXRpZXMuc3BsaWNlKHgsMSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1hbmFnZXI7XHJcbiIsIlxyXG4vLyBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9nYW1lbG9vcFxyXG52YXIgR2FtZSA9IHJlcXVpcmUoXCJnYW1lbG9vcFwiKTtcclxuLy8gaHR0cDovL2JybS5pby9tYXR0ZXItanNcclxudmFyIE1hdHRlciA9IHJlcXVpcmUoXCJtYXR0ZXItanNcIik7XHJcblxyXG52YXIgRW50aXR5TWFuYWdlciA9IHJlcXVpcmUoXCIuL0VudGl0eU1hbmFnZXIuanNcIik7XHJcblxyXG4vL1RoaXMgaXMgYSBzaW5nbGV0b24gY2xhc3MuIFJlcXVpcmluZyB0aGlzIG1vZHVsZSBhbHdheXMgcmV0dXJucyB0aGUgc2FtZVxyXG4vLyBnYW1lIG9iamVjdFxyXG5cclxudmFyIGdhbWUgPSBuZXcgR2FtZSh7XHJcbiAgZnBzOjE1XHJcbn0pO1xyXG5cclxuXHJcbmdhbWUucGh5c2ljcyA9IE1hdHRlci5FbmdpbmUuY3JlYXRlKCk7XHJcbmdhbWUucGh5c2ljcy53b3JsZC5ncmF2aXR5ID0ge3g6MCx5Oi41fTtcclxuXHJcbmdhbWUuZW50aXR5TWFuYWdlciA9IG5ldyBFbnRpdHlNYW5hZ2VyKGdhbWUucGh5c2ljcyk7XHJcblxyXG5cclxudmFyIGRlYnVnUmVuZGVyID0gdHJ1ZTtcclxuXHJcbmlmIChkZWJ1Z1JlbmRlcil7XHJcbiBnYW1lLnJlbmRlcmVyID0gTWF0dGVyLlJlbmRlci5jcmVhdGUoe1xyXG4gICAgIGVsZW1lbnQ6IGRvY3VtZW50LmJvZHksXHJcbiAgICAgZW5naW5lOiBnYW1lLnBoeXNpY3MsXHJcbiAgICAgb3B0aW9uczoge1xyXG4gICAgICAgd2lkdGg6ODAwLFxyXG4gICAgICAgaGVpZ2h0OjYwMFxyXG4gICAgIH1cclxuIH0pO1xyXG59XHJcblxyXG5nYW1lLm9uKCdzdGFydCcsIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgdmFyIHdvcmxkID0gZ2FtZS5waHlzaWNzLndvcmxkO1xyXG5cclxuICAvL3ZhciBiYWxsID0gZ2FtZS5lbnRpdHlNYW5hZ2VyLmNyZWF0ZUVudGl0eSgpO39cclxuXHJcbiAgLy9iYWxsID0gTWF0dGVyLkJvZGllcy5jaXJjbGUoNDAwLDAsMzAse3Jlc3RpdHV0aW9uOi41fSksXHJcbiAgLy9mbG9vciA9IE1hdHRlci5Cb2RpZXMucmVjdGFuZ2xlKDQwMCw2MDAsODAwLDUwLHtpc1N0YXRpYzp0cnVlfSk7XHJcbiAgTWF0dGVyLldvcmxkLmFkZCh3b3JsZCxbYmFsbCxmbG9vcl0pO1xyXG59KTtcclxuXHJcbmdhbWUub24oJ2VuZCcsIGZ1bmN0aW9uIChzdGF0ZSkge1xyXG5cclxufSk7XHJcblxyXG5nYW1lLm9uKCdyZXN1bWUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG59KTtcclxuXHJcbmdhbWUub24oJ3BhdXNlJywgZnVuY3Rpb24gKCkge1xyXG5cclxufSk7XHJcblxyXG5nYW1lLm9uKCd1cGRhdGUnLCBmdW5jdGlvbihkdCl7XHJcbiAgTWF0dGVyLkVuZ2luZS51cGRhdGUodGhpcy5waHlzaWNzLDEwMDAvdGhpcy5mcHMpO1xyXG4gIHRoaXMuZW50aXR5TWFuYWdlci51cGRhdGUoZHQpO1xyXG59KTtcclxuXHJcbmdhbWUub24oJ2RyYXcnLCBmdW5jdGlvbiAocmVuZGVyZXIsIGR0KSB7XHJcbiAgaWYgKGRlYnVnUmVuZGVyKXtcclxuICAgIE1hdHRlci5SZW5kZXIud29ybGQocmVuZGVyZXIsdGhpcy5waHlzaWNzKTtcclxuICB9XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBnYW1lO1xyXG4iLCJ2YXIgZ2FtZSA9IHJlcXVpcmUoXCIuL0dhbWUuanNcIik7XHJcblxyXG5nYW1lLnN0YXJ0KCk7XHJcbiIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjJcbnZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKVxudmFyIHJhZiA9IHJlcXVpcmUoJ3JhZicpXG5cbm1vZHVsZS5leHBvcnRzID0gR2FtZVxuaW5oZXJpdHMoR2FtZSwgRW1pdHRlcilcblxuLyoqXG4qIENyZWF0ZSB0aGUgZ2FtZVxuKiBAbmFtZSBjcmVhdGVHYW1lXG4qIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4qIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLnJlbmRlcmVyXG4qIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLmZwc1xuKiBAZXhhbXBsZVxuKiB2YXIgY3JlYXRlR2FtZSA9IHJlcXVpcmUoJ2dhbWVsb29wJylcbipcbiogdmFyIGdhbWUgPSBjcmVhdGVHYW1lKHtcbiogICByZW5kZXJlcjogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKVxuKiB9KVxuKi9cbmZ1bmN0aW9uIEdhbWUgKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEdhbWUpKSByZXR1cm4gbmV3IEdhbWUob3B0aW9ucylcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgRW1pdHRlci5jYWxsKHRoaXMpXG4gIHRoaXMucGF1c2VkID0gdHJ1ZVxuICB0aGlzLnJlbmRlcmVyID0gb3B0aW9ucy5yZW5kZXJlciB8fCB7fVxuICB0aGlzLmZwcyA9IG9wdGlvbnMuZnBzIHx8IDYwXG4gIHRoaXMuc3RlcCA9IDEgLyB0aGlzLmZwc1xufVxuXG4vKipcbiogU3RhcnQgdGhlIGdhbWUuIEVtaXRzIHRoZSBgc3RhcnRgIGV2ZW50LlxuKiBAbmFtZSBnYW1lLnN0YXJ0XG4qIEBmaXJlcyBHYW1lI3N0YXJ0XG4qIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSDigJMgYXJiaXRyYXJ5IHN0YXJ0aW5nIGdhbWUgc3RhdGUgZW1pdHRlZCBieSBgc3RhcnRgIGV2ZW50LlxuKiBAZXhhbXBsZVxuKiBnYW1lLnN0YXJ0KClcbiovXG5HYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIGdhbWVsb29wX3N0YXJ0IChzdGF0ZSkge1xuICB0aGlzLnBhdXNlZCA9IGZhbHNlXG4gIHRoaXMubGFzdCA9IG5vdygpXG4gIHRoaXMudGltZSA9IDBcbiAgdGhpcy5hY2N1bXVsYXRvciA9IDBcbiAgdGhpcy5lbWl0KCdzdGFydCcsIHN0YXRlKVxuICByYWYodGhpcy5mcmFtZS5iaW5kKHRoaXMpKVxufVxuXG4vKipcbiogRXhlY3V0ZSBhIGZyYW1lXG4qIEBuYW1lIGdhbWUuZnJhbWVcbiogQHByaXZhdGVcbiovXG5HYW1lLnByb3RvdHlwZS5mcmFtZSA9IGZ1bmN0aW9uIGdhbWVsb29wX2ZyYW1lICh0aW1lKSB7XG4gIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICB2YXIgbmV3VGltZSA9IG5vdygpXG4gICAgdmFyIGR0ID0gKG5ld1RpbWUgLSB0aGlzLmxhc3QpIC8gMTAwMFxuICAgIGlmIChkdCA+IDAuMikgZHQgPSB0aGlzLnN0ZXBcbiAgICB0aGlzLmFjY3VtdWxhdG9yICs9IGR0XG4gICAgdGhpcy5sYXN0ID0gbmV3VGltZVxuXG4gICAgd2hpbGUgKHRoaXMuYWNjdW11bGF0b3IgPj0gdGhpcy5zdGVwKSB7XG4gICAgICB0aGlzLnVwZGF0ZSh0aGlzLnN0ZXAsIHRoaXMudGltZSlcbiAgICAgIHRoaXMudGltZSArPSBkdFxuICAgICAgdGhpcy5hY2N1bXVsYXRvciAtPSB0aGlzLnN0ZXBcbiAgICB9XG5cbiAgICB0aGlzLmRyYXcodGhpcy5yZW5kZXJlciwgdGhpcy5hY2N1bXVsYXRvciAvIHRoaXMuc3RlcClcbiAgICByYWYodGhpcy5mcmFtZS5iaW5kKHRoaXMpKVxuICB9XG59XG5cbi8qKlxuKiBVcGRhdGUgdGhlIGdhbWUgc3RhdGUuIEVtaXRzIHRoZSBgdXBkYXRlYCBldmVudC4gWW91J2xsIGxpa2VseSBuZXZlciBjYWxsIHRoaXMgbWV0aG9kLCBidXQgeW91IG1heSBuZWVkIHRvIG92ZXJyaWRlIGl0LiBNYWtlIHN1cmUgdG8gYWx3YXlzIGVtaXQgdGhlIHVwZGF0ZSBldmVudCB3aXRoIHRoZSBgZGVsdGFgIHRpbWUuXG4qIEBuYW1lIGdhbWUudXBkYXRlXG4qIEBwYXJhbSB7TnVtYmVyfSBpbnRlcnZhbCDigJMgaW50ZXJ2YWwgYmV0d2VlbiBlYWNoIGZyYW1lXG4qIEBwYXJhbSB7TnVtYmVyfSB0aW1lIOKAkyB0b3RhbCB0aW1lIGVsYXBzZWRcbiogQGZpcmVzIEdhbWUjdXBkYXRlXG4qL1xuR2FtZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gZ2FtZWxvb3BfdXBkYXRlIChpbnRlcnZhbCwgdGltZSkge1xuICB0aGlzLmVtaXQoJ3VwZGF0ZScsIGludGVydmFsLCB0aW1lKVxufVxuXG4vKipcbiogRHJhdyB0aGUgZ2FtZS4gRW1pdHMgdGhlIGBkcmF3YCBldmVudC4gWW91J2xsIGxpa2VseSBuZXZlciBjYWxsIHRoaXMgbWV0aG9kLCBidXQgeW91IG1heSBuZWVkIHRvIG92ZXJyaWRlIGl0LiBNYWtlIHN1cmUgdG8gYWx3YXlzIGVtaXQgdGhlIHVwZGF0ZSBldmVudCB3aXRoIHRoZSByZW5kZXJlciBhbmQgYGRlbHRhYCB0aW1lLlxuKiBAbmFtZSBnYW1lLmRyYXdcbiogQHBhcmFtIHtPYmplY3R9IHJlbmRlcmVyXG4qIEBwYXJhbSB7TnVtYmVyfSBkZWx0YVRpbWUg4oCTIHRpbWUgcmVtYWluaW5nIHVudGlsIGdhbWUudXBkYXRlIGlzIGNhbGxlZFxuKiBAZmlyZXMgR2FtZSNkcmF3XG4qL1xuR2FtZS5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIGdhbWVsb29wX2RyYXcgKHJlbmRlcmVyLCBmcmFtZVN0YXRlKSB7XG4gIHRoaXMuZW1pdCgnZHJhdycsIHJlbmRlcmVyLCBmcmFtZVN0YXRlKVxufVxuXG4vKipcbiogRW5kIHRoZSBnYW1lLiBFbWl0cyB0aGUgYGVuZGAgZXZlbnQvXG4qIEBuYW1lIGdhbWUuZW5kXG4qIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSDigJMgc3RhdGUgb2YgZW5kIGdhbWUgY29uZGl0aW9uc1xuKiBAZmlyZXMgR2FtZSNlbmRcbiogQGV4YW1wbGVcbiogZ2FtZS5lbmQoKVxuKi9cbkdhbWUucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIGdhbWVsb29wX2VuZCAoc3RhdGUpIHtcbiAgdGhpcy5lbWl0KCdlbmQnLCBzdGF0ZSlcbn1cblxuLyoqXG4qIFBhdXNlIHRoZSBnYW1lLiBFbWl0cyB0aGUgYHBhdXNlYCBldmVudC5cbiogQG5hbWUgZ2FtZS5wYXVzZVxuKiBAZmlyZXMgR2FtZSNwYXVzZVxuKiBAZXhhbXBsZVxuKiBnYW1lLnBhdXNlKClcbiovXG5HYW1lLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uIGdhbWVsb29wX3BhdXNlICgpIHtcbiAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMucGF1c2VkID0gdHJ1ZVxuICAgIHRoaXMuZW1pdCgncGF1c2UnKVxuICB9XG59XG5cbi8qKlxuKiBSZXN1bWUgdGhlIGdhbWUuIEVtaXRzIHRoZSBgcmVzdW1lYCBldmVudC5cbiogQG5hbWUgZ2FtZS5yZXN1bWVcbiogQGZpcmVzIEdhbWUjcmVzdW1lXG4qIEBleGFtcGxlXG4qIGdhbWUucmVzdW1lKClcbiovXG5HYW1lLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbiBnYW1lbG9vcF9yZXN1bWUgKCkge1xuICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICB0aGlzLnN0YXJ0KClcbiAgICB0aGlzLmVtaXQoJ3Jlc3VtZScpXG4gIH1cbn1cblxuLyoqXG4qIFBhdXNlIG9yIHN0YXJ0IGdhbWUgZGVwZW5kaW5nIG9uIGdhbWUgc3RhdGUuIEVtaXRzIGVpdGhlciB0aGUgYHBhdXNlYCBvciBgcmVzdW1lYCBldmVudC5cbiogQG5hbWUgZ2FtZS50b2dnbGVcbiogQGV4YW1wbGVcbiogZ2FtZS50b2dnbGUoKVxuKi9cbkdhbWUucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uIGdhbWVsb29wX3RvZ2dsZSAoKSB7XG4gIGlmICh0aGlzLnBhdXNlZCkgdGhpcy5yZXN1bWUoKVxuICBlbHNlIHRoaXMucGF1c2UoKVxufVxuXG4vKiBFdmVudCBkb2N1bWVudGF0aW9uICovXG5cbi8qKlxuKiBTdGFydCBldmVudC4gRmlyZWQgd2hlbiBgZ2FtZS5zdGFydCgpYCBpcyBjYWxsZWQuXG4qXG4qIEBldmVudCBHYW1lI3N0YXJ0XG4qIEBleGFtcGxlXG4qIGdhbWUub24oJ3N0YXJ0JywgZnVuY3Rpb24gKCkge30pXG4qL1xuXG4vKipcbiogRW5kIGV2ZW50LiBGaXJlZCB3aGVuIGBnYW1lLmVuZCgpYCBpcyBjYWxsZWQuXG4qXG4qIEBldmVudCBHYW1lI2VuZFxuKiBAcGFyYW0ge09iamVjdH0gc3RhdGUgLSBzdGF0ZSBvZiBlbmQgZ2FtZSBjb25kaXRpb25zXG4qIEBleGFtcGxlXG4qIGdhbWUub24oJ2VuZCcsIGZ1bmN0aW9uIChzdGF0ZSkge30pXG4qL1xuXG4vKipcbiogVXBkYXRlIGV2ZW50LlxuKlxuKiBAZXZlbnQgR2FtZSN1cGRhdGVcbiogQHBhcmFtIHtOdW1iZXJ9IGludGVydmFsIOKAkyBpbnRlcnZhbCBiZXR3ZWVuIGVhY2ggZnJhbWVcbiogQHBhcmFtIHtOdW1iZXJ9IGZyYW1lU3RhdGUg4oCTIGN1cnJlbnQgc3RhdGUgb2YgdGhlIGNvbXBsZXRpb24gb2YgdGhlIGZyYW1lXG4qIEBwYXJhbSB7TnVtYmVyfSB0aW1lIOKAkyB0b3RhbCB0aW1lIGVsYXBzZWRcbiogQGV4YW1wbGVcbiogZ2FtZS5vbigndXBkYXRlJywgZnVuY3Rpb24gKGludGVydmFsLCB0aW1lKSB7XG4qICAgY29uc29sZS5sb2coaW50ZXJ2YWwpXG4qIH0pXG4qL1xuXG4vKipcbiogRHJhdyBldmVudC5cbipcbiogQGV2ZW50IEdhbWUjZHJhd1xuKiBAcGFyYW0ge051bWJlcn0gZnJhbWVTdGF0ZSDigJMgY3VycmVudCBzdGF0ZSBvZiB0aGUgY29tcGxldGlvbiBvZiB0aGUgZnJhbWVcbiogQHBhcmFtIHtOdW1iZXJ9IGRlbHRhXG4qIEBleGFtcGxlXG4qIGdhbWUub24oJ2RyYXcnLCBmdW5jdGlvbiAocmVuZGVyZXIsIGR0KSB7XG4qICAgY29uc29sZS5sb2coZHQpXG4qIH0pXG4qL1xuXG4vKipcbiogUGF1c2UgZXZlbnQuIEZpcmVkIHdoZW4gYGdhbWUucGF1c2UoKWAgaXMgY2FsbGVkLlxuKlxuKiBAZXZlbnQgR2FtZSNwYXVzZVxuKiBAZXhhbXBsZVxuKiBnYW1lLm9uKCdwYXVzZScsIGZ1bmN0aW9uICgpIHt9KVxuKi9cblxuLyoqXG4qIFJlc3VtZSBldmVudC4gRmlyZWQgd2hlbiBgZ2FtZS5yZXN1bWUoKWAgaXMgY2FsbGVkLlxuKlxuKiBAZXZlbnQgR2FtZSNyZXN1bWVcbiogQGV4YW1wbGVcbiogZ2FtZS5vbigncmVzdW1lJywgZnVuY3Rpb24gKCkge30pXG4qL1xuIiwiLyohXG4gKiBFdmVudEVtaXR0ZXIyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vaGlqMW54L0V2ZW50RW1pdHRlcjJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgaGlqMW54XG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbjshZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5ID8gQXJyYXkuaXNBcnJheSA6IGZ1bmN0aW9uIF9pc0FycmF5KG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICB9O1xuICB2YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4gIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgaWYgKHRoaXMuX2NvbmYpIHtcbiAgICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIHRoaXMuX2NvbmYpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbmZpZ3VyZShjb25mKSB7XG4gICAgaWYgKGNvbmYpIHtcblxuICAgICAgdGhpcy5fY29uZiA9IGNvbmY7XG5cbiAgICAgIGNvbmYuZGVsaW1pdGVyICYmICh0aGlzLmRlbGltaXRlciA9IGNvbmYuZGVsaW1pdGVyKTtcbiAgICAgIGNvbmYubWF4TGlzdGVuZXJzICYmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gY29uZi5tYXhMaXN0ZW5lcnMpO1xuICAgICAgY29uZi53aWxkY2FyZCAmJiAodGhpcy53aWxkY2FyZCA9IGNvbmYud2lsZGNhcmQpO1xuICAgICAgY29uZi5uZXdMaXN0ZW5lciAmJiAodGhpcy5uZXdMaXN0ZW5lciA9IGNvbmYubmV3TGlzdGVuZXIpO1xuXG4gICAgICBpZiAodGhpcy53aWxkY2FyZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVyVHJlZSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlcihjb25mKSB7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgdGhpcy5uZXdMaXN0ZW5lciA9IGZhbHNlO1xuICAgIGNvbmZpZ3VyZS5jYWxsKHRoaXMsIGNvbmYpO1xuICB9XG5cbiAgLy9cbiAgLy8gQXR0ZW50aW9uLCBmdW5jdGlvbiByZXR1cm4gdHlwZSBub3cgaXMgYXJyYXksIGFsd2F5cyAhXG4gIC8vIEl0IGhhcyB6ZXJvIGVsZW1lbnRzIGlmIG5vIGFueSBtYXRjaGVzIGZvdW5kIGFuZCBvbmUgb3IgbW9yZVxuICAvLyBlbGVtZW50cyAobGVhZnMpIGlmIHRoZXJlIGFyZSBtYXRjaGVzXG4gIC8vXG4gIGZ1bmN0aW9uIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZSwgaSkge1xuICAgIGlmICghdHJlZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICB2YXIgbGlzdGVuZXJzPVtdLCBsZWFmLCBsZW4sIGJyYW5jaCwgeFRyZWUsIHh4VHJlZSwgaXNvbGF0ZWRCcmFuY2gsIGVuZFJlYWNoZWQsXG4gICAgICAgIHR5cGVMZW5ndGggPSB0eXBlLmxlbmd0aCwgY3VycmVudFR5cGUgPSB0eXBlW2ldLCBuZXh0VHlwZSA9IHR5cGVbaSsxXTtcbiAgICBpZiAoaSA9PT0gdHlwZUxlbmd0aCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiBhdCB0aGUgZW5kIG9mIHRoZSBldmVudChzKSBsaXN0IGFuZCB0aGUgdHJlZSBoYXMgbGlzdGVuZXJzXG4gICAgICAvLyBpbnZva2UgdGhvc2UgbGlzdGVuZXJzLlxuICAgICAgLy9cbiAgICAgIGlmICh0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzKTtcbiAgICAgICAgcmV0dXJuIFt0cmVlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGVhZiA9IDAsIGxlbiA9IHRyZWUuX2xpc3RlbmVycy5sZW5ndGg7IGxlYWYgPCBsZW47IGxlYWYrKykge1xuICAgICAgICAgIGhhbmRsZXJzICYmIGhhbmRsZXJzLnB1c2godHJlZS5fbGlzdGVuZXJzW2xlYWZdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICgoY3VycmVudFR5cGUgPT09ICcqJyB8fCBjdXJyZW50VHlwZSA9PT0gJyoqJykgfHwgdHJlZVtjdXJyZW50VHlwZV0pIHtcbiAgICAgIC8vXG4gICAgICAvLyBJZiB0aGUgZXZlbnQgZW1pdHRlZCBpcyAnKicgYXQgdGhpcyBwYXJ0XG4gICAgICAvLyBvciB0aGVyZSBpcyBhIGNvbmNyZXRlIG1hdGNoIGF0IHRoaXMgcGF0Y2hcbiAgICAgIC8vXG4gICAgICBpZiAoY3VycmVudFR5cGUgPT09ICcqJykge1xuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsxKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9IGVsc2UgaWYoY3VycmVudFR5cGUgPT09ICcqKicpIHtcbiAgICAgICAgZW5kUmVhY2hlZCA9IChpKzEgPT09IHR5cGVMZW5ndGggfHwgKGkrMiA9PT0gdHlwZUxlbmd0aCAmJiBuZXh0VHlwZSA9PT0gJyonKSk7XG4gICAgICAgIGlmKGVuZFJlYWNoZWQgJiYgdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIG5leHQgZWxlbWVudCBoYXMgYSBfbGlzdGVuZXJzLCBhZGQgaXQgdG8gdGhlIGhhbmRsZXJzLlxuICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGJyYW5jaCBpbiB0cmVlKSB7XG4gICAgICAgICAgaWYgKGJyYW5jaCAhPT0gJ19saXN0ZW5lcnMnICYmIHRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSAnKicgfHwgYnJhbmNoID09PSAnKionKSB7XG4gICAgICAgICAgICAgIGlmKHRyZWVbYnJhbmNoXS5fbGlzdGVuZXJzICYmICFlbmRSZWFjaGVkKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgdHlwZUxlbmd0aCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkpKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IG5leHRUeXBlKSB7XG4gICAgICAgICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2JyYW5jaF0sIGkrMikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gTm8gbWF0Y2ggb24gdGhpcyBvbmUsIHNoaWZ0IGludG8gdGhlIHRyZWUgYnV0IG5vdCBpbiB0aGUgdHlwZSBhcnJheS5cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVtjdXJyZW50VHlwZV0sIGkrMSkpO1xuICAgIH1cblxuICAgIHhUcmVlID0gdHJlZVsnKiddO1xuICAgIGlmICh4VHJlZSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBsaXN0ZW5lciB0cmVlIHdpbGwgYWxsb3cgYW55IG1hdGNoIGZvciB0aGlzIHBhcnQsXG4gICAgICAvLyB0aGVuIHJlY3Vyc2l2ZWx5IGV4cGxvcmUgYWxsIGJyYW5jaGVzIG9mIHRoZSB0cmVlXG4gICAgICAvL1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4VHJlZSwgaSsxKTtcbiAgICB9XG5cbiAgICB4eFRyZWUgPSB0cmVlWycqKiddO1xuICAgIGlmKHh4VHJlZSkge1xuICAgICAgaWYoaSA8IHR5cGVMZW5ndGgpIHtcbiAgICAgICAgaWYoeHhUcmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgbGlzdGVuZXIgb24gYSAnKionLCBpdCB3aWxsIGNhdGNoIGFsbCwgc28gYWRkIGl0cyBoYW5kbGVyLlxuICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGFycmF5cyBvZiBtYXRjaGluZyBuZXh0IGJyYW5jaGVzIGFuZCBvdGhlcnMuXG4gICAgICAgIGZvcihicmFuY2ggaW4geHhUcmVlKSB7XG4gICAgICAgICAgaWYoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgeHhUcmVlLmhhc093blByb3BlcnR5KGJyYW5jaCkpIHtcbiAgICAgICAgICAgIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgLy8gV2Uga25vdyB0aGUgbmV4dCBlbGVtZW50IHdpbGwgbWF0Y2gsIHNvIGp1bXAgdHdpY2UuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMik7XG4gICAgICAgICAgICB9IGVsc2UgaWYoYnJhbmNoID09PSBjdXJyZW50VHlwZSkge1xuICAgICAgICAgICAgICAvLyBDdXJyZW50IG5vZGUgbWF0Y2hlcywgbW92ZSBpbnRvIHRoZSB0cmVlLlxuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHh4VHJlZVticmFuY2hdLCBpKzEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2ggPSB7fTtcbiAgICAgICAgICAgICAgaXNvbGF0ZWRCcmFuY2hbYnJhbmNoXSA9IHh4VHJlZVticmFuY2hdO1xuICAgICAgICAgICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHsgJyoqJzogaXNvbGF0ZWRCcmFuY2ggfSwgaSsxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAvLyBXZSBoYXZlIHJlYWNoZWQgdGhlIGVuZCBhbmQgc3RpbGwgb24gYSAnKionXG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlLCB0eXBlTGVuZ3RoKTtcbiAgICAgIH0gZWxzZSBpZih4eFRyZWVbJyonXSAmJiB4eFRyZWVbJyonXS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlWycqJ10sIHR5cGVMZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gIH1cblxuICBmdW5jdGlvbiBncm93TGlzdGVuZXJUcmVlKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICB0eXBlID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG5cbiAgICAvL1xuICAgIC8vIExvb2tzIGZvciB0d28gY29uc2VjdXRpdmUgJyoqJywgaWYgc28sIGRvbid0IGFkZCB0aGUgZXZlbnQgYXQgYWxsLlxuICAgIC8vXG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdHlwZS5sZW5ndGg7IGkrMSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZih0eXBlW2ldID09PSAnKionICYmIHR5cGVbaSsxXSA9PT0gJyoqJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSB0aGlzLmxpc3RlbmVyVHJlZTtcbiAgICB2YXIgbmFtZSA9IHR5cGUuc2hpZnQoKTtcblxuICAgIHdoaWxlIChuYW1lKSB7XG5cbiAgICAgIGlmICghdHJlZVtuYW1lXSkge1xuICAgICAgICB0cmVlW25hbWVdID0ge307XG4gICAgICB9XG5cbiAgICAgIHRyZWUgPSB0cmVlW25hbWVdO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPT09IDApIHtcblxuICAgICAgICBpZiAoIXRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IGxpc3RlbmVyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYodHlwZW9mIHRyZWUuX2xpc3RlbmVycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycyA9IFt0cmVlLl9saXN0ZW5lcnMsIGxpc3RlbmVyXTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc0FycmF5KHRyZWUuX2xpc3RlbmVycykpIHtcblxuICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzLndhcm5lZCkge1xuXG4gICAgICAgICAgICB2YXIgbSA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtID4gMCAmJiB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmVlLl9saXN0ZW5lcnMubGVuZ3RoKTtcbiAgICAgICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIG5hbWUgPSB0eXBlLnNoaWZ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuICAvLyAxMCBsaXN0ZW5lcnMgYXJlIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2hcbiAgLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4gIC8vXG4gIC8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuICAvLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmRlbGltaXRlciA9ICcuJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBuO1xuICAgIGlmICghdGhpcy5fY29uZikgdGhpcy5fY29uZiA9IHt9O1xuICAgIHRoaXMuX2NvbmYubWF4TGlzdGVuZXJzID0gbjtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmV2ZW50ID0gJyc7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgdGhpcy5tYW55KGV2ZW50LCAxLCBmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5tYW55ID0gZnVuY3Rpb24oZXZlbnQsIHR0bCwgZm4pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ21hbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpc3RlbmVyKCkge1xuICAgICAgaWYgKC0tdHRsID09PSAwKSB7XG4gICAgICAgIHNlbGYub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gICAgICB9XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxpc3RlbmVyLl9vcmlnaW4gPSBmbjtcblxuICAgIHRoaXMub24oZXZlbnQsIGxpc3RlbmVyKTtcblxuICAgIHJldHVybiBzZWxmO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdO1xuXG4gICAgaWYgKHR5cGUgPT09ICduZXdMaXN0ZW5lcicgJiYgIXRoaXMubmV3TGlzdGVuZXIpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cblxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgKl9hbGwqIGZ1bmN0aW9ucyBhbmQgaW52b2tlIHRoZW0uXG4gICAgaWYgKHRoaXMuX2FsbCkge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgZm9yIChpID0gMCwgbCA9IHRoaXMuX2FsbC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIHRoaXMuX2FsbFtpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gICAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcblxuICAgICAgaWYgKCF0aGlzLl9hbGwgJiZcbiAgICAgICAgIXRoaXMuX2V2ZW50cy5lcnJvciAmJlxuICAgICAgICAhKHRoaXMud2lsZGNhcmQgJiYgdGhpcy5saXN0ZW5lclRyZWUuZXJyb3IpKSB7XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50c1sxXSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuY2F1Z2h0LCB1bnNwZWNpZmllZCAnZXJyb3InIGV2ZW50LlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXI7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBoYW5kbGVyID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXIsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpXG4gICAgICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIC8vIHNsb3dlclxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSBpZiAoaGFuZGxlcikge1xuICAgICAgdmFyIGwgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkobCAtIDEpO1xuICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuZXZlbnQgPSB0eXBlO1xuICAgICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gKGxpc3RlbmVycy5sZW5ndGggPiAwKSB8fCAhIXRoaXMuX2FsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9hbGw7XG4gICAgfVxuXG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG5cbiAgICBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMub25BbnkodHlwZSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uIG9ubHkgYWNjZXB0cyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcblxuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgZ3Jvd0xpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIHR5cGUsIGxpc3RlbmVyKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB7XG4gICAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiB0aGlzLl9ldmVudHNbdHlwZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuICAgIH1cbiAgICBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuXG4gICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICBpZiAodHlwZW9mIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcblxuICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uQW55ID0gZnVuY3Rpb24oZm4pIHtcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb25Bbnkgb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmKCF0aGlzLl9hbGwpIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aGUgZnVuY3Rpb24gdG8gdGhlIGV2ZW50IGxpc3RlbmVyIGNvbGxlY3Rpb24uXG4gICAgdGhpcy5fYWxsLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZXJzLGxlYWZzPVtdO1xuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBsZWFmcyA9IHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIG51bGwsIG5zLCB0aGlzLmxpc3RlbmVyVHJlZSwgMCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gICAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG4gICAgICBoYW5kbGVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgIGxlYWZzLnB1c2goe19saXN0ZW5lcnM6aGFuZGxlcnN9KTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgaGFuZGxlcnMgPSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICBpZiAoaXNBcnJheShoYW5kbGVycykpIHtcblxuICAgICAgICB2YXIgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoaGFuZGxlcnNbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0ubGlzdGVuZXIgJiYgaGFuZGxlcnNbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAgICAgKGhhbmRsZXJzW2ldLl9vcmlnaW4gJiYgaGFuZGxlcnNbaV0uX29yaWdpbiA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgbGVhZi5fbGlzdGVuZXJzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGhhbmRsZXJzID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAoaGFuZGxlcnMubGlzdGVuZXIgJiYgaGFuZGxlcnMubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB8fFxuICAgICAgICAoaGFuZGxlcnMuX29yaWdpbiAmJiBoYW5kbGVycy5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgICAgIGRlbGV0ZSBsZWFmLl9saXN0ZW5lcnM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmQW55ID0gZnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgaSA9IDAsIGwgPSAwLCBmbnM7XG4gICAgaWYgKGZuICYmIHRoaXMuX2FsbCAmJiB0aGlzLl9hbGwubGVuZ3RoID4gMCkge1xuICAgICAgZm5zID0gdGhpcy5fYWxsO1xuICAgICAgZm9yKGkgPSAwLCBsID0gZm5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihmbiA9PT0gZm5zW2ldKSB7XG4gICAgICAgICAgZm5zLnNwbGljZShpLCAxKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9hbGwgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAhdGhpcy5fZXZlbnRzIHx8IGluaXQuY2FsbCh0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgdmFyIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcblxuICAgICAgZm9yICh2YXIgaUxlYWY9MDsgaUxlYWY8bGVhZnMubGVuZ3RoOyBpTGVhZisrKSB7XG4gICAgICAgIHZhciBsZWFmID0gbGVhZnNbaUxlYWZdO1xuICAgICAgICBsZWFmLl9saXN0ZW5lcnMgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIHZhciBoYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBoYW5kbGVycywgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICAgIHJldHVybiBoYW5kbGVycztcbiAgICB9XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICAgIGlmICghaXNBcnJheSh0aGlzLl9ldmVudHNbdHlwZV0pKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyc0FueSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYodGhpcy5fYWxsKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRXZlbnRFbWl0dGVyO1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIC8vIENvbW1vbkpTXG4gICAgZXhwb3J0cy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG4gIGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsLlxuICAgIHdpbmRvdy5FdmVudEVtaXR0ZXIyID0gRXZlbnRFbWl0dGVyO1xuICB9XG59KCk7XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS43LjFcbihmdW5jdGlvbigpIHtcbiAgdmFyIGdldE5hbm9TZWNvbmRzLCBocnRpbWUsIGxvYWRUaW1lO1xuXG4gIGlmICgodHlwZW9mIHBlcmZvcm1hbmNlICE9PSBcInVuZGVmaW5lZFwiICYmIHBlcmZvcm1hbmNlICE9PSBudWxsKSAmJiBwZXJmb3JtYW5jZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MgIT09IG51bGwpICYmIHByb2Nlc3MuaHJ0aW1lKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZ2V0TmFub1NlY29uZHMoKSAtIGxvYWRUaW1lKSAvIDFlNjtcbiAgICB9O1xuICAgIGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lO1xuICAgIGdldE5hbm9TZWNvbmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaHI7XG4gICAgICBociA9IGhydGltZSgpO1xuICAgICAgcmV0dXJuIGhyWzBdICogMWU5ICsgaHJbMV07XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IGdldE5hbm9TZWNvbmRzKCk7XG4gIH0gZWxzZSBpZiAoRGF0ZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gRGF0ZS5ub3coKTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG4iLCJ2YXIgbm93ID0gcmVxdWlyZSgncGVyZm9ybWFuY2Utbm93JylcbiAgLCByb290ID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gcm9vdFsncmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgY2FmID0gcm9vdFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgcm9vdFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG5cbmZvcih2YXIgaSA9IDA7ICFyYWYgJiYgaSA8IHZlbmRvcnMubGVuZ3RoOyBpKyspIHtcbiAgcmFmID0gcm9vdFt2ZW5kb3JzW2ldICsgJ1JlcXVlc3QnICsgc3VmZml4XVxuICBjYWYgPSByb290W3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IHJvb3RbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICByZXR1cm4gcmFmLmNhbGwocm9vdCwgZm4pXG59XG5tb2R1bGUuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgY2FmLmFwcGx5KHJvb3QsIGFyZ3VtZW50cylcbn1cbm1vZHVsZS5leHBvcnRzLnBvbHlmaWxsID0gZnVuY3Rpb24oKSB7XG4gIHJvb3QucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gcmFmXG4gIHJvb3QuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSBjYWZcbn1cbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Cb2R5YCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBib2R5IG1vZGVscy5cbiogQSBgTWF0dGVyLkJvZHlgIGlzIGEgcmlnaWQgYm9keSB0aGF0IGNhbiBiZSBzaW11bGF0ZWQgYnkgYSBgTWF0dGVyLkVuZ2luZWAuXG4qIEZhY3RvcmllcyBmb3IgY29tbW9ubHkgdXNlZCBib2R5IGNvbmZpZ3VyYXRpb25zIChzdWNoIGFzIHJlY3RhbmdsZXMsIGNpcmNsZXMgYW5kIG90aGVyIHBvbHlnb25zKSBjYW4gYmUgZm91bmQgaW4gdGhlIG1vZHVsZSBgTWF0dGVyLkJvZGllc2AuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG5cbiogQGNsYXNzIEJvZHlcbiovXG5cbnZhciBCb2R5ID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQm9keTtcblxudmFyIFZlcnRpY2VzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVydGljZXMnKTtcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbnZhciBTbGVlcGluZyA9IHJlcXVpcmUoJy4uL2NvcmUvU2xlZXBpbmcnKTtcbnZhciBSZW5kZXIgPSByZXF1aXJlKCcuLi9yZW5kZXIvUmVuZGVyJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBCb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcbnZhciBBeGVzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQXhlcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICBCb2R5Ll9pbmVydGlhU2NhbGUgPSA0O1xuICAgIEJvZHkuX25leHRDb2xsaWRpbmdHcm91cElkID0gMTtcbiAgICBCb2R5Ll9uZXh0Tm9uQ29sbGlkaW5nR3JvdXBJZCA9IC0xO1xuICAgIEJvZHkuX25leHRDYXRlZ29yeSA9IDB4MDAwMTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmlnaWQgYm9keSBtb2RlbC4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogQWxsIHByb3BlcnRpZXMgaGF2ZSBkZWZhdWx0IHZhbHVlcywgYW5kIG1hbnkgYXJlIHByZS1jYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gb3RoZXIgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtib2R5fSBib2R5XG4gICAgICovXG4gICAgQm9keS5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGlkOiBDb21tb24ubmV4dElkKCksXG4gICAgICAgICAgICB0eXBlOiAnYm9keScsXG4gICAgICAgICAgICBsYWJlbDogJ0JvZHknLFxuICAgICAgICAgICAgcGFydHM6IFtdLFxuICAgICAgICAgICAgYW5nbGU6IDAsXG4gICAgICAgICAgICB2ZXJ0aWNlczogVmVydGljZXMuZnJvbVBhdGgoJ0wgMCAwIEwgNDAgMCBMIDQwIDQwIEwgMCA0MCcpLFxuICAgICAgICAgICAgcG9zaXRpb246IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgZm9yY2U6IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgdG9ycXVlOiAwLFxuICAgICAgICAgICAgcG9zaXRpb25JbXB1bHNlOiB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIGNvbnN0cmFpbnRJbXB1bHNlOiB7IHg6IDAsIHk6IDAsIGFuZ2xlOiAwIH0sXG4gICAgICAgICAgICB0b3RhbENvbnRhY3RzOiAwLFxuICAgICAgICAgICAgc3BlZWQ6IDAsXG4gICAgICAgICAgICBhbmd1bGFyU3BlZWQ6IDAsXG4gICAgICAgICAgICB2ZWxvY2l0eTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBhbmd1bGFyVmVsb2NpdHk6IDAsXG4gICAgICAgICAgICBpc1NlbnNvcjogZmFsc2UsXG4gICAgICAgICAgICBpc1N0YXRpYzogZmFsc2UsXG4gICAgICAgICAgICBpc1NsZWVwaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIG1vdGlvbjogMCxcbiAgICAgICAgICAgIHNsZWVwVGhyZXNob2xkOiA2MCxcbiAgICAgICAgICAgIGRlbnNpdHk6IDAuMDAxLFxuICAgICAgICAgICAgcmVzdGl0dXRpb246IDAsXG4gICAgICAgICAgICBmcmljdGlvbjogMC4xLFxuICAgICAgICAgICAgZnJpY3Rpb25TdGF0aWM6IDAuNSxcbiAgICAgICAgICAgIGZyaWN0aW9uQWlyOiAwLjAxLFxuICAgICAgICAgICAgY29sbGlzaW9uRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IDB4MDAwMSxcbiAgICAgICAgICAgICAgICBtYXNrOiAweEZGRkZGRkZGLFxuICAgICAgICAgICAgICAgIGdyb3VwOiAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2xvcDogMC4wNSxcbiAgICAgICAgICAgIHRpbWVTY2FsZTogMSxcbiAgICAgICAgICAgIHJlbmRlcjoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IHRydWUsXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgICAgICBzcHJpdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgeFNjYWxlOiAxLFxuICAgICAgICAgICAgICAgICAgICB5U2NhbGU6IDEsXG4gICAgICAgICAgICAgICAgICAgIHhPZmZzZXQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHlPZmZzZXQ6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpbmVXaWR0aDogMS41XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGJvZHkgPSBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICBfaW5pdFByb3BlcnRpZXMoYm9keSwgb3B0aW9ucyk7XG5cbiAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG5leHQgdW5pcXVlIGdyb3VwIGluZGV4IGZvciB3aGljaCBib2RpZXMgd2lsbCBjb2xsaWRlLlxuICAgICAqIElmIGBpc05vbkNvbGxpZGluZ2AgaXMgYHRydWVgLCByZXR1cm5zIHRoZSBuZXh0IHVuaXF1ZSBncm91cCBpbmRleCBmb3Igd2hpY2ggYm9kaWVzIHdpbGwgX25vdF8gY29sbGlkZS5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAbWV0aG9kIG5leHRHcm91cFxuICAgICAqIEBwYXJhbSB7Ym9vbH0gW2lzTm9uQ29sbGlkaW5nPWZhbHNlXVxuICAgICAqIEByZXR1cm4ge051bWJlcn0gVW5pcXVlIGdyb3VwIGluZGV4XG4gICAgICovXG4gICAgQm9keS5uZXh0R3JvdXAgPSBmdW5jdGlvbihpc05vbkNvbGxpZGluZykge1xuICAgICAgICBpZiAoaXNOb25Db2xsaWRpbmcpXG4gICAgICAgICAgICByZXR1cm4gQm9keS5fbmV4dE5vbkNvbGxpZGluZ0dyb3VwSWQtLTtcblxuICAgICAgICByZXR1cm4gQm9keS5fbmV4dENvbGxpZGluZ0dyb3VwSWQrKztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbmV4dCB1bmlxdWUgY2F0ZWdvcnkgYml0ZmllbGQgKHN0YXJ0aW5nIGFmdGVyIHRoZSBpbml0aWFsIGRlZmF1bHQgY2F0ZWdvcnkgYDB4MDAwMWApLlxuICAgICAqIFRoZXJlIGFyZSAzMiBhdmFpbGFibGUuIFNlZSBgYm9keS5jb2xsaXNpb25GaWx0ZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqIEBtZXRob2QgbmV4dENhdGVnb3J5XG4gICAgICogQHJldHVybiB7TnVtYmVyfSBVbmlxdWUgY2F0ZWdvcnkgYml0ZmllbGRcbiAgICAgKi9cbiAgICBCb2R5Lm5leHRDYXRlZ29yeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBCb2R5Ll9uZXh0Q2F0ZWdvcnkgPSBCb2R5Ll9uZXh0Q2F0ZWdvcnkgPDwgMTtcbiAgICAgICAgcmV0dXJuIEJvZHkuX25leHRDYXRlZ29yeTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGlzZXMgYm9keSBwcm9wZXJ0aWVzLlxuICAgICAqIEBtZXRob2QgX2luaXRQcm9wZXJ0aWVzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge30gb3B0aW9uc1xuICAgICAqL1xuICAgIHZhciBfaW5pdFByb3BlcnRpZXMgPSBmdW5jdGlvbihib2R5LCBvcHRpb25zKSB7XG4gICAgICAgIC8vIGluaXQgcmVxdWlyZWQgcHJvcGVydGllcyAob3JkZXIgaXMgaW1wb3J0YW50KVxuICAgICAgICBCb2R5LnNldChib2R5LCB7XG4gICAgICAgICAgICBib3VuZHM6IGJvZHkuYm91bmRzIHx8IEJvdW5kcy5jcmVhdGUoYm9keS52ZXJ0aWNlcyksXG4gICAgICAgICAgICBwb3NpdGlvblByZXY6IGJvZHkucG9zaXRpb25QcmV2IHx8IFZlY3Rvci5jbG9uZShib2R5LnBvc2l0aW9uKSxcbiAgICAgICAgICAgIGFuZ2xlUHJldjogYm9keS5hbmdsZVByZXYgfHwgYm9keS5hbmdsZSxcbiAgICAgICAgICAgIHZlcnRpY2VzOiBib2R5LnZlcnRpY2VzLFxuICAgICAgICAgICAgcGFydHM6IGJvZHkucGFydHMgfHwgW2JvZHldLFxuICAgICAgICAgICAgaXNTdGF0aWM6IGJvZHkuaXNTdGF0aWMsXG4gICAgICAgICAgICBpc1NsZWVwaW5nOiBib2R5LmlzU2xlZXBpbmcsXG4gICAgICAgICAgICBwYXJlbnQ6IGJvZHkucGFyZW50IHx8IGJvZHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgVmVydGljZXMucm90YXRlKGJvZHkudmVydGljZXMsIGJvZHkuYW5nbGUsIGJvZHkucG9zaXRpb24pO1xuICAgICAgICBBeGVzLnJvdGF0ZShib2R5LmF4ZXMsIGJvZHkuYW5nbGUpO1xuICAgICAgICBCb3VuZHMudXBkYXRlKGJvZHkuYm91bmRzLCBib2R5LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcblxuICAgICAgICAvLyBhbGxvdyBvcHRpb25zIHRvIG92ZXJyaWRlIHRoZSBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgcHJvcGVydGllc1xuICAgICAgICBCb2R5LnNldChib2R5LCB7XG4gICAgICAgICAgICBheGVzOiBvcHRpb25zLmF4ZXMgfHwgYm9keS5heGVzLFxuICAgICAgICAgICAgYXJlYTogb3B0aW9ucy5hcmVhIHx8IGJvZHkuYXJlYSxcbiAgICAgICAgICAgIG1hc3M6IG9wdGlvbnMubWFzcyB8fCBib2R5Lm1hc3MsXG4gICAgICAgICAgICBpbmVydGlhOiBvcHRpb25zLmluZXJ0aWEgfHwgYm9keS5pbmVydGlhXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHJlbmRlciBwcm9wZXJ0aWVzXG4gICAgICAgIHZhciBkZWZhdWx0RmlsbFN0eWxlID0gKGJvZHkuaXNTdGF0aWMgPyAnI2VlZWVlZScgOiBDb21tb24uY2hvb3NlKFsnIzU1NjI3MCcsICcjNEVDREM0JywgJyNDN0Y0NjQnLCAnI0ZGNkI2QicsICcjQzQ0RDU4J10pKSxcbiAgICAgICAgICAgIGRlZmF1bHRTdHJva2VTdHlsZSA9IENvbW1vbi5zaGFkZUNvbG9yKGRlZmF1bHRGaWxsU3R5bGUsIC0yMCk7XG4gICAgICAgIGJvZHkucmVuZGVyLmZpbGxTdHlsZSA9IGJvZHkucmVuZGVyLmZpbGxTdHlsZSB8fCBkZWZhdWx0RmlsbFN0eWxlO1xuICAgICAgICBib2R5LnJlbmRlci5zdHJva2VTdHlsZSA9IGJvZHkucmVuZGVyLnN0cm9rZVN0eWxlIHx8IGRlZmF1bHRTdHJva2VTdHlsZTtcbiAgICAgICAgYm9keS5yZW5kZXIuc3ByaXRlLnhPZmZzZXQgKz0gLShib2R5LmJvdW5kcy5taW4ueCAtIGJvZHkucG9zaXRpb24ueCkgLyAoYm9keS5ib3VuZHMubWF4LnggLSBib2R5LmJvdW5kcy5taW4ueCk7XG4gICAgICAgIGJvZHkucmVuZGVyLnNwcml0ZS55T2Zmc2V0ICs9IC0oYm9keS5ib3VuZHMubWluLnkgLSBib2R5LnBvc2l0aW9uLnkpIC8gKGJvZHkuYm91bmRzLm1heC55IC0gYm9keS5ib3VuZHMubWluLnkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIHByb3BlcnR5IGFuZCBhIHZhbHVlIChvciBtYXAgb2YpLCBzZXRzIHRoZSBwcm9wZXJ0eShzKSBvbiB0aGUgYm9keSwgdXNpbmcgdGhlIGFwcHJvcHJpYXRlIHNldHRlciBmdW5jdGlvbnMgaWYgdGhleSBleGlzdC5cbiAgICAgKiBQcmVmZXIgdG8gdXNlIHRoZSBhY3R1YWwgc2V0dGVyIGZ1bmN0aW9ucyBpbiBwZXJmb3JtYW5jZSBjcml0aWNhbCBzaXR1YXRpb25zLlxuICAgICAqIEBtZXRob2Qgc2V0XG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHt9IHNldHRpbmdzIEEgcHJvcGVydHkgbmFtZSAob3IgbWFwIG9mIHByb3BlcnRpZXMgYW5kIHZhbHVlcykgdG8gc2V0IG9uIHRoZSBib2R5LlxuICAgICAqIEBwYXJhbSB7fSB2YWx1ZSBUaGUgdmFsdWUgdG8gc2V0IGlmIGBzZXR0aW5nc2AgaXMgYSBzaW5nbGUgcHJvcGVydHkgbmFtZS5cbiAgICAgKi9cbiAgICBCb2R5LnNldCA9IGZ1bmN0aW9uKGJvZHksIHNldHRpbmdzLCB2YWx1ZSkge1xuICAgICAgICB2YXIgcHJvcGVydHk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBzZXR0aW5ncyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gc2V0dGluZ3M7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IHt9O1xuICAgICAgICAgICAgc2V0dGluZ3NbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHByb3BlcnR5IGluIHNldHRpbmdzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHNldHRpbmdzW3Byb3BlcnR5XTtcblxuICAgICAgICAgICAgaWYgKCFzZXR0aW5ncy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIHN3aXRjaCAocHJvcGVydHkpIHtcblxuICAgICAgICAgICAgY2FzZSAnaXNTdGF0aWMnOlxuICAgICAgICAgICAgICAgIEJvZHkuc2V0U3RhdGljKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2lzU2xlZXBpbmcnOlxuICAgICAgICAgICAgICAgIFNsZWVwaW5nLnNldChib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtYXNzJzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldE1hc3MoYm9keSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVuc2l0eSc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXREZW5zaXR5KGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2luZXJ0aWEnOlxuICAgICAgICAgICAgICAgIEJvZHkuc2V0SW5lcnRpYShib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd2ZXJ0aWNlcyc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRWZXJ0aWNlcyhib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdwb3NpdGlvbic6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRQb3NpdGlvbihib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhbmdsZSc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRBbmdsZShib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd2ZWxvY2l0eSc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRWZWxvY2l0eShib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhbmd1bGFyVmVsb2NpdHknOlxuICAgICAgICAgICAgICAgIEJvZHkuc2V0QW5ndWxhclZlbG9jaXR5KGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3BhcnRzJzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldFBhcnRzKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYm9keVtwcm9wZXJ0eV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGJvZHkgYXMgc3RhdGljLCBpbmNsdWRpbmcgaXNTdGF0aWMgZmxhZyBhbmQgc2V0dGluZyBtYXNzIGFuZCBpbmVydGlhIHRvIEluZmluaXR5LlxuICAgICAqIEBtZXRob2Qgc2V0U3RhdGljXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtib29sfSBpc1N0YXRpY1xuICAgICAqL1xuICAgIEJvZHkuc2V0U3RhdGljID0gZnVuY3Rpb24oYm9keSwgaXNTdGF0aWMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2R5LnBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IGJvZHkucGFydHNbaV07XG4gICAgICAgICAgICBwYXJ0LmlzU3RhdGljID0gaXNTdGF0aWM7XG5cbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xuICAgICAgICAgICAgICAgIHBhcnQucmVzdGl0dXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIHBhcnQuZnJpY3Rpb24gPSAxO1xuICAgICAgICAgICAgICAgIHBhcnQubWFzcyA9IHBhcnQuaW5lcnRpYSA9IHBhcnQuZGVuc2l0eSA9IEluZmluaXR5O1xuICAgICAgICAgICAgICAgIHBhcnQuaW52ZXJzZU1hc3MgPSBwYXJ0LmludmVyc2VJbmVydGlhID0gMDtcblxuICAgICAgICAgICAgICAgIHBhcnQucG9zaXRpb25QcmV2LnggPSBwYXJ0LnBvc2l0aW9uLng7XG4gICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvblByZXYueSA9IHBhcnQucG9zaXRpb24ueTtcbiAgICAgICAgICAgICAgICBwYXJ0LmFuZ2xlUHJldiA9IHBhcnQuYW5nbGU7XG4gICAgICAgICAgICAgICAgcGFydC5hbmd1bGFyVmVsb2NpdHkgPSAwO1xuICAgICAgICAgICAgICAgIHBhcnQuc3BlZWQgPSAwO1xuICAgICAgICAgICAgICAgIHBhcnQuYW5ndWxhclNwZWVkID0gMDtcbiAgICAgICAgICAgICAgICBwYXJ0Lm1vdGlvbiA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgbWFzcyBvZiB0aGUgYm9keS4gSW52ZXJzZSBtYXNzIGFuZCBkZW5zaXR5IGFyZSBhdXRvbWF0aWNhbGx5IHVwZGF0ZWQgdG8gcmVmbGVjdCB0aGUgY2hhbmdlLlxuICAgICAqIEBtZXRob2Qgc2V0TWFzc1xuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXNzXG4gICAgICovXG4gICAgQm9keS5zZXRNYXNzID0gZnVuY3Rpb24oYm9keSwgbWFzcykge1xuICAgICAgICBib2R5Lm1hc3MgPSBtYXNzO1xuICAgICAgICBib2R5LmludmVyc2VNYXNzID0gMSAvIGJvZHkubWFzcztcbiAgICAgICAgYm9keS5kZW5zaXR5ID0gYm9keS5tYXNzIC8gYm9keS5hcmVhO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBkZW5zaXR5IG9mIHRoZSBib2R5LiBNYXNzIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBjaGFuZ2UuXG4gICAgICogQG1ldGhvZCBzZXREZW5zaXR5XG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlbnNpdHlcbiAgICAgKi9cbiAgICBCb2R5LnNldERlbnNpdHkgPSBmdW5jdGlvbihib2R5LCBkZW5zaXR5KSB7XG4gICAgICAgIEJvZHkuc2V0TWFzcyhib2R5LCBkZW5zaXR5ICogYm9keS5hcmVhKTtcbiAgICAgICAgYm9keS5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgbW9tZW50IG9mIGluZXJ0aWEgKGkuZS4gc2Vjb25kIG1vbWVudCBvZiBhcmVhKSBvZiB0aGUgYm9keSBvZiB0aGUgYm9keS4gXG4gICAgICogSW52ZXJzZSBpbmVydGlhIGlzIGF1dG9tYXRpY2FsbHkgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBjaGFuZ2UuIE1hc3MgaXMgbm90IGNoYW5nZWQuXG4gICAgICogQG1ldGhvZCBzZXRJbmVydGlhXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZXJ0aWFcbiAgICAgKi9cbiAgICBCb2R5LnNldEluZXJ0aWEgPSBmdW5jdGlvbihib2R5LCBpbmVydGlhKSB7XG4gICAgICAgIGJvZHkuaW5lcnRpYSA9IGluZXJ0aWE7XG4gICAgICAgIGJvZHkuaW52ZXJzZUluZXJ0aWEgPSAxIC8gYm9keS5pbmVydGlhO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBib2R5J3MgdmVydGljZXMgYW5kIHVwZGF0ZXMgYm9keSBwcm9wZXJ0aWVzIGFjY29yZGluZ2x5LCBpbmNsdWRpbmcgaW5lcnRpYSwgYXJlYSBhbmQgbWFzcyAod2l0aCByZXNwZWN0IHRvIGBib2R5LmRlbnNpdHlgKS5cbiAgICAgKiBWZXJ0aWNlcyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgdHJhbnNmb3JtZWQgdG8gYmUgb3JpZW50YXRlZCBhcm91bmQgdGhlaXIgY2VudHJlIG9mIG1hc3MgYXMgdGhlIG9yaWdpbi5cbiAgICAgKiBUaGV5IGFyZSB0aGVuIGF1dG9tYXRpY2FsbHkgdHJhbnNsYXRlZCB0byB3b3JsZCBzcGFjZSBiYXNlZCBvbiBgYm9keS5wb3NpdGlvbmAuXG4gICAgICpcbiAgICAgKiBUaGUgYHZlcnRpY2VzYCBhcmd1bWVudCBzaG91bGQgYmUgcGFzc2VkIGFzIGFuIGFycmF5IG9mIGBNYXR0ZXIuVmVjdG9yYCBwb2ludHMgKG9yIGEgYE1hdHRlci5WZXJ0aWNlc2AgYXJyYXkpLlxuICAgICAqIFZlcnRpY2VzIG11c3QgZm9ybSBhIGNvbnZleCBodWxsLCBjb25jYXZlIGh1bGxzIGFyZSBub3Qgc3VwcG9ydGVkLlxuICAgICAqXG4gICAgICogQG1ldGhvZCBzZXRWZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7dmVjdG9yW119IHZlcnRpY2VzXG4gICAgICovXG4gICAgQm9keS5zZXRWZXJ0aWNlcyA9IGZ1bmN0aW9uKGJvZHksIHZlcnRpY2VzKSB7XG4gICAgICAgIC8vIGNoYW5nZSB2ZXJ0aWNlc1xuICAgICAgICBpZiAodmVydGljZXNbMF0uYm9keSA9PT0gYm9keSkge1xuICAgICAgICAgICAgYm9keS52ZXJ0aWNlcyA9IHZlcnRpY2VzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9keS52ZXJ0aWNlcyA9IFZlcnRpY2VzLmNyZWF0ZSh2ZXJ0aWNlcywgYm9keSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGUgcHJvcGVydGllc1xuICAgICAgICBib2R5LmF4ZXMgPSBBeGVzLmZyb21WZXJ0aWNlcyhib2R5LnZlcnRpY2VzKTtcbiAgICAgICAgYm9keS5hcmVhID0gVmVydGljZXMuYXJlYShib2R5LnZlcnRpY2VzKTtcbiAgICAgICAgQm9keS5zZXRNYXNzKGJvZHksIGJvZHkuZGVuc2l0eSAqIGJvZHkuYXJlYSk7XG5cbiAgICAgICAgLy8gb3JpZW50IHZlcnRpY2VzIGFyb3VuZCB0aGUgY2VudHJlIG9mIG1hc3MgYXQgb3JpZ2luICgwLCAwKVxuICAgICAgICB2YXIgY2VudHJlID0gVmVydGljZXMuY2VudHJlKGJvZHkudmVydGljZXMpO1xuICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUoYm9keS52ZXJ0aWNlcywgY2VudHJlLCAtMSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGluZXJ0aWEgd2hpbGUgdmVydGljZXMgYXJlIGF0IG9yaWdpbiAoMCwgMClcbiAgICAgICAgQm9keS5zZXRJbmVydGlhKGJvZHksIEJvZHkuX2luZXJ0aWFTY2FsZSAqIFZlcnRpY2VzLmluZXJ0aWEoYm9keS52ZXJ0aWNlcywgYm9keS5tYXNzKSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGdlb21ldHJ5XG4gICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShib2R5LnZlcnRpY2VzLCBib2R5LnBvc2l0aW9uKTtcbiAgICAgICAgQm91bmRzLnVwZGF0ZShib2R5LmJvdW5kcywgYm9keS52ZXJ0aWNlcywgYm9keS52ZWxvY2l0eSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIHBhcnRzIG9mIHRoZSBgYm9keWAgYW5kIHVwZGF0ZXMgbWFzcywgaW5lcnRpYSBhbmQgY2VudHJvaWQuXG4gICAgICogRWFjaCBwYXJ0IHdpbGwgaGF2ZSBpdHMgcGFyZW50IHNldCB0byBgYm9keWAuXG4gICAgICogQnkgZGVmYXVsdCB0aGUgY29udmV4IGh1bGwgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IGNvbXB1dGVkIGFuZCBzZXQgb24gYGJvZHlgLCB1bmxlc3MgYGF1dG9IdWxsYCBpcyBzZXQgdG8gYGZhbHNlLmBcbiAgICAgKiBOb3RlIHRoYXQgdGhpcyBtZXRob2Qgd2lsbCBlbnN1cmUgdGhhdCB0aGUgZmlyc3QgcGFydCBpbiBgYm9keS5wYXJ0c2Agd2lsbCBhbHdheXMgYmUgdGhlIGBib2R5YC5cbiAgICAgKiBAbWV0aG9kIHNldFBhcnRzXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIFtib2R5XSBwYXJ0c1xuICAgICAqIEBwYXJhbSB7Ym9vbH0gW2F1dG9IdWxsPXRydWVdXG4gICAgICovXG4gICAgQm9keS5zZXRQYXJ0cyA9IGZ1bmN0aW9uKGJvZHksIHBhcnRzLCBhdXRvSHVsbCkge1xuICAgICAgICB2YXIgaTtcblxuICAgICAgICAvLyBhZGQgYWxsIHRoZSBwYXJ0cywgZW5zdXJpbmcgdGhhdCB0aGUgZmlyc3QgcGFydCBpcyBhbHdheXMgdGhlIHBhcmVudCBib2R5XG4gICAgICAgIHBhcnRzID0gcGFydHMuc2xpY2UoMCk7XG4gICAgICAgIGJvZHkucGFydHMubGVuZ3RoID0gMDtcbiAgICAgICAgYm9keS5wYXJ0cy5wdXNoKGJvZHkpO1xuICAgICAgICBib2R5LnBhcmVudCA9IGJvZHk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2ldO1xuICAgICAgICAgICAgaWYgKHBhcnQgIT09IGJvZHkpIHtcbiAgICAgICAgICAgICAgICBwYXJ0LnBhcmVudCA9IGJvZHk7XG4gICAgICAgICAgICAgICAgYm9keS5wYXJ0cy5wdXNoKHBhcnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJvZHkucGFydHMubGVuZ3RoID09PSAxKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGF1dG9IdWxsID0gdHlwZW9mIGF1dG9IdWxsICE9PSAndW5kZWZpbmVkJyA/IGF1dG9IdWxsIDogdHJ1ZTtcblxuICAgICAgICAvLyBmaW5kIHRoZSBjb252ZXggaHVsbCBvZiBhbGwgcGFydHMgdG8gc2V0IG9uIHRoZSBwYXJlbnQgYm9keVxuICAgICAgICBpZiAoYXV0b0h1bGwpIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNlcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5jb25jYXQocGFydHNbaV0udmVydGljZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBWZXJ0aWNlcy5jbG9ja3dpc2VTb3J0KHZlcnRpY2VzKTtcblxuICAgICAgICAgICAgdmFyIGh1bGwgPSBWZXJ0aWNlcy5odWxsKHZlcnRpY2VzKSxcbiAgICAgICAgICAgICAgICBodWxsQ2VudHJlID0gVmVydGljZXMuY2VudHJlKGh1bGwpO1xuXG4gICAgICAgICAgICBCb2R5LnNldFZlcnRpY2VzKGJvZHksIGh1bGwpO1xuICAgICAgICAgICAgVmVydGljZXMudHJhbnNsYXRlKGJvZHkudmVydGljZXMsIGh1bGxDZW50cmUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3VtIHRoZSBwcm9wZXJ0aWVzIG9mIGFsbCBjb21wb3VuZCBwYXJ0cyBvZiB0aGUgcGFyZW50IGJvZHlcbiAgICAgICAgdmFyIHRvdGFsID0gX3RvdGFsUHJvcGVydGllcyhib2R5KTtcblxuICAgICAgICBib2R5LmFyZWEgPSB0b3RhbC5hcmVhO1xuICAgICAgICBib2R5LnBhcmVudCA9IGJvZHk7XG4gICAgICAgIGJvZHkucG9zaXRpb24ueCA9IHRvdGFsLmNlbnRyZS54O1xuICAgICAgICBib2R5LnBvc2l0aW9uLnkgPSB0b3RhbC5jZW50cmUueTtcbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueCA9IHRvdGFsLmNlbnRyZS54O1xuICAgICAgICBib2R5LnBvc2l0aW9uUHJldi55ID0gdG90YWwuY2VudHJlLnk7XG5cbiAgICAgICAgQm9keS5zZXRNYXNzKGJvZHksIHRvdGFsLm1hc3MpO1xuICAgICAgICBCb2R5LnNldEluZXJ0aWEoYm9keSwgdG90YWwuaW5lcnRpYSk7XG4gICAgICAgIEJvZHkuc2V0UG9zaXRpb24oYm9keSwgdG90YWwuY2VudHJlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgcG9zaXRpb24gb2YgdGhlIGJvZHkgaW5zdGFudGx5LiBWZWxvY2l0eSwgYW5nbGUsIGZvcmNlIGV0Yy4gYXJlIHVuY2hhbmdlZC5cbiAgICAgKiBAbWV0aG9kIHNldFBvc2l0aW9uXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvc2l0aW9uXG4gICAgICovXG4gICAgQm9keS5zZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKGJvZHksIHBvc2l0aW9uKSB7XG4gICAgICAgIHZhciBkZWx0YSA9IFZlY3Rvci5zdWIocG9zaXRpb24sIGJvZHkucG9zaXRpb24pO1xuICAgICAgICBib2R5LnBvc2l0aW9uUHJldi54ICs9IGRlbHRhLng7XG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnkgKz0gZGVsdGEueTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHkucGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tpXTtcbiAgICAgICAgICAgIHBhcnQucG9zaXRpb24ueCArPSBkZWx0YS54O1xuICAgICAgICAgICAgcGFydC5wb3NpdGlvbi55ICs9IGRlbHRhLnk7XG4gICAgICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUocGFydC52ZXJ0aWNlcywgZGVsdGEpO1xuICAgICAgICAgICAgQm91bmRzLnVwZGF0ZShwYXJ0LmJvdW5kcywgcGFydC52ZXJ0aWNlcywgYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgYW5nbGUgb2YgdGhlIGJvZHkgaW5zdGFudGx5LiBBbmd1bGFyIHZlbG9jaXR5LCBwb3NpdGlvbiwgZm9yY2UgZXRjLiBhcmUgdW5jaGFuZ2VkLlxuICAgICAqIEBtZXRob2Qgc2V0QW5nbGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGVcbiAgICAgKi9cbiAgICBCb2R5LnNldEFuZ2xlID0gZnVuY3Rpb24oYm9keSwgYW5nbGUpIHtcbiAgICAgICAgdmFyIGRlbHRhID0gYW5nbGUgLSBib2R5LmFuZ2xlO1xuICAgICAgICBib2R5LmFuZ2xlUHJldiArPSBkZWx0YTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHkucGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tpXTtcbiAgICAgICAgICAgIHBhcnQuYW5nbGUgKz0gZGVsdGE7XG4gICAgICAgICAgICBWZXJ0aWNlcy5yb3RhdGUocGFydC52ZXJ0aWNlcywgZGVsdGEsIGJvZHkucG9zaXRpb24pO1xuICAgICAgICAgICAgQXhlcy5yb3RhdGUocGFydC5heGVzLCBkZWx0YSk7XG4gICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIFZlY3Rvci5yb3RhdGVBYm91dChwYXJ0LnBvc2l0aW9uLCBkZWx0YSwgYm9keS5wb3NpdGlvbiwgcGFydC5wb3NpdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgbGluZWFyIHZlbG9jaXR5IG9mIHRoZSBib2R5IGluc3RhbnRseS4gUG9zaXRpb24sIGFuZ2xlLCBmb3JjZSBldGMuIGFyZSB1bmNoYW5nZWQuIFNlZSBhbHNvIGBCb2R5LmFwcGx5Rm9yY2VgLlxuICAgICAqIEBtZXRob2Qgc2V0VmVsb2NpdHlcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVsb2NpdHlcbiAgICAgKi9cbiAgICBCb2R5LnNldFZlbG9jaXR5ID0gZnVuY3Rpb24oYm9keSwgdmVsb2NpdHkpIHtcbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueCA9IGJvZHkucG9zaXRpb24ueCAtIHZlbG9jaXR5Lng7XG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnkgPSBib2R5LnBvc2l0aW9uLnkgLSB2ZWxvY2l0eS55O1xuICAgICAgICBib2R5LnZlbG9jaXR5LnggPSB2ZWxvY2l0eS54O1xuICAgICAgICBib2R5LnZlbG9jaXR5LnkgPSB2ZWxvY2l0eS55O1xuICAgICAgICBib2R5LnNwZWVkID0gVmVjdG9yLm1hZ25pdHVkZShib2R5LnZlbG9jaXR5KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgYW5ndWxhciB2ZWxvY2l0eSBvZiB0aGUgYm9keSBpbnN0YW50bHkuIFBvc2l0aW9uLCBhbmdsZSwgZm9yY2UgZXRjLiBhcmUgdW5jaGFuZ2VkLiBTZWUgYWxzbyBgQm9keS5hcHBseUZvcmNlYC5cbiAgICAgKiBAbWV0aG9kIHNldEFuZ3VsYXJWZWxvY2l0eVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2ZWxvY2l0eVxuICAgICAqL1xuICAgIEJvZHkuc2V0QW5ndWxhclZlbG9jaXR5ID0gZnVuY3Rpb24oYm9keSwgdmVsb2NpdHkpIHtcbiAgICAgICAgYm9keS5hbmdsZVByZXYgPSBib2R5LmFuZ2xlIC0gdmVsb2NpdHk7XG4gICAgICAgIGJvZHkuYW5ndWxhclZlbG9jaXR5ID0gdmVsb2NpdHk7XG4gICAgICAgIGJvZHkuYW5ndWxhclNwZWVkID0gTWF0aC5hYnMoYm9keS5hbmd1bGFyVmVsb2NpdHkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyBhIGJvZHkgYnkgYSBnaXZlbiB2ZWN0b3IgcmVsYXRpdmUgdG8gaXRzIGN1cnJlbnQgcG9zaXRpb24sIHdpdGhvdXQgaW1wYXJ0aW5nIGFueSB2ZWxvY2l0eS5cbiAgICAgKiBAbWV0aG9kIHRyYW5zbGF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB0cmFuc2xhdGlvblxuICAgICAqL1xuICAgIEJvZHkudHJhbnNsYXRlID0gZnVuY3Rpb24oYm9keSwgdHJhbnNsYXRpb24pIHtcbiAgICAgICAgQm9keS5zZXRQb3NpdGlvbihib2R5LCBWZWN0b3IuYWRkKGJvZHkucG9zaXRpb24sIHRyYW5zbGF0aW9uKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJvdGF0ZXMgYSBib2R5IGJ5IGEgZ2l2ZW4gYW5nbGUgcmVsYXRpdmUgdG8gaXRzIGN1cnJlbnQgYW5nbGUsIHdpdGhvdXQgaW1wYXJ0aW5nIGFueSBhbmd1bGFyIHZlbG9jaXR5LlxuICAgICAqIEBtZXRob2Qgcm90YXRlXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvdGF0aW9uXG4gICAgICovXG4gICAgQm9keS5yb3RhdGUgPSBmdW5jdGlvbihib2R5LCByb3RhdGlvbikge1xuICAgICAgICBCb2R5LnNldEFuZ2xlKGJvZHksIGJvZHkuYW5nbGUgKyByb3RhdGlvbik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjYWxlcyB0aGUgYm9keSwgaW5jbHVkaW5nIHVwZGF0aW5nIHBoeXNpY2FsIHByb3BlcnRpZXMgKG1hc3MsIGFyZWEsIGF4ZXMsIGluZXJ0aWEpLCBmcm9tIGEgd29ybGQtc3BhY2UgcG9pbnQgKGRlZmF1bHQgaXMgYm9keSBjZW50cmUpLlxuICAgICAqIEBtZXRob2Qgc2NhbGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGVYXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjYWxlWVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBbcG9pbnRdXG4gICAgICovXG4gICAgQm9keS5zY2FsZSA9IGZ1bmN0aW9uKGJvZHksIHNjYWxlWCwgc2NhbGVZLCBwb2ludCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHkucGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tpXTtcblxuICAgICAgICAgICAgLy8gc2NhbGUgdmVydGljZXNcbiAgICAgICAgICAgIFZlcnRpY2VzLnNjYWxlKHBhcnQudmVydGljZXMsIHNjYWxlWCwgc2NhbGVZLCBib2R5LnBvc2l0aW9uKTtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIHBhcnQuYXhlcyA9IEF4ZXMuZnJvbVZlcnRpY2VzKHBhcnQudmVydGljZXMpO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgICAgICBwYXJ0LmFyZWEgPSBWZXJ0aWNlcy5hcmVhKHBhcnQudmVydGljZXMpO1xuICAgICAgICAgICAgICAgIEJvZHkuc2V0TWFzcyhwYXJ0LCBib2R5LmRlbnNpdHkgKiBwYXJ0LmFyZWEpO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIGluZXJ0aWEgKHJlcXVpcmVzIHZlcnRpY2VzIHRvIGJlIGF0IG9yaWdpbilcbiAgICAgICAgICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUocGFydC52ZXJ0aWNlcywgeyB4OiAtcGFydC5wb3NpdGlvbi54LCB5OiAtcGFydC5wb3NpdGlvbi55IH0pO1xuICAgICAgICAgICAgICAgIEJvZHkuc2V0SW5lcnRpYShwYXJ0LCBWZXJ0aWNlcy5pbmVydGlhKHBhcnQudmVydGljZXMsIHBhcnQubWFzcykpO1xuICAgICAgICAgICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShwYXJ0LnZlcnRpY2VzLCB7IHg6IHBhcnQucG9zaXRpb24ueCwgeTogcGFydC5wb3NpdGlvbi55IH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB1cGRhdGUgYm91bmRzXG4gICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGhhbmRsZSBjaXJjbGVzXG4gICAgICAgIGlmIChib2R5LmNpcmNsZVJhZGl1cykgeyBcbiAgICAgICAgICAgIGlmIChzY2FsZVggPT09IHNjYWxlWSkge1xuICAgICAgICAgICAgICAgIGJvZHkuY2lyY2xlUmFkaXVzICo9IHNjYWxlWDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gYm9keSBpcyBubyBsb25nZXIgYSBjaXJjbGVcbiAgICAgICAgICAgICAgICBib2R5LmNpcmNsZVJhZGl1cyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWJvZHkuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIHZhciB0b3RhbCA9IF90b3RhbFByb3BlcnRpZXMoYm9keSk7XG4gICAgICAgICAgICBib2R5LmFyZWEgPSB0b3RhbC5hcmVhO1xuICAgICAgICAgICAgQm9keS5zZXRNYXNzKGJvZHksIHRvdGFsLm1hc3MpO1xuICAgICAgICAgICAgQm9keS5zZXRJbmVydGlhKGJvZHksIHRvdGFsLmluZXJ0aWEpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGEgc2ltdWxhdGlvbiBzdGVwIGZvciB0aGUgZ2l2ZW4gYGJvZHlgLCBpbmNsdWRpbmcgdXBkYXRpbmcgcG9zaXRpb24gYW5kIGFuZ2xlIHVzaW5nIFZlcmxldCBpbnRlZ3JhdGlvbi5cbiAgICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWx0YVRpbWVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZVNjYWxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvcnJlY3Rpb25cbiAgICAgKi9cbiAgICBCb2R5LnVwZGF0ZSA9IGZ1bmN0aW9uKGJvZHksIGRlbHRhVGltZSwgdGltZVNjYWxlLCBjb3JyZWN0aW9uKSB7XG4gICAgICAgIHZhciBkZWx0YVRpbWVTcXVhcmVkID0gTWF0aC5wb3coZGVsdGFUaW1lICogdGltZVNjYWxlICogYm9keS50aW1lU2NhbGUsIDIpO1xuXG4gICAgICAgIC8vIGZyb20gdGhlIHByZXZpb3VzIHN0ZXBcbiAgICAgICAgdmFyIGZyaWN0aW9uQWlyID0gMSAtIGJvZHkuZnJpY3Rpb25BaXIgKiB0aW1lU2NhbGUgKiBib2R5LnRpbWVTY2FsZSxcbiAgICAgICAgICAgIHZlbG9jaXR5UHJldlggPSBib2R5LnBvc2l0aW9uLnggLSBib2R5LnBvc2l0aW9uUHJldi54LFxuICAgICAgICAgICAgdmVsb2NpdHlQcmV2WSA9IGJvZHkucG9zaXRpb24ueSAtIGJvZHkucG9zaXRpb25QcmV2Lnk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHZlbG9jaXR5IHdpdGggVmVybGV0IGludGVncmF0aW9uXG4gICAgICAgIGJvZHkudmVsb2NpdHkueCA9ICh2ZWxvY2l0eVByZXZYICogZnJpY3Rpb25BaXIgKiBjb3JyZWN0aW9uKSArIChib2R5LmZvcmNlLnggLyBib2R5Lm1hc3MpICogZGVsdGFUaW1lU3F1YXJlZDtcbiAgICAgICAgYm9keS52ZWxvY2l0eS55ID0gKHZlbG9jaXR5UHJldlkgKiBmcmljdGlvbkFpciAqIGNvcnJlY3Rpb24pICsgKGJvZHkuZm9yY2UueSAvIGJvZHkubWFzcykgKiBkZWx0YVRpbWVTcXVhcmVkO1xuXG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnggPSBib2R5LnBvc2l0aW9uLng7XG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnkgPSBib2R5LnBvc2l0aW9uLnk7XG4gICAgICAgIGJvZHkucG9zaXRpb24ueCArPSBib2R5LnZlbG9jaXR5Lng7XG4gICAgICAgIGJvZHkucG9zaXRpb24ueSArPSBib2R5LnZlbG9jaXR5Lnk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGFuZ3VsYXIgdmVsb2NpdHkgd2l0aCBWZXJsZXQgaW50ZWdyYXRpb25cbiAgICAgICAgYm9keS5hbmd1bGFyVmVsb2NpdHkgPSAoKGJvZHkuYW5nbGUgLSBib2R5LmFuZ2xlUHJldikgKiBmcmljdGlvbkFpciAqIGNvcnJlY3Rpb24pICsgKGJvZHkudG9ycXVlIC8gYm9keS5pbmVydGlhKSAqIGRlbHRhVGltZVNxdWFyZWQ7XG4gICAgICAgIGJvZHkuYW5nbGVQcmV2ID0gYm9keS5hbmdsZTtcbiAgICAgICAgYm9keS5hbmdsZSArPSBib2R5LmFuZ3VsYXJWZWxvY2l0eTtcblxuICAgICAgICAvLyB0cmFjayBzcGVlZCBhbmQgYWNjZWxlcmF0aW9uXG4gICAgICAgIGJvZHkuc3BlZWQgPSBWZWN0b3IubWFnbml0dWRlKGJvZHkudmVsb2NpdHkpO1xuICAgICAgICBib2R5LmFuZ3VsYXJTcGVlZCA9IE1hdGguYWJzKGJvZHkuYW5ndWxhclZlbG9jaXR5KTtcblxuICAgICAgICAvLyB0cmFuc2Zvcm0gdGhlIGJvZHkgZ2VvbWV0cnlcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2R5LnBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IGJvZHkucGFydHNbaV07XG5cbiAgICAgICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvbi54ICs9IGJvZHkudmVsb2NpdHkueDtcbiAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnkgKz0gYm9keS52ZWxvY2l0eS55O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYm9keS5hbmd1bGFyVmVsb2NpdHkgIT09IDApIHtcbiAgICAgICAgICAgICAgICBWZXJ0aWNlcy5yb3RhdGUocGFydC52ZXJ0aWNlcywgYm9keS5hbmd1bGFyVmVsb2NpdHksIGJvZHkucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIEF4ZXMucm90YXRlKHBhcnQuYXhlcywgYm9keS5hbmd1bGFyVmVsb2NpdHkpO1xuICAgICAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBWZWN0b3Iucm90YXRlQWJvdXQocGFydC5wb3NpdGlvbiwgYm9keS5hbmd1bGFyVmVsb2NpdHksIGJvZHkucG9zaXRpb24sIHBhcnQucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQm91bmRzLnVwZGF0ZShwYXJ0LmJvdW5kcywgcGFydC52ZXJ0aWNlcywgYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyBhIGZvcmNlIHRvIGEgYm9keSBmcm9tIGEgZ2l2ZW4gd29ybGQtc3BhY2UgcG9zaXRpb24sIGluY2x1ZGluZyByZXN1bHRpbmcgdG9ycXVlLlxuICAgICAqIEBtZXRob2QgYXBwbHlGb3JjZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBwb3NpdGlvblxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBmb3JjZVxuICAgICAqL1xuICAgIEJvZHkuYXBwbHlGb3JjZSA9IGZ1bmN0aW9uKGJvZHksIHBvc2l0aW9uLCBmb3JjZSkge1xuICAgICAgICBib2R5LmZvcmNlLnggKz0gZm9yY2UueDtcbiAgICAgICAgYm9keS5mb3JjZS55ICs9IGZvcmNlLnk7XG4gICAgICAgIHZhciBvZmZzZXQgPSB7IHg6IHBvc2l0aW9uLnggLSBib2R5LnBvc2l0aW9uLngsIHk6IHBvc2l0aW9uLnkgLSBib2R5LnBvc2l0aW9uLnkgfTtcbiAgICAgICAgYm9keS50b3JxdWUgKz0gb2Zmc2V0LnggKiBmb3JjZS55IC0gb2Zmc2V0LnkgKiBmb3JjZS54O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzdW1zIG9mIHRoZSBwcm9wZXJ0aWVzIG9mIGFsbCBjb21wb3VuZCBwYXJ0cyBvZiB0aGUgcGFyZW50IGJvZHkuXG4gICAgICogQG1ldGhvZCBfdG90YWxQcm9wZXJ0aWVzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcmV0dXJuIHt9XG4gICAgICovXG4gICAgdmFyIF90b3RhbFByb3BlcnRpZXMgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIC8vIGh0dHBzOi8vZWNvdXJzZXMub3UuZWR1L2NnaS1iaW4vZWJvb2suY2dpP2RvYz0mdG9waWM9c3QmY2hhcF9zZWM9MDcuMiZwYWdlPXRoZW9yeVxuICAgICAgICAvLyBodHRwOi8vb3V0cHV0LnRvL3NpZGV3YXkvZGVmYXVsdC5hc3A/cW5vPTEyMTEwMDA4N1xuXG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0ge1xuICAgICAgICAgICAgbWFzczogMCxcbiAgICAgICAgICAgIGFyZWE6IDAsXG4gICAgICAgICAgICBpbmVydGlhOiAwLFxuICAgICAgICAgICAgY2VudHJlOiB7IHg6IDAsIHk6IDAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHN1bSB0aGUgcHJvcGVydGllcyBvZiBhbGwgY29tcG91bmQgcGFydHMgb2YgdGhlIHBhcmVudCBib2R5XG4gICAgICAgIGZvciAodmFyIGkgPSBib2R5LnBhcnRzLmxlbmd0aCA9PT0gMSA/IDAgOiAxOyBpIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2ldO1xuICAgICAgICAgICAgcHJvcGVydGllcy5tYXNzICs9IHBhcnQubWFzcztcbiAgICAgICAgICAgIHByb3BlcnRpZXMuYXJlYSArPSBwYXJ0LmFyZWE7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmluZXJ0aWEgKz0gcGFydC5pbmVydGlhO1xuICAgICAgICAgICAgcHJvcGVydGllcy5jZW50cmUgPSBWZWN0b3IuYWRkKHByb3BlcnRpZXMuY2VudHJlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBWZWN0b3IubXVsdChwYXJ0LnBvc2l0aW9uLCBwYXJ0Lm1hc3MgIT09IEluZmluaXR5ID8gcGFydC5tYXNzIDogMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvcGVydGllcy5jZW50cmUgPSBWZWN0b3IuZGl2KHByb3BlcnRpZXMuY2VudHJlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMubWFzcyAhPT0gSW5maW5pdHkgPyBwcm9wZXJ0aWVzLm1hc3MgOiBib2R5LnBhcnRzLmxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXM7XG4gICAgfTtcblxuICAgIC8qXG4gICAgKlxuICAgICogIEV2ZW50cyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBib2R5IHN0YXJ0cyBzbGVlcGluZyAod2hlcmUgYHRoaXNgIGlzIHRoZSBib2R5KS5cbiAgICAqXG4gICAgKiBAZXZlbnQgc2xlZXBTdGFydFxuICAgICogQHRoaXMge2JvZHl9IFRoZSBib2R5IHRoYXQgaGFzIHN0YXJ0ZWQgc2xlZXBpbmdcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIGEgYm9keSBlbmRzIHNsZWVwaW5nICh3aGVyZSBgdGhpc2AgaXMgdGhlIGJvZHkpLlxuICAgICpcbiAgICAqIEBldmVudCBzbGVlcEVuZFxuICAgICogQHRoaXMge2JvZHl9IFRoZSBib2R5IHRoYXQgaGFzIGVuZGVkIHNsZWVwaW5nXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qXG4gICAgKlxuICAgICogIFByb3BlcnRpZXMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW50ZWdlciBgTnVtYmVyYCB1bmlxdWVseSBpZGVudGlmeWluZyBudW1iZXIgZ2VuZXJhdGVkIGluIGBCb2R5LmNyZWF0ZWAgYnkgYENvbW1vbi5uZXh0SWRgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIGRlbm90aW5nIHRoZSB0eXBlIG9mIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0eXBlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJib2R5XCJcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFyYml0cmFyeSBgU3RyaW5nYCBuYW1lIHRvIGhlbHAgdGhlIHVzZXIgaWRlbnRpZnkgYW5kIG1hbmFnZSBib2RpZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgbGFiZWxcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcIkJvZHlcIlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgYm9kaWVzIHRoYXQgbWFrZSB1cCB0aGlzIGJvZHkuIFxuICAgICAqIFRoZSBmaXJzdCBib2R5IGluIHRoZSBhcnJheSBtdXN0IGFsd2F5cyBiZSBhIHNlbGYgcmVmZXJlbmNlIHRvIHRoZSBjdXJyZW50IGJvZHkgaW5zdGFuY2UuXG4gICAgICogQWxsIGJvZGllcyBpbiB0aGUgYHBhcnRzYCBhcnJheSB0b2dldGhlciBmb3JtIGEgc2luZ2xlIHJpZ2lkIGNvbXBvdW5kIGJvZHkuXG4gICAgICogUGFydHMgYXJlIGFsbG93ZWQgdG8gb3ZlcmxhcCwgaGF2ZSBnYXBzIG9yIGhvbGVzIG9yIGV2ZW4gZm9ybSBjb25jYXZlIGJvZGllcy5cbiAgICAgKiBQYXJ0cyB0aGVtc2VsdmVzIHNob3VsZCBuZXZlciBiZSBhZGRlZCB0byBhIGBXb3JsZGAsIG9ubHkgdGhlIHBhcmVudCBib2R5IHNob3VsZCBiZS5cbiAgICAgKiBVc2UgYEJvZHkuc2V0UGFydHNgIHdoZW4gc2V0dGluZyBwYXJ0cyB0byBlbnN1cmUgY29ycmVjdCB1cGRhdGVzIG9mIGFsbCBwcm9wZXJ0aWVzLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHBhcnRzXG4gICAgICogQHR5cGUgYm9keVtdXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIHNlbGYgcmVmZXJlbmNlIGlmIHRoZSBib2R5IGlzIF9ub3RfIGEgcGFydCBvZiBhbm90aGVyIGJvZHkuXG4gICAgICogT3RoZXJ3aXNlIHRoaXMgaXMgYSByZWZlcmVuY2UgdG8gdGhlIGJvZHkgdGhhdCB0aGlzIGlzIGEgcGFydCBvZi5cbiAgICAgKiBTZWUgYGJvZHkucGFydHNgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHBhcmVudFxuICAgICAqIEB0eXBlIGJvZHlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgc3BlY2lmeWluZyB0aGUgYW5nbGUgb2YgdGhlIGJvZHksIGluIHJhZGlhbnMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYW5nbGVcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBgVmVjdG9yYCBvYmplY3RzIHRoYXQgc3BlY2lmeSB0aGUgY29udmV4IGh1bGwgb2YgdGhlIHJpZ2lkIGJvZHkuXG4gICAgICogVGhlc2Ugc2hvdWxkIGJlIHByb3ZpZGVkIGFib3V0IHRoZSBvcmlnaW4gYCgwLCAwKWAuIEUuZy5cbiAgICAgKlxuICAgICAqICAgICBbeyB4OiAwLCB5OiAwIH0sIHsgeDogMjUsIHk6IDUwIH0sIHsgeDogNTAsIHk6IDAgfV1cbiAgICAgKlxuICAgICAqIFdoZW4gcGFzc2VkIHZpYSBgQm9keS5jcmVhdGVgLCB0aGUgdmVydGljZXMgYXJlIHRyYW5zbGF0ZWQgcmVsYXRpdmUgdG8gYGJvZHkucG9zaXRpb25gIChpLmUuIHdvcmxkLXNwYWNlLCBhbmQgY29uc3RhbnRseSB1cGRhdGVkIGJ5IGBCb2R5LnVwZGF0ZWAgZHVyaW5nIHNpbXVsYXRpb24pLlxuICAgICAqIFRoZSBgVmVjdG9yYCBvYmplY3RzIGFyZSBhbHNvIGF1Z21lbnRlZCB3aXRoIGFkZGl0aW9uYWwgcHJvcGVydGllcyByZXF1aXJlZCBmb3IgZWZmaWNpZW50IGNvbGxpc2lvbiBkZXRlY3Rpb24uIFxuICAgICAqXG4gICAgICogT3RoZXIgcHJvcGVydGllcyBzdWNoIGFzIGBpbmVydGlhYCBhbmQgYGJvdW5kc2AgYXJlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBmcm9tIHRoZSBwYXNzZWQgdmVydGljZXMgKHVubGVzcyBwcm92aWRlZCB2aWEgYG9wdGlvbnNgKS5cbiAgICAgKiBDb25jYXZlIGh1bGxzIGFyZSBub3QgY3VycmVudGx5IHN1cHBvcnRlZC4gVGhlIG1vZHVsZSBgTWF0dGVyLlZlcnRpY2VzYCBjb250YWlucyB1c2VmdWwgbWV0aG9kcyBmb3Igd29ya2luZyB3aXRoIHZlcnRpY2VzLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHZlcnRpY2VzXG4gICAgICogQHR5cGUgdmVjdG9yW11cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFZlY3RvcmAgdGhhdCBzcGVjaWZpZXMgdGhlIGN1cnJlbnQgd29ybGQtc3BhY2UgcG9zaXRpb24gb2YgdGhlIGJvZHkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcG9zaXRpb25cbiAgICAgKiBAdHlwZSB2ZWN0b3JcbiAgICAgKiBAZGVmYXVsdCB7IHg6IDAsIHk6IDAgfVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgVmVjdG9yYCB0aGF0IHNwZWNpZmllcyB0aGUgZm9yY2UgdG8gYXBwbHkgaW4gdGhlIGN1cnJlbnQgc3RlcC4gSXQgaXMgemVyb2VkIGFmdGVyIGV2ZXJ5IGBCb2R5LnVwZGF0ZWAuIFNlZSBhbHNvIGBCb2R5LmFwcGx5Rm9yY2VgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGZvcmNlXG4gICAgICogQHR5cGUgdmVjdG9yXG4gICAgICogQGRlZmF1bHQgeyB4OiAwLCB5OiAwIH1cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgdGhlIHRvcnF1ZSAodHVybmluZyBmb3JjZSkgdG8gYXBwbHkgaW4gdGhlIGN1cnJlbnQgc3RlcC4gSXQgaXMgemVyb2VkIGFmdGVyIGV2ZXJ5IGBCb2R5LnVwZGF0ZWAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdG9ycXVlXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IF9tZWFzdXJlc18gdGhlIGN1cnJlbnQgc3BlZWQgb2YgdGhlIGJvZHkgYWZ0ZXIgdGhlIGxhc3QgYEJvZHkudXBkYXRlYC4gSXQgaXMgcmVhZC1vbmx5IGFuZCBhbHdheXMgcG9zaXRpdmUgKGl0J3MgdGhlIG1hZ25pdHVkZSBvZiBgYm9keS52ZWxvY2l0eWApLlxuICAgICAqXG4gICAgICogQHJlYWRPbmx5XG4gICAgICogQHByb3BlcnR5IHNwZWVkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IF9tZWFzdXJlc18gdGhlIGN1cnJlbnQgYW5ndWxhciBzcGVlZCBvZiB0aGUgYm9keSBhZnRlciB0aGUgbGFzdCBgQm9keS51cGRhdGVgLiBJdCBpcyByZWFkLW9ubHkgYW5kIGFsd2F5cyBwb3NpdGl2ZSAoaXQncyB0aGUgbWFnbml0dWRlIG9mIGBib2R5LmFuZ3VsYXJWZWxvY2l0eWApLlxuICAgICAqXG4gICAgICogQHJlYWRPbmx5XG4gICAgICogQHByb3BlcnR5IGFuZ3VsYXJTcGVlZFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFZlY3RvcmAgdGhhdCBfbWVhc3VyZXNfIHRoZSBjdXJyZW50IHZlbG9jaXR5IG9mIHRoZSBib2R5IGFmdGVyIHRoZSBsYXN0IGBCb2R5LnVwZGF0ZWAuIEl0IGlzIHJlYWQtb25seS4gXG4gICAgICogSWYgeW91IG5lZWQgdG8gbW9kaWZ5IGEgYm9keSdzIHZlbG9jaXR5IGRpcmVjdGx5LCB5b3Ugc2hvdWxkIGVpdGhlciBhcHBseSBhIGZvcmNlIG9yIHNpbXBseSBjaGFuZ2UgdGhlIGJvZHkncyBgcG9zaXRpb25gIChhcyB0aGUgZW5naW5lIHVzZXMgcG9zaXRpb24tVmVybGV0IGludGVncmF0aW9uKS5cbiAgICAgKlxuICAgICAqIEByZWFkT25seVxuICAgICAqIEBwcm9wZXJ0eSB2ZWxvY2l0eVxuICAgICAqIEB0eXBlIHZlY3RvclxuICAgICAqIEBkZWZhdWx0IHsgeDogMCwgeTogMCB9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgX21lYXN1cmVzXyB0aGUgY3VycmVudCBhbmd1bGFyIHZlbG9jaXR5IG9mIHRoZSBib2R5IGFmdGVyIHRoZSBsYXN0IGBCb2R5LnVwZGF0ZWAuIEl0IGlzIHJlYWQtb25seS4gXG4gICAgICogSWYgeW91IG5lZWQgdG8gbW9kaWZ5IGEgYm9keSdzIGFuZ3VsYXIgdmVsb2NpdHkgZGlyZWN0bHksIHlvdSBzaG91bGQgYXBwbHkgYSB0b3JxdWUgb3Igc2ltcGx5IGNoYW5nZSB0aGUgYm9keSdzIGBhbmdsZWAgKGFzIHRoZSBlbmdpbmUgdXNlcyBwb3NpdGlvbi1WZXJsZXQgaW50ZWdyYXRpb24pLlxuICAgICAqXG4gICAgICogQHJlYWRPbmx5XG4gICAgICogQHByb3BlcnR5IGFuZ3VsYXJWZWxvY2l0eVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIGEgYm9keSBpcyBjb25zaWRlcmVkIHN0YXRpYy4gQSBzdGF0aWMgYm9keSBjYW4gbmV2ZXIgY2hhbmdlIHBvc2l0aW9uIG9yIGFuZ2xlIGFuZCBpcyBjb21wbGV0ZWx5IGZpeGVkLlxuICAgICAqIElmIHlvdSBuZWVkIHRvIHNldCBhIGJvZHkgYXMgc3RhdGljIGFmdGVyIGl0cyBjcmVhdGlvbiwgeW91IHNob3VsZCB1c2UgYEJvZHkuc2V0U3RhdGljYCBhcyB0aGlzIHJlcXVpcmVzIG1vcmUgdGhhbiBqdXN0IHNldHRpbmcgdGhpcyBmbGFnLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlzU3RhdGljXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciBhIGJvZHkgaXMgYSBzZW5zb3IuIFNlbnNvciB0cmlnZ2VycyBjb2xsaXNpb24gZXZlbnRzLCBidXQgZG9lc24ndCByZWFjdCB3aXRoIGNvbGxpZGluZyBib2R5IHBoeXNpY2FsbHkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaXNTZW5zb3JcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoZSBib2R5IGlzIGNvbnNpZGVyZWQgc2xlZXBpbmcuIEEgc2xlZXBpbmcgYm9keSBhY3RzIHNpbWlsYXIgdG8gYSBzdGF0aWMgYm9keSwgZXhjZXB0IGl0IGlzIG9ubHkgdGVtcG9yYXJ5IGFuZCBjYW4gYmUgYXdva2VuLlxuICAgICAqIElmIHlvdSBuZWVkIHRvIHNldCBhIGJvZHkgYXMgc2xlZXBpbmcsIHlvdSBzaG91bGQgdXNlIGBTbGVlcGluZy5zZXRgIGFzIHRoaXMgcmVxdWlyZXMgbW9yZSB0aGFuIGp1c3Qgc2V0dGluZyB0aGlzIGZsYWcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaXNTbGVlcGluZ1xuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IF9tZWFzdXJlc18gdGhlIGFtb3VudCBvZiBtb3ZlbWVudCBhIGJvZHkgY3VycmVudGx5IGhhcyAoYSBjb21iaW5hdGlvbiBvZiBgc3BlZWRgIGFuZCBgYW5ndWxhclNwZWVkYCkuIEl0IGlzIHJlYWQtb25seSBhbmQgYWx3YXlzIHBvc2l0aXZlLlxuICAgICAqIEl0IGlzIHVzZWQgYW5kIHVwZGF0ZWQgYnkgdGhlIGBNYXR0ZXIuU2xlZXBpbmdgIG1vZHVsZSBkdXJpbmcgc2ltdWxhdGlvbiB0byBkZWNpZGUgaWYgYSBib2R5IGhhcyBjb21lIHRvIHJlc3QuXG4gICAgICpcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKiBAcHJvcGVydHkgbW90aW9uXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIG51bWJlciBvZiB1cGRhdGVzIGluIHdoaWNoIHRoaXMgYm9keSBtdXN0IGhhdmUgbmVhci16ZXJvIHZlbG9jaXR5IGJlZm9yZSBpdCBpcyBzZXQgYXMgc2xlZXBpbmcgYnkgdGhlIGBNYXR0ZXIuU2xlZXBpbmdgIG1vZHVsZSAoaWYgc2xlZXBpbmcgaXMgZW5hYmxlZCBieSB0aGUgZW5naW5lKS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBzbGVlcFRocmVzaG9sZFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDYwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgZGVuc2l0eSBvZiB0aGUgYm9keSwgdGhhdCBpcyBpdHMgbWFzcyBwZXIgdW5pdCBhcmVhLlxuICAgICAqIElmIHlvdSBwYXNzIHRoZSBkZW5zaXR5IHZpYSBgQm9keS5jcmVhdGVgIHRoZSBgbWFzc2AgcHJvcGVydHkgaXMgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIGZvciB5b3UgYmFzZWQgb24gdGhlIHNpemUgKGFyZWEpIG9mIHRoZSBvYmplY3QuXG4gICAgICogVGhpcyBpcyBnZW5lcmFsbHkgcHJlZmVyYWJsZSB0byBzaW1wbHkgc2V0dGluZyBtYXNzIGFuZCBhbGxvd3MgZm9yIG1vcmUgaW50dWl0aXZlIGRlZmluaXRpb24gb2YgbWF0ZXJpYWxzIChlLmcuIHJvY2sgaGFzIGEgaGlnaGVyIGRlbnNpdHkgdGhhbiB3b29kKS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBkZW5zaXR5XG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMC4wMDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBtYXNzIG9mIHRoZSBib2R5LCBhbHRob3VnaCBpdCBtYXkgYmUgbW9yZSBhcHByb3ByaWF0ZSB0byBzcGVjaWZ5IHRoZSBgZGVuc2l0eWAgcHJvcGVydHkgaW5zdGVhZC5cbiAgICAgKiBJZiB5b3UgbW9kaWZ5IHRoaXMgdmFsdWUsIHlvdSBtdXN0IGFsc28gbW9kaWZ5IHRoZSBgYm9keS5pbnZlcnNlTWFzc2AgcHJvcGVydHkgKGAxIC8gbWFzc2ApLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IG1hc3NcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBpbnZlcnNlIG1hc3Mgb2YgdGhlIGJvZHkgKGAxIC8gbWFzc2ApLlxuICAgICAqIElmIHlvdSBtb2RpZnkgdGhpcyB2YWx1ZSwgeW91IG11c3QgYWxzbyBtb2RpZnkgdGhlIGBib2R5Lm1hc3NgIHByb3BlcnR5LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGludmVyc2VNYXNzXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgbW9tZW50IG9mIGluZXJ0aWEgKGkuZS4gc2Vjb25kIG1vbWVudCBvZiBhcmVhKSBvZiB0aGUgYm9keS5cbiAgICAgKiBJdCBpcyBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgZnJvbSB0aGUgZ2l2ZW4gY29udmV4IGh1bGwgKGB2ZXJ0aWNlc2AgYXJyYXkpIGFuZCBkZW5zaXR5IGluIGBCb2R5LmNyZWF0ZWAuXG4gICAgICogSWYgeW91IG1vZGlmeSB0aGlzIHZhbHVlLCB5b3UgbXVzdCBhbHNvIG1vZGlmeSB0aGUgYGJvZHkuaW52ZXJzZUluZXJ0aWFgIHByb3BlcnR5IChgMSAvIGluZXJ0aWFgKS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpbmVydGlhXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgaW52ZXJzZSBtb21lbnQgb2YgaW5lcnRpYSBvZiB0aGUgYm9keSAoYDEgLyBpbmVydGlhYCkuXG4gICAgICogSWYgeW91IG1vZGlmeSB0aGlzIHZhbHVlLCB5b3UgbXVzdCBhbHNvIG1vZGlmeSB0aGUgYGJvZHkuaW5lcnRpYWAgcHJvcGVydHkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaW52ZXJzZUluZXJ0aWFcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSByZXN0aXR1dGlvbiAoZWxhc3RpY2l0eSkgb2YgdGhlIGJvZHkuIFRoZSB2YWx1ZSBpcyBhbHdheXMgcG9zaXRpdmUgYW5kIGlzIGluIHRoZSByYW5nZSBgKDAsIDEpYC5cbiAgICAgKiBBIHZhbHVlIG9mIGAwYCBtZWFucyBjb2xsaXNpb25zIG1heSBiZSBwZXJmZWN0bHkgaW5lbGFzdGljIGFuZCBubyBib3VuY2luZyBtYXkgb2NjdXIuIFxuICAgICAqIEEgdmFsdWUgb2YgYDAuOGAgbWVhbnMgdGhlIGJvZHkgbWF5IGJvdW5jZSBiYWNrIHdpdGggYXBwcm94aW1hdGVseSA4MCUgb2YgaXRzIGtpbmV0aWMgZW5lcmd5LlxuICAgICAqIE5vdGUgdGhhdCBjb2xsaXNpb24gcmVzcG9uc2UgaXMgYmFzZWQgb24gX3BhaXJzXyBvZiBib2RpZXMsIGFuZCB0aGF0IGByZXN0aXR1dGlvbmAgdmFsdWVzIGFyZSBfY29tYmluZWRfIHdpdGggdGhlIGZvbGxvd2luZyBmb3JtdWxhOlxuICAgICAqXG4gICAgICogICAgIE1hdGgubWF4KGJvZHlBLnJlc3RpdHV0aW9uLCBib2R5Qi5yZXN0aXR1dGlvbilcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZXN0aXR1dGlvblxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBmcmljdGlvbiBvZiB0aGUgYm9keS4gVGhlIHZhbHVlIGlzIGFsd2F5cyBwb3NpdGl2ZSBhbmQgaXMgaW4gdGhlIHJhbmdlIGAoMCwgMSlgLlxuICAgICAqIEEgdmFsdWUgb2YgYDBgIG1lYW5zIHRoYXQgdGhlIGJvZHkgbWF5IHNsaWRlIGluZGVmaW5pdGVseS5cbiAgICAgKiBBIHZhbHVlIG9mIGAxYCBtZWFucyB0aGUgYm9keSBtYXkgY29tZSB0byBhIHN0b3AgYWxtb3N0IGluc3RhbnRseSBhZnRlciBhIGZvcmNlIGlzIGFwcGxpZWQuXG4gICAgICpcbiAgICAgKiBUaGUgZWZmZWN0cyBvZiB0aGUgdmFsdWUgbWF5IGJlIG5vbi1saW5lYXIuIFxuICAgICAqIEhpZ2ggdmFsdWVzIG1heSBiZSB1bnN0YWJsZSBkZXBlbmRpbmcgb24gdGhlIGJvZHkuXG4gICAgICogVGhlIGVuZ2luZSB1c2VzIGEgQ291bG9tYiBmcmljdGlvbiBtb2RlbCBpbmNsdWRpbmcgc3RhdGljIGFuZCBraW5ldGljIGZyaWN0aW9uLlxuICAgICAqIE5vdGUgdGhhdCBjb2xsaXNpb24gcmVzcG9uc2UgaXMgYmFzZWQgb24gX3BhaXJzXyBvZiBib2RpZXMsIGFuZCB0aGF0IGBmcmljdGlvbmAgdmFsdWVzIGFyZSBfY29tYmluZWRfIHdpdGggdGhlIGZvbGxvd2luZyBmb3JtdWxhOlxuICAgICAqXG4gICAgICogICAgIE1hdGgubWluKGJvZHlBLmZyaWN0aW9uLCBib2R5Qi5mcmljdGlvbilcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBmcmljdGlvblxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDAuMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIHN0YXRpYyBmcmljdGlvbiBvZiB0aGUgYm9keSAoaW4gdGhlIENvdWxvbWIgZnJpY3Rpb24gbW9kZWwpLiBcbiAgICAgKiBBIHZhbHVlIG9mIGAwYCBtZWFucyB0aGUgYm9keSB3aWxsIG5ldmVyICdzdGljaycgd2hlbiBpdCBpcyBuZWFybHkgc3RhdGlvbmFyeSBhbmQgb25seSBkeW5hbWljIGBmcmljdGlvbmAgaXMgdXNlZC5cbiAgICAgKiBUaGUgaGlnaGVyIHRoZSB2YWx1ZSAoZS5nLiBgMTBgKSwgdGhlIG1vcmUgZm9yY2UgaXQgd2lsbCB0YWtlIHRvIGluaXRpYWxseSBnZXQgdGhlIGJvZHkgbW92aW5nIHdoZW4gbmVhcmx5IHN0YXRpb25hcnkuXG4gICAgICogVGhpcyB2YWx1ZSBpcyBtdWx0aXBsaWVkIHdpdGggdGhlIGBmcmljdGlvbmAgcHJvcGVydHkgdG8gbWFrZSBpdCBlYXNpZXIgdG8gY2hhbmdlIGBmcmljdGlvbmAgYW5kIG1haW50YWluIGFuIGFwcHJvcHJpYXRlIGFtb3VudCBvZiBzdGF0aWMgZnJpY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgZnJpY3Rpb25TdGF0aWNcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwLjVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBhaXIgZnJpY3Rpb24gb2YgdGhlIGJvZHkgKGFpciByZXNpc3RhbmNlKS4gXG4gICAgICogQSB2YWx1ZSBvZiBgMGAgbWVhbnMgdGhlIGJvZHkgd2lsbCBuZXZlciBzbG93IGFzIGl0IG1vdmVzIHRocm91Z2ggc3BhY2UuXG4gICAgICogVGhlIGhpZ2hlciB0aGUgdmFsdWUsIHRoZSBmYXN0ZXIgYSBib2R5IHNsb3dzIHdoZW4gbW92aW5nIHRocm91Z2ggc3BhY2UuXG4gICAgICogVGhlIGVmZmVjdHMgb2YgdGhlIHZhbHVlIGFyZSBub24tbGluZWFyLiBcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBmcmljdGlvbkFpclxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDAuMDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGBPYmplY3RgIHRoYXQgc3BlY2lmaWVzIHRoZSBjb2xsaXNpb24gZmlsdGVyaW5nIHByb3BlcnRpZXMgb2YgdGhpcyBib2R5LlxuICAgICAqXG4gICAgICogQ29sbGlzaW9ucyBiZXR3ZWVuIHR3byBib2RpZXMgd2lsbCBvYmV5IHRoZSBmb2xsb3dpbmcgcnVsZXM6XG4gICAgICogLSBJZiB0aGUgdHdvIGJvZGllcyBoYXZlIHRoZSBzYW1lIG5vbi16ZXJvIHZhbHVlIG9mIGBjb2xsaXNpb25GaWx0ZXIuZ3JvdXBgLFxuICAgICAqICAgdGhleSB3aWxsIGFsd2F5cyBjb2xsaWRlIGlmIHRoZSB2YWx1ZSBpcyBwb3NpdGl2ZSwgYW5kIHRoZXkgd2lsbCBuZXZlciBjb2xsaWRlXG4gICAgICogICBpZiB0aGUgdmFsdWUgaXMgbmVnYXRpdmUuXG4gICAgICogLSBJZiB0aGUgdHdvIGJvZGllcyBoYXZlIGRpZmZlcmVudCB2YWx1ZXMgb2YgYGNvbGxpc2lvbkZpbHRlci5ncm91cGAgb3IgaWYgb25lXG4gICAgICogICAob3IgYm90aCkgb2YgdGhlIGJvZGllcyBoYXMgYSB2YWx1ZSBvZiAwLCB0aGVuIHRoZSBjYXRlZ29yeS9tYXNrIHJ1bGVzIGFwcGx5IGFzIGZvbGxvd3M6XG4gICAgICpcbiAgICAgKiBFYWNoIGJvZHkgYmVsb25ncyB0byBhIGNvbGxpc2lvbiBjYXRlZ29yeSwgZ2l2ZW4gYnkgYGNvbGxpc2lvbkZpbHRlci5jYXRlZ29yeWAuIFRoaXNcbiAgICAgKiB2YWx1ZSBpcyB1c2VkIGFzIGEgYml0IGZpZWxkIGFuZCB0aGUgY2F0ZWdvcnkgc2hvdWxkIGhhdmUgb25seSBvbmUgYml0IHNldCwgbWVhbmluZyB0aGF0XG4gICAgICogdGhlIHZhbHVlIG9mIHRoaXMgcHJvcGVydHkgaXMgYSBwb3dlciBvZiB0d28gaW4gdGhlIHJhbmdlIFsxLCAyXjMxXS4gVGh1cywgdGhlcmUgYXJlIDMyXG4gICAgICogZGlmZmVyZW50IGNvbGxpc2lvbiBjYXRlZ29yaWVzIGF2YWlsYWJsZS5cbiAgICAgKlxuICAgICAqIEVhY2ggYm9keSBhbHNvIGRlZmluZXMgYSBjb2xsaXNpb24gYml0bWFzaywgZ2l2ZW4gYnkgYGNvbGxpc2lvbkZpbHRlci5tYXNrYCB3aGljaCBzcGVjaWZpZXNcbiAgICAgKiB0aGUgY2F0ZWdvcmllcyBpdCBjb2xsaWRlcyB3aXRoICh0aGUgdmFsdWUgaXMgdGhlIGJpdHdpc2UgQU5EIHZhbHVlIG9mIGFsbCB0aGVzZSBjYXRlZ29yaWVzKS5cbiAgICAgKlxuICAgICAqIFVzaW5nIHRoZSBjYXRlZ29yeS9tYXNrIHJ1bGVzLCB0d28gYm9kaWVzIGBBYCBhbmQgYEJgIGNvbGxpZGUgaWYgZWFjaCBpbmNsdWRlcyB0aGUgb3RoZXInc1xuICAgICAqIGNhdGVnb3J5IGluIGl0cyBtYXNrLCBpLmUuIGAoY2F0ZWdvcnlBICYgbWFza0IpICE9PSAwYCBhbmQgYChjYXRlZ29yeUIgJiBtYXNrQSkgIT09IDBgXG4gICAgICogYXJlIGJvdGggdHJ1ZS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb2xsaXNpb25GaWx0ZXJcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIEludGVnZXIgYE51bWJlcmAsIHRoYXQgc3BlY2lmaWVzIHRoZSBjb2xsaXNpb24gZ3JvdXAgdGhpcyBib2R5IGJlbG9uZ3MgdG8uXG4gICAgICogU2VlIGBib2R5LmNvbGxpc2lvbkZpbHRlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29sbGlzaW9uRmlsdGVyLmdyb3VwXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBiaXQgZmllbGQgdGhhdCBzcGVjaWZpZXMgdGhlIGNvbGxpc2lvbiBjYXRlZ29yeSB0aGlzIGJvZHkgYmVsb25ncyB0by5cbiAgICAgKiBUaGUgY2F0ZWdvcnkgdmFsdWUgc2hvdWxkIGhhdmUgb25seSBvbmUgYml0IHNldCwgZm9yIGV4YW1wbGUgYDB4MDAwMWAuXG4gICAgICogVGhpcyBtZWFucyB0aGVyZSBhcmUgdXAgdG8gMzIgdW5pcXVlIGNvbGxpc2lvbiBjYXRlZ29yaWVzIGF2YWlsYWJsZS5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb2xsaXNpb25GaWx0ZXIuY2F0ZWdvcnlcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKiBAZGVmYXVsdCAxXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGJpdCBtYXNrIHRoYXQgc3BlY2lmaWVzIHRoZSBjb2xsaXNpb24gY2F0ZWdvcmllcyB0aGlzIGJvZHkgbWF5IGNvbGxpZGUgd2l0aC5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb2xsaXNpb25GaWx0ZXIubWFza1xuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqIEBkZWZhdWx0IC0xXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIGEgdG9sZXJhbmNlIG9uIGhvdyBmYXIgYSBib2R5IGlzIGFsbG93ZWQgdG8gJ3NpbmsnIG9yIHJvdGF0ZSBpbnRvIG90aGVyIGJvZGllcy5cbiAgICAgKiBBdm9pZCBjaGFuZ2luZyB0aGlzIHZhbHVlIHVubGVzcyB5b3UgdW5kZXJzdGFuZCB0aGUgcHVycG9zZSBvZiBgc2xvcGAgaW4gcGh5c2ljcyBlbmdpbmVzLlxuICAgICAqIFRoZSBkZWZhdWx0IHNob3VsZCBnZW5lcmFsbHkgc3VmZmljZSwgYWx0aG91Z2ggdmVyeSBsYXJnZSBib2RpZXMgbWF5IHJlcXVpcmUgbGFyZ2VyIHZhbHVlcyBmb3Igc3RhYmxlIHN0YWNraW5nLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHNsb3BcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwLjA1XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgYWxsb3dzIHBlci1ib2R5IHRpbWUgc2NhbGluZywgZS5nLiBhIGZvcmNlLWZpZWxkIHdoZXJlIGJvZGllcyBpbnNpZGUgYXJlIGluIHNsb3ctbW90aW9uLCB3aGlsZSBvdGhlcnMgYXJlIGF0IGZ1bGwgc3BlZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdGltZVNjYWxlXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYE9iamVjdGAgdGhhdCBkZWZpbmVzIHRoZSByZW5kZXJpbmcgcHJvcGVydGllcyB0byBiZSBjb25zdW1lZCBieSB0aGUgbW9kdWxlIGBNYXR0ZXIuUmVuZGVyYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXJcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0aGUgYm9keSBzaG91bGQgYmUgcmVuZGVyZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnZpc2libGVcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgb3BhY2l0eSB0byB1c2Ugd2hlbiByZW5kZXJpbmcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLm9wYWNpdHlcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAxXG4gICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGBPYmplY3RgIHRoYXQgZGVmaW5lcyB0aGUgc3ByaXRlIHByb3BlcnRpZXMgdG8gdXNlIHdoZW4gcmVuZGVyaW5nLCBpZiBhbnkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnNwcml0ZVxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYFN0cmluZ2AgdGhhdCBkZWZpbmVzIHRoZSBwYXRoIHRvIHRoZSBpbWFnZSB0byB1c2UgYXMgdGhlIHNwcml0ZSB0ZXh0dXJlLCBpZiBhbnkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnNwcml0ZS50ZXh0dXJlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICovXG4gICAgIFxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBzY2FsaW5nIGluIHRoZSB4LWF4aXMgZm9yIHRoZSBzcHJpdGUsIGlmIGFueS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlLnhTY2FsZVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBzY2FsaW5nIGluIHRoZSB5LWF4aXMgZm9yIHRoZSBzcHJpdGUsIGlmIGFueS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlLnlTY2FsZVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgICAvKipcbiAgICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIG9mZnNldCBpbiB0aGUgeC1heGlzIGZvciB0aGUgc3ByaXRlIChub3JtYWxpc2VkIGJ5IHRleHR1cmUgd2lkdGgpLlxuICAgICAgKlxuICAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnNwcml0ZS54T2Zmc2V0XG4gICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgKiBAZGVmYXVsdCAwXG4gICAgICAqL1xuXG4gICAgIC8qKlxuICAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgb2Zmc2V0IGluIHRoZSB5LWF4aXMgZm9yIHRoZSBzcHJpdGUgKG5vcm1hbGlzZWQgYnkgdGV4dHVyZSBoZWlnaHQpLlxuICAgICAgKlxuICAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnNwcml0ZS55T2Zmc2V0XG4gICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgKiBAZGVmYXVsdCAwXG4gICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIGxpbmUgd2lkdGggdG8gdXNlIHdoZW4gcmVuZGVyaW5nIHRoZSBib2R5IG91dGxpbmUgKGlmIGEgc3ByaXRlIGlzIG5vdCBkZWZpbmVkKS5cbiAgICAgKiBBIHZhbHVlIG9mIGAwYCBtZWFucyBubyBvdXRsaW5lIHdpbGwgYmUgcmVuZGVyZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLmxpbmVXaWR0aFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDEuNVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgU3RyaW5nYCB0aGF0IGRlZmluZXMgdGhlIGZpbGwgc3R5bGUgdG8gdXNlIHdoZW4gcmVuZGVyaW5nIHRoZSBib2R5IChpZiBhIHNwcml0ZSBpcyBub3QgZGVmaW5lZCkuXG4gICAgICogSXQgaXMgdGhlIHNhbWUgYXMgd2hlbiB1c2luZyBhIGNhbnZhcywgc28gaXQgYWNjZXB0cyBDU1Mgc3R5bGUgcHJvcGVydHkgdmFsdWVzLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlci5maWxsU3R5bGVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBhIHJhbmRvbSBjb2xvdXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFN0cmluZ2AgdGhhdCBkZWZpbmVzIHRoZSBzdHJva2Ugc3R5bGUgdG8gdXNlIHdoZW4gcmVuZGVyaW5nIHRoZSBib2R5IG91dGxpbmUgKGlmIGEgc3ByaXRlIGlzIG5vdCBkZWZpbmVkKS5cbiAgICAgKiBJdCBpcyB0aGUgc2FtZSBhcyB3aGVuIHVzaW5nIGEgY2FudmFzLCBzbyBpdCBhY2NlcHRzIENTUyBzdHlsZSBwcm9wZXJ0eSB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnN0cm9rZVN0eWxlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgYSByYW5kb20gY29sb3VyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiB1bmlxdWUgYXhpcyB2ZWN0b3JzIChlZGdlIG5vcm1hbHMpIHVzZWQgZm9yIGNvbGxpc2lvbiBkZXRlY3Rpb24uXG4gICAgICogVGhlc2UgYXJlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBmcm9tIHRoZSBnaXZlbiBjb252ZXggaHVsbCAoYHZlcnRpY2VzYCBhcnJheSkgaW4gYEJvZHkuY3JlYXRlYC5cbiAgICAgKiBUaGV5IGFyZSBjb25zdGFudGx5IHVwZGF0ZWQgYnkgYEJvZHkudXBkYXRlYCBkdXJpbmcgdGhlIHNpbXVsYXRpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYXhlc1xuICAgICAqIEB0eXBlIHZlY3RvcltdXG4gICAgICovXG4gICAgIFxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBfbWVhc3VyZXNfIHRoZSBhcmVhIG9mIHRoZSBib2R5J3MgY29udmV4IGh1bGwsIGNhbGN1bGF0ZWQgYXQgY3JlYXRpb24gYnkgYEJvZHkuY3JlYXRlYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBhcmVhXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBCb3VuZHNgIG9iamVjdCB0aGF0IGRlZmluZXMgdGhlIEFBQkIgcmVnaW9uIGZvciB0aGUgYm9keS5cbiAgICAgKiBJdCBpcyBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgZnJvbSB0aGUgZ2l2ZW4gY29udmV4IGh1bGwgKGB2ZXJ0aWNlc2AgYXJyYXkpIGluIGBCb2R5LmNyZWF0ZWAgYW5kIGNvbnN0YW50bHkgdXBkYXRlZCBieSBgQm9keS51cGRhdGVgIGR1cmluZyBzaW11bGF0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvdW5kc1xuICAgICAqIEB0eXBlIGJvdW5kc1xuICAgICAqL1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkNvbXBvc2l0ZWAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgY29tcG9zaXRlIGJvZGllcy5cbiogQSBjb21wb3NpdGUgYm9keSBpcyBhIGNvbGxlY3Rpb24gb2YgYE1hdHRlci5Cb2R5YCwgYE1hdHRlci5Db25zdHJhaW50YCBhbmQgb3RoZXIgYE1hdHRlci5Db21wb3NpdGVgLCB0aGVyZWZvcmUgY29tcG9zaXRlcyBmb3JtIGEgdHJlZSBzdHJ1Y3R1cmUuXG4qIEl0IGlzIGltcG9ydGFudCB0byB1c2UgdGhlIGZ1bmN0aW9ucyBpbiB0aGlzIG1vZHVsZSB0byBtb2RpZnkgY29tcG9zaXRlcywgcmF0aGVyIHRoYW4gZGlyZWN0bHkgbW9kaWZ5aW5nIHRoZWlyIHByb3BlcnRpZXMuXG4qIE5vdGUgdGhhdCB0aGUgYE1hdHRlci5Xb3JsZGAgb2JqZWN0IGlzIGFsc28gYSB0eXBlIG9mIGBNYXR0ZXIuQ29tcG9zaXRlYCBhbmQgYXMgc3VjaCBhbGwgY29tcG9zaXRlIG1ldGhvZHMgaGVyZSBjYW4gYWxzbyBvcGVyYXRlIG9uIGEgYE1hdHRlci5Xb3JsZGAuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBDb21wb3NpdGVcbiovXG5cbnZhciBDb21wb3NpdGUgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGU7XG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCcuLi9jb3JlL0V2ZW50cycpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG52YXIgQm9keSA9IHJlcXVpcmUoJy4vQm9keScpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbXBvc2l0ZS4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJpdGVzIHNlY3Rpb24gYmVsb3cgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7fSBbb3B0aW9uc11cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZVxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHJldHVybiBDb21tb24uZXh0ZW5kKHsgXG4gICAgICAgICAgICBpZDogQ29tbW9uLm5leHRJZCgpLFxuICAgICAgICAgICAgdHlwZTogJ2NvbXBvc2l0ZScsXG4gICAgICAgICAgICBwYXJlbnQ6IG51bGwsXG4gICAgICAgICAgICBpc01vZGlmaWVkOiBmYWxzZSxcbiAgICAgICAgICAgIGJvZGllczogW10sIFxuICAgICAgICAgICAgY29uc3RyYWludHM6IFtdLCBcbiAgICAgICAgICAgIGNvbXBvc2l0ZXM6IFtdLFxuICAgICAgICAgICAgbGFiZWw6ICdDb21wb3NpdGUnXG4gICAgICAgIH0sIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjb21wb3NpdGUncyBgaXNNb2RpZmllZGAgZmxhZy4gXG4gICAgICogSWYgYHVwZGF0ZVBhcmVudHNgIGlzIHRydWUsIGFsbCBwYXJlbnRzIHdpbGwgYmUgc2V0IChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogSWYgYHVwZGF0ZUNoaWxkcmVuYCBpcyB0cnVlLCBhbGwgY2hpbGRyZW4gd2lsbCBiZSBzZXQgKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAbWV0aG9kIHNldE1vZGlmaWVkXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNNb2RpZmllZFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3VwZGF0ZVBhcmVudHM9ZmFsc2VdXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbdXBkYXRlQ2hpbGRyZW49ZmFsc2VdXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkID0gZnVuY3Rpb24oY29tcG9zaXRlLCBpc01vZGlmaWVkLCB1cGRhdGVQYXJlbnRzLCB1cGRhdGVDaGlsZHJlbikge1xuICAgICAgICBjb21wb3NpdGUuaXNNb2RpZmllZCA9IGlzTW9kaWZpZWQ7XG5cbiAgICAgICAgaWYgKHVwZGF0ZVBhcmVudHMgJiYgY29tcG9zaXRlLnBhcmVudCkge1xuICAgICAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZS5wYXJlbnQsIGlzTW9kaWZpZWQsIHVwZGF0ZVBhcmVudHMsIHVwZGF0ZUNoaWxkcmVuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1cGRhdGVDaGlsZHJlbikge1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkQ29tcG9zaXRlID0gY29tcG9zaXRlLmNvbXBvc2l0ZXNbaV07XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNoaWxkQ29tcG9zaXRlLCBpc01vZGlmaWVkLCB1cGRhdGVQYXJlbnRzLCB1cGRhdGVDaGlsZHJlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2VuZXJpYyBhZGQgZnVuY3Rpb24uIEFkZHMgb25lIG9yIG1hbnkgYm9keShzKSwgY29uc3RyYWludChzKSBvciBhIGNvbXBvc2l0ZShzKSB0byB0aGUgZ2l2ZW4gY29tcG9zaXRlLlxuICAgICAqIFRyaWdnZXJzIGBiZWZvcmVBZGRgIGFuZCBgYWZ0ZXJBZGRgIGV2ZW50cyBvbiB0aGUgYGNvbXBvc2l0ZWAuXG4gICAgICogQG1ldGhvZCBhZGRcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHt9IG9iamVjdFxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBvYmplY3RzIGFkZGVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmFkZCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgb2JqZWN0KSB7XG4gICAgICAgIHZhciBvYmplY3RzID0gW10uY29uY2F0KG9iamVjdCk7XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoY29tcG9zaXRlLCAnYmVmb3JlQWRkJywgeyBvYmplY3Q6IG9iamVjdCB9KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmplY3RzW2ldO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG9iai50eXBlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2JvZHknOlxuICAgICAgICAgICAgICAgIC8vIHNraXAgYWRkaW5nIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgICAgICAgICAgaWYgKG9iai5wYXJlbnQgIT09IG9iaikge1xuICAgICAgICAgICAgICAgICAgICBDb21tb24ubG9nKCdDb21wb3NpdGUuYWRkOiBza2lwcGVkIGFkZGluZyBhIGNvbXBvdW5kIGJvZHkgcGFydCAoeW91IG11c3QgYWRkIGl0cyBwYXJlbnQgaW5zdGVhZCknLCAnd2FybicpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuYWRkQm9keShjb21wb3NpdGUsIG9iaik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjb25zdHJhaW50JzpcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjb21wb3NpdGUsIG9iaik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjb21wb3NpdGUnOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb21wb3NpdGUoY29tcG9zaXRlLCBvYmopO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbW91c2VDb25zdHJhaW50JzpcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjb21wb3NpdGUsIG9iai5jb25zdHJhaW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoY29tcG9zaXRlLCAnYWZ0ZXJBZGQnLCB7IG9iamVjdDogb2JqZWN0IH0pO1xuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdlbmVyaWMgcmVtb3ZlIGZ1bmN0aW9uLiBSZW1vdmVzIG9uZSBvciBtYW55IGJvZHkocyksIGNvbnN0cmFpbnQocykgb3IgYSBjb21wb3NpdGUocykgdG8gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBPcHRpb25hbGx5IHNlYXJjaGluZyBpdHMgY2hpbGRyZW4gcmVjdXJzaXZlbHkuXG4gICAgICogVHJpZ2dlcnMgYGJlZm9yZVJlbW92ZWAgYW5kIGBhZnRlclJlbW92ZWAgZXZlbnRzIG9uIHRoZSBgY29tcG9zaXRlYC5cbiAgICAgKiBAbWV0aG9kIHJlbW92ZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge30gb2JqZWN0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZGVlcD1mYWxzZV1cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGUgd2l0aCB0aGUgb2JqZWN0cyByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgb2JqZWN0LCBkZWVwKSB7XG4gICAgICAgIHZhciBvYmplY3RzID0gW10uY29uY2F0KG9iamVjdCk7XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoY29tcG9zaXRlLCAnYmVmb3JlUmVtb3ZlJywgeyBvYmplY3Q6IG9iamVjdCB9KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBvYmogPSBvYmplY3RzW2ldO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG9iai50eXBlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ2JvZHknOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVCb2R5KGNvbXBvc2l0ZSwgb2JqLCBkZWVwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NvbnN0cmFpbnQnOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVDb25zdHJhaW50KGNvbXBvc2l0ZSwgb2JqLCBkZWVwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvc2l0ZSc6XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUNvbXBvc2l0ZShjb21wb3NpdGUsIG9iaiwgZGVlcCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtb3VzZUNvbnN0cmFpbnQnOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVDb25zdHJhaW50KGNvbXBvc2l0ZSwgb2JqLmNvbnN0cmFpbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBFdmVudHMudHJpZ2dlcihjb21wb3NpdGUsICdhZnRlclJlbW92ZScsIHsgb2JqZWN0OiBvYmplY3QgfSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbXBvc2l0ZSB0byB0aGUgZ2l2ZW4gY29tcG9zaXRlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBhZGRDb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlQVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVCXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlQSB3aXRoIHRoZSBvYmplY3RzIGZyb20gY29tcG9zaXRlQiBhZGRlZFxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5hZGRDb21wb3NpdGUgPSBmdW5jdGlvbihjb21wb3NpdGVBLCBjb21wb3NpdGVCKSB7XG4gICAgICAgIGNvbXBvc2l0ZUEuY29tcG9zaXRlcy5wdXNoKGNvbXBvc2l0ZUIpO1xuICAgICAgICBjb21wb3NpdGVCLnBhcmVudCA9IGNvbXBvc2l0ZUE7XG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGVBLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBjb21wb3NpdGVBO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29tcG9zaXRlIGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgYW5kIG9wdGlvbmFsbHkgc2VhcmNoaW5nIGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQ29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZUFcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlQlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RlZXA9ZmFsc2VdXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlQSB3aXRoIHRoZSBjb21wb3NpdGUgcmVtb3ZlZFxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5yZW1vdmVDb21wb3NpdGUgPSBmdW5jdGlvbihjb21wb3NpdGVBLCBjb21wb3NpdGVCLCBkZWVwKSB7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IENvbW1vbi5pbmRleE9mKGNvbXBvc2l0ZUEuY29tcG9zaXRlcywgY29tcG9zaXRlQik7XG4gICAgICAgIGlmIChwb3NpdGlvbiAhPT0gLTEpIHtcbiAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVDb21wb3NpdGVBdChjb21wb3NpdGVBLCBwb3NpdGlvbik7XG4gICAgICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlQSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlQS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQ29tcG9zaXRlKGNvbXBvc2l0ZUEuY29tcG9zaXRlc1tpXSwgY29tcG9zaXRlQiwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlQTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGNvbXBvc2l0ZSBmcm9tIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHJlbW92ZUNvbXBvc2l0ZUF0XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb3NpdGlvblxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBjb21wb3NpdGUgcmVtb3ZlZFxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5yZW1vdmVDb21wb3NpdGVBdCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgcG9zaXRpb24pIHtcbiAgICAgICAgY29tcG9zaXRlLmNvbXBvc2l0ZXMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgYm9keSB0byB0aGUgZ2l2ZW4gY29tcG9zaXRlLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBhZGRCb2R5XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBib2R5IGFkZGVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmFkZEJvZHkgPSBmdW5jdGlvbihjb21wb3NpdGUsIGJvZHkpIHtcbiAgICAgICAgY29tcG9zaXRlLmJvZGllcy5wdXNoKGJvZHkpO1xuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBib2R5IGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgYW5kIG9wdGlvbmFsbHkgc2VhcmNoaW5nIGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQm9keVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtkZWVwPWZhbHNlXVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBib2R5IHJlbW92ZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUucmVtb3ZlQm9keSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgYm9keSwgZGVlcCkge1xuICAgICAgICB2YXIgcG9zaXRpb24gPSBDb21tb24uaW5kZXhPZihjb21wb3NpdGUuYm9kaWVzLCBib2R5KTtcbiAgICAgICAgaWYgKHBvc2l0aW9uICE9PSAtMSkge1xuICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUJvZHlBdChjb21wb3NpdGUsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQm9keShjb21wb3NpdGUuY29tcG9zaXRlc1tpXSwgYm9keSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgYm9keSBmcm9tIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHJlbW92ZUJvZHlBdFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcG9zaXRpb25cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGUgd2l0aCB0aGUgYm9keSByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZUJvZHlBdCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgcG9zaXRpb24pIHtcbiAgICAgICAgY29tcG9zaXRlLmJvZGllcy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBjb25zdHJhaW50IHRvIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGFkZENvbnN0cmFpbnRcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50fSBjb25zdHJhaW50XG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlIHdpdGggdGhlIGNvbnN0cmFpbnQgYWRkZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgY29uc3RyYWludCkge1xuICAgICAgICBjb21wb3NpdGUuY29uc3RyYWludHMucHVzaChjb25zdHJhaW50KTtcbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29uc3RyYWludCBmcm9tIHRoZSBnaXZlbiBjb21wb3NpdGUsIGFuZCBvcHRpb25hbGx5IHNlYXJjaGluZyBpdHMgY2hpbGRyZW4gcmVjdXJzaXZlbHkuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHJlbW92ZUNvbnN0cmFpbnRcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50fSBjb25zdHJhaW50XG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZGVlcD1mYWxzZV1cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGUgd2l0aCB0aGUgY29uc3RyYWludCByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZUNvbnN0cmFpbnQgPSBmdW5jdGlvbihjb21wb3NpdGUsIGNvbnN0cmFpbnQsIGRlZXApIHtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gQ29tbW9uLmluZGV4T2YoY29tcG9zaXRlLmNvbnN0cmFpbnRzLCBjb25zdHJhaW50KTtcbiAgICAgICAgaWYgKHBvc2l0aW9uICE9PSAtMSkge1xuICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUNvbnN0cmFpbnRBdChjb21wb3NpdGUsIHBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQ29uc3RyYWludChjb21wb3NpdGUuY29tcG9zaXRlc1tpXSwgY29uc3RyYWludCwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgYm9keSBmcm9tIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHJlbW92ZUNvbnN0cmFpbnRBdFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcG9zaXRpb25cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGUgd2l0aCB0aGUgY29uc3RyYWludCByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZUNvbnN0cmFpbnRBdCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgcG9zaXRpb24pIHtcbiAgICAgICAgY29tcG9zaXRlLmNvbnN0cmFpbnRzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhbGwgYm9kaWVzLCBjb25zdHJhaW50cyBhbmQgY29tcG9zaXRlcyBmcm9tIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogT3B0aW9uYWxseSBjbGVhcmluZyBpdHMgY2hpbGRyZW4gcmVjdXJzaXZlbHkuXG4gICAgICogQG1ldGhvZCBjbGVhclxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGtlZXBTdGF0aWNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtkZWVwPWZhbHNlXVxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5jbGVhciA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwga2VlcFN0YXRpYywgZGVlcCkge1xuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wb3NpdGUuY29tcG9zaXRlcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLmNsZWFyKGNvbXBvc2l0ZS5jb21wb3NpdGVzW2ldLCBrZWVwU3RhdGljLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGtlZXBTdGF0aWMpIHtcbiAgICAgICAgICAgIGNvbXBvc2l0ZS5ib2RpZXMgPSBjb21wb3NpdGUuYm9kaWVzLmZpbHRlcihmdW5jdGlvbihib2R5KSB7IHJldHVybiBib2R5LmlzU3RhdGljOyB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBvc2l0ZS5ib2RpZXMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbXBvc2l0ZS5jb25zdHJhaW50cy5sZW5ndGggPSAwO1xuICAgICAgICBjb21wb3NpdGUuY29tcG9zaXRlcy5sZW5ndGggPSAwO1xuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgYm9kaWVzIGluIHRoZSBnaXZlbiBjb21wb3NpdGUsIGluY2x1ZGluZyBhbGwgYm9kaWVzIGluIGl0cyBjaGlsZHJlbiwgcmVjdXJzaXZlbHkuXG4gICAgICogQG1ldGhvZCBhbGxCb2RpZXNcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHJldHVybiB7Ym9keVtdfSBBbGwgdGhlIGJvZGllc1xuICAgICAqL1xuICAgIENvbXBvc2l0ZS5hbGxCb2RpZXMgPSBmdW5jdGlvbihjb21wb3NpdGUpIHtcbiAgICAgICAgdmFyIGJvZGllcyA9IFtdLmNvbmNhdChjb21wb3NpdGUuYm9kaWVzKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgYm9kaWVzID0gYm9kaWVzLmNvbmNhdChDb21wb3NpdGUuYWxsQm9kaWVzKGNvbXBvc2l0ZS5jb21wb3NpdGVzW2ldKSk7XG5cbiAgICAgICAgcmV0dXJuIGJvZGllcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgY29uc3RyYWludHMgaW4gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgaW5jbHVkaW5nIGFsbCBjb25zdHJhaW50cyBpbiBpdHMgY2hpbGRyZW4sIHJlY3Vyc2l2ZWx5LlxuICAgICAqIEBtZXRob2QgYWxsQ29uc3RyYWludHNcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHJldHVybiB7Y29uc3RyYWludFtdfSBBbGwgdGhlIGNvbnN0cmFpbnRzXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzID0gZnVuY3Rpb24oY29tcG9zaXRlKSB7XG4gICAgICAgIHZhciBjb25zdHJhaW50cyA9IFtdLmNvbmNhdChjb21wb3NpdGUuY29uc3RyYWludHMpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBjb25zdHJhaW50cyA9IGNvbnN0cmFpbnRzLmNvbmNhdChDb21wb3NpdGUuYWxsQ29uc3RyYWludHMoY29tcG9zaXRlLmNvbXBvc2l0ZXNbaV0pKTtcblxuICAgICAgICByZXR1cm4gY29uc3RyYWludHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYWxsIGNvbXBvc2l0ZXMgaW4gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgaW5jbHVkaW5nIGFsbCBjb21wb3NpdGVzIGluIGl0cyBjaGlsZHJlbiwgcmVjdXJzaXZlbHkuXG4gICAgICogQG1ldGhvZCBhbGxDb21wb3NpdGVzXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZVtdfSBBbGwgdGhlIGNvbXBvc2l0ZXNcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuYWxsQ29tcG9zaXRlcyA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSkge1xuICAgICAgICB2YXIgY29tcG9zaXRlcyA9IFtdLmNvbmNhdChjb21wb3NpdGUuY29tcG9zaXRlcyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wb3NpdGUuY29tcG9zaXRlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGNvbXBvc2l0ZXMgPSBjb21wb3NpdGVzLmNvbmNhdChDb21wb3NpdGUuYWxsQ29tcG9zaXRlcyhjb21wb3NpdGUuY29tcG9zaXRlc1tpXSkpO1xuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZWFyY2hlcyB0aGUgY29tcG9zaXRlIHJlY3Vyc2l2ZWx5IGZvciBhbiBvYmplY3QgbWF0Y2hpbmcgdGhlIHR5cGUgYW5kIGlkIHN1cHBsaWVkLCBudWxsIGlmIG5vdCBmb3VuZC5cbiAgICAgKiBAbWV0aG9kIGdldFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gVGhlIHJlcXVlc3RlZCBvYmplY3QsIGlmIGZvdW5kXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmdldCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgaWQsIHR5cGUpIHtcbiAgICAgICAgdmFyIG9iamVjdHMsXG4gICAgICAgICAgICBvYmplY3Q7XG5cbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2JvZHknOlxuICAgICAgICAgICAgb2JqZWN0cyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMoY29tcG9zaXRlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjb25zdHJhaW50JzpcbiAgICAgICAgICAgIG9iamVjdHMgPSBDb21wb3NpdGUuYWxsQ29uc3RyYWludHMoY29tcG9zaXRlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjb21wb3NpdGUnOlxuICAgICAgICAgICAgb2JqZWN0cyA9IENvbXBvc2l0ZS5hbGxDb21wb3NpdGVzKGNvbXBvc2l0ZSkuY29uY2F0KGNvbXBvc2l0ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb2JqZWN0cylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICAgIG9iamVjdCA9IG9iamVjdHMuZmlsdGVyKGZ1bmN0aW9uKG9iamVjdCkgeyBcbiAgICAgICAgICAgIHJldHVybiBvYmplY3QuaWQudG9TdHJpbmcoKSA9PT0gaWQudG9TdHJpbmcoKTsgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBvYmplY3QubGVuZ3RoID09PSAwID8gbnVsbCA6IG9iamVjdFswXTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIGdpdmVuIG9iamVjdChzKSBmcm9tIGNvbXBvc2l0ZUEgdG8gY29tcG9zaXRlQiAoZXF1YWwgdG8gYSByZW1vdmUgZm9sbG93ZWQgYnkgYW4gYWRkKS5cbiAgICAgKiBAbWV0aG9kIG1vdmVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZUF9IGNvbXBvc2l0ZUFcbiAgICAgKiBAcGFyYW0ge29iamVjdFtdfSBvYmplY3RzXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGVCfSBjb21wb3NpdGVCXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBSZXR1cm5zIGNvbXBvc2l0ZUFcbiAgICAgKi9cbiAgICBDb21wb3NpdGUubW92ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZUEsIG9iamVjdHMsIGNvbXBvc2l0ZUIpIHtcbiAgICAgICAgQ29tcG9zaXRlLnJlbW92ZShjb21wb3NpdGVBLCBvYmplY3RzKTtcbiAgICAgICAgQ29tcG9zaXRlLmFkZChjb21wb3NpdGVCLCBvYmplY3RzKTtcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZUE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFzc2lnbnMgbmV3IGlkcyBmb3IgYWxsIG9iamVjdHMgaW4gdGhlIGNvbXBvc2l0ZSwgcmVjdXJzaXZlbHkuXG4gICAgICogQG1ldGhvZCByZWJhc2VcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBSZXR1cm5zIGNvbXBvc2l0ZVxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5yZWJhc2UgPSBmdW5jdGlvbihjb21wb3NpdGUpIHtcbiAgICAgICAgdmFyIG9iamVjdHMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKGNvbXBvc2l0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jb25jYXQoQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzKGNvbXBvc2l0ZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KENvbXBvc2l0ZS5hbGxDb21wb3NpdGVzKGNvbXBvc2l0ZSkpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgb2JqZWN0c1tpXS5pZCA9IENvbW1vbi5uZXh0SWQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2xhdGVzIGFsbCBjaGlsZHJlbiBpbiB0aGUgY29tcG9zaXRlIGJ5IGEgZ2l2ZW4gdmVjdG9yIHJlbGF0aXZlIHRvIHRoZWlyIGN1cnJlbnQgcG9zaXRpb25zLCBcbiAgICAgKiB3aXRob3V0IGltcGFydGluZyBhbnkgdmVsb2NpdHkuXG4gICAgICogQG1ldGhvZCB0cmFuc2xhdGVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHRyYW5zbGF0aW9uXG4gICAgICogQHBhcmFtIHtib29sfSBbcmVjdXJzaXZlPXRydWVdXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgdHJhbnNsYXRpb24sIHJlY3Vyc2l2ZSkge1xuICAgICAgICB2YXIgYm9kaWVzID0gcmVjdXJzaXZlID8gQ29tcG9zaXRlLmFsbEJvZGllcyhjb21wb3NpdGUpIDogY29tcG9zaXRlLmJvZGllcztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgQm9keS50cmFuc2xhdGUoYm9kaWVzW2ldLCB0cmFuc2xhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUm90YXRlcyBhbGwgY2hpbGRyZW4gaW4gdGhlIGNvbXBvc2l0ZSBieSBhIGdpdmVuIGFuZ2xlIGFib3V0IHRoZSBnaXZlbiBwb2ludCwgd2l0aG91dCBpbXBhcnRpbmcgYW55IGFuZ3VsYXIgdmVsb2NpdHkuXG4gICAgICogQG1ldGhvZCByb3RhdGVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvdGF0aW9uXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICogQHBhcmFtIHtib29sfSBbcmVjdXJzaXZlPXRydWVdXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJvdGF0ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgcm90YXRpb24sIHBvaW50LCByZWN1cnNpdmUpIHtcbiAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKHJvdGF0aW9uKSxcbiAgICAgICAgICAgIHNpbiA9IE1hdGguc2luKHJvdGF0aW9uKSxcbiAgICAgICAgICAgIGJvZGllcyA9IHJlY3Vyc2l2ZSA/IENvbXBvc2l0ZS5hbGxCb2RpZXMoY29tcG9zaXRlKSA6IGNvbXBvc2l0ZS5ib2RpZXM7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldLFxuICAgICAgICAgICAgICAgIGR4ID0gYm9keS5wb3NpdGlvbi54IC0gcG9pbnQueCxcbiAgICAgICAgICAgICAgICBkeSA9IGJvZHkucG9zaXRpb24ueSAtIHBvaW50Lnk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBCb2R5LnNldFBvc2l0aW9uKGJvZHksIHtcbiAgICAgICAgICAgICAgICB4OiBwb2ludC54ICsgKGR4ICogY29zIC0gZHkgKiBzaW4pLFxuICAgICAgICAgICAgICAgIHk6IHBvaW50LnkgKyAoZHggKiBzaW4gKyBkeSAqIGNvcylcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBCb2R5LnJvdGF0ZShib2R5LCByb3RhdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2NhbGVzIGFsbCBjaGlsZHJlbiBpbiB0aGUgY29tcG9zaXRlLCBpbmNsdWRpbmcgdXBkYXRpbmcgcGh5c2ljYWwgcHJvcGVydGllcyAobWFzcywgYXJlYSwgYXhlcywgaW5lcnRpYSksIGZyb20gYSB3b3JsZC1zcGFjZSBwb2ludC5cbiAgICAgKiBAbWV0aG9kIHNjYWxlXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsZVhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGVZXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICogQHBhcmFtIHtib29sfSBbcmVjdXJzaXZlPXRydWVdXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnNjYWxlID0gZnVuY3Rpb24oY29tcG9zaXRlLCBzY2FsZVgsIHNjYWxlWSwgcG9pbnQsIHJlY3Vyc2l2ZSkge1xuICAgICAgICB2YXIgYm9kaWVzID0gcmVjdXJzaXZlID8gQ29tcG9zaXRlLmFsbEJvZGllcyhjb21wb3NpdGUpIDogY29tcG9zaXRlLmJvZGllcztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgZHggPSBib2R5LnBvc2l0aW9uLnggLSBwb2ludC54LFxuICAgICAgICAgICAgICAgIGR5ID0gYm9keS5wb3NpdGlvbi55IC0gcG9pbnQueTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIEJvZHkuc2V0UG9zaXRpb24oYm9keSwge1xuICAgICAgICAgICAgICAgIHg6IHBvaW50LnggKyBkeCAqIHNjYWxlWCxcbiAgICAgICAgICAgICAgICB5OiBwb2ludC55ICsgZHkgKiBzY2FsZVlcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBCb2R5LnNjYWxlKGJvZHksIHNjYWxlWCwgc2NhbGVZKTtcbiAgICAgICAgfVxuXG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKlxuICAgICpcbiAgICAqICBFdmVudHMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIGEgY2FsbCB0byBgQ29tcG9zaXRlLmFkZGAgaXMgbWFkZSwgYmVmb3JlIG9iamVjdHMgaGF2ZSBiZWVuIGFkZGVkLlxuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVBZGRcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5vYmplY3QgVGhlIG9iamVjdChzKSB0byBiZSBhZGRlZCAobWF5IGJlIGEgc2luZ2xlIGJvZHksIGNvbnN0cmFpbnQsIGNvbXBvc2l0ZSBvciBhIG1peGVkIGFycmF5IG9mIHRoZXNlKVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBjYWxsIHRvIGBDb21wb3NpdGUuYWRkYCBpcyBtYWRlLCBhZnRlciBvYmplY3RzIGhhdmUgYmVlbiBhZGRlZC5cbiAgICAqXG4gICAgKiBAZXZlbnQgYWZ0ZXJBZGRcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5vYmplY3QgVGhlIG9iamVjdChzKSB0aGF0IGhhdmUgYmVlbiBhZGRlZCAobWF5IGJlIGEgc2luZ2xlIGJvZHksIGNvbnN0cmFpbnQsIGNvbXBvc2l0ZSBvciBhIG1peGVkIGFycmF5IG9mIHRoZXNlKVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBjYWxsIHRvIGBDb21wb3NpdGUucmVtb3ZlYCBpcyBtYWRlLCBiZWZvcmUgb2JqZWN0cyBoYXZlIGJlZW4gcmVtb3ZlZC5cbiAgICAqXG4gICAgKiBAZXZlbnQgYmVmb3JlUmVtb3ZlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQub2JqZWN0IFRoZSBvYmplY3QocykgdG8gYmUgcmVtb3ZlZCAobWF5IGJlIGEgc2luZ2xlIGJvZHksIGNvbnN0cmFpbnQsIGNvbXBvc2l0ZSBvciBhIG1peGVkIGFycmF5IG9mIHRoZXNlKVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBjYWxsIHRvIGBDb21wb3NpdGUucmVtb3ZlYCBpcyBtYWRlLCBhZnRlciBvYmplY3RzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgICpcbiAgICAqIEBldmVudCBhZnRlclJlbW92ZVxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm9iamVjdCBUaGUgb2JqZWN0KHMpIHRoYXQgaGF2ZSBiZWVuIHJlbW92ZWQgKG1heSBiZSBhIHNpbmdsZSBib2R5LCBjb25zdHJhaW50LCBjb21wb3NpdGUgb3IgYSBtaXhlZCBhcnJheSBvZiB0aGVzZSlcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHVuaXF1ZWx5IGlkZW50aWZ5aW5nIG51bWJlciBnZW5lcmF0ZWQgaW4gYENvbXBvc2l0ZS5jcmVhdGVgIGJ5IGBDb21tb24ubmV4dElkYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpZFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgU3RyaW5nYCBkZW5vdGluZyB0aGUgdHlwZSBvZiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdHlwZVxuICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAqIEBkZWZhdWx0IFwiY29tcG9zaXRlXCJcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFyYml0cmFyeSBgU3RyaW5nYCBuYW1lIHRvIGhlbHAgdGhlIHVzZXIgaWRlbnRpZnkgYW5kIG1hbmFnZSBjb21wb3NpdGVzLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGxhYmVsXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJDb21wb3NpdGVcIlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgc3BlY2lmaWVzIHdoZXRoZXIgdGhlIGNvbXBvc2l0ZSBoYXMgYmVlbiBtb2RpZmllZCBkdXJpbmcgdGhlIGN1cnJlbnQgc3RlcC5cbiAgICAgKiBNb3N0IGBNYXR0ZXIuQ29tcG9zaXRlYCBtZXRob2RzIHdpbGwgYXV0b21hdGljYWxseSBzZXQgdGhpcyBmbGFnIHRvIGB0cnVlYCB0byBpbmZvcm0gdGhlIGVuZ2luZSBvZiBjaGFuZ2VzIHRvIGJlIGhhbmRsZWQuXG4gICAgICogSWYgeW91IG5lZWQgdG8gY2hhbmdlIGl0IG1hbnVhbGx5LCB5b3Ugc2hvdWxkIHVzZSB0aGUgYENvbXBvc2l0ZS5zZXRNb2RpZmllZGAgbWV0aG9kLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlzTW9kaWZpZWRcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBgQ29tcG9zaXRlYCB0aGF0IGlzIHRoZSBwYXJlbnQgb2YgdGhpcyBjb21wb3NpdGUuIEl0IGlzIGF1dG9tYXRpY2FsbHkgbWFuYWdlZCBieSB0aGUgYE1hdHRlci5Db21wb3NpdGVgIG1ldGhvZHMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcGFyZW50XG4gICAgICogQHR5cGUgY29tcG9zaXRlXG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgYEJvZHlgIHRoYXQgYXJlIF9kaXJlY3RfIGNoaWxkcmVuIG9mIHRoaXMgY29tcG9zaXRlLlxuICAgICAqIFRvIGFkZCBvciByZW1vdmUgYm9kaWVzIHlvdSBzaG91bGQgdXNlIGBDb21wb3NpdGUuYWRkYCBhbmQgYENvbXBvc2l0ZS5yZW1vdmVgIG1ldGhvZHMgcmF0aGVyIHRoYW4gZGlyZWN0bHkgbW9kaWZ5aW5nIHRoaXMgcHJvcGVydHkuXG4gICAgICogSWYgeW91IHdpc2ggdG8gcmVjdXJzaXZlbHkgZmluZCBhbGwgZGVzY2VuZGFudHMsIHlvdSBzaG91bGQgdXNlIHRoZSBgQ29tcG9zaXRlLmFsbEJvZGllc2AgbWV0aG9kLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvZGllc1xuICAgICAqIEB0eXBlIGJvZHlbXVxuICAgICAqIEBkZWZhdWx0IFtdXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBgQ29uc3RyYWludGAgdGhhdCBhcmUgX2RpcmVjdF8gY2hpbGRyZW4gb2YgdGhpcyBjb21wb3NpdGUuXG4gICAgICogVG8gYWRkIG9yIHJlbW92ZSBjb25zdHJhaW50cyB5b3Ugc2hvdWxkIHVzZSBgQ29tcG9zaXRlLmFkZGAgYW5kIGBDb21wb3NpdGUucmVtb3ZlYCBtZXRob2RzIHJhdGhlciB0aGFuIGRpcmVjdGx5IG1vZGlmeWluZyB0aGlzIHByb3BlcnR5LlxuICAgICAqIElmIHlvdSB3aXNoIHRvIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIGRlc2NlbmRhbnRzLCB5b3Ugc2hvdWxkIHVzZSB0aGUgYENvbXBvc2l0ZS5hbGxDb25zdHJhaW50c2AgbWV0aG9kLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbnN0cmFpbnRzXG4gICAgICogQHR5cGUgY29uc3RyYWludFtdXG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIGBDb21wb3NpdGVgIHRoYXQgYXJlIF9kaXJlY3RfIGNoaWxkcmVuIG9mIHRoaXMgY29tcG9zaXRlLlxuICAgICAqIFRvIGFkZCBvciByZW1vdmUgY29tcG9zaXRlcyB5b3Ugc2hvdWxkIHVzZSBgQ29tcG9zaXRlLmFkZGAgYW5kIGBDb21wb3NpdGUucmVtb3ZlYCBtZXRob2RzIHJhdGhlciB0aGFuIGRpcmVjdGx5IG1vZGlmeWluZyB0aGlzIHByb3BlcnR5LlxuICAgICAqIElmIHlvdSB3aXNoIHRvIHJlY3Vyc2l2ZWx5IGZpbmQgYWxsIGRlc2NlbmRhbnRzLCB5b3Ugc2hvdWxkIHVzZSB0aGUgYENvbXBvc2l0ZS5hbGxDb21wb3NpdGVzYCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29tcG9zaXRlc1xuICAgICAqIEB0eXBlIGNvbXBvc2l0ZVtdXG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Xb3JsZGAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgdGhlIHdvcmxkIGNvbXBvc2l0ZS5cbiogQSBgTWF0dGVyLldvcmxkYCBpcyBhIGBNYXR0ZXIuQ29tcG9zaXRlYCBib2R5LCB3aGljaCBpcyBhIGNvbGxlY3Rpb24gb2YgYE1hdHRlci5Cb2R5YCwgYE1hdHRlci5Db25zdHJhaW50YCBhbmQgb3RoZXIgYE1hdHRlci5Db21wb3NpdGVgLlxuKiBBIGBNYXR0ZXIuV29ybGRgIGhhcyBhIGZldyBhZGRpdGlvbmFsIHByb3BlcnRpZXMgaW5jbHVkaW5nIGBncmF2aXR5YCBhbmQgYGJvdW5kc2AuXG4qIEl0IGlzIGltcG9ydGFudCB0byB1c2UgdGhlIGZ1bmN0aW9ucyBpbiB0aGUgYE1hdHRlci5Db21wb3NpdGVgIG1vZHVsZSB0byBtb2RpZnkgdGhlIHdvcmxkIGNvbXBvc2l0ZSwgcmF0aGVyIHRoYW4gZGlyZWN0bHkgbW9kaWZ5aW5nIGl0cyBwcm9wZXJ0aWVzLlxuKiBUaGVyZSBhcmUgYWxzbyBhIGZldyBtZXRob2RzIGhlcmUgdGhhdCBhbGlhcyB0aG9zZSBpbiBgTWF0dGVyLkNvbXBvc2l0ZWAgZm9yIGVhc2llciByZWFkYWJpbGl0eS5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIFdvcmxkXG4qIEBleHRlbmRzIENvbXBvc2l0ZVxuKi9cblxudmFyIFdvcmxkID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gV29ybGQ7XG5cbnZhciBDb21wb3NpdGUgPSByZXF1aXJlKCcuL0NvbXBvc2l0ZScpO1xudmFyIENvbnN0cmFpbnQgPSByZXF1aXJlKCcuLi9jb25zdHJhaW50L0NvbnN0cmFpbnQnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHdvcmxkIGNvbXBvc2l0ZS4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gYmVsb3cgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7d29ybGR9IEEgbmV3IHdvcmxkXG4gICAgICovXG4gICAgV29ybGQuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgY29tcG9zaXRlID0gQ29tcG9zaXRlLmNyZWF0ZSgpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGxhYmVsOiAnV29ybGQnLFxuICAgICAgICAgICAgZ3Jhdml0eToge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogMSxcbiAgICAgICAgICAgICAgICBzY2FsZTogMC4wMDFcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBib3VuZHM6IHsgXG4gICAgICAgICAgICAgICAgbWluOiB7IHg6IC1JbmZpbml0eSwgeTogLUluZmluaXR5IH0sIFxuICAgICAgICAgICAgICAgIG1heDogeyB4OiBJbmZpbml0eSwgeTogSW5maW5pdHkgfSBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBDb21tb24uZXh0ZW5kKGNvbXBvc2l0ZSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvKlxuICAgICpcbiAgICAqICBQcm9wZXJ0aWVzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBncmF2aXR5IHRvIGFwcGx5IG9uIHRoZSB3b3JsZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBncmF2aXR5XG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ3Jhdml0eSB4IGNvbXBvbmVudC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBncmF2aXR5LnhcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ3Jhdml0eSB5IGNvbXBvbmVudC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBncmF2aXR5LnlcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKiBAZGVmYXVsdCAxXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ3Jhdml0eSBzY2FsZSBmYWN0b3IuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgZ3Jhdml0eS5zY2FsZVxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqIEBkZWZhdWx0IDAuMDAxXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBCb3VuZHNgIG9iamVjdCB0aGF0IGRlZmluZXMgdGhlIHdvcmxkIGJvdW5kcyBmb3IgY29sbGlzaW9uIGRldGVjdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBib3VuZHNcbiAgICAgKiBAdHlwZSBib3VuZHNcbiAgICAgKiBAZGVmYXVsdCB7IG1pbjogeyB4OiAtSW5maW5pdHksIHk6IC1JbmZpbml0eSB9LCBtYXg6IHsgeDogSW5maW5pdHksIHk6IEluZmluaXR5IH0gfVxuICAgICAqL1xuXG4gICAgLy8gV29ybGQgaXMgYSBDb21wb3NpdGUgYm9keVxuICAgIC8vIHNlZSBzcmMvbW9kdWxlL091dHJvLmpzIGZvciB0aGVzZSBhbGlhc2VzOlxuICAgIFxuICAgIC8qKlxuICAgICAqIEFuIGFsaWFzIGZvciBDb21wb3NpdGUuY2xlYXJcbiAgICAgKiBAbWV0aG9kIGNsZWFyXG4gICAgICogQHBhcmFtIHt3b3JsZH0gd29ybGRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGtlZXBTdGF0aWNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFsaWFzIGZvciBDb21wb3NpdGUuYWRkXG4gICAgICogQG1ldGhvZCBhZGRDb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge3dvcmxkfSB3b3JsZFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcmV0dXJuIHt3b3JsZH0gVGhlIG9yaWdpbmFsIHdvcmxkIHdpdGggdGhlIG9iamVjdHMgZnJvbSBjb21wb3NpdGUgYWRkZWRcbiAgICAgKi9cbiAgICBcbiAgICAgLyoqXG4gICAgICAqIEFuIGFsaWFzIGZvciBDb21wb3NpdGUuYWRkQm9keVxuICAgICAgKiBAbWV0aG9kIGFkZEJvZHlcbiAgICAgICogQHBhcmFtIHt3b3JsZH0gd29ybGRcbiAgICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICAqIEByZXR1cm4ge3dvcmxkfSBUaGUgb3JpZ2luYWwgd29ybGQgd2l0aCB0aGUgYm9keSBhZGRlZFxuICAgICAgKi9cblxuICAgICAvKipcbiAgICAgICogQW4gYWxpYXMgZm9yIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50XG4gICAgICAqIEBtZXRob2QgYWRkQ29uc3RyYWludFxuICAgICAgKiBAcGFyYW0ge3dvcmxkfSB3b3JsZFxuICAgICAgKiBAcGFyYW0ge2NvbnN0cmFpbnR9IGNvbnN0cmFpbnRcbiAgICAgICogQHJldHVybiB7d29ybGR9IFRoZSBvcmlnaW5hbCB3b3JsZCB3aXRoIHRoZSBjb25zdHJhaW50IGFkZGVkXG4gICAgICAqL1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkNvbnRhY3RgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGNvbGxpc2lvbiBjb250YWN0cy5cbipcbiogQGNsYXNzIENvbnRhY3RcbiovXG5cbnZhciBDb250YWN0ID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGFjdDtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBjb250YWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt2ZXJ0ZXh9IHZlcnRleFxuICAgICAqIEByZXR1cm4ge2NvbnRhY3R9IEEgbmV3IGNvbnRhY3RcbiAgICAgKi9cbiAgICBDb250YWN0LmNyZWF0ZSA9IGZ1bmN0aW9uKHZlcnRleCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaWQ6IENvbnRhY3QuaWQodmVydGV4KSxcbiAgICAgICAgICAgIHZlcnRleDogdmVydGV4LFxuICAgICAgICAgICAgbm9ybWFsSW1wdWxzZTogMCxcbiAgICAgICAgICAgIHRhbmdlbnRJbXB1bHNlOiAwXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYSBjb250YWN0IGlkLlxuICAgICAqIEBtZXRob2QgaWRcbiAgICAgKiBAcGFyYW0ge3ZlcnRleH0gdmVydGV4XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBVbmlxdWUgY29udGFjdElEXG4gICAgICovXG4gICAgQ29udGFjdC5pZCA9IGZ1bmN0aW9uKHZlcnRleCkge1xuICAgICAgICByZXR1cm4gdmVydGV4LmJvZHkuaWQgKyAnXycgKyB2ZXJ0ZXguaW5kZXg7XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5EZXRlY3RvcmAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGRldGVjdGluZyBjb2xsaXNpb25zIGdpdmVuIGEgc2V0IG9mIHBhaXJzLlxuKlxuKiBAY2xhc3MgRGV0ZWN0b3JcbiovXG5cbi8vIFRPRE86IHNwZWN1bGF0aXZlIGNvbnRhY3RzXG5cbnZhciBEZXRlY3RvciA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERldGVjdG9yO1xuXG52YXIgU0FUID0gcmVxdWlyZSgnLi9TQVQnKTtcbnZhciBQYWlyID0gcmVxdWlyZSgnLi9QYWlyJyk7XG52YXIgQm91bmRzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQm91bmRzJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFsbCBjb2xsaXNpb25zIGdpdmVuIGEgbGlzdCBvZiBwYWlycy5cbiAgICAgKiBAbWV0aG9kIGNvbGxpc2lvbnNcbiAgICAgKiBAcGFyYW0ge3BhaXJbXX0gYnJvYWRwaGFzZVBhaXJzXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqIEByZXR1cm4ge2FycmF5fSBjb2xsaXNpb25zXG4gICAgICovXG4gICAgRGV0ZWN0b3IuY29sbGlzaW9ucyA9IGZ1bmN0aW9uKGJyb2FkcGhhc2VQYWlycywgZW5naW5lKSB7XG4gICAgICAgIHZhciBjb2xsaXNpb25zID0gW10sXG4gICAgICAgICAgICBwYWlyc1RhYmxlID0gZW5naW5lLnBhaXJzLnRhYmxlO1xuXG4gICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICB2YXIgbWV0cmljcyA9IGVuZ2luZS5tZXRyaWNzO1xuICAgICAgICAvLyBAZW5kaWZcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnJvYWRwaGFzZVBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keUEgPSBicm9hZHBoYXNlUGFpcnNbaV1bMF0sIFxuICAgICAgICAgICAgICAgIGJvZHlCID0gYnJvYWRwaGFzZVBhaXJzW2ldWzFdO1xuXG4gICAgICAgICAgICBpZiAoKGJvZHlBLmlzU3RhdGljIHx8IGJvZHlBLmlzU2xlZXBpbmcpICYmIChib2R5Qi5pc1N0YXRpYyB8fCBib2R5Qi5pc1NsZWVwaW5nKSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFEZXRlY3Rvci5jYW5Db2xsaWRlKGJvZHlBLmNvbGxpc2lvbkZpbHRlciwgYm9keUIuY29sbGlzaW9uRmlsdGVyKSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgICAgICBtZXRyaWNzLm1pZHBoYXNlVGVzdHMgKz0gMTtcbiAgICAgICAgICAgIC8vIEBlbmRpZlxuXG4gICAgICAgICAgICAvLyBtaWQgcGhhc2VcbiAgICAgICAgICAgIGlmIChCb3VuZHMub3ZlcmxhcHMoYm9keUEuYm91bmRzLCBib2R5Qi5ib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGJvZHlBLnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgaiA8IGJvZHlBLnBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJ0QSA9IGJvZHlBLnBhcnRzW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSBib2R5Qi5wYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGsgPCBib2R5Qi5wYXJ0cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnRCID0gYm9keUIucGFydHNba107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgocGFydEEgPT09IGJvZHlBICYmIHBhcnRCID09PSBib2R5QikgfHwgQm91bmRzLm92ZXJsYXBzKHBhcnRBLmJvdW5kcywgcGFydEIuYm91bmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgYSBwcmV2aW91cyBjb2xsaXNpb24gd2UgY291bGQgcmV1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFpcklkID0gUGFpci5pZChwYXJ0QSwgcGFydEIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWlyID0gcGFpcnNUYWJsZVtwYWlySWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0NvbGxpc2lvbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYWlyICYmIHBhaXIuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNDb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0NvbGxpc2lvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbmFycm93IHBoYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxpc2lvbiA9IFNBVC5jb2xsaWRlcyhwYXJ0QSwgcGFydEIsIHByZXZpb3VzQ29sbGlzaW9uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3MubmFycm93cGhhc2VUZXN0cyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2xsaXNpb24ucmV1c2VkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRyaWNzLm5hcnJvd1JldXNlQ291bnQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBAZW5kaWZcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2xsaXNpb24uY29sbGlkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9ucy5wdXNoKGNvbGxpc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRyaWNzLm5hcnJvd0RldGVjdGlvbnMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQGVuZGlmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvbGxpc2lvbnM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHRydWVgIGlmIGJvdGggc3VwcGxpZWQgY29sbGlzaW9uIGZpbHRlcnMgd2lsbCBhbGxvdyBhIGNvbGxpc2lvbiB0byBvY2N1ci5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAbWV0aG9kIGNhbkNvbGxpZGVcbiAgICAgKiBAcGFyYW0ge30gZmlsdGVyQVxuICAgICAqIEBwYXJhbSB7fSBmaWx0ZXJCXG4gICAgICogQHJldHVybiB7Ym9vbH0gYHRydWVgIGlmIGNvbGxpc2lvbiBjYW4gb2NjdXJcbiAgICAgKi9cbiAgICBEZXRlY3Rvci5jYW5Db2xsaWRlID0gZnVuY3Rpb24oZmlsdGVyQSwgZmlsdGVyQikge1xuICAgICAgICBpZiAoZmlsdGVyQS5ncm91cCA9PT0gZmlsdGVyQi5ncm91cCAmJiBmaWx0ZXJBLmdyb3VwICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIGZpbHRlckEuZ3JvdXAgPiAwO1xuXG4gICAgICAgIHJldHVybiAoZmlsdGVyQS5tYXNrICYgZmlsdGVyQi5jYXRlZ29yeSkgIT09IDAgJiYgKGZpbHRlckIubWFzayAmIGZpbHRlckEuY2F0ZWdvcnkpICE9PSAwO1xuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuR3JpZGAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgY29sbGlzaW9uIGJyb2FkcGhhc2UgZ3JpZCBzdHJ1Y3R1cmVzLlxuKlxuKiBAY2xhc3MgR3JpZFxuKi9cblxudmFyIEdyaWQgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmlkO1xuXG52YXIgUGFpciA9IHJlcXVpcmUoJy4vUGFpcicpO1xudmFyIERldGVjdG9yID0gcmVxdWlyZSgnLi9EZXRlY3RvcicpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgZ3JpZC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7Z3JpZH0gQSBuZXcgZ3JpZFxuICAgICAqL1xuICAgIEdyaWQuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjb250cm9sbGVyOiBHcmlkLFxuICAgICAgICAgICAgZGV0ZWN0b3I6IERldGVjdG9yLmNvbGxpc2lvbnMsXG4gICAgICAgICAgICBidWNrZXRzOiB7fSxcbiAgICAgICAgICAgIHBhaXJzOiB7fSxcbiAgICAgICAgICAgIHBhaXJzTGlzdDogW10sXG4gICAgICAgICAgICBidWNrZXRXaWR0aDogNDgsXG4gICAgICAgICAgICBidWNrZXRIZWlnaHQ6IDQ4XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgd2lkdGggb2YgYSBzaW5nbGUgZ3JpZCBidWNrZXQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYnVja2V0V2lkdGhcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCA0OFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGhlaWdodCBvZiBhIHNpbmdsZSBncmlkIGJ1Y2tldC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBidWNrZXRIZWlnaHRcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCA0OFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgZ3JpZC5cbiAgICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7Z3JpZH0gZ3JpZFxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQHBhcmFtIHtib29sZWFufSBmb3JjZVVwZGF0ZVxuICAgICAqL1xuICAgIEdyaWQudXBkYXRlID0gZnVuY3Rpb24oZ3JpZCwgYm9kaWVzLCBlbmdpbmUsIGZvcmNlVXBkYXRlKSB7XG4gICAgICAgIHZhciBpLCBjb2wsIHJvdyxcbiAgICAgICAgICAgIHdvcmxkID0gZW5naW5lLndvcmxkLFxuICAgICAgICAgICAgYnVja2V0cyA9IGdyaWQuYnVja2V0cyxcbiAgICAgICAgICAgIGJ1Y2tldCxcbiAgICAgICAgICAgIGJ1Y2tldElkLFxuICAgICAgICAgICAgZ3JpZENoYW5nZWQgPSBmYWxzZTtcblxuICAgICAgICAvLyBAaWYgREVCVUdcbiAgICAgICAgdmFyIG1ldHJpY3MgPSBlbmdpbmUubWV0cmljcztcbiAgICAgICAgbWV0cmljcy5icm9hZHBoYXNlVGVzdHMgPSAwO1xuICAgICAgICAvLyBAZW5kaWZcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgaWYgKGJvZHkuaXNTbGVlcGluZyAmJiAhZm9yY2VVcGRhdGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGRvbid0IHVwZGF0ZSBvdXQgb2Ygd29ybGQgYm9kaWVzXG4gICAgICAgICAgICBpZiAoYm9keS5ib3VuZHMubWF4LnggPCB3b3JsZC5ib3VuZHMubWluLnggfHwgYm9keS5ib3VuZHMubWluLnggPiB3b3JsZC5ib3VuZHMubWF4LnhcbiAgICAgICAgICAgICAgICB8fCBib2R5LmJvdW5kcy5tYXgueSA8IHdvcmxkLmJvdW5kcy5taW4ueSB8fCBib2R5LmJvdW5kcy5taW4ueSA+IHdvcmxkLmJvdW5kcy5tYXgueSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgdmFyIG5ld1JlZ2lvbiA9IF9nZXRSZWdpb24oZ3JpZCwgYm9keSk7XG5cbiAgICAgICAgICAgIC8vIGlmIHRoZSBib2R5IGhhcyBjaGFuZ2VkIGdyaWQgcmVnaW9uXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVnaW9uIHx8IG5ld1JlZ2lvbi5pZCAhPT0gYm9keS5yZWdpb24uaWQgfHwgZm9yY2VVcGRhdGUpIHtcblxuICAgICAgICAgICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICAgICAgICAgIG1ldHJpY3MuYnJvYWRwaGFzZVRlc3RzICs9IDE7XG4gICAgICAgICAgICAgICAgLy8gQGVuZGlmXG5cbiAgICAgICAgICAgICAgICBpZiAoIWJvZHkucmVnaW9uIHx8IGZvcmNlVXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBib2R5LnJlZ2lvbiA9IG5ld1JlZ2lvbjtcblxuICAgICAgICAgICAgICAgIHZhciB1bmlvbiA9IF9yZWdpb25VbmlvbihuZXdSZWdpb24sIGJvZHkucmVnaW9uKTtcblxuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBncmlkIGJ1Y2tldHMgYWZmZWN0ZWQgYnkgcmVnaW9uIGNoYW5nZVxuICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgdW5pb24gb2YgYm90aCByZWdpb25zXG4gICAgICAgICAgICAgICAgZm9yIChjb2wgPSB1bmlvbi5zdGFydENvbDsgY29sIDw9IHVuaW9uLmVuZENvbDsgY29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChyb3cgPSB1bmlvbi5zdGFydFJvdzsgcm93IDw9IHVuaW9uLmVuZFJvdzsgcm93KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldElkID0gX2dldEJ1Y2tldElkKGNvbCwgcm93KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldCA9IGJ1Y2tldHNbYnVja2V0SWRdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNJbnNpZGVOZXdSZWdpb24gPSAoY29sID49IG5ld1JlZ2lvbi5zdGFydENvbCAmJiBjb2wgPD0gbmV3UmVnaW9uLmVuZENvbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgcm93ID49IG5ld1JlZ2lvbi5zdGFydFJvdyAmJiByb3cgPD0gbmV3UmVnaW9uLmVuZFJvdyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0luc2lkZU9sZFJlZ2lvbiA9IChjb2wgPj0gYm9keS5yZWdpb24uc3RhcnRDb2wgJiYgY29sIDw9IGJvZHkucmVnaW9uLmVuZENvbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgcm93ID49IGJvZHkucmVnaW9uLnN0YXJ0Um93ICYmIHJvdyA8PSBib2R5LnJlZ2lvbi5lbmRSb3cpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgZnJvbSBvbGQgcmVnaW9uIGJ1Y2tldHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNJbnNpZGVOZXdSZWdpb24gJiYgaXNJbnNpZGVPbGRSZWdpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJbnNpZGVPbGRSZWdpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1Y2tldClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9idWNrZXRSZW1vdmVCb2R5KGdyaWQsIGJ1Y2tldCwgYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhZGQgdG8gbmV3IHJlZ2lvbiBidWNrZXRzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm9keS5yZWdpb24gPT09IG5ld1JlZ2lvbiB8fCAoaXNJbnNpZGVOZXdSZWdpb24gJiYgIWlzSW5zaWRlT2xkUmVnaW9uKSB8fCBmb3JjZVVwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYnVja2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWNrZXQgPSBfY3JlYXRlQnVja2V0KGJ1Y2tldHMsIGJ1Y2tldElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYnVja2V0QWRkQm9keShncmlkLCBidWNrZXQsIGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBuZXcgcmVnaW9uXG4gICAgICAgICAgICAgICAgYm9keS5yZWdpb24gPSBuZXdSZWdpb247XG5cbiAgICAgICAgICAgICAgICAvLyBmbGFnIGNoYW5nZXMgc28gd2UgY2FuIHVwZGF0ZSBwYWlyc1xuICAgICAgICAgICAgICAgIGdyaWRDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBwYWlycyBsaXN0IG9ubHkgaWYgcGFpcnMgY2hhbmdlZCAoaS5lLiBhIGJvZHkgY2hhbmdlZCByZWdpb24pXG4gICAgICAgIGlmIChncmlkQ2hhbmdlZClcbiAgICAgICAgICAgIGdyaWQucGFpcnNMaXN0ID0gX2NyZWF0ZUFjdGl2ZVBhaXJzTGlzdChncmlkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBncmlkLlxuICAgICAqIEBtZXRob2QgY2xlYXJcbiAgICAgKiBAcGFyYW0ge2dyaWR9IGdyaWRcbiAgICAgKi9cbiAgICBHcmlkLmNsZWFyID0gZnVuY3Rpb24oZ3JpZCkge1xuICAgICAgICBncmlkLmJ1Y2tldHMgPSB7fTtcbiAgICAgICAgZ3JpZC5wYWlycyA9IHt9O1xuICAgICAgICBncmlkLnBhaXJzTGlzdCA9IFtdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBGaW5kcyB0aGUgdW5pb24gb2YgdHdvIHJlZ2lvbnMuXG4gICAgICogQG1ldGhvZCBfcmVnaW9uVW5pb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSByZWdpb25BXG4gICAgICogQHBhcmFtIHt9IHJlZ2lvbkJcbiAgICAgKiBAcmV0dXJuIHt9IHJlZ2lvblxuICAgICAqL1xuICAgIHZhciBfcmVnaW9uVW5pb24gPSBmdW5jdGlvbihyZWdpb25BLCByZWdpb25CKSB7XG4gICAgICAgIHZhciBzdGFydENvbCA9IE1hdGgubWluKHJlZ2lvbkEuc3RhcnRDb2wsIHJlZ2lvbkIuc3RhcnRDb2wpLFxuICAgICAgICAgICAgZW5kQ29sID0gTWF0aC5tYXgocmVnaW9uQS5lbmRDb2wsIHJlZ2lvbkIuZW5kQ29sKSxcbiAgICAgICAgICAgIHN0YXJ0Um93ID0gTWF0aC5taW4ocmVnaW9uQS5zdGFydFJvdywgcmVnaW9uQi5zdGFydFJvdyksXG4gICAgICAgICAgICBlbmRSb3cgPSBNYXRoLm1heChyZWdpb25BLmVuZFJvdywgcmVnaW9uQi5lbmRSb3cpO1xuXG4gICAgICAgIHJldHVybiBfY3JlYXRlUmVnaW9uKHN0YXJ0Q29sLCBlbmRDb2wsIHN0YXJ0Um93LCBlbmRSb3cpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSByZWdpb24gYSBnaXZlbiBib2R5IGZhbGxzIGluIGZvciBhIGdpdmVuIGdyaWQuXG4gICAgICogQG1ldGhvZCBfZ2V0UmVnaW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gZ3JpZFxuICAgICAqIEBwYXJhbSB7fSBib2R5XG4gICAgICogQHJldHVybiB7fSByZWdpb25cbiAgICAgKi9cbiAgICB2YXIgX2dldFJlZ2lvbiA9IGZ1bmN0aW9uKGdyaWQsIGJvZHkpIHtcbiAgICAgICAgdmFyIGJvdW5kcyA9IGJvZHkuYm91bmRzLFxuICAgICAgICAgICAgc3RhcnRDb2wgPSBNYXRoLmZsb29yKGJvdW5kcy5taW4ueCAvIGdyaWQuYnVja2V0V2lkdGgpLFxuICAgICAgICAgICAgZW5kQ29sID0gTWF0aC5mbG9vcihib3VuZHMubWF4LnggLyBncmlkLmJ1Y2tldFdpZHRoKSxcbiAgICAgICAgICAgIHN0YXJ0Um93ID0gTWF0aC5mbG9vcihib3VuZHMubWluLnkgLyBncmlkLmJ1Y2tldEhlaWdodCksXG4gICAgICAgICAgICBlbmRSb3cgPSBNYXRoLmZsb29yKGJvdW5kcy5tYXgueSAvIGdyaWQuYnVja2V0SGVpZ2h0KTtcblxuICAgICAgICByZXR1cm4gX2NyZWF0ZVJlZ2lvbihzdGFydENvbCwgZW5kQ29sLCBzdGFydFJvdywgZW5kUm93KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHJlZ2lvbi5cbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVSZWdpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBzdGFydENvbFxuICAgICAqIEBwYXJhbSB7fSBlbmRDb2xcbiAgICAgKiBAcGFyYW0ge30gc3RhcnRSb3dcbiAgICAgKiBAcGFyYW0ge30gZW5kUm93XG4gICAgICogQHJldHVybiB7fSByZWdpb25cbiAgICAgKi9cbiAgICB2YXIgX2NyZWF0ZVJlZ2lvbiA9IGZ1bmN0aW9uKHN0YXJ0Q29sLCBlbmRDb2wsIHN0YXJ0Um93LCBlbmRSb3cpIHtcbiAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBpZDogc3RhcnRDb2wgKyAnLCcgKyBlbmRDb2wgKyAnLCcgKyBzdGFydFJvdyArICcsJyArIGVuZFJvdyxcbiAgICAgICAgICAgIHN0YXJ0Q29sOiBzdGFydENvbCwgXG4gICAgICAgICAgICBlbmRDb2w6IGVuZENvbCwgXG4gICAgICAgICAgICBzdGFydFJvdzogc3RhcnRSb3csIFxuICAgICAgICAgICAgZW5kUm93OiBlbmRSb3cgXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGJ1Y2tldCBpZCBhdCB0aGUgZ2l2ZW4gcG9zaXRpb24uXG4gICAgICogQG1ldGhvZCBfZ2V0QnVja2V0SWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBjb2x1bW5cbiAgICAgKiBAcGFyYW0ge30gcm93XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBidWNrZXQgaWRcbiAgICAgKi9cbiAgICB2YXIgX2dldEJ1Y2tldElkID0gZnVuY3Rpb24oY29sdW1uLCByb3cpIHtcbiAgICAgICAgcmV0dXJuIGNvbHVtbiArICcsJyArIHJvdztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGJ1Y2tldC5cbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVCdWNrZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBidWNrZXRzXG4gICAgICogQHBhcmFtIHt9IGJ1Y2tldElkXG4gICAgICogQHJldHVybiB7fSBidWNrZXRcbiAgICAgKi9cbiAgICB2YXIgX2NyZWF0ZUJ1Y2tldCA9IGZ1bmN0aW9uKGJ1Y2tldHMsIGJ1Y2tldElkKSB7XG4gICAgICAgIHZhciBidWNrZXQgPSBidWNrZXRzW2J1Y2tldElkXSA9IFtdO1xuICAgICAgICByZXR1cm4gYnVja2V0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgYm9keSB0byBhIGJ1Y2tldC5cbiAgICAgKiBAbWV0aG9kIF9idWNrZXRBZGRCb2R5XG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gZ3JpZFxuICAgICAqIEBwYXJhbSB7fSBidWNrZXRcbiAgICAgKiBAcGFyYW0ge30gYm9keVxuICAgICAqL1xuICAgIHZhciBfYnVja2V0QWRkQm9keSA9IGZ1bmN0aW9uKGdyaWQsIGJ1Y2tldCwgYm9keSkge1xuICAgICAgICAvLyBhZGQgbmV3IHBhaXJzXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVja2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keUIgPSBidWNrZXRbaV07XG5cbiAgICAgICAgICAgIGlmIChib2R5LmlkID09PSBib2R5Qi5pZCB8fCAoYm9keS5pc1N0YXRpYyAmJiBib2R5Qi5pc1N0YXRpYykpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgdGhlIG51bWJlciBvZiBidWNrZXRzIHRoZSBwYWlyIGV4aXN0cyBpblxuICAgICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBHcmlkLnVwZGF0ZSB0byB3b3JrXG4gICAgICAgICAgICB2YXIgcGFpcklkID0gUGFpci5pZChib2R5LCBib2R5QiksXG4gICAgICAgICAgICAgICAgcGFpciA9IGdyaWQucGFpcnNbcGFpcklkXTtcblxuICAgICAgICAgICAgaWYgKHBhaXIpIHtcbiAgICAgICAgICAgICAgICBwYWlyWzJdICs9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdyaWQucGFpcnNbcGFpcklkXSA9IFtib2R5LCBib2R5QiwgMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgdG8gYm9kaWVzIChhZnRlciBwYWlycywgb3RoZXJ3aXNlIHBhaXJzIHdpdGggc2VsZilcbiAgICAgICAgYnVja2V0LnB1c2goYm9keSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBib2R5IGZyb20gYSBidWNrZXQuXG4gICAgICogQG1ldGhvZCBfYnVja2V0UmVtb3ZlQm9keVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IGdyaWRcbiAgICAgKiBAcGFyYW0ge30gYnVja2V0XG4gICAgICogQHBhcmFtIHt9IGJvZHlcbiAgICAgKi9cbiAgICB2YXIgX2J1Y2tldFJlbW92ZUJvZHkgPSBmdW5jdGlvbihncmlkLCBidWNrZXQsIGJvZHkpIHtcbiAgICAgICAgLy8gcmVtb3ZlIGZyb20gYnVja2V0XG4gICAgICAgIGJ1Y2tldC5zcGxpY2UoQ29tbW9uLmluZGV4T2YoYnVja2V0LCBib2R5KSwgMSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIHBhaXIgY291bnRzXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVja2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHRoZSBudW1iZXIgb2YgYnVja2V0cyB0aGUgcGFpciBleGlzdHMgaW5cbiAgICAgICAgICAgIC8vIGltcG9ydGFudCBmb3IgX2NyZWF0ZUFjdGl2ZVBhaXJzTGlzdCB0byB3b3JrXG4gICAgICAgICAgICB2YXIgYm9keUIgPSBidWNrZXRbaV0sXG4gICAgICAgICAgICAgICAgcGFpcklkID0gUGFpci5pZChib2R5LCBib2R5QiksXG4gICAgICAgICAgICAgICAgcGFpciA9IGdyaWQucGFpcnNbcGFpcklkXTtcblxuICAgICAgICAgICAgaWYgKHBhaXIpXG4gICAgICAgICAgICAgICAgcGFpclsyXSAtPSAxO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIGxpc3Qgb2YgdGhlIGFjdGl2ZSBwYWlycyBpbiB0aGUgZ3JpZC5cbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVBY3RpdmVQYWlyc0xpc3RcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBncmlkXG4gICAgICogQHJldHVybiBbXSBwYWlyc1xuICAgICAqL1xuICAgIHZhciBfY3JlYXRlQWN0aXZlUGFpcnNMaXN0ID0gZnVuY3Rpb24oZ3JpZCkge1xuICAgICAgICB2YXIgcGFpcktleXMsXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgcGFpcnMgPSBbXTtcblxuICAgICAgICAvLyBncmlkLnBhaXJzIGlzIHVzZWQgYXMgYSBoYXNobWFwXG4gICAgICAgIHBhaXJLZXlzID0gQ29tbW9uLmtleXMoZ3JpZC5wYWlycyk7XG5cbiAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIGdyaWQucGFpcnNcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBwYWlyS2V5cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgcGFpciA9IGdyaWQucGFpcnNbcGFpcktleXNba11dO1xuXG4gICAgICAgICAgICAvLyBpZiBwYWlyIGV4aXN0cyBpbiBhdCBsZWFzdCBvbmUgYnVja2V0XG4gICAgICAgICAgICAvLyBpdCBpcyBhIHBhaXIgdGhhdCBuZWVkcyBmdXJ0aGVyIGNvbGxpc2lvbiB0ZXN0aW5nIHNvIHB1c2ggaXRcbiAgICAgICAgICAgIGlmIChwYWlyWzJdID4gMCkge1xuICAgICAgICAgICAgICAgIHBhaXJzLnB1c2gocGFpcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBncmlkLnBhaXJzW3BhaXJLZXlzW2tdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYWlycztcbiAgICB9O1xuICAgIFxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5QYWlyYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBjb2xsaXNpb24gcGFpcnMuXG4qXG4qIEBjbGFzcyBQYWlyXG4qL1xuXG52YXIgUGFpciA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhaXI7XG5cbnZhciBDb250YWN0ID0gcmVxdWlyZSgnLi9Db250YWN0Jyk7XG5cbihmdW5jdGlvbigpIHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcGFpci5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7Y29sbGlzaW9ufSBjb2xsaXNpb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wXG4gICAgICogQHJldHVybiB7cGFpcn0gQSBuZXcgcGFpclxuICAgICAqL1xuICAgIFBhaXIuY3JlYXRlID0gZnVuY3Rpb24oY29sbGlzaW9uLCB0aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIGJvZHlBID0gY29sbGlzaW9uLmJvZHlBLFxuICAgICAgICAgICAgYm9keUIgPSBjb2xsaXNpb24uYm9keUIsXG4gICAgICAgICAgICBwYXJlbnRBID0gY29sbGlzaW9uLnBhcmVudEEsXG4gICAgICAgICAgICBwYXJlbnRCID0gY29sbGlzaW9uLnBhcmVudEI7XG5cbiAgICAgICAgdmFyIHBhaXIgPSB7XG4gICAgICAgICAgICBpZDogUGFpci5pZChib2R5QSwgYm9keUIpLFxuICAgICAgICAgICAgYm9keUE6IGJvZHlBLFxuICAgICAgICAgICAgYm9keUI6IGJvZHlCLFxuICAgICAgICAgICAgY29udGFjdHM6IHt9LFxuICAgICAgICAgICAgYWN0aXZlQ29udGFjdHM6IFtdLFxuICAgICAgICAgICAgc2VwYXJhdGlvbjogMCxcbiAgICAgICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICAgICAgaXNTZW5zb3I6IGJvZHlBLmlzU2Vuc29yIHx8IGJvZHlCLmlzU2Vuc29yLFxuICAgICAgICAgICAgdGltZUNyZWF0ZWQ6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgIHRpbWVVcGRhdGVkOiB0aW1lc3RhbXAsXG4gICAgICAgICAgICBpbnZlcnNlTWFzczogcGFyZW50QS5pbnZlcnNlTWFzcyArIHBhcmVudEIuaW52ZXJzZU1hc3MsXG4gICAgICAgICAgICBmcmljdGlvbjogTWF0aC5taW4ocGFyZW50QS5mcmljdGlvbiwgcGFyZW50Qi5mcmljdGlvbiksXG4gICAgICAgICAgICBmcmljdGlvblN0YXRpYzogTWF0aC5tYXgocGFyZW50QS5mcmljdGlvblN0YXRpYywgcGFyZW50Qi5mcmljdGlvblN0YXRpYyksXG4gICAgICAgICAgICByZXN0aXR1dGlvbjogTWF0aC5tYXgocGFyZW50QS5yZXN0aXR1dGlvbiwgcGFyZW50Qi5yZXN0aXR1dGlvbiksXG4gICAgICAgICAgICBzbG9wOiBNYXRoLm1heChwYXJlbnRBLnNsb3AsIHBhcmVudEIuc2xvcClcbiAgICAgICAgfTtcblxuICAgICAgICBQYWlyLnVwZGF0ZShwYWlyLCBjb2xsaXNpb24sIHRpbWVzdGFtcCk7XG5cbiAgICAgICAgcmV0dXJuIHBhaXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgYSBwYWlyIGdpdmVuIGEgY29sbGlzaW9uLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtwYWlyfSBwYWlyXG4gICAgICogQHBhcmFtIHtjb2xsaXNpb259IGNvbGxpc2lvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBQYWlyLnVwZGF0ZSA9IGZ1bmN0aW9uKHBhaXIsIGNvbGxpc2lvbiwgdGltZXN0YW1wKSB7XG4gICAgICAgIHZhciBjb250YWN0cyA9IHBhaXIuY29udGFjdHMsXG4gICAgICAgICAgICBzdXBwb3J0cyA9IGNvbGxpc2lvbi5zdXBwb3J0cyxcbiAgICAgICAgICAgIGFjdGl2ZUNvbnRhY3RzID0gcGFpci5hY3RpdmVDb250YWN0cyxcbiAgICAgICAgICAgIHBhcmVudEEgPSBjb2xsaXNpb24ucGFyZW50QSxcbiAgICAgICAgICAgIHBhcmVudEIgPSBjb2xsaXNpb24ucGFyZW50QjtcbiAgICAgICAgXG4gICAgICAgIHBhaXIuY29sbGlzaW9uID0gY29sbGlzaW9uO1xuICAgICAgICBwYWlyLmludmVyc2VNYXNzID0gcGFyZW50QS5pbnZlcnNlTWFzcyArIHBhcmVudEIuaW52ZXJzZU1hc3M7XG4gICAgICAgIHBhaXIuZnJpY3Rpb24gPSBNYXRoLm1pbihwYXJlbnRBLmZyaWN0aW9uLCBwYXJlbnRCLmZyaWN0aW9uKTtcbiAgICAgICAgcGFpci5mcmljdGlvblN0YXRpYyA9IE1hdGgubWF4KHBhcmVudEEuZnJpY3Rpb25TdGF0aWMsIHBhcmVudEIuZnJpY3Rpb25TdGF0aWMpO1xuICAgICAgICBwYWlyLnJlc3RpdHV0aW9uID0gTWF0aC5tYXgocGFyZW50QS5yZXN0aXR1dGlvbiwgcGFyZW50Qi5yZXN0aXR1dGlvbik7XG4gICAgICAgIHBhaXIuc2xvcCA9IE1hdGgubWF4KHBhcmVudEEuc2xvcCwgcGFyZW50Qi5zbG9wKTtcbiAgICAgICAgYWN0aXZlQ29udGFjdHMubGVuZ3RoID0gMDtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb2xsaXNpb24uY29sbGlkZWQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3VwcG9ydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc3VwcG9ydCA9IHN1cHBvcnRzW2ldLFxuICAgICAgICAgICAgICAgICAgICBjb250YWN0SWQgPSBDb250YWN0LmlkKHN1cHBvcnQpLFxuICAgICAgICAgICAgICAgICAgICBjb250YWN0ID0gY29udGFjdHNbY29udGFjdElkXTtcblxuICAgICAgICAgICAgICAgIGlmIChjb250YWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZUNvbnRhY3RzLnB1c2goY29udGFjdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29udGFjdHMucHVzaChjb250YWN0c1tjb250YWN0SWRdID0gQ29udGFjdC5jcmVhdGUoc3VwcG9ydCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcGFpci5zZXBhcmF0aW9uID0gY29sbGlzaW9uLmRlcHRoO1xuICAgICAgICAgICAgUGFpci5zZXRBY3RpdmUocGFpciwgdHJ1ZSwgdGltZXN0YW1wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChwYWlyLmlzQWN0aXZlID09PSB0cnVlKVxuICAgICAgICAgICAgICAgIFBhaXIuc2V0QWN0aXZlKHBhaXIsIGZhbHNlLCB0aW1lc3RhbXApO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgYSBwYWlyIGFzIGFjdGl2ZSBvciBpbmFjdGl2ZS5cbiAgICAgKiBAbWV0aG9kIHNldEFjdGl2ZVxuICAgICAqIEBwYXJhbSB7cGFpcn0gcGFpclxuICAgICAqIEBwYXJhbSB7Ym9vbH0gaXNBY3RpdmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wXG4gICAgICovXG4gICAgUGFpci5zZXRBY3RpdmUgPSBmdW5jdGlvbihwYWlyLCBpc0FjdGl2ZSwgdGltZXN0YW1wKSB7XG4gICAgICAgIGlmIChpc0FjdGl2ZSkge1xuICAgICAgICAgICAgcGFpci5pc0FjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBwYWlyLnRpbWVVcGRhdGVkID0gdGltZXN0YW1wO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFpci5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgcGFpci5hY3RpdmVDb250YWN0cy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgaWQgZm9yIHRoZSBnaXZlbiBwYWlyLlxuICAgICAqIEBtZXRob2QgaWRcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlBXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5QlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVW5pcXVlIHBhaXJJZFxuICAgICAqL1xuICAgIFBhaXIuaWQgPSBmdW5jdGlvbihib2R5QSwgYm9keUIpIHtcbiAgICAgICAgaWYgKGJvZHlBLmlkIDwgYm9keUIuaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBib2R5QS5pZCArICdfJyArIGJvZHlCLmlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGJvZHlCLmlkICsgJ18nICsgYm9keUEuaWQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlBhaXJzYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBjb2xsaXNpb24gcGFpciBzZXRzLlxuKlxuKiBAY2xhc3MgUGFpcnNcbiovXG5cbnZhciBQYWlycyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhaXJzO1xuXG52YXIgUGFpciA9IHJlcXVpcmUoJy4vUGFpcicpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcbiAgICBcbiAgICB2YXIgX3BhaXJNYXhJZGxlTGlmZSA9IDEwMDA7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHBhaXJzIHN0cnVjdHVyZS5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7cGFpcnN9IEEgbmV3IHBhaXJzIHN0cnVjdHVyZVxuICAgICAqL1xuICAgIFBhaXJzLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIENvbW1vbi5leHRlbmQoeyBcbiAgICAgICAgICAgIHRhYmxlOiB7fSxcbiAgICAgICAgICAgIGxpc3Q6IFtdLFxuICAgICAgICAgICAgY29sbGlzaW9uU3RhcnQ6IFtdLFxuICAgICAgICAgICAgY29sbGlzaW9uQWN0aXZlOiBbXSxcbiAgICAgICAgICAgIGNvbGxpc2lvbkVuZDogW11cbiAgICAgICAgfSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgcGFpcnMgZ2l2ZW4gYSBsaXN0IG9mIGNvbGxpc2lvbnMuXG4gICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFpcnNcbiAgICAgKiBAcGFyYW0ge2NvbGxpc2lvbltdfSBjb2xsaXNpb25zXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcFxuICAgICAqL1xuICAgIFBhaXJzLnVwZGF0ZSA9IGZ1bmN0aW9uKHBhaXJzLCBjb2xsaXNpb25zLCB0aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIHBhaXJzTGlzdCA9IHBhaXJzLmxpc3QsXG4gICAgICAgICAgICBwYWlyc1RhYmxlID0gcGFpcnMudGFibGUsXG4gICAgICAgICAgICBjb2xsaXNpb25TdGFydCA9IHBhaXJzLmNvbGxpc2lvblN0YXJ0LFxuICAgICAgICAgICAgY29sbGlzaW9uRW5kID0gcGFpcnMuY29sbGlzaW9uRW5kLFxuICAgICAgICAgICAgY29sbGlzaW9uQWN0aXZlID0gcGFpcnMuY29sbGlzaW9uQWN0aXZlLFxuICAgICAgICAgICAgYWN0aXZlUGFpcklkcyA9IFtdLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgcGFpcklkLFxuICAgICAgICAgICAgcGFpcixcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgLy8gY2xlYXIgY29sbGlzaW9uIHN0YXRlIGFycmF5cywgYnV0IG1haW50YWluIG9sZCByZWZlcmVuY2VcbiAgICAgICAgY29sbGlzaW9uU3RhcnQubGVuZ3RoID0gMDtcbiAgICAgICAgY29sbGlzaW9uRW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIGNvbGxpc2lvbkFjdGl2ZS5sZW5ndGggPSAwO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb2xsaXNpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb2xsaXNpb24gPSBjb2xsaXNpb25zW2ldO1xuXG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uLmNvbGxpZGVkKSB7XG4gICAgICAgICAgICAgICAgcGFpcklkID0gUGFpci5pZChjb2xsaXNpb24uYm9keUEsIGNvbGxpc2lvbi5ib2R5Qik7XG4gICAgICAgICAgICAgICAgYWN0aXZlUGFpcklkcy5wdXNoKHBhaXJJZCk7XG5cbiAgICAgICAgICAgICAgICBwYWlyID0gcGFpcnNUYWJsZVtwYWlySWRdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwYWlyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBhaXIgYWxyZWFkeSBleGlzdHMgKGJ1dCBtYXkgb3IgbWF5IG5vdCBiZSBhY3RpdmUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYWlyLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBwYWlyIGV4aXN0cyBhbmQgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25BY3RpdmUucHVzaChwYWlyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhaXIgZXhpc3RzIGJ1dCB3YXMgaW5hY3RpdmUsIHNvIGEgY29sbGlzaW9uIGhhcyBqdXN0IHN0YXJ0ZWQgYWdhaW5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblN0YXJ0LnB1c2gocGFpcik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIHBhaXJcbiAgICAgICAgICAgICAgICAgICAgUGFpci51cGRhdGUocGFpciwgY29sbGlzaW9uLCB0aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBhaXIgZGlkIG5vdCBleGlzdCwgY3JlYXRlIGEgbmV3IHBhaXJcbiAgICAgICAgICAgICAgICAgICAgcGFpciA9IFBhaXIuY3JlYXRlKGNvbGxpc2lvbiwgdGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgcGFpcnNUYWJsZVtwYWlySWRdID0gcGFpcjtcblxuICAgICAgICAgICAgICAgICAgICAvLyBwdXNoIHRoZSBuZXcgcGFpclxuICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25TdGFydC5wdXNoKHBhaXIpO1xuICAgICAgICAgICAgICAgICAgICBwYWlyc0xpc3QucHVzaChwYWlyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkZWFjdGl2YXRlIHByZXZpb3VzbHkgYWN0aXZlIHBhaXJzIHRoYXQgYXJlIG5vdyBpbmFjdGl2ZVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNMaXN0W2ldO1xuICAgICAgICAgICAgaWYgKHBhaXIuaXNBY3RpdmUgJiYgQ29tbW9uLmluZGV4T2YoYWN0aXZlUGFpcklkcywgcGFpci5pZCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgUGFpci5zZXRBY3RpdmUocGFpciwgZmFsc2UsIHRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uRW5kLnB1c2gocGFpcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZpbmRzIGFuZCByZW1vdmVzIHBhaXJzIHRoYXQgaGF2ZSBiZWVuIGluYWN0aXZlIGZvciBhIHNldCBhbW91bnQgb2YgdGltZS5cbiAgICAgKiBAbWV0aG9kIHJlbW92ZU9sZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYWlyc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBQYWlycy5yZW1vdmVPbGQgPSBmdW5jdGlvbihwYWlycywgdGltZXN0YW1wKSB7XG4gICAgICAgIHZhciBwYWlyc0xpc3QgPSBwYWlycy5saXN0LFxuICAgICAgICAgICAgcGFpcnNUYWJsZSA9IHBhaXJzLnRhYmxlLFxuICAgICAgICAgICAgaW5kZXhlc1RvUmVtb3ZlID0gW10sXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgcGFpckluZGV4LFxuICAgICAgICAgICAgaTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNMaXN0W2ldO1xuICAgICAgICAgICAgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIG5ldmVyIHJlbW92ZSBzbGVlcGluZyBwYWlyc1xuICAgICAgICAgICAgaWYgKGNvbGxpc2lvbi5ib2R5QS5pc1NsZWVwaW5nIHx8IGNvbGxpc2lvbi5ib2R5Qi5pc1NsZWVwaW5nKSB7XG4gICAgICAgICAgICAgICAgcGFpci50aW1lVXBkYXRlZCA9IHRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgcGFpciBpcyBpbmFjdGl2ZSBmb3IgdG9vIGxvbmcsIG1hcmsgaXQgdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgaWYgKHRpbWVzdGFtcCAtIHBhaXIudGltZVVwZGF0ZWQgPiBfcGFpck1heElkbGVMaWZlKSB7XG4gICAgICAgICAgICAgICAgaW5kZXhlc1RvUmVtb3ZlLnB1c2goaSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZW1vdmUgbWFya2VkIHBhaXJzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBpbmRleGVzVG9SZW1vdmUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXJJbmRleCA9IGluZGV4ZXNUb1JlbW92ZVtpXSAtIGk7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNMaXN0W3BhaXJJbmRleF07XG4gICAgICAgICAgICBkZWxldGUgcGFpcnNUYWJsZVtwYWlyLmlkXTtcbiAgICAgICAgICAgIHBhaXJzTGlzdC5zcGxpY2UocGFpckluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGdpdmVuIHBhaXJzIHN0cnVjdHVyZS5cbiAgICAgKiBAbWV0aG9kIGNsZWFyXG4gICAgICogQHBhcmFtIHtwYWlyc30gcGFpcnNcbiAgICAgKiBAcmV0dXJuIHtwYWlyc30gcGFpcnNcbiAgICAgKi9cbiAgICBQYWlycy5jbGVhciA9IGZ1bmN0aW9uKHBhaXJzKSB7XG4gICAgICAgIHBhaXJzLnRhYmxlID0ge307XG4gICAgICAgIHBhaXJzLmxpc3QubGVuZ3RoID0gMDtcbiAgICAgICAgcGFpcnMuY29sbGlzaW9uU3RhcnQubGVuZ3RoID0gMDtcbiAgICAgICAgcGFpcnMuY29sbGlzaW9uQWN0aXZlLmxlbmd0aCA9IDA7XG4gICAgICAgIHBhaXJzLmNvbGxpc2lvbkVuZC5sZW5ndGggPSAwO1xuICAgICAgICByZXR1cm4gcGFpcnM7XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5RdWVyeWAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIHBlcmZvcm1pbmcgY29sbGlzaW9uIHF1ZXJpZXMuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBRdWVyeVxuKi9cblxudmFyIFF1ZXJ5ID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlcnk7XG5cbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbnZhciBTQVQgPSByZXF1aXJlKCcuL1NBVCcpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xudmFyIEJvZGllcyA9IHJlcXVpcmUoJy4uL2ZhY3RvcnkvQm9kaWVzJyk7XG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDYXN0cyBhIHJheSBzZWdtZW50IGFnYWluc3QgYSBzZXQgb2YgYm9kaWVzIGFuZCByZXR1cm5zIGFsbCBjb2xsaXNpb25zLCByYXkgd2lkdGggaXMgb3B0aW9uYWwuIEludGVyc2VjdGlvbiBwb2ludHMgYXJlIG5vdCBwcm92aWRlZC5cbiAgICAgKiBAbWV0aG9kIHJheVxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gc3RhcnRQb2ludFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBlbmRQb2ludFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcmF5V2lkdGhdXG4gICAgICogQHJldHVybiB7b2JqZWN0W119IENvbGxpc2lvbnNcbiAgICAgKi9cbiAgICBRdWVyeS5yYXkgPSBmdW5jdGlvbihib2RpZXMsIHN0YXJ0UG9pbnQsIGVuZFBvaW50LCByYXlXaWR0aCkge1xuICAgICAgICByYXlXaWR0aCA9IHJheVdpZHRoIHx8IDFlLTEwMDtcblxuICAgICAgICB2YXIgcmF5QW5nbGUgPSBWZWN0b3IuYW5nbGUoc3RhcnRQb2ludCwgZW5kUG9pbnQpLFxuICAgICAgICAgICAgcmF5TGVuZ3RoID0gVmVjdG9yLm1hZ25pdHVkZShWZWN0b3Iuc3ViKHN0YXJ0UG9pbnQsIGVuZFBvaW50KSksXG4gICAgICAgICAgICByYXlYID0gKGVuZFBvaW50LnggKyBzdGFydFBvaW50LngpICogMC41LFxuICAgICAgICAgICAgcmF5WSA9IChlbmRQb2ludC55ICsgc3RhcnRQb2ludC55KSAqIDAuNSxcbiAgICAgICAgICAgIHJheSA9IEJvZGllcy5yZWN0YW5nbGUocmF5WCwgcmF5WSwgcmF5TGVuZ3RoLCByYXlXaWR0aCwgeyBhbmdsZTogcmF5QW5nbGUgfSksXG4gICAgICAgICAgICBjb2xsaXNpb25zID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5QSA9IGJvZGllc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKEJvdW5kcy5vdmVybGFwcyhib2R5QS5ib3VuZHMsIHJheS5ib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGJvZHlBLnBhcnRzLmxlbmd0aCA9PT0gMSA/IDAgOiAxOyBqIDwgYm9keUEucGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5QS5wYXJ0c1tqXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoQm91bmRzLm92ZXJsYXBzKHBhcnQuYm91bmRzLCByYXkuYm91bmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbGxpc2lvbiA9IFNBVC5jb2xsaWRlcyhwYXJ0LCByYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbGxpc2lvbi5jb2xsaWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbi5ib2R5ID0gY29sbGlzaW9uLmJvZHlBID0gY29sbGlzaW9uLmJvZHlCID0gYm9keUE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9ucy5wdXNoKGNvbGxpc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29sbGlzaW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgYm9kaWVzIHdob3NlIGJvdW5kcyBhcmUgaW5zaWRlIChvciBvdXRzaWRlIGlmIHNldCkgdGhlIGdpdmVuIHNldCBvZiBib3VuZHMsIGZyb20gdGhlIGdpdmVuIHNldCBvZiBib2RpZXMuXG4gICAgICogQG1ldGhvZCByZWdpb25cbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc1xuICAgICAqIEBwYXJhbSB7Ym9vbH0gW291dHNpZGU9ZmFsc2VdXG4gICAgICogQHJldHVybiB7Ym9keVtdfSBUaGUgYm9kaWVzIG1hdGNoaW5nIHRoZSBxdWVyeVxuICAgICAqL1xuICAgIFF1ZXJ5LnJlZ2lvbiA9IGZ1bmN0aW9uKGJvZGllcywgYm91bmRzLCBvdXRzaWRlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgb3ZlcmxhcHMgPSBCb3VuZHMub3ZlcmxhcHMoYm9keS5ib3VuZHMsIGJvdW5kcyk7XG4gICAgICAgICAgICBpZiAoKG92ZXJsYXBzICYmICFvdXRzaWRlKSB8fCAoIW92ZXJsYXBzICYmIG91dHNpZGUpKVxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGJvZHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgYm9kaWVzIHdob3NlIHZlcnRpY2VzIGNvbnRhaW4gdGhlIGdpdmVuIHBvaW50LCBmcm9tIHRoZSBnaXZlbiBzZXQgb2YgYm9kaWVzLlxuICAgICAqIEBtZXRob2QgcG9pbnRcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICogQHJldHVybiB7Ym9keVtdfSBUaGUgYm9kaWVzIG1hdGNoaW5nIHRoZSBxdWVyeVxuICAgICAqL1xuICAgIFF1ZXJ5LnBvaW50ID0gZnVuY3Rpb24oYm9kaWVzLCBwb2ludCkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoQm91bmRzLmNvbnRhaW5zKGJvZHkuYm91bmRzLCBwb2ludCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gYm9keS5wYXJ0cy5sZW5ndGggPT09IDEgPyAwIDogMTsgaiA8IGJvZHkucGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChCb3VuZHMuY29udGFpbnMocGFydC5ib3VuZHMsIHBvaW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgVmVydGljZXMuY29udGFpbnMocGFydC52ZXJ0aWNlcywgcG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlJlc29sdmVyYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgcmVzb2x2aW5nIGNvbGxpc2lvbiBwYWlycy5cbipcbiogQGNsYXNzIFJlc29sdmVyXG4qL1xuXG52YXIgUmVzb2x2ZXIgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXNvbHZlcjtcblxudmFyIFZlcnRpY2VzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVydGljZXMnKTtcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICBSZXNvbHZlci5fcmVzdGluZ1RocmVzaCA9IDQ7XG4gICAgUmVzb2x2ZXIuX3Jlc3RpbmdUaHJlc2hUYW5nZW50ID0gNjtcbiAgICBSZXNvbHZlci5fcG9zaXRpb25EYW1wZW4gPSAwLjk7XG4gICAgUmVzb2x2ZXIuX3Bvc2l0aW9uV2FybWluZyA9IDAuODtcbiAgICBSZXNvbHZlci5fZnJpY3Rpb25Ob3JtYWxNdWx0aXBsaWVyID0gNTtcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgcGFpcnMgZm9yIHBvc2l0aW9uIHNvbHZpbmcuXG4gICAgICogQG1ldGhvZCBwcmVTb2x2ZVBvc2l0aW9uXG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICovXG4gICAgUmVzb2x2ZXIucHJlU29sdmVQb3NpdGlvbiA9IGZ1bmN0aW9uKHBhaXJzKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgcGFpcixcbiAgICAgICAgICAgIGFjdGl2ZUNvdW50O1xuXG4gICAgICAgIC8vIGZpbmQgdG90YWwgY29udGFjdHMgb24gZWFjaCBib2R5XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXBhaXIuaXNBY3RpdmUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFjdGl2ZUNvdW50ID0gcGFpci5hY3RpdmVDb250YWN0cy5sZW5ndGg7XG4gICAgICAgICAgICBwYWlyLmNvbGxpc2lvbi5wYXJlbnRBLnRvdGFsQ29udGFjdHMgKz0gYWN0aXZlQ291bnQ7XG4gICAgICAgICAgICBwYWlyLmNvbGxpc2lvbi5wYXJlbnRCLnRvdGFsQ29udGFjdHMgKz0gYWN0aXZlQ291bnQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmluZCBhIHNvbHV0aW9uIGZvciBwYWlyIHBvc2l0aW9ucy5cbiAgICAgKiBAbWV0aG9kIHNvbHZlUG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge3BhaXJbXX0gcGFpcnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZVNjYWxlXG4gICAgICovXG4gICAgUmVzb2x2ZXIuc29sdmVQb3NpdGlvbiA9IGZ1bmN0aW9uKHBhaXJzLCB0aW1lU2NhbGUpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgYm9keUEsXG4gICAgICAgICAgICBib2R5QixcbiAgICAgICAgICAgIG5vcm1hbCxcbiAgICAgICAgICAgIGJvZHlCdG9BLFxuICAgICAgICAgICAgY29udGFjdFNoYXJlLFxuICAgICAgICAgICAgcG9zaXRpb25JbXB1bHNlLFxuICAgICAgICAgICAgY29udGFjdENvdW50ID0ge30sXG4gICAgICAgICAgICB0ZW1wQSA9IFZlY3Rvci5fdGVtcFswXSxcbiAgICAgICAgICAgIHRlbXBCID0gVmVjdG9yLl90ZW1wWzFdLFxuICAgICAgICAgICAgdGVtcEMgPSBWZWN0b3IuX3RlbXBbMl0sXG4gICAgICAgICAgICB0ZW1wRCA9IFZlY3Rvci5fdGVtcFszXTtcblxuICAgICAgICAvLyBmaW5kIGltcHVsc2VzIHJlcXVpcmVkIHRvIHJlc29sdmUgcGVuZXRyYXRpb25cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSB8fCBwYWlyLmlzU2Vuc29yKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcbiAgICAgICAgICAgIGJvZHlBID0gY29sbGlzaW9uLnBhcmVudEE7XG4gICAgICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5wYXJlbnRCO1xuICAgICAgICAgICAgbm9ybWFsID0gY29sbGlzaW9uLm5vcm1hbDtcblxuICAgICAgICAgICAgLy8gZ2V0IGN1cnJlbnQgc2VwYXJhdGlvbiBiZXR3ZWVuIGJvZHkgZWRnZXMgaW52b2x2ZWQgaW4gY29sbGlzaW9uXG4gICAgICAgICAgICBib2R5QnRvQSA9IFZlY3Rvci5zdWIoVmVjdG9yLmFkZChib2R5Qi5wb3NpdGlvbkltcHVsc2UsIGJvZHlCLnBvc2l0aW9uLCB0ZW1wQSksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVmVjdG9yLmFkZChib2R5QS5wb3NpdGlvbkltcHVsc2UsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlY3Rvci5zdWIoYm9keUIucG9zaXRpb24sIGNvbGxpc2lvbi5wZW5ldHJhdGlvbiwgdGVtcEIpLCB0ZW1wQyksIHRlbXBEKTtcblxuICAgICAgICAgICAgcGFpci5zZXBhcmF0aW9uID0gVmVjdG9yLmRvdChub3JtYWwsIGJvZHlCdG9BKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG5cbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSB8fCBwYWlyLmlzU2Vuc29yIHx8IHBhaXIuc2VwYXJhdGlvbiA8IDApXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uO1xuICAgICAgICAgICAgYm9keUEgPSBjb2xsaXNpb24ucGFyZW50QTtcbiAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLnBhcmVudEI7XG4gICAgICAgICAgICBub3JtYWwgPSBjb2xsaXNpb24ubm9ybWFsO1xuICAgICAgICAgICAgcG9zaXRpb25JbXB1bHNlID0gKHBhaXIuc2VwYXJhdGlvbiAtIHBhaXIuc2xvcCkgKiB0aW1lU2NhbGU7XG5cbiAgICAgICAgICAgIGlmIChib2R5QS5pc1N0YXRpYyB8fCBib2R5Qi5pc1N0YXRpYylcbiAgICAgICAgICAgICAgICBwb3NpdGlvbkltcHVsc2UgKj0gMjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCEoYm9keUEuaXNTdGF0aWMgfHwgYm9keUEuaXNTbGVlcGluZykpIHtcbiAgICAgICAgICAgICAgICBjb250YWN0U2hhcmUgPSBSZXNvbHZlci5fcG9zaXRpb25EYW1wZW4gLyBib2R5QS50b3RhbENvbnRhY3RzO1xuICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uSW1wdWxzZS54ICs9IG5vcm1hbC54ICogcG9zaXRpb25JbXB1bHNlICogY29udGFjdFNoYXJlO1xuICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uSW1wdWxzZS55ICs9IG5vcm1hbC55ICogcG9zaXRpb25JbXB1bHNlICogY29udGFjdFNoYXJlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIShib2R5Qi5pc1N0YXRpYyB8fCBib2R5Qi5pc1NsZWVwaW5nKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhY3RTaGFyZSA9IFJlc29sdmVyLl9wb3NpdGlvbkRhbXBlbiAvIGJvZHlCLnRvdGFsQ29udGFjdHM7XG4gICAgICAgICAgICAgICAgYm9keUIucG9zaXRpb25JbXB1bHNlLnggLT0gbm9ybWFsLnggKiBwb3NpdGlvbkltcHVsc2UgKiBjb250YWN0U2hhcmU7XG4gICAgICAgICAgICAgICAgYm9keUIucG9zaXRpb25JbXB1bHNlLnkgLT0gbm9ybWFsLnkgKiBwb3NpdGlvbkltcHVsc2UgKiBjb250YWN0U2hhcmU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcG9zaXRpb24gcmVzb2x1dGlvbi5cbiAgICAgKiBAbWV0aG9kIHBvc3RTb2x2ZVBvc2l0aW9uXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqL1xuICAgIFJlc29sdmVyLnBvc3RTb2x2ZVBvc2l0aW9uID0gZnVuY3Rpb24oYm9kaWVzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgLy8gcmVzZXQgY29udGFjdCBjb3VudFxuICAgICAgICAgICAgYm9keS50b3RhbENvbnRhY3RzID0gMDtcblxuICAgICAgICAgICAgaWYgKGJvZHkucG9zaXRpb25JbXB1bHNlLnggIT09IDAgfHwgYm9keS5wb3NpdGlvbkltcHVsc2UueSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBib2R5IGdlb21ldHJ5XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBib2R5LnBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgVmVydGljZXMudHJhbnNsYXRlKHBhcnQudmVydGljZXMsIGJvZHkucG9zaXRpb25JbXB1bHNlKTtcbiAgICAgICAgICAgICAgICAgICAgQm91bmRzLnVwZGF0ZShwYXJ0LmJvdW5kcywgcGFydC52ZXJ0aWNlcywgYm9keS52ZWxvY2l0eSk7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQucG9zaXRpb24ueCArPSBib2R5LnBvc2l0aW9uSW1wdWxzZS54O1xuICAgICAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnkgKz0gYm9keS5wb3NpdGlvbkltcHVsc2UueTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBtb3ZlIHRoZSBib2R5IHdpdGhvdXQgY2hhbmdpbmcgdmVsb2NpdHlcbiAgICAgICAgICAgICAgICBib2R5LnBvc2l0aW9uUHJldi54ICs9IGJvZHkucG9zaXRpb25JbXB1bHNlLng7XG4gICAgICAgICAgICAgICAgYm9keS5wb3NpdGlvblByZXYueSArPSBib2R5LnBvc2l0aW9uSW1wdWxzZS55O1xuXG4gICAgICAgICAgICAgICAgaWYgKFZlY3Rvci5kb3QoYm9keS5wb3NpdGlvbkltcHVsc2UsIGJvZHkudmVsb2NpdHkpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyByZXNldCBjYWNoZWQgaW1wdWxzZSBpZiB0aGUgYm9keSBoYXMgdmVsb2NpdHkgYWxvbmcgaXRcbiAgICAgICAgICAgICAgICAgICAgYm9keS5wb3NpdGlvbkltcHVsc2UueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkucG9zaXRpb25JbXB1bHNlLnkgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdhcm0gdGhlIG5leHQgaXRlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGJvZHkucG9zaXRpb25JbXB1bHNlLnggKj0gUmVzb2x2ZXIuX3Bvc2l0aW9uV2FybWluZztcbiAgICAgICAgICAgICAgICAgICAgYm9keS5wb3NpdGlvbkltcHVsc2UueSAqPSBSZXNvbHZlci5fcG9zaXRpb25XYXJtaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIHBhaXJzIGZvciB2ZWxvY2l0eSBzb2x2aW5nLlxuICAgICAqIEBtZXRob2QgcHJlU29sdmVWZWxvY2l0eVxuICAgICAqIEBwYXJhbSB7cGFpcltdfSBwYWlyc1xuICAgICAqL1xuICAgIFJlc29sdmVyLnByZVNvbHZlVmVsb2NpdHkgPSBmdW5jdGlvbihwYWlycykge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIGosXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgY29udGFjdHMsXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBib2R5QSxcbiAgICAgICAgICAgIGJvZHlCLFxuICAgICAgICAgICAgbm9ybWFsLFxuICAgICAgICAgICAgdGFuZ2VudCxcbiAgICAgICAgICAgIGNvbnRhY3QsXG4gICAgICAgICAgICBjb250YWN0VmVydGV4LFxuICAgICAgICAgICAgbm9ybWFsSW1wdWxzZSxcbiAgICAgICAgICAgIHRhbmdlbnRJbXB1bHNlLFxuICAgICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgICAgaW1wdWxzZSA9IFZlY3Rvci5fdGVtcFswXSxcbiAgICAgICAgICAgIHRlbXBBID0gVmVjdG9yLl90ZW1wWzFdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSB8fCBwYWlyLmlzU2Vuc29yKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250YWN0cyA9IHBhaXIuYWN0aXZlQ29udGFjdHM7XG4gICAgICAgICAgICBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcbiAgICAgICAgICAgIGJvZHlBID0gY29sbGlzaW9uLnBhcmVudEE7XG4gICAgICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5wYXJlbnRCO1xuICAgICAgICAgICAgbm9ybWFsID0gY29sbGlzaW9uLm5vcm1hbDtcbiAgICAgICAgICAgIHRhbmdlbnQgPSBjb2xsaXNpb24udGFuZ2VudDtcblxuICAgICAgICAgICAgLy8gcmVzb2x2ZSBlYWNoIGNvbnRhY3RcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjb250YWN0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGNvbnRhY3QgPSBjb250YWN0c1tqXTtcbiAgICAgICAgICAgICAgICBjb250YWN0VmVydGV4ID0gY29udGFjdC52ZXJ0ZXg7XG4gICAgICAgICAgICAgICAgbm9ybWFsSW1wdWxzZSA9IGNvbnRhY3Qubm9ybWFsSW1wdWxzZTtcbiAgICAgICAgICAgICAgICB0YW5nZW50SW1wdWxzZSA9IGNvbnRhY3QudGFuZ2VudEltcHVsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAobm9ybWFsSW1wdWxzZSAhPT0gMCB8fCB0YW5nZW50SW1wdWxzZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyB0b3RhbCBpbXB1bHNlIGZyb20gY29udGFjdFxuICAgICAgICAgICAgICAgICAgICBpbXB1bHNlLnggPSAobm9ybWFsLnggKiBub3JtYWxJbXB1bHNlKSArICh0YW5nZW50LnggKiB0YW5nZW50SW1wdWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGltcHVsc2UueSA9IChub3JtYWwueSAqIG5vcm1hbEltcHVsc2UpICsgKHRhbmdlbnQueSAqIHRhbmdlbnRJbXB1bHNlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIGFwcGx5IGltcHVsc2UgZnJvbSBjb250YWN0XG4gICAgICAgICAgICAgICAgICAgIGlmICghKGJvZHlBLmlzU3RhdGljIHx8IGJvZHlBLmlzU2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBWZWN0b3Iuc3ViKGNvbnRhY3RWZXJ0ZXgsIGJvZHlBLnBvc2l0aW9uLCB0ZW1wQSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5QS5wb3NpdGlvblByZXYueCArPSBpbXB1bHNlLnggKiBib2R5QS5pbnZlcnNlTWFzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uUHJldi55ICs9IGltcHVsc2UueSAqIGJvZHlBLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUEuYW5nbGVQcmV2ICs9IFZlY3Rvci5jcm9zcyhvZmZzZXQsIGltcHVsc2UpICogYm9keUEuaW52ZXJzZUluZXJ0aWE7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIShib2R5Qi5pc1N0YXRpYyB8fCBib2R5Qi5pc1NsZWVwaW5nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gVmVjdG9yLnN1Yihjb250YWN0VmVydGV4LCBib2R5Qi5wb3NpdGlvbiwgdGVtcEEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUIucG9zaXRpb25QcmV2LnggLT0gaW1wdWxzZS54ICogYm9keUIuaW52ZXJzZU1hc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5Qi5wb3NpdGlvblByZXYueSAtPSBpbXB1bHNlLnkgKiBib2R5Qi5pbnZlcnNlTWFzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHlCLmFuZ2xlUHJldiAtPSBWZWN0b3IuY3Jvc3Mob2Zmc2V0LCBpbXB1bHNlKSAqIGJvZHlCLmludmVyc2VJbmVydGlhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYSBzb2x1dGlvbiBmb3IgcGFpciB2ZWxvY2l0aWVzLlxuICAgICAqIEBtZXRob2Qgc29sdmVWZWxvY2l0eVxuICAgICAqIEBwYXJhbSB7cGFpcltdfSBwYWlyc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBSZXNvbHZlci5zb2x2ZVZlbG9jaXR5ID0gZnVuY3Rpb24ocGFpcnMsIHRpbWVTY2FsZSkge1xuICAgICAgICB2YXIgdGltZVNjYWxlU3F1YXJlZCA9IHRpbWVTY2FsZSAqIHRpbWVTY2FsZSxcbiAgICAgICAgICAgIGltcHVsc2UgPSBWZWN0b3IuX3RlbXBbMF0sXG4gICAgICAgICAgICB0ZW1wQSA9IFZlY3Rvci5fdGVtcFsxXSxcbiAgICAgICAgICAgIHRlbXBCID0gVmVjdG9yLl90ZW1wWzJdLFxuICAgICAgICAgICAgdGVtcEMgPSBWZWN0b3IuX3RlbXBbM10sXG4gICAgICAgICAgICB0ZW1wRCA9IFZlY3Rvci5fdGVtcFs0XSxcbiAgICAgICAgICAgIHRlbXBFID0gVmVjdG9yLl90ZW1wWzVdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlIHx8IHBhaXIuaXNTZW5zb3IpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbixcbiAgICAgICAgICAgICAgICBib2R5QSA9IGNvbGxpc2lvbi5wYXJlbnRBLFxuICAgICAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLnBhcmVudEIsXG4gICAgICAgICAgICAgICAgbm9ybWFsID0gY29sbGlzaW9uLm5vcm1hbCxcbiAgICAgICAgICAgICAgICB0YW5nZW50ID0gY29sbGlzaW9uLnRhbmdlbnQsXG4gICAgICAgICAgICAgICAgY29udGFjdHMgPSBwYWlyLmFjdGl2ZUNvbnRhY3RzLFxuICAgICAgICAgICAgICAgIGNvbnRhY3RTaGFyZSA9IDEgLyBjb250YWN0cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBib2R5IHZlbG9jaXRpZXNcbiAgICAgICAgICAgIGJvZHlBLnZlbG9jaXR5LnggPSBib2R5QS5wb3NpdGlvbi54IC0gYm9keUEucG9zaXRpb25QcmV2Lng7XG4gICAgICAgICAgICBib2R5QS52ZWxvY2l0eS55ID0gYm9keUEucG9zaXRpb24ueSAtIGJvZHlBLnBvc2l0aW9uUHJldi55O1xuICAgICAgICAgICAgYm9keUIudmVsb2NpdHkueCA9IGJvZHlCLnBvc2l0aW9uLnggLSBib2R5Qi5wb3NpdGlvblByZXYueDtcbiAgICAgICAgICAgIGJvZHlCLnZlbG9jaXR5LnkgPSBib2R5Qi5wb3NpdGlvbi55IC0gYm9keUIucG9zaXRpb25QcmV2Lnk7XG4gICAgICAgICAgICBib2R5QS5hbmd1bGFyVmVsb2NpdHkgPSBib2R5QS5hbmdsZSAtIGJvZHlBLmFuZ2xlUHJldjtcbiAgICAgICAgICAgIGJvZHlCLmFuZ3VsYXJWZWxvY2l0eSA9IGJvZHlCLmFuZ2xlIC0gYm9keUIuYW5nbGVQcmV2O1xuXG4gICAgICAgICAgICAvLyByZXNvbHZlIGVhY2ggY29udGFjdFxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjb250YWN0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBjb250YWN0ID0gY29udGFjdHNbal0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhY3RWZXJ0ZXggPSBjb250YWN0LnZlcnRleCxcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0QSA9IFZlY3Rvci5zdWIoY29udGFjdFZlcnRleCwgYm9keUEucG9zaXRpb24sIHRlbXBBKSxcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0QiA9IFZlY3Rvci5zdWIoY29udGFjdFZlcnRleCwgYm9keUIucG9zaXRpb24sIHRlbXBCKSxcbiAgICAgICAgICAgICAgICAgICAgdmVsb2NpdHlQb2ludEEgPSBWZWN0b3IuYWRkKGJvZHlBLnZlbG9jaXR5LCBWZWN0b3IubXVsdChWZWN0b3IucGVycChvZmZzZXRBKSwgYm9keUEuYW5ndWxhclZlbG9jaXR5KSwgdGVtcEMpLFxuICAgICAgICAgICAgICAgICAgICB2ZWxvY2l0eVBvaW50QiA9IFZlY3Rvci5hZGQoYm9keUIudmVsb2NpdHksIFZlY3Rvci5tdWx0KFZlY3Rvci5wZXJwKG9mZnNldEIpLCBib2R5Qi5hbmd1bGFyVmVsb2NpdHkpLCB0ZW1wRCksIFxuICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZVZlbG9jaXR5ID0gVmVjdG9yLnN1Yih2ZWxvY2l0eVBvaW50QSwgdmVsb2NpdHlQb2ludEIsIHRlbXBFKSxcbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsVmVsb2NpdHkgPSBWZWN0b3IuZG90KG5vcm1hbCwgcmVsYXRpdmVWZWxvY2l0eSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdGFuZ2VudFZlbG9jaXR5ID0gVmVjdG9yLmRvdCh0YW5nZW50LCByZWxhdGl2ZVZlbG9jaXR5KSxcbiAgICAgICAgICAgICAgICAgICAgdGFuZ2VudFNwZWVkID0gTWF0aC5hYnModGFuZ2VudFZlbG9jaXR5KSxcbiAgICAgICAgICAgICAgICAgICAgdGFuZ2VudFZlbG9jaXR5RGlyZWN0aW9uID0gQ29tbW9uLnNpZ24odGFuZ2VudFZlbG9jaXR5KTtcblxuICAgICAgICAgICAgICAgIC8vIHJhdyBpbXB1bHNlc1xuICAgICAgICAgICAgICAgIHZhciBub3JtYWxJbXB1bHNlID0gKDEgKyBwYWlyLnJlc3RpdHV0aW9uKSAqIG5vcm1hbFZlbG9jaXR5LFxuICAgICAgICAgICAgICAgICAgICBub3JtYWxGb3JjZSA9IENvbW1vbi5jbGFtcChwYWlyLnNlcGFyYXRpb24gKyBub3JtYWxWZWxvY2l0eSwgMCwgMSkgKiBSZXNvbHZlci5fZnJpY3Rpb25Ob3JtYWxNdWx0aXBsaWVyO1xuXG4gICAgICAgICAgICAgICAgLy8gY291bG9tYiBmcmljdGlvblxuICAgICAgICAgICAgICAgIHZhciB0YW5nZW50SW1wdWxzZSA9IHRhbmdlbnRWZWxvY2l0eSxcbiAgICAgICAgICAgICAgICAgICAgbWF4RnJpY3Rpb24gPSBJbmZpbml0eTtcblxuICAgICAgICAgICAgICAgIGlmICh0YW5nZW50U3BlZWQgPiBwYWlyLmZyaWN0aW9uICogcGFpci5mcmljdGlvblN0YXRpYyAqIG5vcm1hbEZvcmNlICogdGltZVNjYWxlU3F1YXJlZCkge1xuICAgICAgICAgICAgICAgICAgICBtYXhGcmljdGlvbiA9IHRhbmdlbnRTcGVlZDtcbiAgICAgICAgICAgICAgICAgICAgdGFuZ2VudEltcHVsc2UgPSBDb21tb24uY2xhbXAoXG4gICAgICAgICAgICAgICAgICAgICAgICBwYWlyLmZyaWN0aW9uICogdGFuZ2VudFZlbG9jaXR5RGlyZWN0aW9uICogdGltZVNjYWxlU3F1YXJlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIC1tYXhGcmljdGlvbiwgbWF4RnJpY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBtb2RpZnkgaW1wdWxzZXMgYWNjb3VudGluZyBmb3IgbWFzcywgaW5lcnRpYSBhbmQgb2Zmc2V0XG4gICAgICAgICAgICAgICAgdmFyIG9BY04gPSBWZWN0b3IuY3Jvc3Mob2Zmc2V0QSwgbm9ybWFsKSxcbiAgICAgICAgICAgICAgICAgICAgb0JjTiA9IFZlY3Rvci5jcm9zcyhvZmZzZXRCLCBub3JtYWwpLFxuICAgICAgICAgICAgICAgICAgICBzaGFyZSA9IGNvbnRhY3RTaGFyZSAvIChib2R5QS5pbnZlcnNlTWFzcyArIGJvZHlCLmludmVyc2VNYXNzICsgYm9keUEuaW52ZXJzZUluZXJ0aWEgKiBvQWNOICogb0FjTiAgKyBib2R5Qi5pbnZlcnNlSW5lcnRpYSAqIG9CY04gKiBvQmNOKTtcblxuICAgICAgICAgICAgICAgIG5vcm1hbEltcHVsc2UgKj0gc2hhcmU7XG4gICAgICAgICAgICAgICAgdGFuZ2VudEltcHVsc2UgKj0gc2hhcmU7XG5cbiAgICAgICAgICAgICAgICAvLyBoYW5kbGUgaGlnaCB2ZWxvY2l0eSBhbmQgcmVzdGluZyBjb2xsaXNpb25zIHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICBpZiAobm9ybWFsVmVsb2NpdHkgPCAwICYmIG5vcm1hbFZlbG9jaXR5ICogbm9ybWFsVmVsb2NpdHkgPiBSZXNvbHZlci5fcmVzdGluZ1RocmVzaCAqIHRpbWVTY2FsZVNxdWFyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaGlnaCBub3JtYWwgdmVsb2NpdHkgc28gY2xlYXIgY2FjaGVkIGNvbnRhY3Qgbm9ybWFsIGltcHVsc2VcbiAgICAgICAgICAgICAgICAgICAgY29udGFjdC5ub3JtYWxJbXB1bHNlID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzb2x2ZSByZXN0aW5nIGNvbGxpc2lvbiBjb25zdHJhaW50cyB1c2luZyBFcmluIENhdHRvJ3MgbWV0aG9kIChHREMwOClcbiAgICAgICAgICAgICAgICAgICAgLy8gaW1wdWxzZSBjb25zdHJhaW50IHRlbmRzIHRvIDBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRhY3ROb3JtYWxJbXB1bHNlID0gY29udGFjdC5ub3JtYWxJbXB1bHNlO1xuICAgICAgICAgICAgICAgICAgICBjb250YWN0Lm5vcm1hbEltcHVsc2UgPSBNYXRoLm1pbihjb250YWN0Lm5vcm1hbEltcHVsc2UgKyBub3JtYWxJbXB1bHNlLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsSW1wdWxzZSA9IGNvbnRhY3Qubm9ybWFsSW1wdWxzZSAtIGNvbnRhY3ROb3JtYWxJbXB1bHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBoaWdoIHZlbG9jaXR5IGFuZCByZXN0aW5nIGNvbGxpc2lvbnMgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgIGlmICh0YW5nZW50VmVsb2NpdHkgKiB0YW5nZW50VmVsb2NpdHkgPiBSZXNvbHZlci5fcmVzdGluZ1RocmVzaFRhbmdlbnQgKiB0aW1lU2NhbGVTcXVhcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGhpZ2ggdGFuZ2VudCB2ZWxvY2l0eSBzbyBjbGVhciBjYWNoZWQgY29udGFjdCB0YW5nZW50IGltcHVsc2VcbiAgICAgICAgICAgICAgICAgICAgY29udGFjdC50YW5nZW50SW1wdWxzZSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc29sdmUgcmVzdGluZyBjb2xsaXNpb24gY29uc3RyYWludHMgdXNpbmcgRXJpbiBDYXR0bydzIG1ldGhvZCAoR0RDMDgpXG4gICAgICAgICAgICAgICAgICAgIC8vIHRhbmdlbnQgaW1wdWxzZSB0ZW5kcyB0byAtdGFuZ2VudFNwZWVkIG9yICt0YW5nZW50U3BlZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRhY3RUYW5nZW50SW1wdWxzZSA9IGNvbnRhY3QudGFuZ2VudEltcHVsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhY3QudGFuZ2VudEltcHVsc2UgPSBDb21tb24uY2xhbXAoY29udGFjdC50YW5nZW50SW1wdWxzZSArIHRhbmdlbnRJbXB1bHNlLCAtbWF4RnJpY3Rpb24sIG1heEZyaWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGFuZ2VudEltcHVsc2UgPSBjb250YWN0LnRhbmdlbnRJbXB1bHNlIC0gY29udGFjdFRhbmdlbnRJbXB1bHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHRvdGFsIGltcHVsc2UgZnJvbSBjb250YWN0XG4gICAgICAgICAgICAgICAgaW1wdWxzZS54ID0gKG5vcm1hbC54ICogbm9ybWFsSW1wdWxzZSkgKyAodGFuZ2VudC54ICogdGFuZ2VudEltcHVsc2UpO1xuICAgICAgICAgICAgICAgIGltcHVsc2UueSA9IChub3JtYWwueSAqIG5vcm1hbEltcHVsc2UpICsgKHRhbmdlbnQueSAqIHRhbmdlbnRJbXB1bHNlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBhcHBseSBpbXB1bHNlIGZyb20gY29udGFjdFxuICAgICAgICAgICAgICAgIGlmICghKGJvZHlBLmlzU3RhdGljIHx8IGJvZHlBLmlzU2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uUHJldi54ICs9IGltcHVsc2UueCAqIGJvZHlBLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICBib2R5QS5wb3NpdGlvblByZXYueSArPSBpbXB1bHNlLnkgKiBib2R5QS5pbnZlcnNlTWFzcztcbiAgICAgICAgICAgICAgICAgICAgYm9keUEuYW5nbGVQcmV2ICs9IFZlY3Rvci5jcm9zcyhvZmZzZXRBLCBpbXB1bHNlKSAqIGJvZHlBLmludmVyc2VJbmVydGlhO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKGJvZHlCLmlzU3RhdGljIHx8IGJvZHlCLmlzU2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHlCLnBvc2l0aW9uUHJldi54IC09IGltcHVsc2UueCAqIGJvZHlCLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICBib2R5Qi5wb3NpdGlvblByZXYueSAtPSBpbXB1bHNlLnkgKiBib2R5Qi5pbnZlcnNlTWFzcztcbiAgICAgICAgICAgICAgICAgICAgYm9keUIuYW5nbGVQcmV2IC09IFZlY3Rvci5jcm9zcyhvZmZzZXRCLCBpbXB1bHNlKSAqIGJvZHlCLmludmVyc2VJbmVydGlhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuU0FUYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgZGV0ZWN0aW5nIGNvbGxpc2lvbnMgdXNpbmcgdGhlIFNlcGFyYXRpbmcgQXhpcyBUaGVvcmVtLlxuKlxuKiBAY2xhc3MgU0FUXG4qL1xuXG4vLyBUT0RPOiB0cnVlIGNpcmNsZXMgYW5kIGN1cnZlc1xuXG52YXIgU0FUID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gU0FUO1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgY29sbGlzaW9uIGJldHdlZW4gdHdvIGJvZGllcyB1c2luZyB0aGUgU2VwYXJhdGluZyBBeGlzIFRoZW9yZW0uXG4gICAgICogQG1ldGhvZCBjb2xsaWRlc1xuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keUFcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlCXG4gICAgICogQHBhcmFtIHtjb2xsaXNpb259IHByZXZpb3VzQ29sbGlzaW9uXG4gICAgICogQHJldHVybiB7Y29sbGlzaW9ufSBjb2xsaXNpb25cbiAgICAgKi9cbiAgICBTQVQuY29sbGlkZXMgPSBmdW5jdGlvbihib2R5QSwgYm9keUIsIHByZXZpb3VzQ29sbGlzaW9uKSB7XG4gICAgICAgIHZhciBvdmVybGFwQUIsXG4gICAgICAgICAgICBvdmVybGFwQkEsIFxuICAgICAgICAgICAgbWluT3ZlcmxhcCxcbiAgICAgICAgICAgIGNvbGxpc2lvbixcbiAgICAgICAgICAgIHByZXZDb2wgPSBwcmV2aW91c0NvbGxpc2lvbixcbiAgICAgICAgICAgIGNhblJldXNlUHJldkNvbCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChwcmV2Q29sKSB7XG4gICAgICAgICAgICAvLyBlc3RpbWF0ZSB0b3RhbCBtb3Rpb25cbiAgICAgICAgICAgIHZhciBwYXJlbnRBID0gYm9keUEucGFyZW50LFxuICAgICAgICAgICAgICAgIHBhcmVudEIgPSBib2R5Qi5wYXJlbnQsXG4gICAgICAgICAgICAgICAgbW90aW9uID0gcGFyZW50QS5zcGVlZCAqIHBhcmVudEEuc3BlZWQgKyBwYXJlbnRBLmFuZ3VsYXJTcGVlZCAqIHBhcmVudEEuYW5ndWxhclNwZWVkXG4gICAgICAgICAgICAgICAgICAgICAgICsgcGFyZW50Qi5zcGVlZCAqIHBhcmVudEIuc3BlZWQgKyBwYXJlbnRCLmFuZ3VsYXJTcGVlZCAqIHBhcmVudEIuYW5ndWxhclNwZWVkO1xuXG4gICAgICAgICAgICAvLyB3ZSBtYXkgYmUgYWJsZSB0byAocGFydGlhbGx5KSByZXVzZSBjb2xsaXNpb24gcmVzdWx0IFxuICAgICAgICAgICAgLy8gYnV0IG9ubHkgc2FmZSBpZiBjb2xsaXNpb24gd2FzIHJlc3RpbmdcbiAgICAgICAgICAgIGNhblJldXNlUHJldkNvbCA9IHByZXZDb2wgJiYgcHJldkNvbC5jb2xsaWRlZCAmJiBtb3Rpb24gPCAwLjI7XG5cbiAgICAgICAgICAgIC8vIHJldXNlIGNvbGxpc2lvbiBvYmplY3RcbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHByZXZDb2w7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb2xsaXNpb24gPSB7IGNvbGxpZGVkOiBmYWxzZSwgYm9keUE6IGJvZHlBLCBib2R5QjogYm9keUIgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcmV2Q29sICYmIGNhblJldXNlUHJldkNvbCkge1xuICAgICAgICAgICAgLy8gaWYgd2UgY2FuIHJldXNlIHRoZSBjb2xsaXNpb24gcmVzdWx0XG4gICAgICAgICAgICAvLyB3ZSBvbmx5IG5lZWQgdG8gdGVzdCB0aGUgcHJldmlvdXNseSBmb3VuZCBheGlzXG4gICAgICAgICAgICB2YXIgYXhpc0JvZHlBID0gY29sbGlzaW9uLmF4aXNCb2R5LFxuICAgICAgICAgICAgICAgIGF4aXNCb2R5QiA9IGF4aXNCb2R5QSA9PT0gYm9keUEgPyBib2R5QiA6IGJvZHlBLFxuICAgICAgICAgICAgICAgIGF4ZXMgPSBbYXhpc0JvZHlBLmF4ZXNbcHJldkNvbC5heGlzTnVtYmVyXV07XG5cbiAgICAgICAgICAgIG1pbk92ZXJsYXAgPSBfb3ZlcmxhcEF4ZXMoYXhpc0JvZHlBLnZlcnRpY2VzLCBheGlzQm9keUIudmVydGljZXMsIGF4ZXMpO1xuICAgICAgICAgICAgY29sbGlzaW9uLnJldXNlZCA9IHRydWU7XG5cbiAgICAgICAgICAgIGlmIChtaW5PdmVybGFwLm92ZXJsYXAgPD0gMCkge1xuICAgICAgICAgICAgICAgIGNvbGxpc2lvbi5jb2xsaWRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb2xsaXNpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBjYW4ndCByZXVzZSBhIHJlc3VsdCwgcGVyZm9ybSBhIGZ1bGwgU0FUIHRlc3RcblxuICAgICAgICAgICAgb3ZlcmxhcEFCID0gX292ZXJsYXBBeGVzKGJvZHlBLnZlcnRpY2VzLCBib2R5Qi52ZXJ0aWNlcywgYm9keUEuYXhlcyk7XG5cbiAgICAgICAgICAgIGlmIChvdmVybGFwQUIub3ZlcmxhcCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uLmNvbGxpZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbGxpc2lvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3ZlcmxhcEJBID0gX292ZXJsYXBBeGVzKGJvZHlCLnZlcnRpY2VzLCBib2R5QS52ZXJ0aWNlcywgYm9keUIuYXhlcyk7XG5cbiAgICAgICAgICAgIGlmIChvdmVybGFwQkEub3ZlcmxhcCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uLmNvbGxpZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbGxpc2lvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG92ZXJsYXBBQi5vdmVybGFwIDwgb3ZlcmxhcEJBLm92ZXJsYXApIHtcbiAgICAgICAgICAgICAgICBtaW5PdmVybGFwID0gb3ZlcmxhcEFCO1xuICAgICAgICAgICAgICAgIGNvbGxpc2lvbi5heGlzQm9keSA9IGJvZHlBO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaW5PdmVybGFwID0gb3ZlcmxhcEJBO1xuICAgICAgICAgICAgICAgIGNvbGxpc2lvbi5heGlzQm9keSA9IGJvZHlCO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpbXBvcnRhbnQgZm9yIHJldXNlIGxhdGVyXG4gICAgICAgICAgICBjb2xsaXNpb24uYXhpc051bWJlciA9IG1pbk92ZXJsYXAuYXhpc051bWJlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbGxpc2lvbi5ib2R5QSA9IGJvZHlBLmlkIDwgYm9keUIuaWQgPyBib2R5QSA6IGJvZHlCO1xuICAgICAgICBjb2xsaXNpb24uYm9keUIgPSBib2R5QS5pZCA8IGJvZHlCLmlkID8gYm9keUIgOiBib2R5QTtcbiAgICAgICAgY29sbGlzaW9uLmNvbGxpZGVkID0gdHJ1ZTtcbiAgICAgICAgY29sbGlzaW9uLm5vcm1hbCA9IG1pbk92ZXJsYXAuYXhpcztcbiAgICAgICAgY29sbGlzaW9uLmRlcHRoID0gbWluT3ZlcmxhcC5vdmVybGFwO1xuICAgICAgICBjb2xsaXNpb24ucGFyZW50QSA9IGNvbGxpc2lvbi5ib2R5QS5wYXJlbnQ7XG4gICAgICAgIGNvbGxpc2lvbi5wYXJlbnRCID0gY29sbGlzaW9uLmJvZHlCLnBhcmVudDtcbiAgICAgICAgXG4gICAgICAgIGJvZHlBID0gY29sbGlzaW9uLmJvZHlBO1xuICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5ib2R5QjtcblxuICAgICAgICAvLyBlbnN1cmUgbm9ybWFsIGlzIGZhY2luZyBhd2F5IGZyb20gYm9keUFcbiAgICAgICAgaWYgKFZlY3Rvci5kb3QoY29sbGlzaW9uLm5vcm1hbCwgVmVjdG9yLnN1Yihib2R5Qi5wb3NpdGlvbiwgYm9keUEucG9zaXRpb24pKSA+IDApIFxuICAgICAgICAgICAgY29sbGlzaW9uLm5vcm1hbCA9IFZlY3Rvci5uZWcoY29sbGlzaW9uLm5vcm1hbCk7XG5cbiAgICAgICAgY29sbGlzaW9uLnRhbmdlbnQgPSBWZWN0b3IucGVycChjb2xsaXNpb24ubm9ybWFsKTtcblxuICAgICAgICBjb2xsaXNpb24ucGVuZXRyYXRpb24gPSB7IFxuICAgICAgICAgICAgeDogY29sbGlzaW9uLm5vcm1hbC54ICogY29sbGlzaW9uLmRlcHRoLCBcbiAgICAgICAgICAgIHk6IGNvbGxpc2lvbi5ub3JtYWwueSAqIGNvbGxpc2lvbi5kZXB0aCBcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmaW5kIHN1cHBvcnQgcG9pbnRzLCB0aGVyZSBpcyBhbHdheXMgZWl0aGVyIGV4YWN0bHkgb25lIG9yIHR3b1xuICAgICAgICB2YXIgdmVydGljZXNCID0gX2ZpbmRTdXBwb3J0cyhib2R5QSwgYm9keUIsIGNvbGxpc2lvbi5ub3JtYWwpLFxuICAgICAgICAgICAgc3VwcG9ydHMgPSBjb2xsaXNpb24uc3VwcG9ydHMgfHwgW107XG4gICAgICAgIHN1cHBvcnRzLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgLy8gZmluZCB0aGUgc3VwcG9ydHMgZnJvbSBib2R5QiB0aGF0IGFyZSBpbnNpZGUgYm9keUFcbiAgICAgICAgaWYgKFZlcnRpY2VzLmNvbnRhaW5zKGJvZHlBLnZlcnRpY2VzLCB2ZXJ0aWNlc0JbMF0pKVxuICAgICAgICAgICAgc3VwcG9ydHMucHVzaCh2ZXJ0aWNlc0JbMF0pO1xuXG4gICAgICAgIGlmIChWZXJ0aWNlcy5jb250YWlucyhib2R5QS52ZXJ0aWNlcywgdmVydGljZXNCWzFdKSlcbiAgICAgICAgICAgIHN1cHBvcnRzLnB1c2godmVydGljZXNCWzFdKTtcblxuICAgICAgICAvLyBmaW5kIHRoZSBzdXBwb3J0cyBmcm9tIGJvZHlBIHRoYXQgYXJlIGluc2lkZSBib2R5QlxuICAgICAgICBpZiAoc3VwcG9ydHMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2VzQSA9IF9maW5kU3VwcG9ydHMoYm9keUIsIGJvZHlBLCBWZWN0b3IubmVnKGNvbGxpc2lvbi5ub3JtYWwpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChWZXJ0aWNlcy5jb250YWlucyhib2R5Qi52ZXJ0aWNlcywgdmVydGljZXNBWzBdKSlcbiAgICAgICAgICAgICAgICBzdXBwb3J0cy5wdXNoKHZlcnRpY2VzQVswXSk7XG5cbiAgICAgICAgICAgIGlmIChzdXBwb3J0cy5sZW5ndGggPCAyICYmIFZlcnRpY2VzLmNvbnRhaW5zKGJvZHlCLnZlcnRpY2VzLCB2ZXJ0aWNlc0FbMV0pKVxuICAgICAgICAgICAgICAgIHN1cHBvcnRzLnB1c2godmVydGljZXNBWzFdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFjY291bnQgZm9yIHRoZSBlZGdlIGNhc2Ugb2Ygb3ZlcmxhcHBpbmcgYnV0IG5vIHZlcnRleCBjb250YWlubWVudFxuICAgICAgICBpZiAoc3VwcG9ydHMubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHN1cHBvcnRzID0gW3ZlcnRpY2VzQlswXV07XG4gICAgICAgIFxuICAgICAgICBjb2xsaXNpb24uc3VwcG9ydHMgPSBzdXBwb3J0cztcblxuICAgICAgICByZXR1cm4gY29sbGlzaW9uO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBGaW5kIHRoZSBvdmVybGFwIGJldHdlZW4gdHdvIHNldHMgb2YgdmVydGljZXMuXG4gICAgICogQG1ldGhvZCBfb3ZlcmxhcEF4ZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSB2ZXJ0aWNlc0FcbiAgICAgKiBAcGFyYW0ge30gdmVydGljZXNCXG4gICAgICogQHBhcmFtIHt9IGF4ZXNcbiAgICAgKiBAcmV0dXJuIHJlc3VsdFxuICAgICAqL1xuICAgIHZhciBfb3ZlcmxhcEF4ZXMgPSBmdW5jdGlvbih2ZXJ0aWNlc0EsIHZlcnRpY2VzQiwgYXhlcykge1xuICAgICAgICB2YXIgcHJvamVjdGlvbkEgPSBWZWN0b3IuX3RlbXBbMF0sIFxuICAgICAgICAgICAgcHJvamVjdGlvbkIgPSBWZWN0b3IuX3RlbXBbMV0sXG4gICAgICAgICAgICByZXN1bHQgPSB7IG92ZXJsYXA6IE51bWJlci5NQVhfVkFMVUUgfSxcbiAgICAgICAgICAgIG92ZXJsYXAsXG4gICAgICAgICAgICBheGlzO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXhpcyA9IGF4ZXNbaV07XG5cbiAgICAgICAgICAgIF9wcm9qZWN0VG9BeGlzKHByb2plY3Rpb25BLCB2ZXJ0aWNlc0EsIGF4aXMpO1xuICAgICAgICAgICAgX3Byb2plY3RUb0F4aXMocHJvamVjdGlvbkIsIHZlcnRpY2VzQiwgYXhpcyk7XG5cbiAgICAgICAgICAgIG92ZXJsYXAgPSBNYXRoLm1pbihwcm9qZWN0aW9uQS5tYXggLSBwcm9qZWN0aW9uQi5taW4sIHByb2plY3Rpb25CLm1heCAtIHByb2plY3Rpb25BLm1pbik7XG5cbiAgICAgICAgICAgIGlmIChvdmVybGFwIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQub3ZlcmxhcCA9IG92ZXJsYXA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG92ZXJsYXAgPCByZXN1bHQub3ZlcmxhcCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5vdmVybGFwID0gb3ZlcmxhcDtcbiAgICAgICAgICAgICAgICByZXN1bHQuYXhpcyA9IGF4aXM7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmF4aXNOdW1iZXIgPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUHJvamVjdHMgdmVydGljZXMgb24gYW4gYXhpcyBhbmQgcmV0dXJucyBhbiBpbnRlcnZhbC5cbiAgICAgKiBAbWV0aG9kIF9wcm9qZWN0VG9BeGlzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gcHJvamVjdGlvblxuICAgICAqIEBwYXJhbSB7fSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7fSBheGlzXG4gICAgICovXG4gICAgdmFyIF9wcm9qZWN0VG9BeGlzID0gZnVuY3Rpb24ocHJvamVjdGlvbiwgdmVydGljZXMsIGF4aXMpIHtcbiAgICAgICAgdmFyIG1pbiA9IFZlY3Rvci5kb3QodmVydGljZXNbMF0sIGF4aXMpLFxuICAgICAgICAgICAgbWF4ID0gbWluO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIHZhciBkb3QgPSBWZWN0b3IuZG90KHZlcnRpY2VzW2ldLCBheGlzKTtcblxuICAgICAgICAgICAgaWYgKGRvdCA+IG1heCkgeyBcbiAgICAgICAgICAgICAgICBtYXggPSBkb3Q7IFxuICAgICAgICAgICAgfSBlbHNlIGlmIChkb3QgPCBtaW4pIHsgXG4gICAgICAgICAgICAgICAgbWluID0gZG90OyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHByb2plY3Rpb24ubWluID0gbWluO1xuICAgICAgICBwcm9qZWN0aW9uLm1heCA9IG1heDtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZpbmRzIHN1cHBvcnRpbmcgdmVydGljZXMgZ2l2ZW4gdHdvIGJvZGllcyBhbG9uZyBhIGdpdmVuIGRpcmVjdGlvbiB1c2luZyBoaWxsLWNsaW1iaW5nLlxuICAgICAqIEBtZXRob2QgX2ZpbmRTdXBwb3J0c1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IGJvZHlBXG4gICAgICogQHBhcmFtIHt9IGJvZHlCXG4gICAgICogQHBhcmFtIHt9IG5vcm1hbFxuICAgICAqIEByZXR1cm4gW3ZlY3Rvcl1cbiAgICAgKi9cbiAgICB2YXIgX2ZpbmRTdXBwb3J0cyA9IGZ1bmN0aW9uKGJvZHlBLCBib2R5Qiwgbm9ybWFsKSB7XG4gICAgICAgIHZhciBuZWFyZXN0RGlzdGFuY2UgPSBOdW1iZXIuTUFYX1ZBTFVFLFxuICAgICAgICAgICAgdmVydGV4VG9Cb2R5ID0gVmVjdG9yLl90ZW1wWzBdLFxuICAgICAgICAgICAgdmVydGljZXMgPSBib2R5Qi52ZXJ0aWNlcyxcbiAgICAgICAgICAgIGJvZHlBUG9zaXRpb24gPSBib2R5QS5wb3NpdGlvbixcbiAgICAgICAgICAgIGRpc3RhbmNlLFxuICAgICAgICAgICAgdmVydGV4LFxuICAgICAgICAgICAgdmVydGV4QSxcbiAgICAgICAgICAgIHZlcnRleEI7XG5cbiAgICAgICAgLy8gZmluZCBjbG9zZXN0IHZlcnRleCBvbiBib2R5QlxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2ZXJ0ZXggPSB2ZXJ0aWNlc1tpXTtcbiAgICAgICAgICAgIHZlcnRleFRvQm9keS54ID0gdmVydGV4LnggLSBib2R5QVBvc2l0aW9uLng7XG4gICAgICAgICAgICB2ZXJ0ZXhUb0JvZHkueSA9IHZlcnRleC55IC0gYm9keUFQb3NpdGlvbi55O1xuICAgICAgICAgICAgZGlzdGFuY2UgPSAtVmVjdG9yLmRvdChub3JtYWwsIHZlcnRleFRvQm9keSk7XG5cbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IG5lYXJlc3REaXN0YW5jZSkge1xuICAgICAgICAgICAgICAgIG5lYXJlc3REaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgICAgICAgICAgICAgIHZlcnRleEEgPSB2ZXJ0ZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmaW5kIG5leHQgY2xvc2VzdCB2ZXJ0ZXggdXNpbmcgdGhlIHR3byBjb25uZWN0ZWQgdG8gaXRcbiAgICAgICAgdmFyIHByZXZJbmRleCA9IHZlcnRleEEuaW5kZXggLSAxID49IDAgPyB2ZXJ0ZXhBLmluZGV4IC0gMSA6IHZlcnRpY2VzLmxlbmd0aCAtIDE7XG4gICAgICAgIHZlcnRleCA9IHZlcnRpY2VzW3ByZXZJbmRleF07XG4gICAgICAgIHZlcnRleFRvQm9keS54ID0gdmVydGV4LnggLSBib2R5QVBvc2l0aW9uLng7XG4gICAgICAgIHZlcnRleFRvQm9keS55ID0gdmVydGV4LnkgLSBib2R5QVBvc2l0aW9uLnk7XG4gICAgICAgIG5lYXJlc3REaXN0YW5jZSA9IC1WZWN0b3IuZG90KG5vcm1hbCwgdmVydGV4VG9Cb2R5KTtcbiAgICAgICAgdmVydGV4QiA9IHZlcnRleDtcblxuICAgICAgICB2YXIgbmV4dEluZGV4ID0gKHZlcnRleEEuaW5kZXggKyAxKSAlIHZlcnRpY2VzLmxlbmd0aDtcbiAgICAgICAgdmVydGV4ID0gdmVydGljZXNbbmV4dEluZGV4XTtcbiAgICAgICAgdmVydGV4VG9Cb2R5LnggPSB2ZXJ0ZXgueCAtIGJvZHlBUG9zaXRpb24ueDtcbiAgICAgICAgdmVydGV4VG9Cb2R5LnkgPSB2ZXJ0ZXgueSAtIGJvZHlBUG9zaXRpb24ueTtcbiAgICAgICAgZGlzdGFuY2UgPSAtVmVjdG9yLmRvdChub3JtYWwsIHZlcnRleFRvQm9keSk7XG4gICAgICAgIGlmIChkaXN0YW5jZSA8IG5lYXJlc3REaXN0YW5jZSkge1xuICAgICAgICAgICAgdmVydGV4QiA9IHZlcnRleDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbdmVydGV4QSwgdmVydGV4Ql07XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Db25zdHJhaW50YCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBjb25zdHJhaW50cy5cbiogQ29uc3RyYWludHMgYXJlIHVzZWQgZm9yIHNwZWNpZnlpbmcgdGhhdCBhIGZpeGVkIGRpc3RhbmNlIG11c3QgYmUgbWFpbnRhaW5lZCBiZXR3ZWVuIHR3byBib2RpZXMgKG9yIGEgYm9keSBhbmQgYSBmaXhlZCB3b3JsZC1zcGFjZSBwb3NpdGlvbikuXG4qIFRoZSBzdGlmZm5lc3Mgb2YgY29uc3RyYWludHMgY2FuIGJlIG1vZGlmaWVkIHRvIGNyZWF0ZSBzcHJpbmdzIG9yIGVsYXN0aWMuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBDb25zdHJhaW50XG4qL1xuXG4vLyBUT0RPOiBmaXggaW5zdGFiaWxpdHkgaXNzdWVzIHdpdGggdG9ycXVlXG4vLyBUT0RPOiBsaW5rZWQgY29uc3RyYWludHNcbi8vIFRPRE86IGJyZWFrYWJsZSBjb25zdHJhaW50c1xuLy8gVE9ETzogY29sbGlzaW9uIGNvbnN0cmFpbnRzXG4vLyBUT0RPOiBhbGxvdyBjb25zdHJhaW5lZCBib2RpZXMgdG8gc2xlZXBcbi8vIFRPRE86IGhhbmRsZSAwIGxlbmd0aCBjb25zdHJhaW50cyBwcm9wZXJseVxuLy8gVE9ETzogaW1wdWxzZSBjYWNoaW5nIGFuZCB3YXJtaW5nXG5cbnZhciBDb25zdHJhaW50ID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQ29uc3RyYWludDtcblxudmFyIFZlcnRpY2VzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVydGljZXMnKTtcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbnZhciBTbGVlcGluZyA9IHJlcXVpcmUoJy4uL2NvcmUvU2xlZXBpbmcnKTtcbnZhciBCb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcbnZhciBBeGVzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQXhlcycpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBfbWluTGVuZ3RoID0gMC4wMDAwMDEsXG4gICAgICAgIF9taW5EaWZmZXJlbmNlID0gMC4wMDE7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnN0cmFpbnQuXG4gICAgICogQWxsIHByb3BlcnRpZXMgaGF2ZSBkZWZhdWx0IHZhbHVlcywgYW5kIG1hbnkgYXJlIHByZS1jYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gb3RoZXIgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtjb25zdHJhaW50fSBjb25zdHJhaW50XG4gICAgICovXG4gICAgQ29uc3RyYWludC5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBjb25zdHJhaW50ID0gb3B0aW9ucztcblxuICAgICAgICAvLyBpZiBib2RpZXMgZGVmaW5lZCBidXQgbm8gcG9pbnRzLCB1c2UgYm9keSBjZW50cmVcbiAgICAgICAgaWYgKGNvbnN0cmFpbnQuYm9keUEgJiYgIWNvbnN0cmFpbnQucG9pbnRBKVxuICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEEgPSB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgaWYgKGNvbnN0cmFpbnQuYm9keUIgJiYgIWNvbnN0cmFpbnQucG9pbnRCKVxuICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEIgPSB7IHg6IDAsIHk6IDAgfTtcblxuICAgICAgICAvLyBjYWxjdWxhdGUgc3RhdGljIGxlbmd0aCB1c2luZyBpbml0aWFsIHdvcmxkIHNwYWNlIHBvaW50c1xuICAgICAgICB2YXIgaW5pdGlhbFBvaW50QSA9IGNvbnN0cmFpbnQuYm9keUEgPyBWZWN0b3IuYWRkKGNvbnN0cmFpbnQuYm9keUEucG9zaXRpb24sIGNvbnN0cmFpbnQucG9pbnRBKSA6IGNvbnN0cmFpbnQucG9pbnRBLFxuICAgICAgICAgICAgaW5pdGlhbFBvaW50QiA9IGNvbnN0cmFpbnQuYm9keUIgPyBWZWN0b3IuYWRkKGNvbnN0cmFpbnQuYm9keUIucG9zaXRpb24sIGNvbnN0cmFpbnQucG9pbnRCKSA6IGNvbnN0cmFpbnQucG9pbnRCLFxuICAgICAgICAgICAgbGVuZ3RoID0gVmVjdG9yLm1hZ25pdHVkZShWZWN0b3Iuc3ViKGluaXRpYWxQb2ludEEsIGluaXRpYWxQb2ludEIpKTtcbiAgICBcbiAgICAgICAgY29uc3RyYWludC5sZW5ndGggPSBjb25zdHJhaW50Lmxlbmd0aCB8fCBsZW5ndGggfHwgX21pbkxlbmd0aDtcblxuICAgICAgICAvLyByZW5kZXJcbiAgICAgICAgdmFyIHJlbmRlciA9IHtcbiAgICAgICAgICAgIHZpc2libGU6IHRydWUsXG4gICAgICAgICAgICBsaW5lV2lkdGg6IDIsXG4gICAgICAgICAgICBzdHJva2VTdHlsZTogJyM2NjYnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdHJhaW50LnJlbmRlciA9IENvbW1vbi5leHRlbmQocmVuZGVyLCBjb25zdHJhaW50LnJlbmRlcik7XG5cbiAgICAgICAgLy8gb3B0aW9uIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0cmFpbnQuaWQgPSBjb25zdHJhaW50LmlkIHx8IENvbW1vbi5uZXh0SWQoKTtcbiAgICAgICAgY29uc3RyYWludC5sYWJlbCA9IGNvbnN0cmFpbnQubGFiZWwgfHwgJ0NvbnN0cmFpbnQnO1xuICAgICAgICBjb25zdHJhaW50LnR5cGUgPSAnY29uc3RyYWludCc7XG4gICAgICAgIGNvbnN0cmFpbnQuc3RpZmZuZXNzID0gY29uc3RyYWludC5zdGlmZm5lc3MgfHwgMTtcbiAgICAgICAgY29uc3RyYWludC5hbmd1bGFyU3RpZmZuZXNzID0gY29uc3RyYWludC5hbmd1bGFyU3RpZmZuZXNzIHx8IDA7XG4gICAgICAgIGNvbnN0cmFpbnQuYW5nbGVBID0gY29uc3RyYWludC5ib2R5QSA/IGNvbnN0cmFpbnQuYm9keUEuYW5nbGUgOiBjb25zdHJhaW50LmFuZ2xlQTtcbiAgICAgICAgY29uc3RyYWludC5hbmdsZUIgPSBjb25zdHJhaW50LmJvZHlCID8gY29uc3RyYWludC5ib2R5Qi5hbmdsZSA6IGNvbnN0cmFpbnQuYW5nbGVCO1xuXG4gICAgICAgIHJldHVybiBjb25zdHJhaW50O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTb2x2ZXMgYWxsIGNvbnN0cmFpbnRzIGluIGEgbGlzdCBvZiBjb2xsaXNpb25zLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBzb2x2ZUFsbFxuICAgICAqIEBwYXJhbSB7Y29uc3RyYWludFtdfSBjb25zdHJhaW50c1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBDb25zdHJhaW50LnNvbHZlQWxsID0gZnVuY3Rpb24oY29uc3RyYWludHMsIHRpbWVTY2FsZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnN0cmFpbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBDb25zdHJhaW50LnNvbHZlKGNvbnN0cmFpbnRzW2ldLCB0aW1lU2NhbGUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNvbHZlcyBhIGRpc3RhbmNlIGNvbnN0cmFpbnQgd2l0aCBHYXVzcy1TaWVkZWwgbWV0aG9kLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBzb2x2ZVxuICAgICAqIEBwYXJhbSB7Y29uc3RyYWludH0gY29uc3RyYWludFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBDb25zdHJhaW50LnNvbHZlID0gZnVuY3Rpb24oY29uc3RyYWludCwgdGltZVNjYWxlKSB7XG4gICAgICAgIHZhciBib2R5QSA9IGNvbnN0cmFpbnQuYm9keUEsXG4gICAgICAgICAgICBib2R5QiA9IGNvbnN0cmFpbnQuYm9keUIsXG4gICAgICAgICAgICBwb2ludEEgPSBjb25zdHJhaW50LnBvaW50QSxcbiAgICAgICAgICAgIHBvaW50QiA9IGNvbnN0cmFpbnQucG9pbnRCO1xuXG4gICAgICAgIC8vIHVwZGF0ZSByZWZlcmVuY2UgYW5nbGVcbiAgICAgICAgaWYgKGJvZHlBICYmICFib2R5QS5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEEgPSBWZWN0b3Iucm90YXRlKHBvaW50QSwgYm9keUEuYW5nbGUgLSBjb25zdHJhaW50LmFuZ2xlQSk7XG4gICAgICAgICAgICBjb25zdHJhaW50LmFuZ2xlQSA9IGJvZHlBLmFuZ2xlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB1cGRhdGUgcmVmZXJlbmNlIGFuZ2xlXG4gICAgICAgIGlmIChib2R5QiAmJiAhYm9keUIuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQucG9pbnRCID0gVmVjdG9yLnJvdGF0ZShwb2ludEIsIGJvZHlCLmFuZ2xlIC0gY29uc3RyYWludC5hbmdsZUIpO1xuICAgICAgICAgICAgY29uc3RyYWludC5hbmdsZUIgPSBib2R5Qi5hbmdsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwb2ludEFXb3JsZCA9IHBvaW50QSxcbiAgICAgICAgICAgIHBvaW50QldvcmxkID0gcG9pbnRCO1xuXG4gICAgICAgIGlmIChib2R5QSkgcG9pbnRBV29ybGQgPSBWZWN0b3IuYWRkKGJvZHlBLnBvc2l0aW9uLCBwb2ludEEpO1xuICAgICAgICBpZiAoYm9keUIpIHBvaW50QldvcmxkID0gVmVjdG9yLmFkZChib2R5Qi5wb3NpdGlvbiwgcG9pbnRCKTtcblxuICAgICAgICBpZiAoIXBvaW50QVdvcmxkIHx8ICFwb2ludEJXb3JsZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgZGVsdGEgPSBWZWN0b3Iuc3ViKHBvaW50QVdvcmxkLCBwb2ludEJXb3JsZCksXG4gICAgICAgICAgICBjdXJyZW50TGVuZ3RoID0gVmVjdG9yLm1hZ25pdHVkZShkZWx0YSk7XG5cbiAgICAgICAgLy8gcHJldmVudCBzaW5ndWxhcml0eVxuICAgICAgICBpZiAoY3VycmVudExlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIGN1cnJlbnRMZW5ndGggPSBfbWluTGVuZ3RoO1xuXG4gICAgICAgIC8vIHNvbHZlIGRpc3RhbmNlIGNvbnN0cmFpbnQgd2l0aCBHYXVzcy1TaWVkZWwgbWV0aG9kXG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gKGN1cnJlbnRMZW5ndGggLSBjb25zdHJhaW50Lmxlbmd0aCkgLyBjdXJyZW50TGVuZ3RoLFxuICAgICAgICAgICAgbm9ybWFsID0gVmVjdG9yLmRpdihkZWx0YSwgY3VycmVudExlbmd0aCksXG4gICAgICAgICAgICBmb3JjZSA9IFZlY3Rvci5tdWx0KGRlbHRhLCBkaWZmZXJlbmNlICogMC41ICogY29uc3RyYWludC5zdGlmZm5lc3MgKiB0aW1lU2NhbGUgKiB0aW1lU2NhbGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gaWYgZGlmZmVyZW5jZSBpcyB2ZXJ5IHNtYWxsLCB3ZSBjYW4gc2tpcFxuICAgICAgICBpZiAoTWF0aC5hYnMoMSAtIChjdXJyZW50TGVuZ3RoIC8gY29uc3RyYWludC5sZW5ndGgpKSA8IF9taW5EaWZmZXJlbmNlICogdGltZVNjYWxlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciB2ZWxvY2l0eVBvaW50QSxcbiAgICAgICAgICAgIHZlbG9jaXR5UG9pbnRCLFxuICAgICAgICAgICAgb2Zmc2V0QSxcbiAgICAgICAgICAgIG9mZnNldEIsXG4gICAgICAgICAgICBvQW4sXG4gICAgICAgICAgICBvQm4sXG4gICAgICAgICAgICBib2R5QURlbm9tLFxuICAgICAgICAgICAgYm9keUJEZW5vbTtcbiAgICBcbiAgICAgICAgaWYgKGJvZHlBICYmICFib2R5QS5pc1N0YXRpYykge1xuICAgICAgICAgICAgLy8gcG9pbnQgYm9keSBvZmZzZXRcbiAgICAgICAgICAgIG9mZnNldEEgPSB7IFxuICAgICAgICAgICAgICAgIHg6IHBvaW50QVdvcmxkLnggLSBib2R5QS5wb3NpdGlvbi54ICsgZm9yY2UueCwgXG4gICAgICAgICAgICAgICAgeTogcG9pbnRBV29ybGQueSAtIGJvZHlBLnBvc2l0aW9uLnkgKyBmb3JjZS55XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgdmVsb2NpdHlcbiAgICAgICAgICAgIGJvZHlBLnZlbG9jaXR5LnggPSBib2R5QS5wb3NpdGlvbi54IC0gYm9keUEucG9zaXRpb25QcmV2Lng7XG4gICAgICAgICAgICBib2R5QS52ZWxvY2l0eS55ID0gYm9keUEucG9zaXRpb24ueSAtIGJvZHlBLnBvc2l0aW9uUHJldi55O1xuICAgICAgICAgICAgYm9keUEuYW5ndWxhclZlbG9jaXR5ID0gYm9keUEuYW5nbGUgLSBib2R5QS5hbmdsZVByZXY7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGZpbmQgcG9pbnQgdmVsb2NpdHkgYW5kIGJvZHkgbWFzc1xuICAgICAgICAgICAgdmVsb2NpdHlQb2ludEEgPSBWZWN0b3IuYWRkKGJvZHlBLnZlbG9jaXR5LCBWZWN0b3IubXVsdChWZWN0b3IucGVycChvZmZzZXRBKSwgYm9keUEuYW5ndWxhclZlbG9jaXR5KSk7XG4gICAgICAgICAgICBvQW4gPSBWZWN0b3IuZG90KG9mZnNldEEsIG5vcm1hbCk7XG4gICAgICAgICAgICBib2R5QURlbm9tID0gYm9keUEuaW52ZXJzZU1hc3MgKyBib2R5QS5pbnZlcnNlSW5lcnRpYSAqIG9BbiAqIG9BbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZlbG9jaXR5UG9pbnRBID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgICAgICBib2R5QURlbm9tID0gYm9keUEgPyBib2R5QS5pbnZlcnNlTWFzcyA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoYm9keUIgJiYgIWJvZHlCLmlzU3RhdGljKSB7XG4gICAgICAgICAgICAvLyBwb2ludCBib2R5IG9mZnNldFxuICAgICAgICAgICAgb2Zmc2V0QiA9IHsgXG4gICAgICAgICAgICAgICAgeDogcG9pbnRCV29ybGQueCAtIGJvZHlCLnBvc2l0aW9uLnggLSBmb3JjZS54LCBcbiAgICAgICAgICAgICAgICB5OiBwb2ludEJXb3JsZC55IC0gYm9keUIucG9zaXRpb24ueSAtIGZvcmNlLnkgXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgdmVsb2NpdHlcbiAgICAgICAgICAgIGJvZHlCLnZlbG9jaXR5LnggPSBib2R5Qi5wb3NpdGlvbi54IC0gYm9keUIucG9zaXRpb25QcmV2Lng7XG4gICAgICAgICAgICBib2R5Qi52ZWxvY2l0eS55ID0gYm9keUIucG9zaXRpb24ueSAtIGJvZHlCLnBvc2l0aW9uUHJldi55O1xuICAgICAgICAgICAgYm9keUIuYW5ndWxhclZlbG9jaXR5ID0gYm9keUIuYW5nbGUgLSBib2R5Qi5hbmdsZVByZXY7XG5cbiAgICAgICAgICAgIC8vIGZpbmQgcG9pbnQgdmVsb2NpdHkgYW5kIGJvZHkgbWFzc1xuICAgICAgICAgICAgdmVsb2NpdHlQb2ludEIgPSBWZWN0b3IuYWRkKGJvZHlCLnZlbG9jaXR5LCBWZWN0b3IubXVsdChWZWN0b3IucGVycChvZmZzZXRCKSwgYm9keUIuYW5ndWxhclZlbG9jaXR5KSk7XG4gICAgICAgICAgICBvQm4gPSBWZWN0b3IuZG90KG9mZnNldEIsIG5vcm1hbCk7XG4gICAgICAgICAgICBib2R5QkRlbm9tID0gYm9keUIuaW52ZXJzZU1hc3MgKyBib2R5Qi5pbnZlcnNlSW5lcnRpYSAqIG9CbiAqIG9CbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZlbG9jaXR5UG9pbnRCID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgICAgICBib2R5QkRlbm9tID0gYm9keUIgPyBib2R5Qi5pbnZlcnNlTWFzcyA6IDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHZhciByZWxhdGl2ZVZlbG9jaXR5ID0gVmVjdG9yLnN1Yih2ZWxvY2l0eVBvaW50QiwgdmVsb2NpdHlQb2ludEEpLFxuICAgICAgICAgICAgbm9ybWFsSW1wdWxzZSA9IFZlY3Rvci5kb3Qobm9ybWFsLCByZWxhdGl2ZVZlbG9jaXR5KSAvIChib2R5QURlbm9tICsgYm9keUJEZW5vbSk7XG4gICAgXG4gICAgICAgIGlmIChub3JtYWxJbXB1bHNlID4gMCkgbm9ybWFsSW1wdWxzZSA9IDA7XG4gICAgXG4gICAgICAgIHZhciBub3JtYWxWZWxvY2l0eSA9IHtcbiAgICAgICAgICAgIHg6IG5vcm1hbC54ICogbm9ybWFsSW1wdWxzZSwgXG4gICAgICAgICAgICB5OiBub3JtYWwueSAqIG5vcm1hbEltcHVsc2VcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdG9ycXVlO1xuIFxuICAgICAgICBpZiAoYm9keUEgJiYgIWJvZHlBLmlzU3RhdGljKSB7XG4gICAgICAgICAgICB0b3JxdWUgPSBWZWN0b3IuY3Jvc3Mob2Zmc2V0QSwgbm9ybWFsVmVsb2NpdHkpICogYm9keUEuaW52ZXJzZUluZXJ0aWEgKiAoMSAtIGNvbnN0cmFpbnQuYW5ndWxhclN0aWZmbmVzcyk7XG5cbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgYXBwbGllZCBpbXB1bHNlcyBmb3IgcG9zdCBzb2x2aW5nXG4gICAgICAgICAgICBib2R5QS5jb25zdHJhaW50SW1wdWxzZS54IC09IGZvcmNlLng7XG4gICAgICAgICAgICBib2R5QS5jb25zdHJhaW50SW1wdWxzZS55IC09IGZvcmNlLnk7XG4gICAgICAgICAgICBib2R5QS5jb25zdHJhaW50SW1wdWxzZS5hbmdsZSArPSB0b3JxdWU7XG5cbiAgICAgICAgICAgIC8vIGFwcGx5IGZvcmNlc1xuICAgICAgICAgICAgYm9keUEucG9zaXRpb24ueCAtPSBmb3JjZS54O1xuICAgICAgICAgICAgYm9keUEucG9zaXRpb24ueSAtPSBmb3JjZS55O1xuICAgICAgICAgICAgYm9keUEuYW5nbGUgKz0gdG9ycXVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJvZHlCICYmICFib2R5Qi5pc1N0YXRpYykge1xuICAgICAgICAgICAgdG9ycXVlID0gVmVjdG9yLmNyb3NzKG9mZnNldEIsIG5vcm1hbFZlbG9jaXR5KSAqIGJvZHlCLmludmVyc2VJbmVydGlhICogKDEgLSBjb25zdHJhaW50LmFuZ3VsYXJTdGlmZm5lc3MpO1xuXG4gICAgICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIGFwcGxpZWQgaW1wdWxzZXMgZm9yIHBvc3Qgc29sdmluZ1xuICAgICAgICAgICAgYm9keUIuY29uc3RyYWludEltcHVsc2UueCArPSBmb3JjZS54O1xuICAgICAgICAgICAgYm9keUIuY29uc3RyYWludEltcHVsc2UueSArPSBmb3JjZS55O1xuICAgICAgICAgICAgYm9keUIuY29uc3RyYWludEltcHVsc2UuYW5nbGUgLT0gdG9ycXVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBhcHBseSBmb3JjZXNcbiAgICAgICAgICAgIGJvZHlCLnBvc2l0aW9uLnggKz0gZm9yY2UueDtcbiAgICAgICAgICAgIGJvZHlCLnBvc2l0aW9uLnkgKz0gZm9yY2UueTtcbiAgICAgICAgICAgIGJvZHlCLmFuZ2xlIC09IHRvcnF1ZTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm1zIGJvZHkgdXBkYXRlcyByZXF1aXJlZCBhZnRlciBzb2x2aW5nIGNvbnN0cmFpbnRzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBwb3N0U29sdmVBbGxcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICovXG4gICAgQ29uc3RyYWludC5wb3N0U29sdmVBbGwgPSBmdW5jdGlvbihib2RpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldLFxuICAgICAgICAgICAgICAgIGltcHVsc2UgPSBib2R5LmNvbnN0cmFpbnRJbXB1bHNlO1xuXG4gICAgICAgICAgICBpZiAoaW1wdWxzZS54ID09PSAwICYmIGltcHVsc2UueSA9PT0gMCAmJiBpbXB1bHNlLmFuZ2xlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFNsZWVwaW5nLnNldChib2R5LCBmYWxzZSk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBnZW9tZXRyeSBhbmQgcmVzZXRcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUocGFydC52ZXJ0aWNlcywgaW1wdWxzZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaiA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvbi54ICs9IGltcHVsc2UueDtcbiAgICAgICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvbi55ICs9IGltcHVsc2UueTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaW1wdWxzZS5hbmdsZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBWZXJ0aWNlcy5yb3RhdGUocGFydC52ZXJ0aWNlcywgaW1wdWxzZS5hbmdsZSwgYm9keS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIEF4ZXMucm90YXRlKHBhcnQuYXhlcywgaW1wdWxzZS5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChqID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgVmVjdG9yLnJvdGF0ZUFib3V0KHBhcnQucG9zaXRpb24sIGltcHVsc2UuYW5nbGUsIGJvZHkucG9zaXRpb24sIHBhcnQucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgQm91bmRzLnVwZGF0ZShwYXJ0LmJvdW5kcywgcGFydC52ZXJ0aWNlcywgYm9keS52ZWxvY2l0eSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGltcHVsc2UuYW5nbGUgPSAwO1xuICAgICAgICAgICAgaW1wdWxzZS54ID0gMDtcbiAgICAgICAgICAgIGltcHVsc2UueSA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHVuaXF1ZWx5IGlkZW50aWZ5aW5nIG51bWJlciBnZW5lcmF0ZWQgaW4gYENvbXBvc2l0ZS5jcmVhdGVgIGJ5IGBDb21tb24ubmV4dElkYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpZFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgU3RyaW5nYCBkZW5vdGluZyB0aGUgdHlwZSBvZiBvYmplY3QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdHlwZVxuICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAqIEBkZWZhdWx0IFwiY29uc3RyYWludFwiXG4gICAgICogQHJlYWRPbmx5XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcmJpdHJhcnkgYFN0cmluZ2AgbmFtZSB0byBoZWxwIHRoZSB1c2VyIGlkZW50aWZ5IGFuZCBtYW5hZ2UgYm9kaWVzLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGxhYmVsXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJDb25zdHJhaW50XCJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGBPYmplY3RgIHRoYXQgZGVmaW5lcyB0aGUgcmVuZGVyaW5nIHByb3BlcnRpZXMgdG8gYmUgY29uc3VtZWQgYnkgdGhlIG1vZHVsZSBgTWF0dGVyLlJlbmRlcmAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBpbmRpY2F0ZXMgaWYgdGhlIGNvbnN0cmFpbnQgc2hvdWxkIGJlIHJlbmRlcmVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlci52aXNpYmxlXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBsaW5lIHdpZHRoIHRvIHVzZSB3aGVuIHJlbmRlcmluZyB0aGUgY29uc3RyYWludCBvdXRsaW5lLlxuICAgICAqIEEgdmFsdWUgb2YgYDBgIG1lYW5zIG5vIG91dGxpbmUgd2lsbCBiZSByZW5kZXJlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIubGluZVdpZHRoXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgU3RyaW5nYCB0aGF0IGRlZmluZXMgdGhlIHN0cm9rZSBzdHlsZSB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhlIGNvbnN0cmFpbnQgb3V0bGluZS5cbiAgICAgKiBJdCBpcyB0aGUgc2FtZSBhcyB3aGVuIHVzaW5nIGEgY2FudmFzLCBzbyBpdCBhY2NlcHRzIENTUyBzdHlsZSBwcm9wZXJ0eSB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnN0cm9rZVN0eWxlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgYSByYW5kb20gY29sb3VyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZmlyc3QgcG9zc2libGUgYEJvZHlgIHRoYXQgdGhpcyBjb25zdHJhaW50IGlzIGF0dGFjaGVkIHRvLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvZHlBXG4gICAgICogQHR5cGUgYm9keVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBzZWNvbmQgcG9zc2libGUgYEJvZHlgIHRoYXQgdGhpcyBjb25zdHJhaW50IGlzIGF0dGFjaGVkIHRvLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvZHlCXG4gICAgICogQHR5cGUgYm9keVxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFZlY3RvcmAgdGhhdCBzcGVjaWZpZXMgdGhlIG9mZnNldCBvZiB0aGUgY29uc3RyYWludCBmcm9tIGNlbnRlciBvZiB0aGUgYGNvbnN0cmFpbnQuYm9keUFgIGlmIGRlZmluZWQsIG90aGVyd2lzZSBhIHdvcmxkLXNwYWNlIHBvc2l0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHBvaW50QVxuICAgICAqIEB0eXBlIHZlY3RvclxuICAgICAqIEBkZWZhdWx0IHsgeDogMCwgeTogMCB9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBWZWN0b3JgIHRoYXQgc3BlY2lmaWVzIHRoZSBvZmZzZXQgb2YgdGhlIGNvbnN0cmFpbnQgZnJvbSBjZW50ZXIgb2YgdGhlIGBjb25zdHJhaW50LmJvZHlBYCBpZiBkZWZpbmVkLCBvdGhlcndpc2UgYSB3b3JsZC1zcGFjZSBwb3NpdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBwb2ludEJcbiAgICAgKiBAdHlwZSB2ZWN0b3JcbiAgICAgKiBAZGVmYXVsdCB7IHg6IDAsIHk6IDAgfVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgc3RpZmZuZXNzIG9mIHRoZSBjb25zdHJhaW50LCBpLmUuIHRoZSByYXRlIGF0IHdoaWNoIGl0IHJldHVybnMgdG8gaXRzIHJlc3RpbmcgYGNvbnN0cmFpbnQubGVuZ3RoYC5cbiAgICAgKiBBIHZhbHVlIG9mIGAxYCBtZWFucyB0aGUgY29uc3RyYWludCBzaG91bGQgYmUgdmVyeSBzdGlmZi5cbiAgICAgKiBBIHZhbHVlIG9mIGAwLjJgIG1lYW5zIHRoZSBjb25zdHJhaW50IGFjdHMgbGlrZSBhIHNvZnQgc3ByaW5nLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHN0aWZmbmVzc1xuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgdGhlIHRhcmdldCByZXN0aW5nIGxlbmd0aCBvZiB0aGUgY29uc3RyYWludC4gXG4gICAgICogSXQgaXMgY2FsY3VsYXRlZCBhdXRvbWF0aWNhbGx5IGluIGBDb25zdHJhaW50LmNyZWF0ZWAgZnJvbSBpbml0aWFsIHBvc2l0aW9ucyBvZiB0aGUgYGNvbnN0cmFpbnQuYm9keUFgIGFuZCBgY29uc3RyYWludC5ib2R5QmAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgbGVuZ3RoXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuTW91c2VDb25zdHJhaW50YCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgbW91c2UgY29uc3RyYWludHMuXG4qIE1vdXNlIGNvbnN0cmFpbnRzIGFyZSB1c2VkIGZvciBhbGxvd2luZyB1c2VyIGludGVyYWN0aW9uLCBwcm92aWRpbmcgdGhlIGFiaWxpdHkgdG8gbW92ZSBib2RpZXMgdmlhIHRoZSBtb3VzZSBvciB0b3VjaC5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIE1vdXNlQ29uc3RyYWludFxuKi9cblxudmFyIE1vdXNlQ29uc3RyYWludCA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlQ29uc3RyYWludDtcblxudmFyIFZlcnRpY2VzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVydGljZXMnKTtcbnZhciBTbGVlcGluZyA9IHJlcXVpcmUoJy4uL2NvcmUvU2xlZXBpbmcnKTtcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvTW91c2UnKTtcbnZhciBFdmVudHMgPSByZXF1aXJlKCcuLi9jb3JlL0V2ZW50cycpO1xudmFyIERldGVjdG9yID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL0RldGVjdG9yJyk7XG52YXIgQ29uc3RyYWludCA9IHJlcXVpcmUoJy4vQ29uc3RyYWludCcpO1xudmFyIENvbXBvc2l0ZSA9IHJlcXVpcmUoJy4uL2JvZHkvQ29tcG9zaXRlJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBCb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBtb3VzZSBjb25zdHJhaW50LlxuICAgICAqIEFsbCBwcm9wZXJ0aWVzIGhhdmUgZGVmYXVsdCB2YWx1ZXMsIGFuZCBtYW55IGFyZSBwcmUtY2FsY3VsYXRlZCBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIG90aGVyIHByb3BlcnRpZXMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gYmVsb3cgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKiBAcGFyYW0ge30gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge01vdXNlQ29uc3RyYWludH0gQSBuZXcgTW91c2VDb25zdHJhaW50XG4gICAgICovXG4gICAgTW91c2VDb25zdHJhaW50LmNyZWF0ZSA9IGZ1bmN0aW9uKGVuZ2luZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgbW91c2UgPSAoZW5naW5lID8gZW5naW5lLm1vdXNlIDogbnVsbCkgfHwgKG9wdGlvbnMgPyBvcHRpb25zLm1vdXNlIDogbnVsbCk7XG5cbiAgICAgICAgaWYgKCFtb3VzZSkge1xuICAgICAgICAgICAgaWYgKGVuZ2luZSAmJiBlbmdpbmUucmVuZGVyICYmIGVuZ2luZS5yZW5kZXIuY2FudmFzKSB7XG4gICAgICAgICAgICAgICAgbW91c2UgPSBNb3VzZS5jcmVhdGUoZW5naW5lLnJlbmRlci5jYW52YXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zICYmIG9wdGlvbnMuZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1vdXNlID0gTW91c2UuY3JlYXRlKG9wdGlvbnMuZWxlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1vdXNlID0gTW91c2UuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgQ29tbW9uLmxvZygnTW91c2VDb25zdHJhaW50LmNyZWF0ZTogb3B0aW9ucy5tb3VzZSB3YXMgdW5kZWZpbmVkLCBvcHRpb25zLmVsZW1lbnQgd2FzIHVuZGVmaW5lZCwgbWF5IG5vdCBmdW5jdGlvbiBhcyBleHBlY3RlZCcsICd3YXJuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY29uc3RyYWludCA9IENvbnN0cmFpbnQuY3JlYXRlKHsgXG4gICAgICAgICAgICBsYWJlbDogJ01vdXNlIENvbnN0cmFpbnQnLFxuICAgICAgICAgICAgcG9pbnRBOiBtb3VzZS5wb3NpdGlvbixcbiAgICAgICAgICAgIHBvaW50QjogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBsZW5ndGg6IDAuMDEsIFxuICAgICAgICAgICAgc3RpZmZuZXNzOiAwLjEsXG4gICAgICAgICAgICBhbmd1bGFyU3RpZmZuZXNzOiAxLFxuICAgICAgICAgICAgcmVuZGVyOiB7XG4gICAgICAgICAgICAgICAgc3Ryb2tlU3R5bGU6ICcjOTBFRTkwJyxcbiAgICAgICAgICAgICAgICBsaW5lV2lkdGg6IDNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgdHlwZTogJ21vdXNlQ29uc3RyYWludCcsXG4gICAgICAgICAgICBtb3VzZTogbW91c2UsXG4gICAgICAgICAgICBlbGVtZW50OiBudWxsLFxuICAgICAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgICAgIGNvbnN0cmFpbnQ6IGNvbnN0cmFpbnQsXG4gICAgICAgICAgICBjb2xsaXNpb25GaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogMHgwMDAxLFxuICAgICAgICAgICAgICAgIG1hc2s6IDB4RkZGRkZGRkYsXG4gICAgICAgICAgICAgICAgZ3JvdXA6IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgbW91c2VDb25zdHJhaW50ID0gQ29tbW9uLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgRXZlbnRzLm9uKGVuZ2luZSwgJ3RpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBhbGxCb2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKGVuZ2luZS53b3JsZCk7XG4gICAgICAgICAgICBNb3VzZUNvbnN0cmFpbnQudXBkYXRlKG1vdXNlQ29uc3RyYWludCwgYWxsQm9kaWVzKTtcbiAgICAgICAgICAgIF90cmlnZ2VyRXZlbnRzKG1vdXNlQ29uc3RyYWludCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBtb3VzZUNvbnN0cmFpbnQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGdpdmVuIG1vdXNlIGNvbnN0cmFpbnQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7TW91c2VDb25zdHJhaW50fSBtb3VzZUNvbnN0cmFpbnRcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICovXG4gICAgTW91c2VDb25zdHJhaW50LnVwZGF0ZSA9IGZ1bmN0aW9uKG1vdXNlQ29uc3RyYWludCwgYm9kaWVzKSB7XG4gICAgICAgIHZhciBtb3VzZSA9IG1vdXNlQ29uc3RyYWludC5tb3VzZSxcbiAgICAgICAgICAgIGNvbnN0cmFpbnQgPSBtb3VzZUNvbnN0cmFpbnQuY29uc3RyYWludCxcbiAgICAgICAgICAgIGJvZHkgPSBtb3VzZUNvbnN0cmFpbnQuYm9keTtcblxuICAgICAgICBpZiAobW91c2UuYnV0dG9uID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoIWNvbnN0cmFpbnQuYm9keUIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBib2R5ID0gYm9kaWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQm91bmRzLmNvbnRhaW5zKGJvZHkuYm91bmRzLCBtb3VzZS5wb3NpdGlvbikgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgRGV0ZWN0b3IuY2FuQ29sbGlkZShib2R5LmNvbGxpc2lvbkZpbHRlciwgbW91c2VDb25zdHJhaW50LmNvbGxpc2lvbkZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSBib2R5LnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgaiA8IGJvZHkucGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFydCA9IGJvZHkucGFydHNbal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFZlcnRpY2VzLmNvbnRhaW5zKHBhcnQudmVydGljZXMsIG1vdXNlLnBvc2l0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QSA9IG1vdXNlLnBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50LmJvZHlCID0gbW91c2VDb25zdHJhaW50LmJvZHkgPSBib2R5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QiA9IHsgeDogbW91c2UucG9zaXRpb24ueCAtIGJvZHkucG9zaXRpb24ueCwgeTogbW91c2UucG9zaXRpb24ueSAtIGJvZHkucG9zaXRpb24ueSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50LmFuZ2xlQiA9IGJvZHkuYW5nbGU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIobW91c2VDb25zdHJhaW50LCAnc3RhcnRkcmFnJywgeyBtb3VzZTogbW91c2UsIGJvZHk6IGJvZHkgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBTbGVlcGluZy5zZXQoY29uc3RyYWludC5ib2R5QiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQucG9pbnRBID0gbW91c2UucG9zaXRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdHJhaW50LmJvZHlCID0gbW91c2VDb25zdHJhaW50LmJvZHkgPSBudWxsO1xuICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEIgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoYm9keSlcbiAgICAgICAgICAgICAgICBFdmVudHMudHJpZ2dlcihtb3VzZUNvbnN0cmFpbnQsICdlbmRkcmFnJywgeyBtb3VzZTogbW91c2UsIGJvZHk6IGJvZHkgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlcnMgbW91c2UgY29uc3RyYWludCBldmVudHMuXG4gICAgICogQG1ldGhvZCBfdHJpZ2dlckV2ZW50c1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHttb3VzZX0gbW91c2VDb25zdHJhaW50XG4gICAgICovXG4gICAgdmFyIF90cmlnZ2VyRXZlbnRzID0gZnVuY3Rpb24obW91c2VDb25zdHJhaW50KSB7XG4gICAgICAgIHZhciBtb3VzZSA9IG1vdXNlQ29uc3RyYWludC5tb3VzZSxcbiAgICAgICAgICAgIG1vdXNlRXZlbnRzID0gbW91c2Uuc291cmNlRXZlbnRzO1xuXG4gICAgICAgIGlmIChtb3VzZUV2ZW50cy5tb3VzZW1vdmUpXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihtb3VzZUNvbnN0cmFpbnQsICdtb3VzZW1vdmUnLCB7IG1vdXNlOiBtb3VzZSB9KTtcblxuICAgICAgICBpZiAobW91c2VFdmVudHMubW91c2Vkb3duKVxuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIobW91c2VDb25zdHJhaW50LCAnbW91c2Vkb3duJywgeyBtb3VzZTogbW91c2UgfSk7XG5cbiAgICAgICAgaWYgKG1vdXNlRXZlbnRzLm1vdXNldXApXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihtb3VzZUNvbnN0cmFpbnQsICdtb3VzZXVwJywgeyBtb3VzZTogbW91c2UgfSk7XG5cbiAgICAgICAgLy8gcmVzZXQgdGhlIG1vdXNlIHN0YXRlIHJlYWR5IGZvciB0aGUgbmV4dCBzdGVwXG4gICAgICAgIE1vdXNlLmNsZWFyU291cmNlRXZlbnRzKG1vdXNlKTtcbiAgICB9O1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgRXZlbnRzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiB0aGUgbW91c2UgaGFzIG1vdmVkIChvciBhIHRvdWNoIG1vdmVzKSBkdXJpbmcgdGhlIGxhc3Qgc3RlcFxuICAgICpcbiAgICAqIEBldmVudCBtb3VzZW1vdmVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bW91c2V9IGV2ZW50Lm1vdXNlIFRoZSBlbmdpbmUncyBtb3VzZSBpbnN0YW5jZVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gdGhlIG1vdXNlIGlzIGRvd24gKG9yIGEgdG91Y2ggaGFzIHN0YXJ0ZWQpIGR1cmluZyB0aGUgbGFzdCBzdGVwXG4gICAgKlxuICAgICogQGV2ZW50IG1vdXNlZG93blxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHttb3VzZX0gZXZlbnQubW91c2UgVGhlIGVuZ2luZSdzIG1vdXNlIGluc3RhbmNlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiB0aGUgbW91c2UgaXMgdXAgKG9yIGEgdG91Y2ggaGFzIGVuZGVkKSBkdXJpbmcgdGhlIGxhc3Qgc3RlcFxuICAgICpcbiAgICAqIEBldmVudCBtb3VzZXVwXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge21vdXNlfSBldmVudC5tb3VzZSBUaGUgZW5naW5lJ3MgbW91c2UgaW5zdGFuY2VcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIHRoZSB1c2VyIHN0YXJ0cyBkcmFnZ2luZyBhIGJvZHlcbiAgICAqXG4gICAgKiBAZXZlbnQgc3RhcnRkcmFnXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge21vdXNlfSBldmVudC5tb3VzZSBUaGUgZW5naW5lJ3MgbW91c2UgaW5zdGFuY2VcbiAgICAqIEBwYXJhbSB7Ym9keX0gZXZlbnQuYm9keSBUaGUgYm9keSBiZWluZyBkcmFnZ2VkXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiB0aGUgdXNlciBlbmRzIGRyYWdnaW5nIGEgYm9keVxuICAgICpcbiAgICAqIEBldmVudCBlbmRkcmFnXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge21vdXNlfSBldmVudC5tb3VzZSBUaGUgZW5naW5lJ3MgbW91c2UgaW5zdGFuY2VcbiAgICAqIEBwYXJhbSB7Ym9keX0gZXZlbnQuYm9keSBUaGUgYm9keSB0aGF0IGhhcyBzdG9wcGVkIGJlaW5nIGRyYWdnZWRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIGRlbm90aW5nIHRoZSB0eXBlIG9mIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0eXBlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJjb25zdHJhaW50XCJcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBgTW91c2VgIGluc3RhbmNlIGluIHVzZS4gSWYgbm90IHN1cHBsaWVkIGluIGBNb3VzZUNvbnN0cmFpbnQuY3JlYXRlYCwgb25lIHdpbGwgYmUgY3JlYXRlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBtb3VzZVxuICAgICAqIEB0eXBlIG1vdXNlXG4gICAgICogQGRlZmF1bHQgbW91c2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBgQm9keWAgdGhhdCBpcyBjdXJyZW50bHkgYmVpbmcgbW92ZWQgYnkgdGhlIHVzZXIsIG9yIGBudWxsYCBpZiBubyBib2R5LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvZHlcbiAgICAgKiBAdHlwZSBib2R5XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBDb25zdHJhaW50YCBvYmplY3QgdGhhdCBpcyB1c2VkIHRvIG1vdmUgdGhlIGJvZHkgZHVyaW5nIGludGVyYWN0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbnN0cmFpbnRcbiAgICAgKiBAdHlwZSBjb25zdHJhaW50XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBgT2JqZWN0YCB0aGF0IHNwZWNpZmllcyB0aGUgY29sbGlzaW9uIGZpbHRlciBwcm9wZXJ0aWVzLlxuICAgICAqIFRoZSBjb2xsaXNpb24gZmlsdGVyIGFsbG93cyB0aGUgdXNlciB0byBkZWZpbmUgd2hpY2ggdHlwZXMgb2YgYm9keSB0aGlzIG1vdXNlIGNvbnN0cmFpbnQgY2FuIGludGVyYWN0IHdpdGguXG4gICAgICogU2VlIGBib2R5LmNvbGxpc2lvbkZpbHRlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29sbGlzaW9uRmlsdGVyXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuQ29tbW9uYCBtb2R1bGUgY29udGFpbnMgdXRpbGl0eSBmdW5jdGlvbnMgdGhhdCBhcmUgY29tbW9uIHRvIGFsbCBtb2R1bGVzLlxuKlxuKiBAY2xhc3MgQ29tbW9uXG4qL1xuXG52YXIgQ29tbW9uID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tbW9uO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICBDb21tb24uX25leHRJZCA9IDA7XG4gICAgQ29tbW9uLl9zZWVkID0gMDtcblxuICAgIC8qKlxuICAgICAqIEV4dGVuZHMgdGhlIG9iamVjdCBpbiB0aGUgZmlyc3QgYXJndW1lbnQgdXNpbmcgdGhlIG9iamVjdCBpbiB0aGUgc2Vjb25kIGFyZ3VtZW50LlxuICAgICAqIEBtZXRob2QgZXh0ZW5kXG4gICAgICogQHBhcmFtIHt9IG9ialxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZGVlcFxuICAgICAqIEByZXR1cm4ge30gb2JqIGV4dGVuZGVkXG4gICAgICovXG4gICAgQ29tbW9uLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaiwgZGVlcCkge1xuICAgICAgICB2YXIgYXJnc1N0YXJ0LFxuICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgIGRlZXBDbG9uZTtcblxuICAgICAgICBpZiAodHlwZW9mIGRlZXAgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgYXJnc1N0YXJ0ID0gMjtcbiAgICAgICAgICAgIGRlZXBDbG9uZSA9IGRlZXA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcmdzU3RhcnQgPSAxO1xuICAgICAgICAgICAgZGVlcENsb25lID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIGFyZ3NTdGFydCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gYXJnc1tpXTtcblxuICAgICAgICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWVwQ2xvbmUgJiYgc291cmNlW3Byb3BdICYmIHNvdXJjZVtwcm9wXS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9ialtwcm9wXSB8fCBvYmpbcHJvcF0uY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IG9ialtwcm9wXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb21tb24uZXh0ZW5kKG9ialtwcm9wXSwgZGVlcENsb25lLCBzb3VyY2VbcHJvcF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY2xvbmUgb2YgdGhlIG9iamVjdCwgaWYgZGVlcCBpcyB0cnVlIHJlZmVyZW5jZXMgd2lsbCBhbHNvIGJlIGNsb25lZC5cbiAgICAgKiBAbWV0aG9kIGNsb25lXG4gICAgICogQHBhcmFtIHt9IG9ialxuICAgICAqIEBwYXJhbSB7Ym9vbH0gZGVlcFxuICAgICAqIEByZXR1cm4ge30gb2JqIGNsb25lZFxuICAgICAqL1xuICAgIENvbW1vbi5jbG9uZSA9IGZ1bmN0aW9uKG9iaiwgZGVlcCkge1xuICAgICAgICByZXR1cm4gQ29tbW9uLmV4dGVuZCh7fSwgZGVlcCwgb2JqKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbGlzdCBvZiBrZXlzIGZvciB0aGUgZ2l2ZW4gb2JqZWN0LlxuICAgICAqIEBtZXRob2Qga2V5c1xuICAgICAqIEBwYXJhbSB7fSBvYmpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmdbXX0ga2V5c1xuICAgICAqL1xuICAgIENvbW1vbi5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cylcbiAgICAgICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmopO1xuXG4gICAgICAgIC8vIGF2b2lkIGhhc093blByb3BlcnR5IGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKVxuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsaXN0IG9mIHZhbHVlcyBmb3IgdGhlIGdpdmVuIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIHZhbHVlc1xuICAgICAqIEBwYXJhbSB7fSBvYmpcbiAgICAgKiBAcmV0dXJuIHthcnJheX0gQXJyYXkgb2YgdGhlIG9iamVjdHMgcHJvcGVydHkgdmFsdWVzXG4gICAgICovXG4gICAgQ29tbW9uLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgICB2YXIgdmFsdWVzID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoT2JqZWN0LmtleXMpIHtcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9ialtrZXlzW2ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBhdm9pZCBoYXNPd25Qcm9wZXJ0eSBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iailcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKG9ialtrZXldKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIGhleCBjb2xvdXIgc3RyaW5nIG1hZGUgYnkgbGlnaHRlbmluZyBvciBkYXJrZW5pbmcgY29sb3IgYnkgcGVyY2VudC5cbiAgICAgKiBAbWV0aG9kIHNoYWRlQ29sb3JcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gQSBoZXggY29sb3VyXG4gICAgICovXG4gICAgQ29tbW9uLnNoYWRlQ29sb3IgPSBmdW5jdGlvbihjb2xvciwgcGVyY2VudCkgeyAgIFxuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzU1NjAyNDgvcHJvZ3JhbW1hdGljYWxseS1saWdodGVuLW9yLWRhcmtlbi1hLWhleC1jb2xvclxuICAgICAgICB2YXIgY29sb3JJbnRlZ2VyID0gcGFyc2VJbnQoY29sb3Iuc2xpY2UoMSksMTYpLCBcbiAgICAgICAgICAgIGFtb3VudCA9IE1hdGgucm91bmQoMi41NSAqIHBlcmNlbnQpLCBcbiAgICAgICAgICAgIFIgPSAoY29sb3JJbnRlZ2VyID4+IDE2KSArIGFtb3VudCwgXG4gICAgICAgICAgICBCID0gKGNvbG9ySW50ZWdlciA+PiA4ICYgMHgwMEZGKSArIGFtb3VudCwgXG4gICAgICAgICAgICBHID0gKGNvbG9ySW50ZWdlciAmIDB4MDAwMEZGKSArIGFtb3VudDtcbiAgICAgICAgcmV0dXJuIFwiI1wiICsgKDB4MTAwMDAwMCArIChSIDwgMjU1ID8gUiA8IDEgPyAwIDogUiA6MjU1KSAqIDB4MTAwMDAgXG4gICAgICAgICAgICAgICAgKyAoQiA8IDI1NSA/IEIgPCAxID8gMCA6IEIgOiAyNTUpICogMHgxMDAgXG4gICAgICAgICAgICAgICAgKyAoRyA8IDI1NSA/IEcgPCAxID8gMCA6IEcgOiAyNTUpKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNodWZmbGVzIHRoZSBnaXZlbiBhcnJheSBpbi1wbGFjZS5cbiAgICAgKiBUaGUgZnVuY3Rpb24gdXNlcyBhIHNlZWRlZCByYW5kb20gZ2VuZXJhdG9yLlxuICAgICAqIEBtZXRob2Qgc2h1ZmZsZVxuICAgICAqIEBwYXJhbSB7YXJyYXl9IGFycmF5XG4gICAgICogQHJldHVybiB7YXJyYXl9IGFycmF5IHNodWZmbGVkIHJhbmRvbWx5XG4gICAgICovXG4gICAgQ29tbW9uLnNodWZmbGUgPSBmdW5jdGlvbihhcnJheSkge1xuICAgICAgICBmb3IgKHZhciBpID0gYXJyYXkubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICAgICAgdmFyIGogPSBNYXRoLmZsb29yKENvbW1vbi5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgICAgICAgICAgdmFyIHRlbXAgPSBhcnJheVtpXTtcbiAgICAgICAgICAgIGFycmF5W2ldID0gYXJyYXlbal07XG4gICAgICAgICAgICBhcnJheVtqXSA9IHRlbXA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFycmF5O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSYW5kb21seSBjaG9vc2VzIGEgdmFsdWUgZnJvbSBhIGxpc3Qgd2l0aCBlcXVhbCBwcm9iYWJpbGl0eS5cbiAgICAgKiBUaGUgZnVuY3Rpb24gdXNlcyBhIHNlZWRlZCByYW5kb20gZ2VuZXJhdG9yLlxuICAgICAqIEBtZXRob2QgY2hvb3NlXG4gICAgICogQHBhcmFtIHthcnJheX0gY2hvaWNlc1xuICAgICAqIEByZXR1cm4ge29iamVjdH0gQSByYW5kb20gY2hvaWNlIG9iamVjdCBmcm9tIHRoZSBhcnJheVxuICAgICAqL1xuICAgIENvbW1vbi5jaG9vc2UgPSBmdW5jdGlvbihjaG9pY2VzKSB7XG4gICAgICAgIHJldHVybiBjaG9pY2VzW01hdGguZmxvb3IoQ29tbW9uLnJhbmRvbSgpICogY2hvaWNlcy5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBvYmplY3QgaXMgYSBIVE1MRWxlbWVudCwgb3RoZXJ3aXNlIGZhbHNlLlxuICAgICAqIEBtZXRob2QgaXNFbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhIEhUTUxFbGVtZW50LCBvdGhlcndpc2UgZmFsc2VcbiAgICAgKi9cbiAgICBDb21tb24uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEhUTUxFbGVtZW50O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2Ygb2JqPT09XCJvYmplY3RcIikgJiZcbiAgICAgICAgICAgICAgKG9iai5ub2RlVHlwZT09PTEpICYmICh0eXBlb2Ygb2JqLnN0eWxlID09PSBcIm9iamVjdFwiKSAmJlxuICAgICAgICAgICAgICAodHlwZW9mIG9iai5vd25lckRvY3VtZW50ID09PVwib2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGFuIGFycmF5LlxuICAgICAqIEBtZXRob2QgaXNBcnJheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXksIG90aGVyd2lzZSBmYWxzZVxuICAgICAqL1xuICAgIENvbW1vbi5pc0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGdpdmVuIHZhbHVlIGNsYW1wZWQgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW0gdmFsdWUuXG4gICAgICogQG1ldGhvZCBjbGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtaW5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4XG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgdmFsdWUgY2xhbXBlZCBiZXR3ZWVuIG1pbiBhbmQgbWF4IGluY2x1c2l2ZVxuICAgICAqL1xuICAgIENvbW1vbi5jbGFtcCA9IGZ1bmN0aW9uKHZhbHVlLCBtaW4sIG1heCkge1xuICAgICAgICBpZiAodmFsdWUgPCBtaW4pXG4gICAgICAgICAgICByZXR1cm4gbWluO1xuICAgICAgICBpZiAodmFsdWUgPiBtYXgpXG4gICAgICAgICAgICByZXR1cm4gbWF4O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBzaWduIG9mIHRoZSBnaXZlbiB2YWx1ZS5cbiAgICAgKiBAbWV0aG9kIHNpZ25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWVcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IC0xIGlmIG5lZ2F0aXZlLCArMSBpZiAwIG9yIHBvc2l0aXZlXG4gICAgICovXG4gICAgQ29tbW9uLnNpZ24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWUgPCAwID8gLTEgOiAxO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY3VycmVudCB0aW1lc3RhbXAgKGhpZ2gtcmVzIGlmIGF2YWlsYWJsZSkuXG4gICAgICogQG1ldGhvZCBub3dcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IHRoZSBjdXJyZW50IHRpbWVzdGFtcCAoaGlnaC1yZXMgaWYgYXZhaWxhYmxlKVxuICAgICAqL1xuICAgIENvbW1vbi5ub3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8yMjEyOTQvaG93LWRvLXlvdS1nZXQtYS10aW1lc3RhbXAtaW4tamF2YXNjcmlwdFxuICAgICAgICAvLyBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kYXZpZHdhdGVyc3Rvbi8yOTgyNTMxXG5cbiAgICAgICAgdmFyIHBlcmZvcm1hbmNlID0gd2luZG93LnBlcmZvcm1hbmNlIHx8IHt9O1xuXG4gICAgICAgIHBlcmZvcm1hbmNlLm5vdyA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3cgICAgfHxcbiAgICAgICAgICAgIHBlcmZvcm1hbmNlLndlYmtpdE5vdyAgICAgfHxcbiAgICAgICAgICAgIHBlcmZvcm1hbmNlLm1zTm93ICAgICAgICAgfHxcbiAgICAgICAgICAgIHBlcmZvcm1hbmNlLm9Ob3cgICAgICAgICAgfHxcbiAgICAgICAgICAgIHBlcmZvcm1hbmNlLm1vek5vdyAgICAgICAgfHxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkgeyByZXR1cm4gKyhuZXcgRGF0ZSgpKTsgfTtcbiAgICAgICAgfSkoKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuXG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIHJhbmRvbSB2YWx1ZSBiZXR3ZWVuIGEgbWluaW11bSBhbmQgYSBtYXhpbXVtIHZhbHVlIGluY2x1c2l2ZS5cbiAgICAgKiBUaGUgZnVuY3Rpb24gdXNlcyBhIHNlZWRlZCByYW5kb20gZ2VuZXJhdG9yLlxuICAgICAqIEBtZXRob2QgcmFuZG9tXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1pblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXhcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IEEgcmFuZG9tIG51bWJlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IGluY2x1c2l2ZVxuICAgICAqL1xuICAgIENvbW1vbi5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgICAgICBtaW4gPSAodHlwZW9mIG1pbiAhPT0gXCJ1bmRlZmluZWRcIikgPyBtaW4gOiAwO1xuICAgICAgICBtYXggPSAodHlwZW9mIG1heCAhPT0gXCJ1bmRlZmluZWRcIikgPyBtYXggOiAxO1xuICAgICAgICByZXR1cm4gbWluICsgX3NlZWRlZFJhbmRvbSgpICogKG1heCAtIG1pbik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGEgQ1NTIGhleCBjb2xvdXIgc3RyaW5nIGludG8gYW4gaW50ZWdlci5cbiAgICAgKiBAbWV0aG9kIGNvbG9yVG9OdW1iZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29sb3JTdHJpbmdcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IEFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBDU1MgaGV4IHN0cmluZ1xuICAgICAqL1xuICAgIENvbW1vbi5jb2xvclRvTnVtYmVyID0gZnVuY3Rpb24oY29sb3JTdHJpbmcpIHtcbiAgICAgICAgY29sb3JTdHJpbmcgPSBjb2xvclN0cmluZy5yZXBsYWNlKCcjJywnJyk7XG5cbiAgICAgICAgaWYgKGNvbG9yU3RyaW5nLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICBjb2xvclN0cmluZyA9IGNvbG9yU3RyaW5nLmNoYXJBdCgwKSArIGNvbG9yU3RyaW5nLmNoYXJBdCgwKVxuICAgICAgICAgICAgICAgICAgICAgICAgKyBjb2xvclN0cmluZy5jaGFyQXQoMSkgKyBjb2xvclN0cmluZy5jaGFyQXQoMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICsgY29sb3JTdHJpbmcuY2hhckF0KDIpICsgY29sb3JTdHJpbmcuY2hhckF0KDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KGNvbG9yU3RyaW5nLCAxNik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgd3JhcHBlciBmb3IgY29uc29sZS5sb2csIGZvciBwcm92aWRpbmcgZXJyb3JzIGFuZCB3YXJuaW5ncy5cbiAgICAgKiBAbWV0aG9kIGxvZ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgKi9cbiAgICBDb21tb24ubG9nID0gZnVuY3Rpb24obWVzc2FnZSwgdHlwZSkge1xuICAgICAgICBpZiAoIWNvbnNvbGUgfHwgIWNvbnNvbGUubG9nIHx8ICFjb25zb2xlLndhcm4pXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG5cbiAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ01hdHRlci5qczonLCBtZXNzYWdlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTWF0dGVyLmpzOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBuZXh0IHVuaXF1ZSBzZXF1ZW50aWFsIElELlxuICAgICAqIEBtZXRob2QgbmV4dElkXG4gICAgICogQHJldHVybiB7TnVtYmVyfSBVbmlxdWUgc2VxdWVudGlhbCBJRFxuICAgICAqL1xuICAgIENvbW1vbi5uZXh0SWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIENvbW1vbi5fbmV4dElkKys7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgY3Jvc3MgYnJvd3NlciBjb21wYXRpYmxlIGluZGV4T2YgaW1wbGVtZW50YXRpb24uXG4gICAgICogQG1ldGhvZCBpbmRleE9mXG4gICAgICogQHBhcmFtIHthcnJheX0gaGF5c3RhY2tcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbmVlZGxlXG4gICAgICovXG4gICAgQ29tbW9uLmluZGV4T2YgPSBmdW5jdGlvbihoYXlzdGFjaywgbmVlZGxlKSB7XG4gICAgICAgIGlmIChoYXlzdGFjay5pbmRleE9mKVxuICAgICAgICAgICAgcmV0dXJuIGhheXN0YWNrLmluZGV4T2YobmVlZGxlKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhheXN0YWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaGF5c3RhY2tbaV0gPT09IG5lZWRsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuXG4gICAgdmFyIF9zZWVkZWRSYW5kb20gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vbmdyeW1hbi8zODMwNDg5XG4gICAgICAgIENvbW1vbi5fc2VlZCA9IChDb21tb24uX3NlZWQgKiA5MzAxICsgNDkyOTcpICUgMjMzMjgwO1xuICAgICAgICByZXR1cm4gQ29tbW9uLl9zZWVkIC8gMjMzMjgwO1xuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuRW5naW5lYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBlbmdpbmVzLlxuKiBBbiBlbmdpbmUgaXMgYSBjb250cm9sbGVyIHRoYXQgbWFuYWdlcyB1cGRhdGluZyB0aGUgc2ltdWxhdGlvbiBvZiB0aGUgd29ybGQuXG4qIFNlZSBgTWF0dGVyLlJ1bm5lcmAgZm9yIGFuIG9wdGlvbmFsIGdhbWUgbG9vcCB1dGlsaXR5LlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgRW5naW5lXG4qL1xuXG52YXIgRW5naW5lID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gRW5naW5lO1xuXG52YXIgV29ybGQgPSByZXF1aXJlKCcuLi9ib2R5L1dvcmxkJyk7XG52YXIgU2xlZXBpbmcgPSByZXF1aXJlKCcuL1NsZWVwaW5nJyk7XG52YXIgUmVzb2x2ZXIgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vUmVzb2x2ZXInKTtcbnZhciBSZW5kZXIgPSByZXF1aXJlKCcuLi9yZW5kZXIvUmVuZGVyJyk7XG52YXIgUGFpcnMgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vUGFpcnMnKTtcbnZhciBNZXRyaWNzID0gcmVxdWlyZSgnLi9NZXRyaWNzJyk7XG52YXIgR3JpZCA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9HcmlkJyk7XG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9FdmVudHMnKTtcbnZhciBDb21wb3NpdGUgPSByZXF1aXJlKCcuLi9ib2R5L0NvbXBvc2l0ZScpO1xudmFyIENvbnN0cmFpbnQgPSByZXF1aXJlKCcuLi9jb25zdHJhaW50L0NvbnN0cmFpbnQnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuL0NvbW1vbicpO1xudmFyIEJvZHkgPSByZXF1aXJlKCcuLi9ib2R5L0JvZHknKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBlbmdpbmUuIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIEFsbCBwcm9wZXJ0aWVzIGhhdmUgZGVmYXVsdCB2YWx1ZXMsIGFuZCBtYW55IGFyZSBwcmUtY2FsY3VsYXRlZCBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIG90aGVyIHByb3BlcnRpZXMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gYmVsb3cgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcmV0dXJuIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqL1xuICAgIEVuZ2luZS5jcmVhdGUgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgICAgIC8vIG9wdGlvbnMgbWF5IGJlIHBhc3NlZCBhcyB0aGUgZmlyc3QgKGFuZCBvbmx5KSBhcmd1bWVudFxuICAgICAgICBvcHRpb25zID0gQ29tbW9uLmlzRWxlbWVudChlbGVtZW50KSA/IG9wdGlvbnMgOiBlbGVtZW50O1xuICAgICAgICBlbGVtZW50ID0gQ29tbW9uLmlzRWxlbWVudChlbGVtZW50KSA/IGVsZW1lbnQgOiBudWxsO1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBpZiAoZWxlbWVudCB8fCBvcHRpb25zLnJlbmRlcikge1xuICAgICAgICAgICAgQ29tbW9uLmxvZygnRW5naW5lLmNyZWF0ZTogZW5naW5lLnJlbmRlciBpcyBkZXByZWNhdGVkIChzZWUgZG9jcyknLCAnd2FybicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgcG9zaXRpb25JdGVyYXRpb25zOiA2LFxuICAgICAgICAgICAgdmVsb2NpdHlJdGVyYXRpb25zOiA0LFxuICAgICAgICAgICAgY29uc3RyYWludEl0ZXJhdGlvbnM6IDIsXG4gICAgICAgICAgICBlbmFibGVTbGVlcGluZzogZmFsc2UsXG4gICAgICAgICAgICBldmVudHM6IFtdLFxuICAgICAgICAgICAgdGltaW5nOiB7XG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiAwLFxuICAgICAgICAgICAgICAgIHRpbWVTY2FsZTogMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJyb2FkcGhhc2U6IHtcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBHcmlkXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGVuZ2luZSA9IENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIEBkZXByZWNhdGVkXG4gICAgICAgIGlmIChlbGVtZW50IHx8IGVuZ2luZS5yZW5kZXIpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJEZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICBlbGVtZW50OiBlbGVtZW50LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFJlbmRlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZW5naW5lLnJlbmRlciA9IENvbW1vbi5leHRlbmQocmVuZGVyRGVmYXVsdHMsIGVuZ2luZS5yZW5kZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQGRlcHJlY2F0ZWRcbiAgICAgICAgaWYgKGVuZ2luZS5yZW5kZXIgJiYgZW5naW5lLnJlbmRlci5jb250cm9sbGVyKSB7XG4gICAgICAgICAgICBlbmdpbmUucmVuZGVyID0gZW5naW5lLnJlbmRlci5jb250cm9sbGVyLmNyZWF0ZShlbmdpbmUucmVuZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEBkZXByZWNhdGVkXG4gICAgICAgIGlmIChlbmdpbmUucmVuZGVyKSB7XG4gICAgICAgICAgICBlbmdpbmUucmVuZGVyLmVuZ2luZSA9IGVuZ2luZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVuZ2luZS53b3JsZCA9IG9wdGlvbnMud29ybGQgfHwgV29ybGQuY3JlYXRlKGVuZ2luZS53b3JsZCk7XG4gICAgICAgIGVuZ2luZS5wYWlycyA9IFBhaXJzLmNyZWF0ZSgpO1xuICAgICAgICBlbmdpbmUuYnJvYWRwaGFzZSA9IGVuZ2luZS5icm9hZHBoYXNlLmNvbnRyb2xsZXIuY3JlYXRlKGVuZ2luZS5icm9hZHBoYXNlKTtcbiAgICAgICAgZW5naW5lLm1ldHJpY3MgPSBlbmdpbmUubWV0cmljcyB8fCB7IGV4dGVuZGVkOiBmYWxzZSB9O1xuXG4gICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICBlbmdpbmUubWV0cmljcyA9IE1ldHJpY3MuY3JlYXRlKGVuZ2luZS5tZXRyaWNzKTtcbiAgICAgICAgLy8gQGVuZGlmXG5cbiAgICAgICAgcmV0dXJuIGVuZ2luZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTW92ZXMgdGhlIHNpbXVsYXRpb24gZm9yd2FyZCBpbiB0aW1lIGJ5IGBkZWx0YWAgbXMuXG4gICAgICogVGhlIGBjb3JyZWN0aW9uYCBhcmd1bWVudCBpcyBhbiBvcHRpb25hbCBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgdGltZSBjb3JyZWN0aW9uIGZhY3RvciB0byBhcHBseSB0byB0aGUgdXBkYXRlLlxuICAgICAqIFRoaXMgY2FuIGhlbHAgaW1wcm92ZSB0aGUgYWNjdXJhY3kgb2YgdGhlIHNpbXVsYXRpb24gaW4gY2FzZXMgd2hlcmUgYGRlbHRhYCBpcyBjaGFuZ2luZyBiZXR3ZWVuIHVwZGF0ZXMuXG4gICAgICogVGhlIHZhbHVlIG9mIGBjb3JyZWN0aW9uYCBpcyBkZWZpbmVkIGFzIGBkZWx0YSAvIGxhc3REZWx0YWAsIGkuZS4gdGhlIHBlcmNlbnRhZ2UgY2hhbmdlIG9mIGBkZWx0YWAgb3ZlciB0aGUgbGFzdCBzdGVwLlxuICAgICAqIFRoZXJlZm9yZSB0aGUgdmFsdWUgaXMgYWx3YXlzIGAxYCAobm8gY29ycmVjdGlvbikgd2hlbiBgZGVsdGFgIGNvbnN0YW50IChvciB3aGVuIG5vIGNvcnJlY3Rpb24gaXMgZGVzaXJlZCwgd2hpY2ggaXMgdGhlIGRlZmF1bHQpLlxuICAgICAqIFNlZSB0aGUgcGFwZXIgb24gPGEgaHJlZj1cImh0dHA6Ly9sb25lc29jay5uZXQvYXJ0aWNsZS92ZXJsZXQuaHRtbFwiPlRpbWUgQ29ycmVjdGVkIFZlcmxldDwvYT4gZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBUcmlnZ2VycyBgYmVmb3JlVXBkYXRlYCBhbmQgYGFmdGVyVXBkYXRlYCBldmVudHMuXG4gICAgICogVHJpZ2dlcnMgYGNvbGxpc2lvblN0YXJ0YCwgYGNvbGxpc2lvbkFjdGl2ZWAgYW5kIGBjb2xsaXNpb25FbmRgIGV2ZW50cy5cbiAgICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2RlbHRhPTE2LjY2Nl1cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2NvcnJlY3Rpb249MV1cbiAgICAgKi9cbiAgICBFbmdpbmUudXBkYXRlID0gZnVuY3Rpb24oZW5naW5lLCBkZWx0YSwgY29ycmVjdGlvbikge1xuICAgICAgICBkZWx0YSA9IGRlbHRhIHx8IDEwMDAgLyA2MDtcbiAgICAgICAgY29ycmVjdGlvbiA9IGNvcnJlY3Rpb24gfHwgMTtcblxuICAgICAgICB2YXIgd29ybGQgPSBlbmdpbmUud29ybGQsXG4gICAgICAgICAgICB0aW1pbmcgPSBlbmdpbmUudGltaW5nLFxuICAgICAgICAgICAgYnJvYWRwaGFzZSA9IGVuZ2luZS5icm9hZHBoYXNlLFxuICAgICAgICAgICAgYnJvYWRwaGFzZVBhaXJzID0gW10sXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIC8vIGluY3JlbWVudCB0aW1lc3RhbXBcbiAgICAgICAgdGltaW5nLnRpbWVzdGFtcCArPSBkZWx0YSAqIHRpbWluZy50aW1lU2NhbGU7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFuIGV2ZW50IG9iamVjdFxuICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWluZy50aW1lc3RhbXBcbiAgICAgICAgfTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdiZWZvcmVVcGRhdGUnLCBldmVudCk7XG5cbiAgICAgICAgLy8gZ2V0IGxpc3RzIG9mIGFsbCBib2RpZXMgYW5kIGNvbnN0cmFpbnRzLCBubyBtYXR0ZXIgd2hhdCBjb21wb3NpdGVzIHRoZXkgYXJlIGluXG4gICAgICAgIHZhciBhbGxCb2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKHdvcmxkKSxcbiAgICAgICAgICAgIGFsbENvbnN0cmFpbnRzID0gQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzKHdvcmxkKTtcblxuICAgICAgICAvLyBAaWYgREVCVUdcbiAgICAgICAgLy8gcmVzZXQgbWV0cmljcyBsb2dnaW5nXG4gICAgICAgIE1ldHJpY3MucmVzZXQoZW5naW5lLm1ldHJpY3MpO1xuICAgICAgICAvLyBAZW5kaWZcblxuICAgICAgICAvLyBpZiBzbGVlcGluZyBlbmFibGVkLCBjYWxsIHRoZSBzbGVlcGluZyBjb250cm9sbGVyXG4gICAgICAgIGlmIChlbmdpbmUuZW5hYmxlU2xlZXBpbmcpXG4gICAgICAgICAgICBTbGVlcGluZy51cGRhdGUoYWxsQm9kaWVzLCB0aW1pbmcudGltZVNjYWxlKTtcblxuICAgICAgICAvLyBhcHBsaWVzIGdyYXZpdHkgdG8gYWxsIGJvZGllc1xuICAgICAgICBfYm9kaWVzQXBwbHlHcmF2aXR5KGFsbEJvZGllcywgd29ybGQuZ3Jhdml0eSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGFsbCBib2R5IHBvc2l0aW9uIGFuZCByb3RhdGlvbiBieSBpbnRlZ3JhdGlvblxuICAgICAgICBfYm9kaWVzVXBkYXRlKGFsbEJvZGllcywgZGVsdGEsIHRpbWluZy50aW1lU2NhbGUsIGNvcnJlY3Rpb24sIHdvcmxkLmJvdW5kcyk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGFsbCBjb25zdHJhaW50c1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZW5naW5lLmNvbnN0cmFpbnRJdGVyYXRpb25zOyBpKyspIHtcbiAgICAgICAgICAgIENvbnN0cmFpbnQuc29sdmVBbGwoYWxsQ29uc3RyYWludHMsIHRpbWluZy50aW1lU2NhbGUpO1xuICAgICAgICB9XG4gICAgICAgIENvbnN0cmFpbnQucG9zdFNvbHZlQWxsKGFsbEJvZGllcyk7XG5cbiAgICAgICAgLy8gYnJvYWRwaGFzZSBwYXNzOiBmaW5kIHBvdGVudGlhbCBjb2xsaXNpb24gcGFpcnNcbiAgICAgICAgaWYgKGJyb2FkcGhhc2UuY29udHJvbGxlcikge1xuXG4gICAgICAgICAgICAvLyBpZiB3b3JsZCBpcyBkaXJ0eSwgd2UgbXVzdCBmbHVzaCB0aGUgd2hvbGUgZ3JpZFxuICAgICAgICAgICAgaWYgKHdvcmxkLmlzTW9kaWZpZWQpXG4gICAgICAgICAgICAgICAgYnJvYWRwaGFzZS5jb250cm9sbGVyLmNsZWFyKGJyb2FkcGhhc2UpO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGdyaWQgYnVja2V0cyBiYXNlZCBvbiBjdXJyZW50IGJvZGllc1xuICAgICAgICAgICAgYnJvYWRwaGFzZS5jb250cm9sbGVyLnVwZGF0ZShicm9hZHBoYXNlLCBhbGxCb2RpZXMsIGVuZ2luZSwgd29ybGQuaXNNb2RpZmllZCk7XG4gICAgICAgICAgICBicm9hZHBoYXNlUGFpcnMgPSBicm9hZHBoYXNlLnBhaXJzTGlzdDtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgLy8gaWYgbm8gYnJvYWRwaGFzZSBzZXQsIHdlIGp1c3QgcGFzcyBhbGwgYm9kaWVzXG4gICAgICAgICAgICBicm9hZHBoYXNlUGFpcnMgPSBhbGxCb2RpZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjbGVhciBhbGwgY29tcG9zaXRlIG1vZGlmaWVkIGZsYWdzXG4gICAgICAgIGlmICh3b3JsZC5pc01vZGlmaWVkKSB7XG4gICAgICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQod29ybGQsIGZhbHNlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBuYXJyb3dwaGFzZSBwYXNzOiBmaW5kIGFjdHVhbCBjb2xsaXNpb25zLCB0aGVuIGNyZWF0ZSBvciB1cGRhdGUgY29sbGlzaW9uIHBhaXJzXG4gICAgICAgIHZhciBjb2xsaXNpb25zID0gYnJvYWRwaGFzZS5kZXRlY3Rvcihicm9hZHBoYXNlUGFpcnMsIGVuZ2luZSk7XG5cbiAgICAgICAgLy8gdXBkYXRlIGNvbGxpc2lvbiBwYWlyc1xuICAgICAgICB2YXIgcGFpcnMgPSBlbmdpbmUucGFpcnMsXG4gICAgICAgICAgICB0aW1lc3RhbXAgPSB0aW1pbmcudGltZXN0YW1wO1xuICAgICAgICBQYWlycy51cGRhdGUocGFpcnMsIGNvbGxpc2lvbnMsIHRpbWVzdGFtcCk7XG4gICAgICAgIFBhaXJzLnJlbW92ZU9sZChwYWlycywgdGltZXN0YW1wKTtcblxuICAgICAgICAvLyB3YWtlIHVwIGJvZGllcyBpbnZvbHZlZCBpbiBjb2xsaXNpb25zXG4gICAgICAgIGlmIChlbmdpbmUuZW5hYmxlU2xlZXBpbmcpXG4gICAgICAgICAgICBTbGVlcGluZy5hZnRlckNvbGxpc2lvbnMocGFpcnMubGlzdCwgdGltaW5nLnRpbWVTY2FsZSk7XG5cbiAgICAgICAgLy8gdHJpZ2dlciBjb2xsaXNpb24gZXZlbnRzXG4gICAgICAgIGlmIChwYWlycy5jb2xsaXNpb25TdGFydC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnY29sbGlzaW9uU3RhcnQnLCB7IHBhaXJzOiBwYWlycy5jb2xsaXNpb25TdGFydCB9KTtcblxuICAgICAgICAvLyBpdGVyYXRpdmVseSByZXNvbHZlIHBvc2l0aW9uIGJldHdlZW4gY29sbGlzaW9uc1xuICAgICAgICBSZXNvbHZlci5wcmVTb2x2ZVBvc2l0aW9uKHBhaXJzLmxpc3QpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZW5naW5lLnBvc2l0aW9uSXRlcmF0aW9uczsgaSsrKSB7XG4gICAgICAgICAgICBSZXNvbHZlci5zb2x2ZVBvc2l0aW9uKHBhaXJzLmxpc3QsIHRpbWluZy50aW1lU2NhbGUpO1xuICAgICAgICB9XG4gICAgICAgIFJlc29sdmVyLnBvc3RTb2x2ZVBvc2l0aW9uKGFsbEJvZGllcyk7XG5cbiAgICAgICAgLy8gaXRlcmF0aXZlbHkgcmVzb2x2ZSB2ZWxvY2l0eSBiZXR3ZWVuIGNvbGxpc2lvbnNcbiAgICAgICAgUmVzb2x2ZXIucHJlU29sdmVWZWxvY2l0eShwYWlycy5saXN0KTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGVuZ2luZS52ZWxvY2l0eUl0ZXJhdGlvbnM7IGkrKykge1xuICAgICAgICAgICAgUmVzb2x2ZXIuc29sdmVWZWxvY2l0eShwYWlycy5saXN0LCB0aW1pbmcudGltZVNjYWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHRyaWdnZXIgY29sbGlzaW9uIGV2ZW50c1xuICAgICAgICBpZiAocGFpcnMuY29sbGlzaW9uQWN0aXZlLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdjb2xsaXNpb25BY3RpdmUnLCB7IHBhaXJzOiBwYWlycy5jb2xsaXNpb25BY3RpdmUgfSk7XG5cbiAgICAgICAgaWYgKHBhaXJzLmNvbGxpc2lvbkVuZC5sZW5ndGggPiAwKVxuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnY29sbGlzaW9uRW5kJywgeyBwYWlyczogcGFpcnMuY29sbGlzaW9uRW5kIH0pO1xuXG4gICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICAvLyB1cGRhdGUgbWV0cmljcyBsb2dcbiAgICAgICAgTWV0cmljcy51cGRhdGUoZW5naW5lLm1ldHJpY3MsIGVuZ2luZSk7XG4gICAgICAgIC8vIEBlbmRpZlxuXG4gICAgICAgIC8vIGNsZWFyIGZvcmNlIGJ1ZmZlcnNcbiAgICAgICAgX2JvZGllc0NsZWFyRm9yY2VzKGFsbEJvZGllcyk7XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnYWZ0ZXJVcGRhdGUnLCBldmVudCk7XG5cbiAgICAgICAgcmV0dXJuIGVuZ2luZTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIE1lcmdlcyB0d28gZW5naW5lcyBieSBrZWVwaW5nIHRoZSBjb25maWd1cmF0aW9uIG9mIGBlbmdpbmVBYCBidXQgcmVwbGFjaW5nIHRoZSB3b3JsZCB3aXRoIHRoZSBvbmUgZnJvbSBgZW5naW5lQmAuXG4gICAgICogQG1ldGhvZCBtZXJnZVxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVBXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZUJcbiAgICAgKi9cbiAgICBFbmdpbmUubWVyZ2UgPSBmdW5jdGlvbihlbmdpbmVBLCBlbmdpbmVCKSB7XG4gICAgICAgIENvbW1vbi5leHRlbmQoZW5naW5lQSwgZW5naW5lQik7XG4gICAgICAgIFxuICAgICAgICBpZiAoZW5naW5lQi53b3JsZCkge1xuICAgICAgICAgICAgZW5naW5lQS53b3JsZCA9IGVuZ2luZUIud29ybGQ7XG5cbiAgICAgICAgICAgIEVuZ2luZS5jbGVhcihlbmdpbmVBKTtcblxuICAgICAgICAgICAgdmFyIGJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMoZW5naW5lQS53b3JsZCk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG4gICAgICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBib2R5LmlkID0gQ29tbW9uLm5leHRJZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgZW5naW5lIGluY2x1ZGluZyB0aGUgd29ybGQsIHBhaXJzIGFuZCBicm9hZHBoYXNlLlxuICAgICAqIEBtZXRob2QgY2xlYXJcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG4gICAgRW5naW5lLmNsZWFyID0gZnVuY3Rpb24oZW5naW5lKSB7XG4gICAgICAgIHZhciB3b3JsZCA9IGVuZ2luZS53b3JsZDtcbiAgICAgICAgXG4gICAgICAgIFBhaXJzLmNsZWFyKGVuZ2luZS5wYWlycyk7XG5cbiAgICAgICAgdmFyIGJyb2FkcGhhc2UgPSBlbmdpbmUuYnJvYWRwaGFzZTtcbiAgICAgICAgaWYgKGJyb2FkcGhhc2UuY29udHJvbGxlcikge1xuICAgICAgICAgICAgdmFyIGJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMod29ybGQpO1xuICAgICAgICAgICAgYnJvYWRwaGFzZS5jb250cm9sbGVyLmNsZWFyKGJyb2FkcGhhc2UpO1xuICAgICAgICAgICAgYnJvYWRwaGFzZS5jb250cm9sbGVyLnVwZGF0ZShicm9hZHBoYXNlLCBib2RpZXMsIGVuZ2luZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogWmVyb2VzIHRoZSBgYm9keS5mb3JjZWAgYW5kIGBib2R5LnRvcnF1ZWAgZm9yY2UgYnVmZmVycy5cbiAgICAgKiBAbWV0aG9kIGJvZGllc0NsZWFyRm9yY2VzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICovXG4gICAgdmFyIF9ib2RpZXNDbGVhckZvcmNlcyA9IGZ1bmN0aW9uKGJvZGllcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIC8vIHJlc2V0IGZvcmNlIGJ1ZmZlcnNcbiAgICAgICAgICAgIGJvZHkuZm9yY2UueCA9IDA7XG4gICAgICAgICAgICBib2R5LmZvcmNlLnkgPSAwO1xuICAgICAgICAgICAgYm9keS50b3JxdWUgPSAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGx5cyBhIG1hc3MgZGVwZW5kYW50IGZvcmNlIHRvIGFsbCBnaXZlbiBib2RpZXMuXG4gICAgICogQG1ldGhvZCBib2RpZXNBcHBseUdyYXZpdHlcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gZ3Jhdml0eVxuICAgICAqL1xuICAgIHZhciBfYm9kaWVzQXBwbHlHcmF2aXR5ID0gZnVuY3Rpb24oYm9kaWVzLCBncmF2aXR5KSB7XG4gICAgICAgIHZhciBncmF2aXR5U2NhbGUgPSB0eXBlb2YgZ3Jhdml0eS5zY2FsZSAhPT0gJ3VuZGVmaW5lZCcgPyBncmF2aXR5LnNjYWxlIDogMC4wMDE7XG5cbiAgICAgICAgaWYgKChncmF2aXR5LnggPT09IDAgJiYgZ3Jhdml0eS55ID09PSAwKSB8fCBncmF2aXR5U2NhbGUgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoYm9keS5pc1N0YXRpYyB8fCBib2R5LmlzU2xlZXBpbmcpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGFwcGx5IGdyYXZpdHlcbiAgICAgICAgICAgIGJvZHkuZm9yY2UueSArPSBib2R5Lm1hc3MgKiBncmF2aXR5LnkgKiBncmF2aXR5U2NhbGU7XG4gICAgICAgICAgICBib2R5LmZvcmNlLnggKz0gYm9keS5tYXNzICogZ3Jhdml0eS54ICogZ3Jhdml0eVNjYWxlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGx5cyBgQm9keS51cGRhdGVgIHRvIGFsbCBnaXZlbiBgYm9kaWVzYC5cbiAgICAgKiBAbWV0aG9kIHVwZGF0ZUFsbFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWx0YVRpbWUgXG4gICAgICogVGhlIGFtb3VudCBvZiB0aW1lIGVsYXBzZWQgYmV0d2VlbiB1cGRhdGVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb3JyZWN0aW9uIFxuICAgICAqIFRoZSBWZXJsZXQgY29ycmVjdGlvbiBmYWN0b3IgKGRlbHRhVGltZSAvIGxhc3REZWx0YVRpbWUpXG4gICAgICogQHBhcmFtIHtib3VuZHN9IHdvcmxkQm91bmRzXG4gICAgICovXG4gICAgdmFyIF9ib2RpZXNVcGRhdGUgPSBmdW5jdGlvbihib2RpZXMsIGRlbHRhVGltZSwgdGltZVNjYWxlLCBjb3JyZWN0aW9uLCB3b3JsZEJvdW5kcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmIChib2R5LmlzU3RhdGljIHx8IGJvZHkuaXNTbGVlcGluZylcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgQm9keS51cGRhdGUoYm9keSwgZGVsdGFUaW1lLCB0aW1lU2NhbGUsIGNvcnJlY3Rpb24pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFuIGFsaWFzIGZvciBgUnVubmVyLnJ1bmAsIHNlZSBgTWF0dGVyLlJ1bm5lcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICogQG1ldGhvZCBydW5cbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGp1c3QgYmVmb3JlIGFuIHVwZGF0ZVxuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVVcGRhdGVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIGVuZ2luZSB1cGRhdGUgYW5kIGFsbCBjb2xsaXNpb24gZXZlbnRzXG4gICAgKlxuICAgICogQGV2ZW50IGFmdGVyVXBkYXRlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhZnRlciBlbmdpbmUgdXBkYXRlLCBwcm92aWRlcyBhIGxpc3Qgb2YgYWxsIHBhaXJzIHRoYXQgaGF2ZSBzdGFydGVkIHRvIGNvbGxpZGUgaW4gdGhlIGN1cnJlbnQgdGljayAoaWYgYW55KVxuICAgICpcbiAgICAqIEBldmVudCBjb2xsaXNpb25TdGFydFxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnBhaXJzIExpc3Qgb2YgYWZmZWN0ZWQgcGFpcnNcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIGVuZ2luZSB1cGRhdGUsIHByb3ZpZGVzIGEgbGlzdCBvZiBhbGwgcGFpcnMgdGhhdCBhcmUgY29sbGlkaW5nIGluIHRoZSBjdXJyZW50IHRpY2sgKGlmIGFueSlcbiAgICAqXG4gICAgKiBAZXZlbnQgY29sbGlzaW9uQWN0aXZlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQucGFpcnMgTGlzdCBvZiBhZmZlY3RlZCBwYWlyc1xuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYWZ0ZXIgZW5naW5lIHVwZGF0ZSwgcHJvdmlkZXMgYSBsaXN0IG9mIGFsbCBwYWlycyB0aGF0IGhhdmUgZW5kZWQgY29sbGlzaW9uIGluIHRoZSBjdXJyZW50IHRpY2sgKGlmIGFueSlcbiAgICAqXG4gICAgKiBAZXZlbnQgY29sbGlzaW9uRW5kXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQucGFpcnMgTGlzdCBvZiBhZmZlY3RlZCBwYWlyc1xuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qXG4gICAgKlxuICAgICogIFByb3BlcnRpZXMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW50ZWdlciBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgbnVtYmVyIG9mIHBvc2l0aW9uIGl0ZXJhdGlvbnMgdG8gcGVyZm9ybSBlYWNoIHVwZGF0ZS5cbiAgICAgKiBUaGUgaGlnaGVyIHRoZSB2YWx1ZSwgdGhlIGhpZ2hlciBxdWFsaXR5IHRoZSBzaW11bGF0aW9uIHdpbGwgYmUgYXQgdGhlIGV4cGVuc2Ugb2YgcGVyZm9ybWFuY2UuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcG9zaXRpb25JdGVyYXRpb25zXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgNlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW50ZWdlciBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgbnVtYmVyIG9mIHZlbG9jaXR5IGl0ZXJhdGlvbnMgdG8gcGVyZm9ybSBlYWNoIHVwZGF0ZS5cbiAgICAgKiBUaGUgaGlnaGVyIHRoZSB2YWx1ZSwgdGhlIGhpZ2hlciBxdWFsaXR5IHRoZSBzaW11bGF0aW9uIHdpbGwgYmUgYXQgdGhlIGV4cGVuc2Ugb2YgcGVyZm9ybWFuY2UuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdmVsb2NpdHlJdGVyYXRpb25zXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgNFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW50ZWdlciBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgbnVtYmVyIG9mIGNvbnN0cmFpbnQgaXRlcmF0aW9ucyB0byBwZXJmb3JtIGVhY2ggdXBkYXRlLlxuICAgICAqIFRoZSBoaWdoZXIgdGhlIHZhbHVlLCB0aGUgaGlnaGVyIHF1YWxpdHkgdGhlIHNpbXVsYXRpb24gd2lsbCBiZSBhdCB0aGUgZXhwZW5zZSBvZiBwZXJmb3JtYW5jZS5cbiAgICAgKiBUaGUgZGVmYXVsdCB2YWx1ZSBvZiBgMmAgaXMgdXN1YWxseSB2ZXJ5IGFkZXF1YXRlLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbnN0cmFpbnRJdGVyYXRpb25zXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgc3BlY2lmaWVzIHdoZXRoZXIgdGhlIGVuZ2luZSBzaG91bGQgYWxsb3cgc2xlZXBpbmcgdmlhIHRoZSBgTWF0dGVyLlNsZWVwaW5nYCBtb2R1bGUuXG4gICAgICogU2xlZXBpbmcgY2FuIGltcHJvdmUgc3RhYmlsaXR5IGFuZCBwZXJmb3JtYW5jZSwgYnV0IG9mdGVuIGF0IHRoZSBleHBlbnNlIG9mIGFjY3VyYWN5LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGVuYWJsZVNsZWVwaW5nXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBgT2JqZWN0YCBjb250YWluaW5nIHByb3BlcnRpZXMgcmVnYXJkaW5nIHRoZSB0aW1pbmcgc3lzdGVtcyBvZiB0aGUgZW5naW5lLiBcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0aW1pbmdcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgdGhlIGdsb2JhbCBzY2FsaW5nIGZhY3RvciBvZiB0aW1lIGZvciBhbGwgYm9kaWVzLlxuICAgICAqIEEgdmFsdWUgb2YgYDBgIGZyZWV6ZXMgdGhlIHNpbXVsYXRpb24uXG4gICAgICogQSB2YWx1ZSBvZiBgMC4xYCBnaXZlcyBhIHNsb3ctbW90aW9uIGVmZmVjdC5cbiAgICAgKiBBIHZhbHVlIG9mIGAxLjJgIGdpdmVzIGEgc3BlZWQtdXAgZWZmZWN0LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHRpbWluZy50aW1lU2NhbGVcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAxXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSBjdXJyZW50IHNpbXVsYXRpb24tdGltZSBpbiBtaWxsaXNlY29uZHMgc3RhcnRpbmcgZnJvbSBgMGAuIFxuICAgICAqIEl0IGlzIGluY3JlbWVudGVkIG9uIGV2ZXJ5IGBFbmdpbmUudXBkYXRlYCBieSB0aGUgZ2l2ZW4gYGRlbHRhYCBhcmd1bWVudC4gXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdGltaW5nLnRpbWVzdGFtcFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGluc3RhbmNlIG9mIGEgYFJlbmRlcmAgY29udHJvbGxlci4gVGhlIGRlZmF1bHQgdmFsdWUgaXMgYSBgTWF0dGVyLlJlbmRlcmAgaW5zdGFuY2UgY3JlYXRlZCBieSBgRW5naW5lLmNyZWF0ZWAuXG4gICAgICogT25lIG1heSBhbHNvIGRldmVsb3AgYSBjdXN0b20gcmVuZGVyZXIgbW9kdWxlIGJhc2VkIG9uIGBNYXR0ZXIuUmVuZGVyYCBhbmQgcGFzcyBhbiBpbnN0YW5jZSBvZiBpdCB0byBgRW5naW5lLmNyZWF0ZWAgdmlhIGBvcHRpb25zLnJlbmRlcmAuXG4gICAgICpcbiAgICAgKiBBIG1pbmltYWwgY3VzdG9tIHJlbmRlcmVyIG9iamVjdCBtdXN0IGRlZmluZSBhdCBsZWFzdCB0aHJlZSBmdW5jdGlvbnM6IGBjcmVhdGVgLCBgY2xlYXJgIGFuZCBgd29ybGRgIChzZWUgYE1hdHRlci5SZW5kZXJgKS5cbiAgICAgKiBJdCBpcyBhbHNvIHBvc3NpYmxlIHRvIGluc3RlYWQgcGFzcyB0aGUgX21vZHVsZV8gcmVmZXJlbmNlIHZpYSBgb3B0aW9ucy5yZW5kZXIuY29udHJvbGxlcmAgYW5kIGBFbmdpbmUuY3JlYXRlYCB3aWxsIGluc3RhbnRpYXRlIG9uZSBmb3IgeW91LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlclxuICAgICAqIEB0eXBlIHJlbmRlclxuICAgICAqIEBkZXByZWNhdGVkIHNlZSBEZW1vLmpzIGZvciBhbiBleGFtcGxlIG9mIGNyZWF0aW5nIGEgcmVuZGVyZXJcbiAgICAgKiBAZGVmYXVsdCBhIE1hdHRlci5SZW5kZXIgaW5zdGFuY2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGluc3RhbmNlIG9mIGEgYnJvYWRwaGFzZSBjb250cm9sbGVyLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBhIGBNYXR0ZXIuR3JpZGAgaW5zdGFuY2UgY3JlYXRlZCBieSBgRW5naW5lLmNyZWF0ZWAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYnJvYWRwaGFzZVxuICAgICAqIEB0eXBlIGdyaWRcbiAgICAgKiBAZGVmYXVsdCBhIE1hdHRlci5HcmlkIGluc3RhbmNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBXb3JsZGAgY29tcG9zaXRlIG9iamVjdCB0aGF0IHdpbGwgY29udGFpbiBhbGwgc2ltdWxhdGVkIGJvZGllcyBhbmQgY29uc3RyYWludHMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgd29ybGRcbiAgICAgKiBAdHlwZSB3b3JsZFxuICAgICAqIEBkZWZhdWx0IGEgTWF0dGVyLldvcmxkIGluc3RhbmNlXG4gICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuRXZlbnRzYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyB0byBmaXJlIGFuZCBsaXN0ZW4gdG8gZXZlbnRzIG9uIG90aGVyIG9iamVjdHMuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBFdmVudHNcbiovXG5cbnZhciBFdmVudHMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG5cbnZhciBDb21tb24gPSByZXF1aXJlKCcuL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gdGhlIGdpdmVuIG9iamVjdCdzIGBldmVudE5hbWVgLlxuICAgICAqIEBtZXRob2Qgb25cbiAgICAgKiBAcGFyYW0ge30gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqL1xuICAgIEV2ZW50cy5vbiA9IGZ1bmN0aW9uKG9iamVjdCwgZXZlbnROYW1lcywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5hbWVzID0gZXZlbnROYW1lcy5zcGxpdCgnICcpLFxuICAgICAgICAgICAgbmFtZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgICAgICBvYmplY3QuZXZlbnRzID0gb2JqZWN0LmV2ZW50cyB8fCB7fTtcbiAgICAgICAgICAgIG9iamVjdC5ldmVudHNbbmFtZV0gPSBvYmplY3QuZXZlbnRzW25hbWVdIHx8IFtdO1xuICAgICAgICAgICAgb2JqZWN0LmV2ZW50c1tuYW1lXS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjYWxsYmFjaztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyB0aGUgZ2l2ZW4gZXZlbnQgY2FsbGJhY2suIElmIG5vIGNhbGxiYWNrLCBjbGVhcnMgYWxsIGNhbGxiYWNrcyBpbiBgZXZlbnROYW1lc2AuIElmIG5vIGBldmVudE5hbWVzYCwgY2xlYXJzIGFsbCBldmVudHMuXG4gICAgICogQG1ldGhvZCBvZmZcbiAgICAgKiBAcGFyYW0ge30gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqL1xuICAgIEV2ZW50cy5vZmYgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50TmFtZXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghZXZlbnROYW1lcykge1xuICAgICAgICAgICAgb2JqZWN0LmV2ZW50cyA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIEV2ZW50cy5vZmYob2JqZWN0LCBjYWxsYmFjaylcbiAgICAgICAgaWYgKHR5cGVvZiBldmVudE5hbWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGV2ZW50TmFtZXM7XG4gICAgICAgICAgICBldmVudE5hbWVzID0gQ29tbW9uLmtleXMob2JqZWN0LmV2ZW50cykuam9pbignICcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5hbWVzID0gZXZlbnROYW1lcy5zcGxpdCgnICcpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSBvYmplY3QuZXZlbnRzW25hbWVzW2ldXSxcbiAgICAgICAgICAgICAgICBuZXdDYWxsYmFja3MgPSBbXTtcblxuICAgICAgICAgICAgaWYgKGNhbGxiYWNrICYmIGNhbGxiYWNrcykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgY2FsbGJhY2tzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja3Nbal0gIT09IGNhbGxiYWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q2FsbGJhY2tzLnB1c2goY2FsbGJhY2tzW2pdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9iamVjdC5ldmVudHNbbmFtZXNbaV1dID0gbmV3Q2FsbGJhY2tzO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIGFsbCB0aGUgY2FsbGJhY2tzIHN1YnNjcmliZWQgdG8gdGhlIGdpdmVuIG9iamVjdCdzIGBldmVudE5hbWVgLCBpbiB0aGUgb3JkZXIgdGhleSBzdWJzY3JpYmVkLCBpZiBhbnkuXG4gICAgICogQG1ldGhvZCB0cmlnZ2VyXG4gICAgICogQHBhcmFtIHt9IG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudE5hbWVzXG4gICAgICogQHBhcmFtIHt9IGV2ZW50XG4gICAgICovXG4gICAgRXZlbnRzLnRyaWdnZXIgPSBmdW5jdGlvbihvYmplY3QsIGV2ZW50TmFtZXMsIGV2ZW50KSB7XG4gICAgICAgIHZhciBuYW1lcyxcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBjYWxsYmFja3MsXG4gICAgICAgICAgICBldmVudENsb25lO1xuXG4gICAgICAgIGlmIChvYmplY3QuZXZlbnRzKSB7XG4gICAgICAgICAgICBpZiAoIWV2ZW50KVxuICAgICAgICAgICAgICAgIGV2ZW50ID0ge307XG5cbiAgICAgICAgICAgIG5hbWVzID0gZXZlbnROYW1lcy5zcGxpdCgnICcpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrcyA9IG9iamVjdC5ldmVudHNbbmFtZV07XG5cbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50Q2xvbmUgPSBDb21tb24uY2xvbmUoZXZlbnQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRDbG9uZS5uYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRDbG9uZS5zb3VyY2UgPSBvYmplY3Q7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjYWxsYmFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tqXS5hcHBseShvYmplY3QsIFtldmVudENsb25lXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuIiwiLy8gQGlmIERFQlVHXG4vKipcbiogX0ludGVybmFsIENsYXNzXywgbm90IGdlbmVyYWxseSB1c2VkIG91dHNpZGUgb2YgdGhlIGVuZ2luZSdzIGludGVybmFscy5cbipcbiovXG5cbnZhciBNZXRyaWNzID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gTWV0cmljcztcblxudmFyIENvbXBvc2l0ZSA9IHJlcXVpcmUoJy4uL2JvZHkvQ29tcG9zaXRlJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBtZXRyaWNzLlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJuIHttZXRyaWNzfSBBIG5ldyBtZXRyaWNzXG4gICAgICovXG4gICAgTWV0cmljcy5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGV4dGVuZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIG5hcnJvd0RldGVjdGlvbnM6IDAsXG4gICAgICAgICAgICBuYXJyb3dwaGFzZVRlc3RzOiAwLFxuICAgICAgICAgICAgbmFycm93UmV1c2U6IDAsXG4gICAgICAgICAgICBuYXJyb3dSZXVzZUNvdW50OiAwLFxuICAgICAgICAgICAgbWlkcGhhc2VUZXN0czogMCxcbiAgICAgICAgICAgIGJyb2FkcGhhc2VUZXN0czogMCxcbiAgICAgICAgICAgIG5hcnJvd0VmZjogMC4wMDAxLFxuICAgICAgICAgICAgbWlkRWZmOiAwLjAwMDEsXG4gICAgICAgICAgICBicm9hZEVmZjogMC4wMDAxLFxuICAgICAgICAgICAgY29sbGlzaW9uczogMCxcbiAgICAgICAgICAgIGJ1Y2tldHM6IDAsXG4gICAgICAgICAgICBib2RpZXM6IDAsXG4gICAgICAgICAgICBwYWlyczogMFxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBmYWxzZSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlc2V0cyBtZXRyaWNzLlxuICAgICAqIEBtZXRob2QgcmVzZXRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7bWV0cmljc30gbWV0cmljc1xuICAgICAqL1xuICAgIE1ldHJpY3MucmVzZXQgPSBmdW5jdGlvbihtZXRyaWNzKSB7XG4gICAgICAgIGlmIChtZXRyaWNzLmV4dGVuZGVkKSB7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd0RldGVjdGlvbnMgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5uYXJyb3dwaGFzZVRlc3RzID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MubmFycm93UmV1c2UgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5uYXJyb3dSZXVzZUNvdW50ID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MubWlkcGhhc2VUZXN0cyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLmJyb2FkcGhhc2VUZXN0cyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd0VmZiA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLm1pZEVmZiA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLmJyb2FkRWZmID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MuY29sbGlzaW9ucyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLmJ1Y2tldHMgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5wYWlycyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLmJvZGllcyA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBtZXRyaWNzLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge21ldHJpY3N9IG1ldHJpY3NcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG4gICAgTWV0cmljcy51cGRhdGUgPSBmdW5jdGlvbihtZXRyaWNzLCBlbmdpbmUpIHtcbiAgICAgICAgaWYgKG1ldHJpY3MuZXh0ZW5kZWQpIHtcbiAgICAgICAgICAgIHZhciB3b3JsZCA9IGVuZ2luZS53b3JsZCxcbiAgICAgICAgICAgICAgICBib2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKHdvcmxkKTtcblxuICAgICAgICAgICAgbWV0cmljcy5jb2xsaXNpb25zID0gbWV0cmljcy5uYXJyb3dEZXRlY3Rpb25zO1xuICAgICAgICAgICAgbWV0cmljcy5wYWlycyA9IGVuZ2luZS5wYWlycy5saXN0Lmxlbmd0aDtcbiAgICAgICAgICAgIG1ldHJpY3MuYm9kaWVzID0gYm9kaWVzLmxlbmd0aDtcbiAgICAgICAgICAgIG1ldHJpY3MubWlkRWZmID0gKG1ldHJpY3MubmFycm93RGV0ZWN0aW9ucyAvIChtZXRyaWNzLm1pZHBoYXNlVGVzdHMgfHwgMSkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd0VmZiA9IChtZXRyaWNzLm5hcnJvd0RldGVjdGlvbnMgLyAobWV0cmljcy5uYXJyb3dwaGFzZVRlc3RzIHx8IDEpKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbWV0cmljcy5icm9hZEVmZiA9ICgxIC0gKG1ldHJpY3MuYnJvYWRwaGFzZVRlc3RzIC8gKGJvZGllcy5sZW5ndGggfHwgMSkpKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgbWV0cmljcy5uYXJyb3dSZXVzZSA9IChtZXRyaWNzLm5hcnJvd1JldXNlQ291bnQgLyAobWV0cmljcy5uYXJyb3dwaGFzZVRlc3RzIHx8IDEpKS50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgLy92YXIgYnJvYWRwaGFzZSA9IGVuZ2luZS5icm9hZHBoYXNlW2VuZ2luZS5icm9hZHBoYXNlLmN1cnJlbnRdO1xuICAgICAgICAgICAgLy9pZiAoYnJvYWRwaGFzZS5pbnN0YW5jZSlcbiAgICAgICAgICAgIC8vICAgIG1ldHJpY3MuYnVja2V0cyA9IENvbW1vbi5rZXlzKGJyb2FkcGhhc2UuaW5zdGFuY2UuYnVja2V0cykubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfTtcblxufSkoKTtcbi8vIEBlbmRpZlxuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLk1vdXNlYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBtb3VzZSBpbnB1dHMuXG4qXG4qIEBjbGFzcyBNb3VzZVxuKi9cblxudmFyIE1vdXNlID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2U7XG5cbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbW91c2UgaW5wdXQuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50XG4gICAgICogQHJldHVybiB7bW91c2V9IEEgbmV3IG1vdXNlXG4gICAgICovXG4gICAgTW91c2UuY3JlYXRlID0gZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgICB2YXIgbW91c2UgPSB7fTtcblxuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIENvbW1vbi5sb2coJ01vdXNlLmNyZWF0ZTogZWxlbWVudCB3YXMgdW5kZWZpbmVkLCBkZWZhdWx0aW5nIHRvIGRvY3VtZW50LmJvZHknLCAnd2FybicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtb3VzZS5lbGVtZW50ID0gZWxlbWVudCB8fCBkb2N1bWVudC5ib2R5O1xuICAgICAgICBtb3VzZS5hYnNvbHV0ZSA9IHsgeDogMCwgeTogMCB9O1xuICAgICAgICBtb3VzZS5wb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xuICAgICAgICBtb3VzZS5tb3VzZWRvd25Qb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xuICAgICAgICBtb3VzZS5tb3VzZXVwUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgbW91c2Uub2Zmc2V0ID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgIG1vdXNlLnNjYWxlID0geyB4OiAxLCB5OiAxIH07XG4gICAgICAgIG1vdXNlLndoZWVsRGVsdGEgPSAwO1xuICAgICAgICBtb3VzZS5idXR0b24gPSAtMTtcbiAgICAgICAgbW91c2UucGl4ZWxSYXRpbyA9IG1vdXNlLmVsZW1lbnQuZ2V0QXR0cmlidXRlKCdkYXRhLXBpeGVsLXJhdGlvJykgfHwgMTtcblxuICAgICAgICBtb3VzZS5zb3VyY2VFdmVudHMgPSB7XG4gICAgICAgICAgICBtb3VzZW1vdmU6IG51bGwsXG4gICAgICAgICAgICBtb3VzZWRvd246IG51bGwsXG4gICAgICAgICAgICBtb3VzZXVwOiBudWxsLFxuICAgICAgICAgICAgbW91c2V3aGVlbDogbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbW91c2UubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZlbnQpIHsgXG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBfZ2V0UmVsYXRpdmVNb3VzZVBvc2l0aW9uKGV2ZW50LCBtb3VzZS5lbGVtZW50LCBtb3VzZS5waXhlbFJhdGlvKSxcbiAgICAgICAgICAgICAgICB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXM7XG5cbiAgICAgICAgICAgIGlmICh0b3VjaGVzKSB7XG4gICAgICAgICAgICAgICAgbW91c2UuYnV0dG9uID0gMDtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb3VzZS5hYnNvbHV0ZS54ID0gcG9zaXRpb24ueDtcbiAgICAgICAgICAgIG1vdXNlLmFic29sdXRlLnkgPSBwb3NpdGlvbi55O1xuICAgICAgICAgICAgbW91c2UucG9zaXRpb24ueCA9IG1vdXNlLmFic29sdXRlLnggKiBtb3VzZS5zY2FsZS54ICsgbW91c2Uub2Zmc2V0Lng7XG4gICAgICAgICAgICBtb3VzZS5wb3NpdGlvbi55ID0gbW91c2UuYWJzb2x1dGUueSAqIG1vdXNlLnNjYWxlLnkgKyBtb3VzZS5vZmZzZXQueTtcbiAgICAgICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZW1vdmUgPSBldmVudDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1vdXNlLm1vdXNlZG93biA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBfZ2V0UmVsYXRpdmVNb3VzZVBvc2l0aW9uKGV2ZW50LCBtb3VzZS5lbGVtZW50LCBtb3VzZS5waXhlbFJhdGlvKSxcbiAgICAgICAgICAgICAgICB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXM7XG5cbiAgICAgICAgICAgIGlmICh0b3VjaGVzKSB7XG4gICAgICAgICAgICAgICAgbW91c2UuYnV0dG9uID0gMDtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtb3VzZS5idXR0b24gPSBldmVudC5idXR0b247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vdXNlLmFic29sdXRlLnggPSBwb3NpdGlvbi54O1xuICAgICAgICAgICAgbW91c2UuYWJzb2x1dGUueSA9IHBvc2l0aW9uLnk7XG4gICAgICAgICAgICBtb3VzZS5wb3NpdGlvbi54ID0gbW91c2UuYWJzb2x1dGUueCAqIG1vdXNlLnNjYWxlLnggKyBtb3VzZS5vZmZzZXQueDtcbiAgICAgICAgICAgIG1vdXNlLnBvc2l0aW9uLnkgPSBtb3VzZS5hYnNvbHV0ZS55ICogbW91c2Uuc2NhbGUueSArIG1vdXNlLm9mZnNldC55O1xuICAgICAgICAgICAgbW91c2UubW91c2Vkb3duUG9zaXRpb24ueCA9IG1vdXNlLnBvc2l0aW9uLng7XG4gICAgICAgICAgICBtb3VzZS5tb3VzZWRvd25Qb3NpdGlvbi55ID0gbW91c2UucG9zaXRpb24ueTtcbiAgICAgICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZWRvd24gPSBldmVudDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1vdXNlLm1vdXNldXAgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdmFyIHBvc2l0aW9uID0gX2dldFJlbGF0aXZlTW91c2VQb3NpdGlvbihldmVudCwgbW91c2UuZWxlbWVudCwgbW91c2UucGl4ZWxSYXRpbyksXG4gICAgICAgICAgICAgICAgdG91Y2hlcyA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzO1xuXG4gICAgICAgICAgICBpZiAodG91Y2hlcykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG1vdXNlLmJ1dHRvbiA9IC0xO1xuICAgICAgICAgICAgbW91c2UuYWJzb2x1dGUueCA9IHBvc2l0aW9uLng7XG4gICAgICAgICAgICBtb3VzZS5hYnNvbHV0ZS55ID0gcG9zaXRpb24ueTtcbiAgICAgICAgICAgIG1vdXNlLnBvc2l0aW9uLnggPSBtb3VzZS5hYnNvbHV0ZS54ICogbW91c2Uuc2NhbGUueCArIG1vdXNlLm9mZnNldC54O1xuICAgICAgICAgICAgbW91c2UucG9zaXRpb24ueSA9IG1vdXNlLmFic29sdXRlLnkgKiBtb3VzZS5zY2FsZS55ICsgbW91c2Uub2Zmc2V0Lnk7XG4gICAgICAgICAgICBtb3VzZS5tb3VzZXVwUG9zaXRpb24ueCA9IG1vdXNlLnBvc2l0aW9uLng7XG4gICAgICAgICAgICBtb3VzZS5tb3VzZXVwUG9zaXRpb24ueSA9IG1vdXNlLnBvc2l0aW9uLnk7XG4gICAgICAgICAgICBtb3VzZS5zb3VyY2VFdmVudHMubW91c2V1cCA9IGV2ZW50O1xuICAgICAgICB9O1xuXG4gICAgICAgIG1vdXNlLm1vdXNld2hlZWwgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgbW91c2Uud2hlZWxEZWx0YSA9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCBldmVudC53aGVlbERlbHRhIHx8IC1ldmVudC5kZXRhaWwpKTtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgTW91c2Uuc2V0RWxlbWVudChtb3VzZSwgbW91c2UuZWxlbWVudCk7XG5cbiAgICAgICAgcmV0dXJuIG1vdXNlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBlbGVtZW50IHRoZSBtb3VzZSBpcyBib3VuZCB0byAoYW5kIHJlbGF0aXZlIHRvKS5cbiAgICAgKiBAbWV0aG9kIHNldEVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge21vdXNlfSBtb3VzZVxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnRcbiAgICAgKi9cbiAgICBNb3VzZS5zZXRFbGVtZW50ID0gZnVuY3Rpb24obW91c2UsIGVsZW1lbnQpIHtcbiAgICAgICAgbW91c2UuZWxlbWVudCA9IGVsZW1lbnQ7XG5cbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBtb3VzZS5tb3VzZW1vdmUpO1xuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIG1vdXNlLm1vdXNlZG93bik7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIG1vdXNlLm1vdXNldXApO1xuICAgICAgICBcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgbW91c2UubW91c2V3aGVlbCk7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NTW91c2VTY3JvbGwnLCBtb3VzZS5tb3VzZXdoZWVsKTtcblxuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG1vdXNlLm1vdXNlbW92ZSk7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIG1vdXNlLm1vdXNlZG93bik7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBtb3VzZS5tb3VzZXVwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGFsbCBjYXB0dXJlZCBzb3VyY2UgZXZlbnRzLlxuICAgICAqIEBtZXRob2QgY2xlYXJTb3VyY2VFdmVudHNcbiAgICAgKiBAcGFyYW0ge21vdXNlfSBtb3VzZVxuICAgICAqL1xuICAgIE1vdXNlLmNsZWFyU291cmNlRXZlbnRzID0gZnVuY3Rpb24obW91c2UpIHtcbiAgICAgICAgbW91c2Uuc291cmNlRXZlbnRzLm1vdXNlbW92ZSA9IG51bGw7XG4gICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZWRvd24gPSBudWxsO1xuICAgICAgICBtb3VzZS5zb3VyY2VFdmVudHMubW91c2V1cCA9IG51bGw7XG4gICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZXdoZWVsID0gbnVsbDtcbiAgICAgICAgbW91c2Uud2hlZWxEZWx0YSA9IDA7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIG1vdXNlIHBvc2l0aW9uIG9mZnNldC5cbiAgICAgKiBAbWV0aG9kIHNldE9mZnNldFxuICAgICAqIEBwYXJhbSB7bW91c2V9IG1vdXNlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IG9mZnNldFxuICAgICAqL1xuICAgIE1vdXNlLnNldE9mZnNldCA9IGZ1bmN0aW9uKG1vdXNlLCBvZmZzZXQpIHtcbiAgICAgICAgbW91c2Uub2Zmc2V0LnggPSBvZmZzZXQueDtcbiAgICAgICAgbW91c2Uub2Zmc2V0LnkgPSBvZmZzZXQueTtcbiAgICAgICAgbW91c2UucG9zaXRpb24ueCA9IG1vdXNlLmFic29sdXRlLnggKiBtb3VzZS5zY2FsZS54ICsgbW91c2Uub2Zmc2V0Lng7XG4gICAgICAgIG1vdXNlLnBvc2l0aW9uLnkgPSBtb3VzZS5hYnNvbHV0ZS55ICogbW91c2Uuc2NhbGUueSArIG1vdXNlLm9mZnNldC55O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBtb3VzZSBwb3NpdGlvbiBzY2FsZS5cbiAgICAgKiBAbWV0aG9kIHNldFNjYWxlXG4gICAgICogQHBhcmFtIHttb3VzZX0gbW91c2VcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gc2NhbGVcbiAgICAgKi9cbiAgICBNb3VzZS5zZXRTY2FsZSA9IGZ1bmN0aW9uKG1vdXNlLCBzY2FsZSkge1xuICAgICAgICBtb3VzZS5zY2FsZS54ID0gc2NhbGUueDtcbiAgICAgICAgbW91c2Uuc2NhbGUueSA9IHNjYWxlLnk7XG4gICAgICAgIG1vdXNlLnBvc2l0aW9uLnggPSBtb3VzZS5hYnNvbHV0ZS54ICogbW91c2Uuc2NhbGUueCArIG1vdXNlLm9mZnNldC54O1xuICAgICAgICBtb3VzZS5wb3NpdGlvbi55ID0gbW91c2UuYWJzb2x1dGUueSAqIG1vdXNlLnNjYWxlLnkgKyBtb3VzZS5vZmZzZXQueTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIG1vdXNlIHBvc2l0aW9uIHJlbGF0aXZlIHRvIGFuIGVsZW1lbnQgZ2l2ZW4gYSBzY3JlZW4gcGl4ZWwgcmF0aW8uXG4gICAgICogQG1ldGhvZCBfZ2V0UmVsYXRpdmVNb3VzZVBvc2l0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gZXZlbnRcbiAgICAgKiBAcGFyYW0ge30gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwaXhlbFJhdGlvXG4gICAgICogQHJldHVybiB7fVxuICAgICAqL1xuICAgIHZhciBfZ2V0UmVsYXRpdmVNb3VzZVBvc2l0aW9uID0gZnVuY3Rpb24oZXZlbnQsIGVsZW1lbnQsIHBpeGVsUmF0aW8pIHtcbiAgICAgICAgdmFyIGVsZW1lbnRCb3VuZHMgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgICAgICAgcm9vdE5vZGUgPSAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50IHx8IGRvY3VtZW50LmJvZHkucGFyZW50Tm9kZSB8fCBkb2N1bWVudC5ib2R5KSxcbiAgICAgICAgICAgIHNjcm9sbFggPSAod2luZG93LnBhZ2VYT2Zmc2V0ICE9PSB1bmRlZmluZWQpID8gd2luZG93LnBhZ2VYT2Zmc2V0IDogcm9vdE5vZGUuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIHNjcm9sbFkgPSAod2luZG93LnBhZ2VZT2Zmc2V0ICE9PSB1bmRlZmluZWQpID8gd2luZG93LnBhZ2VZT2Zmc2V0IDogcm9vdE5vZGUuc2Nyb2xsVG9wLFxuICAgICAgICAgICAgdG91Y2hlcyA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzLFxuICAgICAgICAgICAgeCwgeTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0b3VjaGVzKSB7XG4gICAgICAgICAgICB4ID0gdG91Y2hlc1swXS5wYWdlWCAtIGVsZW1lbnRCb3VuZHMubGVmdCAtIHNjcm9sbFg7XG4gICAgICAgICAgICB5ID0gdG91Y2hlc1swXS5wYWdlWSAtIGVsZW1lbnRCb3VuZHMudG9wIC0gc2Nyb2xsWTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHggPSBldmVudC5wYWdlWCAtIGVsZW1lbnRCb3VuZHMubGVmdCAtIHNjcm9sbFg7XG4gICAgICAgICAgICB5ID0gZXZlbnQucGFnZVkgLSBlbGVtZW50Qm91bmRzLnRvcCAtIHNjcm9sbFk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIHg6IHggLyAoZWxlbWVudC5jbGllbnRXaWR0aCAvIGVsZW1lbnQud2lkdGggKiBwaXhlbFJhdGlvKSxcbiAgICAgICAgICAgIHk6IHkgLyAoZWxlbWVudC5jbGllbnRIZWlnaHQgLyBlbGVtZW50LmhlaWdodCAqIHBpeGVsUmF0aW8pXG4gICAgICAgIH07XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5SdW5uZXJgIG1vZHVsZSBpcyBhbiBvcHRpb25hbCB1dGlsaXR5IHdoaWNoIHByb3ZpZGVzIGEgZ2FtZSBsb29wLCBcbiogdGhhdCBoYW5kbGVzIGNvbnRpbnVvdXNseSB1cGRhdGluZyBhIGBNYXR0ZXIuRW5naW5lYCBmb3IgeW91IHdpdGhpbiBhIGJyb3dzZXIuXG4qIEl0IGlzIGludGVuZGVkIGZvciBkZXZlbG9wbWVudCBhbmQgZGVidWdnaW5nIHB1cnBvc2VzLCBidXQgbWF5IGFsc28gYmUgc3VpdGFibGUgZm9yIHNpbXBsZSBnYW1lcy5cbiogSWYgeW91IGFyZSB1c2luZyB5b3VyIG93biBnYW1lIGxvb3AgaW5zdGVhZCwgdGhlbiB5b3UgZG8gbm90IG5lZWQgdGhlIGBNYXR0ZXIuUnVubmVyYCBtb2R1bGUuXG4qIEluc3RlYWQganVzdCBjYWxsIGBFbmdpbmUudXBkYXRlKGVuZ2luZSwgZGVsdGEpYCBpbiB5b3VyIG93biBsb29wLlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgUnVubmVyXG4qL1xuXG52YXIgUnVubmVyID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gUnVubmVyO1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9FdmVudHMnKTtcbnZhciBFbmdpbmUgPSByZXF1aXJlKCcuL0VuZ2luZScpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4vQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgX3JlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgZnVuY3Rpb24oY2FsbGJhY2speyB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soQ29tbW9uLm5vdygpKTsgfSwgMTAwMCAvIDYwKTsgfTtcbiAgIFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBSdW5uZXIuIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt9IG9wdGlvbnNcbiAgICAgKi9cbiAgICBSdW5uZXIuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBmcHM6IDYwLFxuICAgICAgICAgICAgY29ycmVjdGlvbjogMSxcbiAgICAgICAgICAgIGRlbHRhU2FtcGxlU2l6ZTogNjAsXG4gICAgICAgICAgICBjb3VudGVyVGltZXN0YW1wOiAwLFxuICAgICAgICAgICAgZnJhbWVDb3VudGVyOiAwLFxuICAgICAgICAgICAgZGVsdGFIaXN0b3J5OiBbXSxcbiAgICAgICAgICAgIHRpbWVQcmV2OiBudWxsLFxuICAgICAgICAgICAgdGltZVNjYWxlUHJldjogMSxcbiAgICAgICAgICAgIGZyYW1lUmVxdWVzdElkOiBudWxsLFxuICAgICAgICAgICAgaXNGaXhlZDogZmFsc2UsXG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJ1bm5lciA9IENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIHJ1bm5lci5kZWx0YSA9IHJ1bm5lci5kZWx0YSB8fCAxMDAwIC8gcnVubmVyLmZwcztcbiAgICAgICAgcnVubmVyLmRlbHRhTWluID0gcnVubmVyLmRlbHRhTWluIHx8IDEwMDAgLyBydW5uZXIuZnBzO1xuICAgICAgICBydW5uZXIuZGVsdGFNYXggPSBydW5uZXIuZGVsdGFNYXggfHwgMTAwMCAvIChydW5uZXIuZnBzICogMC41KTtcbiAgICAgICAgcnVubmVyLmZwcyA9IDEwMDAgLyBydW5uZXIuZGVsdGE7XG5cbiAgICAgICAgcmV0dXJuIHJ1bm5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29udGludW91c2x5IHRpY2tzIGEgYE1hdHRlci5FbmdpbmVgIGJ5IGNhbGxpbmcgYFJ1bm5lci50aWNrYCBvbiB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgZXZlbnQuXG4gICAgICogQG1ldGhvZCBydW5cbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG4gICAgUnVubmVyLnJ1biA9IGZ1bmN0aW9uKHJ1bm5lciwgZW5naW5lKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBydW5uZXIgaWYgZW5naW5lIGlzIGZpcnN0IGFyZ3VtZW50XG4gICAgICAgIGlmICh0eXBlb2YgcnVubmVyLnBvc2l0aW9uSXRlcmF0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGVuZ2luZSA9IHJ1bm5lcjtcbiAgICAgICAgICAgIHJ1bm5lciA9IFJ1bm5lci5jcmVhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIChmdW5jdGlvbiByZW5kZXIodGltZSl7XG4gICAgICAgICAgICBydW5uZXIuZnJhbWVSZXF1ZXN0SWQgPSBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlcik7XG5cbiAgICAgICAgICAgIGlmICh0aW1lICYmIHJ1bm5lci5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgUnVubmVyLnRpY2socnVubmVyLCBlbmdpbmUsIHRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSgpO1xuXG4gICAgICAgIHJldHVybiBydW5uZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEEgZ2FtZSBsb29wIHV0aWxpdHkgdGhhdCB1cGRhdGVzIHRoZSBlbmdpbmUgYW5kIHJlbmRlcmVyIGJ5IG9uZSBzdGVwIChhICd0aWNrJykuXG4gICAgICogRmVhdHVyZXMgZGVsdGEgc21vb3RoaW5nLCB0aW1lIGNvcnJlY3Rpb24gYW5kIGZpeGVkIG9yIGR5bmFtaWMgdGltaW5nLlxuICAgICAqIFRyaWdnZXJzIGBiZWZvcmVUaWNrYCwgYHRpY2tgIGFuZCBgYWZ0ZXJUaWNrYCBldmVudHMgb24gdGhlIGVuZ2luZS5cbiAgICAgKiBDb25zaWRlciBqdXN0IGBFbmdpbmUudXBkYXRlKGVuZ2luZSwgZGVsdGEpYCBpZiB5b3UncmUgdXNpbmcgeW91ciBvd24gbG9vcC5cbiAgICAgKiBAbWV0aG9kIHRpY2tcbiAgICAgKiBAcGFyYW0ge3J1bm5lcn0gcnVubmVyXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lXG4gICAgICovXG4gICAgUnVubmVyLnRpY2sgPSBmdW5jdGlvbihydW5uZXIsIGVuZ2luZSwgdGltZSkge1xuICAgICAgICB2YXIgdGltaW5nID0gZW5naW5lLnRpbWluZyxcbiAgICAgICAgICAgIGNvcnJlY3Rpb24gPSAxLFxuICAgICAgICAgICAgZGVsdGE7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFuIGV2ZW50IG9iamVjdFxuICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWluZy50aW1lc3RhbXBcbiAgICAgICAgfTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihydW5uZXIsICdiZWZvcmVUaWNrJywgZXZlbnQpO1xuICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdiZWZvcmVUaWNrJywgZXZlbnQpOyAvLyBAZGVwcmVjYXRlZFxuXG4gICAgICAgIGlmIChydW5uZXIuaXNGaXhlZCkge1xuICAgICAgICAgICAgLy8gZml4ZWQgdGltZXN0ZXBcbiAgICAgICAgICAgIGRlbHRhID0gcnVubmVyLmRlbHRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZHluYW1pYyB0aW1lc3RlcCBiYXNlZCBvbiB3YWxsIGNsb2NrIGJldHdlZW4gY2FsbHNcbiAgICAgICAgICAgIGRlbHRhID0gKHRpbWUgLSBydW5uZXIudGltZVByZXYpIHx8IHJ1bm5lci5kZWx0YTtcbiAgICAgICAgICAgIHJ1bm5lci50aW1lUHJldiA9IHRpbWU7XG5cbiAgICAgICAgICAgIC8vIG9wdGltaXN0aWNhbGx5IGZpbHRlciBkZWx0YSBvdmVyIGEgZmV3IGZyYW1lcywgdG8gaW1wcm92ZSBzdGFiaWxpdHlcbiAgICAgICAgICAgIHJ1bm5lci5kZWx0YUhpc3RvcnkucHVzaChkZWx0YSk7XG4gICAgICAgICAgICBydW5uZXIuZGVsdGFIaXN0b3J5ID0gcnVubmVyLmRlbHRhSGlzdG9yeS5zbGljZSgtcnVubmVyLmRlbHRhU2FtcGxlU2l6ZSk7XG4gICAgICAgICAgICBkZWx0YSA9IE1hdGgubWluLmFwcGx5KG51bGwsIHJ1bm5lci5kZWx0YUhpc3RvcnkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBsaW1pdCBkZWx0YVxuICAgICAgICAgICAgZGVsdGEgPSBkZWx0YSA8IHJ1bm5lci5kZWx0YU1pbiA/IHJ1bm5lci5kZWx0YU1pbiA6IGRlbHRhO1xuICAgICAgICAgICAgZGVsdGEgPSBkZWx0YSA+IHJ1bm5lci5kZWx0YU1heCA/IHJ1bm5lci5kZWx0YU1heCA6IGRlbHRhO1xuXG4gICAgICAgICAgICAvLyBjb3JyZWN0aW9uIGZvciBkZWx0YVxuICAgICAgICAgICAgY29ycmVjdGlvbiA9IGRlbHRhIC8gcnVubmVyLmRlbHRhO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgZW5naW5lIHRpbWluZyBvYmplY3RcbiAgICAgICAgICAgIHJ1bm5lci5kZWx0YSA9IGRlbHRhO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGltZSBjb3JyZWN0aW9uIGZvciB0aW1lIHNjYWxpbmdcbiAgICAgICAgaWYgKHJ1bm5lci50aW1lU2NhbGVQcmV2ICE9PSAwKVxuICAgICAgICAgICAgY29ycmVjdGlvbiAqPSB0aW1pbmcudGltZVNjYWxlIC8gcnVubmVyLnRpbWVTY2FsZVByZXY7XG5cbiAgICAgICAgaWYgKHRpbWluZy50aW1lU2NhbGUgPT09IDApXG4gICAgICAgICAgICBjb3JyZWN0aW9uID0gMDtcblxuICAgICAgICBydW5uZXIudGltZVNjYWxlUHJldiA9IHRpbWluZy50aW1lU2NhbGU7XG4gICAgICAgIHJ1bm5lci5jb3JyZWN0aW9uID0gY29ycmVjdGlvbjtcblxuICAgICAgICAvLyBmcHMgY291bnRlclxuICAgICAgICBydW5uZXIuZnJhbWVDb3VudGVyICs9IDE7XG4gICAgICAgIGlmICh0aW1lIC0gcnVubmVyLmNvdW50ZXJUaW1lc3RhbXAgPj0gMTAwMCkge1xuICAgICAgICAgICAgcnVubmVyLmZwcyA9IHJ1bm5lci5mcmFtZUNvdW50ZXIgKiAoKHRpbWUgLSBydW5uZXIuY291bnRlclRpbWVzdGFtcCkgLyAxMDAwKTtcbiAgICAgICAgICAgIHJ1bm5lci5jb3VudGVyVGltZXN0YW1wID0gdGltZTtcbiAgICAgICAgICAgIHJ1bm5lci5mcmFtZUNvdW50ZXIgPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIocnVubmVyLCAndGljaycsIGV2ZW50KTtcbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAndGljaycsIGV2ZW50KTsgLy8gQGRlcHJlY2F0ZWRcblxuICAgICAgICAvLyBpZiB3b3JsZCBoYXMgYmVlbiBtb2RpZmllZCwgY2xlYXIgdGhlIHJlbmRlciBzY2VuZSBncmFwaFxuICAgICAgICBpZiAoZW5naW5lLndvcmxkLmlzTW9kaWZpZWQgXG4gICAgICAgICAgICAmJiBlbmdpbmUucmVuZGVyXG4gICAgICAgICAgICAmJiBlbmdpbmUucmVuZGVyLmNvbnRyb2xsZXJcbiAgICAgICAgICAgICYmIGVuZ2luZS5yZW5kZXIuY29udHJvbGxlci5jbGVhcikge1xuICAgICAgICAgICAgZW5naW5lLnJlbmRlci5jb250cm9sbGVyLmNsZWFyKGVuZ2luZS5yZW5kZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKHJ1bm5lciwgJ2JlZm9yZVVwZGF0ZScsIGV2ZW50KTtcbiAgICAgICAgRW5naW5lLnVwZGF0ZShlbmdpbmUsIGRlbHRhLCBjb3JyZWN0aW9uKTtcbiAgICAgICAgRXZlbnRzLnRyaWdnZXIocnVubmVyLCAnYWZ0ZXJVcGRhdGUnLCBldmVudCk7XG5cbiAgICAgICAgLy8gcmVuZGVyXG4gICAgICAgIC8vIEBkZXByZWNhdGVkXG4gICAgICAgIGlmIChlbmdpbmUucmVuZGVyICYmIGVuZ2luZS5yZW5kZXIuY29udHJvbGxlcikge1xuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIocnVubmVyLCAnYmVmb3JlUmVuZGVyJywgZXZlbnQpO1xuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnYmVmb3JlUmVuZGVyJywgZXZlbnQpOyAvLyBAZGVwcmVjYXRlZFxuXG4gICAgICAgICAgICBlbmdpbmUucmVuZGVyLmNvbnRyb2xsZXIud29ybGQoZW5naW5lLnJlbmRlcik7XG5cbiAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKHJ1bm5lciwgJ2FmdGVyUmVuZGVyJywgZXZlbnQpO1xuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnYWZ0ZXJSZW5kZXInLCBldmVudCk7IC8vIEBkZXByZWNhdGVkXG4gICAgICAgIH1cblxuICAgICAgICBFdmVudHMudHJpZ2dlcihydW5uZXIsICdhZnRlclRpY2snLCBldmVudCk7XG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKGVuZ2luZSwgJ2FmdGVyVGljaycsIGV2ZW50KTsgLy8gQGRlcHJlY2F0ZWRcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRW5kcyBleGVjdXRpb24gb2YgYFJ1bm5lci5ydW5gIG9uIHRoZSBnaXZlbiBgcnVubmVyYCwgYnkgY2FuY2VsaW5nIHRoZSBhbmltYXRpb24gZnJhbWUgcmVxdWVzdCBldmVudCBsb29wLlxuICAgICAqIElmIHlvdSB3aXNoIHRvIG9ubHkgdGVtcG9yYXJpbHkgcGF1c2UgdGhlIGVuZ2luZSwgc2VlIGBlbmdpbmUuZW5hYmxlZGAgaW5zdGVhZC5cbiAgICAgKiBAbWV0aG9kIHN0b3BcbiAgICAgKiBAcGFyYW0ge3J1bm5lcn0gcnVubmVyXG4gICAgICovXG4gICAgUnVubmVyLnN0b3AgPSBmdW5jdGlvbihydW5uZXIpIHtcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lKHJ1bm5lci5mcmFtZVJlcXVlc3RJZCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFsaWFzIGZvciBgUnVubmVyLnJ1bmAuXG4gICAgICogQG1ldGhvZCBzdGFydFxuICAgICAqIEBwYXJhbSB7cnVubmVyfSBydW5uZXJcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG4gICAgUnVubmVyLnN0YXJ0ID0gZnVuY3Rpb24ocnVubmVyLCBlbmdpbmUpIHtcbiAgICAgICAgUnVubmVyLnJ1bihydW5uZXIsIGVuZ2luZSk7XG4gICAgfTtcblxuICAgIC8qXG4gICAgKlxuICAgICogIEV2ZW50cyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGF0IHRoZSBzdGFydCBvZiBhIHRpY2ssIGJlZm9yZSBhbnkgdXBkYXRlcyB0byB0aGUgZW5naW5lIG9yIHRpbWluZ1xuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVUaWNrXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhZnRlciBlbmdpbmUgdGltaW5nIHVwZGF0ZWQsIGJ1dCBqdXN0IGJlZm9yZSB1cGRhdGVcbiAgICAqXG4gICAgKiBAZXZlbnQgdGlja1xuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYXQgdGhlIGVuZCBvZiBhIHRpY2ssIGFmdGVyIGVuZ2luZSB1cGRhdGUgYW5kIGFmdGVyIHJlbmRlcmluZ1xuICAgICpcbiAgICAqIEBldmVudCBhZnRlclRpY2tcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGJlZm9yZSB1cGRhdGVcbiAgICAqXG4gICAgKiBAZXZlbnQgYmVmb3JlVXBkYXRlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhZnRlciB1cGRhdGVcbiAgICAqXG4gICAgKiBAZXZlbnQgYWZ0ZXJVcGRhdGVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGJlZm9yZSByZW5kZXJpbmdcbiAgICAqXG4gICAgKiBAZXZlbnQgYmVmb3JlUmVuZGVyXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqIEBkZXByZWNhdGVkXG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgKlxuICAgICogQGV2ZW50IGFmdGVyUmVuZGVyXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqIEBkZXByZWNhdGVkXG4gICAgKi9cblxuICAgIC8qXG4gICAgKlxuICAgICogIFByb3BlcnRpZXMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgc3BlY2lmaWVzIHdoZXRoZXIgdGhlIHJ1bm5lciBpcyBydW5uaW5nIG9yIG5vdC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBlbmFibGVkXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYEJvb2xlYW5gIHRoYXQgc3BlY2lmaWVzIGlmIHRoZSBydW5uZXIgc2hvdWxkIHVzZSBhIGZpeGVkIHRpbWVzdGVwIChvdGhlcndpc2UgaXQgaXMgdmFyaWFibGUpLlxuICAgICAqIElmIHRpbWluZyBpcyBmaXhlZCwgdGhlbiB0aGUgYXBwYXJlbnQgc2ltdWxhdGlvbiBzcGVlZCB3aWxsIGNoYW5nZSBkZXBlbmRpbmcgb24gdGhlIGZyYW1lIHJhdGUgKGJ1dCBiZWhhdmlvdXIgd2lsbCBiZSBkZXRlcm1pbmlzdGljKS5cbiAgICAgKiBJZiB0aGUgdGltaW5nIGlzIHZhcmlhYmxlLCB0aGVuIHRoZSBhcHBhcmVudCBzaW11bGF0aW9uIHNwZWVkIHdpbGwgYmUgY29uc3RhbnQgKGFwcHJveGltYXRlbHksIGJ1dCBhdCB0aGUgY29zdCBvZiBkZXRlcm1pbmluaXNtKS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpc0ZpeGVkXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSB0aW1lIHN0ZXAgYmV0d2VlbiB1cGRhdGVzIGluIG1pbGxpc2Vjb25kcy5cbiAgICAgKiBJZiBgZW5naW5lLnRpbWluZy5pc0ZpeGVkYCBpcyBzZXQgdG8gYHRydWVgLCB0aGVuIGBkZWx0YWAgaXMgZml4ZWQuXG4gICAgICogSWYgaXQgaXMgYGZhbHNlYCwgdGhlbiBgZGVsdGFgIGNhbiBkeW5hbWljYWxseSBjaGFuZ2UgdG8gbWFpbnRhaW4gdGhlIGNvcnJlY3QgYXBwYXJlbnQgc2ltdWxhdGlvbiBzcGVlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBkZWx0YVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDEwMDAgLyA2MFxuICAgICAqL1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlNsZWVwaW5nYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyB0byBtYW5hZ2UgdGhlIHNsZWVwaW5nIHN0YXRlIG9mIGJvZGllcy5cbipcbiogQGNsYXNzIFNsZWVwaW5nXG4qL1xuXG52YXIgU2xlZXBpbmcgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBTbGVlcGluZztcblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4vRXZlbnRzJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIFNsZWVwaW5nLl9tb3Rpb25XYWtlVGhyZXNob2xkID0gMC4xODtcbiAgICBTbGVlcGluZy5fbW90aW9uU2xlZXBUaHJlc2hvbGQgPSAwLjA4O1xuICAgIFNsZWVwaW5nLl9taW5CaWFzID0gMC45O1xuXG4gICAgLyoqXG4gICAgICogUHV0cyBib2RpZXMgdG8gc2xlZXAgb3Igd2FrZXMgdGhlbSB1cCBkZXBlbmRpbmcgb24gdGhlaXIgbW90aW9uLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBTbGVlcGluZy51cGRhdGUgPSBmdW5jdGlvbihib2RpZXMsIHRpbWVTY2FsZSkge1xuICAgICAgICB2YXIgdGltZUZhY3RvciA9IHRpbWVTY2FsZSAqIHRpbWVTY2FsZSAqIHRpbWVTY2FsZTtcblxuICAgICAgICAvLyB1cGRhdGUgYm9kaWVzIHNsZWVwaW5nIHN0YXR1c1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgbW90aW9uID0gYm9keS5zcGVlZCAqIGJvZHkuc3BlZWQgKyBib2R5LmFuZ3VsYXJTcGVlZCAqIGJvZHkuYW5ndWxhclNwZWVkO1xuXG4gICAgICAgICAgICAvLyB3YWtlIHVwIGJvZGllcyBpZiB0aGV5IGhhdmUgYSBmb3JjZSBhcHBsaWVkXG4gICAgICAgICAgICBpZiAoYm9keS5mb3JjZS54ICE9PSAwIHx8IGJvZHkuZm9yY2UueSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFNsZWVwaW5nLnNldChib2R5LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBtaW5Nb3Rpb24gPSBNYXRoLm1pbihib2R5Lm1vdGlvbiwgbW90aW9uKSxcbiAgICAgICAgICAgICAgICBtYXhNb3Rpb24gPSBNYXRoLm1heChib2R5Lm1vdGlvbiwgbW90aW9uKTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyBiaWFzZWQgYXZlcmFnZSBtb3Rpb24gZXN0aW1hdGlvbiBiZXR3ZWVuIGZyYW1lc1xuICAgICAgICAgICAgYm9keS5tb3Rpb24gPSBTbGVlcGluZy5fbWluQmlhcyAqIG1pbk1vdGlvbiArICgxIC0gU2xlZXBpbmcuX21pbkJpYXMpICogbWF4TW90aW9uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYm9keS5zbGVlcFRocmVzaG9sZCA+IDAgJiYgYm9keS5tb3Rpb24gPCBTbGVlcGluZy5fbW90aW9uU2xlZXBUaHJlc2hvbGQgKiB0aW1lRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgYm9keS5zbGVlcENvdW50ZXIgKz0gMTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoYm9keS5zbGVlcENvdW50ZXIgPj0gYm9keS5zbGVlcFRocmVzaG9sZClcbiAgICAgICAgICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChib2R5LnNsZWVwQ291bnRlciA+IDApIHtcbiAgICAgICAgICAgICAgICBib2R5LnNsZWVwQ291bnRlciAtPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgc2V0IG9mIGNvbGxpZGluZyBwYWlycywgd2FrZXMgdGhlIHNsZWVwaW5nIGJvZGllcyBpbnZvbHZlZC5cbiAgICAgKiBAbWV0aG9kIGFmdGVyQ29sbGlzaW9uc1xuICAgICAqIEBwYXJhbSB7cGFpcltdfSBwYWlyc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBTbGVlcGluZy5hZnRlckNvbGxpc2lvbnMgPSBmdW5jdGlvbihwYWlycywgdGltZVNjYWxlKSB7XG4gICAgICAgIHZhciB0aW1lRmFjdG9yID0gdGltZVNjYWxlICogdGltZVNjYWxlICogdGltZVNjYWxlO1xuXG4gICAgICAgIC8vIHdha2UgdXAgYm9kaWVzIGludm9sdmVkIGluIGNvbGxpc2lvbnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gZG9uJ3Qgd2FrZSBpbmFjdGl2ZSBwYWlyc1xuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB2YXIgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb24sXG4gICAgICAgICAgICAgICAgYm9keUEgPSBjb2xsaXNpb24uYm9keUEucGFyZW50LCBcbiAgICAgICAgICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5ib2R5Qi5wYXJlbnQ7XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gZG9uJ3Qgd2FrZSBpZiBhdCBsZWFzdCBvbmUgYm9keSBpcyBzdGF0aWNcbiAgICAgICAgICAgIGlmICgoYm9keUEuaXNTbGVlcGluZyAmJiBib2R5Qi5pc1NsZWVwaW5nKSB8fCBib2R5QS5pc1N0YXRpYyB8fCBib2R5Qi5pc1N0YXRpYylcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgICAgICBpZiAoYm9keUEuaXNTbGVlcGluZyB8fCBib2R5Qi5pc1NsZWVwaW5nKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNsZWVwaW5nQm9keSA9IChib2R5QS5pc1NsZWVwaW5nICYmICFib2R5QS5pc1N0YXRpYykgPyBib2R5QSA6IGJvZHlCLFxuICAgICAgICAgICAgICAgICAgICBtb3ZpbmdCb2R5ID0gc2xlZXBpbmdCb2R5ID09PSBib2R5QSA/IGJvZHlCIDogYm9keUE7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXNsZWVwaW5nQm9keS5pc1N0YXRpYyAmJiBtb3ZpbmdCb2R5Lm1vdGlvbiA+IFNsZWVwaW5nLl9tb3Rpb25XYWtlVGhyZXNob2xkICogdGltZUZhY3Rvcikge1xuICAgICAgICAgICAgICAgICAgICBTbGVlcGluZy5zZXQoc2xlZXBpbmdCb2R5LCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgXG4gICAgLyoqXG4gICAgICogU2V0IGEgYm9keSBhcyBzbGVlcGluZyBvciBhd2FrZS5cbiAgICAgKiBAbWV0aG9kIHNldFxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNTbGVlcGluZ1xuICAgICAqL1xuICAgIFNsZWVwaW5nLnNldCA9IGZ1bmN0aW9uKGJvZHksIGlzU2xlZXBpbmcpIHtcbiAgICAgICAgdmFyIHdhc1NsZWVwaW5nID0gYm9keS5pc1NsZWVwaW5nO1xuXG4gICAgICAgIGlmIChpc1NsZWVwaW5nKSB7XG4gICAgICAgICAgICBib2R5LmlzU2xlZXBpbmcgPSB0cnVlO1xuICAgICAgICAgICAgYm9keS5zbGVlcENvdW50ZXIgPSBib2R5LnNsZWVwVGhyZXNob2xkO1xuXG4gICAgICAgICAgICBib2R5LnBvc2l0aW9uSW1wdWxzZS54ID0gMDtcbiAgICAgICAgICAgIGJvZHkucG9zaXRpb25JbXB1bHNlLnkgPSAwO1xuXG4gICAgICAgICAgICBib2R5LnBvc2l0aW9uUHJldi54ID0gYm9keS5wb3NpdGlvbi54O1xuICAgICAgICAgICAgYm9keS5wb3NpdGlvblByZXYueSA9IGJvZHkucG9zaXRpb24ueTtcblxuICAgICAgICAgICAgYm9keS5hbmdsZVByZXYgPSBib2R5LmFuZ2xlO1xuICAgICAgICAgICAgYm9keS5zcGVlZCA9IDA7XG4gICAgICAgICAgICBib2R5LmFuZ3VsYXJTcGVlZCA9IDA7XG4gICAgICAgICAgICBib2R5Lm1vdGlvbiA9IDA7XG5cbiAgICAgICAgICAgIGlmICghd2FzU2xlZXBpbmcpIHtcbiAgICAgICAgICAgICAgICBFdmVudHMudHJpZ2dlcihib2R5LCAnc2xlZXBTdGFydCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYm9keS5pc1NsZWVwaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBib2R5LnNsZWVwQ291bnRlciA9IDA7XG5cbiAgICAgICAgICAgIGlmICh3YXNTbGVlcGluZykge1xuICAgICAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKGJvZHksICdzbGVlcEVuZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Cb2RpZXNgIG1vZHVsZSBjb250YWlucyBmYWN0b3J5IG1ldGhvZHMgZm9yIGNyZWF0aW5nIHJpZ2lkIGJvZHkgbW9kZWxzIFxuKiB3aXRoIGNvbW1vbmx5IHVzZWQgYm9keSBjb25maWd1cmF0aW9ucyAoc3VjaCBhcyByZWN0YW5nbGVzLCBjaXJjbGVzIGFuZCBvdGhlciBwb2x5Z29ucykuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBCb2RpZXNcbiovXG5cbi8vIFRPRE86IHRydWUgY2lyY2xlIGJvZGllc1xuXG52YXIgQm9kaWVzID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQm9kaWVzO1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG52YXIgQm9keSA9IHJlcXVpcmUoJy4uL2JvZHkvQm9keScpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHJpZ2lkIGJvZHkgbW9kZWwgd2l0aCBhIHJlY3RhbmdsZSBodWxsLiBcbiAgICAgKiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBvZiB0aGUgYE1hdHRlci5Cb2R5YCBtb2R1bGUgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIHJlY3RhbmdsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEByZXR1cm4ge2JvZHl9IEEgbmV3IHJlY3RhbmdsZSBib2R5XG4gICAgICovXG4gICAgQm9kaWVzLnJlY3RhbmdsZSA9IGZ1bmN0aW9uKHgsIHksIHdpZHRoLCBoZWlnaHQsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdmFyIHJlY3RhbmdsZSA9IHsgXG4gICAgICAgICAgICBsYWJlbDogJ1JlY3RhbmdsZSBCb2R5JyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiB7IHg6IHgsIHk6IHkgfSxcbiAgICAgICAgICAgIHZlcnRpY2VzOiBWZXJ0aWNlcy5mcm9tUGF0aCgnTCAwIDAgTCAnICsgd2lkdGggKyAnIDAgTCAnICsgd2lkdGggKyAnICcgKyBoZWlnaHQgKyAnIEwgMCAnICsgaGVpZ2h0KVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChvcHRpb25zLmNoYW1mZXIpIHtcbiAgICAgICAgICAgIHZhciBjaGFtZmVyID0gb3B0aW9ucy5jaGFtZmVyO1xuICAgICAgICAgICAgcmVjdGFuZ2xlLnZlcnRpY2VzID0gVmVydGljZXMuY2hhbWZlcihyZWN0YW5nbGUudmVydGljZXMsIGNoYW1mZXIucmFkaXVzLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW1mZXIucXVhbGl0eSwgY2hhbWZlci5xdWFsaXR5TWluLCBjaGFtZmVyLnF1YWxpdHlNYXgpO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuY2hhbWZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBCb2R5LmNyZWF0ZShDb21tb24uZXh0ZW5kKHt9LCByZWN0YW5nbGUsIG9wdGlvbnMpKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmlnaWQgYm9keSBtb2RlbCB3aXRoIGEgdHJhcGV6b2lkIGh1bGwuIFxuICAgICAqIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIFNlZSB0aGUgcHJvcGVydGllcyBzZWN0aW9uIG9mIHRoZSBgTWF0dGVyLkJvZHlgIG1vZHVsZSBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgdHJhcGV6b2lkXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2xvcGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHJldHVybiB7Ym9keX0gQSBuZXcgdHJhcGV6b2lkIGJvZHlcbiAgICAgKi9cbiAgICBCb2RpZXMudHJhcGV6b2lkID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCwgc2xvcGUsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgc2xvcGUgKj0gMC41O1xuICAgICAgICB2YXIgcm9vZiA9ICgxIC0gKHNsb3BlICogMikpICogd2lkdGg7XG4gICAgICAgIFxuICAgICAgICB2YXIgeDEgPSB3aWR0aCAqIHNsb3BlLFxuICAgICAgICAgICAgeDIgPSB4MSArIHJvb2YsXG4gICAgICAgICAgICB4MyA9IHgyICsgeDEsXG4gICAgICAgICAgICB2ZXJ0aWNlc1BhdGg7XG5cbiAgICAgICAgaWYgKHNsb3BlIDwgMC41KSB7XG4gICAgICAgICAgICB2ZXJ0aWNlc1BhdGggPSAnTCAwIDAgTCAnICsgeDEgKyAnICcgKyAoLWhlaWdodCkgKyAnIEwgJyArIHgyICsgJyAnICsgKC1oZWlnaHQpICsgJyBMICcgKyB4MyArICcgMCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2ZXJ0aWNlc1BhdGggPSAnTCAwIDAgTCAnICsgeDIgKyAnICcgKyAoLWhlaWdodCkgKyAnIEwgJyArIHgzICsgJyAwJztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0cmFwZXpvaWQgPSB7IFxuICAgICAgICAgICAgbGFiZWw6ICdUcmFwZXpvaWQgQm9keScsXG4gICAgICAgICAgICBwb3NpdGlvbjogeyB4OiB4LCB5OiB5IH0sXG4gICAgICAgICAgICB2ZXJ0aWNlczogVmVydGljZXMuZnJvbVBhdGgodmVydGljZXNQYXRoKVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChvcHRpb25zLmNoYW1mZXIpIHtcbiAgICAgICAgICAgIHZhciBjaGFtZmVyID0gb3B0aW9ucy5jaGFtZmVyO1xuICAgICAgICAgICAgdHJhcGV6b2lkLnZlcnRpY2VzID0gVmVydGljZXMuY2hhbWZlcih0cmFwZXpvaWQudmVydGljZXMsIGNoYW1mZXIucmFkaXVzLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW1mZXIucXVhbGl0eSwgY2hhbWZlci5xdWFsaXR5TWluLCBjaGFtZmVyLnF1YWxpdHlNYXgpO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuY2hhbWZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBCb2R5LmNyZWF0ZShDb21tb24uZXh0ZW5kKHt9LCB0cmFwZXpvaWQsIG9wdGlvbnMpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByaWdpZCBib2R5IG1vZGVsIHdpdGggYSBjaXJjbGUgaHVsbC4gXG4gICAgICogVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gb2YgdGhlIGBNYXR0ZXIuQm9keWAgbW9kdWxlIGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCBjaXJjbGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJhZGl1c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW21heFNpZGVzXVxuICAgICAqIEByZXR1cm4ge2JvZHl9IEEgbmV3IGNpcmNsZSBib2R5XG4gICAgICovXG4gICAgQm9kaWVzLmNpcmNsZSA9IGZ1bmN0aW9uKHgsIHksIHJhZGl1cywgb3B0aW9ucywgbWF4U2lkZXMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgdmFyIGNpcmNsZSA9IHtcbiAgICAgICAgICAgIGxhYmVsOiAnQ2lyY2xlIEJvZHknLFxuICAgICAgICAgICAgY2lyY2xlUmFkaXVzOiByYWRpdXNcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFwcHJveGltYXRlIGNpcmNsZXMgd2l0aCBwb2x5Z29ucyB1bnRpbCB0cnVlIGNpcmNsZXMgaW1wbGVtZW50ZWQgaW4gU0FUXG4gICAgICAgIG1heFNpZGVzID0gbWF4U2lkZXMgfHwgMjU7XG4gICAgICAgIHZhciBzaWRlcyA9IE1hdGguY2VpbChNYXRoLm1heCgxMCwgTWF0aC5taW4obWF4U2lkZXMsIHJhZGl1cykpKTtcblxuICAgICAgICAvLyBvcHRpbWlzYXRpb246IGFsd2F5cyB1c2UgZXZlbiBudW1iZXIgb2Ygc2lkZXMgKGhhbGYgdGhlIG51bWJlciBvZiB1bmlxdWUgYXhlcylcbiAgICAgICAgaWYgKHNpZGVzICUgMiA9PT0gMSlcbiAgICAgICAgICAgIHNpZGVzICs9IDE7XG5cbiAgICAgICAgcmV0dXJuIEJvZGllcy5wb2x5Z29uKHgsIHksIHNpZGVzLCByYWRpdXMsIENvbW1vbi5leHRlbmQoe30sIGNpcmNsZSwgb3B0aW9ucykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHJpZ2lkIGJvZHkgbW9kZWwgd2l0aCBhIHJlZ3VsYXIgcG9seWdvbiBodWxsIHdpdGggdGhlIGdpdmVuIG51bWJlciBvZiBzaWRlcy4gXG4gICAgICogVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gb2YgdGhlIGBNYXR0ZXIuQm9keWAgbW9kdWxlIGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCBwb2x5Z29uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzaWRlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByYWRpdXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHJldHVybiB7Ym9keX0gQSBuZXcgcmVndWxhciBwb2x5Z29uIGJvZHlcbiAgICAgKi9cbiAgICBCb2RpZXMucG9seWdvbiA9IGZ1bmN0aW9uKHgsIHksIHNpZGVzLCByYWRpdXMsIG9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgaWYgKHNpZGVzIDwgMylcbiAgICAgICAgICAgIHJldHVybiBCb2RpZXMuY2lyY2xlKHgsIHksIHJhZGl1cywgb3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHRoZXRhID0gMiAqIE1hdGguUEkgLyBzaWRlcyxcbiAgICAgICAgICAgIHBhdGggPSAnJyxcbiAgICAgICAgICAgIG9mZnNldCA9IHRoZXRhICogMC41O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2lkZXM7IGkgKz0gMSkge1xuICAgICAgICAgICAgdmFyIGFuZ2xlID0gb2Zmc2V0ICsgKGkgKiB0aGV0YSksXG4gICAgICAgICAgICAgICAgeHggPSBNYXRoLmNvcyhhbmdsZSkgKiByYWRpdXMsXG4gICAgICAgICAgICAgICAgeXkgPSBNYXRoLnNpbihhbmdsZSkgKiByYWRpdXM7XG5cbiAgICAgICAgICAgIHBhdGggKz0gJ0wgJyArIHh4LnRvRml4ZWQoMykgKyAnICcgKyB5eS50b0ZpeGVkKDMpICsgJyAnO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHBvbHlnb24gPSB7IFxuICAgICAgICAgICAgbGFiZWw6ICdQb2x5Z29uIEJvZHknLFxuICAgICAgICAgICAgcG9zaXRpb246IHsgeDogeCwgeTogeSB9LFxuICAgICAgICAgICAgdmVydGljZXM6IFZlcnRpY2VzLmZyb21QYXRoKHBhdGgpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuY2hhbWZlcikge1xuICAgICAgICAgICAgdmFyIGNoYW1mZXIgPSBvcHRpb25zLmNoYW1mZXI7XG4gICAgICAgICAgICBwb2x5Z29uLnZlcnRpY2VzID0gVmVydGljZXMuY2hhbWZlcihwb2x5Z29uLnZlcnRpY2VzLCBjaGFtZmVyLnJhZGl1cywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFtZmVyLnF1YWxpdHksIGNoYW1mZXIucXVhbGl0eU1pbiwgY2hhbWZlci5xdWFsaXR5TWF4KTtcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRpb25zLmNoYW1mZXI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gQm9keS5jcmVhdGUoQ29tbW9uLmV4dGVuZCh7fSwgcG9seWdvbiwgb3B0aW9ucykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYm9keSB1c2luZyB0aGUgc3VwcGxpZWQgdmVydGljZXMgKG9yIGFuIGFycmF5IGNvbnRhaW5pbmcgbXVsdGlwbGUgc2V0cyBvZiB2ZXJ0aWNlcykuXG4gICAgICogSWYgdGhlIHZlcnRpY2VzIGFyZSBjb252ZXgsIHRoZXkgd2lsbCBwYXNzIHRocm91Z2ggYXMgc3VwcGxpZWQuXG4gICAgICogT3RoZXJ3aXNlIGlmIHRoZSB2ZXJ0aWNlcyBhcmUgY29uY2F2ZSwgdGhleSB3aWxsIGJlIGRlY29tcG9zZWQgaWYgW3BvbHktZGVjb21wLmpzXShodHRwczovL2dpdGh1Yi5jb20vc2NodGVwcGUvcG9seS1kZWNvbXAuanMpIGlzIGF2YWlsYWJsZS5cbiAgICAgKiBOb3RlIHRoYXQgdGhpcyBwcm9jZXNzIGlzIG5vdCBndWFyYW50ZWVkIHRvIHN1cHBvcnQgY29tcGxleCBzZXRzIG9mIHZlcnRpY2VzIChlLmcuIHRob3NlIHdpdGggaG9sZXMgbWF5IGZhaWwpLlxuICAgICAqIEJ5IGRlZmF1bHQgdGhlIGRlY29tcG9zaXRpb24gd2lsbCBkaXNjYXJkIGNvbGxpbmVhciBlZGdlcyAodG8gaW1wcm92ZSBwZXJmb3JtYW5jZSkuXG4gICAgICogSXQgY2FuIGFsc28gb3B0aW9uYWxseSBkaXNjYXJkIGFueSBwYXJ0cyB0aGF0IGhhdmUgYW4gYXJlYSBsZXNzIHRoYW4gYG1pbmltdW1BcmVhYC5cbiAgICAgKiBJZiB0aGUgdmVydGljZXMgY2FuIG5vdCBiZSBkZWNvbXBvc2VkLCB0aGUgcmVzdWx0IHdpbGwgZmFsbCBiYWNrIHRvIHVzaW5nIHRoZSBjb252ZXggaHVsbC5cbiAgICAgKiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBgTWF0dGVyLkJvZHlgIHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIFNlZSB0aGUgcHJvcGVydGllcyBzZWN0aW9uIG9mIHRoZSBgTWF0dGVyLkJvZHlgIG1vZHVsZSBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgZnJvbVZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSBbW3ZlY3Rvcl1dIHZlcnRleFNldHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHBhcmFtIHtib29sfSBbZmxhZ0ludGVybmFsPWZhbHNlXVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcmVtb3ZlQ29sbGluZWFyPTAuMDFdXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFttaW5pbXVtQXJlYT0xMF1cbiAgICAgKiBAcmV0dXJuIHtib2R5fVxuICAgICAqL1xuICAgIEJvZGllcy5mcm9tVmVydGljZXMgPSBmdW5jdGlvbih4LCB5LCB2ZXJ0ZXhTZXRzLCBvcHRpb25zLCBmbGFnSW50ZXJuYWwsIHJlbW92ZUNvbGxpbmVhciwgbWluaW11bUFyZWEpIHtcbiAgICAgICAgdmFyIGJvZHksXG4gICAgICAgICAgICBwYXJ0cyxcbiAgICAgICAgICAgIGlzQ29udmV4LFxuICAgICAgICAgICAgdmVydGljZXMsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICB2LFxuICAgICAgICAgICAgejtcblxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgcGFydHMgPSBbXTtcblxuICAgICAgICBmbGFnSW50ZXJuYWwgPSB0eXBlb2YgZmxhZ0ludGVybmFsICE9PSAndW5kZWZpbmVkJyA/IGZsYWdJbnRlcm5hbCA6IGZhbHNlO1xuICAgICAgICByZW1vdmVDb2xsaW5lYXIgPSB0eXBlb2YgcmVtb3ZlQ29sbGluZWFyICE9PSAndW5kZWZpbmVkJyA/IHJlbW92ZUNvbGxpbmVhciA6IDAuMDE7XG4gICAgICAgIG1pbmltdW1BcmVhID0gdHlwZW9mIG1pbmltdW1BcmVhICE9PSAndW5kZWZpbmVkJyA/IG1pbmltdW1BcmVhIDogMTA7XG5cbiAgICAgICAgaWYgKCF3aW5kb3cuZGVjb21wKSB7XG4gICAgICAgICAgICBDb21tb24ubG9nKCdCb2RpZXMuZnJvbVZlcnRpY2VzOiBwb2x5LWRlY29tcC5qcyByZXF1aXJlZC4gQ291bGQgbm90IGRlY29tcG9zZSB2ZXJ0aWNlcy4gRmFsbGJhY2sgdG8gY29udmV4IGh1bGwuJywgJ3dhcm4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVuc3VyZSB2ZXJ0ZXhTZXRzIGlzIGFuIGFycmF5IG9mIGFycmF5c1xuICAgICAgICBpZiAoIUNvbW1vbi5pc0FycmF5KHZlcnRleFNldHNbMF0pKSB7XG4gICAgICAgICAgICB2ZXJ0ZXhTZXRzID0gW3ZlcnRleFNldHNdO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2ID0gMDsgdiA8IHZlcnRleFNldHMubGVuZ3RoOyB2ICs9IDEpIHtcbiAgICAgICAgICAgIHZlcnRpY2VzID0gdmVydGV4U2V0c1t2XTtcbiAgICAgICAgICAgIGlzQ29udmV4ID0gVmVydGljZXMuaXNDb252ZXgodmVydGljZXMpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb252ZXggfHwgIXdpbmRvdy5kZWNvbXApIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNDb252ZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXMgPSBWZXJ0aWNlcy5jbG9ja3dpc2VTb3J0KHZlcnRpY2VzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBmYWxsYmFjayB0byBjb252ZXggaHVsbCB3aGVuIGRlY29tcG9zaXRpb24gaXMgbm90IHBvc3NpYmxlXG4gICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzID0gVmVydGljZXMuaHVsbCh2ZXJ0aWNlcyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHg6IHgsIHk6IHkgfSxcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXM6IHZlcnRpY2VzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGluaXRpYWxpc2UgYSBkZWNvbXBvc2l0aW9uXG4gICAgICAgICAgICAgICAgdmFyIGNvbmNhdmUgPSBuZXcgZGVjb21wLlBvbHlnb24oKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uY2F2ZS52ZXJ0aWNlcy5wdXNoKFt2ZXJ0aWNlc1tpXS54LCB2ZXJ0aWNlc1tpXS55XSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdmVydGljZXMgYXJlIGNvbmNhdmUgYW5kIHNpbXBsZSwgd2UgY2FuIGRlY29tcG9zZSBpbnRvIHBhcnRzXG4gICAgICAgICAgICAgICAgY29uY2F2ZS5tYWtlQ0NXKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlbW92ZUNvbGxpbmVhciAhPT0gZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgIGNvbmNhdmUucmVtb3ZlQ29sbGluZWFyUG9pbnRzKHJlbW92ZUNvbGxpbmVhcik7XG5cbiAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIHF1aWNrIGRlY29tcG9zaXRpb24gYWxnb3JpdGhtIChCYXlheml0KVxuICAgICAgICAgICAgICAgIHZhciBkZWNvbXBvc2VkID0gY29uY2F2ZS5xdWlja0RlY29tcCgpO1xuXG4gICAgICAgICAgICAgICAgLy8gZm9yIGVhY2ggZGVjb21wb3NlZCBjaHVua1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBkZWNvbXBvc2VkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaHVuayA9IGRlY29tcG9zZWRbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjaHVua1ZlcnRpY2VzID0gW107XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29udmVydCB2ZXJ0aWNlcyBpbnRvIHRoZSBjb3JyZWN0IHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY2h1bmsudmVydGljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rVmVydGljZXMucHVzaCh7IHg6IGNodW5rLnZlcnRpY2VzW2pdWzBdLCB5OiBjaHVuay52ZXJ0aWNlc1tqXVsxXSB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHNraXAgc21hbGwgY2h1bmtzXG4gICAgICAgICAgICAgICAgICAgIGlmIChtaW5pbXVtQXJlYSA+IDAgJiYgVmVydGljZXMuYXJlYShjaHVua1ZlcnRpY2VzKSA8IG1pbmltdW1BcmVhKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGEgY29tcG91bmQgcGFydFxuICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBWZXJ0aWNlcy5jZW50cmUoY2h1bmtWZXJ0aWNlcyksXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlczogY2h1bmtWZXJ0aWNlc1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgYm9keSBwYXJ0c1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhcnRzW2ldID0gQm9keS5jcmVhdGUoQ29tbW9uLmV4dGVuZChwYXJ0c1tpXSwgb3B0aW9ucykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmxhZyBpbnRlcm5hbCBlZGdlcyAoY29pbmNpZGVudCBwYXJ0IGVkZ2VzKVxuICAgICAgICBpZiAoZmxhZ0ludGVybmFsKSB7XG4gICAgICAgICAgICB2YXIgY29pbmNpZGVudF9tYXhfZGlzdCA9IDU7XG5cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0QSA9IHBhcnRzW2ldO1xuXG4gICAgICAgICAgICAgICAgZm9yIChqID0gaSArIDE7IGogPCBwYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFydEIgPSBwYXJ0c1tqXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoQm91bmRzLm92ZXJsYXBzKHBhcnRBLmJvdW5kcywgcGFydEIuYm91bmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhdiA9IHBhcnRBLnZlcnRpY2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBidiA9IHBhcnRCLnZlcnRpY2VzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdGVyYXRlIHZlcnRpY2VzIG9mIGJvdGggcGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBwYXJ0QS52ZXJ0aWNlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoeiA9IDA7IHogPCBwYXJ0Qi52ZXJ0aWNlcy5sZW5ndGg7IHorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmaW5kIGRpc3RhbmNlcyBiZXR3ZWVuIHRoZSB2ZXJ0aWNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGEgPSBWZWN0b3IubWFnbml0dWRlU3F1YXJlZChWZWN0b3Iuc3ViKHBhdlsoayArIDEpICUgcGF2Lmxlbmd0aF0sIHBidlt6XSkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGIgPSBWZWN0b3IubWFnbml0dWRlU3F1YXJlZChWZWN0b3Iuc3ViKHBhdltrXSwgcGJ2Wyh6ICsgMSkgJSBwYnYubGVuZ3RoXSkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIGJvdGggdmVydGljZXMgYXJlIHZlcnkgY2xvc2UsIGNvbnNpZGVyIHRoZSBlZGdlIGNvbmNpZGVudCAoaW50ZXJuYWwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYSA8IGNvaW5jaWRlbnRfbWF4X2Rpc3QgJiYgZGIgPCBjb2luY2lkZW50X21heF9kaXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXZba10uaXNJbnRlcm5hbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYnZbel0uaXNJbnRlcm5hbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgdGhlIHBhcmVudCBib2R5IHRvIGJlIHJldHVybmVkLCB0aGF0IGNvbnRhaW5zIGdlbmVyYXRlZCBjb21wb3VuZCBwYXJ0c1xuICAgICAgICAgICAgYm9keSA9IEJvZHkuY3JlYXRlKENvbW1vbi5leHRlbmQoeyBwYXJ0czogcGFydHMuc2xpY2UoMCkgfSwgb3B0aW9ucykpO1xuICAgICAgICAgICAgQm9keS5zZXRQb3NpdGlvbihib2R5LCB7IHg6IHgsIHk6IHkgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBib2R5O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnRzWzBdO1xuICAgICAgICB9XG4gICAgfTtcblxufSkoKTsiLCIvKipcbiogVGhlIGBNYXR0ZXIuQ29tcG9zaXRlc2AgbW9kdWxlIGNvbnRhaW5zIGZhY3RvcnkgbWV0aG9kcyBmb3IgY3JlYXRpbmcgY29tcG9zaXRlIGJvZGllc1xuKiB3aXRoIGNvbW1vbmx5IHVzZWQgY29uZmlndXJhdGlvbnMgKHN1Y2ggYXMgc3RhY2tzIGFuZCBjaGFpbnMpLlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgQ29tcG9zaXRlc1xuKi9cblxudmFyIENvbXBvc2l0ZXMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGVzO1xuXG52YXIgQ29tcG9zaXRlID0gcmVxdWlyZSgnLi4vYm9keS9Db21wb3NpdGUnKTtcbnZhciBDb25zdHJhaW50ID0gcmVxdWlyZSgnLi4vY29uc3RyYWludC9Db25zdHJhaW50Jyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBCb2R5ID0gcmVxdWlyZSgnLi4vYm9keS9Cb2R5Jyk7XG52YXIgQm9kaWVzID0gcmVxdWlyZSgnLi9Cb2RpZXMnKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IGNvbXBvc2l0ZSBjb250YWluaW5nIGJvZGllcyBjcmVhdGVkIGluIHRoZSBjYWxsYmFjayBpbiBhIGdyaWQgYXJyYW5nZW1lbnQuXG4gICAgICogVGhpcyBmdW5jdGlvbiB1c2VzIHRoZSBib2R5J3MgYm91bmRzIHRvIHByZXZlbnQgb3ZlcmxhcHMuXG4gICAgICogQG1ldGhvZCBzdGFja1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4eFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd3NcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uR2FwXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd0dhcFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBBIG5ldyBjb21wb3NpdGUgY29udGFpbmluZyBvYmplY3RzIGNyZWF0ZWQgaW4gdGhlIGNhbGxiYWNrXG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5zdGFjayA9IGZ1bmN0aW9uKHh4LCB5eSwgY29sdW1ucywgcm93cywgY29sdW1uR2FwLCByb3dHYXAsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzdGFjayA9IENvbXBvc2l0ZS5jcmVhdGUoeyBsYWJlbDogJ1N0YWNrJyB9KSxcbiAgICAgICAgICAgIHggPSB4eCxcbiAgICAgICAgICAgIHkgPSB5eSxcbiAgICAgICAgICAgIGxhc3RCb2R5LFxuICAgICAgICAgICAgaSA9IDA7XG5cbiAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgcm93czsgcm93KyspIHtcbiAgICAgICAgICAgIHZhciBtYXhIZWlnaHQgPSAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKHZhciBjb2x1bW4gPSAwOyBjb2x1bW4gPCBjb2x1bW5zOyBjb2x1bW4rKykge1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gY2FsbGJhY2soeCwgeSwgY29sdW1uLCByb3csIGxhc3RCb2R5LCBpKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJvZHlIZWlnaHQgPSBib2R5LmJvdW5kcy5tYXgueSAtIGJvZHkuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9keVdpZHRoID0gYm9keS5ib3VuZHMubWF4LnggLSBib2R5LmJvdW5kcy5taW4ueDsgXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJvZHlIZWlnaHQgPiBtYXhIZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhIZWlnaHQgPSBib2R5SGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgQm9keS50cmFuc2xhdGUoYm9keSwgeyB4OiBib2R5V2lkdGggKiAwLjUsIHk6IGJvZHlIZWlnaHQgKiAwLjUgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgeCA9IGJvZHkuYm91bmRzLm1heC54ICsgY29sdW1uR2FwO1xuXG4gICAgICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRCb2R5KHN0YWNrLCBib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxhc3RCb2R5ID0gYm9keTtcbiAgICAgICAgICAgICAgICAgICAgaSArPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHggKz0gY29sdW1uR2FwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgeSArPSBtYXhIZWlnaHQgKyByb3dHYXA7XG4gICAgICAgICAgICB4ID0geHg7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3RhY2s7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGFpbnMgYWxsIGJvZGllcyBpbiB0aGUgZ2l2ZW4gY29tcG9zaXRlIHRvZ2V0aGVyIHVzaW5nIGNvbnN0cmFpbnRzLlxuICAgICAqIEBtZXRob2QgY2hhaW5cbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhPZmZzZXRBXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlPZmZzZXRBXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhPZmZzZXRCXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlPZmZzZXRCXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZSBjb250YWluaW5nIG9iamVjdHMgY2hhaW5lZCB0b2dldGhlciB3aXRoIGNvbnN0cmFpbnRzXG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5jaGFpbiA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgeE9mZnNldEEsIHlPZmZzZXRBLCB4T2Zmc2V0QiwgeU9mZnNldEIsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGJvZGllcyA9IGNvbXBvc2l0ZS5ib2RpZXM7XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHlBID0gYm9kaWVzW2kgLSAxXSxcbiAgICAgICAgICAgICAgICBib2R5QiA9IGJvZGllc1tpXSxcbiAgICAgICAgICAgICAgICBib2R5QUhlaWdodCA9IGJvZHlBLmJvdW5kcy5tYXgueSAtIGJvZHlBLmJvdW5kcy5taW4ueSxcbiAgICAgICAgICAgICAgICBib2R5QVdpZHRoID0gYm9keUEuYm91bmRzLm1heC54IC0gYm9keUEuYm91bmRzLm1pbi54LCBcbiAgICAgICAgICAgICAgICBib2R5QkhlaWdodCA9IGJvZHlCLmJvdW5kcy5tYXgueSAtIGJvZHlCLmJvdW5kcy5taW4ueSxcbiAgICAgICAgICAgICAgICBib2R5QldpZHRoID0gYm9keUIuYm91bmRzLm1heC54IC0gYm9keUIuYm91bmRzLm1pbi54O1xuICAgICAgICBcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICBib2R5QTogYm9keUEsXG4gICAgICAgICAgICAgICAgcG9pbnRBOiB7IHg6IGJvZHlBV2lkdGggKiB4T2Zmc2V0QSwgeTogYm9keUFIZWlnaHQgKiB5T2Zmc2V0QSB9LFxuICAgICAgICAgICAgICAgIGJvZHlCOiBib2R5QixcbiAgICAgICAgICAgICAgICBwb2ludEI6IHsgeDogYm9keUJXaWR0aCAqIHhPZmZzZXRCLCB5OiBib2R5QkhlaWdodCAqIHlPZmZzZXRCIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBjb25zdHJhaW50ID0gQ29tbW9uLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY29tcG9zaXRlLCBDb25zdHJhaW50LmNyZWF0ZShjb25zdHJhaW50KSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb21wb3NpdGUubGFiZWwgKz0gJyBDaGFpbic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb25uZWN0cyBib2RpZXMgaW4gdGhlIGNvbXBvc2l0ZSB3aXRoIGNvbnN0cmFpbnRzIGluIGEgZ3JpZCBwYXR0ZXJuLCB3aXRoIG9wdGlvbmFsIGNyb3NzIGJyYWNlcy5cbiAgICAgKiBAbWV0aG9kIG1lc2hcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm93c1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gY3Jvc3NCcmFjZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgY29tcG9zaXRlIGNvbnRhaW5pbmcgb2JqZWN0cyBtZXNoZWQgdG9nZXRoZXIgd2l0aCBjb25zdHJhaW50c1xuICAgICAqL1xuICAgIENvbXBvc2l0ZXMubWVzaCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgY29sdW1ucywgcm93cywgY3Jvc3NCcmFjZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgYm9kaWVzID0gY29tcG9zaXRlLmJvZGllcyxcbiAgICAgICAgICAgIHJvdyxcbiAgICAgICAgICAgIGNvbCxcbiAgICAgICAgICAgIGJvZHlBLFxuICAgICAgICAgICAgYm9keUIsXG4gICAgICAgICAgICBib2R5QztcbiAgICAgICAgXG4gICAgICAgIGZvciAocm93ID0gMDsgcm93IDwgcm93czsgcm93KyspIHtcbiAgICAgICAgICAgIGZvciAoY29sID0gMTsgY29sIDwgY29sdW1uczsgY29sKyspIHtcbiAgICAgICAgICAgICAgICBib2R5QSA9IGJvZGllc1soY29sIC0gMSkgKyAocm93ICogY29sdW1ucyldO1xuICAgICAgICAgICAgICAgIGJvZHlCID0gYm9kaWVzW2NvbCArIChyb3cgKiBjb2x1bW5zKV07XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY29tcG9zaXRlLCBDb25zdHJhaW50LmNyZWF0ZShDb21tb24uZXh0ZW5kKHsgYm9keUE6IGJvZHlBLCBib2R5QjogYm9keUIgfSwgb3B0aW9ucykpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJvdyA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbCA9IDA7IGNvbCA8IGNvbHVtbnM7IGNvbCsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHlBID0gYm9kaWVzW2NvbCArICgocm93IC0gMSkgKiBjb2x1bW5zKV07XG4gICAgICAgICAgICAgICAgICAgIGJvZHlCID0gYm9kaWVzW2NvbCArIChyb3cgKiBjb2x1bW5zKV07XG4gICAgICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNvbXBvc2l0ZSwgQ29uc3RyYWludC5jcmVhdGUoQ29tbW9uLmV4dGVuZCh7IGJvZHlBOiBib2R5QSwgYm9keUI6IGJvZHlCIH0sIG9wdGlvbnMpKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNyb3NzQnJhY2UgJiYgY29sID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUMgPSBib2RpZXNbKGNvbCAtIDEpICsgKChyb3cgLSAxKSAqIGNvbHVtbnMpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNvbXBvc2l0ZSwgQ29uc3RyYWludC5jcmVhdGUoQ29tbW9uLmV4dGVuZCh7IGJvZHlBOiBib2R5QywgYm9keUI6IGJvZHlCIH0sIG9wdGlvbnMpKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoY3Jvc3NCcmFjZSAmJiBjb2wgPCBjb2x1bW5zIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUMgPSBib2RpZXNbKGNvbCArIDEpICsgKChyb3cgLSAxKSAqIGNvbHVtbnMpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNvbXBvc2l0ZSwgQ29uc3RyYWludC5jcmVhdGUoQ29tbW9uLmV4dGVuZCh7IGJvZHlBOiBib2R5QywgYm9keUI6IGJvZHlCIH0sIG9wdGlvbnMpKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb21wb3NpdGUubGFiZWwgKz0gJyBNZXNoJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgY29tcG9zaXRlIGNvbnRhaW5pbmcgYm9kaWVzIGNyZWF0ZWQgaW4gdGhlIGNhbGxiYWNrIGluIGEgcHlyYW1pZCBhcnJhbmdlbWVudC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIHVzZXMgdGhlIGJvZHkncyBib3VuZHMgdG8gcHJldmVudCBvdmVybGFwcy5cbiAgICAgKiBAbWV0aG9kIHB5cmFtaWRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geXlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByb3dzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbkdhcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByb3dHYXBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gQSBuZXcgY29tcG9zaXRlIGNvbnRhaW5pbmcgb2JqZWN0cyBjcmVhdGVkIGluIHRoZSBjYWxsYmFja1xuICAgICAqL1xuICAgIENvbXBvc2l0ZXMucHlyYW1pZCA9IGZ1bmN0aW9uKHh4LCB5eSwgY29sdW1ucywgcm93cywgY29sdW1uR2FwLCByb3dHYXAsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBDb21wb3NpdGVzLnN0YWNrKHh4LCB5eSwgY29sdW1ucywgcm93cywgY29sdW1uR2FwLCByb3dHYXAsIGZ1bmN0aW9uKHgsIHksIGNvbHVtbiwgcm93LCBsYXN0Qm9keSwgaSkge1xuICAgICAgICAgICAgdmFyIGFjdHVhbFJvd3MgPSBNYXRoLm1pbihyb3dzLCBNYXRoLmNlaWwoY29sdW1ucyAvIDIpKSxcbiAgICAgICAgICAgICAgICBsYXN0Qm9keVdpZHRoID0gbGFzdEJvZHkgPyBsYXN0Qm9keS5ib3VuZHMubWF4LnggLSBsYXN0Qm9keS5ib3VuZHMubWluLnggOiAwO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocm93ID4gYWN0dWFsUm93cylcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHJldmVyc2Ugcm93IG9yZGVyXG4gICAgICAgICAgICByb3cgPSBhY3R1YWxSb3dzIC0gcm93O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSByb3csXG4gICAgICAgICAgICAgICAgZW5kID0gY29sdW1ucyAtIDEgLSByb3c7XG5cbiAgICAgICAgICAgIGlmIChjb2x1bW4gPCBzdGFydCB8fCBjb2x1bW4gPiBlbmQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyByZXRyb2FjdGl2ZWx5IGZpeCB0aGUgZmlyc3QgYm9keSdzIHBvc2l0aW9uLCBzaW5jZSB3aWR0aCB3YXMgdW5rbm93blxuICAgICAgICAgICAgaWYgKGkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBCb2R5LnRyYW5zbGF0ZShsYXN0Qm9keSwgeyB4OiAoY29sdW1uICsgKGNvbHVtbnMgJSAyID09PSAxID8gMSA6IC0xKSkgKiBsYXN0Qm9keVdpZHRoLCB5OiAwIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgeE9mZnNldCA9IGxhc3RCb2R5ID8gY29sdW1uICogbGFzdEJvZHlXaWR0aCA6IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayh4eCArIHhPZmZzZXQgKyBjb2x1bW4gKiBjb2x1bW5HYXAsIHksIGNvbHVtbiwgcm93LCBsYXN0Qm9keSwgaSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgY29tcG9zaXRlIHdpdGggYSBOZXd0b24ncyBDcmFkbGUgc2V0dXAgb2YgYm9kaWVzIGFuZCBjb25zdHJhaW50cy5cbiAgICAgKiBAbWV0aG9kIG5ld3RvbnNDcmFkbGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geXlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbnVtYmVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNpemVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGVuZ3RoXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBBIG5ldyBjb21wb3NpdGUgbmV3dG9uc0NyYWRsZSBib2R5XG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5uZXd0b25zQ3JhZGxlID0gZnVuY3Rpb24oeHgsIHl5LCBudW1iZXIsIHNpemUsIGxlbmd0aCkge1xuICAgICAgICB2YXIgbmV3dG9uc0NyYWRsZSA9IENvbXBvc2l0ZS5jcmVhdGUoeyBsYWJlbDogJ05ld3RvbnMgQ3JhZGxlJyB9KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bWJlcjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2VwYXJhdGlvbiA9IDEuOSxcbiAgICAgICAgICAgICAgICBjaXJjbGUgPSBCb2RpZXMuY2lyY2xlKHh4ICsgaSAqIChzaXplICogc2VwYXJhdGlvbiksIHl5ICsgbGVuZ3RoLCBzaXplLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IGluZXJ0aWE6IEluZmluaXR5LCByZXN0aXR1dGlvbjogMSwgZnJpY3Rpb246IDAsIGZyaWN0aW9uQWlyOiAwLjAwMDEsIHNsb3A6IDEgfSksXG4gICAgICAgICAgICAgICAgY29uc3RyYWludCA9IENvbnN0cmFpbnQuY3JlYXRlKHsgcG9pbnRBOiB7IHg6IHh4ICsgaSAqIChzaXplICogc2VwYXJhdGlvbiksIHk6IHl5IH0sIGJvZHlCOiBjaXJjbGUgfSk7XG5cbiAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRCb2R5KG5ld3RvbnNDcmFkbGUsIGNpcmNsZSk7XG4gICAgICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChuZXd0b25zQ3JhZGxlLCBjb25zdHJhaW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXd0b25zQ3JhZGxlO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGNvbXBvc2l0ZSB3aXRoIHNpbXBsZSBjYXIgc2V0dXAgb2YgYm9kaWVzIGFuZCBjb25zdHJhaW50cy5cbiAgICAgKiBAbWV0aG9kIGNhclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4eFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2hlZWxTaXplXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBBIG5ldyBjb21wb3NpdGUgY2FyIGJvZHlcbiAgICAgKi9cbiAgICBDb21wb3NpdGVzLmNhciA9IGZ1bmN0aW9uKHh4LCB5eSwgd2lkdGgsIGhlaWdodCwgd2hlZWxTaXplKSB7XG4gICAgICAgIHZhciBncm91cCA9IEJvZHkubmV4dEdyb3VwKHRydWUpLFxuICAgICAgICAgICAgd2hlZWxCYXNlID0gLTIwLFxuICAgICAgICAgICAgd2hlZWxBT2Zmc2V0ID0gLXdpZHRoICogMC41ICsgd2hlZWxCYXNlLFxuICAgICAgICAgICAgd2hlZWxCT2Zmc2V0ID0gd2lkdGggKiAwLjUgLSB3aGVlbEJhc2UsXG4gICAgICAgICAgICB3aGVlbFlPZmZzZXQgPSAwO1xuICAgIFxuICAgICAgICB2YXIgY2FyID0gQ29tcG9zaXRlLmNyZWF0ZSh7IGxhYmVsOiAnQ2FyJyB9KSxcbiAgICAgICAgICAgIGJvZHkgPSBCb2RpZXMudHJhcGV6b2lkKHh4LCB5eSwgd2lkdGgsIGhlaWdodCwgMC4zLCB7IFxuICAgICAgICAgICAgICAgIGNvbGxpc2lvbkZpbHRlcjoge1xuICAgICAgICAgICAgICAgICAgICBncm91cDogZ3JvdXBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZyaWN0aW9uOiAwLjAxLFxuICAgICAgICAgICAgICAgIGNoYW1mZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgcmFkaXVzOiAxMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgIFxuICAgICAgICB2YXIgd2hlZWxBID0gQm9kaWVzLmNpcmNsZSh4eCArIHdoZWVsQU9mZnNldCwgeXkgKyB3aGVlbFlPZmZzZXQsIHdoZWVsU2l6ZSwgeyBcbiAgICAgICAgICAgIGNvbGxpc2lvbkZpbHRlcjoge1xuICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyaWN0aW9uOiAwLjgsXG4gICAgICAgICAgICBkZW5zaXR5OiAwLjAxXG4gICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIHdoZWVsQiA9IEJvZGllcy5jaXJjbGUoeHggKyB3aGVlbEJPZmZzZXQsIHl5ICsgd2hlZWxZT2Zmc2V0LCB3aGVlbFNpemUsIHsgXG4gICAgICAgICAgICBjb2xsaXNpb25GaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICBncm91cDogZ3JvdXBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmcmljdGlvbjogMC44LFxuICAgICAgICAgICAgZGVuc2l0eTogMC4wMVxuICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHZhciBheGVsQSA9IENvbnN0cmFpbnQuY3JlYXRlKHtcbiAgICAgICAgICAgIGJvZHlBOiBib2R5LFxuICAgICAgICAgICAgcG9pbnRBOiB7IHg6IHdoZWVsQU9mZnNldCwgeTogd2hlZWxZT2Zmc2V0IH0sXG4gICAgICAgICAgICBib2R5Qjogd2hlZWxBLFxuICAgICAgICAgICAgc3RpZmZuZXNzOiAwLjJcbiAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIGF4ZWxCID0gQ29uc3RyYWludC5jcmVhdGUoe1xuICAgICAgICAgICAgYm9keUE6IGJvZHksXG4gICAgICAgICAgICBwb2ludEE6IHsgeDogd2hlZWxCT2Zmc2V0LCB5OiB3aGVlbFlPZmZzZXQgfSxcbiAgICAgICAgICAgIGJvZHlCOiB3aGVlbEIsXG4gICAgICAgICAgICBzdGlmZm5lc3M6IDAuMlxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIENvbXBvc2l0ZS5hZGRCb2R5KGNhciwgYm9keSk7XG4gICAgICAgIENvbXBvc2l0ZS5hZGRCb2R5KGNhciwgd2hlZWxBKTtcbiAgICAgICAgQ29tcG9zaXRlLmFkZEJvZHkoY2FyLCB3aGVlbEIpO1xuICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjYXIsIGF4ZWxBKTtcbiAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY2FyLCBheGVsQik7XG5cbiAgICAgICAgcmV0dXJuIGNhcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIHNpbXBsZSBzb2Z0IGJvZHkgbGlrZSBvYmplY3QuXG4gICAgICogQG1ldGhvZCBzb2Z0Qm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4eFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd3NcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uR2FwXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd0dhcFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gY3Jvc3NCcmFjZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwYXJ0aWNsZVJhZGl1c1xuICAgICAqIEBwYXJhbSB7fSBwYXJ0aWNsZU9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge30gY29uc3RyYWludE9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZSBzb2Z0Qm9keVxuICAgICAqL1xuICAgIENvbXBvc2l0ZXMuc29mdEJvZHkgPSBmdW5jdGlvbih4eCwgeXksIGNvbHVtbnMsIHJvd3MsIGNvbHVtbkdhcCwgcm93R2FwLCBjcm9zc0JyYWNlLCBwYXJ0aWNsZVJhZGl1cywgcGFydGljbGVPcHRpb25zLCBjb25zdHJhaW50T3B0aW9ucykge1xuICAgICAgICBwYXJ0aWNsZU9wdGlvbnMgPSBDb21tb24uZXh0ZW5kKHsgaW5lcnRpYTogSW5maW5pdHkgfSwgcGFydGljbGVPcHRpb25zKTtcbiAgICAgICAgY29uc3RyYWludE9wdGlvbnMgPSBDb21tb24uZXh0ZW5kKHsgc3RpZmZuZXNzOiAwLjQgfSwgY29uc3RyYWludE9wdGlvbnMpO1xuXG4gICAgICAgIHZhciBzb2Z0Qm9keSA9IENvbXBvc2l0ZXMuc3RhY2soeHgsIHl5LCBjb2x1bW5zLCByb3dzLCBjb2x1bW5HYXAsIHJvd0dhcCwgZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICAgICAgcmV0dXJuIEJvZGllcy5jaXJjbGUoeCwgeSwgcGFydGljbGVSYWRpdXMsIHBhcnRpY2xlT3B0aW9ucyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIENvbXBvc2l0ZXMubWVzaChzb2Z0Qm9keSwgY29sdW1ucywgcm93cywgY3Jvc3NCcmFjZSwgY29uc3RyYWludE9wdGlvbnMpO1xuXG4gICAgICAgIHNvZnRCb2R5LmxhYmVsID0gJ1NvZnQgQm9keSc7XG5cbiAgICAgICAgcmV0dXJuIHNvZnRCb2R5O1xuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuQXhlc2AgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgc2V0cyBvZiBheGVzLlxuKlxuKiBAY2xhc3MgQXhlc1xuKi9cblxudmFyIEF4ZXMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBBeGVzO1xuXG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVjdG9yJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBzZXQgb2YgYXhlcyBmcm9tIHRoZSBnaXZlbiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIGZyb21WZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHJldHVybiB7YXhlc30gQSBuZXcgYXhlcyBmcm9tIHRoZSBnaXZlbiB2ZXJ0aWNlc1xuICAgICAqL1xuICAgIEF4ZXMuZnJvbVZlcnRpY2VzID0gZnVuY3Rpb24odmVydGljZXMpIHtcbiAgICAgICAgdmFyIGF4ZXMgPSB7fTtcblxuICAgICAgICAvLyBmaW5kIHRoZSB1bmlxdWUgYXhlcywgdXNpbmcgZWRnZSBub3JtYWwgZ3JhZGllbnRzXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBqID0gKGkgKyAxKSAlIHZlcnRpY2VzLmxlbmd0aCwgXG4gICAgICAgICAgICAgICAgbm9ybWFsID0gVmVjdG9yLm5vcm1hbGlzZSh7IFxuICAgICAgICAgICAgICAgICAgICB4OiB2ZXJ0aWNlc1tqXS55IC0gdmVydGljZXNbaV0ueSwgXG4gICAgICAgICAgICAgICAgICAgIHk6IHZlcnRpY2VzW2ldLnggLSB2ZXJ0aWNlc1tqXS54XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgZ3JhZGllbnQgPSAobm9ybWFsLnkgPT09IDApID8gSW5maW5pdHkgOiAobm9ybWFsLnggLyBub3JtYWwueSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGxpbWl0IHByZWNpc2lvblxuICAgICAgICAgICAgZ3JhZGllbnQgPSBncmFkaWVudC50b0ZpeGVkKDMpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBheGVzW2dyYWRpZW50XSA9IG5vcm1hbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBDb21tb24udmFsdWVzKGF4ZXMpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSb3RhdGVzIGEgc2V0IG9mIGF4ZXMgYnkgdGhlIGdpdmVuIGFuZ2xlLlxuICAgICAqIEBtZXRob2Qgcm90YXRlXG4gICAgICogQHBhcmFtIHtheGVzfSBheGVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlXG4gICAgICovXG4gICAgQXhlcy5yb3RhdGUgPSBmdW5jdGlvbihheGVzLCBhbmdsZSkge1xuICAgICAgICBpZiAoYW5nbGUgPT09IDApXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIFxuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MoYW5nbGUpLFxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGF4aXMgPSBheGVzW2ldLFxuICAgICAgICAgICAgICAgIHh4O1xuICAgICAgICAgICAgeHggPSBheGlzLnggKiBjb3MgLSBheGlzLnkgKiBzaW47XG4gICAgICAgICAgICBheGlzLnkgPSBheGlzLnggKiBzaW4gKyBheGlzLnkgKiBjb3M7XG4gICAgICAgICAgICBheGlzLnggPSB4eDtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuQm91bmRzYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBheGlzLWFsaWduZWQgYm91bmRpbmcgYm94ZXMgKEFBQkIpLlxuKlxuKiBAY2xhc3MgQm91bmRzXG4qL1xuXG52YXIgQm91bmRzID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gQm91bmRzO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3ggKEFBQkIpIGZvciB0aGUgZ2l2ZW4gdmVydGljZXMuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEByZXR1cm4ge2JvdW5kc30gQSBuZXcgYm91bmRzIG9iamVjdFxuICAgICAqL1xuICAgIEJvdW5kcy5jcmVhdGUgPSBmdW5jdGlvbih2ZXJ0aWNlcykge1xuICAgICAgICB2YXIgYm91bmRzID0geyBcbiAgICAgICAgICAgIG1pbjogeyB4OiAwLCB5OiAwIH0sIFxuICAgICAgICAgICAgbWF4OiB7IHg6IDAsIHk6IDAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh2ZXJ0aWNlcylcbiAgICAgICAgICAgIEJvdW5kcy51cGRhdGUoYm91bmRzLCB2ZXJ0aWNlcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYm91bmRzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIGJvdW5kcyB1c2luZyB0aGUgZ2l2ZW4gdmVydGljZXMgYW5kIGV4dGVuZHMgdGhlIGJvdW5kcyBnaXZlbiBhIHZlbG9jaXR5LlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc1xuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlbG9jaXR5XG4gICAgICovXG4gICAgQm91bmRzLnVwZGF0ZSA9IGZ1bmN0aW9uKGJvdW5kcywgdmVydGljZXMsIHZlbG9jaXR5KSB7XG4gICAgICAgIGJvdW5kcy5taW4ueCA9IEluZmluaXR5O1xuICAgICAgICBib3VuZHMubWF4LnggPSAtSW5maW5pdHk7XG4gICAgICAgIGJvdW5kcy5taW4ueSA9IEluZmluaXR5O1xuICAgICAgICBib3VuZHMubWF4LnkgPSAtSW5maW5pdHk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHZlcnRleCA9IHZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgaWYgKHZlcnRleC54ID4gYm91bmRzLm1heC54KSBib3VuZHMubWF4LnggPSB2ZXJ0ZXgueDtcbiAgICAgICAgICAgIGlmICh2ZXJ0ZXgueCA8IGJvdW5kcy5taW4ueCkgYm91bmRzLm1pbi54ID0gdmVydGV4Lng7XG4gICAgICAgICAgICBpZiAodmVydGV4LnkgPiBib3VuZHMubWF4LnkpIGJvdW5kcy5tYXgueSA9IHZlcnRleC55O1xuICAgICAgICAgICAgaWYgKHZlcnRleC55IDwgYm91bmRzLm1pbi55KSBib3VuZHMubWluLnkgPSB2ZXJ0ZXgueTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHZlbG9jaXR5KSB7XG4gICAgICAgICAgICBpZiAodmVsb2NpdHkueCA+IDApIHtcbiAgICAgICAgICAgICAgICBib3VuZHMubWF4LnggKz0gdmVsb2NpdHkueDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYm91bmRzLm1pbi54ICs9IHZlbG9jaXR5Lng7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh2ZWxvY2l0eS55ID4gMCkge1xuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXgueSArPSB2ZWxvY2l0eS55O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBib3VuZHMubWluLnkgKz0gdmVsb2NpdHkueTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGJvdW5kcyBjb250YWlucyB0aGUgZ2l2ZW4gcG9pbnQuXG4gICAgICogQG1ldGhvZCBjb250YWluc1xuICAgICAqIEBwYXJhbSB7Ym91bmRzfSBib3VuZHNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHRoZSBib3VuZHMgY29udGFpbiB0aGUgcG9pbnQsIG90aGVyd2lzZSBmYWxzZVxuICAgICAqL1xuICAgIEJvdW5kcy5jb250YWlucyA9IGZ1bmN0aW9uKGJvdW5kcywgcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHBvaW50LnggPj0gYm91bmRzLm1pbi54ICYmIHBvaW50LnggPD0gYm91bmRzLm1heC54IFxuICAgICAgICAgICAgICAgJiYgcG9pbnQueSA+PSBib3VuZHMubWluLnkgJiYgcG9pbnQueSA8PSBib3VuZHMubWF4Lnk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgdHdvIGJvdW5kcyBpbnRlcnNlY3QuXG4gICAgICogQG1ldGhvZCBvdmVybGFwc1xuICAgICAqIEBwYXJhbSB7Ym91bmRzfSBib3VuZHNBXG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc0JcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHRoZSBib3VuZHMgb3ZlcmxhcCwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgICovXG4gICAgQm91bmRzLm92ZXJsYXBzID0gZnVuY3Rpb24oYm91bmRzQSwgYm91bmRzQikge1xuICAgICAgICByZXR1cm4gKGJvdW5kc0EubWluLnggPD0gYm91bmRzQi5tYXgueCAmJiBib3VuZHNBLm1heC54ID49IGJvdW5kc0IubWluLnhcbiAgICAgICAgICAgICAgICAmJiBib3VuZHNBLm1heC55ID49IGJvdW5kc0IubWluLnkgJiYgYm91bmRzQS5taW4ueSA8PSBib3VuZHNCLm1heC55KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVHJhbnNsYXRlcyB0aGUgYm91bmRzIGJ5IHRoZSBnaXZlbiB2ZWN0b3IuXG4gICAgICogQG1ldGhvZCB0cmFuc2xhdGVcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gYm91bmRzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqL1xuICAgIEJvdW5kcy50cmFuc2xhdGUgPSBmdW5jdGlvbihib3VuZHMsIHZlY3Rvcikge1xuICAgICAgICBib3VuZHMubWluLnggKz0gdmVjdG9yLng7XG4gICAgICAgIGJvdW5kcy5tYXgueCArPSB2ZWN0b3IueDtcbiAgICAgICAgYm91bmRzLm1pbi55ICs9IHZlY3Rvci55O1xuICAgICAgICBib3VuZHMubWF4LnkgKz0gdmVjdG9yLnk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNoaWZ0cyB0aGUgYm91bmRzIHRvIHRoZSBnaXZlbiBwb3NpdGlvbi5cbiAgICAgKiBAbWV0aG9kIHNoaWZ0XG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBwb3NpdGlvblxuICAgICAqL1xuICAgIEJvdW5kcy5zaGlmdCA9IGZ1bmN0aW9uKGJvdW5kcywgcG9zaXRpb24pIHtcbiAgICAgICAgdmFyIGRlbHRhWCA9IGJvdW5kcy5tYXgueCAtIGJvdW5kcy5taW4ueCxcbiAgICAgICAgICAgIGRlbHRhWSA9IGJvdW5kcy5tYXgueSAtIGJvdW5kcy5taW4ueTtcbiAgICAgICAgICAgIFxuICAgICAgICBib3VuZHMubWluLnggPSBwb3NpdGlvbi54O1xuICAgICAgICBib3VuZHMubWF4LnggPSBwb3NpdGlvbi54ICsgZGVsdGFYO1xuICAgICAgICBib3VuZHMubWluLnkgPSBwb3NpdGlvbi55O1xuICAgICAgICBib3VuZHMubWF4LnkgPSBwb3NpdGlvbi55ICsgZGVsdGFZO1xuICAgIH07XG4gICAgXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlN2Z2AgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNvbnZlcnRpbmcgU1ZHIGltYWdlcyBpbnRvIGFuIGFycmF5IG9mIHZlY3RvciBwb2ludHMuXG4qXG4qIFRvIHVzZSB0aGlzIG1vZHVsZSB5b3UgYWxzbyBuZWVkIHRoZSBTVkdQYXRoU2VnIHBvbHlmaWxsOiBodHRwczovL2dpdGh1Yi5jb20vcHJvZ2Vycy9wYXRoc2VnXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBTdmdcbiovXG5cbnZhciBTdmcgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdmc7XG5cbnZhciBCb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYW4gU1ZHIHBhdGggaW50byBhbiBhcnJheSBvZiB2ZWN0b3IgcG9pbnRzLlxuICAgICAqIElmIHRoZSBpbnB1dCBwYXRoIGZvcm1zIGEgY29uY2F2ZSBzaGFwZSwgeW91IG11c3QgZGVjb21wb3NlIHRoZSByZXN1bHQgaW50byBjb252ZXggcGFydHMgYmVmb3JlIHVzZS5cbiAgICAgKiBTZWUgYEJvZGllcy5mcm9tVmVydGljZXNgIHdoaWNoIHByb3ZpZGVzIHN1cHBvcnQgZm9yIHRoaXMuXG4gICAgICogTm90ZSB0aGF0IHRoaXMgZnVuY3Rpb24gaXMgbm90IGd1YXJhbnRlZWQgdG8gc3VwcG9ydCBjb21wbGV4IHBhdGhzIChzdWNoIGFzIHRob3NlIHdpdGggaG9sZXMpLlxuICAgICAqIEBtZXRob2QgcGF0aFRvVmVydGljZXNcbiAgICAgKiBAcGFyYW0ge1NWR1BhdGhFbGVtZW50fSBwYXRoXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtzYW1wbGVMZW5ndGg9MTVdXG4gICAgICogQHJldHVybiB7VmVjdG9yW119IHBvaW50c1xuICAgICAqL1xuICAgIFN2Zy5wYXRoVG9WZXJ0aWNlcyA9IGZ1bmN0aW9uKHBhdGgsIHNhbXBsZUxlbmd0aCkge1xuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vd291dC9zdmcudG9wb2x5LmpzL2Jsb2IvbWFzdGVyL3N2Zy50b3BvbHkuanNcbiAgICAgICAgdmFyIGksIGlsLCB0b3RhbCwgcG9pbnQsIHNlZ21lbnQsIHNlZ21lbnRzLCBcbiAgICAgICAgICAgIHNlZ21lbnRzUXVldWUsIGxhc3RTZWdtZW50LCBcbiAgICAgICAgICAgIGxhc3RQb2ludCwgc2VnbWVudEluZGV4LCBwb2ludHMgPSBbXSxcbiAgICAgICAgICAgIGx4LCBseSwgbGVuZ3RoID0gMCwgeCA9IDAsIHkgPSAwO1xuXG4gICAgICAgIHNhbXBsZUxlbmd0aCA9IHNhbXBsZUxlbmd0aCB8fCAxNTtcblxuICAgICAgICB2YXIgYWRkUG9pbnQgPSBmdW5jdGlvbihweCwgcHksIHBhdGhTZWdUeXBlKSB7XG4gICAgICAgICAgICAvLyBhbGwgb2RkLW51bWJlcmVkIHBhdGggdHlwZXMgYXJlIHJlbGF0aXZlIGV4Y2VwdCBQQVRIU0VHX0NMT1NFUEFUSCAoMSlcbiAgICAgICAgICAgIHZhciBpc1JlbGF0aXZlID0gcGF0aFNlZ1R5cGUgJSAyID09PSAxICYmIHBhdGhTZWdUeXBlID4gMTtcblxuICAgICAgICAgICAgLy8gd2hlbiB0aGUgbGFzdCBwb2ludCBkb2Vzbid0IGVxdWFsIHRoZSBjdXJyZW50IHBvaW50IGFkZCB0aGUgY3VycmVudCBwb2ludFxuICAgICAgICAgICAgaWYgKCFsYXN0UG9pbnQgfHwgcHggIT0gbGFzdFBvaW50LnggfHwgcHkgIT0gbGFzdFBvaW50LnkpIHtcbiAgICAgICAgICAgICAgICBpZiAobGFzdFBvaW50ICYmIGlzUmVsYXRpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbHggPSBsYXN0UG9pbnQueDtcbiAgICAgICAgICAgICAgICAgICAgbHkgPSBsYXN0UG9pbnQueTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBseCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGx5ID0gMDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIHg6IGx4ICsgcHgsXG4gICAgICAgICAgICAgICAgICAgIHk6IGx5ICsgcHlcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gc2V0IGxhc3QgcG9pbnRcbiAgICAgICAgICAgICAgICBpZiAoaXNSZWxhdGl2ZSB8fCAhbGFzdFBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RQb2ludCA9IHBvaW50O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHBvaW50KTtcblxuICAgICAgICAgICAgICAgIHggPSBseCArIHB4O1xuICAgICAgICAgICAgICAgIHkgPSBseSArIHB5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBhZGRTZWdtZW50UG9pbnQgPSBmdW5jdGlvbihzZWdtZW50KSB7XG4gICAgICAgICAgICB2YXIgc2VnVHlwZSA9IHNlZ21lbnQucGF0aFNlZ1R5cGVBc0xldHRlci50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgICAgICAvLyBza2lwIHBhdGggZW5kc1xuICAgICAgICAgICAgaWYgKHNlZ1R5cGUgPT09ICdaJykgXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBtYXAgc2VnbWVudCB0byB4IGFuZCB5XG4gICAgICAgICAgICBzd2l0Y2ggKHNlZ1R5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnTSc6XG4gICAgICAgICAgICBjYXNlICdMJzpcbiAgICAgICAgICAgIGNhc2UgJ1QnOlxuICAgICAgICAgICAgY2FzZSAnQyc6XG4gICAgICAgICAgICBjYXNlICdTJzpcbiAgICAgICAgICAgIGNhc2UgJ1EnOlxuICAgICAgICAgICAgICAgIHggPSBzZWdtZW50Lng7XG4gICAgICAgICAgICAgICAgeSA9IHNlZ21lbnQueTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0gnOlxuICAgICAgICAgICAgICAgIHggPSBzZWdtZW50Lng7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdWJzpcbiAgICAgICAgICAgICAgICB5ID0gc2VnbWVudC55O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhZGRQb2ludCh4LCB5LCBzZWdtZW50LnBhdGhTZWdUeXBlKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBlbnN1cmUgcGF0aCBpcyBhYnNvbHV0ZVxuICAgICAgICBfc3ZnUGF0aFRvQWJzb2x1dGUocGF0aCk7XG5cbiAgICAgICAgLy8gZ2V0IHRvdGFsIGxlbmd0aFxuICAgICAgICB0b3RhbCA9IHBhdGguZ2V0VG90YWxMZW5ndGgoKTtcblxuICAgICAgICAvLyBxdWV1ZSBzZWdtZW50c1xuICAgICAgICBzZWdtZW50cyA9IFtdO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGF0aC5wYXRoU2VnTGlzdC5udW1iZXJPZkl0ZW1zOyBpICs9IDEpXG4gICAgICAgICAgICBzZWdtZW50cy5wdXNoKHBhdGgucGF0aFNlZ0xpc3QuZ2V0SXRlbShpKSk7XG5cbiAgICAgICAgc2VnbWVudHNRdWV1ZSA9IHNlZ21lbnRzLmNvbmNhdCgpO1xuXG4gICAgICAgIC8vIHNhbXBsZSB0aHJvdWdoIHBhdGhcbiAgICAgICAgd2hpbGUgKGxlbmd0aCA8IHRvdGFsKSB7XG4gICAgICAgICAgICAvLyBnZXQgc2VnbWVudCBhdCBwb3NpdGlvblxuICAgICAgICAgICAgc2VnbWVudEluZGV4ID0gcGF0aC5nZXRQYXRoU2VnQXRMZW5ndGgobGVuZ3RoKTtcbiAgICAgICAgICAgIHNlZ21lbnQgPSBzZWdtZW50c1tzZWdtZW50SW5kZXhdO1xuXG4gICAgICAgICAgICAvLyBuZXcgc2VnbWVudFxuICAgICAgICAgICAgaWYgKHNlZ21lbnQgIT0gbGFzdFNlZ21lbnQpIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc2VnbWVudHNRdWV1ZS5sZW5ndGggJiYgc2VnbWVudHNRdWV1ZVswXSAhPSBzZWdtZW50KVxuICAgICAgICAgICAgICAgICAgICBhZGRTZWdtZW50UG9pbnQoc2VnbWVudHNRdWV1ZS5zaGlmdCgpKTtcblxuICAgICAgICAgICAgICAgIGxhc3RTZWdtZW50ID0gc2VnbWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gYWRkIHBvaW50cyBpbiBiZXR3ZWVuIHdoZW4gY3VydmluZ1xuICAgICAgICAgICAgLy8gVE9ETzogYWRhcHRpdmUgc2FtcGxpbmdcbiAgICAgICAgICAgIHN3aXRjaCAoc2VnbWVudC5wYXRoU2VnVHlwZUFzTGV0dGVyLnRvVXBwZXJDYXNlKCkpIHtcblxuICAgICAgICAgICAgY2FzZSAnQyc6XG4gICAgICAgICAgICBjYXNlICdUJzpcbiAgICAgICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICBjYXNlICdBJzpcbiAgICAgICAgICAgICAgICBwb2ludCA9IHBhdGguZ2V0UG9pbnRBdExlbmd0aChsZW5ndGgpO1xuICAgICAgICAgICAgICAgIGFkZFBvaW50KHBvaW50LngsIHBvaW50LnksIDApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGluY3JlbWVudCBieSBzYW1wbGUgdmFsdWVcbiAgICAgICAgICAgIGxlbmd0aCArPSBzYW1wbGVMZW5ndGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgcmVtYWluaW5nIHNlZ21lbnRzIG5vdCBwYXNzZWQgYnkgc2FtcGxpbmdcbiAgICAgICAgZm9yIChpID0gMCwgaWwgPSBzZWdtZW50c1F1ZXVlLmxlbmd0aDsgaSA8IGlsOyArK2kpXG4gICAgICAgICAgICBhZGRTZWdtZW50UG9pbnQoc2VnbWVudHNRdWV1ZVtpXSk7XG5cbiAgICAgICAgcmV0dXJuIHBvaW50cztcbiAgICB9O1xuXG4gICAgdmFyIF9zdmdQYXRoVG9BYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICAgICAgLy8gaHR0cDovL3Bocm9nei5uZXQvY29udmVydC1zdmctcGF0aC10by1hbGwtYWJzb2x1dGUtY29tbWFuZHNcbiAgICAgICAgdmFyIHgwLCB5MCwgeDEsIHkxLCB4MiwgeTIsIHNlZ3MgPSBwYXRoLnBhdGhTZWdMaXN0LFxuICAgICAgICAgICAgeCA9IDAsIHkgPSAwLCBsZW4gPSBzZWdzLm51bWJlck9mSXRlbXM7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgdmFyIHNlZyA9IHNlZ3MuZ2V0SXRlbShpKSxcbiAgICAgICAgICAgICAgICBzZWdUeXBlID0gc2VnLnBhdGhTZWdUeXBlQXNMZXR0ZXI7XG5cbiAgICAgICAgICAgIGlmICgvW01MSFZDU1FUQV0vLnRlc3Qoc2VnVHlwZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoJ3gnIGluIHNlZykgeCA9IHNlZy54O1xuICAgICAgICAgICAgICAgIGlmICgneScgaW4gc2VnKSB5ID0gc2VnLnk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICgneDEnIGluIHNlZykgeDEgPSB4ICsgc2VnLngxO1xuICAgICAgICAgICAgICAgIGlmICgneDInIGluIHNlZykgeDIgPSB4ICsgc2VnLngyO1xuICAgICAgICAgICAgICAgIGlmICgneTEnIGluIHNlZykgeTEgPSB5ICsgc2VnLnkxO1xuICAgICAgICAgICAgICAgIGlmICgneTInIGluIHNlZykgeTIgPSB5ICsgc2VnLnkyO1xuICAgICAgICAgICAgICAgIGlmICgneCcgaW4gc2VnKSB4ICs9IHNlZy54O1xuICAgICAgICAgICAgICAgIGlmICgneScgaW4gc2VnKSB5ICs9IHNlZy55O1xuXG4gICAgICAgICAgICAgICAgc3dpdGNoIChzZWdUeXBlKSB7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdNb3ZldG9BYnMoeCwgeSksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdsJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdMaW5ldG9BYnMoeCwgeSksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdoJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdMaW5ldG9Ib3Jpem9udGFsQWJzKHgpLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndic6XG4gICAgICAgICAgICAgICAgICAgIHNlZ3MucmVwbGFjZUl0ZW0ocGF0aC5jcmVhdGVTVkdQYXRoU2VnTGluZXRvVmVydGljYWxBYnMoeSksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdjJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdDdXJ2ZXRvQ3ViaWNBYnMoeCwgeSwgeDEsIHkxLCB4MiwgeTIpLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncyc6XG4gICAgICAgICAgICAgICAgICAgIHNlZ3MucmVwbGFjZUl0ZW0ocGF0aC5jcmVhdGVTVkdQYXRoU2VnQ3VydmV0b0N1YmljU21vb3RoQWJzKHgsIHksIHgyLCB5MiksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdxJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdDdXJ2ZXRvUXVhZHJhdGljQWJzKHgsIHksIHgxLCB5MSksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0JzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdDdXJ2ZXRvUXVhZHJhdGljU21vb3RoQWJzKHgsIHkpLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYSc6XG4gICAgICAgICAgICAgICAgICAgIHNlZ3MucmVwbGFjZUl0ZW0ocGF0aC5jcmVhdGVTVkdQYXRoU2VnQXJjQWJzKHgsIHksIHNlZy5yMSwgc2VnLnIyLCBzZWcuYW5nbGUsIHNlZy5sYXJnZUFyY0ZsYWcsIHNlZy5zd2VlcEZsYWcpLCBpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAneic6XG4gICAgICAgICAgICAgICAgY2FzZSAnWic6XG4gICAgICAgICAgICAgICAgICAgIHggPSB4MDtcbiAgICAgICAgICAgICAgICAgICAgeSA9IHkwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNlZ1R5cGUgPT0gJ00nIHx8IHNlZ1R5cGUgPT0gJ20nKSB7XG4gICAgICAgICAgICAgICAgeDAgPSB4O1xuICAgICAgICAgICAgICAgIHkwID0geTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7IiwiLyoqXG4qIFRoZSBgTWF0dGVyLlZlY3RvcmAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgdmVjdG9ycy5cbiogVmVjdG9ycyBhcmUgdGhlIGJhc2lzIG9mIGFsbCB0aGUgZ2VvbWV0cnkgcmVsYXRlZCBvcGVyYXRpb25zIGluIHRoZSBlbmdpbmUuXG4qIEEgYE1hdHRlci5WZWN0b3JgIG9iamVjdCBpcyBvZiB0aGUgZm9ybSBgeyB4OiAwLCB5OiAwIH1gLlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgVmVjdG9yXG4qL1xuXG4vLyBUT0RPOiBjb25zaWRlciBwYXJhbXMgZm9yIHJldXNpbmcgdmVjdG9yIG9iamVjdHNcblxudmFyIFZlY3RvciA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlY3RvcjtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyB2ZWN0b3IuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3JcbiAgICAgKi9cbiAgICBWZWN0b3IuY3JlYXRlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICByZXR1cm4geyB4OiB4IHx8IDAsIHk6IHkgfHwgMCB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgbmV3IHZlY3RvciB3aXRoIGB4YCBhbmQgYHlgIGNvcGllZCBmcm9tIHRoZSBnaXZlbiBgdmVjdG9yYC5cbiAgICAgKiBAbWV0aG9kIGNsb25lXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gQSBuZXcgY2xvbmVkIHZlY3RvclxuICAgICAqL1xuICAgIFZlY3Rvci5jbG9uZSA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgICAgICByZXR1cm4geyB4OiB2ZWN0b3IueCwgeTogdmVjdG9yLnkgfTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbWFnbml0dWRlIChsZW5ndGgpIG9mIGEgdmVjdG9yLlxuICAgICAqIEBtZXRob2QgbWFnbml0dWRlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEByZXR1cm4ge251bWJlcn0gVGhlIG1hZ25pdHVkZSBvZiB0aGUgdmVjdG9yXG4gICAgICovXG4gICAgVmVjdG9yLm1hZ25pdHVkZSA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KCh2ZWN0b3IueCAqIHZlY3Rvci54KSArICh2ZWN0b3IueSAqIHZlY3Rvci55KSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG1hZ25pdHVkZSAobGVuZ3RoKSBvZiBhIHZlY3RvciAodGhlcmVmb3JlIHNhdmluZyBhIGBzcXJ0YCBvcGVyYXRpb24pLlxuICAgICAqIEBtZXRob2QgbWFnbml0dWRlU3F1YXJlZFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBzcXVhcmVkIG1hZ25pdHVkZSBvZiB0aGUgdmVjdG9yXG4gICAgICovXG4gICAgVmVjdG9yLm1hZ25pdHVkZVNxdWFyZWQgPSBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuICh2ZWN0b3IueCAqIHZlY3Rvci54KSArICh2ZWN0b3IueSAqIHZlY3Rvci55KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUm90YXRlcyB0aGUgdmVjdG9yIGFib3V0ICgwLCAwKSBieSBzcGVjaWZpZWQgYW5nbGUuXG4gICAgICogQG1ldGhvZCByb3RhdGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3Igcm90YXRlZCBhYm91dCAoMCwgMClcbiAgICAgKi9cbiAgICBWZWN0b3Iucm90YXRlID0gZnVuY3Rpb24odmVjdG9yLCBhbmdsZSkge1xuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MoYW5nbGUpLCBzaW4gPSBNYXRoLnNpbihhbmdsZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB2ZWN0b3IueCAqIGNvcyAtIHZlY3Rvci55ICogc2luLFxuICAgICAgICAgICAgeTogdmVjdG9yLnggKiBzaW4gKyB2ZWN0b3IueSAqIGNvc1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSb3RhdGVzIHRoZSB2ZWN0b3IgYWJvdXQgYSBzcGVjaWZpZWQgcG9pbnQgYnkgc3BlY2lmaWVkIGFuZ2xlLlxuICAgICAqIEBtZXRob2Qgcm90YXRlQWJvdXRcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IFtvdXRwdXRdXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3Igcm90YXRlZCBhYm91dCB0aGUgcG9pbnRcbiAgICAgKi9cbiAgICBWZWN0b3Iucm90YXRlQWJvdXQgPSBmdW5jdGlvbih2ZWN0b3IsIGFuZ2xlLCBwb2ludCwgb3V0cHV0KSB7XG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSksIHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcbiAgICAgICAgaWYgKCFvdXRwdXQpIG91dHB1dCA9IHt9O1xuICAgICAgICB2YXIgeCA9IHBvaW50LnggKyAoKHZlY3Rvci54IC0gcG9pbnQueCkgKiBjb3MgLSAodmVjdG9yLnkgLSBwb2ludC55KSAqIHNpbik7XG4gICAgICAgIG91dHB1dC55ID0gcG9pbnQueSArICgodmVjdG9yLnggLSBwb2ludC54KSAqIHNpbiArICh2ZWN0b3IueSAtIHBvaW50LnkpICogY29zKTtcbiAgICAgICAgb3V0cHV0LnggPSB4O1xuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOb3JtYWxpc2VzIGEgdmVjdG9yIChzdWNoIHRoYXQgaXRzIG1hZ25pdHVkZSBpcyBgMWApLlxuICAgICAqIEBtZXRob2Qgbm9ybWFsaXNlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gQSBuZXcgdmVjdG9yIG5vcm1hbGlzZWRcbiAgICAgKi9cbiAgICBWZWN0b3Iubm9ybWFsaXNlID0gZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICAgIHZhciBtYWduaXR1ZGUgPSBWZWN0b3IubWFnbml0dWRlKHZlY3Rvcik7XG4gICAgICAgIGlmIChtYWduaXR1ZGUgPT09IDApXG4gICAgICAgICAgICByZXR1cm4geyB4OiAwLCB5OiAwIH07XG4gICAgICAgIHJldHVybiB7IHg6IHZlY3Rvci54IC8gbWFnbml0dWRlLCB5OiB2ZWN0b3IueSAvIG1hZ25pdHVkZSB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBkb3QtcHJvZHVjdCBvZiB0d28gdmVjdG9ycy5cbiAgICAgKiBAbWV0aG9kIGRvdFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JBXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckJcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgdHdvIHZlY3RvcnNcbiAgICAgKi9cbiAgICBWZWN0b3IuZG90ID0gZnVuY3Rpb24odmVjdG9yQSwgdmVjdG9yQikge1xuICAgICAgICByZXR1cm4gKHZlY3RvckEueCAqIHZlY3RvckIueCkgKyAodmVjdG9yQS55ICogdmVjdG9yQi55KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY3Jvc3MtcHJvZHVjdCBvZiB0d28gdmVjdG9ycy5cbiAgICAgKiBAbWV0aG9kIGNyb3NzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckFcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQlxuICAgICAqIEByZXR1cm4ge251bWJlcn0gVGhlIGNyb3NzIHByb2R1Y3Qgb2YgdGhlIHR3byB2ZWN0b3JzXG4gICAgICovXG4gICAgVmVjdG9yLmNyb3NzID0gZnVuY3Rpb24odmVjdG9yQSwgdmVjdG9yQikge1xuICAgICAgICByZXR1cm4gKHZlY3RvckEueCAqIHZlY3RvckIueSkgLSAodmVjdG9yQS55ICogdmVjdG9yQi54KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY3Jvc3MtcHJvZHVjdCBvZiB0aHJlZSB2ZWN0b3JzLlxuICAgICAqIEBtZXRob2QgY3Jvc3MzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckFcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQlxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JDXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgY3Jvc3MgcHJvZHVjdCBvZiB0aGUgdGhyZWUgdmVjdG9yc1xuICAgICAqL1xuICAgIFZlY3Rvci5jcm9zczMgPSBmdW5jdGlvbih2ZWN0b3JBLCB2ZWN0b3JCLCB2ZWN0b3JDKSB7XG4gICAgICAgIHJldHVybiAodmVjdG9yQi54IC0gdmVjdG9yQS54KSAqICh2ZWN0b3JDLnkgLSB2ZWN0b3JBLnkpIC0gKHZlY3RvckIueSAtIHZlY3RvckEueSkgKiAodmVjdG9yQy54IC0gdmVjdG9yQS54KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyB0aGUgdHdvIHZlY3RvcnMuXG4gICAgICogQG1ldGhvZCBhZGRcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JCXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IFtvdXRwdXRdXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3Igb2YgdmVjdG9yQSBhbmQgdmVjdG9yQiBhZGRlZFxuICAgICAqL1xuICAgIFZlY3Rvci5hZGQgPSBmdW5jdGlvbih2ZWN0b3JBLCB2ZWN0b3JCLCBvdXRwdXQpIHtcbiAgICAgICAgaWYgKCFvdXRwdXQpIG91dHB1dCA9IHt9O1xuICAgICAgICBvdXRwdXQueCA9IHZlY3RvckEueCArIHZlY3RvckIueDtcbiAgICAgICAgb3V0cHV0LnkgPSB2ZWN0b3JBLnkgKyB2ZWN0b3JCLnk7XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFN1YnRyYWN0cyB0aGUgdHdvIHZlY3RvcnMuXG4gICAgICogQG1ldGhvZCBzdWJcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JCXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IFtvdXRwdXRdXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3Igb2YgdmVjdG9yQSBhbmQgdmVjdG9yQiBzdWJ0cmFjdGVkXG4gICAgICovXG4gICAgVmVjdG9yLnN1YiA9IGZ1bmN0aW9uKHZlY3RvckEsIHZlY3RvckIsIG91dHB1dCkge1xuICAgICAgICBpZiAoIW91dHB1dCkgb3V0cHV0ID0ge307XG4gICAgICAgIG91dHB1dC54ID0gdmVjdG9yQS54IC0gdmVjdG9yQi54O1xuICAgICAgICBvdXRwdXQueSA9IHZlY3RvckEueSAtIHZlY3RvckIueTtcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTXVsdGlwbGllcyBhIHZlY3RvciBhbmQgYSBzY2FsYXIuXG4gICAgICogQG1ldGhvZCBtdWx0XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsYXJcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciBtdWx0aXBsaWVkIGJ5IHNjYWxhclxuICAgICAqL1xuICAgIFZlY3Rvci5tdWx0ID0gZnVuY3Rpb24odmVjdG9yLCBzY2FsYXIpIHtcbiAgICAgICAgcmV0dXJuIHsgeDogdmVjdG9yLnggKiBzY2FsYXIsIHk6IHZlY3Rvci55ICogc2NhbGFyIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERpdmlkZXMgYSB2ZWN0b3IgYW5kIGEgc2NhbGFyLlxuICAgICAqIEBtZXRob2QgZGl2XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsYXJcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciBkaXZpZGVkIGJ5IHNjYWxhclxuICAgICAqL1xuICAgIFZlY3Rvci5kaXYgPSBmdW5jdGlvbih2ZWN0b3IsIHNjYWxhcikge1xuICAgICAgICByZXR1cm4geyB4OiB2ZWN0b3IueCAvIHNjYWxhciwgeTogdmVjdG9yLnkgLyBzY2FsYXIgfTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgcGVycGVuZGljdWxhciB2ZWN0b3IuIFNldCBgbmVnYXRlYCB0byB0cnVlIGZvciB0aGUgcGVycGVuZGljdWxhciBpbiB0aGUgb3Bwb3NpdGUgZGlyZWN0aW9uLlxuICAgICAqIEBtZXRob2QgcGVycFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IFtuZWdhdGU9ZmFsc2VdXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBUaGUgcGVycGVuZGljdWxhciB2ZWN0b3JcbiAgICAgKi9cbiAgICBWZWN0b3IucGVycCA9IGZ1bmN0aW9uKHZlY3RvciwgbmVnYXRlKSB7XG4gICAgICAgIG5lZ2F0ZSA9IG5lZ2F0ZSA9PT0gdHJ1ZSA/IC0xIDogMTtcbiAgICAgICAgcmV0dXJuIHsgeDogbmVnYXRlICogLXZlY3Rvci55LCB5OiBuZWdhdGUgKiB2ZWN0b3IueCB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBOZWdhdGVzIGJvdGggY29tcG9uZW50cyBvZiBhIHZlY3RvciBzdWNoIHRoYXQgaXQgcG9pbnRzIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24uXG4gICAgICogQG1ldGhvZCBuZWdcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBUaGUgbmVnYXRlZCB2ZWN0b3JcbiAgICAgKi9cbiAgICBWZWN0b3IubmVnID0gZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICAgIHJldHVybiB7IHg6IC12ZWN0b3IueCwgeTogLXZlY3Rvci55IH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGFuZ2xlIGluIHJhZGlhbnMgYmV0d2VlbiB0aGUgdHdvIHZlY3RvcnMgcmVsYXRpdmUgdG8gdGhlIHgtYXhpcy5cbiAgICAgKiBAbWV0aG9kIGFuZ2xlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckFcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQlxuICAgICAqIEByZXR1cm4ge251bWJlcn0gVGhlIGFuZ2xlIGluIHJhZGlhbnNcbiAgICAgKi9cbiAgICBWZWN0b3IuYW5nbGUgPSBmdW5jdGlvbih2ZWN0b3JBLCB2ZWN0b3JCKSB7XG4gICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHZlY3RvckIueSAtIHZlY3RvckEueSwgdmVjdG9yQi54IC0gdmVjdG9yQS54KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVGVtcG9yYXJ5IHZlY3RvciBwb29sIChub3QgdGhyZWFkLXNhZmUpLlxuICAgICAqIEBwcm9wZXJ0eSBfdGVtcFxuICAgICAqIEB0eXBlIHt2ZWN0b3JbXX1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIFZlY3Rvci5fdGVtcCA9IFtWZWN0b3IuY3JlYXRlKCksIFZlY3Rvci5jcmVhdGUoKSwgXG4gICAgICAgICAgICAgICAgICAgIFZlY3Rvci5jcmVhdGUoKSwgVmVjdG9yLmNyZWF0ZSgpLCBcbiAgICAgICAgICAgICAgICAgICAgVmVjdG9yLmNyZWF0ZSgpLCBWZWN0b3IuY3JlYXRlKCldO1xuXG59KSgpOyIsIi8qKlxuKiBUaGUgYE1hdHRlci5WZXJ0aWNlc2AgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgc2V0cyBvZiB2ZXJ0aWNlcy5cbiogQSBzZXQgb2YgdmVydGljZXMgaXMgYW4gYXJyYXkgb2YgYE1hdHRlci5WZWN0b3JgIHdpdGggYWRkaXRpb25hbCBpbmRleGluZyBwcm9wZXJ0aWVzIGluc2VydGVkIGJ5IGBWZXJ0aWNlcy5jcmVhdGVgLlxuKiBBIGBNYXR0ZXIuQm9keWAgbWFpbnRhaW5zIGEgc2V0IG9mIHZlcnRpY2VzIHRvIHJlcHJlc2VudCB0aGUgc2hhcGUgb2YgdGhlIG9iamVjdCAoaXRzIGNvbnZleCBodWxsKS5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIFZlcnRpY2VzXG4qL1xuXG52YXIgVmVydGljZXMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZXJ0aWNlcztcblxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgc2V0IG9mIGBNYXR0ZXIuQm9keWAgY29tcGF0aWJsZSB2ZXJ0aWNlcy5cbiAgICAgKiBUaGUgYHBvaW50c2AgYXJndW1lbnQgYWNjZXB0cyBhbiBhcnJheSBvZiBgTWF0dGVyLlZlY3RvcmAgcG9pbnRzIG9yaWVudGF0ZWQgYXJvdW5kIHRoZSBvcmlnaW4gYCgwLCAwKWAsIGZvciBleGFtcGxlOlxuICAgICAqXG4gICAgICogICAgIFt7IHg6IDAsIHk6IDAgfSwgeyB4OiAyNSwgeTogNTAgfSwgeyB4OiA1MCwgeTogMCB9XVxuICAgICAqXG4gICAgICogVGhlIGBWZXJ0aWNlcy5jcmVhdGVgIG1ldGhvZCByZXR1cm5zIGEgbmV3IGFycmF5IG9mIHZlcnRpY2VzLCB3aGljaCBhcmUgc2ltaWxhciB0byBNYXR0ZXIuVmVjdG9yIG9iamVjdHMsXG4gICAgICogYnV0IHdpdGggc29tZSBhZGRpdGlvbmFsIHJlZmVyZW5jZXMgcmVxdWlyZWQgZm9yIGVmZmljaWVudCBjb2xsaXNpb24gZGV0ZWN0aW9uIHJvdXRpbmVzLlxuICAgICAqXG4gICAgICogTm90ZSB0aGF0IHRoZSBgYm9keWAgYXJndW1lbnQgaXMgbm90IG9wdGlvbmFsLCBhIGBNYXR0ZXIuQm9keWAgcmVmZXJlbmNlIG11c3QgYmUgcHJvdmlkZWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7dmVjdG9yW119IHBvaW50c1xuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqL1xuICAgIFZlcnRpY2VzLmNyZWF0ZSA9IGZ1bmN0aW9uKHBvaW50cywgYm9keSkge1xuICAgICAgICB2YXIgdmVydGljZXMgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRzW2ldLFxuICAgICAgICAgICAgICAgIHZlcnRleCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogcG9pbnQueCxcbiAgICAgICAgICAgICAgICAgICAgeTogcG9pbnQueSxcbiAgICAgICAgICAgICAgICAgICAgaW5kZXg6IGksXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICAgICAgICAgIGlzSW50ZXJuYWw6IGZhbHNlXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0ZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQYXJzZXMgYSBzdHJpbmcgY29udGFpbmluZyBvcmRlcmVkIHggeSBwYWlycyBzZXBhcmF0ZWQgYnkgc3BhY2VzIChhbmQgb3B0aW9uYWxseSBjb21tYXMpLCBcbiAgICAgKiBpbnRvIGEgYE1hdHRlci5WZXJ0aWNlc2Agb2JqZWN0IGZvciB0aGUgZ2l2ZW4gYE1hdHRlci5Cb2R5YC5cbiAgICAgKiBGb3IgcGFyc2luZyBTVkcgcGF0aHMsIHNlZSBgU3ZnLnBhdGhUb1ZlcnRpY2VzYC5cbiAgICAgKiBAbWV0aG9kIGZyb21QYXRoXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcmV0dXJuIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5mcm9tUGF0aCA9IGZ1bmN0aW9uKHBhdGgsIGJvZHkpIHtcbiAgICAgICAgdmFyIHBhdGhQYXR0ZXJuID0gL0w/XFxzKihbXFwtXFxkXFwuZV0rKVtcXHMsXSooW1xcLVxcZFxcLmVdKykqL2lnLFxuICAgICAgICAgICAgcG9pbnRzID0gW107XG5cbiAgICAgICAgcGF0aC5yZXBsYWNlKHBhdGhQYXR0ZXJuLCBmdW5jdGlvbihtYXRjaCwgeCwgeSkge1xuICAgICAgICAgICAgcG9pbnRzLnB1c2goeyB4OiBwYXJzZUZsb2F0KHgpLCB5OiBwYXJzZUZsb2F0KHkpIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gVmVydGljZXMuY3JlYXRlKHBvaW50cywgYm9keSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNlbnRyZSAoY2VudHJvaWQpIG9mIHRoZSBzZXQgb2YgdmVydGljZXMuXG4gICAgICogQG1ldGhvZCBjZW50cmVcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gVGhlIGNlbnRyZSBwb2ludFxuICAgICAqL1xuICAgIFZlcnRpY2VzLmNlbnRyZSA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgICAgIHZhciBhcmVhID0gVmVydGljZXMuYXJlYSh2ZXJ0aWNlcywgdHJ1ZSksXG4gICAgICAgICAgICBjZW50cmUgPSB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIGNyb3NzLFxuICAgICAgICAgICAgdGVtcCxcbiAgICAgICAgICAgIGo7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaiA9IChpICsgMSkgJSB2ZXJ0aWNlcy5sZW5ndGg7XG4gICAgICAgICAgICBjcm9zcyA9IFZlY3Rvci5jcm9zcyh2ZXJ0aWNlc1tpXSwgdmVydGljZXNbal0pO1xuICAgICAgICAgICAgdGVtcCA9IFZlY3Rvci5tdWx0KFZlY3Rvci5hZGQodmVydGljZXNbaV0sIHZlcnRpY2VzW2pdKSwgY3Jvc3MpO1xuICAgICAgICAgICAgY2VudHJlID0gVmVjdG9yLmFkZChjZW50cmUsIHRlbXApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFZlY3Rvci5kaXYoY2VudHJlLCA2ICogYXJlYSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGF2ZXJhZ2UgKG1lYW4pIG9mIHRoZSBzZXQgb2YgdmVydGljZXMuXG4gICAgICogQG1ldGhvZCBtZWFuXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IFRoZSBhdmVyYWdlIHBvaW50XG4gICAgICovXG4gICAgVmVydGljZXMubWVhbiA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgICAgIHZhciBhdmVyYWdlID0geyB4OiAwLCB5OiAwIH07XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXZlcmFnZS54ICs9IHZlcnRpY2VzW2ldLng7XG4gICAgICAgICAgICBhdmVyYWdlLnkgKz0gdmVydGljZXNbaV0ueTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBWZWN0b3IuZGl2KGF2ZXJhZ2UsIHZlcnRpY2VzLmxlbmd0aCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGFyZWEgb2YgdGhlIHNldCBvZiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIGFyZWFcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7Ym9vbH0gc2lnbmVkXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgYXJlYVxuICAgICAqL1xuICAgIFZlcnRpY2VzLmFyZWEgPSBmdW5jdGlvbih2ZXJ0aWNlcywgc2lnbmVkKSB7XG4gICAgICAgIHZhciBhcmVhID0gMCxcbiAgICAgICAgICAgIGogPSB2ZXJ0aWNlcy5sZW5ndGggLSAxO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZWEgKz0gKHZlcnRpY2VzW2pdLnggLSB2ZXJ0aWNlc1tpXS54KSAqICh2ZXJ0aWNlc1tqXS55ICsgdmVydGljZXNbaV0ueSk7XG4gICAgICAgICAgICBqID0gaTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzaWduZWQpXG4gICAgICAgICAgICByZXR1cm4gYXJlYSAvIDI7XG5cbiAgICAgICAgcmV0dXJuIE1hdGguYWJzKGFyZWEpIC8gMjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbW9tZW50IG9mIGluZXJ0aWEgKHNlY29uZCBtb21lbnQgb2YgYXJlYSkgb2YgdGhlIHNldCBvZiB2ZXJ0aWNlcyBnaXZlbiB0aGUgdG90YWwgbWFzcy5cbiAgICAgKiBAbWV0aG9kIGluZXJ0aWFcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXNzXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgcG9seWdvbidzIG1vbWVudCBvZiBpbmVydGlhXG4gICAgICovXG4gICAgVmVydGljZXMuaW5lcnRpYSA9IGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXNzKSB7XG4gICAgICAgIHZhciBudW1lcmF0b3IgPSAwLFxuICAgICAgICAgICAgZGVub21pbmF0b3IgPSAwLFxuICAgICAgICAgICAgdiA9IHZlcnRpY2VzLFxuICAgICAgICAgICAgY3Jvc3MsXG4gICAgICAgICAgICBqO1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIHBvbHlnb24ncyBtb21lbnQgb2YgaW5lcnRpYSwgdXNpbmcgc2Vjb25kIG1vbWVudCBvZiBhcmVhXG4gICAgICAgIC8vIGh0dHA6Ly93d3cucGh5c2ljc2ZvcnVtcy5jb20vc2hvd3RocmVhZC5waHA/dD0yNTI5M1xuICAgICAgICBmb3IgKHZhciBuID0gMDsgbiA8IHYubGVuZ3RoOyBuKyspIHtcbiAgICAgICAgICAgIGogPSAobiArIDEpICUgdi5sZW5ndGg7XG4gICAgICAgICAgICBjcm9zcyA9IE1hdGguYWJzKFZlY3Rvci5jcm9zcyh2W2pdLCB2W25dKSk7XG4gICAgICAgICAgICBudW1lcmF0b3IgKz0gY3Jvc3MgKiAoVmVjdG9yLmRvdCh2W2pdLCB2W2pdKSArIFZlY3Rvci5kb3QodltqXSwgdltuXSkgKyBWZWN0b3IuZG90KHZbbl0sIHZbbl0pKTtcbiAgICAgICAgICAgIGRlbm9taW5hdG9yICs9IGNyb3NzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChtYXNzIC8gNikgKiAobnVtZXJhdG9yIC8gZGVub21pbmF0b3IpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2xhdGVzIHRoZSBzZXQgb2YgdmVydGljZXMgaW4tcGxhY2UuXG4gICAgICogQG1ldGhvZCB0cmFuc2xhdGVcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGFyXG4gICAgICovXG4gICAgVmVydGljZXMudHJhbnNsYXRlID0gZnVuY3Rpb24odmVydGljZXMsIHZlY3Rvciwgc2NhbGFyKSB7XG4gICAgICAgIHZhciBpO1xuICAgICAgICBpZiAoc2NhbGFyKSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpXS54ICs9IHZlY3Rvci54ICogc2NhbGFyO1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldLnkgKz0gdmVjdG9yLnkgKiBzY2FsYXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlc1tpXS54ICs9IHZlY3Rvci54O1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldLnkgKz0gdmVjdG9yLnk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmVydGljZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJvdGF0ZXMgdGhlIHNldCBvZiB2ZXJ0aWNlcyBpbi1wbGFjZS5cbiAgICAgKiBAbWV0aG9kIHJvdGF0ZVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICovXG4gICAgVmVydGljZXMucm90YXRlID0gZnVuY3Rpb24odmVydGljZXMsIGFuZ2xlLCBwb2ludCkge1xuICAgICAgICBpZiAoYW5nbGUgPT09IDApXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKGFuZ2xlKSxcbiAgICAgICAgICAgIHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmVydGljZSA9IHZlcnRpY2VzW2ldLFxuICAgICAgICAgICAgICAgIGR4ID0gdmVydGljZS54IC0gcG9pbnQueCxcbiAgICAgICAgICAgICAgICBkeSA9IHZlcnRpY2UueSAtIHBvaW50Lnk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB2ZXJ0aWNlLnggPSBwb2ludC54ICsgKGR4ICogY29zIC0gZHkgKiBzaW4pO1xuICAgICAgICAgICAgdmVydGljZS55ID0gcG9pbnQueSArIChkeCAqIHNpbiArIGR5ICogY29zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2ZXJ0aWNlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGBwb2ludGAgaXMgaW5zaWRlIHRoZSBzZXQgb2YgYHZlcnRpY2VzYC5cbiAgICAgKiBAbWV0aG9kIGNvbnRhaW5zXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBUcnVlIGlmIHRoZSB2ZXJ0aWNlcyBjb250YWlucyBwb2ludCwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgICovXG4gICAgVmVydGljZXMuY29udGFpbnMgPSBmdW5jdGlvbih2ZXJ0aWNlcywgcG9pbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2UgPSB2ZXJ0aWNlc1tpXSxcbiAgICAgICAgICAgICAgICBuZXh0VmVydGljZSA9IHZlcnRpY2VzWyhpICsgMSkgJSB2ZXJ0aWNlcy5sZW5ndGhdO1xuICAgICAgICAgICAgaWYgKChwb2ludC54IC0gdmVydGljZS54KSAqIChuZXh0VmVydGljZS55IC0gdmVydGljZS55KSArIChwb2ludC55IC0gdmVydGljZS55KSAqICh2ZXJ0aWNlLnggLSBuZXh0VmVydGljZS54KSA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2NhbGVzIHRoZSB2ZXJ0aWNlcyBmcm9tIGEgcG9pbnQgKGRlZmF1bHQgaXMgY2VudHJlKSBpbi1wbGFjZS5cbiAgICAgKiBAbWV0aG9kIHNjYWxlXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGVYXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjYWxlWVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBwb2ludFxuICAgICAqL1xuICAgIFZlcnRpY2VzLnNjYWxlID0gZnVuY3Rpb24odmVydGljZXMsIHNjYWxlWCwgc2NhbGVZLCBwb2ludCkge1xuICAgICAgICBpZiAoc2NhbGVYID09PSAxICYmIHNjYWxlWSA9PT0gMSlcbiAgICAgICAgICAgIHJldHVybiB2ZXJ0aWNlcztcblxuICAgICAgICBwb2ludCA9IHBvaW50IHx8IFZlcnRpY2VzLmNlbnRyZSh2ZXJ0aWNlcyk7XG5cbiAgICAgICAgdmFyIHZlcnRleCxcbiAgICAgICAgICAgIGRlbHRhO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZlcnRleCA9IHZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgZGVsdGEgPSBWZWN0b3Iuc3ViKHZlcnRleCwgcG9pbnQpO1xuICAgICAgICAgICAgdmVydGljZXNbaV0ueCA9IHBvaW50LnggKyBkZWx0YS54ICogc2NhbGVYO1xuICAgICAgICAgICAgdmVydGljZXNbaV0ueSA9IHBvaW50LnkgKyBkZWx0YS55ICogc2NhbGVZO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGFtZmVycyBhIHNldCBvZiB2ZXJ0aWNlcyBieSBnaXZpbmcgdGhlbSByb3VuZGVkIGNvcm5lcnMsIHJldHVybnMgYSBuZXcgc2V0IG9mIHZlcnRpY2VzLlxuICAgICAqIFRoZSByYWRpdXMgcGFyYW1ldGVyIGlzIGEgc2luZ2xlIG51bWJlciBvciBhbiBhcnJheSB0byBzcGVjaWZ5IHRoZSByYWRpdXMgZm9yIGVhY2ggdmVydGV4LlxuICAgICAqIEBtZXRob2QgY2hhbWZlclxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJbXX0gcmFkaXVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHF1YWxpdHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcXVhbGl0eU1pblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBxdWFsaXR5TWF4XG4gICAgICovXG4gICAgVmVydGljZXMuY2hhbWZlciA9IGZ1bmN0aW9uKHZlcnRpY2VzLCByYWRpdXMsIHF1YWxpdHksIHF1YWxpdHlNaW4sIHF1YWxpdHlNYXgpIHtcbiAgICAgICAgcmFkaXVzID0gcmFkaXVzIHx8IFs4XTtcblxuICAgICAgICBpZiAoIXJhZGl1cy5sZW5ndGgpXG4gICAgICAgICAgICByYWRpdXMgPSBbcmFkaXVzXTtcblxuICAgICAgICAvLyBxdWFsaXR5IGRlZmF1bHRzIHRvIC0xLCB3aGljaCBpcyBhdXRvXG4gICAgICAgIHF1YWxpdHkgPSAodHlwZW9mIHF1YWxpdHkgIT09ICd1bmRlZmluZWQnKSA/IHF1YWxpdHkgOiAtMTtcbiAgICAgICAgcXVhbGl0eU1pbiA9IHF1YWxpdHlNaW4gfHwgMjtcbiAgICAgICAgcXVhbGl0eU1heCA9IHF1YWxpdHlNYXggfHwgMTQ7XG5cbiAgICAgICAgdmFyIG5ld1ZlcnRpY2VzID0gW107XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHByZXZWZXJ0ZXggPSB2ZXJ0aWNlc1tpIC0gMSA+PSAwID8gaSAtIDEgOiB2ZXJ0aWNlcy5sZW5ndGggLSAxXSxcbiAgICAgICAgICAgICAgICB2ZXJ0ZXggPSB2ZXJ0aWNlc1tpXSxcbiAgICAgICAgICAgICAgICBuZXh0VmVydGV4ID0gdmVydGljZXNbKGkgKyAxKSAlIHZlcnRpY2VzLmxlbmd0aF0sXG4gICAgICAgICAgICAgICAgY3VycmVudFJhZGl1cyA9IHJhZGl1c1tpIDwgcmFkaXVzLmxlbmd0aCA/IGkgOiByYWRpdXMubGVuZ3RoIC0gMV07XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50UmFkaXVzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgbmV3VmVydGljZXMucHVzaCh2ZXJ0ZXgpO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcHJldk5vcm1hbCA9IFZlY3Rvci5ub3JtYWxpc2UoeyBcbiAgICAgICAgICAgICAgICB4OiB2ZXJ0ZXgueSAtIHByZXZWZXJ0ZXgueSwgXG4gICAgICAgICAgICAgICAgeTogcHJldlZlcnRleC54IC0gdmVydGV4LnhcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgbmV4dE5vcm1hbCA9IFZlY3Rvci5ub3JtYWxpc2UoeyBcbiAgICAgICAgICAgICAgICB4OiBuZXh0VmVydGV4LnkgLSB2ZXJ0ZXgueSwgXG4gICAgICAgICAgICAgICAgeTogdmVydGV4LnggLSBuZXh0VmVydGV4LnhcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZGlhZ29uYWxSYWRpdXMgPSBNYXRoLnNxcnQoMiAqIE1hdGgucG93KGN1cnJlbnRSYWRpdXMsIDIpKSxcbiAgICAgICAgICAgICAgICByYWRpdXNWZWN0b3IgPSBWZWN0b3IubXVsdChDb21tb24uY2xvbmUocHJldk5vcm1hbCksIGN1cnJlbnRSYWRpdXMpLFxuICAgICAgICAgICAgICAgIG1pZE5vcm1hbCA9IFZlY3Rvci5ub3JtYWxpc2UoVmVjdG9yLm11bHQoVmVjdG9yLmFkZChwcmV2Tm9ybWFsLCBuZXh0Tm9ybWFsKSwgMC41KSksXG4gICAgICAgICAgICAgICAgc2NhbGVkVmVydGV4ID0gVmVjdG9yLnN1Yih2ZXJ0ZXgsIFZlY3Rvci5tdWx0KG1pZE5vcm1hbCwgZGlhZ29uYWxSYWRpdXMpKTtcblxuICAgICAgICAgICAgdmFyIHByZWNpc2lvbiA9IHF1YWxpdHk7XG5cbiAgICAgICAgICAgIGlmIChxdWFsaXR5ID09PSAtMSkge1xuICAgICAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZGVjaWRlIHByZWNpc2lvblxuICAgICAgICAgICAgICAgIHByZWNpc2lvbiA9IE1hdGgucG93KGN1cnJlbnRSYWRpdXMsIDAuMzIpICogMS43NTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJlY2lzaW9uID0gQ29tbW9uLmNsYW1wKHByZWNpc2lvbiwgcXVhbGl0eU1pbiwgcXVhbGl0eU1heCk7XG5cbiAgICAgICAgICAgIC8vIHVzZSBhbiBldmVuIHZhbHVlIGZvciBwcmVjaXNpb24sIG1vcmUgbGlrZWx5IHRvIHJlZHVjZSBheGVzIGJ5IHVzaW5nIHN5bW1ldHJ5XG4gICAgICAgICAgICBpZiAocHJlY2lzaW9uICUgMiA9PT0gMSlcbiAgICAgICAgICAgICAgICBwcmVjaXNpb24gKz0gMTtcblxuICAgICAgICAgICAgdmFyIGFscGhhID0gTWF0aC5hY29zKFZlY3Rvci5kb3QocHJldk5vcm1hbCwgbmV4dE5vcm1hbCkpLFxuICAgICAgICAgICAgICAgIHRoZXRhID0gYWxwaGEgLyBwcmVjaXNpb247XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcHJlY2lzaW9uOyBqKyspIHtcbiAgICAgICAgICAgICAgICBuZXdWZXJ0aWNlcy5wdXNoKFZlY3Rvci5hZGQoVmVjdG9yLnJvdGF0ZShyYWRpdXNWZWN0b3IsIHRoZXRhICogaiksIHNjYWxlZFZlcnRleCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld1ZlcnRpY2VzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTb3J0cyB0aGUgaW5wdXQgdmVydGljZXMgaW50byBjbG9ja3dpc2Ugb3JkZXIgaW4gcGxhY2UuXG4gICAgICogQG1ldGhvZCBjbG9ja3dpc2VTb3J0XG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcmV0dXJuIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5jbG9ja3dpc2VTb3J0ID0gZnVuY3Rpb24odmVydGljZXMpIHtcbiAgICAgICAgdmFyIGNlbnRyZSA9IFZlcnRpY2VzLm1lYW4odmVydGljZXMpO1xuXG4gICAgICAgIHZlcnRpY2VzLnNvcnQoZnVuY3Rpb24odmVydGV4QSwgdmVydGV4Qikge1xuICAgICAgICAgICAgcmV0dXJuIFZlY3Rvci5hbmdsZShjZW50cmUsIHZlcnRleEEpIC0gVmVjdG9yLmFuZ2xlKGNlbnRyZSwgdmVydGV4Qik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB2ZXJ0aWNlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSB2ZXJ0aWNlcyBmb3JtIGEgY29udmV4IHNoYXBlICh2ZXJ0aWNlcyBtdXN0IGJlIGluIGNsb2Nrd2lzZSBvcmRlcikuXG4gICAgICogQG1ldGhvZCBpc0NvbnZleFxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHJldHVybiB7Ym9vbH0gYHRydWVgIGlmIHRoZSBgdmVydGljZXNgIGFyZSBjb252ZXgsIGBmYWxzZWAgaWYgbm90IChvciBgbnVsbGAgaWYgbm90IGNvbXB1dGFibGUpLlxuICAgICAqL1xuICAgIFZlcnRpY2VzLmlzQ29udmV4ID0gZnVuY3Rpb24odmVydGljZXMpIHtcbiAgICAgICAgLy8gaHR0cDovL3BhdWxib3Vya2UubmV0L2dlb21ldHJ5L3BvbHlnb25tZXNoL1xuXG4gICAgICAgIHZhciBmbGFnID0gMCxcbiAgICAgICAgICAgIG4gPSB2ZXJ0aWNlcy5sZW5ndGgsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGssXG4gICAgICAgICAgICB6O1xuXG4gICAgICAgIGlmIChuIDwgMylcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIGogPSAoaSArIDEpICUgbjtcbiAgICAgICAgICAgIGsgPSAoaSArIDIpICUgbjtcbiAgICAgICAgICAgIHogPSAodmVydGljZXNbal0ueCAtIHZlcnRpY2VzW2ldLngpICogKHZlcnRpY2VzW2tdLnkgLSB2ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgIHogLT0gKHZlcnRpY2VzW2pdLnkgLSB2ZXJ0aWNlc1tpXS55KSAqICh2ZXJ0aWNlc1trXS54IC0gdmVydGljZXNbal0ueCk7XG5cbiAgICAgICAgICAgIGlmICh6IDwgMCkge1xuICAgICAgICAgICAgICAgIGZsYWcgfD0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeiA+IDApIHtcbiAgICAgICAgICAgICAgICBmbGFnIHw9IDI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmbGFnID09PSAzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGZsYWcgIT09IDApe1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb252ZXggaHVsbCBvZiB0aGUgaW5wdXQgdmVydGljZXMgYXMgYSBuZXcgYXJyYXkgb2YgcG9pbnRzLlxuICAgICAqIEBtZXRob2QgaHVsbFxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHJldHVybiBbdmVydGV4XSB2ZXJ0aWNlc1xuICAgICAqL1xuICAgIFZlcnRpY2VzLmh1bGwgPSBmdW5jdGlvbih2ZXJ0aWNlcykge1xuICAgICAgICAvLyBodHRwOi8vZW4ud2lraWJvb2tzLm9yZy93aWtpL0FsZ29yaXRobV9JbXBsZW1lbnRhdGlvbi9HZW9tZXRyeS9Db252ZXhfaHVsbC9Nb25vdG9uZV9jaGFpblxuXG4gICAgICAgIHZhciB1cHBlciA9IFtdLFxuICAgICAgICAgICAgbG93ZXIgPSBbXSwgXG4gICAgICAgICAgICB2ZXJ0ZXgsXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIC8vIHNvcnQgdmVydGljZXMgb24geC1heGlzICh5LWF4aXMgZm9yIHRpZXMpXG4gICAgICAgIHZlcnRpY2VzID0gdmVydGljZXMuc2xpY2UoMCk7XG4gICAgICAgIHZlcnRpY2VzLnNvcnQoZnVuY3Rpb24odmVydGV4QSwgdmVydGV4Qikge1xuICAgICAgICAgICAgdmFyIGR4ID0gdmVydGV4QS54IC0gdmVydGV4Qi54O1xuICAgICAgICAgICAgcmV0dXJuIGR4ICE9PSAwID8gZHggOiB2ZXJ0ZXhBLnkgLSB2ZXJ0ZXhCLnk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGJ1aWxkIGxvd2VyIGh1bGxcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2ZXJ0ZXggPSB2ZXJ0aWNlc1tpXTtcblxuICAgICAgICAgICAgd2hpbGUgKGxvd2VyLmxlbmd0aCA+PSAyIFxuICAgICAgICAgICAgICAgICAgICYmIFZlY3Rvci5jcm9zczMobG93ZXJbbG93ZXIubGVuZ3RoIC0gMl0sIGxvd2VyW2xvd2VyLmxlbmd0aCAtIDFdLCB2ZXJ0ZXgpIDw9IDApIHtcbiAgICAgICAgICAgICAgICBsb3dlci5wb3AoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG93ZXIucHVzaCh2ZXJ0ZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYnVpbGQgdXBwZXIgaHVsbFxuICAgICAgICBmb3IgKGkgPSB2ZXJ0aWNlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdmVydGV4ID0gdmVydGljZXNbaV07XG5cbiAgICAgICAgICAgIHdoaWxlICh1cHBlci5sZW5ndGggPj0gMiBcbiAgICAgICAgICAgICAgICAgICAmJiBWZWN0b3IuY3Jvc3MzKHVwcGVyW3VwcGVyLmxlbmd0aCAtIDJdLCB1cHBlclt1cHBlci5sZW5ndGggLSAxXSwgdmVydGV4KSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdXBwZXIucG9wKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVwcGVyLnB1c2godmVydGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbmNhdGVuYXRpb24gb2YgdGhlIGxvd2VyIGFuZCB1cHBlciBodWxscyBnaXZlcyB0aGUgY29udmV4IGh1bGxcbiAgICAgICAgLy8gb21pdCBsYXN0IHBvaW50cyBiZWNhdXNlIHRoZXkgYXJlIHJlcGVhdGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIG90aGVyIGxpc3RcbiAgICAgICAgdXBwZXIucG9wKCk7XG4gICAgICAgIGxvd2VyLnBvcCgpO1xuXG4gICAgICAgIHJldHVybiB1cHBlci5jb25jYXQobG93ZXIpO1xuICAgIH07XG5cbn0pKCk7XG4iLCJ2YXIgTWF0dGVyID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbk1hdHRlci52ZXJzaW9uID0gJ21hc3Rlcic7XG5cbk1hdHRlci5Cb2R5ID0gcmVxdWlyZSgnLi4vYm9keS9Cb2R5Jyk7XG5NYXR0ZXIuQ29tcG9zaXRlID0gcmVxdWlyZSgnLi4vYm9keS9Db21wb3NpdGUnKTtcbk1hdHRlci5Xb3JsZCA9IHJlcXVpcmUoJy4uL2JvZHkvV29ybGQnKTtcblxuTWF0dGVyLkNvbnRhY3QgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vQ29udGFjdCcpO1xuTWF0dGVyLkRldGVjdG9yID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL0RldGVjdG9yJyk7XG5NYXR0ZXIuR3JpZCA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9HcmlkJyk7XG5NYXR0ZXIuUGFpcnMgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vUGFpcnMnKTtcbk1hdHRlci5QYWlyID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL1BhaXInKTtcbk1hdHRlci5RdWVyeSA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9RdWVyeScpO1xuTWF0dGVyLlJlc29sdmVyID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL1Jlc29sdmVyJyk7XG5NYXR0ZXIuU0FUID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL1NBVCcpO1xuXG5NYXR0ZXIuQ29uc3RyYWludCA9IHJlcXVpcmUoJy4uL2NvbnN0cmFpbnQvQ29uc3RyYWludCcpO1xuTWF0dGVyLk1vdXNlQ29uc3RyYWludCA9IHJlcXVpcmUoJy4uL2NvbnN0cmFpbnQvTW91c2VDb25zdHJhaW50Jyk7XG5cbk1hdHRlci5Db21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xuTWF0dGVyLkVuZ2luZSA9IHJlcXVpcmUoJy4uL2NvcmUvRW5naW5lJyk7XG5NYXR0ZXIuRXZlbnRzID0gcmVxdWlyZSgnLi4vY29yZS9FdmVudHMnKTtcbk1hdHRlci5Nb3VzZSA9IHJlcXVpcmUoJy4uL2NvcmUvTW91c2UnKTtcbk1hdHRlci5SdW5uZXIgPSByZXF1aXJlKCcuLi9jb3JlL1J1bm5lcicpO1xuTWF0dGVyLlNsZWVwaW5nID0gcmVxdWlyZSgnLi4vY29yZS9TbGVlcGluZycpO1xuXG4vLyBAaWYgREVCVUdcbk1hdHRlci5NZXRyaWNzID0gcmVxdWlyZSgnLi4vY29yZS9NZXRyaWNzJyk7XG4vLyBAZW5kaWZcblxuTWF0dGVyLkJvZGllcyA9IHJlcXVpcmUoJy4uL2ZhY3RvcnkvQm9kaWVzJyk7XG5NYXR0ZXIuQ29tcG9zaXRlcyA9IHJlcXVpcmUoJy4uL2ZhY3RvcnkvQ29tcG9zaXRlcycpO1xuXG5NYXR0ZXIuQXhlcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0F4ZXMnKTtcbk1hdHRlci5Cb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcbk1hdHRlci5TdmcgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9TdmcnKTtcbk1hdHRlci5WZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbk1hdHRlci5WZXJ0aWNlcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlcnRpY2VzJyk7XG5cbk1hdHRlci5SZW5kZXIgPSByZXF1aXJlKCcuLi9yZW5kZXIvUmVuZGVyJyk7XG5NYXR0ZXIuUmVuZGVyUGl4aSA9IHJlcXVpcmUoJy4uL3JlbmRlci9SZW5kZXJQaXhpJyk7XG5cbi8vIGFsaWFzZXNcblxuTWF0dGVyLldvcmxkLmFkZCA9IE1hdHRlci5Db21wb3NpdGUuYWRkO1xuTWF0dGVyLldvcmxkLnJlbW92ZSA9IE1hdHRlci5Db21wb3NpdGUucmVtb3ZlO1xuTWF0dGVyLldvcmxkLmFkZENvbXBvc2l0ZSA9IE1hdHRlci5Db21wb3NpdGUuYWRkQ29tcG9zaXRlO1xuTWF0dGVyLldvcmxkLmFkZEJvZHkgPSBNYXR0ZXIuQ29tcG9zaXRlLmFkZEJvZHk7XG5NYXR0ZXIuV29ybGQuYWRkQ29uc3RyYWludCA9IE1hdHRlci5Db21wb3NpdGUuYWRkQ29uc3RyYWludDtcbk1hdHRlci5Xb3JsZC5jbGVhciA9IE1hdHRlci5Db21wb3NpdGUuY2xlYXI7XG5NYXR0ZXIuRW5naW5lLnJ1biA9IE1hdHRlci5SdW5uZXIucnVuO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlJlbmRlcmAgbW9kdWxlIGlzIGEgc2ltcGxlIEhUTUw1IGNhbnZhcyBiYXNlZCByZW5kZXJlciBmb3IgdmlzdWFsaXNpbmcgaW5zdGFuY2VzIG9mIGBNYXR0ZXIuRW5naW5lYC5cbiogSXQgaXMgaW50ZW5kZWQgZm9yIGRldmVsb3BtZW50IGFuZCBkZWJ1Z2dpbmcgcHVycG9zZXMsIGJ1dCBtYXkgYWxzbyBiZSBzdWl0YWJsZSBmb3Igc2ltcGxlIGdhbWVzLlxuKiBJdCBpbmNsdWRlcyBhIG51bWJlciBvZiBkcmF3aW5nIG9wdGlvbnMgaW5jbHVkaW5nIHdpcmVmcmFtZSwgdmVjdG9yIHdpdGggc3VwcG9ydCBmb3Igc3ByaXRlcyBhbmQgdmlld3BvcnRzLlxuKlxuKiBAY2xhc3MgUmVuZGVyXG4qL1xuXG52YXIgUmVuZGVyID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gUmVuZGVyO1xuXG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBDb21wb3NpdGUgPSByZXF1aXJlKCcuLi9ib2R5L0NvbXBvc2l0ZScpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4uL2NvcmUvRXZlbnRzJyk7XG52YXIgR3JpZCA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9HcmlkJyk7XG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVjdG9yJyk7XG5cbihmdW5jdGlvbigpIHtcbiAgICBcbiAgICB2YXIgX3JlcXVlc3RBbmltYXRpb25GcmFtZSxcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IGZ1bmN0aW9uKGNhbGxiYWNrKXsgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKENvbW1vbi5ub3coKSk7IH0sIDEwMDAgLyA2MCk7IH07XG4gICBcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmVuZGVyZXIuIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIEFsbCBwcm9wZXJ0aWVzIGhhdmUgZGVmYXVsdCB2YWx1ZXMsIGFuZCBtYW55IGFyZSBwcmUtY2FsY3VsYXRlZCBhdXRvbWF0aWNhbGx5IGJhc2VkIG9uIG90aGVyIHByb3BlcnRpZXMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gYmVsb3cgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcmV0dXJuIHtyZW5kZXJ9IEEgbmV3IHJlbmRlcmVyXG4gICAgICovXG4gICAgUmVuZGVyLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY29udHJvbGxlcjogUmVuZGVyLFxuICAgICAgICAgICAgZW5naW5lOiBudWxsLFxuICAgICAgICAgICAgZWxlbWVudDogbnVsbCxcbiAgICAgICAgICAgIGNhbnZhczogbnVsbCxcbiAgICAgICAgICAgIG1vdXNlOiBudWxsLFxuICAgICAgICAgICAgZnJhbWVSZXF1ZXN0SWQ6IG51bGwsXG4gICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDgwMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDYwMCxcbiAgICAgICAgICAgICAgICBwaXhlbFJhdGlvOiAxLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjZmFmYWZhJyxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWVCYWNrZ3JvdW5kOiAnIzIyMicsXG4gICAgICAgICAgICAgICAgaGFzQm91bmRzOiAhIW9wdGlvbnMuYm91bmRzLFxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgd2lyZWZyYW1lczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U2xlZXBpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd0RlYnVnOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93QnJvYWRwaGFzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0JvdW5kczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1ZlbG9jaXR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93Q29sbGlzaW9uczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1NlcGFyYXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93QXhlczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1Bvc2l0aW9uczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0FuZ2xlSW5kaWNhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93SWRzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93U2hhZG93czogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1ZlcnRleE51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dDb252ZXhIdWxsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0ludGVybmFsRWRnZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dNb3VzZVBvc2l0aW9uOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZW5kZXIgPSBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICBpZiAocmVuZGVyLmNhbnZhcykge1xuICAgICAgICAgICAgcmVuZGVyLmNhbnZhcy53aWR0aCA9IHJlbmRlci5vcHRpb25zLndpZHRoIHx8IHJlbmRlci5jYW52YXMud2lkdGg7XG4gICAgICAgICAgICByZW5kZXIuY2FudmFzLmhlaWdodCA9IHJlbmRlci5vcHRpb25zLmhlaWdodCB8fCByZW5kZXIuY2FudmFzLmhlaWdodDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlbmRlci5tb3VzZSA9IG9wdGlvbnMubW91c2U7XG4gICAgICAgIHJlbmRlci5lbmdpbmUgPSBvcHRpb25zLmVuZ2luZTtcbiAgICAgICAgcmVuZGVyLmNhbnZhcyA9IHJlbmRlci5jYW52YXMgfHwgX2NyZWF0ZUNhbnZhcyhyZW5kZXIub3B0aW9ucy53aWR0aCwgcmVuZGVyLm9wdGlvbnMuaGVpZ2h0KTtcbiAgICAgICAgcmVuZGVyLmNvbnRleHQgPSByZW5kZXIuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIHJlbmRlci50ZXh0dXJlcyA9IHt9O1xuXG4gICAgICAgIHJlbmRlci5ib3VuZHMgPSByZW5kZXIuYm91bmRzIHx8IHsgXG4gICAgICAgICAgICBtaW46IHsgXG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiAwXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIG1heDogeyBcbiAgICAgICAgICAgICAgICB4OiByZW5kZXIuY2FudmFzLndpZHRoLFxuICAgICAgICAgICAgICAgIHk6IHJlbmRlci5jYW52YXMuaGVpZ2h0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHJlbmRlci5vcHRpb25zLnBpeGVsUmF0aW8gIT09IDEpIHtcbiAgICAgICAgICAgIFJlbmRlci5zZXRQaXhlbFJhdGlvKHJlbmRlciwgcmVuZGVyLm9wdGlvbnMucGl4ZWxSYXRpbyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQ29tbW9uLmlzRWxlbWVudChyZW5kZXIuZWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJlbmRlci5lbGVtZW50LmFwcGVuZENoaWxkKHJlbmRlci5jYW52YXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ29tbW9uLmxvZygnUmVuZGVyLmNyZWF0ZTogb3B0aW9ucy5lbGVtZW50IHdhcyB1bmRlZmluZWQsIHJlbmRlci5jYW52YXMgd2FzIGNyZWF0ZWQgYnV0IG5vdCBhcHBlbmRlZCcsICd3YXJuJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVuZGVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb250aW51b3VzbHkgdXBkYXRlcyB0aGUgcmVuZGVyIGNhbnZhcyBvbiB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgZXZlbnQuXG4gICAgICogQG1ldGhvZCBydW5cbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICovXG4gICAgUmVuZGVyLnJ1biA9IGZ1bmN0aW9uKHJlbmRlcikge1xuICAgICAgICAoZnVuY3Rpb24gbG9vcCh0aW1lKXtcbiAgICAgICAgICAgIHJlbmRlci5mcmFtZVJlcXVlc3RJZCA9IF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG4gICAgICAgICAgICBSZW5kZXIud29ybGQocmVuZGVyKTtcbiAgICAgICAgfSkoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRW5kcyBleGVjdXRpb24gb2YgYFJlbmRlci5ydW5gIG9uIHRoZSBnaXZlbiBgcmVuZGVyYCwgYnkgY2FuY2VsaW5nIHRoZSBhbmltYXRpb24gZnJhbWUgcmVxdWVzdCBldmVudCBsb29wLlxuICAgICAqIEBtZXRob2Qgc3RvcFxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKi9cbiAgICBSZW5kZXIuc3RvcCA9IGZ1bmN0aW9uKHJlbmRlcikge1xuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWUocmVuZGVyLmZyYW1lUmVxdWVzdElkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgcGl4ZWwgcmF0aW8gb2YgdGhlIHJlbmRlcmVyIGFuZCB1cGRhdGVzIHRoZSBjYW52YXMuXG4gICAgICogVG8gYXV0b21hdGljYWxseSBkZXRlY3QgdGhlIGNvcnJlY3QgcmF0aW8sIHBhc3MgdGhlIHN0cmluZyBgJ2F1dG8nYCBmb3IgYHBpeGVsUmF0aW9gLlxuICAgICAqIEBtZXRob2Qgc2V0UGl4ZWxSYXRpb1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGl4ZWxSYXRpb1xuICAgICAqL1xuICAgIFJlbmRlci5zZXRQaXhlbFJhdGlvID0gZnVuY3Rpb24ocmVuZGVyLCBwaXhlbFJhdGlvKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBjYW52YXMgPSByZW5kZXIuY2FudmFzO1xuXG4gICAgICAgIGlmIChwaXhlbFJhdGlvID09PSAnYXV0bycpIHtcbiAgICAgICAgICAgIHBpeGVsUmF0aW8gPSBfZ2V0UGl4ZWxSYXRpbyhjYW52YXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3B0aW9ucy5waXhlbFJhdGlvID0gcGl4ZWxSYXRpbztcbiAgICAgICAgY2FudmFzLnNldEF0dHJpYnV0ZSgnZGF0YS1waXhlbC1yYXRpbycsIHBpeGVsUmF0aW8pO1xuICAgICAgICBjYW52YXMud2lkdGggPSBvcHRpb25zLndpZHRoICogcGl4ZWxSYXRpbztcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0ICogcGl4ZWxSYXRpbztcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gb3B0aW9ucy53aWR0aCArICdweCc7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCArICdweCc7XG4gICAgICAgIHJlbmRlci5jb250ZXh0LnNjYWxlKHBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXJzIHRoZSBnaXZlbiBgZW5naW5lYCdzIGBNYXR0ZXIuV29ybGRgIG9iamVjdC5cbiAgICAgKiBUaGlzIGlzIHRoZSBlbnRyeSBwb2ludCBmb3IgYWxsIHJlbmRlcmluZyBhbmQgc2hvdWxkIGJlIGNhbGxlZCBldmVyeSB0aW1lIHRoZSBzY2VuZSBjaGFuZ2VzLlxuICAgICAqIEBtZXRob2Qgd29ybGRcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICovXG4gICAgUmVuZGVyLndvcmxkID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIHZhciBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgd29ybGQgPSBlbmdpbmUud29ybGQsXG4gICAgICAgICAgICBjYW52YXMgPSByZW5kZXIuY2FudmFzLFxuICAgICAgICAgICAgY29udGV4dCA9IHJlbmRlci5jb250ZXh0LFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zLFxuICAgICAgICAgICAgYWxsQm9kaWVzID0gQ29tcG9zaXRlLmFsbEJvZGllcyh3b3JsZCksXG4gICAgICAgICAgICBhbGxDb25zdHJhaW50cyA9IENvbXBvc2l0ZS5hbGxDb25zdHJhaW50cyh3b3JsZCksXG4gICAgICAgICAgICBiYWNrZ3JvdW5kID0gb3B0aW9ucy53aXJlZnJhbWVzID8gb3B0aW9ucy53aXJlZnJhbWVCYWNrZ3JvdW5kIDogb3B0aW9ucy5iYWNrZ3JvdW5kLFxuICAgICAgICAgICAgYm9kaWVzID0gW10sXG4gICAgICAgICAgICBjb25zdHJhaW50cyA9IFtdLFxuICAgICAgICAgICAgaTtcblxuICAgICAgICB2YXIgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IGVuZ2luZS50aW1pbmcudGltZXN0YW1wXG4gICAgICAgIH07XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIocmVuZGVyLCAnYmVmb3JlUmVuZGVyJywgZXZlbnQpO1xuXG4gICAgICAgIC8vIGFwcGx5IGJhY2tncm91bmQgaWYgaXQgaGFzIGNoYW5nZWRcbiAgICAgICAgaWYgKHJlbmRlci5jdXJyZW50QmFja2dyb3VuZCAhPT0gYmFja2dyb3VuZClcbiAgICAgICAgICAgIF9hcHBseUJhY2tncm91bmQocmVuZGVyLCBiYWNrZ3JvdW5kKTtcblxuICAgICAgICAvLyBjbGVhciB0aGUgY2FudmFzIHdpdGggYSB0cmFuc3BhcmVudCBmaWxsLCB0byBhbGxvdyB0aGUgY2FudmFzIGJhY2tncm91bmQgdG8gc2hvd1xuICAgICAgICBjb250ZXh0Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdzb3VyY2UtaW4nO1xuICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9IFwidHJhbnNwYXJlbnRcIjtcbiAgICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjb250ZXh0Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdzb3VyY2Utb3Zlcic7XG5cbiAgICAgICAgLy8gaGFuZGxlIGJvdW5kc1xuICAgICAgICBpZiAob3B0aW9ucy5oYXNCb3VuZHMpIHtcbiAgICAgICAgICAgIHZhciBib3VuZHNXaWR0aCA9IHJlbmRlci5ib3VuZHMubWF4LnggLSByZW5kZXIuYm91bmRzLm1pbi54LFxuICAgICAgICAgICAgICAgIGJvdW5kc0hlaWdodCA9IHJlbmRlci5ib3VuZHMubWF4LnkgLSByZW5kZXIuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgICAgIGJvdW5kc1NjYWxlWCA9IGJvdW5kc1dpZHRoIC8gb3B0aW9ucy53aWR0aCxcbiAgICAgICAgICAgICAgICBib3VuZHNTY2FsZVkgPSBib3VuZHNIZWlnaHQgLyBvcHRpb25zLmhlaWdodDtcblxuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBib2RpZXMgdGhhdCBhcmUgbm90IGluIHZpZXdcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhbGxCb2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IGFsbEJvZGllc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoQm91bmRzLm92ZXJsYXBzKGJvZHkuYm91bmRzLCByZW5kZXIuYm91bmRzKSlcbiAgICAgICAgICAgICAgICAgICAgYm9kaWVzLnB1c2goYm9keSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgY29uc3RyYWludHMgdGhhdCBhcmUgbm90IGluIHZpZXdcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhbGxDb25zdHJhaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjb25zdHJhaW50ID0gYWxsQ29uc3RyYWludHNbaV0sXG4gICAgICAgICAgICAgICAgICAgIGJvZHlBID0gY29uc3RyYWludC5ib2R5QSxcbiAgICAgICAgICAgICAgICAgICAgYm9keUIgPSBjb25zdHJhaW50LmJvZHlCLFxuICAgICAgICAgICAgICAgICAgICBwb2ludEFXb3JsZCA9IGNvbnN0cmFpbnQucG9pbnRBLFxuICAgICAgICAgICAgICAgICAgICBwb2ludEJXb3JsZCA9IGNvbnN0cmFpbnQucG9pbnRCO1xuXG4gICAgICAgICAgICAgICAgaWYgKGJvZHlBKSBwb2ludEFXb3JsZCA9IFZlY3Rvci5hZGQoYm9keUEucG9zaXRpb24sIGNvbnN0cmFpbnQucG9pbnRBKTtcbiAgICAgICAgICAgICAgICBpZiAoYm9keUIpIHBvaW50QldvcmxkID0gVmVjdG9yLmFkZChib2R5Qi5wb3NpdGlvbiwgY29uc3RyYWludC5wb2ludEIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwb2ludEFXb3JsZCB8fCAhcG9pbnRCV29ybGQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKEJvdW5kcy5jb250YWlucyhyZW5kZXIuYm91bmRzLCBwb2ludEFXb3JsZCkgfHwgQm91bmRzLmNvbnRhaW5zKHJlbmRlci5ib3VuZHMsIHBvaW50QldvcmxkKSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHMucHVzaChjb25zdHJhaW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtIHRoZSB2aWV3XG4gICAgICAgICAgICBjb250ZXh0LnNjYWxlKDEgLyBib3VuZHNTY2FsZVgsIDEgLyBib3VuZHNTY2FsZVkpO1xuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoLXJlbmRlci5ib3VuZHMubWluLngsIC1yZW5kZXIuYm91bmRzLm1pbi55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzID0gYWxsQ29uc3RyYWludHM7XG4gICAgICAgICAgICBib2RpZXMgPSBhbGxCb2RpZXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbnMud2lyZWZyYW1lcyB8fCAoZW5naW5lLmVuYWJsZVNsZWVwaW5nICYmIG9wdGlvbnMuc2hvd1NsZWVwaW5nKSkge1xuICAgICAgICAgICAgLy8gZnVsbHkgZmVhdHVyZWQgcmVuZGVyaW5nIG9mIGJvZGllc1xuICAgICAgICAgICAgUmVuZGVyLmJvZGllcyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93Q29udmV4SHVsbHMpXG4gICAgICAgICAgICAgICAgUmVuZGVyLmJvZHlDb252ZXhIdWxscyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG5cbiAgICAgICAgICAgIC8vIG9wdGltaXNlZCBtZXRob2QgZm9yIHdpcmVmcmFtZXMgb25seVxuICAgICAgICAgICAgUmVuZGVyLmJvZHlXaXJlZnJhbWVzKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dCb3VuZHMpXG4gICAgICAgICAgICBSZW5kZXIuYm9keUJvdW5kcyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd0F4ZXMgfHwgb3B0aW9ucy5zaG93QW5nbGVJbmRpY2F0b3IpXG4gICAgICAgICAgICBSZW5kZXIuYm9keUF4ZXMocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1Bvc2l0aW9ucylcbiAgICAgICAgICAgIFJlbmRlci5ib2R5UG9zaXRpb25zKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob3B0aW9ucy5zaG93VmVsb2NpdHkpXG4gICAgICAgICAgICBSZW5kZXIuYm9keVZlbG9jaXR5KHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob3B0aW9ucy5zaG93SWRzKVxuICAgICAgICAgICAgUmVuZGVyLmJvZHlJZHMocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dTZXBhcmF0aW9ucylcbiAgICAgICAgICAgIFJlbmRlci5zZXBhcmF0aW9ucyhyZW5kZXIsIGVuZ2luZS5wYWlycy5saXN0LCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob3B0aW9ucy5zaG93Q29sbGlzaW9ucylcbiAgICAgICAgICAgIFJlbmRlci5jb2xsaXNpb25zKHJlbmRlciwgZW5naW5lLnBhaXJzLmxpc3QsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dWZXJ0ZXhOdW1iZXJzKVxuICAgICAgICAgICAgUmVuZGVyLnZlcnRleE51bWJlcnMocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dNb3VzZVBvc2l0aW9uKVxuICAgICAgICAgICAgUmVuZGVyLm1vdXNlUG9zaXRpb24ocmVuZGVyLCByZW5kZXIubW91c2UsIGNvbnRleHQpO1xuXG4gICAgICAgIFJlbmRlci5jb25zdHJhaW50cyhjb25zdHJhaW50cywgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd0Jyb2FkcGhhc2UgJiYgZW5naW5lLmJyb2FkcGhhc2UuY29udHJvbGxlciA9PT0gR3JpZClcbiAgICAgICAgICAgIFJlbmRlci5ncmlkKHJlbmRlciwgZW5naW5lLmJyb2FkcGhhc2UsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dEZWJ1ZylcbiAgICAgICAgICAgIFJlbmRlci5kZWJ1ZyhyZW5kZXIsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLmhhc0JvdW5kcykge1xuICAgICAgICAgICAgLy8gcmV2ZXJ0IHZpZXcgdHJhbnNmb3Jtc1xuICAgICAgICAgICAgY29udGV4dC5zZXRUcmFuc2Zvcm0ob3B0aW9ucy5waXhlbFJhdGlvLCAwLCAwLCBvcHRpb25zLnBpeGVsUmF0aW8sIDAsIDApO1xuICAgICAgICB9XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIocmVuZGVyLCAnYWZ0ZXJSZW5kZXInLCBldmVudCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGRlYnVnXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5kZWJ1ZyA9IGZ1bmN0aW9uKHJlbmRlciwgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgd29ybGQgPSBlbmdpbmUud29ybGQsXG4gICAgICAgICAgICBtZXRyaWNzID0gZW5naW5lLm1ldHJpY3MsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBib2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKHdvcmxkKSxcbiAgICAgICAgICAgIHNwYWNlID0gXCIgICAgXCI7XG5cbiAgICAgICAgaWYgKGVuZ2luZS50aW1pbmcudGltZXN0YW1wIC0gKHJlbmRlci5kZWJ1Z1RpbWVzdGFtcCB8fCAwKSA+PSA1MDApIHtcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gXCJcIjtcblxuICAgICAgICAgICAgaWYgKG1ldHJpY3MudGltaW5nKSB7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBcImZwczogXCIgKyBNYXRoLnJvdW5kKG1ldHJpY3MudGltaW5nLmZwcykgKyBzcGFjZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgICAgICBpZiAobWV0cmljcy5leHRlbmRlZCkge1xuICAgICAgICAgICAgICAgIGlmIChtZXRyaWNzLnRpbWluZykge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiZGVsdGE6IFwiICsgbWV0cmljcy50aW1pbmcuZGVsdGEudG9GaXhlZCgzKSArIHNwYWNlO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiY29ycmVjdGlvbjogXCIgKyBtZXRyaWNzLnRpbWluZy5jb3JyZWN0aW9uLnRvRml4ZWQoMykgKyBzcGFjZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiYm9kaWVzOiBcIiArIGJvZGllcy5sZW5ndGggKyBzcGFjZTtcblxuICAgICAgICAgICAgICAgIGlmIChlbmdpbmUuYnJvYWRwaGFzZS5jb250cm9sbGVyID09PSBHcmlkKVxuICAgICAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiYnVja2V0czogXCIgKyBtZXRyaWNzLmJ1Y2tldHMgKyBzcGFjZTtcblxuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJcXG5cIjtcblxuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJjb2xsaXNpb25zOiBcIiArIG1ldHJpY3MuY29sbGlzaW9ucyArIHNwYWNlO1xuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJwYWlyczogXCIgKyBlbmdpbmUucGFpcnMubGlzdC5sZW5ndGggKyBzcGFjZTtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiYnJvYWQ6IFwiICsgbWV0cmljcy5icm9hZEVmZiArIHNwYWNlO1xuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJtaWQ6IFwiICsgbWV0cmljcy5taWRFZmYgKyBzcGFjZTtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFwibmFycm93OiBcIiArIG1ldHJpY3MubmFycm93RWZmICsgc3BhY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBAZW5kaWYgICAgICAgICAgICBcblxuICAgICAgICAgICAgcmVuZGVyLmRlYnVnU3RyaW5nID0gdGV4dDtcbiAgICAgICAgICAgIHJlbmRlci5kZWJ1Z1RpbWVzdGFtcCA9IGVuZ2luZS50aW1pbmcudGltZXN0YW1wO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlbmRlci5kZWJ1Z1N0cmluZykge1xuICAgICAgICAgICAgYy5mb250ID0gXCIxMnB4IEFyaWFsXCI7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNSknO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDAsMCwwLDAuNSknO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3BsaXQgPSByZW5kZXIuZGVidWdTdHJpbmcuc3BsaXQoJ1xcbicpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNwbGl0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYy5maWxsVGV4dChzcGxpdFtpXSwgNTAsIDUwICsgaSAqIDE4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBjb25zdHJhaW50c1xuICAgICAqIEBwYXJhbSB7Y29uc3RyYWludFtdfSBjb25zdHJhaW50c1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5jb25zdHJhaW50cyA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnN0cmFpbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY29uc3RyYWludCA9IGNvbnN0cmFpbnRzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWNvbnN0cmFpbnQucmVuZGVyLnZpc2libGUgfHwgIWNvbnN0cmFpbnQucG9pbnRBIHx8ICFjb25zdHJhaW50LnBvaW50QilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgdmFyIGJvZHlBID0gY29uc3RyYWludC5ib2R5QSxcbiAgICAgICAgICAgICAgICBib2R5QiA9IGNvbnN0cmFpbnQuYm9keUI7XG5cbiAgICAgICAgICAgIGlmIChib2R5QSkge1xuICAgICAgICAgICAgICAgIGMuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgYy5tb3ZlVG8oYm9keUEucG9zaXRpb24ueCArIGNvbnN0cmFpbnQucG9pbnRBLngsIGJvZHlBLnBvc2l0aW9uLnkgKyBjb25zdHJhaW50LnBvaW50QS55KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjLm1vdmVUbyhjb25zdHJhaW50LnBvaW50QS54LCBjb25zdHJhaW50LnBvaW50QS55KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGJvZHlCKSB7XG4gICAgICAgICAgICAgICAgYy5saW5lVG8oYm9keUIucG9zaXRpb24ueCArIGNvbnN0cmFpbnQucG9pbnRCLngsIGJvZHlCLnBvc2l0aW9uLnkgKyBjb25zdHJhaW50LnBvaW50Qi55KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYy5saW5lVG8oY29uc3RyYWludC5wb2ludEIueCwgY29uc3RyYWludC5wb2ludEIueSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGMubGluZVdpZHRoID0gY29uc3RyYWludC5yZW5kZXIubGluZVdpZHRoO1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9IGNvbnN0cmFpbnQucmVuZGVyLnN0cm9rZVN0eWxlO1xuICAgICAgICAgICAgYy5zdHJva2UoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keVNoYWRvd3NcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5U2hhZG93cyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGVuZ2luZSA9IHJlbmRlci5lbmdpbmU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIGlmIChib2R5LmNpcmNsZVJhZGl1cykge1xuICAgICAgICAgICAgICAgIGMuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgYy5hcmMoYm9keS5wb3NpdGlvbi54LCBib2R5LnBvc2l0aW9uLnksIGJvZHkuY2lyY2xlUmFkaXVzLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgYy5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjLm1vdmVUbyhib2R5LnZlcnRpY2VzWzBdLngsIGJvZHkudmVydGljZXNbMF0ueSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDE7IGogPCBib2R5LnZlcnRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGMubGluZVRvKGJvZHkudmVydGljZXNbal0ueCwgYm9keS52ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYy5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRpc3RhbmNlWCA9IGJvZHkucG9zaXRpb24ueCAtIHJlbmRlci5vcHRpb25zLndpZHRoICogMC41LFxuICAgICAgICAgICAgICAgIGRpc3RhbmNlWSA9IGJvZHkucG9zaXRpb24ueSAtIHJlbmRlci5vcHRpb25zLmhlaWdodCAqIDAuMixcbiAgICAgICAgICAgICAgICBkaXN0YW5jZSA9IE1hdGguYWJzKGRpc3RhbmNlWCkgKyBNYXRoLmFicyhkaXN0YW5jZVkpO1xuXG4gICAgICAgICAgICBjLnNoYWRvd0NvbG9yID0gJ3JnYmEoMCwwLDAsMC4xNSknO1xuICAgICAgICAgICAgYy5zaGFkb3dPZmZzZXRYID0gMC4wNSAqIGRpc3RhbmNlWDtcbiAgICAgICAgICAgIGMuc2hhZG93T2Zmc2V0WSA9IDAuMDUgKiBkaXN0YW5jZVk7XG4gICAgICAgICAgICBjLnNoYWRvd0JsdXIgPSAxICsgMTIgKiBNYXRoLm1pbigxLCBkaXN0YW5jZSAvIDEwMDApO1xuXG4gICAgICAgICAgICBjLmZpbGwoKTtcblxuICAgICAgICAgICAgYy5zaGFkb3dDb2xvciA9IG51bGw7XG4gICAgICAgICAgICBjLnNoYWRvd09mZnNldFggPSBudWxsO1xuICAgICAgICAgICAgYy5zaGFkb3dPZmZzZXRZID0gbnVsbDtcbiAgICAgICAgICAgIGMuc2hhZG93Qmx1ciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9kaWVzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9kaWVzID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgZW5naW5lID0gcmVuZGVyLmVuZ2luZSxcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIHNob3dJbnRlcm5hbEVkZ2VzID0gb3B0aW9ucy5zaG93SW50ZXJuYWxFZGdlcyB8fCAhb3B0aW9ucy53aXJlZnJhbWVzLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaztcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGhhbmRsZSBjb21wb3VuZCBwYXJ0c1xuICAgICAgICAgICAgZm9yIChrID0gYm9keS5wYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGsgPCBib2R5LnBhcnRzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgcGFydCA9IGJvZHkucGFydHNba107XG5cbiAgICAgICAgICAgICAgICBpZiAoIXBhcnQucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1NsZWVwaW5nICYmIGJvZHkuaXNTbGVlcGluZykge1xuICAgICAgICAgICAgICAgICAgICBjLmdsb2JhbEFscGhhID0gMC41ICogcGFydC5yZW5kZXIub3BhY2l0eTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnQucmVuZGVyLm9wYWNpdHkgIT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYy5nbG9iYWxBbHBoYSA9IHBhcnQucmVuZGVyLm9wYWNpdHk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhcnQucmVuZGVyLnNwcml0ZSAmJiBwYXJ0LnJlbmRlci5zcHJpdGUudGV4dHVyZSAmJiAhb3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBhcnQgc3ByaXRlXG4gICAgICAgICAgICAgICAgICAgIHZhciBzcHJpdGUgPSBwYXJ0LnJlbmRlci5zcHJpdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlID0gX2dldFRleHR1cmUocmVuZGVyLCBzcHJpdGUudGV4dHVyZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgYy50cmFuc2xhdGUocGFydC5wb3NpdGlvbi54LCBwYXJ0LnBvc2l0aW9uLnkpOyBcbiAgICAgICAgICAgICAgICAgICAgYy5yb3RhdGUocGFydC5hbmdsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgYy5kcmF3SW1hZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dHVyZS53aWR0aCAqIC1zcHJpdGUueE9mZnNldCAqIHNwcml0ZS54U2NhbGUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dHVyZS5oZWlnaHQgKiAtc3ByaXRlLnlPZmZzZXQgKiBzcHJpdGUueVNjYWxlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHR1cmUud2lkdGggKiBzcHJpdGUueFNjYWxlLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHR1cmUuaGVpZ2h0ICogc3ByaXRlLnlTY2FsZVxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHJldmVydCB0cmFuc2xhdGlvbiwgaG9wZWZ1bGx5IGZhc3RlciB0aGFuIHNhdmUgLyByZXN0b3JlXG4gICAgICAgICAgICAgICAgICAgIGMucm90YXRlKC1wYXJ0LmFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgYy50cmFuc2xhdGUoLXBhcnQucG9zaXRpb24ueCwgLXBhcnQucG9zaXRpb24ueSk7IFxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBhcnQgcG9seWdvblxuICAgICAgICAgICAgICAgICAgICBpZiAocGFydC5jaXJjbGVSYWRpdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmFyYyhwYXJ0LnBvc2l0aW9uLngsIHBhcnQucG9zaXRpb24ueSwgcGFydC5jaXJjbGVSYWRpdXMsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnZlcnRpY2VzWzBdLngsIHBhcnQudmVydGljZXNbMF0ueSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgcGFydC52ZXJ0aWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcGFydC52ZXJ0aWNlc1tqIC0gMV0uaXNJbnRlcm5hbCB8fCBzaG93SW50ZXJuYWxFZGdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjLmxpbmVUbyhwYXJ0LnZlcnRpY2VzW2pdLngsIHBhcnQudmVydGljZXNbal0ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5tb3ZlVG8ocGFydC52ZXJ0aWNlc1tqXS54LCBwYXJ0LnZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0LnZlcnRpY2VzW2pdLmlzSW50ZXJuYWwgJiYgIXNob3dJbnRlcm5hbEVkZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQudmVydGljZXNbKGogKyAxKSAlIHBhcnQudmVydGljZXMubGVuZ3RoXS54LCBwYXJ0LnZlcnRpY2VzWyhqICsgMSkgJSBwYXJ0LnZlcnRpY2VzLmxlbmd0aF0ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjLmxpbmVUbyhwYXJ0LnZlcnRpY2VzWzBdLngsIHBhcnQudmVydGljZXNbMF0ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gcGFydC5yZW5kZXIuZmlsbFN0eWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5saW5lV2lkdGggPSBwYXJ0LnJlbmRlci5saW5lV2lkdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gcGFydC5yZW5kZXIuc3Ryb2tlU3R5bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmZpbGwoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAnI2JiYic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjLnN0cm9rZSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGMuZ2xvYmFsQWxwaGEgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE9wdGltaXNlZCBtZXRob2QgZm9yIGRyYXdpbmcgYm9keSB3aXJlZnJhbWVzIGluIG9uZSBwYXNzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGJvZHlXaXJlZnJhbWVzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keVdpcmVmcmFtZXMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBzaG93SW50ZXJuYWxFZGdlcyA9IHJlbmRlci5vcHRpb25zLnNob3dJbnRlcm5hbEVkZ2VzLFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGs7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICAvLyByZW5kZXIgYWxsIGJvZGllc1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIC8vIGhhbmRsZSBjb21wb3VuZCBwYXJ0c1xuICAgICAgICAgICAgZm9yIChrID0gYm9keS5wYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGsgPCBib2R5LnBhcnRzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgcGFydCA9IGJvZHkucGFydHNba107XG5cbiAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnZlcnRpY2VzWzBdLngsIHBhcnQudmVydGljZXNbMF0ueSk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgcGFydC52ZXJ0aWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcnQudmVydGljZXNbaiAtIDFdLmlzSW50ZXJuYWwgfHwgc2hvd0ludGVybmFsRWRnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubGluZVRvKHBhcnQudmVydGljZXNbal0ueCwgcGFydC52ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQudmVydGljZXNbal0ueCwgcGFydC52ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0LnZlcnRpY2VzW2pdLmlzSW50ZXJuYWwgJiYgIXNob3dJbnRlcm5hbEVkZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnZlcnRpY2VzWyhqICsgMSkgJSBwYXJ0LnZlcnRpY2VzLmxlbmd0aF0ueCwgcGFydC52ZXJ0aWNlc1soaiArIDEpICUgcGFydC52ZXJ0aWNlcy5sZW5ndGhdLnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGMubGluZVRvKHBhcnQudmVydGljZXNbMF0ueCwgcGFydC52ZXJ0aWNlc1swXS55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgYy5zdHJva2VTdHlsZSA9ICcjYmJiJztcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3B0aW1pc2VkIG1ldGhvZCBmb3IgZHJhd2luZyBib2R5IGNvbnZleCBodWxsIHdpcmVmcmFtZXMgaW4gb25lIHBhc3NcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keUNvbnZleEh1bGxzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keUNvbnZleEh1bGxzID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgYm9keSxcbiAgICAgICAgICAgIHBhcnQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGs7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICAvLyByZW5kZXIgY29udmV4IGh1bGxzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmICghYm9keS5yZW5kZXIudmlzaWJsZSB8fCBib2R5LnBhcnRzLmxlbmd0aCA9PT0gMSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgYy5tb3ZlVG8oYm9keS52ZXJ0aWNlc1swXS54LCBib2R5LnZlcnRpY2VzWzBdLnkpO1xuXG4gICAgICAgICAgICBmb3IgKGogPSAxOyBqIDwgYm9keS52ZXJ0aWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGMubGluZVRvKGJvZHkudmVydGljZXNbal0ueCwgYm9keS52ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYy5saW5lVG8oYm9keS52ZXJ0aWNlc1swXS54LCBib2R5LnZlcnRpY2VzWzBdLnkpO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSc7XG4gICAgICAgIGMuc3Ryb2tlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgYm9keSB2ZXJ0ZXggbnVtYmVycy5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgdmVydGV4TnVtYmVyc1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLnZlcnRleE51bWJlcnMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGs7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhcnRzID0gYm9kaWVzW2ldLnBhcnRzO1xuICAgICAgICAgICAgZm9yIChrID0gcGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBrIDwgcGFydHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2tdO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBwYXJ0LnZlcnRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSc7XG4gICAgICAgICAgICAgICAgICAgIGMuZmlsbFRleHQoaSArICdfJyArIGosIHBhcnQucG9zaXRpb24ueCArIChwYXJ0LnZlcnRpY2VzW2pdLnggLSBwYXJ0LnBvc2l0aW9uLngpICogMC44LCBwYXJ0LnBvc2l0aW9uLnkgKyAocGFydC52ZXJ0aWNlc1tqXS55IC0gcGFydC5wb3NpdGlvbi55KSAqIDAuOCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgbW91c2UgcG9zaXRpb24uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIG1vdXNlUG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHttb3VzZX0gbW91c2VcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIubW91c2VQb3NpdGlvbiA9IGZ1bmN0aW9uKHJlbmRlciwgbW91c2UsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0O1xuICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuOCknO1xuICAgICAgICBjLmZpbGxUZXh0KG1vdXNlLnBvc2l0aW9uLnggKyAnICAnICsgbW91c2UucG9zaXRpb24ueSwgbW91c2UucG9zaXRpb24ueCArIDUsIG1vdXNlLnBvc2l0aW9uLnkgLSA1KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYm9keSBib3VuZHNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keUJvdW5kc1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmJvZHlCb3VuZHMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoYm9keS5yZW5kZXIudmlzaWJsZSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0cyA9IGJvZGllc1tpXS5wYXJ0cztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gcGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBqIDwgcGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgYy5yZWN0KHBhcnQuYm91bmRzLm1pbi54LCBwYXJ0LmJvdW5kcy5taW4ueSwgcGFydC5ib3VuZHMubWF4LnggLSBwYXJ0LmJvdW5kcy5taW4ueCwgcGFydC5ib3VuZHMubWF4LnkgLSBwYXJ0LmJvdW5kcy5taW4ueSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgwLDAsMCwwLjEpJztcbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYm9keSBhbmdsZSBpbmRpY2F0b3JzIGFuZCBheGVzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGJvZHlBeGVzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keUF4ZXMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zLFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgaztcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldLFxuICAgICAgICAgICAgICAgIHBhcnRzID0gYm9keS5wYXJ0cztcblxuICAgICAgICAgICAgaWYgKCFib2R5LnJlbmRlci52aXNpYmxlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93QXhlcykge1xuICAgICAgICAgICAgICAgIC8vIHJlbmRlciBhbGwgYXhlc1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IHBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQgPSBwYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHBhcnQuYXhlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF4aXMgPSBwYXJ0LmF4ZXNba107XG4gICAgICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnBvc2l0aW9uLngsIHBhcnQucG9zaXRpb24ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmxpbmVUbyhwYXJ0LnBvc2l0aW9uLnggKyBheGlzLnggKiAyMCwgcGFydC5wb3NpdGlvbi55ICsgYXhpcy55ICogMjApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSBwYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGogPCBwYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBwYXJ0ID0gcGFydHNbal07XG4gICAgICAgICAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBwYXJ0LmF4ZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbmRlciBhIHNpbmdsZSBheGlzIGluZGljYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgYy5tb3ZlVG8ocGFydC5wb3NpdGlvbi54LCBwYXJ0LnBvc2l0aW9uLnkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5saW5lVG8oKHBhcnQudmVydGljZXNbMF0ueCArIHBhcnQudmVydGljZXNbcGFydC52ZXJ0aWNlcy5sZW5ndGgtMV0ueCkgLyAyLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChwYXJ0LnZlcnRpY2VzWzBdLnkgKyBwYXJ0LnZlcnRpY2VzW3BhcnQudmVydGljZXMubGVuZ3RoLTFdLnkpIC8gMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ2luZGlhbnJlZCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMCwwLDAsMC44KSc7XG4gICAgICAgICAgICBjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdvdmVybGF5JztcbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICAgICAgYy5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnc291cmNlLW92ZXInO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBib2R5IHBvc2l0aW9uc1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBib2R5UG9zaXRpb25zXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keVBvc2l0aW9ucyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBrO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgLy8gcmVuZGVyIGN1cnJlbnQgcG9zaXRpb25zXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmICghYm9keS5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gaGFuZGxlIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgIHBhcnQgPSBib2R5LnBhcnRzW2tdO1xuICAgICAgICAgICAgICAgIGMuYXJjKHBhcnQucG9zaXRpb24ueCwgcGFydC5wb3NpdGlvbi55LCAzLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGMuY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdpbmRpYW5yZWQnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5maWxsU3R5bGUgPSAncmdiYSgwLDAsMCwwLjUpJztcbiAgICAgICAgfVxuICAgICAgICBjLmZpbGwoKTtcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIC8vIHJlbmRlciBwcmV2aW91cyBwb3NpdGlvbnNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYm9keSA9IGJvZGllc1tpXTtcbiAgICAgICAgICAgIGlmIChib2R5LnJlbmRlci52aXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgYy5hcmMoYm9keS5wb3NpdGlvblByZXYueCwgYm9keS5wb3NpdGlvblByZXYueSwgMiwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjLmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYy5maWxsU3R5bGUgPSAncmdiYSgyNTUsMTY1LDAsMC44KSc7XG4gICAgICAgIGMuZmlsbCgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBib2R5IHZlbG9jaXR5XG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGJvZHlWZWxvY2l0eVxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmJvZHlWZWxvY2l0eSA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dDtcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFib2R5LnJlbmRlci52aXNpYmxlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjLm1vdmVUbyhib2R5LnBvc2l0aW9uLngsIGJvZHkucG9zaXRpb24ueSk7XG4gICAgICAgICAgICBjLmxpbmVUbyhib2R5LnBvc2l0aW9uLnggKyAoYm9keS5wb3NpdGlvbi54IC0gYm9keS5wb3NpdGlvblByZXYueCkgKiAyLCBib2R5LnBvc2l0aW9uLnkgKyAoYm9keS5wb3NpdGlvbi55IC0gYm9keS5wb3NpdGlvblByZXYueSkgKiAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMztcbiAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdjb3JuZmxvd2VyYmx1ZSc7XG4gICAgICAgIGMuc3Ryb2tlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIGJvZHkgaWRzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGJvZHlJZHNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5SWRzID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGo7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKCFib2RpZXNbaV0ucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IGJvZGllc1tpXS5wYXJ0cztcbiAgICAgICAgICAgIGZvciAoaiA9IHBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBwYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICBjLmZvbnQgPSBcIjEycHggQXJpYWxcIjtcbiAgICAgICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNSknO1xuICAgICAgICAgICAgICAgIGMuZmlsbFRleHQocGFydC5pZCwgcGFydC5wb3NpdGlvbi54ICsgMTAsIHBhcnQucG9zaXRpb24ueSAtIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBjb2xsaXNpb25zXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7cGFpcltdfSBwYWlyc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5jb2xsaXNpb25zID0gZnVuY3Rpb24ocmVuZGVyLCBwYWlycywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgY29ycmVjdGVkLFxuICAgICAgICAgICAgYm9keUEsXG4gICAgICAgICAgICBib2R5QixcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgLy8gcmVuZGVyIGNvbGxpc2lvbiBwb3NpdGlvbnNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG5cbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb247XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgcGFpci5hY3RpdmVDb250YWN0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBjb250YWN0ID0gcGFpci5hY3RpdmVDb250YWN0c1tqXSxcbiAgICAgICAgICAgICAgICAgICAgdmVydGV4ID0gY29udGFjdC52ZXJ0ZXg7XG4gICAgICAgICAgICAgICAgYy5yZWN0KHZlcnRleC54IC0gMS41LCB2ZXJ0ZXgueSAtIDEuNSwgMy41LCAzLjUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgYy5maWxsU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjcpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIH1cbiAgICAgICAgYy5maWxsKCk7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyByZW5kZXIgY29sbGlzaW9uIG5vcm1hbHNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG5cbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb247XG5cbiAgICAgICAgICAgIGlmIChwYWlyLmFjdGl2ZUNvbnRhY3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9ybWFsUG9zWCA9IHBhaXIuYWN0aXZlQ29udGFjdHNbMF0udmVydGV4LngsXG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbFBvc1kgPSBwYWlyLmFjdGl2ZUNvbnRhY3RzWzBdLnZlcnRleC55O1xuXG4gICAgICAgICAgICAgICAgaWYgKHBhaXIuYWN0aXZlQ29udGFjdHMubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbFBvc1ggPSAocGFpci5hY3RpdmVDb250YWN0c1swXS52ZXJ0ZXgueCArIHBhaXIuYWN0aXZlQ29udGFjdHNbMV0udmVydGV4LngpIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsUG9zWSA9IChwYWlyLmFjdGl2ZUNvbnRhY3RzWzBdLnZlcnRleC55ICsgcGFpci5hY3RpdmVDb250YWN0c1sxXS52ZXJ0ZXgueSkgLyAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoY29sbGlzaW9uLmJvZHlCID09PSBjb2xsaXNpb24uc3VwcG9ydHNbMF0uYm9keSB8fCBjb2xsaXNpb24uYm9keUEuaXNTdGF0aWMgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgYy5tb3ZlVG8obm9ybWFsUG9zWCAtIGNvbGxpc2lvbi5ub3JtYWwueCAqIDgsIG5vcm1hbFBvc1kgLSBjb2xsaXNpb24ubm9ybWFsLnkgKiA4KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhub3JtYWxQb3NYICsgY29sbGlzaW9uLm5vcm1hbC54ICogOCwgbm9ybWFsUG9zWSArIGNvbGxpc2lvbi5ub3JtYWwueSAqIDgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGMubGluZVRvKG5vcm1hbFBvc1gsIG5vcm1hbFBvc1kpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwxNjUsMCwwLjcpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAnb3JhbmdlJztcbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2Qgc2VwYXJhdGlvbnNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLnNlcGFyYXRpb25zID0gZnVuY3Rpb24ocmVuZGVyLCBwYWlycywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgY29ycmVjdGVkLFxuICAgICAgICAgICAgYm9keUEsXG4gICAgICAgICAgICBib2R5QixcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgLy8gcmVuZGVyIHNlcGFyYXRpb25zXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGFpciA9IHBhaXJzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIXBhaXIuaXNBY3RpdmUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uO1xuICAgICAgICAgICAgYm9keUEgPSBjb2xsaXNpb24uYm9keUE7XG4gICAgICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5ib2R5QjtcblxuICAgICAgICAgICAgdmFyIGsgPSAxO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHlCLmlzU3RhdGljICYmICFib2R5QS5pc1N0YXRpYykgayA9IDAuNTtcbiAgICAgICAgICAgIGlmIChib2R5Qi5pc1N0YXRpYykgayA9IDA7XG5cbiAgICAgICAgICAgIGMubW92ZVRvKGJvZHlCLnBvc2l0aW9uLngsIGJvZHlCLnBvc2l0aW9uLnkpO1xuICAgICAgICAgICAgYy5saW5lVG8oYm9keUIucG9zaXRpb24ueCAtIGNvbGxpc2lvbi5wZW5ldHJhdGlvbi54ICogaywgYm9keUIucG9zaXRpb24ueSAtIGNvbGxpc2lvbi5wZW5ldHJhdGlvbi55ICogayk7XG5cbiAgICAgICAgICAgIGsgPSAxO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHlCLmlzU3RhdGljICYmICFib2R5QS5pc1N0YXRpYykgayA9IDAuNTtcbiAgICAgICAgICAgIGlmIChib2R5QS5pc1N0YXRpYykgayA9IDA7XG5cbiAgICAgICAgICAgIGMubW92ZVRvKGJvZHlBLnBvc2l0aW9uLngsIGJvZHlBLnBvc2l0aW9uLnkpO1xuICAgICAgICAgICAgYy5saW5lVG8oYm9keUEucG9zaXRpb24ueCArIGNvbGxpc2lvbi5wZW5ldHJhdGlvbi54ICogaywgYm9keUEucG9zaXRpb24ueSArIGNvbGxpc2lvbi5wZW5ldHJhdGlvbi55ICogayk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDE2NSwwLDAuNSknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICB9XG4gICAgICAgIGMuc3Ryb2tlKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGdyaWRcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtncmlkfSBncmlkXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmdyaWQgPSBmdW5jdGlvbihyZW5kZXIsIGdyaWQsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zO1xuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMTgwLDAsMC4xKSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDE4MCwwLDAuNSknO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICB2YXIgYnVja2V0S2V5cyA9IENvbW1vbi5rZXlzKGdyaWQuYnVja2V0cyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWNrZXRLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYnVja2V0SWQgPSBidWNrZXRLZXlzW2ldO1xuXG4gICAgICAgICAgICBpZiAoZ3JpZC5idWNrZXRzW2J1Y2tldElkXS5sZW5ndGggPCAyKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gYnVja2V0SWQuc3BsaXQoJywnKTtcbiAgICAgICAgICAgIGMucmVjdCgwLjUgKyBwYXJzZUludChyZWdpb25bMF0sIDEwKSAqIGdyaWQuYnVja2V0V2lkdGgsIFxuICAgICAgICAgICAgICAgICAgICAwLjUgKyBwYXJzZUludChyZWdpb25bMV0sIDEwKSAqIGdyaWQuYnVja2V0SGVpZ2h0LCBcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5idWNrZXRXaWR0aCwgXG4gICAgICAgICAgICAgICAgICAgIGdyaWQuYnVja2V0SGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGMubGluZVdpZHRoID0gMTtcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgaW5zcGVjdG9yXG4gICAgICogQHBhcmFtIHtpbnNwZWN0b3J9IGluc3BlY3RvclxuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5pbnNwZWN0b3IgPSBmdW5jdGlvbihpbnNwZWN0b3IsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGVuZ2luZSA9IGluc3BlY3Rvci5lbmdpbmUsXG4gICAgICAgICAgICBzZWxlY3RlZCA9IGluc3BlY3Rvci5zZWxlY3RlZCxcbiAgICAgICAgICAgIHJlbmRlciA9IGluc3BlY3Rvci5yZW5kZXIsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBib3VuZHM7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuaGFzQm91bmRzKSB7XG4gICAgICAgICAgICB2YXIgYm91bmRzV2lkdGggPSByZW5kZXIuYm91bmRzLm1heC54IC0gcmVuZGVyLmJvdW5kcy5taW4ueCxcbiAgICAgICAgICAgICAgICBib3VuZHNIZWlnaHQgPSByZW5kZXIuYm91bmRzLm1heC55IC0gcmVuZGVyLmJvdW5kcy5taW4ueSxcbiAgICAgICAgICAgICAgICBib3VuZHNTY2FsZVggPSBib3VuZHNXaWR0aCAvIHJlbmRlci5vcHRpb25zLndpZHRoLFxuICAgICAgICAgICAgICAgIGJvdW5kc1NjYWxlWSA9IGJvdW5kc0hlaWdodCAvIHJlbmRlci5vcHRpb25zLmhlaWdodDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGV4dC5zY2FsZSgxIC8gYm91bmRzU2NhbGVYLCAxIC8gYm91bmRzU2NhbGVZKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKC1yZW5kZXIuYm91bmRzLm1pbi54LCAtcmVuZGVyLmJvdW5kcy5taW4ueSk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGVjdGVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IHNlbGVjdGVkW2ldLmRhdGE7XG5cbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKDAuNSwgMC41KTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVdpZHRoID0gMTtcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMTY1LDAsMC45KSc7XG4gICAgICAgICAgICBjb250ZXh0LnNldExpbmVEYXNoKFsxLDJdKTtcblxuICAgICAgICAgICAgc3dpdGNoIChpdGVtLnR5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnYm9keSc6XG5cbiAgICAgICAgICAgICAgICAvLyByZW5kZXIgYm9keSBzZWxlY3Rpb25zXG4gICAgICAgICAgICAgICAgYm91bmRzID0gaXRlbS5ib3VuZHM7XG4gICAgICAgICAgICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnJlY3QoTWF0aC5mbG9vcihib3VuZHMubWluLnggLSAzKSwgTWF0aC5mbG9vcihib3VuZHMubWluLnkgLSAzKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54ICsgNiksIE1hdGguZmxvb3IoYm91bmRzLm1heC55IC0gYm91bmRzLm1pbi55ICsgNikpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdjb25zdHJhaW50JzpcblxuICAgICAgICAgICAgICAgIC8vIHJlbmRlciBjb25zdHJhaW50IHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSBpdGVtLnBvaW50QTtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5ib2R5QSlcbiAgICAgICAgICAgICAgICAgICAgcG9pbnQgPSBpdGVtLnBvaW50QjtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuYXJjKHBvaW50LngsIHBvaW50LnksIDEwLCAwLCAyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZSgpO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29udGV4dC5zZXRMaW5lRGFzaChbXSk7XG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSgtMC41LCAtMC41KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbmRlciBzZWxlY3Rpb24gcmVnaW9uXG4gICAgICAgIGlmIChpbnNwZWN0b3Iuc2VsZWN0U3RhcnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKDAuNSwgMC41KTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVdpZHRoID0gMTtcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMTY1LDAsMC42KSc7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwxNjUsMCwwLjEpJztcbiAgICAgICAgICAgIGJvdW5kcyA9IGluc3BlY3Rvci5zZWxlY3RCb3VuZHM7XG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY29udGV4dC5yZWN0KE1hdGguZmxvb3IoYm91bmRzLm1pbi54KSwgTWF0aC5mbG9vcihib3VuZHMubWluLnkpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLmZsb29yKGJvdW5kcy5tYXgueCAtIGJvdW5kcy5taW4ueCksIE1hdGguZmxvb3IoYm91bmRzLm1heC55IC0gYm91bmRzLm1pbi55KSk7XG4gICAgICAgICAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbCgpO1xuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoLTAuNSwgLTAuNSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5oYXNCb3VuZHMpXG4gICAgICAgICAgICBjb250ZXh0LnNldFRyYW5zZm9ybSgxLCAwLCAwLCAxLCAwLCAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVDYW52YXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSB3aWR0aFxuICAgICAqIEBwYXJhbSB7fSBoZWlnaHRcbiAgICAgKiBAcmV0dXJuIGNhbnZhc1xuICAgICAqL1xuICAgIHZhciBfY3JlYXRlQ2FudmFzID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBjYW52YXMub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgICAgIGNhbnZhcy5vbnNlbGVjdHN0YXJ0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgcGl4ZWwgcmF0aW8gb2YgdGhlIGNhbnZhcy5cbiAgICAgKiBAbWV0aG9kIF9nZXRQaXhlbFJhdGlvXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjYW52YXNcbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IHBpeGVsIHJhdGlvXG4gICAgICovXG4gICAgdmFyIF9nZXRQaXhlbFJhdGlvID0gZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBkZXZpY2VQaXhlbFJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSxcbiAgICAgICAgICAgIGJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gPSBjb250ZXh0LndlYmtpdEJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHwgY29udGV4dC5tb3pCYWNraW5nU3RvcmVQaXhlbFJhdGlvXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IGNvbnRleHQubXNCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8IGNvbnRleHQub0JhY2tpbmdTdG9yZVBpeGVsUmF0aW9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29udGV4dC5iYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8IDE7XG5cbiAgICAgICAgcmV0dXJuIGRldmljZVBpeGVsUmF0aW8gLyBiYWNraW5nU3RvcmVQaXhlbFJhdGlvO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSByZXF1ZXN0ZWQgdGV4dHVyZSAoYW4gSW1hZ2UpIHZpYSBpdHMgcGF0aFxuICAgICAqIEBtZXRob2QgX2dldFRleHR1cmVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW1hZ2VQYXRoXG4gICAgICogQHJldHVybiB7SW1hZ2V9IHRleHR1cmVcbiAgICAgKi9cbiAgICB2YXIgX2dldFRleHR1cmUgPSBmdW5jdGlvbihyZW5kZXIsIGltYWdlUGF0aCkge1xuICAgICAgICB2YXIgaW1hZ2UgPSByZW5kZXIudGV4dHVyZXNbaW1hZ2VQYXRoXTtcblxuICAgICAgICBpZiAoaW1hZ2UpXG4gICAgICAgICAgICByZXR1cm4gaW1hZ2U7XG5cbiAgICAgICAgaW1hZ2UgPSByZW5kZXIudGV4dHVyZXNbaW1hZ2VQYXRoXSA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWFnZS5zcmMgPSBpbWFnZVBhdGg7XG5cbiAgICAgICAgcmV0dXJuIGltYWdlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIHRoZSBiYWNrZ3JvdW5kIHRvIHRoZSBjYW52YXMgdXNpbmcgQ1NTLlxuICAgICAqIEBtZXRob2QgYXBwbHlCYWNrZ3JvdW5kXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJhY2tncm91bmRcbiAgICAgKi9cbiAgICB2YXIgX2FwcGx5QmFja2dyb3VuZCA9IGZ1bmN0aW9uKHJlbmRlciwgYmFja2dyb3VuZCkge1xuICAgICAgICB2YXIgY3NzQmFja2dyb3VuZCA9IGJhY2tncm91bmQ7XG5cbiAgICAgICAgaWYgKC8oanBnfGdpZnxwbmcpJC8udGVzdChiYWNrZ3JvdW5kKSlcbiAgICAgICAgICAgIGNzc0JhY2tncm91bmQgPSAndXJsKCcgKyBiYWNrZ3JvdW5kICsgJyknO1xuXG4gICAgICAgIHJlbmRlci5jYW52YXMuc3R5bGUuYmFja2dyb3VuZCA9IGNzc0JhY2tncm91bmQ7XG4gICAgICAgIHJlbmRlci5jYW52YXMuc3R5bGUuYmFja2dyb3VuZFNpemUgPSBcImNvbnRhaW5cIjtcbiAgICAgICAgcmVuZGVyLmN1cnJlbnRCYWNrZ3JvdW5kID0gYmFja2dyb3VuZDtcbiAgICB9O1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgRXZlbnRzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYmVmb3JlIHJlbmRlcmluZ1xuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVSZW5kZXJcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIHJlbmRlcmluZ1xuICAgICpcbiAgICAqIEBldmVudCBhZnRlclJlbmRlclxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qXG4gICAgKlxuICAgICogIFByb3BlcnRpZXMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBiYWNrLXJlZmVyZW5jZSB0byB0aGUgYE1hdHRlci5SZW5kZXJgIG1vZHVsZS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb250cm9sbGVyXG4gICAgICogQHR5cGUgcmVuZGVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIHJlZmVyZW5jZSB0byB0aGUgYE1hdHRlci5FbmdpbmVgIGluc3RhbmNlIHRvIGJlIHVzZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgZW5naW5lXG4gICAgICogQHR5cGUgZW5naW5lXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIHJlZmVyZW5jZSB0byB0aGUgZWxlbWVudCB3aGVyZSB0aGUgY2FudmFzIGlzIHRvIGJlIGluc2VydGVkIChpZiBgcmVuZGVyLmNhbnZhc2AgaGFzIG5vdCBiZWVuIHNwZWNpZmllZClcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBlbGVtZW50XG4gICAgICogQHR5cGUgSFRNTEVsZW1lbnRcbiAgICAgKiBAZGVmYXVsdCBudWxsXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgY2FudmFzIGVsZW1lbnQgdG8gcmVuZGVyIHRvLiBJZiBub3Qgc3BlY2lmaWVkLCBvbmUgd2lsbCBiZSBjcmVhdGVkIGlmIGByZW5kZXIuZWxlbWVudGAgaGFzIGJlZW4gc3BlY2lmaWVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNhbnZhc1xuICAgICAqIEB0eXBlIEhUTUxDYW52YXNFbGVtZW50XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBvZiB0aGUgcmVuZGVyZXIuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgb3B0aW9uc1xuICAgICAqIEB0eXBlIHt9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdGFyZ2V0IHdpZHRoIGluIHBpeGVscyBvZiB0aGUgYHJlbmRlci5jYW52YXNgIHRvIGJlIGNyZWF0ZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgb3B0aW9ucy53aWR0aFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDgwMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHRhcmdldCBoZWlnaHQgaW4gcGl4ZWxzIG9mIHRoZSBgcmVuZGVyLmNhbnZhc2AgdG8gYmUgY3JlYXRlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBvcHRpb25zLmhlaWdodFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDYwMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgc3BlY2lmaWVzIGlmIGByZW5kZXIuYm91bmRzYCBzaG91bGQgYmUgdXNlZCB3aGVuIHJlbmRlcmluZy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBvcHRpb25zLmhhc0JvdW5kc1xuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgQm91bmRzYCBvYmplY3QgdGhhdCBzcGVjaWZpZXMgdGhlIGRyYXdpbmcgdmlldyByZWdpb24uIFxuICAgICAqIFJlbmRlcmluZyB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgdHJhbnNmb3JtZWQgYW5kIHNjYWxlZCB0byBmaXQgd2l0aGluIHRoZSBjYW52YXMgc2l6ZSAoYHJlbmRlci5vcHRpb25zLndpZHRoYCBhbmQgYHJlbmRlci5vcHRpb25zLmhlaWdodGApLlxuICAgICAqIFRoaXMgYWxsb3dzIGZvciBjcmVhdGluZyB2aWV3cyB0aGF0IGNhbiBwYW4gb3Igem9vbSBhcm91bmQgdGhlIHNjZW5lLlxuICAgICAqIFlvdSBtdXN0IGFsc28gc2V0IGByZW5kZXIub3B0aW9ucy5oYXNCb3VuZHNgIHRvIGB0cnVlYCB0byBlbmFibGUgYm91bmRlZCByZW5kZXJpbmcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm91bmRzXG4gICAgICogQHR5cGUgYm91bmRzXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgMmQgcmVuZGVyaW5nIGNvbnRleHQgZnJvbSB0aGUgYHJlbmRlci5jYW52YXNgIGVsZW1lbnQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29udGV4dFxuICAgICAqIEB0eXBlIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNwcml0ZSB0ZXh0dXJlIGNhY2hlLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHRleHR1cmVzXG4gICAgICogQHR5cGUge31cbiAgICAgKi9cblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5SZW5kZXJQaXhpYCBtb2R1bGUgaXMgYW4gZXhhbXBsZSByZW5kZXJlciB1c2luZyBwaXhpLmpzLlxuKiBTZWUgYWxzbyBgTWF0dGVyLlJlbmRlcmAgZm9yIGEgY2FudmFzIGJhc2VkIHJlbmRlcmVyLlxuKlxuKiBAY2xhc3MgUmVuZGVyUGl4aVxuKiBAZGVwcmVjYXRlZCB0aGUgTWF0dGVyLlJlbmRlclBpeGkgbW9kdWxlIHdpbGwgc29vbiBiZSByZW1vdmVkIGZyb20gdGhlIE1hdHRlci5qcyBjb3JlLlxuKiBJdCB3aWxsIGxpa2VseSBiZSBtb3ZlZCB0byBpdHMgb3duIHJlcG9zaXRvcnkgKGJ1dCBtYWludGVuYW5jZSB3aWxsIGJlIGxpbWl0ZWQpLlxuKi9cblxudmFyIFJlbmRlclBpeGkgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJQaXhpO1xuXG52YXIgQ29tcG9zaXRlID0gcmVxdWlyZSgnLi4vYm9keS9Db21wb3NpdGUnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgX3JlcXVlc3RBbmltYXRpb25GcmFtZSxcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lO1xuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IGZ1bmN0aW9uKGNhbGxiYWNrKXsgd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGNhbGxiYWNrKENvbW1vbi5ub3coKSk7IH0sIDEwMDAgLyA2MCk7IH07XG4gICBcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc0NhbmNlbEFuaW1hdGlvbkZyYW1lO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IFBpeGkuanMgV2ViR0wgcmVuZGVyZXJcbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7UmVuZGVyUGl4aX0gQSBuZXcgcmVuZGVyZXJcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIFJlbmRlclBpeGkuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBDb21tb24ubG9nKCdSZW5kZXJQaXhpLmNyZWF0ZTogTWF0dGVyLlJlbmRlclBpeGkgaXMgZGVwcmVjYXRlZCAoc2VlIGRvY3MpJywgJ3dhcm4nKTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjb250cm9sbGVyOiBSZW5kZXJQaXhpLFxuICAgICAgICAgICAgZW5naW5lOiBudWxsLFxuICAgICAgICAgICAgZWxlbWVudDogbnVsbCxcbiAgICAgICAgICAgIGZyYW1lUmVxdWVzdElkOiBudWxsLFxuICAgICAgICAgICAgY2FudmFzOiBudWxsLFxuICAgICAgICAgICAgcmVuZGVyZXI6IG51bGwsXG4gICAgICAgICAgICBjb250YWluZXI6IG51bGwsXG4gICAgICAgICAgICBzcHJpdGVDb250YWluZXI6IG51bGwsXG4gICAgICAgICAgICBwaXhpT3B0aW9uczogbnVsbCxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogODAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogNjAwLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6ICcjZmFmYWZhJyxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWVCYWNrZ3JvdW5kOiAnIzIyMicsXG4gICAgICAgICAgICAgICAgaGFzQm91bmRzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHdpcmVmcmFtZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1NsZWVwaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dEZWJ1ZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0Jyb2FkcGhhc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dCb3VuZHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dWZWxvY2l0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0NvbGxpc2lvbnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dBeGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93UG9zaXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93QW5nbGVJbmRpY2F0b3I6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dJZHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dTaGFkb3dzOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZW5kZXIgPSBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKSxcbiAgICAgICAgICAgIHRyYW5zcGFyZW50ID0gIXJlbmRlci5vcHRpb25zLndpcmVmcmFtZXMgJiYgcmVuZGVyLm9wdGlvbnMuYmFja2dyb3VuZCA9PT0gJ3RyYW5zcGFyZW50JztcblxuICAgICAgICAvLyBpbml0IHBpeGlcbiAgICAgICAgcmVuZGVyLnBpeGlPcHRpb25zID0gcmVuZGVyLnBpeGlPcHRpb25zIHx8IHtcbiAgICAgICAgICAgIHZpZXc6IHJlbmRlci5jYW52YXMsXG4gICAgICAgICAgICB0cmFuc3BhcmVudDogdHJhbnNwYXJlbnQsXG4gICAgICAgICAgICBhbnRpYWxpYXM6IHRydWUsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IG9wdGlvbnMuYmFja2dyb3VuZFxuICAgICAgICB9O1xuXG4gICAgICAgIHJlbmRlci5tb3VzZSA9IG9wdGlvbnMubW91c2U7XG4gICAgICAgIHJlbmRlci5lbmdpbmUgPSBvcHRpb25zLmVuZ2luZTtcbiAgICAgICAgcmVuZGVyLnJlbmRlcmVyID0gcmVuZGVyLnJlbmRlcmVyIHx8IG5ldyBQSVhJLldlYkdMUmVuZGVyZXIocmVuZGVyLm9wdGlvbnMud2lkdGgsIHJlbmRlci5vcHRpb25zLmhlaWdodCwgcmVuZGVyLnBpeGlPcHRpb25zKTtcbiAgICAgICAgcmVuZGVyLmNvbnRhaW5lciA9IHJlbmRlci5jb250YWluZXIgfHwgbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgICAgIHJlbmRlci5zcHJpdGVDb250YWluZXIgPSByZW5kZXIuc3ByaXRlQ29udGFpbmVyIHx8IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuICAgICAgICByZW5kZXIuY2FudmFzID0gcmVuZGVyLmNhbnZhcyB8fCByZW5kZXIucmVuZGVyZXIudmlldztcbiAgICAgICAgcmVuZGVyLmJvdW5kcyA9IHJlbmRlci5ib3VuZHMgfHwgeyBcbiAgICAgICAgICAgIG1pbjoge1xuICAgICAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICAgICAgeTogMFxuICAgICAgICAgICAgfSwgXG4gICAgICAgICAgICBtYXg6IHsgXG4gICAgICAgICAgICAgICAgeDogcmVuZGVyLm9wdGlvbnMud2lkdGgsXG4gICAgICAgICAgICAgICAgeTogcmVuZGVyLm9wdGlvbnMuaGVpZ2h0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gY2FjaGVzXG4gICAgICAgIHJlbmRlci50ZXh0dXJlcyA9IHt9O1xuICAgICAgICByZW5kZXIuc3ByaXRlcyA9IHt9O1xuICAgICAgICByZW5kZXIucHJpbWl0aXZlcyA9IHt9O1xuXG4gICAgICAgIC8vIHVzZSBhIHNwcml0ZSBiYXRjaCBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgcmVuZGVyLmNvbnRhaW5lci5hZGRDaGlsZChyZW5kZXIuc3ByaXRlQ29udGFpbmVyKTtcblxuICAgICAgICAvLyBpbnNlcnQgY2FudmFzXG4gICAgICAgIGlmIChDb21tb24uaXNFbGVtZW50KHJlbmRlci5lbGVtZW50KSkge1xuICAgICAgICAgICAgcmVuZGVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQocmVuZGVyLmNhbnZhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb21tb24ubG9nKCdObyBcInJlbmRlci5lbGVtZW50XCIgcGFzc2VkLCBcInJlbmRlci5jYW52YXNcIiB3YXMgbm90IGluc2VydGVkIGludG8gZG9jdW1lbnQuJywgJ3dhcm4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHByZXZlbnQgbWVudXMgb24gY2FudmFzXG4gICAgICAgIHJlbmRlci5jYW52YXMub25jb250ZXh0bWVudSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH07XG4gICAgICAgIHJlbmRlci5jYW52YXMub25zZWxlY3RzdGFydCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbiAgICAgICAgcmV0dXJuIHJlbmRlcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29udGludW91c2x5IHVwZGF0ZXMgdGhlIHJlbmRlciBjYW52YXMgb24gdGhlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIGV2ZW50LlxuICAgICAqIEBtZXRob2QgcnVuXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgUmVuZGVyUGl4aS5ydW4gPSBmdW5jdGlvbihyZW5kZXIpIHtcbiAgICAgICAgKGZ1bmN0aW9uIGxvb3AodGltZSl7XG4gICAgICAgICAgICByZW5kZXIuZnJhbWVSZXF1ZXN0SWQgPSBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGxvb3ApO1xuICAgICAgICAgICAgUmVuZGVyUGl4aS53b3JsZChyZW5kZXIpO1xuICAgICAgICB9KSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmRzIGV4ZWN1dGlvbiBvZiBgUmVuZGVyLnJ1bmAgb24gdGhlIGdpdmVuIGByZW5kZXJgLCBieSBjYW5jZWxpbmcgdGhlIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0IGV2ZW50IGxvb3AuXG4gICAgICogQG1ldGhvZCBzdG9wXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgUmVuZGVyUGl4aS5zdG9wID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIF9jYW5jZWxBbmltYXRpb25GcmFtZShyZW5kZXIuZnJhbWVSZXF1ZXN0SWQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIHNjZW5lIGdyYXBoXG4gICAgICogQG1ldGhvZCBjbGVhclxuICAgICAqIEBwYXJhbSB7UmVuZGVyUGl4aX0gcmVuZGVyXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLmNsZWFyID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSByZW5kZXIuY29udGFpbmVyLFxuICAgICAgICAgICAgc3ByaXRlQ29udGFpbmVyID0gcmVuZGVyLnNwcml0ZUNvbnRhaW5lcjtcblxuICAgICAgICAvLyBjbGVhciBzdGFnZSBjb250YWluZXJcbiAgICAgICAgd2hpbGUgKGNvbnRhaW5lci5jaGlsZHJlblswXSkgeyBcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuY2hpbGRyZW5bMF0pOyBcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIHNwcml0ZSBiYXRjaFxuICAgICAgICB3aGlsZSAoc3ByaXRlQ29udGFpbmVyLmNoaWxkcmVuWzBdKSB7IFxuICAgICAgICAgICAgc3ByaXRlQ29udGFpbmVyLnJlbW92ZUNoaWxkKHNwcml0ZUNvbnRhaW5lci5jaGlsZHJlblswXSk7IFxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGJnU3ByaXRlID0gcmVuZGVyLnNwcml0ZXNbJ2JnLTAnXTtcblxuICAgICAgICAvLyBjbGVhciBjYWNoZXNcbiAgICAgICAgcmVuZGVyLnRleHR1cmVzID0ge307XG4gICAgICAgIHJlbmRlci5zcHJpdGVzID0ge307XG4gICAgICAgIHJlbmRlci5wcmltaXRpdmVzID0ge307XG5cbiAgICAgICAgLy8gc2V0IGJhY2tncm91bmQgc3ByaXRlXG4gICAgICAgIHJlbmRlci5zcHJpdGVzWydiZy0wJ10gPSBiZ1Nwcml0ZTtcbiAgICAgICAgaWYgKGJnU3ByaXRlKVxuICAgICAgICAgICAgY29udGFpbmVyLmFkZENoaWxkQXQoYmdTcHJpdGUsIDApO1xuXG4gICAgICAgIC8vIGFkZCBzcHJpdGUgYmF0Y2ggYmFjayBpbnRvIGNvbnRhaW5lclxuICAgICAgICByZW5kZXIuY29udGFpbmVyLmFkZENoaWxkKHJlbmRlci5zcHJpdGVDb250YWluZXIpO1xuXG4gICAgICAgIC8vIHJlc2V0IGJhY2tncm91bmQgc3RhdGVcbiAgICAgICAgcmVuZGVyLmN1cnJlbnRCYWNrZ3JvdW5kID0gbnVsbDtcblxuICAgICAgICAvLyByZXNldCBib3VuZHMgdHJhbnNmb3Jtc1xuICAgICAgICBjb250YWluZXIuc2NhbGUuc2V0KDEsIDEpO1xuICAgICAgICBjb250YWluZXIucG9zaXRpb24uc2V0KDAsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBiYWNrZ3JvdW5kIG9mIHRoZSBjYW52YXMgXG4gICAgICogQG1ldGhvZCBzZXRCYWNrZ3JvdW5kXG4gICAgICogQHBhcmFtIHtSZW5kZXJQaXhpfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYmFja2dyb3VuZFxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgUmVuZGVyUGl4aS5zZXRCYWNrZ3JvdW5kID0gZnVuY3Rpb24ocmVuZGVyLCBiYWNrZ3JvdW5kKSB7XG4gICAgICAgIGlmIChyZW5kZXIuY3VycmVudEJhY2tncm91bmQgIT09IGJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHZhciBpc0NvbG9yID0gYmFja2dyb3VuZC5pbmRleE9mICYmIGJhY2tncm91bmQuaW5kZXhPZignIycpICE9PSAtMSxcbiAgICAgICAgICAgICAgICBiZ1Nwcml0ZSA9IHJlbmRlci5zcHJpdGVzWydiZy0wJ107XG5cbiAgICAgICAgICAgIGlmIChpc0NvbG9yKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgc29saWQgYmFja2dyb3VuZCBjb2xvclxuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IENvbW1vbi5jb2xvclRvTnVtYmVyKGJhY2tncm91bmQpO1xuICAgICAgICAgICAgICAgIHJlbmRlci5yZW5kZXJlci5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcjtcblxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBiYWNrZ3JvdW5kIHNwcml0ZSBpZiBleGlzdGluZ1xuICAgICAgICAgICAgICAgIGlmIChiZ1Nwcml0ZSlcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyLmNvbnRhaW5lci5yZW1vdmVDaGlsZChiZ1Nwcml0ZSk7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBpbml0aWFsaXNlIGJhY2tncm91bmQgc3ByaXRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGlmICghYmdTcHJpdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRleHR1cmUgPSBfZ2V0VGV4dHVyZShyZW5kZXIsIGJhY2tncm91bmQpO1xuXG4gICAgICAgICAgICAgICAgICAgIGJnU3ByaXRlID0gcmVuZGVyLnNwcml0ZXNbJ2JnLTAnXSA9IG5ldyBQSVhJLlNwcml0ZSh0ZXh0dXJlKTtcbiAgICAgICAgICAgICAgICAgICAgYmdTcHJpdGUucG9zaXRpb24ueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGJnU3ByaXRlLnBvc2l0aW9uLnkgPSAwO1xuICAgICAgICAgICAgICAgICAgICByZW5kZXIuY29udGFpbmVyLmFkZENoaWxkQXQoYmdTcHJpdGUsIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVuZGVyLmN1cnJlbnRCYWNrZ3JvdW5kID0gYmFja2dyb3VuZDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBtZXRob2Qgd29ybGRcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLndvcmxkID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIHZhciBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgd29ybGQgPSBlbmdpbmUud29ybGQsXG4gICAgICAgICAgICByZW5kZXJlciA9IHJlbmRlci5yZW5kZXJlcixcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IHJlbmRlci5jb250YWluZXIsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBib2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKHdvcmxkKSxcbiAgICAgICAgICAgIGFsbENvbnN0cmFpbnRzID0gQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzKHdvcmxkKSxcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzID0gW10sXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgIFJlbmRlclBpeGkuc2V0QmFja2dyb3VuZChyZW5kZXIsIG9wdGlvbnMud2lyZWZyYW1lQmFja2dyb3VuZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBSZW5kZXJQaXhpLnNldEJhY2tncm91bmQocmVuZGVyLCBvcHRpb25zLmJhY2tncm91bmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIGJvdW5kc1xuICAgICAgICB2YXIgYm91bmRzV2lkdGggPSByZW5kZXIuYm91bmRzLm1heC54IC0gcmVuZGVyLmJvdW5kcy5taW4ueCxcbiAgICAgICAgICAgIGJvdW5kc0hlaWdodCA9IHJlbmRlci5ib3VuZHMubWF4LnkgLSByZW5kZXIuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgYm91bmRzU2NhbGVYID0gYm91bmRzV2lkdGggLyByZW5kZXIub3B0aW9ucy53aWR0aCxcbiAgICAgICAgICAgIGJvdW5kc1NjYWxlWSA9IGJvdW5kc0hlaWdodCAvIHJlbmRlci5vcHRpb25zLmhlaWdodDtcblxuICAgICAgICBpZiAob3B0aW9ucy5oYXNCb3VuZHMpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYm9kaWVzIHRoYXQgYXJlIG5vdCBpbiB2aWV3XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG4gICAgICAgICAgICAgICAgYm9keS5yZW5kZXIuc3ByaXRlLnZpc2libGUgPSBCb3VuZHMub3ZlcmxhcHMoYm9keS5ib3VuZHMsIHJlbmRlci5ib3VuZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGNvbnN0cmFpbnRzIHRoYXQgYXJlIG5vdCBpbiB2aWV3XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYWxsQ29uc3RyYWludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY29uc3RyYWludCA9IGFsbENvbnN0cmFpbnRzW2ldLFxuICAgICAgICAgICAgICAgICAgICBib2R5QSA9IGNvbnN0cmFpbnQuYm9keUEsXG4gICAgICAgICAgICAgICAgICAgIGJvZHlCID0gY29uc3RyYWludC5ib2R5QixcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRBV29ybGQgPSBjb25zdHJhaW50LnBvaW50QSxcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRCV29ybGQgPSBjb25zdHJhaW50LnBvaW50QjtcblxuICAgICAgICAgICAgICAgIGlmIChib2R5QSkgcG9pbnRBV29ybGQgPSBWZWN0b3IuYWRkKGJvZHlBLnBvc2l0aW9uLCBjb25zdHJhaW50LnBvaW50QSk7XG4gICAgICAgICAgICAgICAgaWYgKGJvZHlCKSBwb2ludEJXb3JsZCA9IFZlY3Rvci5hZGQoYm9keUIucG9zaXRpb24sIGNvbnN0cmFpbnQucG9pbnRCKTtcblxuICAgICAgICAgICAgICAgIGlmICghcG9pbnRBV29ybGQgfHwgIXBvaW50QldvcmxkKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIGlmIChCb3VuZHMuY29udGFpbnMocmVuZGVyLmJvdW5kcywgcG9pbnRBV29ybGQpIHx8IEJvdW5kcy5jb250YWlucyhyZW5kZXIuYm91bmRzLCBwb2ludEJXb3JsZCkpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzLnB1c2goY29uc3RyYWludCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRyYW5zZm9ybSB0aGUgdmlld1xuICAgICAgICAgICAgY29udGFpbmVyLnNjYWxlLnNldCgxIC8gYm91bmRzU2NhbGVYLCAxIC8gYm91bmRzU2NhbGVZKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5wb3NpdGlvbi5zZXQoLXJlbmRlci5ib3VuZHMubWluLnggKiAoMSAvIGJvdW5kc1NjYWxlWCksIC1yZW5kZXIuYm91bmRzLm1pbi55ICogKDEgLyBib3VuZHNTY2FsZVkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzID0gYWxsQ29uc3RyYWludHM7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgUmVuZGVyUGl4aS5ib2R5KHJlbmRlciwgYm9kaWVzW2ldKTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgY29uc3RyYWludHMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBSZW5kZXJQaXhpLmNvbnN0cmFpbnQocmVuZGVyLCBjb25zdHJhaW50c1tpXSk7XG5cbiAgICAgICAgcmVuZGVyZXIucmVuZGVyKGNvbnRhaW5lcik7XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAbWV0aG9kIGNvbnN0cmFpbnRcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50fSBjb25zdHJhaW50XG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLmNvbnN0cmFpbnQgPSBmdW5jdGlvbihyZW5kZXIsIGNvbnN0cmFpbnQpIHtcbiAgICAgICAgdmFyIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICBib2R5QSA9IGNvbnN0cmFpbnQuYm9keUEsXG4gICAgICAgICAgICBib2R5QiA9IGNvbnN0cmFpbnQuYm9keUIsXG4gICAgICAgICAgICBwb2ludEEgPSBjb25zdHJhaW50LnBvaW50QSxcbiAgICAgICAgICAgIHBvaW50QiA9IGNvbnN0cmFpbnQucG9pbnRCLFxuICAgICAgICAgICAgY29udGFpbmVyID0gcmVuZGVyLmNvbnRhaW5lcixcbiAgICAgICAgICAgIGNvbnN0cmFpbnRSZW5kZXIgPSBjb25zdHJhaW50LnJlbmRlcixcbiAgICAgICAgICAgIHByaW1pdGl2ZUlkID0gJ2MtJyArIGNvbnN0cmFpbnQuaWQsXG4gICAgICAgICAgICBwcmltaXRpdmUgPSByZW5kZXIucHJpbWl0aXZlc1twcmltaXRpdmVJZF07XG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSBjb25zdHJhaW50IHByaW1pdGl2ZSBpZiBub3QgZXhpc3RpbmdcbiAgICAgICAgaWYgKCFwcmltaXRpdmUpXG4gICAgICAgICAgICBwcmltaXRpdmUgPSByZW5kZXIucHJpbWl0aXZlc1twcmltaXRpdmVJZF0gPSBuZXcgUElYSS5HcmFwaGljcygpO1xuXG4gICAgICAgIC8vIGRvbid0IHJlbmRlciBpZiBjb25zdHJhaW50IGRvZXMgbm90IGhhdmUgdHdvIGVuZCBwb2ludHNcbiAgICAgICAgaWYgKCFjb25zdHJhaW50UmVuZGVyLnZpc2libGUgfHwgIWNvbnN0cmFpbnQucG9pbnRBIHx8ICFjb25zdHJhaW50LnBvaW50Qikge1xuICAgICAgICAgICAgcHJpbWl0aXZlLmNsZWFyKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhZGQgdG8gc2NlbmUgZ3JhcGggaWYgbm90IGFscmVhZHkgdGhlcmVcbiAgICAgICAgaWYgKENvbW1vbi5pbmRleE9mKGNvbnRhaW5lci5jaGlsZHJlbiwgcHJpbWl0aXZlKSA9PT0gLTEpXG4gICAgICAgICAgICBjb250YWluZXIuYWRkQ2hpbGQocHJpbWl0aXZlKTtcblxuICAgICAgICAvLyByZW5kZXIgdGhlIGNvbnN0cmFpbnQgb24gZXZlcnkgdXBkYXRlLCBzaW5jZSB0aGV5IGNhbiBjaGFuZ2UgZHluYW1pY2FsbHlcbiAgICAgICAgcHJpbWl0aXZlLmNsZWFyKCk7XG4gICAgICAgIHByaW1pdGl2ZS5iZWdpbkZpbGwoMCwgMCk7XG4gICAgICAgIHByaW1pdGl2ZS5saW5lU3R5bGUoY29uc3RyYWludFJlbmRlci5saW5lV2lkdGgsIENvbW1vbi5jb2xvclRvTnVtYmVyKGNvbnN0cmFpbnRSZW5kZXIuc3Ryb2tlU3R5bGUpLCAxKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChib2R5QSkge1xuICAgICAgICAgICAgcHJpbWl0aXZlLm1vdmVUbyhib2R5QS5wb3NpdGlvbi54ICsgcG9pbnRBLngsIGJvZHlBLnBvc2l0aW9uLnkgKyBwb2ludEEueSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcmltaXRpdmUubW92ZVRvKHBvaW50QS54LCBwb2ludEEueSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYm9keUIpIHtcbiAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lVG8oYm9keUIucG9zaXRpb24ueCArIHBvaW50Qi54LCBib2R5Qi5wb3NpdGlvbi55ICsgcG9pbnRCLnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHJpbWl0aXZlLmxpbmVUbyhwb2ludEIueCwgcG9pbnRCLnkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJpbWl0aXZlLmVuZEZpbGwoKTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQG1ldGhvZCBib2R5XG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgUmVuZGVyUGl4aS5ib2R5ID0gZnVuY3Rpb24ocmVuZGVyLCBib2R5KSB7XG4gICAgICAgIHZhciBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgYm9keVJlbmRlciA9IGJvZHkucmVuZGVyO1xuXG4gICAgICAgIGlmICghYm9keVJlbmRlci52aXNpYmxlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGlmIChib2R5UmVuZGVyLnNwcml0ZSAmJiBib2R5UmVuZGVyLnNwcml0ZS50ZXh0dXJlKSB7XG4gICAgICAgICAgICB2YXIgc3ByaXRlSWQgPSAnYi0nICsgYm9keS5pZCxcbiAgICAgICAgICAgICAgICBzcHJpdGUgPSByZW5kZXIuc3ByaXRlc1tzcHJpdGVJZF0sXG4gICAgICAgICAgICAgICAgc3ByaXRlQ29udGFpbmVyID0gcmVuZGVyLnNwcml0ZUNvbnRhaW5lcjtcblxuICAgICAgICAgICAgLy8gaW5pdGlhbGlzZSBib2R5IHNwcml0ZSBpZiBub3QgZXhpc3RpbmdcbiAgICAgICAgICAgIGlmICghc3ByaXRlKVxuICAgICAgICAgICAgICAgIHNwcml0ZSA9IHJlbmRlci5zcHJpdGVzW3Nwcml0ZUlkXSA9IF9jcmVhdGVCb2R5U3ByaXRlKHJlbmRlciwgYm9keSk7XG5cbiAgICAgICAgICAgIC8vIGFkZCB0byBzY2VuZSBncmFwaCBpZiBub3QgYWxyZWFkeSB0aGVyZVxuICAgICAgICAgICAgaWYgKENvbW1vbi5pbmRleE9mKHNwcml0ZUNvbnRhaW5lci5jaGlsZHJlbiwgc3ByaXRlKSA9PT0gLTEpXG4gICAgICAgICAgICAgICAgc3ByaXRlQ29udGFpbmVyLmFkZENoaWxkKHNwcml0ZSk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBib2R5IHNwcml0ZVxuICAgICAgICAgICAgc3ByaXRlLnBvc2l0aW9uLnggPSBib2R5LnBvc2l0aW9uLng7XG4gICAgICAgICAgICBzcHJpdGUucG9zaXRpb24ueSA9IGJvZHkucG9zaXRpb24ueTtcbiAgICAgICAgICAgIHNwcml0ZS5yb3RhdGlvbiA9IGJvZHkuYW5nbGU7XG4gICAgICAgICAgICBzcHJpdGUuc2NhbGUueCA9IGJvZHlSZW5kZXIuc3ByaXRlLnhTY2FsZSB8fCAxO1xuICAgICAgICAgICAgc3ByaXRlLnNjYWxlLnkgPSBib2R5UmVuZGVyLnNwcml0ZS55U2NhbGUgfHwgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcmltaXRpdmVJZCA9ICdiLScgKyBib2R5LmlkLFxuICAgICAgICAgICAgICAgIHByaW1pdGl2ZSA9IHJlbmRlci5wcmltaXRpdmVzW3ByaW1pdGl2ZUlkXSxcbiAgICAgICAgICAgICAgICBjb250YWluZXIgPSByZW5kZXIuY29udGFpbmVyO1xuXG4gICAgICAgICAgICAvLyBpbml0aWFsaXNlIGJvZHkgcHJpbWl0aXZlIGlmIG5vdCBleGlzdGluZ1xuICAgICAgICAgICAgaWYgKCFwcmltaXRpdmUpIHtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUgPSByZW5kZXIucHJpbWl0aXZlc1twcmltaXRpdmVJZF0gPSBfY3JlYXRlQm9keVByaW1pdGl2ZShyZW5kZXIsIGJvZHkpO1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5pbml0aWFsQW5nbGUgPSBib2R5LmFuZ2xlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgdG8gc2NlbmUgZ3JhcGggaWYgbm90IGFscmVhZHkgdGhlcmVcbiAgICAgICAgICAgIGlmIChDb21tb24uaW5kZXhPZihjb250YWluZXIuY2hpbGRyZW4sIHByaW1pdGl2ZSkgPT09IC0xKVxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZChwcmltaXRpdmUpO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgYm9keSBwcmltaXRpdmVcbiAgICAgICAgICAgIHByaW1pdGl2ZS5wb3NpdGlvbi54ID0gYm9keS5wb3NpdGlvbi54O1xuICAgICAgICAgICAgcHJpbWl0aXZlLnBvc2l0aW9uLnkgPSBib2R5LnBvc2l0aW9uLnk7XG4gICAgICAgICAgICBwcmltaXRpdmUucm90YXRpb24gPSBib2R5LmFuZ2xlIC0gcHJpbWl0aXZlLmluaXRpYWxBbmdsZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYm9keSBzcHJpdGVcbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVCb2R5U3ByaXRlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge1JlbmRlclBpeGl9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEByZXR1cm4ge1BJWEkuU3ByaXRlfSBzcHJpdGVcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIHZhciBfY3JlYXRlQm9keVNwcml0ZSA9IGZ1bmN0aW9uKHJlbmRlciwgYm9keSkge1xuICAgICAgICB2YXIgYm9keVJlbmRlciA9IGJvZHkucmVuZGVyLFxuICAgICAgICAgICAgdGV4dHVyZVBhdGggPSBib2R5UmVuZGVyLnNwcml0ZS50ZXh0dXJlLFxuICAgICAgICAgICAgdGV4dHVyZSA9IF9nZXRUZXh0dXJlKHJlbmRlciwgdGV4dHVyZVBhdGgpLFxuICAgICAgICAgICAgc3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpO1xuXG4gICAgICAgIHNwcml0ZS5hbmNob3IueCA9IGJvZHkucmVuZGVyLnNwcml0ZS54T2Zmc2V0O1xuICAgICAgICBzcHJpdGUuYW5jaG9yLnkgPSBib2R5LnJlbmRlci5zcHJpdGUueU9mZnNldDtcblxuICAgICAgICByZXR1cm4gc3ByaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYm9keSBwcmltaXRpdmVcbiAgICAgKiBAbWV0aG9kIF9jcmVhdGVCb2R5UHJpbWl0aXZlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge1JlbmRlclBpeGl9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEByZXR1cm4ge1BJWEkuR3JhcGhpY3N9IGdyYXBoaWNzXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICB2YXIgX2NyZWF0ZUJvZHlQcmltaXRpdmUgPSBmdW5jdGlvbihyZW5kZXIsIGJvZHkpIHtcbiAgICAgICAgdmFyIGJvZHlSZW5kZXIgPSBib2R5LnJlbmRlcixcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIHByaW1pdGl2ZSA9IG5ldyBQSVhJLkdyYXBoaWNzKCksXG4gICAgICAgICAgICBmaWxsU3R5bGUgPSBDb21tb24uY29sb3JUb051bWJlcihib2R5UmVuZGVyLmZpbGxTdHlsZSksXG4gICAgICAgICAgICBzdHJva2VTdHlsZSA9IENvbW1vbi5jb2xvclRvTnVtYmVyKGJvZHlSZW5kZXIuc3Ryb2tlU3R5bGUpLFxuICAgICAgICAgICAgc3Ryb2tlU3R5bGVJbmRpY2F0b3IgPSBDb21tb24uY29sb3JUb051bWJlcihib2R5UmVuZGVyLnN0cm9rZVN0eWxlKSxcbiAgICAgICAgICAgIHN0cm9rZVN0eWxlV2lyZWZyYW1lID0gQ29tbW9uLmNvbG9yVG9OdW1iZXIoJyNiYmInKSxcbiAgICAgICAgICAgIHN0cm9rZVN0eWxlV2lyZWZyYW1lSW5kaWNhdG9yID0gQ29tbW9uLmNvbG9yVG9OdW1iZXIoJyNDRDVDNUMnKSxcbiAgICAgICAgICAgIHBhcnQ7XG5cbiAgICAgICAgcHJpbWl0aXZlLmNsZWFyKCk7XG5cbiAgICAgICAgLy8gaGFuZGxlIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgIGZvciAodmFyIGsgPSBib2R5LnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgayA8IGJvZHkucGFydHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgIHBhcnQgPSBib2R5LnBhcnRzW2tdO1xuXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5iZWdpbkZpbGwoZmlsbFN0eWxlLCAxKTtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVN0eWxlKGJvZHlSZW5kZXIubGluZVdpZHRoLCBzdHJva2VTdHlsZSwgMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5iZWdpbkZpbGwoMCwgMCk7XG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlLmxpbmVTdHlsZSgxLCBzdHJva2VTdHlsZVdpcmVmcmFtZSwgMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByaW1pdGl2ZS5tb3ZlVG8ocGFydC52ZXJ0aWNlc1swXS54IC0gYm9keS5wb3NpdGlvbi54LCBwYXJ0LnZlcnRpY2VzWzBdLnkgLSBib2R5LnBvc2l0aW9uLnkpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMTsgaiA8IHBhcnQudmVydGljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVRvKHBhcnQudmVydGljZXNbal0ueCAtIGJvZHkucG9zaXRpb24ueCwgcGFydC52ZXJ0aWNlc1tqXS55IC0gYm9keS5wb3NpdGlvbi55KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJpbWl0aXZlLmxpbmVUbyhwYXJ0LnZlcnRpY2VzWzBdLnggLSBib2R5LnBvc2l0aW9uLngsIHBhcnQudmVydGljZXNbMF0ueSAtIGJvZHkucG9zaXRpb24ueSk7XG5cbiAgICAgICAgICAgIHByaW1pdGl2ZS5lbmRGaWxsKCk7XG5cbiAgICAgICAgICAgIC8vIGFuZ2xlIGluZGljYXRvclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2hvd0FuZ2xlSW5kaWNhdG9yIHx8IG9wdGlvbnMuc2hvd0F4ZXMpIHtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUuYmVnaW5GaWxsKDAsIDApO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVN0eWxlKDEsIHN0cm9rZVN0eWxlV2lyZWZyYW1lSW5kaWNhdG9yLCAxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVN0eWxlKDEsIHN0cm9rZVN0eWxlSW5kaWNhdG9yKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBwcmltaXRpdmUubW92ZVRvKHBhcnQucG9zaXRpb24ueCAtIGJvZHkucG9zaXRpb24ueCwgcGFydC5wb3NpdGlvbi55IC0gYm9keS5wb3NpdGlvbi55KTtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVRvKCgocGFydC52ZXJ0aWNlc1swXS54ICsgcGFydC52ZXJ0aWNlc1twYXJ0LnZlcnRpY2VzLmxlbmd0aC0xXS54KSAvIDIgLSBib2R5LnBvc2l0aW9uLngpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgocGFydC52ZXJ0aWNlc1swXS55ICsgcGFydC52ZXJ0aWNlc1twYXJ0LnZlcnRpY2VzLmxlbmd0aC0xXS55KSAvIDIgLSBib2R5LnBvc2l0aW9uLnkpKTtcblxuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5lbmRGaWxsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJpbWl0aXZlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSByZXF1ZXN0ZWQgdGV4dHVyZSAoYSBQSVhJLlRleHR1cmUpIHZpYSBpdHMgcGF0aFxuICAgICAqIEBtZXRob2QgX2dldFRleHR1cmVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7UmVuZGVyUGl4aX0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGltYWdlUGF0aFxuICAgICAqIEByZXR1cm4ge1BJWEkuVGV4dHVyZX0gdGV4dHVyZVxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgdmFyIF9nZXRUZXh0dXJlID0gZnVuY3Rpb24ocmVuZGVyLCBpbWFnZVBhdGgpIHtcbiAgICAgICAgdmFyIHRleHR1cmUgPSByZW5kZXIudGV4dHVyZXNbaW1hZ2VQYXRoXTtcblxuICAgICAgICBpZiAoIXRleHR1cmUpXG4gICAgICAgICAgICB0ZXh0dXJlID0gcmVuZGVyLnRleHR1cmVzW2ltYWdlUGF0aF0gPSBQSVhJLlRleHR1cmUuZnJvbUltYWdlKGltYWdlUGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHRleHR1cmU7XG4gICAgfTtcblxufSkoKTtcbiJdfQ==
