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
var Matter = require("matter-js");

function createPhysics(cfg){

  cfg = cfg || {};

  var shape = cfg.shape || {
    type : Math.random() > .5 ? "circle" : "rectangle",
    radius : Math.random() * 10 + 1,
    width : Math.random() * 10 + 1,
    height : Math.random() * 10 + 1
  };

  var body = null;

  //  http://brm.io/matter-js/docs/classes/Bodies.html
  if (shape.type === "circle"){
    body = Matter.Bodies.circle(0,0,shape.radius,cfg);
  }
  else if(shape.type === "rectangle"){
    body = Matter.Bodies.rectangle(0,0,shape.width,shape.height,cfg);
  }
  else {
    console.log(shape.type + " not supported");
  }

  return body;
}


//Entity
var Entity = function(cfg){

  cfg = cfg || {
    name : "unknown",
    physics: null
  };

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
  this.engine = engine;
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

  Matter.Events.on(engine,'collisionAcive',function(evt){
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
  createEntity: function(cfg){
    var e = new Entity(cfg);
    Matter.World.addBody(this.engine.world,e.body);
    this.entities.push(e);
    return e;
  },

  deleteEntity: function(entity){
    entity.deleted = true;
  },

  update: function(dt){
    var world = this.engine.world,
        entities = this.entities,
        deleted = this.deletedEntities;

    //update entities
    for (var i in entities){
      entities[i].update(dt);
      if (entities[i].deleted){
        deleted.push(this.entities[i]);
      }
    }

    //remove deleted entities
    for (var i in deleted){
      Matter.World.remove(world,deleted[i].body);
      var idx = this.entities.indexOf(deleted[i]);
      this.entities.splice(idx,1);
    }
    deleted.length = 0;
  }
}

module.exports = Manager;

},{"matter-js":37}],3:[function(require,module,exports){

// https://www.npmjs.com/package/gameloop
var Game = require("gameloop");
// http://brm.io/matter-js
var Matter = require("matter-js");

var EntityManager = require("./EntityManager.js");

//This is a singleton class. Requiring this module always returns the same
// game object

var game = new Game({
  fps:60
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

  var ball = game.entityManager.createEntity({
    name:"ball",
    physics:{
      shape:{
        type:"circle",
        radius:15
      },
      position:{x:400,y:0},
      restitution:.75
    }
  });

  var floor = game.entityManager.createEntity({
    name:"floor",
    physics:{
      shape: {
        type: "rectangle",
        width:800,
        height:50
      },
      isStatic: true,
      position:{x:400,y:600}
    }
  });

  //ball = Matter.Bodies.circle(400,0,30,{restitution:.5}),
  //floor = Matter.Bodies.rectangle(400,600,800,50,{isStatic:true});

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiRW50aXR5TWFuYWdlci5qcyIsIkdhbWUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMi9saWIvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9nYW1lbG9vcC9ub2RlX21vZHVsZXMvcGVyZm9ybWFuY2Utbm93L2xpYi9wZXJmb3JtYW5jZS1ub3cuanMiLCJub2RlX21vZHVsZXMvZ2FtZWxvb3Avbm9kZV9tb2R1bGVzL3JhZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2JvZHkvQm9keS5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2JvZHkvQ29tcG9zaXRlLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvYm9keS9Xb3JsZC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9Db250YWN0LmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29sbGlzaW9uL0RldGVjdG9yLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29sbGlzaW9uL0dyaWQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb2xsaXNpb24vUGFpci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9QYWlycy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9RdWVyeS5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9SZXNvbHZlci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvbGxpc2lvbi9TQVQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb25zdHJhaW50L0NvbnN0cmFpbnQuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb25zdHJhaW50L01vdXNlQ29uc3RyYWludC5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvQ29tbW9uLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvY29yZS9FbmdpbmUuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb3JlL0V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvTWV0cmljcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvTW91c2UuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9jb3JlL1J1bm5lci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2NvcmUvU2xlZXBpbmcuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9mYWN0b3J5L0JvZGllcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2ZhY3RvcnkvQ29tcG9zaXRlcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL2dlb21ldHJ5L0F4ZXMuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9Cb3VuZHMuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9TdmcuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9WZWN0b3IuanMiLCJub2RlX21vZHVsZXMvbWF0dGVyLWpzL3NyYy9nZW9tZXRyeS9WZXJ0aWNlcy5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL21vZHVsZS9tYWluLmpzIiwibm9kZV9tb2R1bGVzL21hdHRlci1qcy9zcmMvcmVuZGVyL1JlbmRlci5qcyIsIm5vZGVfbW9kdWxlcy9tYXR0ZXItanMvc3JjL3JlbmRlci9SZW5kZXJQaXhpLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25VQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4ekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwidmFyIE1hdHRlciA9IHJlcXVpcmUoXCJtYXR0ZXItanNcIik7XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQaHlzaWNzKGNmZyl7XHJcblxyXG4gIGNmZyA9IGNmZyB8fCB7fTtcclxuXHJcbiAgdmFyIHNoYXBlID0gY2ZnLnNoYXBlIHx8IHtcclxuICAgIHR5cGUgOiBNYXRoLnJhbmRvbSgpID4gLjUgPyBcImNpcmNsZVwiIDogXCJyZWN0YW5nbGVcIixcclxuICAgIHJhZGl1cyA6IE1hdGgucmFuZG9tKCkgKiAxMCArIDEsXHJcbiAgICB3aWR0aCA6IE1hdGgucmFuZG9tKCkgKiAxMCArIDEsXHJcbiAgICBoZWlnaHQgOiBNYXRoLnJhbmRvbSgpICogMTAgKyAxXHJcbiAgfTtcclxuXHJcbiAgdmFyIGJvZHkgPSBudWxsO1xyXG5cclxuICAvLyAgaHR0cDovL2JybS5pby9tYXR0ZXItanMvZG9jcy9jbGFzc2VzL0JvZGllcy5odG1sXHJcbiAgaWYgKHNoYXBlLnR5cGUgPT09IFwiY2lyY2xlXCIpe1xyXG4gICAgYm9keSA9IE1hdHRlci5Cb2RpZXMuY2lyY2xlKDAsMCxzaGFwZS5yYWRpdXMsY2ZnKTtcclxuICB9XHJcbiAgZWxzZSBpZihzaGFwZS50eXBlID09PSBcInJlY3RhbmdsZVwiKXtcclxuICAgIGJvZHkgPSBNYXR0ZXIuQm9kaWVzLnJlY3RhbmdsZSgwLDAsc2hhcGUud2lkdGgsc2hhcGUuaGVpZ2h0LGNmZyk7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coc2hhcGUudHlwZSArIFwiIG5vdCBzdXBwb3J0ZWRcIik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYm9keTtcclxufVxyXG5cclxuXHJcbi8vRW50aXR5XHJcbnZhciBFbnRpdHkgPSBmdW5jdGlvbihjZmcpe1xyXG5cclxuICBjZmcgPSBjZmcgfHwge1xyXG4gICAgbmFtZSA6IFwidW5rbm93blwiLFxyXG4gICAgcGh5c2ljczogbnVsbFxyXG4gIH07XHJcblxyXG4gIHRoaXMubmFtZSA9IGNmZy5uYW1lO1xyXG4gIHRoaXMuZGVsZXRlZCA9IGZhbHNlO1xyXG4gIHRoaXMuYm9keSA9IGNyZWF0ZVBoeXNpY3MoY2ZnLnBoeXNpY3MpO1xyXG4gIHRoaXMuYm9keS5lbnRpdHkgPSB0aGlzO1xyXG5cclxuICAvKk92ZXJyaWRlIHRoZXNlIG1ldGhvZHMgd2l0aCB5b3VyIG93biBsb2dpYyovXHJcbiAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbihkdCl7fTtcclxuICB0aGlzLmNvbGxpZGVTdGFydCA9IGZ1bmN0aW9uKGVudGl0eSl7fTtcclxuICB0aGlzLmNvbGxpZGVFbmQgPSBmdW5jdGlvbihlbnRpdHkpe307XHJcbiAgdGhpcy5jb2xsaWRlQWN0aXZlID0gZnVuY3Rpb24oZW50aXR5KXt9O1xyXG59XHJcblxyXG5cclxuLy9NYW5hZ2VyXHJcbnZhciBNYW5hZ2VyID0gZnVuY3Rpb24oZW5naW5lKXtcclxuICB0aGlzLmVudGl0aWVzID0gW107XHJcbiAgdGhpcy5lbmdpbmUgPSBlbmdpbmU7XHJcbiAgdGhpcy5kZWxldGVkRW50aXRpZXMgPSBbXTtcclxuXHJcbiAgLy9IYW5kbGUgY29sbGlzaW9uc1xyXG4gIE1hdHRlci5FdmVudHMub24oZW5naW5lLCdjb2xsaXNpb25TdGFydCcsZnVuY3Rpb24oZXZ0KXtcclxuICAgIGZvciAodmFyIHggaW4gZXZ0LnBhaXJzKXtcclxuICAgICAgdmFyIGEgPSBldnQucGFpcnNbeF0uYm9keUEsXHJcbiAgICAgICAgICBiID0gZXZ0LnBhaXJzW3hdLmJvZHlCO1xyXG4gICAgICBpZiAoYS5lbnRpdHkgJiYgYi5lbnRpdHkpe1xyXG4gICAgICAgIGEuZW50aXR5LmNvbGxpZGVTdGFydChiLmVudGl0eSk7XHJcbiAgICAgICAgYi5lbnRpdHkuY29sbGlkZVN0YXJ0KGEuZW50aXR5KTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9KTtcclxuXHJcbiAgTWF0dGVyLkV2ZW50cy5vbihlbmdpbmUsJ2NvbGxpc2lvbkVuZCcsZnVuY3Rpb24oZXZ0KXtcclxuICAgIGZvciAodmFyIHggaW4gZXZ0LnBhaXJzKXtcclxuICAgICAgdmFyIGEgPSBldnQucGFpcnNbeF0uYm9keUEsXHJcbiAgICAgICAgICBiID0gZXZ0LnBhaXJzW3hdLmJvZHlCO1xyXG4gICAgICBpZiAoYS5lbnRpdHkgJiYgYi5lbnRpdHkpe1xyXG4gICAgICAgIGEuZW50aXR5LmNvbGxpZGVFbmQoYi5lbnRpdHkpO1xyXG4gICAgICAgIGIuZW50aXR5LmNvbGxpZGVFbmQoYS5lbnRpdHkpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBNYXR0ZXIuRXZlbnRzLm9uKGVuZ2luZSwnY29sbGlzaW9uQWN/aXZlJyxmdW5jdGlvbihldnQpe1xyXG4gICAgZm9yICh2YXIgeCBpbiBldnQucGFpcnMpe1xyXG4gICAgICB2YXIgYSA9IGV2dC5wYWlyc1t4XS5ib2R5QSxcclxuICAgICAgICAgIGIgPSBldnQucGFpcnNbeF0uYm9keUI7XHJcbiAgICAgIGlmIChhLmVudGl0eSAmJiBiLmVudGl0eSl7XHJcbiAgICAgICAgYS5lbnRpdHkuY29sbGlkZUFjdGl2ZShiLmVudGl0eSk7XHJcbiAgICAgICAgYi5lbnRpdHkuY29sbGlkZUFjdGl2ZShhLmVudGl0eSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfSk7XHJcblxyXG59O1xyXG5cclxuTWFuYWdlci5wcm90b3R5cGUgPSB7XHJcbiAgY3JlYXRlRW50aXR5OiBmdW5jdGlvbihjZmcpe1xyXG4gICAgdmFyIGUgPSBuZXcgRW50aXR5KGNmZyk7XHJcbiAgICBNYXR0ZXIuV29ybGQuYWRkQm9keSh0aGlzLmVuZ2luZS53b3JsZCxlLmJvZHkpO1xyXG4gICAgdGhpcy5lbnRpdGllcy5wdXNoKGUpO1xyXG4gICAgcmV0dXJuIGU7XHJcbiAgfSxcclxuXHJcbiAgZGVsZXRlRW50aXR5OiBmdW5jdGlvbihlbnRpdHkpe1xyXG4gICAgZW50aXR5LmRlbGV0ZWQgPSB0cnVlO1xyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZTogZnVuY3Rpb24oZHQpe1xyXG4gICAgdmFyIHdvcmxkID0gdGhpcy5lbmdpbmUud29ybGQsXHJcbiAgICAgICAgZW50aXRpZXMgPSB0aGlzLmVudGl0aWVzLFxyXG4gICAgICAgIGRlbGV0ZWQgPSB0aGlzLmRlbGV0ZWRFbnRpdGllcztcclxuXHJcbiAgICAvL3VwZGF0ZSBlbnRpdGllc1xyXG4gICAgZm9yICh2YXIgaSBpbiBlbnRpdGllcyl7XHJcbiAgICAgIGVudGl0aWVzW2ldLnVwZGF0ZShkdCk7XHJcbiAgICAgIGlmIChlbnRpdGllc1tpXS5kZWxldGVkKXtcclxuICAgICAgICBkZWxldGVkLnB1c2godGhpcy5lbnRpdGllc1tpXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL3JlbW92ZSBkZWxldGVkIGVudGl0aWVzXHJcbiAgICBmb3IgKHZhciBpIGluIGRlbGV0ZWQpe1xyXG4gICAgICBNYXR0ZXIuV29ybGQucmVtb3ZlKHdvcmxkLGRlbGV0ZWRbaV0uYm9keSk7XHJcbiAgICAgIHZhciBpZHggPSB0aGlzLmVudGl0aWVzLmluZGV4T2YoZGVsZXRlZFtpXSk7XHJcbiAgICAgIHRoaXMuZW50aXRpZXMuc3BsaWNlKGlkeCwxKTtcclxuICAgIH1cclxuICAgIGRlbGV0ZWQubGVuZ3RoID0gMDtcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWFuYWdlcjtcclxuIiwiXHJcbi8vIGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL2dhbWVsb29wXHJcbnZhciBHYW1lID0gcmVxdWlyZShcImdhbWVsb29wXCIpO1xyXG4vLyBodHRwOi8vYnJtLmlvL21hdHRlci1qc1xyXG52YXIgTWF0dGVyID0gcmVxdWlyZShcIm1hdHRlci1qc1wiKTtcclxuXHJcbnZhciBFbnRpdHlNYW5hZ2VyID0gcmVxdWlyZShcIi4vRW50aXR5TWFuYWdlci5qc1wiKTtcclxuXHJcbi8vVGhpcyBpcyBhIHNpbmdsZXRvbiBjbGFzcy4gUmVxdWlyaW5nIHRoaXMgbW9kdWxlIGFsd2F5cyByZXR1cm5zIHRoZSBzYW1lXHJcbi8vIGdhbWUgb2JqZWN0XHJcblxyXG52YXIgZ2FtZSA9IG5ldyBHYW1lKHtcclxuICBmcHM6NjBcclxufSk7XHJcblxyXG5cclxuZ2FtZS5waHlzaWNzID0gTWF0dGVyLkVuZ2luZS5jcmVhdGUoKTtcclxuZ2FtZS5waHlzaWNzLndvcmxkLmdyYXZpdHkgPSB7eDowLHk6LjV9O1xyXG5cclxuZ2FtZS5lbnRpdHlNYW5hZ2VyID0gbmV3IEVudGl0eU1hbmFnZXIoZ2FtZS5waHlzaWNzKTtcclxuXHJcblxyXG52YXIgZGVidWdSZW5kZXIgPSB0cnVlO1xyXG5cclxuaWYgKGRlYnVnUmVuZGVyKXtcclxuIGdhbWUucmVuZGVyZXIgPSBNYXR0ZXIuUmVuZGVyLmNyZWF0ZSh7XHJcbiAgICAgZWxlbWVudDogZG9jdW1lbnQuYm9keSxcclxuICAgICBlbmdpbmU6IGdhbWUucGh5c2ljcyxcclxuICAgICBvcHRpb25zOiB7XHJcbiAgICAgICB3aWR0aDo4MDAsXHJcbiAgICAgICBoZWlnaHQ6NjAwXHJcbiAgICAgfVxyXG4gfSk7XHJcbn1cclxuXHJcbmdhbWUub24oJ3N0YXJ0JywgZnVuY3Rpb24gKCkge1xyXG5cclxuICB2YXIgd29ybGQgPSBnYW1lLnBoeXNpY3Mud29ybGQ7XHJcblxyXG4gIHZhciBiYWxsID0gZ2FtZS5lbnRpdHlNYW5hZ2VyLmNyZWF0ZUVudGl0eSh7XHJcbiAgICBuYW1lOlwiYmFsbFwiLFxyXG4gICAgcGh5c2ljczp7XHJcbiAgICAgIHNoYXBlOntcclxuICAgICAgICB0eXBlOlwiY2lyY2xlXCIsXHJcbiAgICAgICAgcmFkaXVzOjE1XHJcbiAgICAgIH0sXHJcbiAgICAgIHBvc2l0aW9uOnt4OjQwMCx5OjB9LFxyXG4gICAgICByZXN0aXR1dGlvbjouNzVcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgdmFyIGZsb29yID0gZ2FtZS5lbnRpdHlNYW5hZ2VyLmNyZWF0ZUVudGl0eSh7XHJcbiAgICBuYW1lOlwiZmxvb3JcIixcclxuICAgIHBoeXNpY3M6e1xyXG4gICAgICBzaGFwZToge1xyXG4gICAgICAgIHR5cGU6IFwicmVjdGFuZ2xlXCIsXHJcbiAgICAgICAgd2lkdGg6ODAwLFxyXG4gICAgICAgIGhlaWdodDo1MFxyXG4gICAgICB9LFxyXG4gICAgICBpc1N0YXRpYzogdHJ1ZSxcclxuICAgICAgcG9zaXRpb246e3g6NDAwLHk6NjAwfVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvL2JhbGwgPSBNYXR0ZXIuQm9kaWVzLmNpcmNsZSg0MDAsMCwzMCx7cmVzdGl0dXRpb246LjV9KSxcclxuICAvL2Zsb29yID0gTWF0dGVyLkJvZGllcy5yZWN0YW5nbGUoNDAwLDYwMCw4MDAsNTAse2lzU3RhdGljOnRydWV9KTtcclxuXHJcbn0pO1xyXG5cclxuZ2FtZS5vbignZW5kJywgZnVuY3Rpb24gKHN0YXRlKSB7XHJcblxyXG59KTtcclxuXHJcbmdhbWUub24oJ3Jlc3VtZScsIGZ1bmN0aW9uICgpIHtcclxuXHJcbn0pO1xyXG5cclxuZ2FtZS5vbigncGF1c2UnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG59KTtcclxuXHJcbmdhbWUub24oJ3VwZGF0ZScsIGZ1bmN0aW9uKGR0KXtcclxuICBNYXR0ZXIuRW5naW5lLnVwZGF0ZSh0aGlzLnBoeXNpY3MsMTAwMC90aGlzLmZwcyk7XHJcbiAgdGhpcy5lbnRpdHlNYW5hZ2VyLnVwZGF0ZShkdCk7XHJcbn0pO1xyXG5cclxuZ2FtZS5vbignZHJhdycsIGZ1bmN0aW9uIChyZW5kZXJlciwgZHQpIHtcclxuICBpZiAoZGVidWdSZW5kZXIpe1xyXG4gICAgTWF0dGVyLlJlbmRlci53b3JsZChyZW5kZXJlcix0aGlzLnBoeXNpY3MpO1xyXG4gIH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XHJcbiIsInZhciBnYW1lID0gcmVxdWlyZShcIi4vR2FtZS5qc1wiKTtcclxuXHJcbmdhbWUuc3RhcnQoKTtcclxuIiwidmFyIEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIyJykuRXZlbnRFbWl0dGVyMlxudmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG52YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpXG52YXIgcmFmID0gcmVxdWlyZSgncmFmJylcblxubW9kdWxlLmV4cG9ydHMgPSBHYW1lXG5pbmhlcml0cyhHYW1lLCBFbWl0dGVyKVxuXG4vKipcbiogQ3JlYXRlIHRoZSBnYW1lXG4qIEBuYW1lIGNyZWF0ZUdhbWVcbiogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMucmVuZGVyZXJcbiogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuZnBzXG4qIEBleGFtcGxlXG4qIHZhciBjcmVhdGVHYW1lID0gcmVxdWlyZSgnZ2FtZWxvb3AnKVxuKlxuKiB2YXIgZ2FtZSA9IGNyZWF0ZUdhbWUoe1xuKiAgIHJlbmRlcmVyOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKS5nZXRDb250ZXh0KCcyZCcpXG4qIH0pXG4qL1xuZnVuY3Rpb24gR2FtZSAob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgR2FtZSkpIHJldHVybiBuZXcgR2FtZShvcHRpb25zKVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICBFbWl0dGVyLmNhbGwodGhpcylcbiAgdGhpcy5wYXVzZWQgPSB0cnVlXG4gIHRoaXMucmVuZGVyZXIgPSBvcHRpb25zLnJlbmRlcmVyIHx8IHt9XG4gIHRoaXMuZnBzID0gb3B0aW9ucy5mcHMgfHwgNjBcbiAgdGhpcy5zdGVwID0gMSAvIHRoaXMuZnBzXG59XG5cbi8qKlxuKiBTdGFydCB0aGUgZ2FtZS4gRW1pdHMgdGhlIGBzdGFydGAgZXZlbnQuXG4qIEBuYW1lIGdhbWUuc3RhcnRcbiogQGZpcmVzIEdhbWUjc3RhcnRcbiogQHBhcmFtIHtPYmplY3R9IHN0YXRlIOKAkyBhcmJpdHJhcnkgc3RhcnRpbmcgZ2FtZSBzdGF0ZSBlbWl0dGVkIGJ5IGBzdGFydGAgZXZlbnQuXG4qIEBleGFtcGxlXG4qIGdhbWUuc3RhcnQoKVxuKi9cbkdhbWUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gZ2FtZWxvb3Bfc3RhcnQgKHN0YXRlKSB7XG4gIHRoaXMucGF1c2VkID0gZmFsc2VcbiAgdGhpcy5sYXN0ID0gbm93KClcbiAgdGhpcy50aW1lID0gMFxuICB0aGlzLmFjY3VtdWxhdG9yID0gMFxuICB0aGlzLmVtaXQoJ3N0YXJ0Jywgc3RhdGUpXG4gIHJhZih0aGlzLmZyYW1lLmJpbmQodGhpcykpXG59XG5cbi8qKlxuKiBFeGVjdXRlIGEgZnJhbWVcbiogQG5hbWUgZ2FtZS5mcmFtZVxuKiBAcHJpdmF0ZVxuKi9cbkdhbWUucHJvdG90eXBlLmZyYW1lID0gZnVuY3Rpb24gZ2FtZWxvb3BfZnJhbWUgKHRpbWUpIHtcbiAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgIHZhciBuZXdUaW1lID0gbm93KClcbiAgICB2YXIgZHQgPSAobmV3VGltZSAtIHRoaXMubGFzdCkgLyAxMDAwXG4gICAgaWYgKGR0ID4gMC4yKSBkdCA9IHRoaXMuc3RlcFxuICAgIHRoaXMuYWNjdW11bGF0b3IgKz0gZHRcbiAgICB0aGlzLmxhc3QgPSBuZXdUaW1lXG5cbiAgICB3aGlsZSAodGhpcy5hY2N1bXVsYXRvciA+PSB0aGlzLnN0ZXApIHtcbiAgICAgIHRoaXMudXBkYXRlKHRoaXMuc3RlcCwgdGhpcy50aW1lKVxuICAgICAgdGhpcy50aW1lICs9IGR0XG4gICAgICB0aGlzLmFjY3VtdWxhdG9yIC09IHRoaXMuc3RlcFxuICAgIH1cblxuICAgIHRoaXMuZHJhdyh0aGlzLnJlbmRlcmVyLCB0aGlzLmFjY3VtdWxhdG9yIC8gdGhpcy5zdGVwKVxuICAgIHJhZih0aGlzLmZyYW1lLmJpbmQodGhpcykpXG4gIH1cbn1cblxuLyoqXG4qIFVwZGF0ZSB0aGUgZ2FtZSBzdGF0ZS4gRW1pdHMgdGhlIGB1cGRhdGVgIGV2ZW50LiBZb3UnbGwgbGlrZWx5IG5ldmVyIGNhbGwgdGhpcyBtZXRob2QsIGJ1dCB5b3UgbWF5IG5lZWQgdG8gb3ZlcnJpZGUgaXQuIE1ha2Ugc3VyZSB0byBhbHdheXMgZW1pdCB0aGUgdXBkYXRlIGV2ZW50IHdpdGggdGhlIGBkZWx0YWAgdGltZS5cbiogQG5hbWUgZ2FtZS51cGRhdGVcbiogQHBhcmFtIHtOdW1iZXJ9IGludGVydmFsIOKAkyBpbnRlcnZhbCBiZXR3ZWVuIGVhY2ggZnJhbWVcbiogQHBhcmFtIHtOdW1iZXJ9IHRpbWUg4oCTIHRvdGFsIHRpbWUgZWxhcHNlZFxuKiBAZmlyZXMgR2FtZSN1cGRhdGVcbiovXG5HYW1lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiBnYW1lbG9vcF91cGRhdGUgKGludGVydmFsLCB0aW1lKSB7XG4gIHRoaXMuZW1pdCgndXBkYXRlJywgaW50ZXJ2YWwsIHRpbWUpXG59XG5cbi8qKlxuKiBEcmF3IHRoZSBnYW1lLiBFbWl0cyB0aGUgYGRyYXdgIGV2ZW50LiBZb3UnbGwgbGlrZWx5IG5ldmVyIGNhbGwgdGhpcyBtZXRob2QsIGJ1dCB5b3UgbWF5IG5lZWQgdG8gb3ZlcnJpZGUgaXQuIE1ha2Ugc3VyZSB0byBhbHdheXMgZW1pdCB0aGUgdXBkYXRlIGV2ZW50IHdpdGggdGhlIHJlbmRlcmVyIGFuZCBgZGVsdGFgIHRpbWUuXG4qIEBuYW1lIGdhbWUuZHJhd1xuKiBAcGFyYW0ge09iamVjdH0gcmVuZGVyZXJcbiogQHBhcmFtIHtOdW1iZXJ9IGRlbHRhVGltZSDigJMgdGltZSByZW1haW5pbmcgdW50aWwgZ2FtZS51cGRhdGUgaXMgY2FsbGVkXG4qIEBmaXJlcyBHYW1lI2RyYXdcbiovXG5HYW1lLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZ2FtZWxvb3BfZHJhdyAocmVuZGVyZXIsIGZyYW1lU3RhdGUpIHtcbiAgdGhpcy5lbWl0KCdkcmF3JywgcmVuZGVyZXIsIGZyYW1lU3RhdGUpXG59XG5cbi8qKlxuKiBFbmQgdGhlIGdhbWUuIEVtaXRzIHRoZSBgZW5kYCBldmVudC9cbiogQG5hbWUgZ2FtZS5lbmRcbiogQHBhcmFtIHtPYmplY3R9IHN0YXRlIOKAkyBzdGF0ZSBvZiBlbmQgZ2FtZSBjb25kaXRpb25zXG4qIEBmaXJlcyBHYW1lI2VuZFxuKiBAZXhhbXBsZVxuKiBnYW1lLmVuZCgpXG4qL1xuR2FtZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gZ2FtZWxvb3BfZW5kIChzdGF0ZSkge1xuICB0aGlzLmVtaXQoJ2VuZCcsIHN0YXRlKVxufVxuXG4vKipcbiogUGF1c2UgdGhlIGdhbWUuIEVtaXRzIHRoZSBgcGF1c2VgIGV2ZW50LlxuKiBAbmFtZSBnYW1lLnBhdXNlXG4qIEBmaXJlcyBHYW1lI3BhdXNlXG4qIEBleGFtcGxlXG4qIGdhbWUucGF1c2UoKVxuKi9cbkdhbWUucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24gZ2FtZWxvb3BfcGF1c2UgKCkge1xuICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgdGhpcy5wYXVzZWQgPSB0cnVlXG4gICAgdGhpcy5lbWl0KCdwYXVzZScpXG4gIH1cbn1cblxuLyoqXG4qIFJlc3VtZSB0aGUgZ2FtZS4gRW1pdHMgdGhlIGByZXN1bWVgIGV2ZW50LlxuKiBAbmFtZSBnYW1lLnJlc3VtZVxuKiBAZmlyZXMgR2FtZSNyZXN1bWVcbiogQGV4YW1wbGVcbiogZ2FtZS5yZXN1bWUoKVxuKi9cbkdhbWUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uIGdhbWVsb29wX3Jlc3VtZSAoKSB7XG4gIGlmICh0aGlzLnBhdXNlZCkge1xuICAgIHRoaXMuc3RhcnQoKVxuICAgIHRoaXMuZW1pdCgncmVzdW1lJylcbiAgfVxufVxuXG4vKipcbiogUGF1c2Ugb3Igc3RhcnQgZ2FtZSBkZXBlbmRpbmcgb24gZ2FtZSBzdGF0ZS4gRW1pdHMgZWl0aGVyIHRoZSBgcGF1c2VgIG9yIGByZXN1bWVgIGV2ZW50LlxuKiBAbmFtZSBnYW1lLnRvZ2dsZVxuKiBAZXhhbXBsZVxuKiBnYW1lLnRvZ2dsZSgpXG4qL1xuR2FtZS5wcm90b3R5cGUudG9nZ2xlID0gZnVuY3Rpb24gZ2FtZWxvb3BfdG9nZ2xlICgpIHtcbiAgaWYgKHRoaXMucGF1c2VkKSB0aGlzLnJlc3VtZSgpXG4gIGVsc2UgdGhpcy5wYXVzZSgpXG59XG5cbi8qIEV2ZW50IGRvY3VtZW50YXRpb24gKi9cblxuLyoqXG4qIFN0YXJ0IGV2ZW50LiBGaXJlZCB3aGVuIGBnYW1lLnN0YXJ0KClgIGlzIGNhbGxlZC5cbipcbiogQGV2ZW50IEdhbWUjc3RhcnRcbiogQGV4YW1wbGVcbiogZ2FtZS5vbignc3RhcnQnLCBmdW5jdGlvbiAoKSB7fSlcbiovXG5cbi8qKlxuKiBFbmQgZXZlbnQuIEZpcmVkIHdoZW4gYGdhbWUuZW5kKClgIGlzIGNhbGxlZC5cbipcbiogQGV2ZW50IEdhbWUjZW5kXG4qIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSAtIHN0YXRlIG9mIGVuZCBnYW1lIGNvbmRpdGlvbnNcbiogQGV4YW1wbGVcbiogZ2FtZS5vbignZW5kJywgZnVuY3Rpb24gKHN0YXRlKSB7fSlcbiovXG5cbi8qKlxuKiBVcGRhdGUgZXZlbnQuXG4qXG4qIEBldmVudCBHYW1lI3VwZGF0ZVxuKiBAcGFyYW0ge051bWJlcn0gaW50ZXJ2YWwg4oCTIGludGVydmFsIGJldHdlZW4gZWFjaCBmcmFtZVxuKiBAcGFyYW0ge051bWJlcn0gZnJhbWVTdGF0ZSDigJMgY3VycmVudCBzdGF0ZSBvZiB0aGUgY29tcGxldGlvbiBvZiB0aGUgZnJhbWVcbiogQHBhcmFtIHtOdW1iZXJ9IHRpbWUg4oCTIHRvdGFsIHRpbWUgZWxhcHNlZFxuKiBAZXhhbXBsZVxuKiBnYW1lLm9uKCd1cGRhdGUnLCBmdW5jdGlvbiAoaW50ZXJ2YWwsIHRpbWUpIHtcbiogICBjb25zb2xlLmxvZyhpbnRlcnZhbClcbiogfSlcbiovXG5cbi8qKlxuKiBEcmF3IGV2ZW50LlxuKlxuKiBAZXZlbnQgR2FtZSNkcmF3XG4qIEBwYXJhbSB7TnVtYmVyfSBmcmFtZVN0YXRlIOKAkyBjdXJyZW50IHN0YXRlIG9mIHRoZSBjb21wbGV0aW9uIG9mIHRoZSBmcmFtZVxuKiBAcGFyYW0ge051bWJlcn0gZGVsdGFcbiogQGV4YW1wbGVcbiogZ2FtZS5vbignZHJhdycsIGZ1bmN0aW9uIChyZW5kZXJlciwgZHQpIHtcbiogICBjb25zb2xlLmxvZyhkdClcbiogfSlcbiovXG5cbi8qKlxuKiBQYXVzZSBldmVudC4gRmlyZWQgd2hlbiBgZ2FtZS5wYXVzZSgpYCBpcyBjYWxsZWQuXG4qXG4qIEBldmVudCBHYW1lI3BhdXNlXG4qIEBleGFtcGxlXG4qIGdhbWUub24oJ3BhdXNlJywgZnVuY3Rpb24gKCkge30pXG4qL1xuXG4vKipcbiogUmVzdW1lIGV2ZW50LiBGaXJlZCB3aGVuIGBnYW1lLnJlc3VtZSgpYCBpcyBjYWxsZWQuXG4qXG4qIEBldmVudCBHYW1lI3Jlc3VtZVxuKiBAZXhhbXBsZVxuKiBnYW1lLm9uKCdyZXN1bWUnLCBmdW5jdGlvbiAoKSB7fSlcbiovXG4iLCIvKiFcbiAqIEV2ZW50RW1pdHRlcjJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9oaWoxbngvRXZlbnRFbWl0dGVyMlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMyBoaWoxbnhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuOyFmdW5jdGlvbih1bmRlZmluZWQpIHtcblxuICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgPyBBcnJheS5pc0FycmF5IDogZnVuY3Rpb24gX2lzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCI7XG4gIH07XG4gIHZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAodGhpcy5fY29uZikge1xuICAgICAgY29uZmlndXJlLmNhbGwodGhpcywgdGhpcy5fY29uZik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29uZmlndXJlKGNvbmYpIHtcbiAgICBpZiAoY29uZikge1xuXG4gICAgICB0aGlzLl9jb25mID0gY29uZjtcblxuICAgICAgY29uZi5kZWxpbWl0ZXIgJiYgKHRoaXMuZGVsaW1pdGVyID0gY29uZi5kZWxpbWl0ZXIpO1xuICAgICAgY29uZi5tYXhMaXN0ZW5lcnMgJiYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBjb25mLm1heExpc3RlbmVycyk7XG4gICAgICBjb25mLndpbGRjYXJkICYmICh0aGlzLndpbGRjYXJkID0gY29uZi53aWxkY2FyZCk7XG4gICAgICBjb25mLm5ld0xpc3RlbmVyICYmICh0aGlzLm5ld0xpc3RlbmVyID0gY29uZi5uZXdMaXN0ZW5lcik7XG5cbiAgICAgIGlmICh0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJUcmVlID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gRXZlbnRFbWl0dGVyKGNvbmYpIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICB0aGlzLm5ld0xpc3RlbmVyID0gZmFsc2U7XG4gICAgY29uZmlndXJlLmNhbGwodGhpcywgY29uZik7XG4gIH1cblxuICAvL1xuICAvLyBBdHRlbnRpb24sIGZ1bmN0aW9uIHJldHVybiB0eXBlIG5vdyBpcyBhcnJheSwgYWx3YXlzICFcbiAgLy8gSXQgaGFzIHplcm8gZWxlbWVudHMgaWYgbm8gYW55IG1hdGNoZXMgZm91bmQgYW5kIG9uZSBvciBtb3JlXG4gIC8vIGVsZW1lbnRzIChsZWFmcykgaWYgdGhlcmUgYXJlIG1hdGNoZXNcbiAgLy9cbiAgZnVuY3Rpb24gc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlLCBpKSB7XG4gICAgaWYgKCF0cmVlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnM9W10sIGxlYWYsIGxlbiwgYnJhbmNoLCB4VHJlZSwgeHhUcmVlLCBpc29sYXRlZEJyYW5jaCwgZW5kUmVhY2hlZCxcbiAgICAgICAgdHlwZUxlbmd0aCA9IHR5cGUubGVuZ3RoLCBjdXJyZW50VHlwZSA9IHR5cGVbaV0sIG5leHRUeXBlID0gdHlwZVtpKzFdO1xuICAgIGlmIChpID09PSB0eXBlTGVuZ3RoICYmIHRyZWUuX2xpc3RlbmVycykge1xuICAgICAgLy9cbiAgICAgIC8vIElmIGF0IHRoZSBlbmQgb2YgdGhlIGV2ZW50KHMpIGxpc3QgYW5kIHRoZSB0cmVlIGhhcyBsaXN0ZW5lcnNcbiAgICAgIC8vIGludm9rZSB0aG9zZSBsaXN0ZW5lcnMuXG4gICAgICAvL1xuICAgICAgaWYgKHR5cGVvZiB0cmVlLl9saXN0ZW5lcnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnMpO1xuICAgICAgICByZXR1cm4gW3RyZWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZWFmID0gMCwgbGVuID0gdHJlZS5fbGlzdGVuZXJzLmxlbmd0aDsgbGVhZiA8IGxlbjsgbGVhZisrKSB7XG4gICAgICAgICAgaGFuZGxlcnMgJiYgaGFuZGxlcnMucHVzaCh0cmVlLl9saXN0ZW5lcnNbbGVhZl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbdHJlZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKChjdXJyZW50VHlwZSA9PT0gJyonIHx8IGN1cnJlbnRUeXBlID09PSAnKionKSB8fCB0cmVlW2N1cnJlbnRUeXBlXSkge1xuICAgICAgLy9cbiAgICAgIC8vIElmIHRoZSBldmVudCBlbWl0dGVkIGlzICcqJyBhdCB0aGlzIHBhcnRcbiAgICAgIC8vIG9yIHRoZXJlIGlzIGEgY29uY3JldGUgbWF0Y2ggYXQgdGhpcyBwYXRjaFxuICAgICAgLy9cbiAgICAgIGlmIChjdXJyZW50VHlwZSA9PT0gJyonKSB7XG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKzEpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpc3RlbmVycztcbiAgICAgIH0gZWxzZSBpZihjdXJyZW50VHlwZSA9PT0gJyoqJykge1xuICAgICAgICBlbmRSZWFjaGVkID0gKGkrMSA9PT0gdHlwZUxlbmd0aCB8fCAoaSsyID09PSB0eXBlTGVuZ3RoICYmIG5leHRUeXBlID09PSAnKicpKTtcbiAgICAgICAgaWYoZW5kUmVhY2hlZCAmJiB0cmVlLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgICAvLyBUaGUgbmV4dCBlbGVtZW50IGhhcyBhIF9saXN0ZW5lcnMsIGFkZCBpdCB0byB0aGUgaGFuZGxlcnMuXG4gICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWUsIHR5cGVMZW5ndGgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoYnJhbmNoIGluIHRyZWUpIHtcbiAgICAgICAgICBpZiAoYnJhbmNoICE9PSAnX2xpc3RlbmVycycgJiYgdHJlZS5oYXNPd25Qcm9wZXJ0eShicmFuY2gpKSB7XG4gICAgICAgICAgICBpZihicmFuY2ggPT09ICcqJyB8fCBicmFuY2ggPT09ICcqKicpIHtcbiAgICAgICAgICAgICAgaWYodHJlZVticmFuY2hdLl9saXN0ZW5lcnMgJiYgIWVuZFJlYWNoZWQpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCB0eXBlTGVuZ3RoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmKGJyYW5jaCA9PT0gbmV4dFR5cGUpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbGlzdGVuZXJzLmNvbmNhdChzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHRyZWVbYnJhbmNoXSwgaSsyKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBObyBtYXRjaCBvbiB0aGlzIG9uZSwgc2hpZnQgaW50byB0aGUgdHJlZSBidXQgbm90IGluIHRoZSB0eXBlIGFycmF5LlxuICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuY29uY2F0KHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgdHJlZVticmFuY2hdLCBpKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICB9XG5cbiAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5jb25jYXQoc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB0cmVlW2N1cnJlbnRUeXBlXSwgaSsxKSk7XG4gICAgfVxuXG4gICAgeFRyZWUgPSB0cmVlWycqJ107XG4gICAgaWYgKHhUcmVlKSB7XG4gICAgICAvL1xuICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIHRyZWUgd2lsbCBhbGxvdyBhbnkgbWF0Y2ggZm9yIHRoaXMgcGFydCxcbiAgICAgIC8vIHRoZW4gcmVjdXJzaXZlbHkgZXhwbG9yZSBhbGwgYnJhbmNoZXMgb2YgdGhlIHRyZWVcbiAgICAgIC8vXG4gICAgICBzZWFyY2hMaXN0ZW5lclRyZWUoaGFuZGxlcnMsIHR5cGUsIHhUcmVlLCBpKzEpO1xuICAgIH1cblxuICAgIHh4VHJlZSA9IHRyZWVbJyoqJ107XG4gICAgaWYoeHhUcmVlKSB7XG4gICAgICBpZihpIDwgdHlwZUxlbmd0aCkge1xuICAgICAgICBpZih4eFRyZWUuX2xpc3RlbmVycykge1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBsaXN0ZW5lciBvbiBhICcqKicsIGl0IHdpbGwgY2F0Y2ggYWxsLCBzbyBhZGQgaXRzIGhhbmRsZXIuXG4gICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgYXJyYXlzIG9mIG1hdGNoaW5nIG5leHQgYnJhbmNoZXMgYW5kIG90aGVycy5cbiAgICAgICAgZm9yKGJyYW5jaCBpbiB4eFRyZWUpIHtcbiAgICAgICAgICBpZihicmFuY2ggIT09ICdfbGlzdGVuZXJzJyAmJiB4eFRyZWUuaGFzT3duUHJvcGVydHkoYnJhbmNoKSkge1xuICAgICAgICAgICAgaWYoYnJhbmNoID09PSBuZXh0VHlwZSkge1xuICAgICAgICAgICAgICAvLyBXZSBrbm93IHRoZSBuZXh0IGVsZW1lbnQgd2lsbCBtYXRjaCwgc28ganVtcCB0d2ljZS5cbiAgICAgICAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbYnJhbmNoXSwgaSsyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZihicmFuY2ggPT09IGN1cnJlbnRUeXBlKSB7XG4gICAgICAgICAgICAgIC8vIEN1cnJlbnQgbm9kZSBtYXRjaGVzLCBtb3ZlIGludG8gdGhlIHRyZWUuXG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeHhUcmVlW2JyYW5jaF0sIGkrMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaCA9IHt9O1xuICAgICAgICAgICAgICBpc29sYXRlZEJyYW5jaFticmFuY2hdID0geHhUcmVlW2JyYW5jaF07XG4gICAgICAgICAgICAgIHNlYXJjaExpc3RlbmVyVHJlZShoYW5kbGVycywgdHlwZSwgeyAnKionOiBpc29sYXRlZEJyYW5jaCB9LCBpKzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmKHh4VHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIFdlIGhhdmUgcmVhY2hlZCB0aGUgZW5kIGFuZCBzdGlsbCBvbiBhICcqKidcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWUsIHR5cGVMZW5ndGgpO1xuICAgICAgfSBlbHNlIGlmKHh4VHJlZVsnKiddICYmIHh4VHJlZVsnKiddLl9saXN0ZW5lcnMpIHtcbiAgICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlKGhhbmRsZXJzLCB0eXBlLCB4eFRyZWVbJyonXSwgdHlwZUxlbmd0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGxpc3RlbmVycztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdyb3dMaXN0ZW5lclRyZWUodHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIHR5cGUgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcblxuICAgIC8vXG4gICAgLy8gTG9va3MgZm9yIHR3byBjb25zZWN1dGl2ZSAnKionLCBpZiBzbywgZG9uJ3QgYWRkIHRoZSBldmVudCBhdCBhbGwuXG4gICAgLy9cbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSB0eXBlLmxlbmd0aDsgaSsxIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmKHR5cGVbaV0gPT09ICcqKicgJiYgdHlwZVtpKzFdID09PSAnKionKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IHRoaXMubGlzdGVuZXJUcmVlO1xuICAgIHZhciBuYW1lID0gdHlwZS5zaGlmdCgpO1xuXG4gICAgd2hpbGUgKG5hbWUpIHtcblxuICAgICAgaWYgKCF0cmVlW25hbWVdKSB7XG4gICAgICAgIHRyZWVbbmFtZV0gPSB7fTtcbiAgICAgIH1cblxuICAgICAgdHJlZSA9IHRyZWVbbmFtZV07XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA9PT0gMCkge1xuXG4gICAgICAgIGlmICghdHJlZS5fbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gbGlzdGVuZXI7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZih0eXBlb2YgdHJlZS5fbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzID0gW3RyZWUuX2xpc3RlbmVycywgbGlzdGVuZXJdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQXJyYXkodHJlZS5fbGlzdGVuZXJzKSkge1xuXG4gICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAgICAgaWYgKCF0cmVlLl9saXN0ZW5lcnMud2FybmVkKSB7XG5cbiAgICAgICAgICAgIHZhciBtID0gZGVmYXVsdE1heExpc3RlbmVycztcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG0gPiAwICYmIHRyZWUuX2xpc3RlbmVycy5sZW5ndGggPiBtKSB7XG5cbiAgICAgICAgICAgICAgdHJlZS5fbGlzdGVuZXJzLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyZWUuX2xpc3RlbmVycy5sZW5ndGgpO1xuICAgICAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgbmFtZSA9IHR5cGUuc2hpZnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuXG4gIC8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuICAvLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbiAgLy9cbiAgLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4gIC8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZGVsaW1pdGVyID0gJy4nO1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG4gICAgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyA9IG47XG4gICAgaWYgKCF0aGlzLl9jb25mKSB0aGlzLl9jb25mID0ge307XG4gICAgdGhpcy5fY29uZi5tYXhMaXN0ZW5lcnMgPSBuO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZXZlbnQgPSAnJztcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICB0aGlzLm1hbnkoZXZlbnQsIDEsIGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm1hbnkgPSBmdW5jdGlvbihldmVudCwgdHRsLCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG4gICAgICBpZiAoLS10dGwgPT09IDApIHtcbiAgICAgICAgc2VsZi5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgICAgIH1cbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGlzdGVuZXIuX29yaWdpbiA9IGZuO1xuXG4gICAgdGhpcy5vbihldmVudCwgbGlzdGVuZXIpO1xuXG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgdmFyIHR5cGUgPSBhcmd1bWVudHNbMF07XG5cbiAgICBpZiAodHlwZSA9PT0gJ25ld0xpc3RlbmVyJyAmJiAhdGhpcy5uZXdMaXN0ZW5lcikge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgfVxuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSAqX2FsbCogZnVuY3Rpb25zIGFuZCBpbnZva2UgdGhlbS5cbiAgICBpZiAodGhpcy5fYWxsKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICBmb3IgKGkgPSAwLCBsID0gdGhpcy5fYWxsLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLmV2ZW50ID0gdHlwZTtcbiAgICAgICAgdGhpcy5fYWxsW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuXG4gICAgICBpZiAoIXRoaXMuX2FsbCAmJlxuICAgICAgICAhdGhpcy5fZXZlbnRzLmVycm9yICYmXG4gICAgICAgICEodGhpcy53aWxkY2FyZCAmJiB0aGlzLmxpc3RlbmVyVHJlZS5lcnJvcikpIHtcblxuICAgICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcjtcblxuICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgIGhhbmRsZXIgPSBbXTtcbiAgICAgIHZhciBucyA9IHR5cGVvZiB0eXBlID09PSAnc3RyaW5nJyA/IHR5cGUuc3BsaXQodGhpcy5kZWxpbWl0ZXIpIDogdHlwZS5zbGljZSgpO1xuICAgICAgc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgaGFuZGxlciwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSlcbiAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgLy8gc2xvd2VyXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHZhciBsID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGwgLSAxKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChoYW5kbGVyKSB7XG4gICAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShsIC0gMSk7XG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5ldmVudCA9IHR5cGU7XG4gICAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAobGlzdGVuZXJzLmxlbmd0aCA+IDApIHx8ICEhdGhpcy5fYWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX2FsbDtcbiAgICB9XG5cbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcblxuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5vbkFueSh0eXBlKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb24gb25seSBhY2NlcHRzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuXG4gICAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyc1wiLlxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICBncm93TGlzdGVuZXJUcmVlLmNhbGwodGhpcywgdHlwZSwgbGlzdGVuZXIpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuXG4gICAgICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG5cbiAgICAgICAgdmFyIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuXG4gICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25BbnkgPSBmdW5jdGlvbihmbikge1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkFueSBvbmx5IGFjY2VwdHMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgaWYoIXRoaXMuX2FsbCkge1xuICAgICAgdGhpcy5fYWxsID0gW107XG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBmdW5jdGlvbiB0byB0aGUgZXZlbnQgbGlzdGVuZXIgY29sbGVjdGlvbi5cbiAgICB0aGlzLl9hbGwucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMsbGVhZnM9W107XG5cbiAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIGxlYWZzID0gc2VhcmNoTGlzdGVuZXJUcmVlLmNhbGwodGhpcywgbnVsbCwgbnMsIHRoaXMubGlzdGVuZXJUcmVlLCAwKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgICAgIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcbiAgICAgIGhhbmRsZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgbGVhZnMucHVzaCh7X2xpc3RlbmVyczpoYW5kbGVyc30pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGlMZWFmPTA7IGlMZWFmPGxlYWZzLmxlbmd0aDsgaUxlYWYrKykge1xuICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICBoYW5kbGVycyA9IGxlYWYuX2xpc3RlbmVycztcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuXG4gICAgICAgIHZhciBwb3NpdGlvbiA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBoYW5kbGVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChoYW5kbGVyc1tpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAgIChoYW5kbGVyc1tpXS5saXN0ZW5lciAmJiBoYW5kbGVyc1tpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgICAgICAoaGFuZGxlcnNbaV0uX29yaWdpbiAmJiBoYW5kbGVyc1tpXS5fb3JpZ2luID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHRoaXMud2lsZGNhcmQpIHtcbiAgICAgICAgICBsZWFmLl9saXN0ZW5lcnMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0uc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgICBkZWxldGUgbGVhZi5fbGlzdGVuZXJzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGFuZGxlcnMgPT09IGxpc3RlbmVyIHx8XG4gICAgICAgIChoYW5kbGVycy5saXN0ZW5lciAmJiBoYW5kbGVycy5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHx8XG4gICAgICAgIChoYW5kbGVycy5fb3JpZ2luICYmIGhhbmRsZXJzLl9vcmlnaW4gPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBpZih0aGlzLndpbGRjYXJkKSB7XG4gICAgICAgICAgZGVsZXRlIGxlYWYuX2xpc3RlbmVycztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmZBbnkgPSBmdW5jdGlvbihmbikge1xuICAgIHZhciBpID0gMCwgbCA9IDAsIGZucztcbiAgICBpZiAoZm4gJiYgdGhpcy5fYWxsICYmIHRoaXMuX2FsbC5sZW5ndGggPiAwKSB7XG4gICAgICBmbnMgPSB0aGlzLl9hbGw7XG4gICAgICBmb3IoaSA9IDAsIGwgPSBmbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGZuID09PSBmbnNbaV0pIHtcbiAgICAgICAgICBmbnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2FsbCA9IFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmY7XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICF0aGlzLl9ldmVudHMgfHwgaW5pdC5jYWxsKHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIG5zID0gdHlwZW9mIHR5cGUgPT09ICdzdHJpbmcnID8gdHlwZS5zcGxpdCh0aGlzLmRlbGltaXRlcikgOiB0eXBlLnNsaWNlKCk7XG4gICAgICB2YXIgbGVhZnMgPSBzZWFyY2hMaXN0ZW5lclRyZWUuY2FsbCh0aGlzLCBudWxsLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuXG4gICAgICBmb3IgKHZhciBpTGVhZj0wOyBpTGVhZjxsZWFmcy5sZW5ndGg7IGlMZWFmKyspIHtcbiAgICAgICAgdmFyIGxlYWYgPSBsZWFmc1tpTGVhZl07XG4gICAgICAgIGxlYWYuX2xpc3RlbmVycyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHJldHVybiB0aGlzO1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYodGhpcy53aWxkY2FyZCkge1xuICAgICAgdmFyIGhhbmRsZXJzID0gW107XG4gICAgICB2YXIgbnMgPSB0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycgPyB0eXBlLnNwbGl0KHRoaXMuZGVsaW1pdGVyKSA6IHR5cGUuc2xpY2UoKTtcbiAgICAgIHNlYXJjaExpc3RlbmVyVHJlZS5jYWxsKHRoaXMsIGhhbmRsZXJzLCBucywgdGhpcy5saXN0ZW5lclRyZWUsIDApO1xuICAgICAgcmV0dXJuIGhhbmRsZXJzO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cyB8fCBpbml0LmNhbGwodGhpcyk7XG5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkgdGhpcy5fZXZlbnRzW3R5cGVdID0gW107XG4gICAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzQW55ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZih0aGlzLl9hbGwpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hbGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICB9O1xuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBFdmVudEVtaXR0ZXI7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgLy8gQ29tbW9uSlNcbiAgICBleHBvcnRzLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbiAgZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWwuXG4gICAgd2luZG93LkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG4gIH1cbn0oKTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjcuMVxuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcbiIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIHJvb3QgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSByb290WydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSByb290WydjYW5jZWwnICsgc3VmZml4XSB8fCByb290WydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cblxuZm9yKHZhciBpID0gMDsgIXJhZiAmJiBpIDwgdmVuZG9ycy5sZW5ndGg7IGkrKykge1xuICByYWYgPSByb290W3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IHJvb3RbdmVuZG9yc1tpXSArICdDYW5jZWwnICsgc3VmZml4XVxuICAgICAgfHwgcm9vdFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgdmFyIGxhc3QgPSAwXG4gICAgLCBpZCA9IDBcbiAgICAsIHF1ZXVlID0gW11cbiAgICAsIGZyYW1lRHVyYXRpb24gPSAxMDAwIC8gNjBcblxuICByYWYgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIF9ub3cgPSBub3coKVxuICAgICAgICAsIG5leHQgPSBNYXRoLm1heCgwLCBmcmFtZUR1cmF0aW9uIC0gKF9ub3cgLSBsYXN0KSlcbiAgICAgIGxhc3QgPSBuZXh0ICsgX25vd1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNwID0gcXVldWUuc2xpY2UoMClcbiAgICAgICAgLy8gQ2xlYXIgcXVldWUgaGVyZSB0byBwcmV2ZW50XG4gICAgICAgIC8vIGNhbGxiYWNrcyBmcm9tIGFwcGVuZGluZyBsaXN0ZW5lcnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgZnJhbWUncyBxdWV1ZVxuICAgICAgICBxdWV1ZS5sZW5ndGggPSAwXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKCFjcFtpXS5jYW5jZWxsZWQpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgY3BbaV0uY2FsbGJhY2sobGFzdClcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBNYXRoLnJvdW5kKG5leHQpKVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKHtcbiAgICAgIGhhbmRsZTogKytpZCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIGNhbmNlbGxlZDogZmFsc2VcbiAgICB9KVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgY2FmID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihxdWV1ZVtpXS5oYW5kbGUgPT09IGhhbmRsZSkge1xuICAgICAgICBxdWV1ZVtpXS5jYW5jZWxsZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZm4pIHtcbiAgLy8gV3JhcCBpbiBhIG5ldyBmdW5jdGlvbiB0byBwcmV2ZW50XG4gIC8vIGBjYW5jZWxgIHBvdGVudGlhbGx5IGJlaW5nIGFzc2lnbmVkXG4gIC8vIHRvIHRoZSBuYXRpdmUgckFGIGZ1bmN0aW9uXG4gIHJldHVybiByYWYuY2FsbChyb290LCBmbilcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkocm9vdCwgYXJndW1lbnRzKVxufVxubW9kdWxlLmV4cG9ydHMucG9seWZpbGwgPSBmdW5jdGlvbigpIHtcbiAgcm9vdC5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSByYWZcbiAgcm9vdC5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNhZlxufVxuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkJvZHlgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGJvZHkgbW9kZWxzLlxuKiBBIGBNYXR0ZXIuQm9keWAgaXMgYSByaWdpZCBib2R5IHRoYXQgY2FuIGJlIHNpbXVsYXRlZCBieSBhIGBNYXR0ZXIuRW5naW5lYC5cbiogRmFjdG9yaWVzIGZvciBjb21tb25seSB1c2VkIGJvZHkgY29uZmlndXJhdGlvbnMgKHN1Y2ggYXMgcmVjdGFuZ2xlcywgY2lyY2xlcyBhbmQgb3RoZXIgcG9seWdvbnMpIGNhbiBiZSBmb3VuZCBpbiB0aGUgbW9kdWxlIGBNYXR0ZXIuQm9kaWVzYC5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cblxuKiBAY2xhc3MgQm9keVxuKi9cblxudmFyIEJvZHkgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb2R5O1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xudmFyIFNsZWVwaW5nID0gcmVxdWlyZSgnLi4vY29yZS9TbGVlcGluZycpO1xudmFyIFJlbmRlciA9IHJlcXVpcmUoJy4uL3JlbmRlci9SZW5kZXInKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xudmFyIEF4ZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9BeGVzJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIEJvZHkuX2luZXJ0aWFTY2FsZSA9IDQ7XG4gICAgQm9keS5fbmV4dENvbGxpZGluZ0dyb3VwSWQgPSAxO1xuICAgIEJvZHkuX25leHROb25Db2xsaWRpbmdHcm91cElkID0gLTE7XG4gICAgQm9keS5fbmV4dENhdGVnb3J5ID0gMHgwMDAxO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByaWdpZCBib2R5IG1vZGVsLiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBBbGwgcHJvcGVydGllcyBoYXZlIGRlZmF1bHQgdmFsdWVzLCBhbmQgbWFueSBhcmUgcHJlLWNhbGN1bGF0ZWQgYXV0b21hdGljYWxseSBiYXNlZCBvbiBvdGhlciBwcm9wZXJ0aWVzLlxuICAgICAqIFNlZSB0aGUgcHJvcGVydGllcyBzZWN0aW9uIGJlbG93IGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge30gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge2JvZHl9IGJvZHlcbiAgICAgKi9cbiAgICBCb2R5LmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgaWQ6IENvbW1vbi5uZXh0SWQoKSxcbiAgICAgICAgICAgIHR5cGU6ICdib2R5JyxcbiAgICAgICAgICAgIGxhYmVsOiAnQm9keScsXG4gICAgICAgICAgICBwYXJ0czogW10sXG4gICAgICAgICAgICBhbmdsZTogMCxcbiAgICAgICAgICAgIHZlcnRpY2VzOiBWZXJ0aWNlcy5mcm9tUGF0aCgnTCAwIDAgTCA0MCAwIEwgNDAgNDAgTCAwIDQwJyksXG4gICAgICAgICAgICBwb3NpdGlvbjogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICBmb3JjZTogeyB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgICB0b3JxdWU6IDAsXG4gICAgICAgICAgICBwb3NpdGlvbkltcHVsc2U6IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgY29uc3RyYWludEltcHVsc2U6IHsgeDogMCwgeTogMCwgYW5nbGU6IDAgfSxcbiAgICAgICAgICAgIHRvdGFsQ29udGFjdHM6IDAsXG4gICAgICAgICAgICBzcGVlZDogMCxcbiAgICAgICAgICAgIGFuZ3VsYXJTcGVlZDogMCxcbiAgICAgICAgICAgIHZlbG9jaXR5OiB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIGFuZ3VsYXJWZWxvY2l0eTogMCxcbiAgICAgICAgICAgIGlzU2Vuc29yOiBmYWxzZSxcbiAgICAgICAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgICAgICAgIGlzU2xlZXBpbmc6IGZhbHNlLFxuICAgICAgICAgICAgbW90aW9uOiAwLFxuICAgICAgICAgICAgc2xlZXBUaHJlc2hvbGQ6IDYwLFxuICAgICAgICAgICAgZGVuc2l0eTogMC4wMDEsXG4gICAgICAgICAgICByZXN0aXR1dGlvbjogMCxcbiAgICAgICAgICAgIGZyaWN0aW9uOiAwLjEsXG4gICAgICAgICAgICBmcmljdGlvblN0YXRpYzogMC41LFxuICAgICAgICAgICAgZnJpY3Rpb25BaXI6IDAuMDEsXG4gICAgICAgICAgICBjb2xsaXNpb25GaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogMHgwMDAxLFxuICAgICAgICAgICAgICAgIG1hc2s6IDB4RkZGRkZGRkYsXG4gICAgICAgICAgICAgICAgZ3JvdXA6IDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzbG9wOiAwLjA1LFxuICAgICAgICAgICAgdGltZVNjYWxlOiAxLFxuICAgICAgICAgICAgcmVuZGVyOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgICAgIHNwcml0ZToge1xuICAgICAgICAgICAgICAgICAgICB4U2NhbGU6IDEsXG4gICAgICAgICAgICAgICAgICAgIHlTY2FsZTogMSxcbiAgICAgICAgICAgICAgICAgICAgeE9mZnNldDogMCxcbiAgICAgICAgICAgICAgICAgICAgeU9mZnNldDogMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluZVdpZHRoOiAxLjVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgYm9keSA9IENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIF9pbml0UHJvcGVydGllcyhib2R5LCBvcHRpb25zKTtcblxuICAgICAgICByZXR1cm4gYm9keTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbmV4dCB1bmlxdWUgZ3JvdXAgaW5kZXggZm9yIHdoaWNoIGJvZGllcyB3aWxsIGNvbGxpZGUuXG4gICAgICogSWYgYGlzTm9uQ29sbGlkaW5nYCBpcyBgdHJ1ZWAsIHJldHVybnMgdGhlIG5leHQgdW5pcXVlIGdyb3VwIGluZGV4IGZvciB3aGljaCBib2RpZXMgd2lsbCBfbm90XyBjb2xsaWRlLlxuICAgICAqIFNlZSBgYm9keS5jb2xsaXNpb25GaWx0ZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqIEBtZXRob2QgbmV4dEdyb3VwXG4gICAgICogQHBhcmFtIHtib29sfSBbaXNOb25Db2xsaWRpbmc9ZmFsc2VdXG4gICAgICogQHJldHVybiB7TnVtYmVyfSBVbmlxdWUgZ3JvdXAgaW5kZXhcbiAgICAgKi9cbiAgICBCb2R5Lm5leHRHcm91cCA9IGZ1bmN0aW9uKGlzTm9uQ29sbGlkaW5nKSB7XG4gICAgICAgIGlmIChpc05vbkNvbGxpZGluZylcbiAgICAgICAgICAgIHJldHVybiBCb2R5Ll9uZXh0Tm9uQ29sbGlkaW5nR3JvdXBJZC0tO1xuXG4gICAgICAgIHJldHVybiBCb2R5Ll9uZXh0Q29sbGlkaW5nR3JvdXBJZCsrO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBuZXh0IHVuaXF1ZSBjYXRlZ29yeSBiaXRmaWVsZCAoc3RhcnRpbmcgYWZ0ZXIgdGhlIGluaXRpYWwgZGVmYXVsdCBjYXRlZ29yeSBgMHgwMDAxYCkuXG4gICAgICogVGhlcmUgYXJlIDMyIGF2YWlsYWJsZS4gU2VlIGBib2R5LmNvbGxpc2lvbkZpbHRlcmAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gICAgICogQG1ldGhvZCBuZXh0Q2F0ZWdvcnlcbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IFVuaXF1ZSBjYXRlZ29yeSBiaXRmaWVsZFxuICAgICAqL1xuICAgIEJvZHkubmV4dENhdGVnb3J5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIEJvZHkuX25leHRDYXRlZ29yeSA9IEJvZHkuX25leHRDYXRlZ29yeSA8PCAxO1xuICAgICAgICByZXR1cm4gQm9keS5fbmV4dENhdGVnb3J5O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXNlcyBib2R5IHByb3BlcnRpZXMuXG4gICAgICogQG1ldGhvZCBfaW5pdFByb3BlcnRpZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7fSBvcHRpb25zXG4gICAgICovXG4gICAgdmFyIF9pbml0UHJvcGVydGllcyA9IGZ1bmN0aW9uKGJvZHksIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gaW5pdCByZXF1aXJlZCBwcm9wZXJ0aWVzIChvcmRlciBpcyBpbXBvcnRhbnQpXG4gICAgICAgIEJvZHkuc2V0KGJvZHksIHtcbiAgICAgICAgICAgIGJvdW5kczogYm9keS5ib3VuZHMgfHwgQm91bmRzLmNyZWF0ZShib2R5LnZlcnRpY2VzKSxcbiAgICAgICAgICAgIHBvc2l0aW9uUHJldjogYm9keS5wb3NpdGlvblByZXYgfHwgVmVjdG9yLmNsb25lKGJvZHkucG9zaXRpb24pLFxuICAgICAgICAgICAgYW5nbGVQcmV2OiBib2R5LmFuZ2xlUHJldiB8fCBib2R5LmFuZ2xlLFxuICAgICAgICAgICAgdmVydGljZXM6IGJvZHkudmVydGljZXMsXG4gICAgICAgICAgICBwYXJ0czogYm9keS5wYXJ0cyB8fCBbYm9keV0sXG4gICAgICAgICAgICBpc1N0YXRpYzogYm9keS5pc1N0YXRpYyxcbiAgICAgICAgICAgIGlzU2xlZXBpbmc6IGJvZHkuaXNTbGVlcGluZyxcbiAgICAgICAgICAgIHBhcmVudDogYm9keS5wYXJlbnQgfHwgYm9keVxuICAgICAgICB9KTtcblxuICAgICAgICBWZXJ0aWNlcy5yb3RhdGUoYm9keS52ZXJ0aWNlcywgYm9keS5hbmdsZSwgYm9keS5wb3NpdGlvbik7XG4gICAgICAgIEF4ZXMucm90YXRlKGJvZHkuYXhlcywgYm9keS5hbmdsZSk7XG4gICAgICAgIEJvdW5kcy51cGRhdGUoYm9keS5ib3VuZHMsIGJvZHkudmVydGljZXMsIGJvZHkudmVsb2NpdHkpO1xuXG4gICAgICAgIC8vIGFsbG93IG9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBwcm9wZXJ0aWVzXG4gICAgICAgIEJvZHkuc2V0KGJvZHksIHtcbiAgICAgICAgICAgIGF4ZXM6IG9wdGlvbnMuYXhlcyB8fCBib2R5LmF4ZXMsXG4gICAgICAgICAgICBhcmVhOiBvcHRpb25zLmFyZWEgfHwgYm9keS5hcmVhLFxuICAgICAgICAgICAgbWFzczogb3B0aW9ucy5tYXNzIHx8IGJvZHkubWFzcyxcbiAgICAgICAgICAgIGluZXJ0aWE6IG9wdGlvbnMuaW5lcnRpYSB8fCBib2R5LmluZXJ0aWFcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gcmVuZGVyIHByb3BlcnRpZXNcbiAgICAgICAgdmFyIGRlZmF1bHRGaWxsU3R5bGUgPSAoYm9keS5pc1N0YXRpYyA/ICcjZWVlZWVlJyA6IENvbW1vbi5jaG9vc2UoWycjNTU2MjcwJywgJyM0RUNEQzQnLCAnI0M3RjQ2NCcsICcjRkY2QjZCJywgJyNDNDRENTgnXSkpLFxuICAgICAgICAgICAgZGVmYXVsdFN0cm9rZVN0eWxlID0gQ29tbW9uLnNoYWRlQ29sb3IoZGVmYXVsdEZpbGxTdHlsZSwgLTIwKTtcbiAgICAgICAgYm9keS5yZW5kZXIuZmlsbFN0eWxlID0gYm9keS5yZW5kZXIuZmlsbFN0eWxlIHx8IGRlZmF1bHRGaWxsU3R5bGU7XG4gICAgICAgIGJvZHkucmVuZGVyLnN0cm9rZVN0eWxlID0gYm9keS5yZW5kZXIuc3Ryb2tlU3R5bGUgfHwgZGVmYXVsdFN0cm9rZVN0eWxlO1xuICAgICAgICBib2R5LnJlbmRlci5zcHJpdGUueE9mZnNldCArPSAtKGJvZHkuYm91bmRzLm1pbi54IC0gYm9keS5wb3NpdGlvbi54KSAvIChib2R5LmJvdW5kcy5tYXgueCAtIGJvZHkuYm91bmRzLm1pbi54KTtcbiAgICAgICAgYm9keS5yZW5kZXIuc3ByaXRlLnlPZmZzZXQgKz0gLShib2R5LmJvdW5kcy5taW4ueSAtIGJvZHkucG9zaXRpb24ueSkgLyAoYm9keS5ib3VuZHMubWF4LnkgLSBib2R5LmJvdW5kcy5taW4ueSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgcHJvcGVydHkgYW5kIGEgdmFsdWUgKG9yIG1hcCBvZiksIHNldHMgdGhlIHByb3BlcnR5KHMpIG9uIHRoZSBib2R5LCB1c2luZyB0aGUgYXBwcm9wcmlhdGUgc2V0dGVyIGZ1bmN0aW9ucyBpZiB0aGV5IGV4aXN0LlxuICAgICAqIFByZWZlciB0byB1c2UgdGhlIGFjdHVhbCBzZXR0ZXIgZnVuY3Rpb25zIGluIHBlcmZvcm1hbmNlIGNyaXRpY2FsIHNpdHVhdGlvbnMuXG4gICAgICogQG1ldGhvZCBzZXRcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge30gc2V0dGluZ3MgQSBwcm9wZXJ0eSBuYW1lIChvciBtYXAgb2YgcHJvcGVydGllcyBhbmQgdmFsdWVzKSB0byBzZXQgb24gdGhlIGJvZHkuXG4gICAgICogQHBhcmFtIHt9IHZhbHVlIFRoZSB2YWx1ZSB0byBzZXQgaWYgYHNldHRpbmdzYCBpcyBhIHNpbmdsZSBwcm9wZXJ0eSBuYW1lLlxuICAgICAqL1xuICAgIEJvZHkuc2V0ID0gZnVuY3Rpb24oYm9keSwgc2V0dGluZ3MsIHZhbHVlKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0eTtcblxuICAgICAgICBpZiAodHlwZW9mIHNldHRpbmdzID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcHJvcGVydHkgPSBzZXR0aW5ncztcbiAgICAgICAgICAgIHNldHRpbmdzID0ge307XG4gICAgICAgICAgICBzZXR0aW5nc1twcm9wZXJ0eV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIHZhbHVlID0gc2V0dGluZ3NbcHJvcGVydHldO1xuXG4gICAgICAgICAgICBpZiAoIXNldHRpbmdzLmhhc093blByb3BlcnR5KHByb3BlcnR5KSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eSkge1xuXG4gICAgICAgICAgICBjYXNlICdpc1N0YXRpYyc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRTdGF0aWMoYm9keSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaXNTbGVlcGluZyc6XG4gICAgICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ21hc3MnOlxuICAgICAgICAgICAgICAgIEJvZHkuc2V0TWFzcyhib2R5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkZW5zaXR5JzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldERlbnNpdHkoYm9keSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW5lcnRpYSc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRJbmVydGlhKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3ZlcnRpY2VzJzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldFZlcnRpY2VzKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3Bvc2l0aW9uJzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldFBvc2l0aW9uKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FuZ2xlJzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldEFuZ2xlKGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3ZlbG9jaXR5JzpcbiAgICAgICAgICAgICAgICBCb2R5LnNldFZlbG9jaXR5KGJvZHksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FuZ3VsYXJWZWxvY2l0eSc6XG4gICAgICAgICAgICAgICAgQm9keS5zZXRBbmd1bGFyVmVsb2NpdHkoYm9keSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGFydHMnOlxuICAgICAgICAgICAgICAgIEJvZHkuc2V0UGFydHMoYm9keSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBib2R5W3Byb3BlcnR5XSA9IHZhbHVlO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgYm9keSBhcyBzdGF0aWMsIGluY2x1ZGluZyBpc1N0YXRpYyBmbGFnIGFuZCBzZXR0aW5nIG1hc3MgYW5kIGluZXJ0aWEgdG8gSW5maW5pdHkuXG4gICAgICogQG1ldGhvZCBzZXRTdGF0aWNcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IGlzU3RhdGljXG4gICAgICovXG4gICAgQm9keS5zZXRTdGF0aWMgPSBmdW5jdGlvbihib2R5LCBpc1N0YXRpYykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHkucGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tpXTtcbiAgICAgICAgICAgIHBhcnQuaXNTdGF0aWMgPSBpc1N0YXRpYztcblxuICAgICAgICAgICAgaWYgKGlzU3RhdGljKSB7XG4gICAgICAgICAgICAgICAgcGFydC5yZXN0aXR1dGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgcGFydC5mcmljdGlvbiA9IDE7XG4gICAgICAgICAgICAgICAgcGFydC5tYXNzID0gcGFydC5pbmVydGlhID0gcGFydC5kZW5zaXR5ID0gSW5maW5pdHk7XG4gICAgICAgICAgICAgICAgcGFydC5pbnZlcnNlTWFzcyA9IHBhcnQuaW52ZXJzZUluZXJ0aWEgPSAwO1xuXG4gICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvblByZXYueCA9IHBhcnQucG9zaXRpb24ueDtcbiAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uUHJldi55ID0gcGFydC5wb3NpdGlvbi55O1xuICAgICAgICAgICAgICAgIHBhcnQuYW5nbGVQcmV2ID0gcGFydC5hbmdsZTtcbiAgICAgICAgICAgICAgICBwYXJ0LmFuZ3VsYXJWZWxvY2l0eSA9IDA7XG4gICAgICAgICAgICAgICAgcGFydC5zcGVlZCA9IDA7XG4gICAgICAgICAgICAgICAgcGFydC5hbmd1bGFyU3BlZWQgPSAwO1xuICAgICAgICAgICAgICAgIHBhcnQubW90aW9uID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBtYXNzIG9mIHRoZSBib2R5LiBJbnZlcnNlIG1hc3MgYW5kIGRlbnNpdHkgYXJlIGF1dG9tYXRpY2FsbHkgdXBkYXRlZCB0byByZWZsZWN0IHRoZSBjaGFuZ2UuXG4gICAgICogQG1ldGhvZCBzZXRNYXNzXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1hc3NcbiAgICAgKi9cbiAgICBCb2R5LnNldE1hc3MgPSBmdW5jdGlvbihib2R5LCBtYXNzKSB7XG4gICAgICAgIGJvZHkubWFzcyA9IG1hc3M7XG4gICAgICAgIGJvZHkuaW52ZXJzZU1hc3MgPSAxIC8gYm9keS5tYXNzO1xuICAgICAgICBib2R5LmRlbnNpdHkgPSBib2R5Lm1hc3MgLyBib2R5LmFyZWE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGRlbnNpdHkgb2YgdGhlIGJvZHkuIE1hc3MgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIGNoYW5nZS5cbiAgICAgKiBAbWV0aG9kIHNldERlbnNpdHlcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGVuc2l0eVxuICAgICAqL1xuICAgIEJvZHkuc2V0RGVuc2l0eSA9IGZ1bmN0aW9uKGJvZHksIGRlbnNpdHkpIHtcbiAgICAgICAgQm9keS5zZXRNYXNzKGJvZHksIGRlbnNpdHkgKiBib2R5LmFyZWEpO1xuICAgICAgICBib2R5LmRlbnNpdHkgPSBkZW5zaXR5O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBtb21lbnQgb2YgaW5lcnRpYSAoaS5lLiBzZWNvbmQgbW9tZW50IG9mIGFyZWEpIG9mIHRoZSBib2R5IG9mIHRoZSBib2R5LiBcbiAgICAgKiBJbnZlcnNlIGluZXJ0aWEgaXMgYXV0b21hdGljYWxseSB1cGRhdGVkIHRvIHJlZmxlY3QgdGhlIGNoYW5nZS4gTWFzcyBpcyBub3QgY2hhbmdlZC5cbiAgICAgKiBAbWV0aG9kIHNldEluZXJ0aWFcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaW5lcnRpYVxuICAgICAqL1xuICAgIEJvZHkuc2V0SW5lcnRpYSA9IGZ1bmN0aW9uKGJvZHksIGluZXJ0aWEpIHtcbiAgICAgICAgYm9keS5pbmVydGlhID0gaW5lcnRpYTtcbiAgICAgICAgYm9keS5pbnZlcnNlSW5lcnRpYSA9IDEgLyBib2R5LmluZXJ0aWE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGJvZHkncyB2ZXJ0aWNlcyBhbmQgdXBkYXRlcyBib2R5IHByb3BlcnRpZXMgYWNjb3JkaW5nbHksIGluY2x1ZGluZyBpbmVydGlhLCBhcmVhIGFuZCBtYXNzICh3aXRoIHJlc3BlY3QgdG8gYGJvZHkuZGVuc2l0eWApLlxuICAgICAqIFZlcnRpY2VzIHdpbGwgYmUgYXV0b21hdGljYWxseSB0cmFuc2Zvcm1lZCB0byBiZSBvcmllbnRhdGVkIGFyb3VuZCB0aGVpciBjZW50cmUgb2YgbWFzcyBhcyB0aGUgb3JpZ2luLlxuICAgICAqIFRoZXkgYXJlIHRoZW4gYXV0b21hdGljYWxseSB0cmFuc2xhdGVkIHRvIHdvcmxkIHNwYWNlIGJhc2VkIG9uIGBib2R5LnBvc2l0aW9uYC5cbiAgICAgKlxuICAgICAqIFRoZSBgdmVydGljZXNgIGFyZ3VtZW50IHNob3VsZCBiZSBwYXNzZWQgYXMgYW4gYXJyYXkgb2YgYE1hdHRlci5WZWN0b3JgIHBvaW50cyAob3IgYSBgTWF0dGVyLlZlcnRpY2VzYCBhcnJheSkuXG4gICAgICogVmVydGljZXMgbXVzdCBmb3JtIGEgY29udmV4IGh1bGwsIGNvbmNhdmUgaHVsbHMgYXJlIG5vdCBzdXBwb3J0ZWQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kIHNldFZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHt2ZWN0b3JbXX0gdmVydGljZXNcbiAgICAgKi9cbiAgICBCb2R5LnNldFZlcnRpY2VzID0gZnVuY3Rpb24oYm9keSwgdmVydGljZXMpIHtcbiAgICAgICAgLy8gY2hhbmdlIHZlcnRpY2VzXG4gICAgICAgIGlmICh2ZXJ0aWNlc1swXS5ib2R5ID09PSBib2R5KSB7XG4gICAgICAgICAgICBib2R5LnZlcnRpY2VzID0gdmVydGljZXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib2R5LnZlcnRpY2VzID0gVmVydGljZXMuY3JlYXRlKHZlcnRpY2VzLCBib2R5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHVwZGF0ZSBwcm9wZXJ0aWVzXG4gICAgICAgIGJvZHkuYXhlcyA9IEF4ZXMuZnJvbVZlcnRpY2VzKGJvZHkudmVydGljZXMpO1xuICAgICAgICBib2R5LmFyZWEgPSBWZXJ0aWNlcy5hcmVhKGJvZHkudmVydGljZXMpO1xuICAgICAgICBCb2R5LnNldE1hc3MoYm9keSwgYm9keS5kZW5zaXR5ICogYm9keS5hcmVhKTtcblxuICAgICAgICAvLyBvcmllbnQgdmVydGljZXMgYXJvdW5kIHRoZSBjZW50cmUgb2YgbWFzcyBhdCBvcmlnaW4gKDAsIDApXG4gICAgICAgIHZhciBjZW50cmUgPSBWZXJ0aWNlcy5jZW50cmUoYm9keS52ZXJ0aWNlcyk7XG4gICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShib2R5LnZlcnRpY2VzLCBjZW50cmUsIC0xKTtcblxuICAgICAgICAvLyB1cGRhdGUgaW5lcnRpYSB3aGlsZSB2ZXJ0aWNlcyBhcmUgYXQgb3JpZ2luICgwLCAwKVxuICAgICAgICBCb2R5LnNldEluZXJ0aWEoYm9keSwgQm9keS5faW5lcnRpYVNjYWxlICogVmVydGljZXMuaW5lcnRpYShib2R5LnZlcnRpY2VzLCBib2R5Lm1hc3MpKTtcblxuICAgICAgICAvLyB1cGRhdGUgZ2VvbWV0cnlcbiAgICAgICAgVmVydGljZXMudHJhbnNsYXRlKGJvZHkudmVydGljZXMsIGJvZHkucG9zaXRpb24pO1xuICAgICAgICBCb3VuZHMudXBkYXRlKGJvZHkuYm91bmRzLCBib2R5LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgcGFydHMgb2YgdGhlIGBib2R5YCBhbmQgdXBkYXRlcyBtYXNzLCBpbmVydGlhIGFuZCBjZW50cm9pZC5cbiAgICAgKiBFYWNoIHBhcnQgd2lsbCBoYXZlIGl0cyBwYXJlbnQgc2V0IHRvIGBib2R5YC5cbiAgICAgKiBCeSBkZWZhdWx0IHRoZSBjb252ZXggaHVsbCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgY29tcHV0ZWQgYW5kIHNldCBvbiBgYm9keWAsIHVubGVzcyBgYXV0b0h1bGxgIGlzIHNldCB0byBgZmFsc2UuYFxuICAgICAqIE5vdGUgdGhhdCB0aGlzIG1ldGhvZCB3aWxsIGVuc3VyZSB0aGF0IHRoZSBmaXJzdCBwYXJ0IGluIGBib2R5LnBhcnRzYCB3aWxsIGFsd2F5cyBiZSB0aGUgYGJvZHlgLlxuICAgICAqIEBtZXRob2Qgc2V0UGFydHNcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0gW2JvZHldIHBhcnRzXG4gICAgICogQHBhcmFtIHtib29sfSBbYXV0b0h1bGw9dHJ1ZV1cbiAgICAgKi9cbiAgICBCb2R5LnNldFBhcnRzID0gZnVuY3Rpb24oYm9keSwgcGFydHMsIGF1dG9IdWxsKSB7XG4gICAgICAgIHZhciBpO1xuXG4gICAgICAgIC8vIGFkZCBhbGwgdGhlIHBhcnRzLCBlbnN1cmluZyB0aGF0IHRoZSBmaXJzdCBwYXJ0IGlzIGFsd2F5cyB0aGUgcGFyZW50IGJvZHlcbiAgICAgICAgcGFydHMgPSBwYXJ0cy5zbGljZSgwKTtcbiAgICAgICAgYm9keS5wYXJ0cy5sZW5ndGggPSAwO1xuICAgICAgICBib2R5LnBhcnRzLnB1c2goYm9keSk7XG4gICAgICAgIGJvZHkucGFyZW50ID0gYm9keTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV07XG4gICAgICAgICAgICBpZiAocGFydCAhPT0gYm9keSkge1xuICAgICAgICAgICAgICAgIHBhcnQucGFyZW50ID0gYm9keTtcbiAgICAgICAgICAgICAgICBib2R5LnBhcnRzLnB1c2gocGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYm9keS5wYXJ0cy5sZW5ndGggPT09IDEpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgYXV0b0h1bGwgPSB0eXBlb2YgYXV0b0h1bGwgIT09ICd1bmRlZmluZWQnID8gYXV0b0h1bGwgOiB0cnVlO1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIGNvbnZleCBodWxsIG9mIGFsbCBwYXJ0cyB0byBzZXQgb24gdGhlIHBhcmVudCBib2R5XG4gICAgICAgIGlmIChhdXRvSHVsbCkge1xuICAgICAgICAgICAgdmFyIHZlcnRpY2VzID0gW107XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlcyA9IHZlcnRpY2VzLmNvbmNhdChwYXJ0c1tpXS52ZXJ0aWNlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFZlcnRpY2VzLmNsb2Nrd2lzZVNvcnQodmVydGljZXMpO1xuXG4gICAgICAgICAgICB2YXIgaHVsbCA9IFZlcnRpY2VzLmh1bGwodmVydGljZXMpLFxuICAgICAgICAgICAgICAgIGh1bGxDZW50cmUgPSBWZXJ0aWNlcy5jZW50cmUoaHVsbCk7XG5cbiAgICAgICAgICAgIEJvZHkuc2V0VmVydGljZXMoYm9keSwgaHVsbCk7XG4gICAgICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUoYm9keS52ZXJ0aWNlcywgaHVsbENlbnRyZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzdW0gdGhlIHByb3BlcnRpZXMgb2YgYWxsIGNvbXBvdW5kIHBhcnRzIG9mIHRoZSBwYXJlbnQgYm9keVxuICAgICAgICB2YXIgdG90YWwgPSBfdG90YWxQcm9wZXJ0aWVzKGJvZHkpO1xuXG4gICAgICAgIGJvZHkuYXJlYSA9IHRvdGFsLmFyZWE7XG4gICAgICAgIGJvZHkucGFyZW50ID0gYm9keTtcbiAgICAgICAgYm9keS5wb3NpdGlvbi54ID0gdG90YWwuY2VudHJlLng7XG4gICAgICAgIGJvZHkucG9zaXRpb24ueSA9IHRvdGFsLmNlbnRyZS55O1xuICAgICAgICBib2R5LnBvc2l0aW9uUHJldi54ID0gdG90YWwuY2VudHJlLng7XG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnkgPSB0b3RhbC5jZW50cmUueTtcblxuICAgICAgICBCb2R5LnNldE1hc3MoYm9keSwgdG90YWwubWFzcyk7XG4gICAgICAgIEJvZHkuc2V0SW5lcnRpYShib2R5LCB0b3RhbC5pbmVydGlhKTtcbiAgICAgICAgQm9keS5zZXRQb3NpdGlvbihib2R5LCB0b3RhbC5jZW50cmUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBvZiB0aGUgYm9keSBpbnN0YW50bHkuIFZlbG9jaXR5LCBhbmdsZSwgZm9yY2UgZXRjLiBhcmUgdW5jaGFuZ2VkLlxuICAgICAqIEBtZXRob2Qgc2V0UG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9zaXRpb25cbiAgICAgKi9cbiAgICBCb2R5LnNldFBvc2l0aW9uID0gZnVuY3Rpb24oYm9keSwgcG9zaXRpb24pIHtcbiAgICAgICAgdmFyIGRlbHRhID0gVmVjdG9yLnN1Yihwb3NpdGlvbiwgYm9keS5wb3NpdGlvbik7XG4gICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnggKz0gZGVsdGEueDtcbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueSArPSBkZWx0YS55O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2ldO1xuICAgICAgICAgICAgcGFydC5wb3NpdGlvbi54ICs9IGRlbHRhLng7XG4gICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnkgKz0gZGVsdGEueTtcbiAgICAgICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShwYXJ0LnZlcnRpY2VzLCBkZWx0YSk7XG4gICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBhbmdsZSBvZiB0aGUgYm9keSBpbnN0YW50bHkuIEFuZ3VsYXIgdmVsb2NpdHksIHBvc2l0aW9uLCBmb3JjZSBldGMuIGFyZSB1bmNoYW5nZWQuXG4gICAgICogQG1ldGhvZCBzZXRBbmdsZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBhbmdsZVxuICAgICAqL1xuICAgIEJvZHkuc2V0QW5nbGUgPSBmdW5jdGlvbihib2R5LCBhbmdsZSkge1xuICAgICAgICB2YXIgZGVsdGEgPSBhbmdsZSAtIGJvZHkuYW5nbGU7XG4gICAgICAgIGJvZHkuYW5nbGVQcmV2ICs9IGRlbHRhO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2ldO1xuICAgICAgICAgICAgcGFydC5hbmdsZSArPSBkZWx0YTtcbiAgICAgICAgICAgIFZlcnRpY2VzLnJvdGF0ZShwYXJ0LnZlcnRpY2VzLCBkZWx0YSwgYm9keS5wb3NpdGlvbik7XG4gICAgICAgICAgICBBeGVzLnJvdGF0ZShwYXJ0LmF4ZXMsIGRlbHRhKTtcbiAgICAgICAgICAgIEJvdW5kcy51cGRhdGUocGFydC5ib3VuZHMsIHBhcnQudmVydGljZXMsIGJvZHkudmVsb2NpdHkpO1xuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgVmVjdG9yLnJvdGF0ZUFib3V0KHBhcnQucG9zaXRpb24sIGRlbHRhLCBib2R5LnBvc2l0aW9uLCBwYXJ0LnBvc2l0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBsaW5lYXIgdmVsb2NpdHkgb2YgdGhlIGJvZHkgaW5zdGFudGx5LiBQb3NpdGlvbiwgYW5nbGUsIGZvcmNlIGV0Yy4gYXJlIHVuY2hhbmdlZC4gU2VlIGFsc28gYEJvZHkuYXBwbHlGb3JjZWAuXG4gICAgICogQG1ldGhvZCBzZXRWZWxvY2l0eVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWxvY2l0eVxuICAgICAqL1xuICAgIEJvZHkuc2V0VmVsb2NpdHkgPSBmdW5jdGlvbihib2R5LCB2ZWxvY2l0eSkge1xuICAgICAgICBib2R5LnBvc2l0aW9uUHJldi54ID0gYm9keS5wb3NpdGlvbi54IC0gdmVsb2NpdHkueDtcbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueSA9IGJvZHkucG9zaXRpb24ueSAtIHZlbG9jaXR5Lnk7XG4gICAgICAgIGJvZHkudmVsb2NpdHkueCA9IHZlbG9jaXR5Lng7XG4gICAgICAgIGJvZHkudmVsb2NpdHkueSA9IHZlbG9jaXR5Lnk7XG4gICAgICAgIGJvZHkuc3BlZWQgPSBWZWN0b3IubWFnbml0dWRlKGJvZHkudmVsb2NpdHkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBhbmd1bGFyIHZlbG9jaXR5IG9mIHRoZSBib2R5IGluc3RhbnRseS4gUG9zaXRpb24sIGFuZ2xlLCBmb3JjZSBldGMuIGFyZSB1bmNoYW5nZWQuIFNlZSBhbHNvIGBCb2R5LmFwcGx5Rm9yY2VgLlxuICAgICAqIEBtZXRob2Qgc2V0QW5ndWxhclZlbG9jaXR5XG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZlbG9jaXR5XG4gICAgICovXG4gICAgQm9keS5zZXRBbmd1bGFyVmVsb2NpdHkgPSBmdW5jdGlvbihib2R5LCB2ZWxvY2l0eSkge1xuICAgICAgICBib2R5LmFuZ2xlUHJldiA9IGJvZHkuYW5nbGUgLSB2ZWxvY2l0eTtcbiAgICAgICAgYm9keS5hbmd1bGFyVmVsb2NpdHkgPSB2ZWxvY2l0eTtcbiAgICAgICAgYm9keS5hbmd1bGFyU3BlZWQgPSBNYXRoLmFicyhib2R5LmFuZ3VsYXJWZWxvY2l0eSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE1vdmVzIGEgYm9keSBieSBhIGdpdmVuIHZlY3RvciByZWxhdGl2ZSB0byBpdHMgY3VycmVudCBwb3NpdGlvbiwgd2l0aG91dCBpbXBhcnRpbmcgYW55IHZlbG9jaXR5LlxuICAgICAqIEBtZXRob2QgdHJhbnNsYXRlXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHRyYW5zbGF0aW9uXG4gICAgICovXG4gICAgQm9keS50cmFuc2xhdGUgPSBmdW5jdGlvbihib2R5LCB0cmFuc2xhdGlvbikge1xuICAgICAgICBCb2R5LnNldFBvc2l0aW9uKGJvZHksIFZlY3Rvci5hZGQoYm9keS5wb3NpdGlvbiwgdHJhbnNsYXRpb24pKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUm90YXRlcyBhIGJvZHkgYnkgYSBnaXZlbiBhbmdsZSByZWxhdGl2ZSB0byBpdHMgY3VycmVudCBhbmdsZSwgd2l0aG91dCBpbXBhcnRpbmcgYW55IGFuZ3VsYXIgdmVsb2NpdHkuXG4gICAgICogQG1ldGhvZCByb3RhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm90YXRpb25cbiAgICAgKi9cbiAgICBCb2R5LnJvdGF0ZSA9IGZ1bmN0aW9uKGJvZHksIHJvdGF0aW9uKSB7XG4gICAgICAgIEJvZHkuc2V0QW5nbGUoYm9keSwgYm9keS5hbmdsZSArIHJvdGF0aW9uKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2NhbGVzIHRoZSBib2R5LCBpbmNsdWRpbmcgdXBkYXRpbmcgcGh5c2ljYWwgcHJvcGVydGllcyAobWFzcywgYXJlYSwgYXhlcywgaW5lcnRpYSksIGZyb20gYSB3b3JsZC1zcGFjZSBwb2ludCAoZGVmYXVsdCBpcyBib2R5IGNlbnRyZSkuXG4gICAgICogQG1ldGhvZCBzY2FsZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsZVhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGVZXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IFtwb2ludF1cbiAgICAgKi9cbiAgICBCb2R5LnNjYWxlID0gZnVuY3Rpb24oYm9keSwgc2NhbGVYLCBzY2FsZVksIHBvaW50KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2ldO1xuXG4gICAgICAgICAgICAvLyBzY2FsZSB2ZXJ0aWNlc1xuICAgICAgICAgICAgVmVydGljZXMuc2NhbGUocGFydC52ZXJ0aWNlcywgc2NhbGVYLCBzY2FsZVksIGJvZHkucG9zaXRpb24pO1xuXG4gICAgICAgICAgICAvLyB1cGRhdGUgcHJvcGVydGllc1xuICAgICAgICAgICAgcGFydC5heGVzID0gQXhlcy5mcm9tVmVydGljZXMocGFydC52ZXJ0aWNlcyk7XG5cbiAgICAgICAgICAgIGlmICghYm9keS5pc1N0YXRpYykge1xuICAgICAgICAgICAgICAgIHBhcnQuYXJlYSA9IFZlcnRpY2VzLmFyZWEocGFydC52ZXJ0aWNlcyk7XG4gICAgICAgICAgICAgICAgQm9keS5zZXRNYXNzKHBhcnQsIGJvZHkuZGVuc2l0eSAqIHBhcnQuYXJlYSk7XG5cbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaW5lcnRpYSAocmVxdWlyZXMgdmVydGljZXMgdG8gYmUgYXQgb3JpZ2luKVxuICAgICAgICAgICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShwYXJ0LnZlcnRpY2VzLCB7IHg6IC1wYXJ0LnBvc2l0aW9uLngsIHk6IC1wYXJ0LnBvc2l0aW9uLnkgfSk7XG4gICAgICAgICAgICAgICAgQm9keS5zZXRJbmVydGlhKHBhcnQsIFZlcnRpY2VzLmluZXJ0aWEocGFydC52ZXJ0aWNlcywgcGFydC5tYXNzKSk7XG4gICAgICAgICAgICAgICAgVmVydGljZXMudHJhbnNsYXRlKHBhcnQudmVydGljZXMsIHsgeDogcGFydC5wb3NpdGlvbi54LCB5OiBwYXJ0LnBvc2l0aW9uLnkgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBib3VuZHNcbiAgICAgICAgICAgIEJvdW5kcy51cGRhdGUocGFydC5ib3VuZHMsIHBhcnQudmVydGljZXMsIGJvZHkudmVsb2NpdHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaGFuZGxlIGNpcmNsZXNcbiAgICAgICAgaWYgKGJvZHkuY2lyY2xlUmFkaXVzKSB7IFxuICAgICAgICAgICAgaWYgKHNjYWxlWCA9PT0gc2NhbGVZKSB7XG4gICAgICAgICAgICAgICAgYm9keS5jaXJjbGVSYWRpdXMgKj0gc2NhbGVYO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBib2R5IGlzIG5vIGxvbmdlciBhIGNpcmNsZVxuICAgICAgICAgICAgICAgIGJvZHkuY2lyY2xlUmFkaXVzID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYm9keS5pc1N0YXRpYykge1xuICAgICAgICAgICAgdmFyIHRvdGFsID0gX3RvdGFsUHJvcGVydGllcyhib2R5KTtcbiAgICAgICAgICAgIGJvZHkuYXJlYSA9IHRvdGFsLmFyZWE7XG4gICAgICAgICAgICBCb2R5LnNldE1hc3MoYm9keSwgdG90YWwubWFzcyk7XG4gICAgICAgICAgICBCb2R5LnNldEluZXJ0aWEoYm9keSwgdG90YWwuaW5lcnRpYSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYSBzaW11bGF0aW9uIHN0ZXAgZm9yIHRoZSBnaXZlbiBgYm9keWAsIGluY2x1ZGluZyB1cGRhdGluZyBwb3NpdGlvbiBhbmQgYW5nbGUgdXNpbmcgVmVybGV0IGludGVncmF0aW9uLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlbHRhVGltZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29ycmVjdGlvblxuICAgICAqL1xuICAgIEJvZHkudXBkYXRlID0gZnVuY3Rpb24oYm9keSwgZGVsdGFUaW1lLCB0aW1lU2NhbGUsIGNvcnJlY3Rpb24pIHtcbiAgICAgICAgdmFyIGRlbHRhVGltZVNxdWFyZWQgPSBNYXRoLnBvdyhkZWx0YVRpbWUgKiB0aW1lU2NhbGUgKiBib2R5LnRpbWVTY2FsZSwgMik7XG5cbiAgICAgICAgLy8gZnJvbSB0aGUgcHJldmlvdXMgc3RlcFxuICAgICAgICB2YXIgZnJpY3Rpb25BaXIgPSAxIC0gYm9keS5mcmljdGlvbkFpciAqIHRpbWVTY2FsZSAqIGJvZHkudGltZVNjYWxlLFxuICAgICAgICAgICAgdmVsb2NpdHlQcmV2WCA9IGJvZHkucG9zaXRpb24ueCAtIGJvZHkucG9zaXRpb25QcmV2LngsXG4gICAgICAgICAgICB2ZWxvY2l0eVByZXZZID0gYm9keS5wb3NpdGlvbi55IC0gYm9keS5wb3NpdGlvblByZXYueTtcblxuICAgICAgICAvLyB1cGRhdGUgdmVsb2NpdHkgd2l0aCBWZXJsZXQgaW50ZWdyYXRpb25cbiAgICAgICAgYm9keS52ZWxvY2l0eS54ID0gKHZlbG9jaXR5UHJldlggKiBmcmljdGlvbkFpciAqIGNvcnJlY3Rpb24pICsgKGJvZHkuZm9yY2UueCAvIGJvZHkubWFzcykgKiBkZWx0YVRpbWVTcXVhcmVkO1xuICAgICAgICBib2R5LnZlbG9jaXR5LnkgPSAodmVsb2NpdHlQcmV2WSAqIGZyaWN0aW9uQWlyICogY29ycmVjdGlvbikgKyAoYm9keS5mb3JjZS55IC8gYm9keS5tYXNzKSAqIGRlbHRhVGltZVNxdWFyZWQ7XG5cbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueCA9IGJvZHkucG9zaXRpb24ueDtcbiAgICAgICAgYm9keS5wb3NpdGlvblByZXYueSA9IGJvZHkucG9zaXRpb24ueTtcbiAgICAgICAgYm9keS5wb3NpdGlvbi54ICs9IGJvZHkudmVsb2NpdHkueDtcbiAgICAgICAgYm9keS5wb3NpdGlvbi55ICs9IGJvZHkudmVsb2NpdHkueTtcblxuICAgICAgICAvLyB1cGRhdGUgYW5ndWxhciB2ZWxvY2l0eSB3aXRoIFZlcmxldCBpbnRlZ3JhdGlvblxuICAgICAgICBib2R5LmFuZ3VsYXJWZWxvY2l0eSA9ICgoYm9keS5hbmdsZSAtIGJvZHkuYW5nbGVQcmV2KSAqIGZyaWN0aW9uQWlyICogY29ycmVjdGlvbikgKyAoYm9keS50b3JxdWUgLyBib2R5LmluZXJ0aWEpICogZGVsdGFUaW1lU3F1YXJlZDtcbiAgICAgICAgYm9keS5hbmdsZVByZXYgPSBib2R5LmFuZ2xlO1xuICAgICAgICBib2R5LmFuZ2xlICs9IGJvZHkuYW5ndWxhclZlbG9jaXR5O1xuXG4gICAgICAgIC8vIHRyYWNrIHNwZWVkIGFuZCBhY2NlbGVyYXRpb25cbiAgICAgICAgYm9keS5zcGVlZCA9IFZlY3Rvci5tYWduaXR1ZGUoYm9keS52ZWxvY2l0eSk7XG4gICAgICAgIGJvZHkuYW5ndWxhclNwZWVkID0gTWF0aC5hYnMoYm9keS5hbmd1bGFyVmVsb2NpdHkpO1xuXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0aGUgYm9keSBnZW9tZXRyeVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHkucGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tpXTtcblxuICAgICAgICAgICAgVmVydGljZXMudHJhbnNsYXRlKHBhcnQudmVydGljZXMsIGJvZHkudmVsb2NpdHkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnggKz0gYm9keS52ZWxvY2l0eS54O1xuICAgICAgICAgICAgICAgIHBhcnQucG9zaXRpb24ueSArPSBib2R5LnZlbG9jaXR5Lnk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChib2R5LmFuZ3VsYXJWZWxvY2l0eSAhPT0gMCkge1xuICAgICAgICAgICAgICAgIFZlcnRpY2VzLnJvdGF0ZShwYXJ0LnZlcnRpY2VzLCBib2R5LmFuZ3VsYXJWZWxvY2l0eSwgYm9keS5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgQXhlcy5yb3RhdGUocGFydC5heGVzLCBib2R5LmFuZ3VsYXJWZWxvY2l0eSk7XG4gICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIFZlY3Rvci5yb3RhdGVBYm91dChwYXJ0LnBvc2l0aW9uLCBib2R5LmFuZ3VsYXJWZWxvY2l0eSwgYm9keS5wb3NpdGlvbiwgcGFydC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBsaWVzIGEgZm9yY2UgdG8gYSBib2R5IGZyb20gYSBnaXZlbiB3b3JsZC1zcGFjZSBwb3NpdGlvbiwgaW5jbHVkaW5nIHJlc3VsdGluZyB0b3JxdWUuXG4gICAgICogQG1ldGhvZCBhcHBseUZvcmNlXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvc2l0aW9uXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IGZvcmNlXG4gICAgICovXG4gICAgQm9keS5hcHBseUZvcmNlID0gZnVuY3Rpb24oYm9keSwgcG9zaXRpb24sIGZvcmNlKSB7XG4gICAgICAgIGJvZHkuZm9yY2UueCArPSBmb3JjZS54O1xuICAgICAgICBib2R5LmZvcmNlLnkgKz0gZm9yY2UueTtcbiAgICAgICAgdmFyIG9mZnNldCA9IHsgeDogcG9zaXRpb24ueCAtIGJvZHkucG9zaXRpb24ueCwgeTogcG9zaXRpb24ueSAtIGJvZHkucG9zaXRpb24ueSB9O1xuICAgICAgICBib2R5LnRvcnF1ZSArPSBvZmZzZXQueCAqIGZvcmNlLnkgLSBvZmZzZXQueSAqIGZvcmNlLng7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHN1bXMgb2YgdGhlIHByb3BlcnRpZXMgb2YgYWxsIGNvbXBvdW5kIHBhcnRzIG9mIHRoZSBwYXJlbnQgYm9keS5cbiAgICAgKiBAbWV0aG9kIF90b3RhbFByb3BlcnRpZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEByZXR1cm4ge31cbiAgICAgKi9cbiAgICB2YXIgX3RvdGFsUHJvcGVydGllcyA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgICAgLy8gaHR0cHM6Ly9lY291cnNlcy5vdS5lZHUvY2dpLWJpbi9lYm9vay5jZ2k/ZG9jPSZ0b3BpYz1zdCZjaGFwX3NlYz0wNy4yJnBhZ2U9dGhlb3J5XG4gICAgICAgIC8vIGh0dHA6Ly9vdXRwdXQudG8vc2lkZXdheS9kZWZhdWx0LmFzcD9xbm89MTIxMTAwMDg3XG5cbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSB7XG4gICAgICAgICAgICBtYXNzOiAwLFxuICAgICAgICAgICAgYXJlYTogMCxcbiAgICAgICAgICAgIGluZXJ0aWE6IDAsXG4gICAgICAgICAgICBjZW50cmU6IHsgeDogMCwgeTogMCB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gc3VtIHRoZSBwcm9wZXJ0aWVzIG9mIGFsbCBjb21wb3VuZCBwYXJ0cyBvZiB0aGUgcGFyZW50IGJvZHlcbiAgICAgICAgZm9yICh2YXIgaSA9IGJvZHkucGFydHMubGVuZ3RoID09PSAxID8gMCA6IDE7IGkgPCBib2R5LnBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFydCA9IGJvZHkucGFydHNbaV07XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLm1hc3MgKz0gcGFydC5tYXNzO1xuICAgICAgICAgICAgcHJvcGVydGllcy5hcmVhICs9IHBhcnQuYXJlYTtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuaW5lcnRpYSArPSBwYXJ0LmluZXJ0aWE7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmNlbnRyZSA9IFZlY3Rvci5hZGQocHJvcGVydGllcy5jZW50cmUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFZlY3Rvci5tdWx0KHBhcnQucG9zaXRpb24sIHBhcnQubWFzcyAhPT0gSW5maW5pdHkgPyBwYXJ0Lm1hc3MgOiAxKSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9wZXJ0aWVzLmNlbnRyZSA9IFZlY3Rvci5kaXYocHJvcGVydGllcy5jZW50cmUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5tYXNzICE9PSBJbmZpbml0eSA/IHByb3BlcnRpZXMubWFzcyA6IGJvZHkucGFydHMubGVuZ3RoKTtcblxuICAgICAgICByZXR1cm4gcHJvcGVydGllcztcbiAgICB9O1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgRXZlbnRzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiBhIGJvZHkgc3RhcnRzIHNsZWVwaW5nICh3aGVyZSBgdGhpc2AgaXMgdGhlIGJvZHkpLlxuICAgICpcbiAgICAqIEBldmVudCBzbGVlcFN0YXJ0XG4gICAgKiBAdGhpcyB7Ym9keX0gVGhlIGJvZHkgdGhhdCBoYXMgc3RhcnRlZCBzbGVlcGluZ1xuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBib2R5IGVuZHMgc2xlZXBpbmcgKHdoZXJlIGB0aGlzYCBpcyB0aGUgYm9keSkuXG4gICAgKlxuICAgICogQGV2ZW50IHNsZWVwRW5kXG4gICAgKiBAdGhpcyB7Ym9keX0gVGhlIGJvZHkgdGhhdCBoYXMgZW5kZWQgc2xlZXBpbmdcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHVuaXF1ZWx5IGlkZW50aWZ5aW5nIG51bWJlciBnZW5lcmF0ZWQgaW4gYEJvZHkuY3JlYXRlYCBieSBgQ29tbW9uLm5leHRJZGAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaWRcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFN0cmluZ2AgZGVub3RpbmcgdGhlIHR5cGUgb2Ygb2JqZWN0LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHR5cGVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcImJvZHlcIlxuICAgICAqIEByZWFkT25seVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYXJiaXRyYXJ5IGBTdHJpbmdgIG5hbWUgdG8gaGVscCB0aGUgdXNlciBpZGVudGlmeSBhbmQgbWFuYWdlIGJvZGllcy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBsYWJlbFxuICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAqIEBkZWZhdWx0IFwiQm9keVwiXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBib2RpZXMgdGhhdCBtYWtlIHVwIHRoaXMgYm9keS4gXG4gICAgICogVGhlIGZpcnN0IGJvZHkgaW4gdGhlIGFycmF5IG11c3QgYWx3YXlzIGJlIGEgc2VsZiByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgYm9keSBpbnN0YW5jZS5cbiAgICAgKiBBbGwgYm9kaWVzIGluIHRoZSBgcGFydHNgIGFycmF5IHRvZ2V0aGVyIGZvcm0gYSBzaW5nbGUgcmlnaWQgY29tcG91bmQgYm9keS5cbiAgICAgKiBQYXJ0cyBhcmUgYWxsb3dlZCB0byBvdmVybGFwLCBoYXZlIGdhcHMgb3IgaG9sZXMgb3IgZXZlbiBmb3JtIGNvbmNhdmUgYm9kaWVzLlxuICAgICAqIFBhcnRzIHRoZW1zZWx2ZXMgc2hvdWxkIG5ldmVyIGJlIGFkZGVkIHRvIGEgYFdvcmxkYCwgb25seSB0aGUgcGFyZW50IGJvZHkgc2hvdWxkIGJlLlxuICAgICAqIFVzZSBgQm9keS5zZXRQYXJ0c2Agd2hlbiBzZXR0aW5nIHBhcnRzIHRvIGVuc3VyZSBjb3JyZWN0IHVwZGF0ZXMgb2YgYWxsIHByb3BlcnRpZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcGFydHNcbiAgICAgKiBAdHlwZSBib2R5W11cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgc2VsZiByZWZlcmVuY2UgaWYgdGhlIGJvZHkgaXMgX25vdF8gYSBwYXJ0IG9mIGFub3RoZXIgYm9keS5cbiAgICAgKiBPdGhlcndpc2UgdGhpcyBpcyBhIHJlZmVyZW5jZSB0byB0aGUgYm9keSB0aGF0IHRoaXMgaXMgYSBwYXJ0IG9mLlxuICAgICAqIFNlZSBgYm9keS5wYXJ0c2AuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcGFyZW50XG4gICAgICogQHR5cGUgYm9keVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCBzcGVjaWZ5aW5nIHRoZSBhbmdsZSBvZiB0aGUgYm9keSwgaW4gcmFkaWFucy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBhbmdsZVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIGBWZWN0b3JgIG9iamVjdHMgdGhhdCBzcGVjaWZ5IHRoZSBjb252ZXggaHVsbCBvZiB0aGUgcmlnaWQgYm9keS5cbiAgICAgKiBUaGVzZSBzaG91bGQgYmUgcHJvdmlkZWQgYWJvdXQgdGhlIG9yaWdpbiBgKDAsIDApYC4gRS5nLlxuICAgICAqXG4gICAgICogICAgIFt7IHg6IDAsIHk6IDAgfSwgeyB4OiAyNSwgeTogNTAgfSwgeyB4OiA1MCwgeTogMCB9XVxuICAgICAqXG4gICAgICogV2hlbiBwYXNzZWQgdmlhIGBCb2R5LmNyZWF0ZWAsIHRoZSB2ZXJ0aWNlcyBhcmUgdHJhbnNsYXRlZCByZWxhdGl2ZSB0byBgYm9keS5wb3NpdGlvbmAgKGkuZS4gd29ybGQtc3BhY2UsIGFuZCBjb25zdGFudGx5IHVwZGF0ZWQgYnkgYEJvZHkudXBkYXRlYCBkdXJpbmcgc2ltdWxhdGlvbikuXG4gICAgICogVGhlIGBWZWN0b3JgIG9iamVjdHMgYXJlIGFsc28gYXVnbWVudGVkIHdpdGggYWRkaXRpb25hbCBwcm9wZXJ0aWVzIHJlcXVpcmVkIGZvciBlZmZpY2llbnQgY29sbGlzaW9uIGRldGVjdGlvbi4gXG4gICAgICpcbiAgICAgKiBPdGhlciBwcm9wZXJ0aWVzIHN1Y2ggYXMgYGluZXJ0aWFgIGFuZCBgYm91bmRzYCBhcmUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIGZyb20gdGhlIHBhc3NlZCB2ZXJ0aWNlcyAodW5sZXNzIHByb3ZpZGVkIHZpYSBgb3B0aW9uc2ApLlxuICAgICAqIENvbmNhdmUgaHVsbHMgYXJlIG5vdCBjdXJyZW50bHkgc3VwcG9ydGVkLiBUaGUgbW9kdWxlIGBNYXR0ZXIuVmVydGljZXNgIGNvbnRhaW5zIHVzZWZ1bCBtZXRob2RzIGZvciB3b3JraW5nIHdpdGggdmVydGljZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdmVydGljZXNcbiAgICAgKiBAdHlwZSB2ZWN0b3JbXVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgVmVjdG9yYCB0aGF0IHNwZWNpZmllcyB0aGUgY3VycmVudCB3b3JsZC1zcGFjZSBwb3NpdGlvbiBvZiB0aGUgYm9keS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBwb3NpdGlvblxuICAgICAqIEB0eXBlIHZlY3RvclxuICAgICAqIEBkZWZhdWx0IHsgeDogMCwgeTogMCB9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBWZWN0b3JgIHRoYXQgc3BlY2lmaWVzIHRoZSBmb3JjZSB0byBhcHBseSBpbiB0aGUgY3VycmVudCBzdGVwLiBJdCBpcyB6ZXJvZWQgYWZ0ZXIgZXZlcnkgYEJvZHkudXBkYXRlYC4gU2VlIGFsc28gYEJvZHkuYXBwbHlGb3JjZWAuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgZm9yY2VcbiAgICAgKiBAdHlwZSB2ZWN0b3JcbiAgICAgKiBAZGVmYXVsdCB7IHg6IDAsIHk6IDAgfVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgdG9ycXVlICh0dXJuaW5nIGZvcmNlKSB0byBhcHBseSBpbiB0aGUgY3VycmVudCBzdGVwLiBJdCBpcyB6ZXJvZWQgYWZ0ZXIgZXZlcnkgYEJvZHkudXBkYXRlYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0b3JxdWVcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgX21lYXN1cmVzXyB0aGUgY3VycmVudCBzcGVlZCBvZiB0aGUgYm9keSBhZnRlciB0aGUgbGFzdCBgQm9keS51cGRhdGVgLiBJdCBpcyByZWFkLW9ubHkgYW5kIGFsd2F5cyBwb3NpdGl2ZSAoaXQncyB0aGUgbWFnbml0dWRlIG9mIGBib2R5LnZlbG9jaXR5YCkuXG4gICAgICpcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKiBAcHJvcGVydHkgc3BlZWRcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgX21lYXN1cmVzXyB0aGUgY3VycmVudCBhbmd1bGFyIHNwZWVkIG9mIHRoZSBib2R5IGFmdGVyIHRoZSBsYXN0IGBCb2R5LnVwZGF0ZWAuIEl0IGlzIHJlYWQtb25seSBhbmQgYWx3YXlzIHBvc2l0aXZlIChpdCdzIHRoZSBtYWduaXR1ZGUgb2YgYGJvZHkuYW5ndWxhclZlbG9jaXR5YCkuXG4gICAgICpcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKiBAcHJvcGVydHkgYW5ndWxhclNwZWVkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgVmVjdG9yYCB0aGF0IF9tZWFzdXJlc18gdGhlIGN1cnJlbnQgdmVsb2NpdHkgb2YgdGhlIGJvZHkgYWZ0ZXIgdGhlIGxhc3QgYEJvZHkudXBkYXRlYC4gSXQgaXMgcmVhZC1vbmx5LiBcbiAgICAgKiBJZiB5b3UgbmVlZCB0byBtb2RpZnkgYSBib2R5J3MgdmVsb2NpdHkgZGlyZWN0bHksIHlvdSBzaG91bGQgZWl0aGVyIGFwcGx5IGEgZm9yY2Ugb3Igc2ltcGx5IGNoYW5nZSB0aGUgYm9keSdzIGBwb3NpdGlvbmAgKGFzIHRoZSBlbmdpbmUgdXNlcyBwb3NpdGlvbi1WZXJsZXQgaW50ZWdyYXRpb24pLlxuICAgICAqXG4gICAgICogQHJlYWRPbmx5XG4gICAgICogQHByb3BlcnR5IHZlbG9jaXR5XG4gICAgICogQHR5cGUgdmVjdG9yXG4gICAgICogQGRlZmF1bHQgeyB4OiAwLCB5OiAwIH1cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBfbWVhc3VyZXNfIHRoZSBjdXJyZW50IGFuZ3VsYXIgdmVsb2NpdHkgb2YgdGhlIGJvZHkgYWZ0ZXIgdGhlIGxhc3QgYEJvZHkudXBkYXRlYC4gSXQgaXMgcmVhZC1vbmx5LiBcbiAgICAgKiBJZiB5b3UgbmVlZCB0byBtb2RpZnkgYSBib2R5J3MgYW5ndWxhciB2ZWxvY2l0eSBkaXJlY3RseSwgeW91IHNob3VsZCBhcHBseSBhIHRvcnF1ZSBvciBzaW1wbHkgY2hhbmdlIHRoZSBib2R5J3MgYGFuZ2xlYCAoYXMgdGhlIGVuZ2luZSB1c2VzIHBvc2l0aW9uLVZlcmxldCBpbnRlZ3JhdGlvbikuXG4gICAgICpcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKiBAcHJvcGVydHkgYW5ndWxhclZlbG9jaXR5XG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgYSBib2R5IGlzIGNvbnNpZGVyZWQgc3RhdGljLiBBIHN0YXRpYyBib2R5IGNhbiBuZXZlciBjaGFuZ2UgcG9zaXRpb24gb3IgYW5nbGUgYW5kIGlzIGNvbXBsZXRlbHkgZml4ZWQuXG4gICAgICogSWYgeW91IG5lZWQgdG8gc2V0IGEgYm9keSBhcyBzdGF0aWMgYWZ0ZXIgaXRzIGNyZWF0aW9uLCB5b3Ugc2hvdWxkIHVzZSBgQm9keS5zZXRTdGF0aWNgIGFzIHRoaXMgcmVxdWlyZXMgbW9yZSB0aGFuIGp1c3Qgc2V0dGluZyB0aGlzIGZsYWcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaXNTdGF0aWNcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIGEgYm9keSBpcyBhIHNlbnNvci4gU2Vuc29yIHRyaWdnZXJzIGNvbGxpc2lvbiBldmVudHMsIGJ1dCBkb2Vzbid0IHJlYWN0IHdpdGggY29sbGlkaW5nIGJvZHkgcGh5c2ljYWxseS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpc1NlbnNvclxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgdGhlIGJvZHkgaXMgY29uc2lkZXJlZCBzbGVlcGluZy4gQSBzbGVlcGluZyBib2R5IGFjdHMgc2ltaWxhciB0byBhIHN0YXRpYyBib2R5LCBleGNlcHQgaXQgaXMgb25seSB0ZW1wb3JhcnkgYW5kIGNhbiBiZSBhd29rZW4uXG4gICAgICogSWYgeW91IG5lZWQgdG8gc2V0IGEgYm9keSBhcyBzbGVlcGluZywgeW91IHNob3VsZCB1c2UgYFNsZWVwaW5nLnNldGAgYXMgdGhpcyByZXF1aXJlcyBtb3JlIHRoYW4ganVzdCBzZXR0aW5nIHRoaXMgZmxhZy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpc1NsZWVwaW5nXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgX21lYXN1cmVzXyB0aGUgYW1vdW50IG9mIG1vdmVtZW50IGEgYm9keSBjdXJyZW50bHkgaGFzIChhIGNvbWJpbmF0aW9uIG9mIGBzcGVlZGAgYW5kIGBhbmd1bGFyU3BlZWRgKS4gSXQgaXMgcmVhZC1vbmx5IGFuZCBhbHdheXMgcG9zaXRpdmUuXG4gICAgICogSXQgaXMgdXNlZCBhbmQgdXBkYXRlZCBieSB0aGUgYE1hdHRlci5TbGVlcGluZ2AgbW9kdWxlIGR1cmluZyBzaW11bGF0aW9uIHRvIGRlY2lkZSBpZiBhIGJvZHkgaGFzIGNvbWUgdG8gcmVzdC5cbiAgICAgKlxuICAgICAqIEByZWFkT25seVxuICAgICAqIEBwcm9wZXJ0eSBtb3Rpb25cbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHVwZGF0ZXMgaW4gd2hpY2ggdGhpcyBib2R5IG11c3QgaGF2ZSBuZWFyLXplcm8gdmVsb2NpdHkgYmVmb3JlIGl0IGlzIHNldCBhcyBzbGVlcGluZyBieSB0aGUgYE1hdHRlci5TbGVlcGluZ2AgbW9kdWxlIChpZiBzbGVlcGluZyBpcyBlbmFibGVkIGJ5IHRoZSBlbmdpbmUpLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHNsZWVwVGhyZXNob2xkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgNjBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBkZW5zaXR5IG9mIHRoZSBib2R5LCB0aGF0IGlzIGl0cyBtYXNzIHBlciB1bml0IGFyZWEuXG4gICAgICogSWYgeW91IHBhc3MgdGhlIGRlbnNpdHkgdmlhIGBCb2R5LmNyZWF0ZWAgdGhlIGBtYXNzYCBwcm9wZXJ0eSBpcyBhdXRvbWF0aWNhbGx5IGNhbGN1bGF0ZWQgZm9yIHlvdSBiYXNlZCBvbiB0aGUgc2l6ZSAoYXJlYSkgb2YgdGhlIG9iamVjdC5cbiAgICAgKiBUaGlzIGlzIGdlbmVyYWxseSBwcmVmZXJhYmxlIHRvIHNpbXBseSBzZXR0aW5nIG1hc3MgYW5kIGFsbG93cyBmb3IgbW9yZSBpbnR1aXRpdmUgZGVmaW5pdGlvbiBvZiBtYXRlcmlhbHMgKGUuZy4gcm9jayBoYXMgYSBoaWdoZXIgZGVuc2l0eSB0aGFuIHdvb2QpLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGRlbnNpdHlcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAwLjAwMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIG1hc3Mgb2YgdGhlIGJvZHksIGFsdGhvdWdoIGl0IG1heSBiZSBtb3JlIGFwcHJvcHJpYXRlIHRvIHNwZWNpZnkgdGhlIGBkZW5zaXR5YCBwcm9wZXJ0eSBpbnN0ZWFkLlxuICAgICAqIElmIHlvdSBtb2RpZnkgdGhpcyB2YWx1ZSwgeW91IG11c3QgYWxzbyBtb2RpZnkgdGhlIGBib2R5LmludmVyc2VNYXNzYCBwcm9wZXJ0eSAoYDEgLyBtYXNzYCkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgbWFzc1xuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIGludmVyc2UgbWFzcyBvZiB0aGUgYm9keSAoYDEgLyBtYXNzYCkuXG4gICAgICogSWYgeW91IG1vZGlmeSB0aGlzIHZhbHVlLCB5b3UgbXVzdCBhbHNvIG1vZGlmeSB0aGUgYGJvZHkubWFzc2AgcHJvcGVydHkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaW52ZXJzZU1hc3NcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBtb21lbnQgb2YgaW5lcnRpYSAoaS5lLiBzZWNvbmQgbW9tZW50IG9mIGFyZWEpIG9mIHRoZSBib2R5LlxuICAgICAqIEl0IGlzIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBmcm9tIHRoZSBnaXZlbiBjb252ZXggaHVsbCAoYHZlcnRpY2VzYCBhcnJheSkgYW5kIGRlbnNpdHkgaW4gYEJvZHkuY3JlYXRlYC5cbiAgICAgKiBJZiB5b3UgbW9kaWZ5IHRoaXMgdmFsdWUsIHlvdSBtdXN0IGFsc28gbW9kaWZ5IHRoZSBgYm9keS5pbnZlcnNlSW5lcnRpYWAgcHJvcGVydHkgKGAxIC8gaW5lcnRpYWApLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGluZXJ0aWFcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBpbnZlcnNlIG1vbWVudCBvZiBpbmVydGlhIG9mIHRoZSBib2R5IChgMSAvIGluZXJ0aWFgKS5cbiAgICAgKiBJZiB5b3UgbW9kaWZ5IHRoaXMgdmFsdWUsIHlvdSBtdXN0IGFsc28gbW9kaWZ5IHRoZSBgYm9keS5pbmVydGlhYCBwcm9wZXJ0eS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBpbnZlcnNlSW5lcnRpYVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIHJlc3RpdHV0aW9uIChlbGFzdGljaXR5KSBvZiB0aGUgYm9keS4gVGhlIHZhbHVlIGlzIGFsd2F5cyBwb3NpdGl2ZSBhbmQgaXMgaW4gdGhlIHJhbmdlIGAoMCwgMSlgLlxuICAgICAqIEEgdmFsdWUgb2YgYDBgIG1lYW5zIGNvbGxpc2lvbnMgbWF5IGJlIHBlcmZlY3RseSBpbmVsYXN0aWMgYW5kIG5vIGJvdW5jaW5nIG1heSBvY2N1ci4gXG4gICAgICogQSB2YWx1ZSBvZiBgMC44YCBtZWFucyB0aGUgYm9keSBtYXkgYm91bmNlIGJhY2sgd2l0aCBhcHByb3hpbWF0ZWx5IDgwJSBvZiBpdHMga2luZXRpYyBlbmVyZ3kuXG4gICAgICogTm90ZSB0aGF0IGNvbGxpc2lvbiByZXNwb25zZSBpcyBiYXNlZCBvbiBfcGFpcnNfIG9mIGJvZGllcywgYW5kIHRoYXQgYHJlc3RpdHV0aW9uYCB2YWx1ZXMgYXJlIF9jb21iaW5lZF8gd2l0aCB0aGUgZm9sbG93aW5nIGZvcm11bGE6XG4gICAgICpcbiAgICAgKiAgICAgTWF0aC5tYXgoYm9keUEucmVzdGl0dXRpb24sIGJvZHlCLnJlc3RpdHV0aW9uKVxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlc3RpdHV0aW9uXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIGZyaWN0aW9uIG9mIHRoZSBib2R5LiBUaGUgdmFsdWUgaXMgYWx3YXlzIHBvc2l0aXZlIGFuZCBpcyBpbiB0aGUgcmFuZ2UgYCgwLCAxKWAuXG4gICAgICogQSB2YWx1ZSBvZiBgMGAgbWVhbnMgdGhhdCB0aGUgYm9keSBtYXkgc2xpZGUgaW5kZWZpbml0ZWx5LlxuICAgICAqIEEgdmFsdWUgb2YgYDFgIG1lYW5zIHRoZSBib2R5IG1heSBjb21lIHRvIGEgc3RvcCBhbG1vc3QgaW5zdGFudGx5IGFmdGVyIGEgZm9yY2UgaXMgYXBwbGllZC5cbiAgICAgKlxuICAgICAqIFRoZSBlZmZlY3RzIG9mIHRoZSB2YWx1ZSBtYXkgYmUgbm9uLWxpbmVhci4gXG4gICAgICogSGlnaCB2YWx1ZXMgbWF5IGJlIHVuc3RhYmxlIGRlcGVuZGluZyBvbiB0aGUgYm9keS5cbiAgICAgKiBUaGUgZW5naW5lIHVzZXMgYSBDb3Vsb21iIGZyaWN0aW9uIG1vZGVsIGluY2x1ZGluZyBzdGF0aWMgYW5kIGtpbmV0aWMgZnJpY3Rpb24uXG4gICAgICogTm90ZSB0aGF0IGNvbGxpc2lvbiByZXNwb25zZSBpcyBiYXNlZCBvbiBfcGFpcnNfIG9mIGJvZGllcywgYW5kIHRoYXQgYGZyaWN0aW9uYCB2YWx1ZXMgYXJlIF9jb21iaW5lZF8gd2l0aCB0aGUgZm9sbG93aW5nIGZvcm11bGE6XG4gICAgICpcbiAgICAgKiAgICAgTWF0aC5taW4oYm9keUEuZnJpY3Rpb24sIGJvZHlCLmZyaWN0aW9uKVxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGZyaWN0aW9uXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMC4xXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgc3RhdGljIGZyaWN0aW9uIG9mIHRoZSBib2R5IChpbiB0aGUgQ291bG9tYiBmcmljdGlvbiBtb2RlbCkuIFxuICAgICAqIEEgdmFsdWUgb2YgYDBgIG1lYW5zIHRoZSBib2R5IHdpbGwgbmV2ZXIgJ3N0aWNrJyB3aGVuIGl0IGlzIG5lYXJseSBzdGF0aW9uYXJ5IGFuZCBvbmx5IGR5bmFtaWMgYGZyaWN0aW9uYCBpcyB1c2VkLlxuICAgICAqIFRoZSBoaWdoZXIgdGhlIHZhbHVlIChlLmcuIGAxMGApLCB0aGUgbW9yZSBmb3JjZSBpdCB3aWxsIHRha2UgdG8gaW5pdGlhbGx5IGdldCB0aGUgYm9keSBtb3Zpbmcgd2hlbiBuZWFybHkgc3RhdGlvbmFyeS5cbiAgICAgKiBUaGlzIHZhbHVlIGlzIG11bHRpcGxpZWQgd2l0aCB0aGUgYGZyaWN0aW9uYCBwcm9wZXJ0eSB0byBtYWtlIGl0IGVhc2llciB0byBjaGFuZ2UgYGZyaWN0aW9uYCBhbmQgbWFpbnRhaW4gYW4gYXBwcm9wcmlhdGUgYW1vdW50IG9mIHN0YXRpYyBmcmljdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBmcmljdGlvblN0YXRpY1xuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDAuNVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIGFpciBmcmljdGlvbiBvZiB0aGUgYm9keSAoYWlyIHJlc2lzdGFuY2UpLiBcbiAgICAgKiBBIHZhbHVlIG9mIGAwYCBtZWFucyB0aGUgYm9keSB3aWxsIG5ldmVyIHNsb3cgYXMgaXQgbW92ZXMgdGhyb3VnaCBzcGFjZS5cbiAgICAgKiBUaGUgaGlnaGVyIHRoZSB2YWx1ZSwgdGhlIGZhc3RlciBhIGJvZHkgc2xvd3Mgd2hlbiBtb3ZpbmcgdGhyb3VnaCBzcGFjZS5cbiAgICAgKiBUaGUgZWZmZWN0cyBvZiB0aGUgdmFsdWUgYXJlIG5vbi1saW5lYXIuIFxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGZyaWN0aW9uQWlyXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMC4wMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYE9iamVjdGAgdGhhdCBzcGVjaWZpZXMgdGhlIGNvbGxpc2lvbiBmaWx0ZXJpbmcgcHJvcGVydGllcyBvZiB0aGlzIGJvZHkuXG4gICAgICpcbiAgICAgKiBDb2xsaXNpb25zIGJldHdlZW4gdHdvIGJvZGllcyB3aWxsIG9iZXkgdGhlIGZvbGxvd2luZyBydWxlczpcbiAgICAgKiAtIElmIHRoZSB0d28gYm9kaWVzIGhhdmUgdGhlIHNhbWUgbm9uLXplcm8gdmFsdWUgb2YgYGNvbGxpc2lvbkZpbHRlci5ncm91cGAsXG4gICAgICogICB0aGV5IHdpbGwgYWx3YXlzIGNvbGxpZGUgaWYgdGhlIHZhbHVlIGlzIHBvc2l0aXZlLCBhbmQgdGhleSB3aWxsIG5ldmVyIGNvbGxpZGVcbiAgICAgKiAgIGlmIHRoZSB2YWx1ZSBpcyBuZWdhdGl2ZS5cbiAgICAgKiAtIElmIHRoZSB0d28gYm9kaWVzIGhhdmUgZGlmZmVyZW50IHZhbHVlcyBvZiBgY29sbGlzaW9uRmlsdGVyLmdyb3VwYCBvciBpZiBvbmVcbiAgICAgKiAgIChvciBib3RoKSBvZiB0aGUgYm9kaWVzIGhhcyBhIHZhbHVlIG9mIDAsIHRoZW4gdGhlIGNhdGVnb3J5L21hc2sgcnVsZXMgYXBwbHkgYXMgZm9sbG93czpcbiAgICAgKlxuICAgICAqIEVhY2ggYm9keSBiZWxvbmdzIHRvIGEgY29sbGlzaW9uIGNhdGVnb3J5LCBnaXZlbiBieSBgY29sbGlzaW9uRmlsdGVyLmNhdGVnb3J5YC4gVGhpc1xuICAgICAqIHZhbHVlIGlzIHVzZWQgYXMgYSBiaXQgZmllbGQgYW5kIHRoZSBjYXRlZ29yeSBzaG91bGQgaGF2ZSBvbmx5IG9uZSBiaXQgc2V0LCBtZWFuaW5nIHRoYXRcbiAgICAgKiB0aGUgdmFsdWUgb2YgdGhpcyBwcm9wZXJ0eSBpcyBhIHBvd2VyIG9mIHR3byBpbiB0aGUgcmFuZ2UgWzEsIDJeMzFdLiBUaHVzLCB0aGVyZSBhcmUgMzJcbiAgICAgKiBkaWZmZXJlbnQgY29sbGlzaW9uIGNhdGVnb3JpZXMgYXZhaWxhYmxlLlxuICAgICAqXG4gICAgICogRWFjaCBib2R5IGFsc28gZGVmaW5lcyBhIGNvbGxpc2lvbiBiaXRtYXNrLCBnaXZlbiBieSBgY29sbGlzaW9uRmlsdGVyLm1hc2tgIHdoaWNoIHNwZWNpZmllc1xuICAgICAqIHRoZSBjYXRlZ29yaWVzIGl0IGNvbGxpZGVzIHdpdGggKHRoZSB2YWx1ZSBpcyB0aGUgYml0d2lzZSBBTkQgdmFsdWUgb2YgYWxsIHRoZXNlIGNhdGVnb3JpZXMpLlxuICAgICAqXG4gICAgICogVXNpbmcgdGhlIGNhdGVnb3J5L21hc2sgcnVsZXMsIHR3byBib2RpZXMgYEFgIGFuZCBgQmAgY29sbGlkZSBpZiBlYWNoIGluY2x1ZGVzIHRoZSBvdGhlcidzXG4gICAgICogY2F0ZWdvcnkgaW4gaXRzIG1hc2ssIGkuZS4gYChjYXRlZ29yeUEgJiBtYXNrQikgIT09IDBgIGFuZCBgKGNhdGVnb3J5QiAmIG1hc2tBKSAhPT0gMGBcbiAgICAgKiBhcmUgYm90aCB0cnVlLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbGxpc2lvbkZpbHRlclxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gSW50ZWdlciBgTnVtYmVyYCwgdGhhdCBzcGVjaWZpZXMgdGhlIGNvbGxpc2lvbiBncm91cCB0aGlzIGJvZHkgYmVsb25ncyB0by5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb2xsaXNpb25GaWx0ZXIuZ3JvdXBcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKiBAZGVmYXVsdCAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGJpdCBmaWVsZCB0aGF0IHNwZWNpZmllcyB0aGUgY29sbGlzaW9uIGNhdGVnb3J5IHRoaXMgYm9keSBiZWxvbmdzIHRvLlxuICAgICAqIFRoZSBjYXRlZ29yeSB2YWx1ZSBzaG91bGQgaGF2ZSBvbmx5IG9uZSBiaXQgc2V0LCBmb3IgZXhhbXBsZSBgMHgwMDAxYC5cbiAgICAgKiBUaGlzIG1lYW5zIHRoZXJlIGFyZSB1cCB0byAzMiB1bmlxdWUgY29sbGlzaW9uIGNhdGVnb3JpZXMgYXZhaWxhYmxlLlxuICAgICAqIFNlZSBgYm9keS5jb2xsaXNpb25GaWx0ZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbGxpc2lvbkZpbHRlci5jYXRlZ29yeVxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYml0IG1hc2sgdGhhdCBzcGVjaWZpZXMgdGhlIGNvbGxpc2lvbiBjYXRlZ29yaWVzIHRoaXMgYm9keSBtYXkgY29sbGlkZSB3aXRoLlxuICAgICAqIFNlZSBgYm9keS5jb2xsaXNpb25GaWx0ZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbGxpc2lvbkZpbHRlci5tYXNrXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICogQGRlZmF1bHQgLTFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgYSB0b2xlcmFuY2Ugb24gaG93IGZhciBhIGJvZHkgaXMgYWxsb3dlZCB0byAnc2luaycgb3Igcm90YXRlIGludG8gb3RoZXIgYm9kaWVzLlxuICAgICAqIEF2b2lkIGNoYW5naW5nIHRoaXMgdmFsdWUgdW5sZXNzIHlvdSB1bmRlcnN0YW5kIHRoZSBwdXJwb3NlIG9mIGBzbG9wYCBpbiBwaHlzaWNzIGVuZ2luZXMuXG4gICAgICogVGhlIGRlZmF1bHQgc2hvdWxkIGdlbmVyYWxseSBzdWZmaWNlLCBhbHRob3VnaCB2ZXJ5IGxhcmdlIGJvZGllcyBtYXkgcmVxdWlyZSBsYXJnZXIgdmFsdWVzIGZvciBzdGFibGUgc3RhY2tpbmcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgc2xvcFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDAuMDVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBhbGxvd3MgcGVyLWJvZHkgdGltZSBzY2FsaW5nLCBlLmcuIGEgZm9yY2UtZmllbGQgd2hlcmUgYm9kaWVzIGluc2lkZSBhcmUgaW4gc2xvdy1tb3Rpb24sIHdoaWxlIG90aGVycyBhcmUgYXQgZnVsbCBzcGVlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0aW1lU2NhbGVcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAxXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBgT2JqZWN0YCB0aGF0IGRlZmluZXMgdGhlIHJlbmRlcmluZyBwcm9wZXJ0aWVzIHRvIGJlIGNvbnN1bWVkIGJ5IHRoZSBtb2R1bGUgYE1hdHRlci5SZW5kZXJgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlclxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIGlmIHRoZSBib2R5IHNob3VsZCBiZSByZW5kZXJlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIudmlzaWJsZVxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKiBAZGVmYXVsdCB0cnVlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBvcGFjaXR5IHRvIHVzZSB3aGVuIHJlbmRlcmluZy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIub3BhY2l0eVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYE9iamVjdGAgdGhhdCBkZWZpbmVzIHRoZSBzcHJpdGUgcHJvcGVydGllcyB0byB1c2Ugd2hlbiByZW5kZXJpbmcsIGlmIGFueS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBgU3RyaW5nYCB0aGF0IGRlZmluZXMgdGhlIHBhdGggdG8gdGhlIGltYWdlIHRvIHVzZSBhcyB0aGUgc3ByaXRlIHRleHR1cmUsIGlmIGFueS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlLnRleHR1cmVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKi9cbiAgICAgXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIHNjYWxpbmcgaW4gdGhlIHgtYXhpcyBmb3IgdGhlIHNwcml0ZSwgaWYgYW55LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlci5zcHJpdGUueFNjYWxlXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIHNjYWxpbmcgaW4gdGhlIHktYXhpcyBmb3IgdGhlIHNwcml0ZSwgaWYgYW55LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlci5zcHJpdGUueVNjYWxlXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMVxuICAgICAqL1xuXG4gICAgIC8qKlxuICAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgb2Zmc2V0IGluIHRoZSB4LWF4aXMgZm9yIHRoZSBzcHJpdGUgKG5vcm1hbGlzZWQgYnkgdGV4dHVyZSB3aWR0aCkuXG4gICAgICAqXG4gICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlLnhPZmZzZXRcbiAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAqIEBkZWZhdWx0IDBcbiAgICAgICovXG5cbiAgICAgLyoqXG4gICAgICAqIEEgYE51bWJlcmAgdGhhdCBkZWZpbmVzIHRoZSBvZmZzZXQgaW4gdGhlIHktYXhpcyBmb3IgdGhlIHNwcml0ZSAobm9ybWFsaXNlZCBieSB0ZXh0dXJlIGhlaWdodCkuXG4gICAgICAqXG4gICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3ByaXRlLnlPZmZzZXRcbiAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAqIEBkZWZhdWx0IDBcbiAgICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgZGVmaW5lcyB0aGUgbGluZSB3aWR0aCB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhlIGJvZHkgb3V0bGluZSAoaWYgYSBzcHJpdGUgaXMgbm90IGRlZmluZWQpLlxuICAgICAqIEEgdmFsdWUgb2YgYDBgIG1lYW5zIG5vIG91dGxpbmUgd2lsbCBiZSByZW5kZXJlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIubGluZVdpZHRoXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMS41XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIHRoYXQgZGVmaW5lcyB0aGUgZmlsbCBzdHlsZSB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhlIGJvZHkgKGlmIGEgc3ByaXRlIGlzIG5vdCBkZWZpbmVkKS5cbiAgICAgKiBJdCBpcyB0aGUgc2FtZSBhcyB3aGVuIHVzaW5nIGEgY2FudmFzLCBzbyBpdCBhY2NlcHRzIENTUyBzdHlsZSBwcm9wZXJ0eSB2YWx1ZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLmZpbGxTdHlsZVxuICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAqIEBkZWZhdWx0IGEgcmFuZG9tIGNvbG91clxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgU3RyaW5nYCB0aGF0IGRlZmluZXMgdGhlIHN0cm9rZSBzdHlsZSB0byB1c2Ugd2hlbiByZW5kZXJpbmcgdGhlIGJvZHkgb3V0bGluZSAoaWYgYSBzcHJpdGUgaXMgbm90IGRlZmluZWQpLlxuICAgICAqIEl0IGlzIHRoZSBzYW1lIGFzIHdoZW4gdXNpbmcgYSBjYW52YXMsIHNvIGl0IGFjY2VwdHMgQ1NTIHN0eWxlIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3Ryb2tlU3R5bGVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBhIHJhbmRvbSBjb2xvdXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIHVuaXF1ZSBheGlzIHZlY3RvcnMgKGVkZ2Ugbm9ybWFscykgdXNlZCBmb3IgY29sbGlzaW9uIGRldGVjdGlvbi5cbiAgICAgKiBUaGVzZSBhcmUgYXV0b21hdGljYWxseSBjYWxjdWxhdGVkIGZyb20gdGhlIGdpdmVuIGNvbnZleCBodWxsIChgdmVydGljZXNgIGFycmF5KSBpbiBgQm9keS5jcmVhdGVgLlxuICAgICAqIFRoZXkgYXJlIGNvbnN0YW50bHkgdXBkYXRlZCBieSBgQm9keS51cGRhdGVgIGR1cmluZyB0aGUgc2ltdWxhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBheGVzXG4gICAgICogQHR5cGUgdmVjdG9yW11cbiAgICAgKi9cbiAgICAgXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IF9tZWFzdXJlc18gdGhlIGFyZWEgb2YgdGhlIGJvZHkncyBjb252ZXggaHVsbCwgY2FsY3VsYXRlZCBhdCBjcmVhdGlvbiBieSBgQm9keS5jcmVhdGVgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGFyZWFcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYEJvdW5kc2Agb2JqZWN0IHRoYXQgZGVmaW5lcyB0aGUgQUFCQiByZWdpb24gZm9yIHRoZSBib2R5LlxuICAgICAqIEl0IGlzIGF1dG9tYXRpY2FsbHkgY2FsY3VsYXRlZCBmcm9tIHRoZSBnaXZlbiBjb252ZXggaHVsbCAoYHZlcnRpY2VzYCBhcnJheSkgaW4gYEJvZHkuY3JlYXRlYCBhbmQgY29uc3RhbnRseSB1cGRhdGVkIGJ5IGBCb2R5LnVwZGF0ZWAgZHVyaW5nIHNpbXVsYXRpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm91bmRzXG4gICAgICogQHR5cGUgYm91bmRzXG4gICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuQ29tcG9zaXRlYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBjb21wb3NpdGUgYm9kaWVzLlxuKiBBIGNvbXBvc2l0ZSBib2R5IGlzIGEgY29sbGVjdGlvbiBvZiBgTWF0dGVyLkJvZHlgLCBgTWF0dGVyLkNvbnN0cmFpbnRgIGFuZCBvdGhlciBgTWF0dGVyLkNvbXBvc2l0ZWAsIHRoZXJlZm9yZSBjb21wb3NpdGVzIGZvcm0gYSB0cmVlIHN0cnVjdHVyZS5cbiogSXQgaXMgaW1wb3J0YW50IHRvIHVzZSB0aGUgZnVuY3Rpb25zIGluIHRoaXMgbW9kdWxlIHRvIG1vZGlmeSBjb21wb3NpdGVzLCByYXRoZXIgdGhhbiBkaXJlY3RseSBtb2RpZnlpbmcgdGhlaXIgcHJvcGVydGllcy5cbiogTm90ZSB0aGF0IHRoZSBgTWF0dGVyLldvcmxkYCBvYmplY3QgaXMgYWxzbyBhIHR5cGUgb2YgYE1hdHRlci5Db21wb3NpdGVgIGFuZCBhcyBzdWNoIGFsbCBjb21wb3NpdGUgbWV0aG9kcyBoZXJlIGNhbiBhbHNvIG9wZXJhdGUgb24gYSBgTWF0dGVyLldvcmxkYC5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIENvbXBvc2l0ZVxuKi9cblxudmFyIENvbXBvc2l0ZSA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0ZTtcblxudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4uL2NvcmUvRXZlbnRzJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBCb2R5ID0gcmVxdWlyZSgnLi9Cb2R5Jyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY29tcG9zaXRlLiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBTZWUgdGhlIHByb3Blcml0ZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt9IFtvcHRpb25zXVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gQSBuZXcgY29tcG9zaXRlXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgcmV0dXJuIENvbW1vbi5leHRlbmQoeyBcbiAgICAgICAgICAgIGlkOiBDb21tb24ubmV4dElkKCksXG4gICAgICAgICAgICB0eXBlOiAnY29tcG9zaXRlJyxcbiAgICAgICAgICAgIHBhcmVudDogbnVsbCxcbiAgICAgICAgICAgIGlzTW9kaWZpZWQ6IGZhbHNlLFxuICAgICAgICAgICAgYm9kaWVzOiBbXSwgXG4gICAgICAgICAgICBjb25zdHJhaW50czogW10sIFxuICAgICAgICAgICAgY29tcG9zaXRlczogW10sXG4gICAgICAgICAgICBsYWJlbDogJ0NvbXBvc2l0ZSdcbiAgICAgICAgfSwgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGNvbXBvc2l0ZSdzIGBpc01vZGlmaWVkYCBmbGFnLiBcbiAgICAgKiBJZiBgdXBkYXRlUGFyZW50c2AgaXMgdHJ1ZSwgYWxsIHBhcmVudHMgd2lsbCBiZSBzZXQgKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBJZiBgdXBkYXRlQ2hpbGRyZW5gIGlzIHRydWUsIGFsbCBjaGlsZHJlbiB3aWxsIGJlIHNldCAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBtZXRob2Qgc2V0TW9kaWZpZWRcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc01vZGlmaWVkXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbdXBkYXRlUGFyZW50cz1mYWxzZV1cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFt1cGRhdGVDaGlsZHJlbj1mYWxzZV1cbiAgICAgKi9cbiAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQgPSBmdW5jdGlvbihjb21wb3NpdGUsIGlzTW9kaWZpZWQsIHVwZGF0ZVBhcmVudHMsIHVwZGF0ZUNoaWxkcmVuKSB7XG4gICAgICAgIGNvbXBvc2l0ZS5pc01vZGlmaWVkID0gaXNNb2RpZmllZDtcblxuICAgICAgICBpZiAodXBkYXRlUGFyZW50cyAmJiBjb21wb3NpdGUucGFyZW50KSB7XG4gICAgICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLnBhcmVudCwgaXNNb2RpZmllZCwgdXBkYXRlUGFyZW50cywgdXBkYXRlQ2hpbGRyZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVwZGF0ZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGRDb21wb3NpdGUgPSBjb21wb3NpdGUuY29tcG9zaXRlc1tpXTtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY2hpbGRDb21wb3NpdGUsIGlzTW9kaWZpZWQsIHVwZGF0ZVBhcmVudHMsIHVwZGF0ZUNoaWxkcmVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmljIGFkZCBmdW5jdGlvbi4gQWRkcyBvbmUgb3IgbWFueSBib2R5KHMpLCBjb25zdHJhaW50KHMpIG9yIGEgY29tcG9zaXRlKHMpIHRvIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogVHJpZ2dlcnMgYGJlZm9yZUFkZGAgYW5kIGBhZnRlckFkZGAgZXZlbnRzIG9uIHRoZSBgY29tcG9zaXRlYC5cbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge30gb2JqZWN0XG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlIHdpdGggdGhlIG9iamVjdHMgYWRkZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuYWRkID0gZnVuY3Rpb24oY29tcG9zaXRlLCBvYmplY3QpIHtcbiAgICAgICAgdmFyIG9iamVjdHMgPSBbXS5jb25jYXQob2JqZWN0KTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihjb21wb3NpdGUsICdiZWZvcmVBZGQnLCB7IG9iamVjdDogb2JqZWN0IH0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9iamVjdHNbaV07XG5cbiAgICAgICAgICAgIHN3aXRjaCAob2JqLnR5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnYm9keSc6XG4gICAgICAgICAgICAgICAgLy8gc2tpcCBhZGRpbmcgY29tcG91bmQgcGFydHNcbiAgICAgICAgICAgICAgICBpZiAob2JqLnBhcmVudCAhPT0gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbW1vbi5sb2coJ0NvbXBvc2l0ZS5hZGQ6IHNraXBwZWQgYWRkaW5nIGEgY29tcG91bmQgYm9keSBwYXJ0ICh5b3UgbXVzdCBhZGQgaXRzIHBhcmVudCBpbnN0ZWFkKScsICd3YXJuJyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRCb2R5KGNvbXBvc2l0ZSwgb2JqKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NvbnN0cmFpbnQnOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNvbXBvc2l0ZSwgb2JqKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvc2l0ZSc6XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbXBvc2l0ZShjb21wb3NpdGUsIG9iaik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtb3VzZUNvbnN0cmFpbnQnOlxuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNvbXBvc2l0ZSwgb2JqLmNvbnN0cmFpbnQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBFdmVudHMudHJpZ2dlcihjb21wb3NpdGUsICdhZnRlckFkZCcsIHsgb2JqZWN0OiBvYmplY3QgfSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2VuZXJpYyByZW1vdmUgZnVuY3Rpb24uIFJlbW92ZXMgb25lIG9yIG1hbnkgYm9keShzKSwgY29uc3RyYWludChzKSBvciBhIGNvbXBvc2l0ZShzKSB0byB0aGUgZ2l2ZW4gY29tcG9zaXRlLlxuICAgICAqIE9wdGlvbmFsbHkgc2VhcmNoaW5nIGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICAgKiBUcmlnZ2VycyBgYmVmb3JlUmVtb3ZlYCBhbmQgYGFmdGVyUmVtb3ZlYCBldmVudHMgb24gdGhlIGBjb21wb3NpdGVgLlxuICAgICAqIEBtZXRob2QgcmVtb3ZlXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7fSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtkZWVwPWZhbHNlXVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBvYmplY3RzIHJlbW92ZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUucmVtb3ZlID0gZnVuY3Rpb24oY29tcG9zaXRlLCBvYmplY3QsIGRlZXApIHtcbiAgICAgICAgdmFyIG9iamVjdHMgPSBbXS5jb25jYXQob2JqZWN0KTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihjb21wb3NpdGUsICdiZWZvcmVSZW1vdmUnLCB7IG9iamVjdDogb2JqZWN0IH0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG9iaiA9IG9iamVjdHNbaV07XG5cbiAgICAgICAgICAgIHN3aXRjaCAob2JqLnR5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnYm9keSc6XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUJvZHkoY29tcG9zaXRlLCBvYmosIGRlZXApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY29uc3RyYWludCc6XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUNvbnN0cmFpbnQoY29tcG9zaXRlLCBvYmosIGRlZXApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY29tcG9zaXRlJzpcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQ29tcG9zaXRlKGNvbXBvc2l0ZSwgb2JqLCBkZWVwKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ21vdXNlQ29uc3RyYWludCc6XG4gICAgICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUNvbnN0cmFpbnQoY29tcG9zaXRlLCBvYmouY29uc3RyYWludCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKGNvbXBvc2l0ZSwgJ2FmdGVyUmVtb3ZlJywgeyBvYmplY3Q6IG9iamVjdCB9KTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgY29tcG9zaXRlIHRvIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGFkZENvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVBXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZUJcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGVBIHdpdGggdGhlIG9iamVjdHMgZnJvbSBjb21wb3NpdGVCIGFkZGVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmFkZENvbXBvc2l0ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZUEsIGNvbXBvc2l0ZUIpIHtcbiAgICAgICAgY29tcG9zaXRlQS5jb21wb3NpdGVzLnB1c2goY29tcG9zaXRlQik7XG4gICAgICAgIGNvbXBvc2l0ZUIucGFyZW50ID0gY29tcG9zaXRlQTtcbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZUEsIHRydWUsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZUE7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBjb21wb3NpdGUgZnJvbSB0aGUgZ2l2ZW4gY29tcG9zaXRlLCBhbmQgb3B0aW9uYWxseSBzZWFyY2hpbmcgaXRzIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5LlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCByZW1vdmVDb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlQVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVCXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbZGVlcD1mYWxzZV1cbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGVBIHdpdGggdGhlIGNvbXBvc2l0ZSByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZUNvbXBvc2l0ZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZUEsIGNvbXBvc2l0ZUIsIGRlZXApIHtcbiAgICAgICAgdmFyIHBvc2l0aW9uID0gQ29tbW9uLmluZGV4T2YoY29tcG9zaXRlQS5jb21wb3NpdGVzLCBjb21wb3NpdGVCKTtcbiAgICAgICAgaWYgKHBvc2l0aW9uICE9PSAtMSkge1xuICAgICAgICAgICAgQ29tcG9zaXRlLnJlbW92ZUNvbXBvc2l0ZUF0KGNvbXBvc2l0ZUEsIHBvc2l0aW9uKTtcbiAgICAgICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGVBLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGVlcCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wb3NpdGVBLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVDb21wb3NpdGUoY29tcG9zaXRlQS5jb21wb3NpdGVzW2ldLCBjb21wb3NpdGVCLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGVBO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGEgY29tcG9zaXRlIGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQ29tcG9zaXRlQXRcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBvc2l0aW9uXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlIHdpdGggdGhlIGNvbXBvc2l0ZSByZW1vdmVkXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlbW92ZUNvbXBvc2l0ZUF0ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBwb3NpdGlvbikge1xuICAgICAgICBjb21wb3NpdGUuY29tcG9zaXRlcy5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBib2R5IHRvIHRoZSBnaXZlbiBjb21wb3NpdGUuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGFkZEJvZHlcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlIHdpdGggdGhlIGJvZHkgYWRkZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuYWRkQm9keSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgYm9keSkge1xuICAgICAgICBjb21wb3NpdGUuYm9kaWVzLnB1c2goYm9keSk7XG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGJvZHkgZnJvbSB0aGUgZ2l2ZW4gY29tcG9zaXRlLCBhbmQgb3B0aW9uYWxseSBzZWFyY2hpbmcgaXRzIGNoaWxkcmVuIHJlY3Vyc2l2ZWx5LlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCByZW1vdmVCb2R5XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RlZXA9ZmFsc2VdXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBUaGUgb3JpZ2luYWwgY29tcG9zaXRlIHdpdGggdGhlIGJvZHkgcmVtb3ZlZFxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5yZW1vdmVCb2R5ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBib2R5LCBkZWVwKSB7XG4gICAgICAgIHZhciBwb3NpdGlvbiA9IENvbW1vbi5pbmRleE9mKGNvbXBvc2l0ZS5ib2RpZXMsIGJvZHkpO1xuICAgICAgICBpZiAocG9zaXRpb24gIT09IC0xKSB7XG4gICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQm9keUF0KGNvbXBvc2l0ZSwgcG9zaXRpb24pO1xuICAgICAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVCb2R5KGNvbXBvc2l0ZS5jb21wb3NpdGVzW2ldLCBib2R5LCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBib2R5IGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQm9keUF0XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb3NpdGlvblxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBib2R5IHJlbW92ZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUucmVtb3ZlQm9keUF0ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBwb3NpdGlvbikge1xuICAgICAgICBjb21wb3NpdGUuYm9kaWVzLnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGNvbnN0cmFpbnQgdG8gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYWRkQ29uc3RyYWludFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2NvbnN0cmFpbnR9IGNvbnN0cmFpbnRcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBvcmlnaW5hbCBjb21wb3NpdGUgd2l0aCB0aGUgY29uc3RyYWludCBhZGRlZFxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBjb25zdHJhaW50KSB7XG4gICAgICAgIGNvbXBvc2l0ZS5jb25zdHJhaW50cy5wdXNoKGNvbnN0cmFpbnQpO1xuICAgICAgICBDb21wb3NpdGUuc2V0TW9kaWZpZWQoY29tcG9zaXRlLCB0cnVlLCB0cnVlLCBmYWxzZSk7XG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBjb25zdHJhaW50IGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgYW5kIG9wdGlvbmFsbHkgc2VhcmNoaW5nIGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQ29uc3RyYWludFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge2NvbnN0cmFpbnR9IGNvbnN0cmFpbnRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtkZWVwPWZhbHNlXVxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBjb25zdHJhaW50IHJlbW92ZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUucmVtb3ZlQ29uc3RyYWludCA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSwgY29uc3RyYWludCwgZGVlcCkge1xuICAgICAgICB2YXIgcG9zaXRpb24gPSBDb21tb24uaW5kZXhPZihjb21wb3NpdGUuY29uc3RyYWludHMsIGNvbnN0cmFpbnQpO1xuICAgICAgICBpZiAocG9zaXRpb24gIT09IC0xKSB7XG4gICAgICAgICAgICBDb21wb3NpdGUucmVtb3ZlQ29uc3RyYWludEF0KGNvbXBvc2l0ZSwgcG9zaXRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlZXApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgIENvbXBvc2l0ZS5yZW1vdmVDb25zdHJhaW50KGNvbXBvc2l0ZS5jb21wb3NpdGVzW2ldLCBjb25zdHJhaW50LCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgYSBib2R5IGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgcmVtb3ZlQ29uc3RyYWludEF0XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb3NpdGlvblxuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gVGhlIG9yaWdpbmFsIGNvbXBvc2l0ZSB3aXRoIHRoZSBjb25zdHJhaW50IHJlbW92ZWRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUucmVtb3ZlQ29uc3RyYWludEF0ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBwb3NpdGlvbikge1xuICAgICAgICBjb21wb3NpdGUuY29uc3RyYWludHMuc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBib2RpZXMsIGNvbnN0cmFpbnRzIGFuZCBjb21wb3NpdGVzIGZyb20gdGhlIGdpdmVuIGNvbXBvc2l0ZS5cbiAgICAgKiBPcHRpb25hbGx5IGNsZWFyaW5nIGl0cyBjaGlsZHJlbiByZWN1cnNpdmVseS5cbiAgICAgKiBAbWV0aG9kIGNsZWFyXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0ga2VlcFN0YXRpY1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RlZXA9ZmFsc2VdXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmNsZWFyID0gZnVuY3Rpb24oY29tcG9zaXRlLCBrZWVwU3RhdGljLCBkZWVwKSB7XG4gICAgICAgIGlmIChkZWVwKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuY2xlYXIoY29tcG9zaXRlLmNvbXBvc2l0ZXNbaV0sIGtlZXBTdGF0aWMsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoa2VlcFN0YXRpYykge1xuICAgICAgICAgICAgY29tcG9zaXRlLmJvZGllcyA9IGNvbXBvc2l0ZS5ib2RpZXMuZmlsdGVyKGZ1bmN0aW9uKGJvZHkpIHsgcmV0dXJuIGJvZHkuaXNTdGF0aWM7IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcG9zaXRlLmJvZGllcy5sZW5ndGggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgY29tcG9zaXRlLmNvbnN0cmFpbnRzLmxlbmd0aCA9IDA7XG4gICAgICAgIGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aCA9IDA7XG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFsbCBib2RpZXMgaW4gdGhlIGdpdmVuIGNvbXBvc2l0ZSwgaW5jbHVkaW5nIGFsbCBib2RpZXMgaW4gaXRzIGNoaWxkcmVuLCByZWN1cnNpdmVseS5cbiAgICAgKiBAbWV0aG9kIGFsbEJvZGllc1xuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcmV0dXJuIHtib2R5W119IEFsbCB0aGUgYm9kaWVzXG4gICAgICovXG4gICAgQ29tcG9zaXRlLmFsbEJvZGllcyA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSkge1xuICAgICAgICB2YXIgYm9kaWVzID0gW10uY29uY2F0KGNvbXBvc2l0ZS5ib2RpZXMpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tcG9zaXRlLmNvbXBvc2l0ZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBib2RpZXMgPSBib2RpZXMuY29uY2F0KENvbXBvc2l0ZS5hbGxCb2RpZXMoY29tcG9zaXRlLmNvbXBvc2l0ZXNbaV0pKTtcblxuICAgICAgICByZXR1cm4gYm9kaWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFsbCBjb25zdHJhaW50cyBpbiB0aGUgZ2l2ZW4gY29tcG9zaXRlLCBpbmNsdWRpbmcgYWxsIGNvbnN0cmFpbnRzIGluIGl0cyBjaGlsZHJlbiwgcmVjdXJzaXZlbHkuXG4gICAgICogQG1ldGhvZCBhbGxDb25zdHJhaW50c1xuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcmV0dXJuIHtjb25zdHJhaW50W119IEFsbCB0aGUgY29uc3RyYWludHNcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuYWxsQ29uc3RyYWludHMgPSBmdW5jdGlvbihjb21wb3NpdGUpIHtcbiAgICAgICAgdmFyIGNvbnN0cmFpbnRzID0gW10uY29uY2F0KGNvbXBvc2l0ZS5jb25zdHJhaW50cyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21wb3NpdGUuY29tcG9zaXRlcy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzID0gY29uc3RyYWludHMuY29uY2F0KENvbXBvc2l0ZS5hbGxDb25zdHJhaW50cyhjb21wb3NpdGUuY29tcG9zaXRlc1tpXSkpO1xuXG4gICAgICAgIHJldHVybiBjb25zdHJhaW50cztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhbGwgY29tcG9zaXRlcyBpbiB0aGUgZ2l2ZW4gY29tcG9zaXRlLCBpbmNsdWRpbmcgYWxsIGNvbXBvc2l0ZXMgaW4gaXRzIGNoaWxkcmVuLCByZWN1cnNpdmVseS5cbiAgICAgKiBAbWV0aG9kIGFsbENvbXBvc2l0ZXNcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlW119IEFsbCB0aGUgY29tcG9zaXRlc1xuICAgICAqL1xuICAgIENvbXBvc2l0ZS5hbGxDb21wb3NpdGVzID0gZnVuY3Rpb24oY29tcG9zaXRlKSB7XG4gICAgICAgIHZhciBjb21wb3NpdGVzID0gW10uY29uY2F0KGNvbXBvc2l0ZS5jb21wb3NpdGVzKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBvc2l0ZS5jb21wb3NpdGVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgY29tcG9zaXRlcyA9IGNvbXBvc2l0ZXMuY29uY2F0KENvbXBvc2l0ZS5hbGxDb21wb3NpdGVzKGNvbXBvc2l0ZS5jb21wb3NpdGVzW2ldKSk7XG5cbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNlYXJjaGVzIHRoZSBjb21wb3NpdGUgcmVjdXJzaXZlbHkgZm9yIGFuIG9iamVjdCBtYXRjaGluZyB0aGUgdHlwZSBhbmQgaWQgc3VwcGxpZWQsIG51bGwgaWYgbm90IGZvdW5kLlxuICAgICAqIEBtZXRob2QgZ2V0XG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBUaGUgcmVxdWVzdGVkIG9iamVjdCwgaWYgZm91bmRcbiAgICAgKi9cbiAgICBDb21wb3NpdGUuZ2V0ID0gZnVuY3Rpb24oY29tcG9zaXRlLCBpZCwgdHlwZSkge1xuICAgICAgICB2YXIgb2JqZWN0cyxcbiAgICAgICAgICAgIG9iamVjdDtcblxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnYm9keSc6XG4gICAgICAgICAgICBvYmplY3RzID0gQ29tcG9zaXRlLmFsbEJvZGllcyhjb21wb3NpdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NvbnN0cmFpbnQnOlxuICAgICAgICAgICAgb2JqZWN0cyA9IENvbXBvc2l0ZS5hbGxDb25zdHJhaW50cyhjb21wb3NpdGUpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NvbXBvc2l0ZSc6XG4gICAgICAgICAgICBvYmplY3RzID0gQ29tcG9zaXRlLmFsbENvbXBvc2l0ZXMoY29tcG9zaXRlKS5jb25jYXQoY29tcG9zaXRlKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvYmplY3RzKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgb2JqZWN0ID0gb2JqZWN0cy5maWx0ZXIoZnVuY3Rpb24ob2JqZWN0KSB7IFxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdC5pZC50b1N0cmluZygpID09PSBpZC50b1N0cmluZygpOyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG9iamVjdC5sZW5ndGggPT09IDAgPyBudWxsIDogb2JqZWN0WzBdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyB0aGUgZ2l2ZW4gb2JqZWN0KHMpIGZyb20gY29tcG9zaXRlQSB0byBjb21wb3NpdGVCIChlcXVhbCB0byBhIHJlbW92ZSBmb2xsb3dlZCBieSBhbiBhZGQpLlxuICAgICAqIEBtZXRob2QgbW92ZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlQX0gY29tcG9zaXRlQVxuICAgICAqIEBwYXJhbSB7b2JqZWN0W119IG9iamVjdHNcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZUJ9IGNvbXBvc2l0ZUJcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFJldHVybnMgY29tcG9zaXRlQVxuICAgICAqL1xuICAgIENvbXBvc2l0ZS5tb3ZlID0gZnVuY3Rpb24oY29tcG9zaXRlQSwgb2JqZWN0cywgY29tcG9zaXRlQikge1xuICAgICAgICBDb21wb3NpdGUucmVtb3ZlKGNvbXBvc2l0ZUEsIG9iamVjdHMpO1xuICAgICAgICBDb21wb3NpdGUuYWRkKGNvbXBvc2l0ZUIsIG9iamVjdHMpO1xuICAgICAgICByZXR1cm4gY29tcG9zaXRlQTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXNzaWducyBuZXcgaWRzIGZvciBhbGwgb2JqZWN0cyBpbiB0aGUgY29tcG9zaXRlLCByZWN1cnNpdmVseS5cbiAgICAgKiBAbWV0aG9kIHJlYmFzZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFJldHVybnMgY29tcG9zaXRlXG4gICAgICovXG4gICAgQ29tcG9zaXRlLnJlYmFzZSA9IGZ1bmN0aW9uKGNvbXBvc2l0ZSkge1xuICAgICAgICB2YXIgb2JqZWN0cyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMoY29tcG9zaXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNvbmNhdChDb21wb3NpdGUuYWxsQ29uc3RyYWludHMoY29tcG9zaXRlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jb25jYXQoQ29tcG9zaXRlLmFsbENvbXBvc2l0ZXMoY29tcG9zaXRlKSk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBvYmplY3RzW2ldLmlkID0gQ29tbW9uLm5leHRJZCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRyYW5zbGF0ZXMgYWxsIGNoaWxkcmVuIGluIHRoZSBjb21wb3NpdGUgYnkgYSBnaXZlbiB2ZWN0b3IgcmVsYXRpdmUgdG8gdGhlaXIgY3VycmVudCBwb3NpdGlvbnMsIFxuICAgICAqIHdpdGhvdXQgaW1wYXJ0aW5nIGFueSB2ZWxvY2l0eS5cbiAgICAgKiBAbWV0aG9kIHRyYW5zbGF0ZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdHJhbnNsYXRpb25cbiAgICAgKiBAcGFyYW0ge2Jvb2x9IFtyZWN1cnNpdmU9dHJ1ZV1cbiAgICAgKi9cbiAgICBDb21wb3NpdGUudHJhbnNsYXRlID0gZnVuY3Rpb24oY29tcG9zaXRlLCB0cmFuc2xhdGlvbiwgcmVjdXJzaXZlKSB7XG4gICAgICAgIHZhciBib2RpZXMgPSByZWN1cnNpdmUgPyBDb21wb3NpdGUuYWxsQm9kaWVzKGNvbXBvc2l0ZSkgOiBjb21wb3NpdGUuYm9kaWVzO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBCb2R5LnRyYW5zbGF0ZShib2RpZXNbaV0sIHRyYW5zbGF0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSb3RhdGVzIGFsbCBjaGlsZHJlbiBpbiB0aGUgY29tcG9zaXRlIGJ5IGEgZ2l2ZW4gYW5nbGUgYWJvdXQgdGhlIGdpdmVuIHBvaW50LCB3aXRob3V0IGltcGFydGluZyBhbnkgYW5ndWxhciB2ZWxvY2l0eS5cbiAgICAgKiBAbWV0aG9kIHJvdGF0ZVxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm90YXRpb25cbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IFtyZWN1cnNpdmU9dHJ1ZV1cbiAgICAgKi9cbiAgICBDb21wb3NpdGUucm90YXRlID0gZnVuY3Rpb24oY29tcG9zaXRlLCByb3RhdGlvbiwgcG9pbnQsIHJlY3Vyc2l2ZSkge1xuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3Mocm90YXRpb24pLFxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4ocm90YXRpb24pLFxuICAgICAgICAgICAgYm9kaWVzID0gcmVjdXJzaXZlID8gQ29tcG9zaXRlLmFsbEJvZGllcyhjb21wb3NpdGUpIDogY29tcG9zaXRlLmJvZGllcztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgZHggPSBib2R5LnBvc2l0aW9uLnggLSBwb2ludC54LFxuICAgICAgICAgICAgICAgIGR5ID0gYm9keS5wb3NpdGlvbi55IC0gcG9pbnQueTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIEJvZHkuc2V0UG9zaXRpb24oYm9keSwge1xuICAgICAgICAgICAgICAgIHg6IHBvaW50LnggKyAoZHggKiBjb3MgLSBkeSAqIHNpbiksXG4gICAgICAgICAgICAgICAgeTogcG9pbnQueSArIChkeCAqIHNpbiArIGR5ICogY29zKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIEJvZHkucm90YXRlKGJvZHksIHJvdGF0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZChjb21wb3NpdGUsIHRydWUsIHRydWUsIGZhbHNlKTtcblxuICAgICAgICByZXR1cm4gY29tcG9zaXRlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTY2FsZXMgYWxsIGNoaWxkcmVuIGluIHRoZSBjb21wb3NpdGUsIGluY2x1ZGluZyB1cGRhdGluZyBwaHlzaWNhbCBwcm9wZXJ0aWVzIChtYXNzLCBhcmVhLCBheGVzLCBpbmVydGlhKSwgZnJvbSBhIHdvcmxkLXNwYWNlIHBvaW50LlxuICAgICAqIEBtZXRob2Qgc2NhbGVcbiAgICAgKiBAcGFyYW0ge2NvbXBvc2l0ZX0gY29tcG9zaXRlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjYWxlWFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsZVlcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcGFyYW0ge2Jvb2x9IFtyZWN1cnNpdmU9dHJ1ZV1cbiAgICAgKi9cbiAgICBDb21wb3NpdGUuc2NhbGUgPSBmdW5jdGlvbihjb21wb3NpdGUsIHNjYWxlWCwgc2NhbGVZLCBwb2ludCwgcmVjdXJzaXZlKSB7XG4gICAgICAgIHZhciBib2RpZXMgPSByZWN1cnNpdmUgPyBDb21wb3NpdGUuYWxsQm9kaWVzKGNvbXBvc2l0ZSkgOiBjb21wb3NpdGUuYm9kaWVzO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXSxcbiAgICAgICAgICAgICAgICBkeCA9IGJvZHkucG9zaXRpb24ueCAtIHBvaW50LngsXG4gICAgICAgICAgICAgICAgZHkgPSBib2R5LnBvc2l0aW9uLnkgLSBwb2ludC55O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgQm9keS5zZXRQb3NpdGlvbihib2R5LCB7XG4gICAgICAgICAgICAgICAgeDogcG9pbnQueCArIGR4ICogc2NhbGVYLFxuICAgICAgICAgICAgICAgIHk6IHBvaW50LnkgKyBkeSAqIHNjYWxlWVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIEJvZHkuc2NhbGUoYm9keSwgc2NhbGVYLCBzY2FsZVkpO1xuICAgICAgICB9XG5cbiAgICAgICAgQ29tcG9zaXRlLnNldE1vZGlmaWVkKGNvbXBvc2l0ZSwgdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xuXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qXG4gICAgKlxuICAgICogIEV2ZW50cyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gYSBjYWxsIHRvIGBDb21wb3NpdGUuYWRkYCBpcyBtYWRlLCBiZWZvcmUgb2JqZWN0cyBoYXZlIGJlZW4gYWRkZWQuXG4gICAgKlxuICAgICogQGV2ZW50IGJlZm9yZUFkZFxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm9iamVjdCBUaGUgb2JqZWN0KHMpIHRvIGJlIGFkZGVkIChtYXkgYmUgYSBzaW5nbGUgYm9keSwgY29uc3RyYWludCwgY29tcG9zaXRlIG9yIGEgbWl4ZWQgYXJyYXkgb2YgdGhlc2UpXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiBhIGNhbGwgdG8gYENvbXBvc2l0ZS5hZGRgIGlzIG1hZGUsIGFmdGVyIG9iamVjdHMgaGF2ZSBiZWVuIGFkZGVkLlxuICAgICpcbiAgICAqIEBldmVudCBhZnRlckFkZFxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm9iamVjdCBUaGUgb2JqZWN0KHMpIHRoYXQgaGF2ZSBiZWVuIGFkZGVkIChtYXkgYmUgYSBzaW5nbGUgYm9keSwgY29uc3RyYWludCwgY29tcG9zaXRlIG9yIGEgbWl4ZWQgYXJyYXkgb2YgdGhlc2UpXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiBhIGNhbGwgdG8gYENvbXBvc2l0ZS5yZW1vdmVgIGlzIG1hZGUsIGJlZm9yZSBvYmplY3RzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVSZW1vdmVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5vYmplY3QgVGhlIG9iamVjdChzKSB0byBiZSByZW1vdmVkIChtYXkgYmUgYSBzaW5nbGUgYm9keSwgY29uc3RyYWludCwgY29tcG9zaXRlIG9yIGEgbWl4ZWQgYXJyYXkgb2YgdGhlc2UpXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiBhIGNhbGwgdG8gYENvbXBvc2l0ZS5yZW1vdmVgIGlzIG1hZGUsIGFmdGVyIG9iamVjdHMgaGF2ZSBiZWVuIHJlbW92ZWQuXG4gICAgKlxuICAgICogQGV2ZW50IGFmdGVyUmVtb3ZlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQub2JqZWN0IFRoZSBvYmplY3QocykgdGhhdCBoYXZlIGJlZW4gcmVtb3ZlZCAobWF5IGJlIGEgc2luZ2xlIGJvZHksIGNvbnN0cmFpbnQsIGNvbXBvc2l0ZSBvciBhIG1peGVkIGFycmF5IG9mIHRoZXNlKVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKlxuICAgICpcbiAgICAqICBQcm9wZXJ0aWVzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGludGVnZXIgYE51bWJlcmAgdW5pcXVlbHkgaWRlbnRpZnlpbmcgbnVtYmVyIGdlbmVyYXRlZCBpbiBgQ29tcG9zaXRlLmNyZWF0ZWAgYnkgYENvbW1vbi5uZXh0SWRgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIGRlbm90aW5nIHRoZSB0eXBlIG9mIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0eXBlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJjb21wb3NpdGVcIlxuICAgICAqIEByZWFkT25seVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYXJiaXRyYXJ5IGBTdHJpbmdgIG5hbWUgdG8gaGVscCB0aGUgdXNlciBpZGVudGlmeSBhbmQgbWFuYWdlIGNvbXBvc2l0ZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgbGFiZWxcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcIkNvbXBvc2l0ZVwiXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBzcGVjaWZpZXMgd2hldGhlciB0aGUgY29tcG9zaXRlIGhhcyBiZWVuIG1vZGlmaWVkIGR1cmluZyB0aGUgY3VycmVudCBzdGVwLlxuICAgICAqIE1vc3QgYE1hdHRlci5Db21wb3NpdGVgIG1ldGhvZHMgd2lsbCBhdXRvbWF0aWNhbGx5IHNldCB0aGlzIGZsYWcgdG8gYHRydWVgIHRvIGluZm9ybSB0aGUgZW5naW5lIG9mIGNoYW5nZXMgdG8gYmUgaGFuZGxlZC5cbiAgICAgKiBJZiB5b3UgbmVlZCB0byBjaGFuZ2UgaXQgbWFudWFsbHksIHlvdSBzaG91bGQgdXNlIHRoZSBgQ29tcG9zaXRlLnNldE1vZGlmaWVkYCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgaXNNb2RpZmllZFxuICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBDb21wb3NpdGVgIHRoYXQgaXMgdGhlIHBhcmVudCBvZiB0aGlzIGNvbXBvc2l0ZS4gSXQgaXMgYXV0b21hdGljYWxseSBtYW5hZ2VkIGJ5IHRoZSBgTWF0dGVyLkNvbXBvc2l0ZWAgbWV0aG9kcy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBwYXJlbnRcbiAgICAgKiBAdHlwZSBjb21wb3NpdGVcbiAgICAgKiBAZGVmYXVsdCBudWxsXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBhcnJheSBvZiBgQm9keWAgdGhhdCBhcmUgX2RpcmVjdF8gY2hpbGRyZW4gb2YgdGhpcyBjb21wb3NpdGUuXG4gICAgICogVG8gYWRkIG9yIHJlbW92ZSBib2RpZXMgeW91IHNob3VsZCB1c2UgYENvbXBvc2l0ZS5hZGRgIGFuZCBgQ29tcG9zaXRlLnJlbW92ZWAgbWV0aG9kcyByYXRoZXIgdGhhbiBkaXJlY3RseSBtb2RpZnlpbmcgdGhpcyBwcm9wZXJ0eS5cbiAgICAgKiBJZiB5b3Ugd2lzaCB0byByZWN1cnNpdmVseSBmaW5kIGFsbCBkZXNjZW5kYW50cywgeW91IHNob3VsZCB1c2UgdGhlIGBDb21wb3NpdGUuYWxsQm9kaWVzYCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm9kaWVzXG4gICAgICogQHR5cGUgYm9keVtdXG4gICAgICogQGRlZmF1bHQgW11cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFycmF5IG9mIGBDb25zdHJhaW50YCB0aGF0IGFyZSBfZGlyZWN0XyBjaGlsZHJlbiBvZiB0aGlzIGNvbXBvc2l0ZS5cbiAgICAgKiBUbyBhZGQgb3IgcmVtb3ZlIGNvbnN0cmFpbnRzIHlvdSBzaG91bGQgdXNlIGBDb21wb3NpdGUuYWRkYCBhbmQgYENvbXBvc2l0ZS5yZW1vdmVgIG1ldGhvZHMgcmF0aGVyIHRoYW4gZGlyZWN0bHkgbW9kaWZ5aW5nIHRoaXMgcHJvcGVydHkuXG4gICAgICogSWYgeW91IHdpc2ggdG8gcmVjdXJzaXZlbHkgZmluZCBhbGwgZGVzY2VuZGFudHMsIHlvdSBzaG91bGQgdXNlIHRoZSBgQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzYCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29uc3RyYWludHNcbiAgICAgKiBAdHlwZSBjb25zdHJhaW50W11cbiAgICAgKiBAZGVmYXVsdCBbXVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYXJyYXkgb2YgYENvbXBvc2l0ZWAgdGhhdCBhcmUgX2RpcmVjdF8gY2hpbGRyZW4gb2YgdGhpcyBjb21wb3NpdGUuXG4gICAgICogVG8gYWRkIG9yIHJlbW92ZSBjb21wb3NpdGVzIHlvdSBzaG91bGQgdXNlIGBDb21wb3NpdGUuYWRkYCBhbmQgYENvbXBvc2l0ZS5yZW1vdmVgIG1ldGhvZHMgcmF0aGVyIHRoYW4gZGlyZWN0bHkgbW9kaWZ5aW5nIHRoaXMgcHJvcGVydHkuXG4gICAgICogSWYgeW91IHdpc2ggdG8gcmVjdXJzaXZlbHkgZmluZCBhbGwgZGVzY2VuZGFudHMsIHlvdSBzaG91bGQgdXNlIHRoZSBgQ29tcG9zaXRlLmFsbENvbXBvc2l0ZXNgIG1ldGhvZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb21wb3NpdGVzXG4gICAgICogQHR5cGUgY29tcG9zaXRlW11cbiAgICAgKiBAZGVmYXVsdCBbXVxuICAgICAqL1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLldvcmxkYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyB0aGUgd29ybGQgY29tcG9zaXRlLlxuKiBBIGBNYXR0ZXIuV29ybGRgIGlzIGEgYE1hdHRlci5Db21wb3NpdGVgIGJvZHksIHdoaWNoIGlzIGEgY29sbGVjdGlvbiBvZiBgTWF0dGVyLkJvZHlgLCBgTWF0dGVyLkNvbnN0cmFpbnRgIGFuZCBvdGhlciBgTWF0dGVyLkNvbXBvc2l0ZWAuXG4qIEEgYE1hdHRlci5Xb3JsZGAgaGFzIGEgZmV3IGFkZGl0aW9uYWwgcHJvcGVydGllcyBpbmNsdWRpbmcgYGdyYXZpdHlgIGFuZCBgYm91bmRzYC5cbiogSXQgaXMgaW1wb3J0YW50IHRvIHVzZSB0aGUgZnVuY3Rpb25zIGluIHRoZSBgTWF0dGVyLkNvbXBvc2l0ZWAgbW9kdWxlIHRvIG1vZGlmeSB0aGUgd29ybGQgY29tcG9zaXRlLCByYXRoZXIgdGhhbiBkaXJlY3RseSBtb2RpZnlpbmcgaXRzIHByb3BlcnRpZXMuXG4qIFRoZXJlIGFyZSBhbHNvIGEgZmV3IG1ldGhvZHMgaGVyZSB0aGF0IGFsaWFzIHRob3NlIGluIGBNYXR0ZXIuQ29tcG9zaXRlYCBmb3IgZWFzaWVyIHJlYWRhYmlsaXR5LlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgV29ybGRcbiogQGV4dGVuZHMgQ29tcG9zaXRlXG4qL1xuXG52YXIgV29ybGQgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBXb3JsZDtcblxudmFyIENvbXBvc2l0ZSA9IHJlcXVpcmUoJy4vQ29tcG9zaXRlJyk7XG52YXIgQ29uc3RyYWludCA9IHJlcXVpcmUoJy4uL2NvbnN0cmFpbnQvQ29uc3RyYWludCcpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgd29ybGQgY29tcG9zaXRlLiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQHBhcmFtIHt9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHt3b3JsZH0gQSBuZXcgd29ybGRcbiAgICAgKi9cbiAgICBXb3JsZC5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBjb21wb3NpdGUgPSBDb21wb3NpdGUuY3JlYXRlKCk7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgbGFiZWw6ICdXb3JsZCcsXG4gICAgICAgICAgICBncmF2aXR5OiB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiAxLFxuICAgICAgICAgICAgICAgIHNjYWxlOiAwLjAwMVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJvdW5kczogeyBcbiAgICAgICAgICAgICAgICBtaW46IHsgeDogLUluZmluaXR5LCB5OiAtSW5maW5pdHkgfSwgXG4gICAgICAgICAgICAgICAgbWF4OiB7IHg6IEluZmluaXR5LCB5OiBJbmZpbml0eSB9IFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIENvbW1vbi5leHRlbmQoY29tcG9zaXRlLCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8qXG4gICAgKlxuICAgICogIFByb3BlcnRpZXMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGdyYXZpdHkgdG8gYXBwbHkgb24gdGhlIHdvcmxkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGdyYXZpdHlcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBncmF2aXR5IHggY29tcG9uZW50LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGdyYXZpdHkueFxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqIEBkZWZhdWx0IDBcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBncmF2aXR5IHkgY29tcG9uZW50LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGdyYXZpdHkueVxuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBncmF2aXR5IHNjYWxlIGZhY3Rvci5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBncmF2aXR5LnNjYWxlXG4gICAgICogQHR5cGUgb2JqZWN0XG4gICAgICogQGRlZmF1bHQgMC4wMDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYEJvdW5kc2Agb2JqZWN0IHRoYXQgZGVmaW5lcyB0aGUgd29ybGQgYm91bmRzIGZvciBjb2xsaXNpb24gZGV0ZWN0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJvdW5kc1xuICAgICAqIEB0eXBlIGJvdW5kc1xuICAgICAqIEBkZWZhdWx0IHsgbWluOiB7IHg6IC1JbmZpbml0eSwgeTogLUluZmluaXR5IH0sIG1heDogeyB4OiBJbmZpbml0eSwgeTogSW5maW5pdHkgfSB9XG4gICAgICovXG5cbiAgICAvLyBXb3JsZCBpcyBhIENvbXBvc2l0ZSBib2R5XG4gICAgLy8gc2VlIHNyYy9tb2R1bGUvT3V0cm8uanMgZm9yIHRoZXNlIGFsaWFzZXM6XG4gICAgXG4gICAgLyoqXG4gICAgICogQW4gYWxpYXMgZm9yIENvbXBvc2l0ZS5jbGVhclxuICAgICAqIEBtZXRob2QgY2xlYXJcbiAgICAgKiBAcGFyYW0ge3dvcmxkfSB3b3JsZFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0ga2VlcFN0YXRpY1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYWxpYXMgZm9yIENvbXBvc2l0ZS5hZGRcbiAgICAgKiBAbWV0aG9kIGFkZENvbXBvc2l0ZVxuICAgICAqIEBwYXJhbSB7d29ybGR9IHdvcmxkXG4gICAgICogQHBhcmFtIHtjb21wb3NpdGV9IGNvbXBvc2l0ZVxuICAgICAqIEByZXR1cm4ge3dvcmxkfSBUaGUgb3JpZ2luYWwgd29ybGQgd2l0aCB0aGUgb2JqZWN0cyBmcm9tIGNvbXBvc2l0ZSBhZGRlZFxuICAgICAqL1xuICAgIFxuICAgICAvKipcbiAgICAgICogQW4gYWxpYXMgZm9yIENvbXBvc2l0ZS5hZGRCb2R5XG4gICAgICAqIEBtZXRob2QgYWRkQm9keVxuICAgICAgKiBAcGFyYW0ge3dvcmxkfSB3b3JsZFxuICAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlcbiAgICAgICogQHJldHVybiB7d29ybGR9IFRoZSBvcmlnaW5hbCB3b3JsZCB3aXRoIHRoZSBib2R5IGFkZGVkXG4gICAgICAqL1xuXG4gICAgIC8qKlxuICAgICAgKiBBbiBhbGlhcyBmb3IgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnRcbiAgICAgICogQG1ldGhvZCBhZGRDb25zdHJhaW50XG4gICAgICAqIEBwYXJhbSB7d29ybGR9IHdvcmxkXG4gICAgICAqIEBwYXJhbSB7Y29uc3RyYWludH0gY29uc3RyYWludFxuICAgICAgKiBAcmV0dXJuIHt3b3JsZH0gVGhlIG9yaWdpbmFsIHdvcmxkIHdpdGggdGhlIGNvbnN0cmFpbnQgYWRkZWRcbiAgICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuQ29udGFjdGAgbW9kdWxlIGNvbnRhaW5zIG1ldGhvZHMgZm9yIGNyZWF0aW5nIGFuZCBtYW5pcHVsYXRpbmcgY29sbGlzaW9uIGNvbnRhY3RzLlxuKlxuKiBAY2xhc3MgQ29udGFjdFxuKi9cblxudmFyIENvbnRhY3QgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250YWN0O1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbnRhY3QuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge3ZlcnRleH0gdmVydGV4XG4gICAgICogQHJldHVybiB7Y29udGFjdH0gQSBuZXcgY29udGFjdFxuICAgICAqL1xuICAgIENvbnRhY3QuY3JlYXRlID0gZnVuY3Rpb24odmVydGV4KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpZDogQ29udGFjdC5pZCh2ZXJ0ZXgpLFxuICAgICAgICAgICAgdmVydGV4OiB2ZXJ0ZXgsXG4gICAgICAgICAgICBub3JtYWxJbXB1bHNlOiAwLFxuICAgICAgICAgICAgdGFuZ2VudEltcHVsc2U6IDBcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhIGNvbnRhY3QgaWQuXG4gICAgICogQG1ldGhvZCBpZFxuICAgICAqIEBwYXJhbSB7dmVydGV4fSB2ZXJ0ZXhcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFVuaXF1ZSBjb250YWN0SURcbiAgICAgKi9cbiAgICBDb250YWN0LmlkID0gZnVuY3Rpb24odmVydGV4KSB7XG4gICAgICAgIHJldHVybiB2ZXJ0ZXguYm9keS5pZCArICdfJyArIHZlcnRleC5pbmRleDtcbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkRldGVjdG9yYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgZGV0ZWN0aW5nIGNvbGxpc2lvbnMgZ2l2ZW4gYSBzZXQgb2YgcGFpcnMuXG4qXG4qIEBjbGFzcyBEZXRlY3RvclxuKi9cblxuLy8gVE9ETzogc3BlY3VsYXRpdmUgY29udGFjdHNcblxudmFyIERldGVjdG9yID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gRGV0ZWN0b3I7XG5cbnZhciBTQVQgPSByZXF1aXJlKCcuL1NBVCcpO1xudmFyIFBhaXIgPSByZXF1aXJlKCcuL1BhaXInKTtcbnZhciBCb3VuZHMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9Cb3VuZHMnKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogRmluZHMgYWxsIGNvbGxpc2lvbnMgZ2l2ZW4gYSBsaXN0IG9mIHBhaXJzLlxuICAgICAqIEBtZXRob2QgY29sbGlzaW9uc1xuICAgICAqIEBwYXJhbSB7cGFpcltdfSBicm9hZHBoYXNlUGFpcnNcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQHJldHVybiB7YXJyYXl9IGNvbGxpc2lvbnNcbiAgICAgKi9cbiAgICBEZXRlY3Rvci5jb2xsaXNpb25zID0gZnVuY3Rpb24oYnJvYWRwaGFzZVBhaXJzLCBlbmdpbmUpIHtcbiAgICAgICAgdmFyIGNvbGxpc2lvbnMgPSBbXSxcbiAgICAgICAgICAgIHBhaXJzVGFibGUgPSBlbmdpbmUucGFpcnMudGFibGU7XG5cbiAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgIHZhciBtZXRyaWNzID0gZW5naW5lLm1ldHJpY3M7XG4gICAgICAgIC8vIEBlbmRpZlxuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBicm9hZHBoYXNlUGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5QSA9IGJyb2FkcGhhc2VQYWlyc1tpXVswXSwgXG4gICAgICAgICAgICAgICAgYm9keUIgPSBicm9hZHBoYXNlUGFpcnNbaV1bMV07XG5cbiAgICAgICAgICAgIGlmICgoYm9keUEuaXNTdGF0aWMgfHwgYm9keUEuaXNTbGVlcGluZykgJiYgKGJvZHlCLmlzU3RhdGljIHx8IGJvZHlCLmlzU2xlZXBpbmcpKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIURldGVjdG9yLmNhbkNvbGxpZGUoYm9keUEuY29sbGlzaW9uRmlsdGVyLCBib2R5Qi5jb2xsaXNpb25GaWx0ZXIpKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvLyBAaWYgREVCVUdcbiAgICAgICAgICAgIG1ldHJpY3MubWlkcGhhc2VUZXN0cyArPSAxO1xuICAgICAgICAgICAgLy8gQGVuZGlmXG5cbiAgICAgICAgICAgIC8vIG1pZCBwaGFzZVxuICAgICAgICAgICAgaWYgKEJvdW5kcy5vdmVybGFwcyhib2R5QS5ib3VuZHMsIGJvZHlCLmJvdW5kcykpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gYm9keUEucGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBqIDwgYm9keUEucGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnRBID0gYm9keUEucGFydHNbal07XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGJvZHlCLnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgayA8IGJvZHlCLnBhcnRzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFydEIgPSBib2R5Qi5wYXJ0c1trXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChwYXJ0QSA9PT0gYm9keUEgJiYgcGFydEIgPT09IGJvZHlCKSB8fCBCb3VuZHMub3ZlcmxhcHMocGFydEEuYm91bmRzLCBwYXJ0Qi5ib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmluZCBhIHByZXZpb3VzIGNvbGxpc2lvbiB3ZSBjb3VsZCByZXVzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYWlySWQgPSBQYWlyLmlkKHBhcnRBLCBwYXJ0QiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhaXIgPSBwYWlyc1RhYmxlW3BhaXJJZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzQ29sbGlzaW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhaXIgJiYgcGFpci5pc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0NvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzQ29sbGlzaW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBuYXJyb3cgcGhhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGlzaW9uID0gU0FULmNvbGxpZGVzKHBhcnRBLCBwYXJ0QiwgcHJldmlvdXNDb2xsaXNpb24pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0cmljcy5uYXJyb3dwaGFzZVRlc3RzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbGxpc2lvbi5yZXVzZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3MubmFycm93UmV1c2VDb3VudCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEBlbmRpZlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbGxpc2lvbi5jb2xsaWRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25zLnB1c2goY29sbGlzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldHJpY3MubmFycm93RGV0ZWN0aW9ucyArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBAZW5kaWZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29sbGlzaW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgYm90aCBzdXBwbGllZCBjb2xsaXNpb24gZmlsdGVycyB3aWxsIGFsbG93IGEgY29sbGlzaW9uIHRvIG9jY3VyLlxuICAgICAqIFNlZSBgYm9keS5jb2xsaXNpb25GaWx0ZXJgIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICAgICAqIEBtZXRob2QgY2FuQ29sbGlkZVxuICAgICAqIEBwYXJhbSB7fSBmaWx0ZXJBXG4gICAgICogQHBhcmFtIHt9IGZpbHRlckJcbiAgICAgKiBAcmV0dXJuIHtib29sfSBgdHJ1ZWAgaWYgY29sbGlzaW9uIGNhbiBvY2N1clxuICAgICAqL1xuICAgIERldGVjdG9yLmNhbkNvbGxpZGUgPSBmdW5jdGlvbihmaWx0ZXJBLCBmaWx0ZXJCKSB7XG4gICAgICAgIGlmIChmaWx0ZXJBLmdyb3VwID09PSBmaWx0ZXJCLmdyb3VwICYmIGZpbHRlckEuZ3JvdXAgIT09IDApXG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyQS5ncm91cCA+IDA7XG5cbiAgICAgICAgcmV0dXJuIChmaWx0ZXJBLm1hc2sgJiBmaWx0ZXJCLmNhdGVnb3J5KSAhPT0gMCAmJiAoZmlsdGVyQi5tYXNrICYgZmlsdGVyQS5jYXRlZ29yeSkgIT09IDA7XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5HcmlkYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBjb2xsaXNpb24gYnJvYWRwaGFzZSBncmlkIHN0cnVjdHVyZXMuXG4qXG4qIEBjbGFzcyBHcmlkXG4qL1xuXG52YXIgR3JpZCA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWQ7XG5cbnZhciBQYWlyID0gcmVxdWlyZSgnLi9QYWlyJyk7XG52YXIgRGV0ZWN0b3IgPSByZXF1aXJlKCcuL0RldGVjdG9yJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBncmlkLlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtncmlkfSBBIG5ldyBncmlkXG4gICAgICovXG4gICAgR3JpZC5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IEdyaWQsXG4gICAgICAgICAgICBkZXRlY3RvcjogRGV0ZWN0b3IuY29sbGlzaW9ucyxcbiAgICAgICAgICAgIGJ1Y2tldHM6IHt9LFxuICAgICAgICAgICAgcGFpcnM6IHt9LFxuICAgICAgICAgICAgcGFpcnNMaXN0OiBbXSxcbiAgICAgICAgICAgIGJ1Y2tldFdpZHRoOiA0OCxcbiAgICAgICAgICAgIGJ1Y2tldEhlaWdodDogNDhcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gQ29tbW9uLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRoZSB3aWR0aCBvZiBhIHNpbmdsZSBncmlkIGJ1Y2tldC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBidWNrZXRXaWR0aFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDQ4XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaGVpZ2h0IG9mIGEgc2luZ2xlIGdyaWQgYnVja2V0LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGJ1Y2tldEhlaWdodFxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDQ4XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBncmlkLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtncmlkfSBncmlkXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlVXBkYXRlXG4gICAgICovXG4gICAgR3JpZC51cGRhdGUgPSBmdW5jdGlvbihncmlkLCBib2RpZXMsIGVuZ2luZSwgZm9yY2VVcGRhdGUpIHtcbiAgICAgICAgdmFyIGksIGNvbCwgcm93LFxuICAgICAgICAgICAgd29ybGQgPSBlbmdpbmUud29ybGQsXG4gICAgICAgICAgICBidWNrZXRzID0gZ3JpZC5idWNrZXRzLFxuICAgICAgICAgICAgYnVja2V0LFxuICAgICAgICAgICAgYnVja2V0SWQsXG4gICAgICAgICAgICBncmlkQ2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICB2YXIgbWV0cmljcyA9IGVuZ2luZS5tZXRyaWNzO1xuICAgICAgICBtZXRyaWNzLmJyb2FkcGhhc2VUZXN0cyA9IDA7XG4gICAgICAgIC8vIEBlbmRpZlxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoYm9keS5pc1NsZWVwaW5nICYmICFmb3JjZVVwZGF0ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gZG9uJ3QgdXBkYXRlIG91dCBvZiB3b3JsZCBib2RpZXNcbiAgICAgICAgICAgIGlmIChib2R5LmJvdW5kcy5tYXgueCA8IHdvcmxkLmJvdW5kcy5taW4ueCB8fCBib2R5LmJvdW5kcy5taW4ueCA+IHdvcmxkLmJvdW5kcy5tYXgueFxuICAgICAgICAgICAgICAgIHx8IGJvZHkuYm91bmRzLm1heC55IDwgd29ybGQuYm91bmRzLm1pbi55IHx8IGJvZHkuYm91bmRzLm1pbi55ID4gd29ybGQuYm91bmRzLm1heC55KVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB2YXIgbmV3UmVnaW9uID0gX2dldFJlZ2lvbihncmlkLCBib2R5KTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIGJvZHkgaGFzIGNoYW5nZWQgZ3JpZCByZWdpb25cbiAgICAgICAgICAgIGlmICghYm9keS5yZWdpb24gfHwgbmV3UmVnaW9uLmlkICE9PSBib2R5LnJlZ2lvbi5pZCB8fCBmb3JjZVVwZGF0ZSkge1xuXG4gICAgICAgICAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgICAgICAgICAgbWV0cmljcy5icm9hZHBoYXNlVGVzdHMgKz0gMTtcbiAgICAgICAgICAgICAgICAvLyBAZW5kaWZcblxuICAgICAgICAgICAgICAgIGlmICghYm9keS5yZWdpb24gfHwgZm9yY2VVcGRhdGUpXG4gICAgICAgICAgICAgICAgICAgIGJvZHkucmVnaW9uID0gbmV3UmVnaW9uO1xuXG4gICAgICAgICAgICAgICAgdmFyIHVuaW9uID0gX3JlZ2lvblVuaW9uKG5ld1JlZ2lvbiwgYm9keS5yZWdpb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIGdyaWQgYnVja2V0cyBhZmZlY3RlZCBieSByZWdpb24gY2hhbmdlXG4gICAgICAgICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSB1bmlvbiBvZiBib3RoIHJlZ2lvbnNcbiAgICAgICAgICAgICAgICBmb3IgKGNvbCA9IHVuaW9uLnN0YXJ0Q29sOyBjb2wgPD0gdW5pb24uZW5kQ29sOyBjb2wrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHJvdyA9IHVuaW9uLnN0YXJ0Um93OyByb3cgPD0gdW5pb24uZW5kUm93OyByb3crKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0SWQgPSBfZ2V0QnVja2V0SWQoY29sLCByb3cpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVja2V0ID0gYnVja2V0c1tidWNrZXRJZF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0luc2lkZU5ld1JlZ2lvbiA9IChjb2wgPj0gbmV3UmVnaW9uLnN0YXJ0Q29sICYmIGNvbCA8PSBuZXdSZWdpb24uZW5kQ29sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiByb3cgPj0gbmV3UmVnaW9uLnN0YXJ0Um93ICYmIHJvdyA8PSBuZXdSZWdpb24uZW5kUm93KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzSW5zaWRlT2xkUmVnaW9uID0gKGNvbCA+PSBib2R5LnJlZ2lvbi5zdGFydENvbCAmJiBjb2wgPD0gYm9keS5yZWdpb24uZW5kQ29sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiByb3cgPj0gYm9keS5yZWdpb24uc3RhcnRSb3cgJiYgcm93IDw9IGJvZHkucmVnaW9uLmVuZFJvdyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBmcm9tIG9sZCByZWdpb24gYnVja2V0c1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0luc2lkZU5ld1JlZ2lvbiAmJiBpc0luc2lkZU9sZFJlZ2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0luc2lkZU9sZFJlZ2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVja2V0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2J1Y2tldFJlbW92ZUJvZHkoZ3JpZCwgYnVja2V0LCBib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFkZCB0byBuZXcgcmVnaW9uIGJ1Y2tldHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChib2R5LnJlZ2lvbiA9PT0gbmV3UmVnaW9uIHx8IChpc0luc2lkZU5ld1JlZ2lvbiAmJiAhaXNJbnNpZGVPbGRSZWdpb24pIHx8IGZvcmNlVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFidWNrZXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1Y2tldCA9IF9jcmVhdGVCdWNrZXQoYnVja2V0cywgYnVja2V0SWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9idWNrZXRBZGRCb2R5KGdyaWQsIGJ1Y2tldCwgYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIG5ldyByZWdpb25cbiAgICAgICAgICAgICAgICBib2R5LnJlZ2lvbiA9IG5ld1JlZ2lvbjtcblxuICAgICAgICAgICAgICAgIC8vIGZsYWcgY2hhbmdlcyBzbyB3ZSBjYW4gdXBkYXRlIHBhaXJzXG4gICAgICAgICAgICAgICAgZ3JpZENoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdXBkYXRlIHBhaXJzIGxpc3Qgb25seSBpZiBwYWlycyBjaGFuZ2VkIChpLmUuIGEgYm9keSBjaGFuZ2VkIHJlZ2lvbilcbiAgICAgICAgaWYgKGdyaWRDaGFuZ2VkKVxuICAgICAgICAgICAgZ3JpZC5wYWlyc0xpc3QgPSBfY3JlYXRlQWN0aXZlUGFpcnNMaXN0KGdyaWQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGdyaWQuXG4gICAgICogQG1ldGhvZCBjbGVhclxuICAgICAqIEBwYXJhbSB7Z3JpZH0gZ3JpZFxuICAgICAqL1xuICAgIEdyaWQuY2xlYXIgPSBmdW5jdGlvbihncmlkKSB7XG4gICAgICAgIGdyaWQuYnVja2V0cyA9IHt9O1xuICAgICAgICBncmlkLnBhaXJzID0ge307XG4gICAgICAgIGdyaWQucGFpcnNMaXN0ID0gW107XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpbmRzIHRoZSB1bmlvbiBvZiB0d28gcmVnaW9ucy5cbiAgICAgKiBAbWV0aG9kIF9yZWdpb25VbmlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IHJlZ2lvbkFcbiAgICAgKiBAcGFyYW0ge30gcmVnaW9uQlxuICAgICAqIEByZXR1cm4ge30gcmVnaW9uXG4gICAgICovXG4gICAgdmFyIF9yZWdpb25VbmlvbiA9IGZ1bmN0aW9uKHJlZ2lvbkEsIHJlZ2lvbkIpIHtcbiAgICAgICAgdmFyIHN0YXJ0Q29sID0gTWF0aC5taW4ocmVnaW9uQS5zdGFydENvbCwgcmVnaW9uQi5zdGFydENvbCksXG4gICAgICAgICAgICBlbmRDb2wgPSBNYXRoLm1heChyZWdpb25BLmVuZENvbCwgcmVnaW9uQi5lbmRDb2wpLFxuICAgICAgICAgICAgc3RhcnRSb3cgPSBNYXRoLm1pbihyZWdpb25BLnN0YXJ0Um93LCByZWdpb25CLnN0YXJ0Um93KSxcbiAgICAgICAgICAgIGVuZFJvdyA9IE1hdGgubWF4KHJlZ2lvbkEuZW5kUm93LCByZWdpb25CLmVuZFJvdyk7XG5cbiAgICAgICAgcmV0dXJuIF9jcmVhdGVSZWdpb24oc3RhcnRDb2wsIGVuZENvbCwgc3RhcnRSb3csIGVuZFJvdyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHJlZ2lvbiBhIGdpdmVuIGJvZHkgZmFsbHMgaW4gZm9yIGEgZ2l2ZW4gZ3JpZC5cbiAgICAgKiBAbWV0aG9kIF9nZXRSZWdpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBncmlkXG4gICAgICogQHBhcmFtIHt9IGJvZHlcbiAgICAgKiBAcmV0dXJuIHt9IHJlZ2lvblxuICAgICAqL1xuICAgIHZhciBfZ2V0UmVnaW9uID0gZnVuY3Rpb24oZ3JpZCwgYm9keSkge1xuICAgICAgICB2YXIgYm91bmRzID0gYm9keS5ib3VuZHMsXG4gICAgICAgICAgICBzdGFydENvbCA9IE1hdGguZmxvb3IoYm91bmRzLm1pbi54IC8gZ3JpZC5idWNrZXRXaWR0aCksXG4gICAgICAgICAgICBlbmRDb2wgPSBNYXRoLmZsb29yKGJvdW5kcy5tYXgueCAvIGdyaWQuYnVja2V0V2lkdGgpLFxuICAgICAgICAgICAgc3RhcnRSb3cgPSBNYXRoLmZsb29yKGJvdW5kcy5taW4ueSAvIGdyaWQuYnVja2V0SGVpZ2h0KSxcbiAgICAgICAgICAgIGVuZFJvdyA9IE1hdGguZmxvb3IoYm91bmRzLm1heC55IC8gZ3JpZC5idWNrZXRIZWlnaHQpO1xuXG4gICAgICAgIHJldHVybiBfY3JlYXRlUmVnaW9uKHN0YXJ0Q29sLCBlbmRDb2wsIHN0YXJ0Um93LCBlbmRSb3cpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgcmVnaW9uLlxuICAgICAqIEBtZXRob2QgX2NyZWF0ZVJlZ2lvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IHN0YXJ0Q29sXG4gICAgICogQHBhcmFtIHt9IGVuZENvbFxuICAgICAqIEBwYXJhbSB7fSBzdGFydFJvd1xuICAgICAqIEBwYXJhbSB7fSBlbmRSb3dcbiAgICAgKiBAcmV0dXJuIHt9IHJlZ2lvblxuICAgICAqL1xuICAgIHZhciBfY3JlYXRlUmVnaW9uID0gZnVuY3Rpb24oc3RhcnRDb2wsIGVuZENvbCwgc3RhcnRSb3csIGVuZFJvdykge1xuICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgIGlkOiBzdGFydENvbCArICcsJyArIGVuZENvbCArICcsJyArIHN0YXJ0Um93ICsgJywnICsgZW5kUm93LFxuICAgICAgICAgICAgc3RhcnRDb2w6IHN0YXJ0Q29sLCBcbiAgICAgICAgICAgIGVuZENvbDogZW5kQ29sLCBcbiAgICAgICAgICAgIHN0YXJ0Um93OiBzdGFydFJvdywgXG4gICAgICAgICAgICBlbmRSb3c6IGVuZFJvdyBcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgYnVja2V0IGlkIGF0IHRoZSBnaXZlbiBwb3NpdGlvbi5cbiAgICAgKiBAbWV0aG9kIF9nZXRCdWNrZXRJZFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IGNvbHVtblxuICAgICAqIEBwYXJhbSB7fSByb3dcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IGJ1Y2tldCBpZFxuICAgICAqL1xuICAgIHZhciBfZ2V0QnVja2V0SWQgPSBmdW5jdGlvbihjb2x1bW4sIHJvdykge1xuICAgICAgICByZXR1cm4gY29sdW1uICsgJywnICsgcm93O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgYnVja2V0LlxuICAgICAqIEBtZXRob2QgX2NyZWF0ZUJ1Y2tldFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IGJ1Y2tldHNcbiAgICAgKiBAcGFyYW0ge30gYnVja2V0SWRcbiAgICAgKiBAcmV0dXJuIHt9IGJ1Y2tldFxuICAgICAqL1xuICAgIHZhciBfY3JlYXRlQnVja2V0ID0gZnVuY3Rpb24oYnVja2V0cywgYnVja2V0SWQpIHtcbiAgICAgICAgdmFyIGJ1Y2tldCA9IGJ1Y2tldHNbYnVja2V0SWRdID0gW107XG4gICAgICAgIHJldHVybiBidWNrZXQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBib2R5IHRvIGEgYnVja2V0LlxuICAgICAqIEBtZXRob2QgX2J1Y2tldEFkZEJvZHlcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBncmlkXG4gICAgICogQHBhcmFtIHt9IGJ1Y2tldFxuICAgICAqIEBwYXJhbSB7fSBib2R5XG4gICAgICovXG4gICAgdmFyIF9idWNrZXRBZGRCb2R5ID0gZnVuY3Rpb24oZ3JpZCwgYnVja2V0LCBib2R5KSB7XG4gICAgICAgIC8vIGFkZCBuZXcgcGFpcnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWNrZXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5QiA9IGJ1Y2tldFtpXTtcblxuICAgICAgICAgICAgaWYgKGJvZHkuaWQgPT09IGJvZHlCLmlkIHx8IChib2R5LmlzU3RhdGljICYmIGJvZHlCLmlzU3RhdGljKSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8ga2VlcCB0cmFjayBvZiB0aGUgbnVtYmVyIG9mIGJ1Y2tldHMgdGhlIHBhaXIgZXhpc3RzIGluXG4gICAgICAgICAgICAvLyBpbXBvcnRhbnQgZm9yIEdyaWQudXBkYXRlIHRvIHdvcmtcbiAgICAgICAgICAgIHZhciBwYWlySWQgPSBQYWlyLmlkKGJvZHksIGJvZHlCKSxcbiAgICAgICAgICAgICAgICBwYWlyID0gZ3JpZC5wYWlyc1twYWlySWRdO1xuXG4gICAgICAgICAgICBpZiAocGFpcikge1xuICAgICAgICAgICAgICAgIHBhaXJbMl0gKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZ3JpZC5wYWlyc1twYWlySWRdID0gW2JvZHksIGJvZHlCLCAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCB0byBib2RpZXMgKGFmdGVyIHBhaXJzLCBvdGhlcndpc2UgcGFpcnMgd2l0aCBzZWxmKVxuICAgICAgICBidWNrZXQucHVzaChib2R5KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlcyBhIGJvZHkgZnJvbSBhIGJ1Y2tldC5cbiAgICAgKiBAbWV0aG9kIF9idWNrZXRSZW1vdmVCb2R5XG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gZ3JpZFxuICAgICAqIEBwYXJhbSB7fSBidWNrZXRcbiAgICAgKiBAcGFyYW0ge30gYm9keVxuICAgICAqL1xuICAgIHZhciBfYnVja2V0UmVtb3ZlQm9keSA9IGZ1bmN0aW9uKGdyaWQsIGJ1Y2tldCwgYm9keSkge1xuICAgICAgICAvLyByZW1vdmUgZnJvbSBidWNrZXRcbiAgICAgICAgYnVja2V0LnNwbGljZShDb21tb24uaW5kZXhPZihidWNrZXQsIGJvZHkpLCAxKTtcblxuICAgICAgICAvLyB1cGRhdGUgcGFpciBjb3VudHNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWNrZXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgdGhlIG51bWJlciBvZiBidWNrZXRzIHRoZSBwYWlyIGV4aXN0cyBpblxuICAgICAgICAgICAgLy8gaW1wb3J0YW50IGZvciBfY3JlYXRlQWN0aXZlUGFpcnNMaXN0IHRvIHdvcmtcbiAgICAgICAgICAgIHZhciBib2R5QiA9IGJ1Y2tldFtpXSxcbiAgICAgICAgICAgICAgICBwYWlySWQgPSBQYWlyLmlkKGJvZHksIGJvZHlCKSxcbiAgICAgICAgICAgICAgICBwYWlyID0gZ3JpZC5wYWlyc1twYWlySWRdO1xuXG4gICAgICAgICAgICBpZiAocGFpcilcbiAgICAgICAgICAgICAgICBwYWlyWzJdIC09IDE7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGEgbGlzdCBvZiB0aGUgYWN0aXZlIHBhaXJzIGluIHRoZSBncmlkLlxuICAgICAqIEBtZXRob2QgX2NyZWF0ZUFjdGl2ZVBhaXJzTGlzdFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IGdyaWRcbiAgICAgKiBAcmV0dXJuIFtdIHBhaXJzXG4gICAgICovXG4gICAgdmFyIF9jcmVhdGVBY3RpdmVQYWlyc0xpc3QgPSBmdW5jdGlvbihncmlkKSB7XG4gICAgICAgIHZhciBwYWlyS2V5cyxcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBwYWlycyA9IFtdO1xuXG4gICAgICAgIC8vIGdyaWQucGFpcnMgaXMgdXNlZCBhcyBhIGhhc2htYXBcbiAgICAgICAgcGFpcktleXMgPSBDb21tb24ua2V5cyhncmlkLnBhaXJzKTtcblxuICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZ3JpZC5wYWlyc1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IHBhaXJLZXlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICBwYWlyID0gZ3JpZC5wYWlyc1twYWlyS2V5c1trXV07XG5cbiAgICAgICAgICAgIC8vIGlmIHBhaXIgZXhpc3RzIGluIGF0IGxlYXN0IG9uZSBidWNrZXRcbiAgICAgICAgICAgIC8vIGl0IGlzIGEgcGFpciB0aGF0IG5lZWRzIGZ1cnRoZXIgY29sbGlzaW9uIHRlc3Rpbmcgc28gcHVzaCBpdFxuICAgICAgICAgICAgaWYgKHBhaXJbMl0gPiAwKSB7XG4gICAgICAgICAgICAgICAgcGFpcnMucHVzaChwYWlyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGdyaWQucGFpcnNbcGFpcktleXNba11dO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhaXJzO1xuICAgIH07XG4gICAgXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlBhaXJgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGNvbGxpc2lvbiBwYWlycy5cbipcbiogQGNsYXNzIFBhaXJcbiovXG5cbnZhciBQYWlyID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gUGFpcjtcblxudmFyIENvbnRhY3QgPSByZXF1aXJlKCcuL0NvbnRhY3QnKTtcblxuKGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBwYWlyLlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtjb2xsaXNpb259IGNvbGxpc2lvblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXBcbiAgICAgKiBAcmV0dXJuIHtwYWlyfSBBIG5ldyBwYWlyXG4gICAgICovXG4gICAgUGFpci5jcmVhdGUgPSBmdW5jdGlvbihjb2xsaXNpb24sIHRpbWVzdGFtcCkge1xuICAgICAgICB2YXIgYm9keUEgPSBjb2xsaXNpb24uYm9keUEsXG4gICAgICAgICAgICBib2R5QiA9IGNvbGxpc2lvbi5ib2R5QixcbiAgICAgICAgICAgIHBhcmVudEEgPSBjb2xsaXNpb24ucGFyZW50QSxcbiAgICAgICAgICAgIHBhcmVudEIgPSBjb2xsaXNpb24ucGFyZW50QjtcblxuICAgICAgICB2YXIgcGFpciA9IHtcbiAgICAgICAgICAgIGlkOiBQYWlyLmlkKGJvZHlBLCBib2R5QiksXG4gICAgICAgICAgICBib2R5QTogYm9keUEsXG4gICAgICAgICAgICBib2R5QjogYm9keUIsXG4gICAgICAgICAgICBjb250YWN0czoge30sXG4gICAgICAgICAgICBhY3RpdmVDb250YWN0czogW10sXG4gICAgICAgICAgICBzZXBhcmF0aW9uOiAwLFxuICAgICAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBpc1NlbnNvcjogYm9keUEuaXNTZW5zb3IgfHwgYm9keUIuaXNTZW5zb3IsXG4gICAgICAgICAgICB0aW1lQ3JlYXRlZDogdGltZXN0YW1wLFxuICAgICAgICAgICAgdGltZVVwZGF0ZWQ6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgIGludmVyc2VNYXNzOiBwYXJlbnRBLmludmVyc2VNYXNzICsgcGFyZW50Qi5pbnZlcnNlTWFzcyxcbiAgICAgICAgICAgIGZyaWN0aW9uOiBNYXRoLm1pbihwYXJlbnRBLmZyaWN0aW9uLCBwYXJlbnRCLmZyaWN0aW9uKSxcbiAgICAgICAgICAgIGZyaWN0aW9uU3RhdGljOiBNYXRoLm1heChwYXJlbnRBLmZyaWN0aW9uU3RhdGljLCBwYXJlbnRCLmZyaWN0aW9uU3RhdGljKSxcbiAgICAgICAgICAgIHJlc3RpdHV0aW9uOiBNYXRoLm1heChwYXJlbnRBLnJlc3RpdHV0aW9uLCBwYXJlbnRCLnJlc3RpdHV0aW9uKSxcbiAgICAgICAgICAgIHNsb3A6IE1hdGgubWF4KHBhcmVudEEuc2xvcCwgcGFyZW50Qi5zbG9wKVxuICAgICAgICB9O1xuXG4gICAgICAgIFBhaXIudXBkYXRlKHBhaXIsIGNvbGxpc2lvbiwgdGltZXN0YW1wKTtcblxuICAgICAgICByZXR1cm4gcGFpcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBhIHBhaXIgZ2l2ZW4gYSBjb2xsaXNpb24uXG4gICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge3BhaXJ9IHBhaXJcbiAgICAgKiBAcGFyYW0ge2NvbGxpc2lvbn0gY29sbGlzaW9uXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcFxuICAgICAqL1xuICAgIFBhaXIudXBkYXRlID0gZnVuY3Rpb24ocGFpciwgY29sbGlzaW9uLCB0aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIGNvbnRhY3RzID0gcGFpci5jb250YWN0cyxcbiAgICAgICAgICAgIHN1cHBvcnRzID0gY29sbGlzaW9uLnN1cHBvcnRzLFxuICAgICAgICAgICAgYWN0aXZlQ29udGFjdHMgPSBwYWlyLmFjdGl2ZUNvbnRhY3RzLFxuICAgICAgICAgICAgcGFyZW50QSA9IGNvbGxpc2lvbi5wYXJlbnRBLFxuICAgICAgICAgICAgcGFyZW50QiA9IGNvbGxpc2lvbi5wYXJlbnRCO1xuICAgICAgICBcbiAgICAgICAgcGFpci5jb2xsaXNpb24gPSBjb2xsaXNpb247XG4gICAgICAgIHBhaXIuaW52ZXJzZU1hc3MgPSBwYXJlbnRBLmludmVyc2VNYXNzICsgcGFyZW50Qi5pbnZlcnNlTWFzcztcbiAgICAgICAgcGFpci5mcmljdGlvbiA9IE1hdGgubWluKHBhcmVudEEuZnJpY3Rpb24sIHBhcmVudEIuZnJpY3Rpb24pO1xuICAgICAgICBwYWlyLmZyaWN0aW9uU3RhdGljID0gTWF0aC5tYXgocGFyZW50QS5mcmljdGlvblN0YXRpYywgcGFyZW50Qi5mcmljdGlvblN0YXRpYyk7XG4gICAgICAgIHBhaXIucmVzdGl0dXRpb24gPSBNYXRoLm1heChwYXJlbnRBLnJlc3RpdHV0aW9uLCBwYXJlbnRCLnJlc3RpdHV0aW9uKTtcbiAgICAgICAgcGFpci5zbG9wID0gTWF0aC5tYXgocGFyZW50QS5zbG9wLCBwYXJlbnRCLnNsb3ApO1xuICAgICAgICBhY3RpdmVDb250YWN0cy5sZW5ndGggPSAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbGxpc2lvbi5jb2xsaWRlZCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdXBwb3J0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBzdXBwb3J0ID0gc3VwcG9ydHNbaV0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhY3RJZCA9IENvbnRhY3QuaWQoc3VwcG9ydCksXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhY3QgPSBjb250YWN0c1tjb250YWN0SWRdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNvbnRhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlQ29udGFjdHMucHVzaChjb250YWN0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb250YWN0cy5wdXNoKGNvbnRhY3RzW2NvbnRhY3RJZF0gPSBDb250YWN0LmNyZWF0ZShzdXBwb3J0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwYWlyLnNlcGFyYXRpb24gPSBjb2xsaXNpb24uZGVwdGg7XG4gICAgICAgICAgICBQYWlyLnNldEFjdGl2ZShwYWlyLCB0cnVlLCB0aW1lc3RhbXApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHBhaXIuaXNBY3RpdmUgPT09IHRydWUpXG4gICAgICAgICAgICAgICAgUGFpci5zZXRBY3RpdmUocGFpciwgZmFsc2UsIHRpbWVzdGFtcCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCBhIHBhaXIgYXMgYWN0aXZlIG9yIGluYWN0aXZlLlxuICAgICAqIEBtZXRob2Qgc2V0QWN0aXZlXG4gICAgICogQHBhcmFtIHtwYWlyfSBwYWlyXG4gICAgICogQHBhcmFtIHtib29sfSBpc0FjdGl2ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBQYWlyLnNldEFjdGl2ZSA9IGZ1bmN0aW9uKHBhaXIsIGlzQWN0aXZlLCB0aW1lc3RhbXApIHtcbiAgICAgICAgaWYgKGlzQWN0aXZlKSB7XG4gICAgICAgICAgICBwYWlyLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIHBhaXIudGltZVVwZGF0ZWQgPSB0aW1lc3RhbXA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWlyLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICBwYWlyLmFjdGl2ZUNvbnRhY3RzLmxlbmd0aCA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBpZCBmb3IgdGhlIGdpdmVuIHBhaXIuXG4gICAgICogQG1ldGhvZCBpZFxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keUFcbiAgICAgKiBAcGFyYW0ge2JvZHl9IGJvZHlCXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBVbmlxdWUgcGFpcklkXG4gICAgICovXG4gICAgUGFpci5pZCA9IGZ1bmN0aW9uKGJvZHlBLCBib2R5Qikge1xuICAgICAgICBpZiAoYm9keUEuaWQgPCBib2R5Qi5pZCkge1xuICAgICAgICAgICAgcmV0dXJuIGJvZHlBLmlkICsgJ18nICsgYm9keUIuaWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYm9keUIuaWQgKyAnXycgKyBib2R5QS5pZDtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuUGFpcnNgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGNvbGxpc2lvbiBwYWlyIHNldHMuXG4qXG4qIEBjbGFzcyBQYWlyc1xuKi9cblxudmFyIFBhaXJzID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gUGFpcnM7XG5cbnZhciBQYWlyID0gcmVxdWlyZSgnLi9QYWlyJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIHZhciBfcGFpck1heElkbGVMaWZlID0gMTAwMDtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcGFpcnMgc3RydWN0dXJlLlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtwYWlyc30gQSBuZXcgcGFpcnMgc3RydWN0dXJlXG4gICAgICovXG4gICAgUGFpcnMuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICByZXR1cm4gQ29tbW9uLmV4dGVuZCh7IFxuICAgICAgICAgICAgdGFibGU6IHt9LFxuICAgICAgICAgICAgbGlzdDogW10sXG4gICAgICAgICAgICBjb2xsaXNpb25TdGFydDogW10sXG4gICAgICAgICAgICBjb2xsaXNpb25BY3RpdmU6IFtdLFxuICAgICAgICAgICAgY29sbGlzaW9uRW5kOiBbXVxuICAgICAgICB9LCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBwYWlycyBnaXZlbiBhIGxpc3Qgb2YgY29sbGlzaW9ucy5cbiAgICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYWlyc1xuICAgICAqIEBwYXJhbSB7Y29sbGlzaW9uW119IGNvbGxpc2lvbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wXG4gICAgICovXG4gICAgUGFpcnMudXBkYXRlID0gZnVuY3Rpb24ocGFpcnMsIGNvbGxpc2lvbnMsIHRpbWVzdGFtcCkge1xuICAgICAgICB2YXIgcGFpcnNMaXN0ID0gcGFpcnMubGlzdCxcbiAgICAgICAgICAgIHBhaXJzVGFibGUgPSBwYWlycy50YWJsZSxcbiAgICAgICAgICAgIGNvbGxpc2lvblN0YXJ0ID0gcGFpcnMuY29sbGlzaW9uU3RhcnQsXG4gICAgICAgICAgICBjb2xsaXNpb25FbmQgPSBwYWlycy5jb2xsaXNpb25FbmQsXG4gICAgICAgICAgICBjb2xsaXNpb25BY3RpdmUgPSBwYWlycy5jb2xsaXNpb25BY3RpdmUsXG4gICAgICAgICAgICBhY3RpdmVQYWlySWRzID0gW10sXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBwYWlySWQsXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgaTtcblxuICAgICAgICAvLyBjbGVhciBjb2xsaXNpb24gc3RhdGUgYXJyYXlzLCBidXQgbWFpbnRhaW4gb2xkIHJlZmVyZW5jZVxuICAgICAgICBjb2xsaXNpb25TdGFydC5sZW5ndGggPSAwO1xuICAgICAgICBjb2xsaXNpb25FbmQubGVuZ3RoID0gMDtcbiAgICAgICAgY29sbGlzaW9uQWN0aXZlLmxlbmd0aCA9IDA7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbGxpc2lvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IGNvbGxpc2lvbnNbaV07XG5cbiAgICAgICAgICAgIGlmIChjb2xsaXNpb24uY29sbGlkZWQpIHtcbiAgICAgICAgICAgICAgICBwYWlySWQgPSBQYWlyLmlkKGNvbGxpc2lvbi5ib2R5QSwgY29sbGlzaW9uLmJvZHlCKTtcbiAgICAgICAgICAgICAgICBhY3RpdmVQYWlySWRzLnB1c2gocGFpcklkKTtcblxuICAgICAgICAgICAgICAgIHBhaXIgPSBwYWlyc1RhYmxlW3BhaXJJZF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHBhaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFpciBhbHJlYWR5IGV4aXN0cyAoYnV0IG1heSBvciBtYXkgbm90IGJlIGFjdGl2ZSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhaXIuaXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHBhaXIgZXhpc3RzIGFuZCBpcyBhY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvbkFjdGl2ZS5wdXNoKHBhaXIpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGFpciBleGlzdHMgYnV0IHdhcyBpbmFjdGl2ZSwgc28gYSBjb2xsaXNpb24gaGFzIGp1c3Qgc3RhcnRlZCBhZ2FpblxuICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uU3RhcnQucHVzaChwYWlyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgcGFpclxuICAgICAgICAgICAgICAgICAgICBQYWlyLnVwZGF0ZShwYWlyLCBjb2xsaXNpb24sIHRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFpciBkaWQgbm90IGV4aXN0LCBjcmVhdGUgYSBuZXcgcGFpclxuICAgICAgICAgICAgICAgICAgICBwYWlyID0gUGFpci5jcmVhdGUoY29sbGlzaW9uLCB0aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgICAgICBwYWlyc1RhYmxlW3BhaXJJZF0gPSBwYWlyO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHB1c2ggdGhlIG5ldyBwYWlyXG4gICAgICAgICAgICAgICAgICAgIGNvbGxpc2lvblN0YXJ0LnB1c2gocGFpcik7XG4gICAgICAgICAgICAgICAgICAgIHBhaXJzTGlzdC5wdXNoKHBhaXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRlYWN0aXZhdGUgcHJldmlvdXNseSBhY3RpdmUgcGFpcnMgdGhhdCBhcmUgbm93IGluYWN0aXZlXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYWlyc0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc0xpc3RbaV07XG4gICAgICAgICAgICBpZiAocGFpci5pc0FjdGl2ZSAmJiBDb21tb24uaW5kZXhPZihhY3RpdmVQYWlySWRzLCBwYWlyLmlkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICBQYWlyLnNldEFjdGl2ZShwYWlyLCBmYWxzZSwgdGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICBjb2xsaXNpb25FbmQucHVzaChwYWlyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRmluZHMgYW5kIHJlbW92ZXMgcGFpcnMgdGhhdCBoYXZlIGJlZW4gaW5hY3RpdmUgZm9yIGEgc2V0IGFtb3VudCBvZiB0aW1lLlxuICAgICAqIEBtZXRob2QgcmVtb3ZlT2xkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhaXJzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcFxuICAgICAqL1xuICAgIFBhaXJzLnJlbW92ZU9sZCA9IGZ1bmN0aW9uKHBhaXJzLCB0aW1lc3RhbXApIHtcbiAgICAgICAgdmFyIHBhaXJzTGlzdCA9IHBhaXJzLmxpc3QsXG4gICAgICAgICAgICBwYWlyc1RhYmxlID0gcGFpcnMudGFibGUsXG4gICAgICAgICAgICBpbmRleGVzVG9SZW1vdmUgPSBbXSxcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBwYWlySW5kZXgsXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYWlyc0xpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc0xpc3RbaV07XG4gICAgICAgICAgICBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gbmV2ZXIgcmVtb3ZlIHNsZWVwaW5nIHBhaXJzXG4gICAgICAgICAgICBpZiAoY29sbGlzaW9uLmJvZHlBLmlzU2xlZXBpbmcgfHwgY29sbGlzaW9uLmJvZHlCLmlzU2xlZXBpbmcpIHtcbiAgICAgICAgICAgICAgICBwYWlyLnRpbWVVcGRhdGVkID0gdGltZXN0YW1wO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpZiBwYWlyIGlzIGluYWN0aXZlIGZvciB0b28gbG9uZywgbWFyayBpdCB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICBpZiAodGltZXN0YW1wIC0gcGFpci50aW1lVXBkYXRlZCA+IF9wYWlyTWF4SWRsZUxpZmUpIHtcbiAgICAgICAgICAgICAgICBpbmRleGVzVG9SZW1vdmUucHVzaChpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBtYXJrZWQgcGFpcnNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGluZGV4ZXNUb1JlbW92ZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGFpckluZGV4ID0gaW5kZXhlc1RvUmVtb3ZlW2ldIC0gaTtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc0xpc3RbcGFpckluZGV4XTtcbiAgICAgICAgICAgIGRlbGV0ZSBwYWlyc1RhYmxlW3BhaXIuaWRdO1xuICAgICAgICAgICAgcGFpcnNMaXN0LnNwbGljZShwYWlySW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgZ2l2ZW4gcGFpcnMgc3RydWN0dXJlLlxuICAgICAqIEBtZXRob2QgY2xlYXJcbiAgICAgKiBAcGFyYW0ge3BhaXJzfSBwYWlyc1xuICAgICAqIEByZXR1cm4ge3BhaXJzfSBwYWlyc1xuICAgICAqL1xuICAgIFBhaXJzLmNsZWFyID0gZnVuY3Rpb24ocGFpcnMpIHtcbiAgICAgICAgcGFpcnMudGFibGUgPSB7fTtcbiAgICAgICAgcGFpcnMubGlzdC5sZW5ndGggPSAwO1xuICAgICAgICBwYWlycy5jb2xsaXNpb25TdGFydC5sZW5ndGggPSAwO1xuICAgICAgICBwYWlycy5jb2xsaXNpb25BY3RpdmUubGVuZ3RoID0gMDtcbiAgICAgICAgcGFpcnMuY29sbGlzaW9uRW5kLmxlbmd0aCA9IDA7XG4gICAgICAgIHJldHVybiBwYWlycztcbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlF1ZXJ5YCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgcGVyZm9ybWluZyBjb2xsaXNpb24gcXVlcmllcy5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIFF1ZXJ5XG4qL1xuXG52YXIgUXVlcnkgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVyeTtcblxudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xudmFyIFNBVCA9IHJlcXVpcmUoJy4vU0FUJyk7XG52YXIgQm91bmRzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQm91bmRzJyk7XG52YXIgQm9kaWVzID0gcmVxdWlyZSgnLi4vZmFjdG9yeS9Cb2RpZXMnKTtcbnZhciBWZXJ0aWNlcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlcnRpY2VzJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENhc3RzIGEgcmF5IHNlZ21lbnQgYWdhaW5zdCBhIHNldCBvZiBib2RpZXMgYW5kIHJldHVybnMgYWxsIGNvbGxpc2lvbnMsIHJheSB3aWR0aCBpcyBvcHRpb25hbC4gSW50ZXJzZWN0aW9uIHBvaW50cyBhcmUgbm90IHByb3ZpZGVkLlxuICAgICAqIEBtZXRob2QgcmF5XG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBzdGFydFBvaW50XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IGVuZFBvaW50XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtyYXlXaWR0aF1cbiAgICAgKiBAcmV0dXJuIHtvYmplY3RbXX0gQ29sbGlzaW9uc1xuICAgICAqL1xuICAgIFF1ZXJ5LnJheSA9IGZ1bmN0aW9uKGJvZGllcywgc3RhcnRQb2ludCwgZW5kUG9pbnQsIHJheVdpZHRoKSB7XG4gICAgICAgIHJheVdpZHRoID0gcmF5V2lkdGggfHwgMWUtMTAwO1xuXG4gICAgICAgIHZhciByYXlBbmdsZSA9IFZlY3Rvci5hbmdsZShzdGFydFBvaW50LCBlbmRQb2ludCksXG4gICAgICAgICAgICByYXlMZW5ndGggPSBWZWN0b3IubWFnbml0dWRlKFZlY3Rvci5zdWIoc3RhcnRQb2ludCwgZW5kUG9pbnQpKSxcbiAgICAgICAgICAgIHJheVggPSAoZW5kUG9pbnQueCArIHN0YXJ0UG9pbnQueCkgKiAwLjUsXG4gICAgICAgICAgICByYXlZID0gKGVuZFBvaW50LnkgKyBzdGFydFBvaW50LnkpICogMC41LFxuICAgICAgICAgICAgcmF5ID0gQm9kaWVzLnJlY3RhbmdsZShyYXlYLCByYXlZLCByYXlMZW5ndGgsIHJheVdpZHRoLCB7IGFuZ2xlOiByYXlBbmdsZSB9KSxcbiAgICAgICAgICAgIGNvbGxpc2lvbnMgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHlBID0gYm9kaWVzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoQm91bmRzLm92ZXJsYXBzKGJvZHlBLmJvdW5kcywgcmF5LmJvdW5kcykpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gYm9keUEucGFydHMubGVuZ3RoID09PSAxID8gMCA6IDE7IGogPCBib2R5QS5wYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFydCA9IGJvZHlBLnBhcnRzW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChCb3VuZHMub3ZlcmxhcHMocGFydC5ib3VuZHMsIHJheS5ib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sbGlzaW9uID0gU0FULmNvbGxpZGVzKHBhcnQsIHJheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sbGlzaW9uLmNvbGxpZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sbGlzaW9uLmJvZHkgPSBjb2xsaXNpb24uYm9keUEgPSBjb2xsaXNpb24uYm9keUIgPSBib2R5QTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsaXNpb25zLnB1c2goY29sbGlzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb2xsaXNpb25zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFsbCBib2RpZXMgd2hvc2UgYm91bmRzIGFyZSBpbnNpZGUgKG9yIG91dHNpZGUgaWYgc2V0KSB0aGUgZ2l2ZW4gc2V0IG9mIGJvdW5kcywgZnJvbSB0aGUgZ2l2ZW4gc2V0IG9mIGJvZGllcy5cbiAgICAgKiBAbWV0aG9kIHJlZ2lvblxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gYm91bmRzXG4gICAgICogQHBhcmFtIHtib29sfSBbb3V0c2lkZT1mYWxzZV1cbiAgICAgKiBAcmV0dXJuIHtib2R5W119IFRoZSBib2RpZXMgbWF0Y2hpbmcgdGhlIHF1ZXJ5XG4gICAgICovXG4gICAgUXVlcnkucmVnaW9uID0gZnVuY3Rpb24oYm9kaWVzLCBib3VuZHMsIG91dHNpZGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXSxcbiAgICAgICAgICAgICAgICBvdmVybGFwcyA9IEJvdW5kcy5vdmVybGFwcyhib2R5LmJvdW5kcywgYm91bmRzKTtcbiAgICAgICAgICAgIGlmICgob3ZlcmxhcHMgJiYgIW91dHNpZGUpIHx8ICghb3ZlcmxhcHMgJiYgb3V0c2lkZSkpXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goYm9keSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGFsbCBib2RpZXMgd2hvc2UgdmVydGljZXMgY29udGFpbiB0aGUgZ2l2ZW4gcG9pbnQsIGZyb20gdGhlIGdpdmVuIHNldCBvZiBib2RpZXMuXG4gICAgICogQG1ldGhvZCBwb2ludFxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcmV0dXJuIHtib2R5W119IFRoZSBib2RpZXMgbWF0Y2hpbmcgdGhlIHF1ZXJ5XG4gICAgICovXG4gICAgUXVlcnkucG9pbnQgPSBmdW5jdGlvbihib2RpZXMsIHBvaW50KSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChCb3VuZHMuY29udGFpbnMoYm9keS5ib3VuZHMsIHBvaW50KSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSBib2R5LnBhcnRzLmxlbmd0aCA9PT0gMSA/IDAgOiAxOyBqIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFydCA9IGJvZHkucGFydHNbal07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKEJvdW5kcy5jb250YWlucyhwYXJ0LmJvdW5kcywgcG9pbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiBWZXJ0aWNlcy5jb250YWlucyhwYXJ0LnZlcnRpY2VzLCBwb2ludCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuUmVzb2x2ZXJgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciByZXNvbHZpbmcgY29sbGlzaW9uIHBhaXJzLlxuKlxuKiBAY2xhc3MgUmVzb2x2ZXJcbiovXG5cbnZhciBSZXNvbHZlciA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc29sdmVyO1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG52YXIgQm91bmRzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQm91bmRzJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIFJlc29sdmVyLl9yZXN0aW5nVGhyZXNoID0gNDtcbiAgICBSZXNvbHZlci5fcmVzdGluZ1RocmVzaFRhbmdlbnQgPSA2O1xuICAgIFJlc29sdmVyLl9wb3NpdGlvbkRhbXBlbiA9IDAuOTtcbiAgICBSZXNvbHZlci5fcG9zaXRpb25XYXJtaW5nID0gMC44O1xuICAgIFJlc29sdmVyLl9mcmljdGlvbk5vcm1hbE11bHRpcGxpZXIgPSA1O1xuXG4gICAgLyoqXG4gICAgICogUHJlcGFyZSBwYWlycyBmb3IgcG9zaXRpb24gc29sdmluZy5cbiAgICAgKiBAbWV0aG9kIHByZVNvbHZlUG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge3BhaXJbXX0gcGFpcnNcbiAgICAgKi9cbiAgICBSZXNvbHZlci5wcmVTb2x2ZVBvc2l0aW9uID0gZnVuY3Rpb24ocGFpcnMpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgICBwYWlyLFxuICAgICAgICAgICAgYWN0aXZlQ291bnQ7XG5cbiAgICAgICAgLy8gZmluZCB0b3RhbCBjb250YWN0cyBvbiBlYWNoIGJvZHlcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYWN0aXZlQ291bnQgPSBwYWlyLmFjdGl2ZUNvbnRhY3RzLmxlbmd0aDtcbiAgICAgICAgICAgIHBhaXIuY29sbGlzaW9uLnBhcmVudEEudG90YWxDb250YWN0cyArPSBhY3RpdmVDb3VudDtcbiAgICAgICAgICAgIHBhaXIuY29sbGlzaW9uLnBhcmVudEIudG90YWxDb250YWN0cyArPSBhY3RpdmVDb3VudDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBGaW5kIGEgc29sdXRpb24gZm9yIHBhaXIgcG9zaXRpb25zLlxuICAgICAqIEBtZXRob2Qgc29sdmVQb3NpdGlvblxuICAgICAqIEBwYXJhbSB7cGFpcltdfSBwYWlyc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lU2NhbGVcbiAgICAgKi9cbiAgICBSZXNvbHZlci5zb2x2ZVBvc2l0aW9uID0gZnVuY3Rpb24ocGFpcnMsIHRpbWVTY2FsZSkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBib2R5QSxcbiAgICAgICAgICAgIGJvZHlCLFxuICAgICAgICAgICAgbm9ybWFsLFxuICAgICAgICAgICAgYm9keUJ0b0EsXG4gICAgICAgICAgICBjb250YWN0U2hhcmUsXG4gICAgICAgICAgICBwb3NpdGlvbkltcHVsc2UsXG4gICAgICAgICAgICBjb250YWN0Q291bnQgPSB7fSxcbiAgICAgICAgICAgIHRlbXBBID0gVmVjdG9yLl90ZW1wWzBdLFxuICAgICAgICAgICAgdGVtcEIgPSBWZWN0b3IuX3RlbXBbMV0sXG4gICAgICAgICAgICB0ZW1wQyA9IFZlY3Rvci5fdGVtcFsyXSxcbiAgICAgICAgICAgIHRlbXBEID0gVmVjdG9yLl90ZW1wWzNdO1xuXG4gICAgICAgIC8vIGZpbmQgaW1wdWxzZXMgcmVxdWlyZWQgdG8gcmVzb2x2ZSBwZW5ldHJhdGlvblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlIHx8IHBhaXIuaXNTZW5zb3IpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uO1xuICAgICAgICAgICAgYm9keUEgPSBjb2xsaXNpb24ucGFyZW50QTtcbiAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLnBhcmVudEI7XG4gICAgICAgICAgICBub3JtYWwgPSBjb2xsaXNpb24ubm9ybWFsO1xuXG4gICAgICAgICAgICAvLyBnZXQgY3VycmVudCBzZXBhcmF0aW9uIGJldHdlZW4gYm9keSBlZGdlcyBpbnZvbHZlZCBpbiBjb2xsaXNpb25cbiAgICAgICAgICAgIGJvZHlCdG9BID0gVmVjdG9yLnN1YihWZWN0b3IuYWRkKGJvZHlCLnBvc2l0aW9uSW1wdWxzZSwgYm9keUIucG9zaXRpb24sIHRlbXBBKSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBWZWN0b3IuYWRkKGJvZHlBLnBvc2l0aW9uSW1wdWxzZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVmVjdG9yLnN1Yihib2R5Qi5wb3NpdGlvbiwgY29sbGlzaW9uLnBlbmV0cmF0aW9uLCB0ZW1wQiksIHRlbXBDKSwgdGVtcEQpO1xuXG4gICAgICAgICAgICBwYWlyLnNlcGFyYXRpb24gPSBWZWN0b3IuZG90KG5vcm1hbCwgYm9keUJ0b0EpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlIHx8IHBhaXIuaXNTZW5zb3IgfHwgcGFpci5zZXBhcmF0aW9uIDwgMClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb247XG4gICAgICAgICAgICBib2R5QSA9IGNvbGxpc2lvbi5wYXJlbnRBO1xuICAgICAgICAgICAgYm9keUIgPSBjb2xsaXNpb24ucGFyZW50QjtcbiAgICAgICAgICAgIG5vcm1hbCA9IGNvbGxpc2lvbi5ub3JtYWw7XG4gICAgICAgICAgICBwb3NpdGlvbkltcHVsc2UgPSAocGFpci5zZXBhcmF0aW9uIC0gcGFpci5zbG9wKSAqIHRpbWVTY2FsZTtcblxuICAgICAgICAgICAgaWYgKGJvZHlBLmlzU3RhdGljIHx8IGJvZHlCLmlzU3RhdGljKVxuICAgICAgICAgICAgICAgIHBvc2l0aW9uSW1wdWxzZSAqPSAyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIShib2R5QS5pc1N0YXRpYyB8fCBib2R5QS5pc1NsZWVwaW5nKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhY3RTaGFyZSA9IFJlc29sdmVyLl9wb3NpdGlvbkRhbXBlbiAvIGJvZHlBLnRvdGFsQ29udGFjdHM7XG4gICAgICAgICAgICAgICAgYm9keUEucG9zaXRpb25JbXB1bHNlLnggKz0gbm9ybWFsLnggKiBwb3NpdGlvbkltcHVsc2UgKiBjb250YWN0U2hhcmU7XG4gICAgICAgICAgICAgICAgYm9keUEucG9zaXRpb25JbXB1bHNlLnkgKz0gbm9ybWFsLnkgKiBwb3NpdGlvbkltcHVsc2UgKiBjb250YWN0U2hhcmU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghKGJvZHlCLmlzU3RhdGljIHx8IGJvZHlCLmlzU2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAgICAgY29udGFjdFNoYXJlID0gUmVzb2x2ZXIuX3Bvc2l0aW9uRGFtcGVuIC8gYm9keUIudG90YWxDb250YWN0cztcbiAgICAgICAgICAgICAgICBib2R5Qi5wb3NpdGlvbkltcHVsc2UueCAtPSBub3JtYWwueCAqIHBvc2l0aW9uSW1wdWxzZSAqIGNvbnRhY3RTaGFyZTtcbiAgICAgICAgICAgICAgICBib2R5Qi5wb3NpdGlvbkltcHVsc2UueSAtPSBub3JtYWwueSAqIHBvc2l0aW9uSW1wdWxzZSAqIGNvbnRhY3RTaGFyZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBwb3NpdGlvbiByZXNvbHV0aW9uLlxuICAgICAqIEBtZXRob2QgcG9zdFNvbHZlUG9zaXRpb25cbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICovXG4gICAgUmVzb2x2ZXIucG9zdFNvbHZlUG9zaXRpb24gPSBmdW5jdGlvbihib2RpZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICAvLyByZXNldCBjb250YWN0IGNvdW50XG4gICAgICAgICAgICBib2R5LnRvdGFsQ29udGFjdHMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoYm9keS5wb3NpdGlvbkltcHVsc2UueCAhPT0gMCB8fCBib2R5LnBvc2l0aW9uSW1wdWxzZS55ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIGJvZHkgZ2VvbWV0cnlcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGJvZHkucGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2pdO1xuICAgICAgICAgICAgICAgICAgICBWZXJ0aWNlcy50cmFuc2xhdGUocGFydC52ZXJ0aWNlcywgYm9keS5wb3NpdGlvbkltcHVsc2UpO1xuICAgICAgICAgICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgcGFydC5wb3NpdGlvbi54ICs9IGJvZHkucG9zaXRpb25JbXB1bHNlLng7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQucG9zaXRpb24ueSArPSBib2R5LnBvc2l0aW9uSW1wdWxzZS55O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIG1vdmUgdGhlIGJvZHkgd2l0aG91dCBjaGFuZ2luZyB2ZWxvY2l0eVxuICAgICAgICAgICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnggKz0gYm9keS5wb3NpdGlvbkltcHVsc2UueDtcbiAgICAgICAgICAgICAgICBib2R5LnBvc2l0aW9uUHJldi55ICs9IGJvZHkucG9zaXRpb25JbXB1bHNlLnk7XG5cbiAgICAgICAgICAgICAgICBpZiAoVmVjdG9yLmRvdChib2R5LnBvc2l0aW9uSW1wdWxzZSwgYm9keS52ZWxvY2l0eSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlc2V0IGNhY2hlZCBpbXB1bHNlIGlmIHRoZSBib2R5IGhhcyB2ZWxvY2l0eSBhbG9uZyBpdFxuICAgICAgICAgICAgICAgICAgICBib2R5LnBvc2l0aW9uSW1wdWxzZS54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYm9keS5wb3NpdGlvbkltcHVsc2UueSA9IDA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2FybSB0aGUgbmV4dCBpdGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgYm9keS5wb3NpdGlvbkltcHVsc2UueCAqPSBSZXNvbHZlci5fcG9zaXRpb25XYXJtaW5nO1xuICAgICAgICAgICAgICAgICAgICBib2R5LnBvc2l0aW9uSW1wdWxzZS55ICo9IFJlc29sdmVyLl9wb3NpdGlvbldhcm1pbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgcGFpcnMgZm9yIHZlbG9jaXR5IHNvbHZpbmcuXG4gICAgICogQG1ldGhvZCBwcmVTb2x2ZVZlbG9jaXR5XG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICovXG4gICAgUmVzb2x2ZXIucHJlU29sdmVWZWxvY2l0eSA9IGZ1bmN0aW9uKHBhaXJzKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBjb250YWN0cyxcbiAgICAgICAgICAgIGNvbGxpc2lvbixcbiAgICAgICAgICAgIGJvZHlBLFxuICAgICAgICAgICAgYm9keUIsXG4gICAgICAgICAgICBub3JtYWwsXG4gICAgICAgICAgICB0YW5nZW50LFxuICAgICAgICAgICAgY29udGFjdCxcbiAgICAgICAgICAgIGNvbnRhY3RWZXJ0ZXgsXG4gICAgICAgICAgICBub3JtYWxJbXB1bHNlLFxuICAgICAgICAgICAgdGFuZ2VudEltcHVsc2UsXG4gICAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgICBpbXB1bHNlID0gVmVjdG9yLl90ZW1wWzBdLFxuICAgICAgICAgICAgdGVtcEEgPSBWZWN0b3IuX3RlbXBbMV07XG4gICAgICAgIFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlIHx8IHBhaXIuaXNTZW5zb3IpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRhY3RzID0gcGFpci5hY3RpdmVDb250YWN0cztcbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uO1xuICAgICAgICAgICAgYm9keUEgPSBjb2xsaXNpb24ucGFyZW50QTtcbiAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLnBhcmVudEI7XG4gICAgICAgICAgICBub3JtYWwgPSBjb2xsaXNpb24ubm9ybWFsO1xuICAgICAgICAgICAgdGFuZ2VudCA9IGNvbGxpc2lvbi50YW5nZW50O1xuXG4gICAgICAgICAgICAvLyByZXNvbHZlIGVhY2ggY29udGFjdFxuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGNvbnRhY3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgY29udGFjdCA9IGNvbnRhY3RzW2pdO1xuICAgICAgICAgICAgICAgIGNvbnRhY3RWZXJ0ZXggPSBjb250YWN0LnZlcnRleDtcbiAgICAgICAgICAgICAgICBub3JtYWxJbXB1bHNlID0gY29udGFjdC5ub3JtYWxJbXB1bHNlO1xuICAgICAgICAgICAgICAgIHRhbmdlbnRJbXB1bHNlID0gY29udGFjdC50YW5nZW50SW1wdWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChub3JtYWxJbXB1bHNlICE9PSAwIHx8IHRhbmdlbnRJbXB1bHNlICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRvdGFsIGltcHVsc2UgZnJvbSBjb250YWN0XG4gICAgICAgICAgICAgICAgICAgIGltcHVsc2UueCA9IChub3JtYWwueCAqIG5vcm1hbEltcHVsc2UpICsgKHRhbmdlbnQueCAqIHRhbmdlbnRJbXB1bHNlKTtcbiAgICAgICAgICAgICAgICAgICAgaW1wdWxzZS55ID0gKG5vcm1hbC55ICogbm9ybWFsSW1wdWxzZSkgKyAodGFuZ2VudC55ICogdGFuZ2VudEltcHVsc2UpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwbHkgaW1wdWxzZSBmcm9tIGNvbnRhY3RcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoYm9keUEuaXNTdGF0aWMgfHwgYm9keUEuaXNTbGVlcGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IFZlY3Rvci5zdWIoY29udGFjdFZlcnRleCwgYm9keUEucG9zaXRpb24sIHRlbXBBKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uUHJldi54ICs9IGltcHVsc2UueCAqIGJvZHlBLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUEucG9zaXRpb25QcmV2LnkgKz0gaW1wdWxzZS55ICogYm9keUEuaW52ZXJzZU1hc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5QS5hbmdsZVByZXYgKz0gVmVjdG9yLmNyb3NzKG9mZnNldCwgaW1wdWxzZSkgKiBib2R5QS5pbnZlcnNlSW5lcnRpYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghKGJvZHlCLmlzU3RhdGljIHx8IGJvZHlCLmlzU2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSBWZWN0b3Iuc3ViKGNvbnRhY3RWZXJ0ZXgsIGJvZHlCLnBvc2l0aW9uLCB0ZW1wQSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5Qi5wb3NpdGlvblByZXYueCAtPSBpbXB1bHNlLnggKiBib2R5Qi5pbnZlcnNlTWFzcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvZHlCLnBvc2l0aW9uUHJldi55IC09IGltcHVsc2UueSAqIGJvZHlCLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm9keUIuYW5nbGVQcmV2IC09IFZlY3Rvci5jcm9zcyhvZmZzZXQsIGltcHVsc2UpICogYm9keUIuaW52ZXJzZUluZXJ0aWE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmluZCBhIHNvbHV0aW9uIGZvciBwYWlyIHZlbG9jaXRpZXMuXG4gICAgICogQG1ldGhvZCBzb2x2ZVZlbG9jaXR5XG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqL1xuICAgIFJlc29sdmVyLnNvbHZlVmVsb2NpdHkgPSBmdW5jdGlvbihwYWlycywgdGltZVNjYWxlKSB7XG4gICAgICAgIHZhciB0aW1lU2NhbGVTcXVhcmVkID0gdGltZVNjYWxlICogdGltZVNjYWxlLFxuICAgICAgICAgICAgaW1wdWxzZSA9IFZlY3Rvci5fdGVtcFswXSxcbiAgICAgICAgICAgIHRlbXBBID0gVmVjdG9yLl90ZW1wWzFdLFxuICAgICAgICAgICAgdGVtcEIgPSBWZWN0b3IuX3RlbXBbMl0sXG4gICAgICAgICAgICB0ZW1wQyA9IFZlY3Rvci5fdGVtcFszXSxcbiAgICAgICAgICAgIHRlbXBEID0gVmVjdG9yLl90ZW1wWzRdLFxuICAgICAgICAgICAgdGVtcEUgPSBWZWN0b3IuX3RlbXBbNV07XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXBhaXIuaXNBY3RpdmUgfHwgcGFpci5pc1NlbnNvcilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbGxpc2lvbiA9IHBhaXIuY29sbGlzaW9uLFxuICAgICAgICAgICAgICAgIGJvZHlBID0gY29sbGlzaW9uLnBhcmVudEEsXG4gICAgICAgICAgICAgICAgYm9keUIgPSBjb2xsaXNpb24ucGFyZW50QixcbiAgICAgICAgICAgICAgICBub3JtYWwgPSBjb2xsaXNpb24ubm9ybWFsLFxuICAgICAgICAgICAgICAgIHRhbmdlbnQgPSBjb2xsaXNpb24udGFuZ2VudCxcbiAgICAgICAgICAgICAgICBjb250YWN0cyA9IHBhaXIuYWN0aXZlQ29udGFjdHMsXG4gICAgICAgICAgICAgICAgY29udGFjdFNoYXJlID0gMSAvIGNvbnRhY3RzLmxlbmd0aDtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIGJvZHkgdmVsb2NpdGllc1xuICAgICAgICAgICAgYm9keUEudmVsb2NpdHkueCA9IGJvZHlBLnBvc2l0aW9uLnggLSBib2R5QS5wb3NpdGlvblByZXYueDtcbiAgICAgICAgICAgIGJvZHlBLnZlbG9jaXR5LnkgPSBib2R5QS5wb3NpdGlvbi55IC0gYm9keUEucG9zaXRpb25QcmV2Lnk7XG4gICAgICAgICAgICBib2R5Qi52ZWxvY2l0eS54ID0gYm9keUIucG9zaXRpb24ueCAtIGJvZHlCLnBvc2l0aW9uUHJldi54O1xuICAgICAgICAgICAgYm9keUIudmVsb2NpdHkueSA9IGJvZHlCLnBvc2l0aW9uLnkgLSBib2R5Qi5wb3NpdGlvblByZXYueTtcbiAgICAgICAgICAgIGJvZHlBLmFuZ3VsYXJWZWxvY2l0eSA9IGJvZHlBLmFuZ2xlIC0gYm9keUEuYW5nbGVQcmV2O1xuICAgICAgICAgICAgYm9keUIuYW5ndWxhclZlbG9jaXR5ID0gYm9keUIuYW5nbGUgLSBib2R5Qi5hbmdsZVByZXY7XG5cbiAgICAgICAgICAgIC8vIHJlc29sdmUgZWFjaCBjb250YWN0XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvbnRhY3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRhY3QgPSBjb250YWN0c1tqXSxcbiAgICAgICAgICAgICAgICAgICAgY29udGFjdFZlcnRleCA9IGNvbnRhY3QudmVydGV4LFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXRBID0gVmVjdG9yLnN1Yihjb250YWN0VmVydGV4LCBib2R5QS5wb3NpdGlvbiwgdGVtcEEpLFxuICAgICAgICAgICAgICAgICAgICBvZmZzZXRCID0gVmVjdG9yLnN1Yihjb250YWN0VmVydGV4LCBib2R5Qi5wb3NpdGlvbiwgdGVtcEIpLFxuICAgICAgICAgICAgICAgICAgICB2ZWxvY2l0eVBvaW50QSA9IFZlY3Rvci5hZGQoYm9keUEudmVsb2NpdHksIFZlY3Rvci5tdWx0KFZlY3Rvci5wZXJwKG9mZnNldEEpLCBib2R5QS5hbmd1bGFyVmVsb2NpdHkpLCB0ZW1wQyksXG4gICAgICAgICAgICAgICAgICAgIHZlbG9jaXR5UG9pbnRCID0gVmVjdG9yLmFkZChib2R5Qi52ZWxvY2l0eSwgVmVjdG9yLm11bHQoVmVjdG9yLnBlcnAob2Zmc2V0QiksIGJvZHlCLmFuZ3VsYXJWZWxvY2l0eSksIHRlbXBEKSwgXG4gICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlVmVsb2NpdHkgPSBWZWN0b3Iuc3ViKHZlbG9jaXR5UG9pbnRBLCB2ZWxvY2l0eVBvaW50QiwgdGVtcEUpLFxuICAgICAgICAgICAgICAgICAgICBub3JtYWxWZWxvY2l0eSA9IFZlY3Rvci5kb3Qobm9ybWFsLCByZWxhdGl2ZVZlbG9jaXR5KTtcblxuICAgICAgICAgICAgICAgIHZhciB0YW5nZW50VmVsb2NpdHkgPSBWZWN0b3IuZG90KHRhbmdlbnQsIHJlbGF0aXZlVmVsb2NpdHkpLFxuICAgICAgICAgICAgICAgICAgICB0YW5nZW50U3BlZWQgPSBNYXRoLmFicyh0YW5nZW50VmVsb2NpdHkpLFxuICAgICAgICAgICAgICAgICAgICB0YW5nZW50VmVsb2NpdHlEaXJlY3Rpb24gPSBDb21tb24uc2lnbih0YW5nZW50VmVsb2NpdHkpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmF3IGltcHVsc2VzXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbEltcHVsc2UgPSAoMSArIHBhaXIucmVzdGl0dXRpb24pICogbm9ybWFsVmVsb2NpdHksXG4gICAgICAgICAgICAgICAgICAgIG5vcm1hbEZvcmNlID0gQ29tbW9uLmNsYW1wKHBhaXIuc2VwYXJhdGlvbiArIG5vcm1hbFZlbG9jaXR5LCAwLCAxKSAqIFJlc29sdmVyLl9mcmljdGlvbk5vcm1hbE11bHRpcGxpZXI7XG5cbiAgICAgICAgICAgICAgICAvLyBjb3Vsb21iIGZyaWN0aW9uXG4gICAgICAgICAgICAgICAgdmFyIHRhbmdlbnRJbXB1bHNlID0gdGFuZ2VudFZlbG9jaXR5LFxuICAgICAgICAgICAgICAgICAgICBtYXhGcmljdGlvbiA9IEluZmluaXR5O1xuXG4gICAgICAgICAgICAgICAgaWYgKHRhbmdlbnRTcGVlZCA+IHBhaXIuZnJpY3Rpb24gKiBwYWlyLmZyaWN0aW9uU3RhdGljICogbm9ybWFsRm9yY2UgKiB0aW1lU2NhbGVTcXVhcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heEZyaWN0aW9uID0gdGFuZ2VudFNwZWVkO1xuICAgICAgICAgICAgICAgICAgICB0YW5nZW50SW1wdWxzZSA9IENvbW1vbi5jbGFtcChcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhaXIuZnJpY3Rpb24gKiB0YW5nZW50VmVsb2NpdHlEaXJlY3Rpb24gKiB0aW1lU2NhbGVTcXVhcmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgLW1heEZyaWN0aW9uLCBtYXhGcmljdGlvblxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIG1vZGlmeSBpbXB1bHNlcyBhY2NvdW50aW5nIGZvciBtYXNzLCBpbmVydGlhIGFuZCBvZmZzZXRcbiAgICAgICAgICAgICAgICB2YXIgb0FjTiA9IFZlY3Rvci5jcm9zcyhvZmZzZXRBLCBub3JtYWwpLFxuICAgICAgICAgICAgICAgICAgICBvQmNOID0gVmVjdG9yLmNyb3NzKG9mZnNldEIsIG5vcm1hbCksXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlID0gY29udGFjdFNoYXJlIC8gKGJvZHlBLmludmVyc2VNYXNzICsgYm9keUIuaW52ZXJzZU1hc3MgKyBib2R5QS5pbnZlcnNlSW5lcnRpYSAqIG9BY04gKiBvQWNOICArIGJvZHlCLmludmVyc2VJbmVydGlhICogb0JjTiAqIG9CY04pO1xuXG4gICAgICAgICAgICAgICAgbm9ybWFsSW1wdWxzZSAqPSBzaGFyZTtcbiAgICAgICAgICAgICAgICB0YW5nZW50SW1wdWxzZSAqPSBzaGFyZTtcblxuICAgICAgICAgICAgICAgIC8vIGhhbmRsZSBoaWdoIHZlbG9jaXR5IGFuZCByZXN0aW5nIGNvbGxpc2lvbnMgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgIGlmIChub3JtYWxWZWxvY2l0eSA8IDAgJiYgbm9ybWFsVmVsb2NpdHkgKiBub3JtYWxWZWxvY2l0eSA+IFJlc29sdmVyLl9yZXN0aW5nVGhyZXNoICogdGltZVNjYWxlU3F1YXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBoaWdoIG5vcm1hbCB2ZWxvY2l0eSBzbyBjbGVhciBjYWNoZWQgY29udGFjdCBub3JtYWwgaW1wdWxzZVxuICAgICAgICAgICAgICAgICAgICBjb250YWN0Lm5vcm1hbEltcHVsc2UgPSAwO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNvbHZlIHJlc3RpbmcgY29sbGlzaW9uIGNvbnN0cmFpbnRzIHVzaW5nIEVyaW4gQ2F0dG8ncyBtZXRob2QgKEdEQzA4KVxuICAgICAgICAgICAgICAgICAgICAvLyBpbXB1bHNlIGNvbnN0cmFpbnQgdGVuZHMgdG8gMFxuICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFjdE5vcm1hbEltcHVsc2UgPSBjb250YWN0Lm5vcm1hbEltcHVsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhY3Qubm9ybWFsSW1wdWxzZSA9IE1hdGgubWluKGNvbnRhY3Qubm9ybWFsSW1wdWxzZSArIG5vcm1hbEltcHVsc2UsIDApO1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxJbXB1bHNlID0gY29udGFjdC5ub3JtYWxJbXB1bHNlIC0gY29udGFjdE5vcm1hbEltcHVsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gaGFuZGxlIGhpZ2ggdmVsb2NpdHkgYW5kIHJlc3RpbmcgY29sbGlzaW9ucyBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgaWYgKHRhbmdlbnRWZWxvY2l0eSAqIHRhbmdlbnRWZWxvY2l0eSA+IFJlc29sdmVyLl9yZXN0aW5nVGhyZXNoVGFuZ2VudCAqIHRpbWVTY2FsZVNxdWFyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaGlnaCB0YW5nZW50IHZlbG9jaXR5IHNvIGNsZWFyIGNhY2hlZCBjb250YWN0IHRhbmdlbnQgaW1wdWxzZVxuICAgICAgICAgICAgICAgICAgICBjb250YWN0LnRhbmdlbnRJbXB1bHNlID0gMDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBzb2x2ZSByZXN0aW5nIGNvbGxpc2lvbiBjb25zdHJhaW50cyB1c2luZyBFcmluIENhdHRvJ3MgbWV0aG9kIChHREMwOClcbiAgICAgICAgICAgICAgICAgICAgLy8gdGFuZ2VudCBpbXB1bHNlIHRlbmRzIHRvIC10YW5nZW50U3BlZWQgb3IgK3RhbmdlbnRTcGVlZFxuICAgICAgICAgICAgICAgICAgICB2YXIgY29udGFjdFRhbmdlbnRJbXB1bHNlID0gY29udGFjdC50YW5nZW50SW1wdWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29udGFjdC50YW5nZW50SW1wdWxzZSA9IENvbW1vbi5jbGFtcChjb250YWN0LnRhbmdlbnRJbXB1bHNlICsgdGFuZ2VudEltcHVsc2UsIC1tYXhGcmljdGlvbiwgbWF4RnJpY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICB0YW5nZW50SW1wdWxzZSA9IGNvbnRhY3QudGFuZ2VudEltcHVsc2UgLSBjb250YWN0VGFuZ2VudEltcHVsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gdG90YWwgaW1wdWxzZSBmcm9tIGNvbnRhY3RcbiAgICAgICAgICAgICAgICBpbXB1bHNlLnggPSAobm9ybWFsLnggKiBub3JtYWxJbXB1bHNlKSArICh0YW5nZW50LnggKiB0YW5nZW50SW1wdWxzZSk7XG4gICAgICAgICAgICAgICAgaW1wdWxzZS55ID0gKG5vcm1hbC55ICogbm9ybWFsSW1wdWxzZSkgKyAodGFuZ2VudC55ICogdGFuZ2VudEltcHVsc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGFwcGx5IGltcHVsc2UgZnJvbSBjb250YWN0XG4gICAgICAgICAgICAgICAgaWYgKCEoYm9keUEuaXNTdGF0aWMgfHwgYm9keUEuaXNTbGVlcGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgYm9keUEucG9zaXRpb25QcmV2LnggKz0gaW1wdWxzZS54ICogYm9keUEuaW52ZXJzZU1hc3M7XG4gICAgICAgICAgICAgICAgICAgIGJvZHlBLnBvc2l0aW9uUHJldi55ICs9IGltcHVsc2UueSAqIGJvZHlBLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICBib2R5QS5hbmdsZVByZXYgKz0gVmVjdG9yLmNyb3NzKG9mZnNldEEsIGltcHVsc2UpICogYm9keUEuaW52ZXJzZUluZXJ0aWE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCEoYm9keUIuaXNTdGF0aWMgfHwgYm9keUIuaXNTbGVlcGluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgYm9keUIucG9zaXRpb25QcmV2LnggLT0gaW1wdWxzZS54ICogYm9keUIuaW52ZXJzZU1hc3M7XG4gICAgICAgICAgICAgICAgICAgIGJvZHlCLnBvc2l0aW9uUHJldi55IC09IGltcHVsc2UueSAqIGJvZHlCLmludmVyc2VNYXNzO1xuICAgICAgICAgICAgICAgICAgICBib2R5Qi5hbmdsZVByZXYgLT0gVmVjdG9yLmNyb3NzKG9mZnNldEIsIGltcHVsc2UpICogYm9keUIuaW52ZXJzZUluZXJ0aWE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5TQVRgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBkZXRlY3RpbmcgY29sbGlzaW9ucyB1c2luZyB0aGUgU2VwYXJhdGluZyBBeGlzIFRoZW9yZW0uXG4qXG4qIEBjbGFzcyBTQVRcbiovXG5cbi8vIFRPRE86IHRydWUgY2lyY2xlcyBhbmQgY3VydmVzXG5cbnZhciBTQVQgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBTQVQ7XG5cbnZhciBWZXJ0aWNlcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlcnRpY2VzJyk7XG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVjdG9yJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIERldGVjdCBjb2xsaXNpb24gYmV0d2VlbiB0d28gYm9kaWVzIHVzaW5nIHRoZSBTZXBhcmF0aW5nIEF4aXMgVGhlb3JlbS5cbiAgICAgKiBAbWV0aG9kIGNvbGxpZGVzXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5QVxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keUJcbiAgICAgKiBAcGFyYW0ge2NvbGxpc2lvbn0gcHJldmlvdXNDb2xsaXNpb25cbiAgICAgKiBAcmV0dXJuIHtjb2xsaXNpb259IGNvbGxpc2lvblxuICAgICAqL1xuICAgIFNBVC5jb2xsaWRlcyA9IGZ1bmN0aW9uKGJvZHlBLCBib2R5QiwgcHJldmlvdXNDb2xsaXNpb24pIHtcbiAgICAgICAgdmFyIG92ZXJsYXBBQixcbiAgICAgICAgICAgIG92ZXJsYXBCQSwgXG4gICAgICAgICAgICBtaW5PdmVybGFwLFxuICAgICAgICAgICAgY29sbGlzaW9uLFxuICAgICAgICAgICAgcHJldkNvbCA9IHByZXZpb3VzQ29sbGlzaW9uLFxuICAgICAgICAgICAgY2FuUmV1c2VQcmV2Q29sID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHByZXZDb2wpIHtcbiAgICAgICAgICAgIC8vIGVzdGltYXRlIHRvdGFsIG1vdGlvblxuICAgICAgICAgICAgdmFyIHBhcmVudEEgPSBib2R5QS5wYXJlbnQsXG4gICAgICAgICAgICAgICAgcGFyZW50QiA9IGJvZHlCLnBhcmVudCxcbiAgICAgICAgICAgICAgICBtb3Rpb24gPSBwYXJlbnRBLnNwZWVkICogcGFyZW50QS5zcGVlZCArIHBhcmVudEEuYW5ndWxhclNwZWVkICogcGFyZW50QS5hbmd1bGFyU3BlZWRcbiAgICAgICAgICAgICAgICAgICAgICAgKyBwYXJlbnRCLnNwZWVkICogcGFyZW50Qi5zcGVlZCArIHBhcmVudEIuYW5ndWxhclNwZWVkICogcGFyZW50Qi5hbmd1bGFyU3BlZWQ7XG5cbiAgICAgICAgICAgIC8vIHdlIG1heSBiZSBhYmxlIHRvIChwYXJ0aWFsbHkpIHJldXNlIGNvbGxpc2lvbiByZXN1bHQgXG4gICAgICAgICAgICAvLyBidXQgb25seSBzYWZlIGlmIGNvbGxpc2lvbiB3YXMgcmVzdGluZ1xuICAgICAgICAgICAgY2FuUmV1c2VQcmV2Q29sID0gcHJldkNvbCAmJiBwcmV2Q29sLmNvbGxpZGVkICYmIG1vdGlvbiA8IDAuMjtcblxuICAgICAgICAgICAgLy8gcmV1c2UgY29sbGlzaW9uIG9iamVjdFxuICAgICAgICAgICAgY29sbGlzaW9uID0gcHJldkNvbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbGxpc2lvbiA9IHsgY29sbGlkZWQ6IGZhbHNlLCBib2R5QTogYm9keUEsIGJvZHlCOiBib2R5QiB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZXZDb2wgJiYgY2FuUmV1c2VQcmV2Q29sKSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBjYW4gcmV1c2UgdGhlIGNvbGxpc2lvbiByZXN1bHRcbiAgICAgICAgICAgIC8vIHdlIG9ubHkgbmVlZCB0byB0ZXN0IHRoZSBwcmV2aW91c2x5IGZvdW5kIGF4aXNcbiAgICAgICAgICAgIHZhciBheGlzQm9keUEgPSBjb2xsaXNpb24uYXhpc0JvZHksXG4gICAgICAgICAgICAgICAgYXhpc0JvZHlCID0gYXhpc0JvZHlBID09PSBib2R5QSA/IGJvZHlCIDogYm9keUEsXG4gICAgICAgICAgICAgICAgYXhlcyA9IFtheGlzQm9keUEuYXhlc1twcmV2Q29sLmF4aXNOdW1iZXJdXTtcblxuICAgICAgICAgICAgbWluT3ZlcmxhcCA9IF9vdmVybGFwQXhlcyhheGlzQm9keUEudmVydGljZXMsIGF4aXNCb2R5Qi52ZXJ0aWNlcywgYXhlcyk7XG4gICAgICAgICAgICBjb2xsaXNpb24ucmV1c2VkID0gdHJ1ZTtcblxuICAgICAgICAgICAgaWYgKG1pbk92ZXJsYXAub3ZlcmxhcCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uLmNvbGxpZGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbGxpc2lvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGNhbid0IHJldXNlIGEgcmVzdWx0LCBwZXJmb3JtIGEgZnVsbCBTQVQgdGVzdFxuXG4gICAgICAgICAgICBvdmVybGFwQUIgPSBfb3ZlcmxhcEF4ZXMoYm9keUEudmVydGljZXMsIGJvZHlCLnZlcnRpY2VzLCBib2R5QS5heGVzKTtcblxuICAgICAgICAgICAgaWYgKG92ZXJsYXBBQi5vdmVybGFwIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjb2xsaXNpb24uY29sbGlkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sbGlzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvdmVybGFwQkEgPSBfb3ZlcmxhcEF4ZXMoYm9keUIudmVydGljZXMsIGJvZHlBLnZlcnRpY2VzLCBib2R5Qi5heGVzKTtcblxuICAgICAgICAgICAgaWYgKG92ZXJsYXBCQS5vdmVybGFwIDw9IDApIHtcbiAgICAgICAgICAgICAgICBjb2xsaXNpb24uY29sbGlkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sbGlzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3ZlcmxhcEFCLm92ZXJsYXAgPCBvdmVybGFwQkEub3ZlcmxhcCkge1xuICAgICAgICAgICAgICAgIG1pbk92ZXJsYXAgPSBvdmVybGFwQUI7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uLmF4aXNCb2R5ID0gYm9keUE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pbk92ZXJsYXAgPSBvdmVybGFwQkE7XG4gICAgICAgICAgICAgICAgY29sbGlzaW9uLmF4aXNCb2R5ID0gYm9keUI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGltcG9ydGFudCBmb3IgcmV1c2UgbGF0ZXJcbiAgICAgICAgICAgIGNvbGxpc2lvbi5heGlzTnVtYmVyID0gbWluT3ZlcmxhcC5heGlzTnVtYmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgY29sbGlzaW9uLmJvZHlBID0gYm9keUEuaWQgPCBib2R5Qi5pZCA/IGJvZHlBIDogYm9keUI7XG4gICAgICAgIGNvbGxpc2lvbi5ib2R5QiA9IGJvZHlBLmlkIDwgYm9keUIuaWQgPyBib2R5QiA6IGJvZHlBO1xuICAgICAgICBjb2xsaXNpb24uY29sbGlkZWQgPSB0cnVlO1xuICAgICAgICBjb2xsaXNpb24ubm9ybWFsID0gbWluT3ZlcmxhcC5heGlzO1xuICAgICAgICBjb2xsaXNpb24uZGVwdGggPSBtaW5PdmVybGFwLm92ZXJsYXA7XG4gICAgICAgIGNvbGxpc2lvbi5wYXJlbnRBID0gY29sbGlzaW9uLmJvZHlBLnBhcmVudDtcbiAgICAgICAgY29sbGlzaW9uLnBhcmVudEIgPSBjb2xsaXNpb24uYm9keUIucGFyZW50O1xuICAgICAgICBcbiAgICAgICAgYm9keUEgPSBjb2xsaXNpb24uYm9keUE7XG4gICAgICAgIGJvZHlCID0gY29sbGlzaW9uLmJvZHlCO1xuXG4gICAgICAgIC8vIGVuc3VyZSBub3JtYWwgaXMgZmFjaW5nIGF3YXkgZnJvbSBib2R5QVxuICAgICAgICBpZiAoVmVjdG9yLmRvdChjb2xsaXNpb24ubm9ybWFsLCBWZWN0b3Iuc3ViKGJvZHlCLnBvc2l0aW9uLCBib2R5QS5wb3NpdGlvbikpID4gMCkgXG4gICAgICAgICAgICBjb2xsaXNpb24ubm9ybWFsID0gVmVjdG9yLm5lZyhjb2xsaXNpb24ubm9ybWFsKTtcblxuICAgICAgICBjb2xsaXNpb24udGFuZ2VudCA9IFZlY3Rvci5wZXJwKGNvbGxpc2lvbi5ub3JtYWwpO1xuXG4gICAgICAgIGNvbGxpc2lvbi5wZW5ldHJhdGlvbiA9IHsgXG4gICAgICAgICAgICB4OiBjb2xsaXNpb24ubm9ybWFsLnggKiBjb2xsaXNpb24uZGVwdGgsIFxuICAgICAgICAgICAgeTogY29sbGlzaW9uLm5vcm1hbC55ICogY29sbGlzaW9uLmRlcHRoIFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZpbmQgc3VwcG9ydCBwb2ludHMsIHRoZXJlIGlzIGFsd2F5cyBlaXRoZXIgZXhhY3RseSBvbmUgb3IgdHdvXG4gICAgICAgIHZhciB2ZXJ0aWNlc0IgPSBfZmluZFN1cHBvcnRzKGJvZHlBLCBib2R5QiwgY29sbGlzaW9uLm5vcm1hbCksXG4gICAgICAgICAgICBzdXBwb3J0cyA9IGNvbGxpc2lvbi5zdXBwb3J0cyB8fCBbXTtcbiAgICAgICAgc3VwcG9ydHMubGVuZ3RoID0gMDtcblxuICAgICAgICAvLyBmaW5kIHRoZSBzdXBwb3J0cyBmcm9tIGJvZHlCIHRoYXQgYXJlIGluc2lkZSBib2R5QVxuICAgICAgICBpZiAoVmVydGljZXMuY29udGFpbnMoYm9keUEudmVydGljZXMsIHZlcnRpY2VzQlswXSkpXG4gICAgICAgICAgICBzdXBwb3J0cy5wdXNoKHZlcnRpY2VzQlswXSk7XG5cbiAgICAgICAgaWYgKFZlcnRpY2VzLmNvbnRhaW5zKGJvZHlBLnZlcnRpY2VzLCB2ZXJ0aWNlc0JbMV0pKVxuICAgICAgICAgICAgc3VwcG9ydHMucHVzaCh2ZXJ0aWNlc0JbMV0pO1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIHN1cHBvcnRzIGZyb20gYm9keUEgdGhhdCBhcmUgaW5zaWRlIGJvZHlCXG4gICAgICAgIGlmIChzdXBwb3J0cy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICB2YXIgdmVydGljZXNBID0gX2ZpbmRTdXBwb3J0cyhib2R5QiwgYm9keUEsIFZlY3Rvci5uZWcoY29sbGlzaW9uLm5vcm1hbCkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKFZlcnRpY2VzLmNvbnRhaW5zKGJvZHlCLnZlcnRpY2VzLCB2ZXJ0aWNlc0FbMF0pKVxuICAgICAgICAgICAgICAgIHN1cHBvcnRzLnB1c2godmVydGljZXNBWzBdKTtcblxuICAgICAgICAgICAgaWYgKHN1cHBvcnRzLmxlbmd0aCA8IDIgJiYgVmVydGljZXMuY29udGFpbnMoYm9keUIudmVydGljZXMsIHZlcnRpY2VzQVsxXSkpXG4gICAgICAgICAgICAgICAgc3VwcG9ydHMucHVzaCh2ZXJ0aWNlc0FbMV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIGVkZ2UgY2FzZSBvZiBvdmVybGFwcGluZyBidXQgbm8gdmVydGV4IGNvbnRhaW5tZW50XG4gICAgICAgIGlmIChzdXBwb3J0cy5sZW5ndGggPCAxKVxuICAgICAgICAgICAgc3VwcG9ydHMgPSBbdmVydGljZXNCWzBdXTtcbiAgICAgICAgXG4gICAgICAgIGNvbGxpc2lvbi5zdXBwb3J0cyA9IHN1cHBvcnRzO1xuXG4gICAgICAgIHJldHVybiBjb2xsaXNpb247XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEZpbmQgdGhlIG92ZXJsYXAgYmV0d2VlbiB0d28gc2V0cyBvZiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIF9vdmVybGFwQXhlc1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IHZlcnRpY2VzQVxuICAgICAqIEBwYXJhbSB7fSB2ZXJ0aWNlc0JcbiAgICAgKiBAcGFyYW0ge30gYXhlc1xuICAgICAqIEByZXR1cm4gcmVzdWx0XG4gICAgICovXG4gICAgdmFyIF9vdmVybGFwQXhlcyA9IGZ1bmN0aW9uKHZlcnRpY2VzQSwgdmVydGljZXNCLCBheGVzKSB7XG4gICAgICAgIHZhciBwcm9qZWN0aW9uQSA9IFZlY3Rvci5fdGVtcFswXSwgXG4gICAgICAgICAgICBwcm9qZWN0aW9uQiA9IFZlY3Rvci5fdGVtcFsxXSxcbiAgICAgICAgICAgIHJlc3VsdCA9IHsgb3ZlcmxhcDogTnVtYmVyLk1BWF9WQUxVRSB9LFxuICAgICAgICAgICAgb3ZlcmxhcCxcbiAgICAgICAgICAgIGF4aXM7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBheGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBheGlzID0gYXhlc1tpXTtcblxuICAgICAgICAgICAgX3Byb2plY3RUb0F4aXMocHJvamVjdGlvbkEsIHZlcnRpY2VzQSwgYXhpcyk7XG4gICAgICAgICAgICBfcHJvamVjdFRvQXhpcyhwcm9qZWN0aW9uQiwgdmVydGljZXNCLCBheGlzKTtcblxuICAgICAgICAgICAgb3ZlcmxhcCA9IE1hdGgubWluKHByb2plY3Rpb25BLm1heCAtIHByb2plY3Rpb25CLm1pbiwgcHJvamVjdGlvbkIubWF4IC0gcHJvamVjdGlvbkEubWluKTtcblxuICAgICAgICAgICAgaWYgKG92ZXJsYXAgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5vdmVybGFwID0gb3ZlcmxhcDtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3ZlcmxhcCA8IHJlc3VsdC5vdmVybGFwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0Lm92ZXJsYXAgPSBvdmVybGFwO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5heGlzID0gYXhpcztcbiAgICAgICAgICAgICAgICByZXN1bHQuYXhpc051bWJlciA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBQcm9qZWN0cyB2ZXJ0aWNlcyBvbiBhbiBheGlzIGFuZCByZXR1cm5zIGFuIGludGVydmFsLlxuICAgICAqIEBtZXRob2QgX3Byb2plY3RUb0F4aXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBwcm9qZWN0aW9uXG4gICAgICogQHBhcmFtIHt9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHt9IGF4aXNcbiAgICAgKi9cbiAgICB2YXIgX3Byb2plY3RUb0F4aXMgPSBmdW5jdGlvbihwcm9qZWN0aW9uLCB2ZXJ0aWNlcywgYXhpcykge1xuICAgICAgICB2YXIgbWluID0gVmVjdG9yLmRvdCh2ZXJ0aWNlc1swXSwgYXhpcyksXG4gICAgICAgICAgICBtYXggPSBtaW47XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgdmFyIGRvdCA9IFZlY3Rvci5kb3QodmVydGljZXNbaV0sIGF4aXMpO1xuXG4gICAgICAgICAgICBpZiAoZG90ID4gbWF4KSB7IFxuICAgICAgICAgICAgICAgIG1heCA9IGRvdDsgXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRvdCA8IG1pbikgeyBcbiAgICAgICAgICAgICAgICBtaW4gPSBkb3Q7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcHJvamVjdGlvbi5taW4gPSBtaW47XG4gICAgICAgIHByb2plY3Rpb24ubWF4ID0gbWF4O1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRmluZHMgc3VwcG9ydGluZyB2ZXJ0aWNlcyBnaXZlbiB0d28gYm9kaWVzIGFsb25nIGEgZ2l2ZW4gZGlyZWN0aW9uIHVzaW5nIGhpbGwtY2xpbWJpbmcuXG4gICAgICogQG1ldGhvZCBfZmluZFN1cHBvcnRzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge30gYm9keUFcbiAgICAgKiBAcGFyYW0ge30gYm9keUJcbiAgICAgKiBAcGFyYW0ge30gbm9ybWFsXG4gICAgICogQHJldHVybiBbdmVjdG9yXVxuICAgICAqL1xuICAgIHZhciBfZmluZFN1cHBvcnRzID0gZnVuY3Rpb24oYm9keUEsIGJvZHlCLCBub3JtYWwpIHtcbiAgICAgICAgdmFyIG5lYXJlc3REaXN0YW5jZSA9IE51bWJlci5NQVhfVkFMVUUsXG4gICAgICAgICAgICB2ZXJ0ZXhUb0JvZHkgPSBWZWN0b3IuX3RlbXBbMF0sXG4gICAgICAgICAgICB2ZXJ0aWNlcyA9IGJvZHlCLnZlcnRpY2VzLFxuICAgICAgICAgICAgYm9keUFQb3NpdGlvbiA9IGJvZHlBLnBvc2l0aW9uLFxuICAgICAgICAgICAgZGlzdGFuY2UsXG4gICAgICAgICAgICB2ZXJ0ZXgsXG4gICAgICAgICAgICB2ZXJ0ZXhBLFxuICAgICAgICAgICAgdmVydGV4QjtcblxuICAgICAgICAvLyBmaW5kIGNsb3Nlc3QgdmVydGV4IG9uIGJvZHlCXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZlcnRleCA9IHZlcnRpY2VzW2ldO1xuICAgICAgICAgICAgdmVydGV4VG9Cb2R5LnggPSB2ZXJ0ZXgueCAtIGJvZHlBUG9zaXRpb24ueDtcbiAgICAgICAgICAgIHZlcnRleFRvQm9keS55ID0gdmVydGV4LnkgLSBib2R5QVBvc2l0aW9uLnk7XG4gICAgICAgICAgICBkaXN0YW5jZSA9IC1WZWN0b3IuZG90KG5vcm1hbCwgdmVydGV4VG9Cb2R5KTtcblxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgbmVhcmVzdERpc3RhbmNlKSB7XG4gICAgICAgICAgICAgICAgbmVhcmVzdERpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICAgICAgICAgICAgdmVydGV4QSA9IHZlcnRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGZpbmQgbmV4dCBjbG9zZXN0IHZlcnRleCB1c2luZyB0aGUgdHdvIGNvbm5lY3RlZCB0byBpdFxuICAgICAgICB2YXIgcHJldkluZGV4ID0gdmVydGV4QS5pbmRleCAtIDEgPj0gMCA/IHZlcnRleEEuaW5kZXggLSAxIDogdmVydGljZXMubGVuZ3RoIC0gMTtcbiAgICAgICAgdmVydGV4ID0gdmVydGljZXNbcHJldkluZGV4XTtcbiAgICAgICAgdmVydGV4VG9Cb2R5LnggPSB2ZXJ0ZXgueCAtIGJvZHlBUG9zaXRpb24ueDtcbiAgICAgICAgdmVydGV4VG9Cb2R5LnkgPSB2ZXJ0ZXgueSAtIGJvZHlBUG9zaXRpb24ueTtcbiAgICAgICAgbmVhcmVzdERpc3RhbmNlID0gLVZlY3Rvci5kb3Qobm9ybWFsLCB2ZXJ0ZXhUb0JvZHkpO1xuICAgICAgICB2ZXJ0ZXhCID0gdmVydGV4O1xuXG4gICAgICAgIHZhciBuZXh0SW5kZXggPSAodmVydGV4QS5pbmRleCArIDEpICUgdmVydGljZXMubGVuZ3RoO1xuICAgICAgICB2ZXJ0ZXggPSB2ZXJ0aWNlc1tuZXh0SW5kZXhdO1xuICAgICAgICB2ZXJ0ZXhUb0JvZHkueCA9IHZlcnRleC54IC0gYm9keUFQb3NpdGlvbi54O1xuICAgICAgICB2ZXJ0ZXhUb0JvZHkueSA9IHZlcnRleC55IC0gYm9keUFQb3NpdGlvbi55O1xuICAgICAgICBkaXN0YW5jZSA9IC1WZWN0b3IuZG90KG5vcm1hbCwgdmVydGV4VG9Cb2R5KTtcbiAgICAgICAgaWYgKGRpc3RhbmNlIDwgbmVhcmVzdERpc3RhbmNlKSB7XG4gICAgICAgICAgICB2ZXJ0ZXhCID0gdmVydGV4O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFt2ZXJ0ZXhBLCB2ZXJ0ZXhCXTtcbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkNvbnN0cmFpbnRgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGNvbnN0cmFpbnRzLlxuKiBDb25zdHJhaW50cyBhcmUgdXNlZCBmb3Igc3BlY2lmeWluZyB0aGF0IGEgZml4ZWQgZGlzdGFuY2UgbXVzdCBiZSBtYWludGFpbmVkIGJldHdlZW4gdHdvIGJvZGllcyAob3IgYSBib2R5IGFuZCBhIGZpeGVkIHdvcmxkLXNwYWNlIHBvc2l0aW9uKS5cbiogVGhlIHN0aWZmbmVzcyBvZiBjb25zdHJhaW50cyBjYW4gYmUgbW9kaWZpZWQgdG8gY3JlYXRlIHNwcmluZ3Mgb3IgZWxhc3RpYy5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIENvbnN0cmFpbnRcbiovXG5cbi8vIFRPRE86IGZpeCBpbnN0YWJpbGl0eSBpc3N1ZXMgd2l0aCB0b3JxdWVcbi8vIFRPRE86IGxpbmtlZCBjb25zdHJhaW50c1xuLy8gVE9ETzogYnJlYWthYmxlIGNvbnN0cmFpbnRzXG4vLyBUT0RPOiBjb2xsaXNpb24gY29uc3RyYWludHNcbi8vIFRPRE86IGFsbG93IGNvbnN0cmFpbmVkIGJvZGllcyB0byBzbGVlcFxuLy8gVE9ETzogaGFuZGxlIDAgbGVuZ3RoIGNvbnN0cmFpbnRzIHByb3Blcmx5XG4vLyBUT0RPOiBpbXB1bHNlIGNhY2hpbmcgYW5kIHdhcm1pbmdcblxudmFyIENvbnN0cmFpbnQgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb25zdHJhaW50O1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIFZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xudmFyIFNsZWVwaW5nID0gcmVxdWlyZSgnLi4vY29yZS9TbGVlcGluZycpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xudmFyIEF4ZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9BeGVzJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIF9taW5MZW5ndGggPSAwLjAwMDAwMSxcbiAgICAgICAgX21pbkRpZmZlcmVuY2UgPSAwLjAwMTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgY29uc3RyYWludC5cbiAgICAgKiBBbGwgcHJvcGVydGllcyBoYXZlIGRlZmF1bHQgdmFsdWVzLCBhbmQgbWFueSBhcmUgcHJlLWNhbGN1bGF0ZWQgYXV0b21hdGljYWxseSBiYXNlZCBvbiBvdGhlciBwcm9wZXJ0aWVzLlxuICAgICAqIFNlZSB0aGUgcHJvcGVydGllcyBzZWN0aW9uIGJlbG93IGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge30gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge2NvbnN0cmFpbnR9IGNvbnN0cmFpbnRcbiAgICAgKi9cbiAgICBDb25zdHJhaW50LmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGNvbnN0cmFpbnQgPSBvcHRpb25zO1xuXG4gICAgICAgIC8vIGlmIGJvZGllcyBkZWZpbmVkIGJ1dCBubyBwb2ludHMsIHVzZSBib2R5IGNlbnRyZVxuICAgICAgICBpZiAoY29uc3RyYWludC5ib2R5QSAmJiAhY29uc3RyYWludC5wb2ludEEpXG4gICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QSA9IHsgeDogMCwgeTogMCB9O1xuICAgICAgICBpZiAoY29uc3RyYWludC5ib2R5QiAmJiAhY29uc3RyYWludC5wb2ludEIpXG4gICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QiA9IHsgeDogMCwgeTogMCB9O1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSBzdGF0aWMgbGVuZ3RoIHVzaW5nIGluaXRpYWwgd29ybGQgc3BhY2UgcG9pbnRzXG4gICAgICAgIHZhciBpbml0aWFsUG9pbnRBID0gY29uc3RyYWludC5ib2R5QSA/IFZlY3Rvci5hZGQoY29uc3RyYWludC5ib2R5QS5wb3NpdGlvbiwgY29uc3RyYWludC5wb2ludEEpIDogY29uc3RyYWludC5wb2ludEEsXG4gICAgICAgICAgICBpbml0aWFsUG9pbnRCID0gY29uc3RyYWludC5ib2R5QiA/IFZlY3Rvci5hZGQoY29uc3RyYWludC5ib2R5Qi5wb3NpdGlvbiwgY29uc3RyYWludC5wb2ludEIpIDogY29uc3RyYWludC5wb2ludEIsXG4gICAgICAgICAgICBsZW5ndGggPSBWZWN0b3IubWFnbml0dWRlKFZlY3Rvci5zdWIoaW5pdGlhbFBvaW50QSwgaW5pdGlhbFBvaW50QikpO1xuICAgIFxuICAgICAgICBjb25zdHJhaW50Lmxlbmd0aCA9IGNvbnN0cmFpbnQubGVuZ3RoIHx8IGxlbmd0aCB8fCBfbWluTGVuZ3RoO1xuXG4gICAgICAgIC8vIHJlbmRlclxuICAgICAgICB2YXIgcmVuZGVyID0ge1xuICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGxpbmVXaWR0aDogMixcbiAgICAgICAgICAgIHN0cm9rZVN0eWxlOiAnIzY2NidcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0cmFpbnQucmVuZGVyID0gQ29tbW9uLmV4dGVuZChyZW5kZXIsIGNvbnN0cmFpbnQucmVuZGVyKTtcblxuICAgICAgICAvLyBvcHRpb24gZGVmYXVsdHNcbiAgICAgICAgY29uc3RyYWludC5pZCA9IGNvbnN0cmFpbnQuaWQgfHwgQ29tbW9uLm5leHRJZCgpO1xuICAgICAgICBjb25zdHJhaW50LmxhYmVsID0gY29uc3RyYWludC5sYWJlbCB8fCAnQ29uc3RyYWludCc7XG4gICAgICAgIGNvbnN0cmFpbnQudHlwZSA9ICdjb25zdHJhaW50JztcbiAgICAgICAgY29uc3RyYWludC5zdGlmZm5lc3MgPSBjb25zdHJhaW50LnN0aWZmbmVzcyB8fCAxO1xuICAgICAgICBjb25zdHJhaW50LmFuZ3VsYXJTdGlmZm5lc3MgPSBjb25zdHJhaW50LmFuZ3VsYXJTdGlmZm5lc3MgfHwgMDtcbiAgICAgICAgY29uc3RyYWludC5hbmdsZUEgPSBjb25zdHJhaW50LmJvZHlBID8gY29uc3RyYWludC5ib2R5QS5hbmdsZSA6IGNvbnN0cmFpbnQuYW5nbGVBO1xuICAgICAgICBjb25zdHJhaW50LmFuZ2xlQiA9IGNvbnN0cmFpbnQuYm9keUIgPyBjb25zdHJhaW50LmJvZHlCLmFuZ2xlIDogY29uc3RyYWludC5hbmdsZUI7XG5cbiAgICAgICAgcmV0dXJuIGNvbnN0cmFpbnQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNvbHZlcyBhbGwgY29uc3RyYWludHMgaW4gYSBsaXN0IG9mIGNvbGxpc2lvbnMuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHNvbHZlQWxsXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50W119IGNvbnN0cmFpbnRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqL1xuICAgIENvbnN0cmFpbnQuc29sdmVBbGwgPSBmdW5jdGlvbihjb25zdHJhaW50cywgdGltZVNjYWxlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29uc3RyYWludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIENvbnN0cmFpbnQuc29sdmUoY29uc3RyYWludHNbaV0sIHRpbWVTY2FsZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU29sdmVzIGEgZGlzdGFuY2UgY29uc3RyYWludCB3aXRoIEdhdXNzLVNpZWRlbCBtZXRob2QuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHNvbHZlXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50fSBjb25zdHJhaW50XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqL1xuICAgIENvbnN0cmFpbnQuc29sdmUgPSBmdW5jdGlvbihjb25zdHJhaW50LCB0aW1lU2NhbGUpIHtcbiAgICAgICAgdmFyIGJvZHlBID0gY29uc3RyYWludC5ib2R5QSxcbiAgICAgICAgICAgIGJvZHlCID0gY29uc3RyYWludC5ib2R5QixcbiAgICAgICAgICAgIHBvaW50QSA9IGNvbnN0cmFpbnQucG9pbnRBLFxuICAgICAgICAgICAgcG9pbnRCID0gY29uc3RyYWludC5wb2ludEI7XG5cbiAgICAgICAgLy8gdXBkYXRlIHJlZmVyZW5jZSBhbmdsZVxuICAgICAgICBpZiAoYm9keUEgJiYgIWJvZHlBLmlzU3RhdGljKSB7XG4gICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QSA9IFZlY3Rvci5yb3RhdGUocG9pbnRBLCBib2R5QS5hbmdsZSAtIGNvbnN0cmFpbnQuYW5nbGVBKTtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQuYW5nbGVBID0gYm9keUEuYW5nbGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHVwZGF0ZSByZWZlcmVuY2UgYW5nbGVcbiAgICAgICAgaWYgKGJvZHlCICYmICFib2R5Qi5pc1N0YXRpYykge1xuICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEIgPSBWZWN0b3Iucm90YXRlKHBvaW50QiwgYm9keUIuYW5nbGUgLSBjb25zdHJhaW50LmFuZ2xlQik7XG4gICAgICAgICAgICBjb25zdHJhaW50LmFuZ2xlQiA9IGJvZHlCLmFuZ2xlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHBvaW50QVdvcmxkID0gcG9pbnRBLFxuICAgICAgICAgICAgcG9pbnRCV29ybGQgPSBwb2ludEI7XG5cbiAgICAgICAgaWYgKGJvZHlBKSBwb2ludEFXb3JsZCA9IFZlY3Rvci5hZGQoYm9keUEucG9zaXRpb24sIHBvaW50QSk7XG4gICAgICAgIGlmIChib2R5QikgcG9pbnRCV29ybGQgPSBWZWN0b3IuYWRkKGJvZHlCLnBvc2l0aW9uLCBwb2ludEIpO1xuXG4gICAgICAgIGlmICghcG9pbnRBV29ybGQgfHwgIXBvaW50QldvcmxkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkZWx0YSA9IFZlY3Rvci5zdWIocG9pbnRBV29ybGQsIHBvaW50QldvcmxkKSxcbiAgICAgICAgICAgIGN1cnJlbnRMZW5ndGggPSBWZWN0b3IubWFnbml0dWRlKGRlbHRhKTtcblxuICAgICAgICAvLyBwcmV2ZW50IHNpbmd1bGFyaXR5XG4gICAgICAgIGlmIChjdXJyZW50TGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgY3VycmVudExlbmd0aCA9IF9taW5MZW5ndGg7XG5cbiAgICAgICAgLy8gc29sdmUgZGlzdGFuY2UgY29uc3RyYWludCB3aXRoIEdhdXNzLVNpZWRlbCBtZXRob2RcbiAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSAoY3VycmVudExlbmd0aCAtIGNvbnN0cmFpbnQubGVuZ3RoKSAvIGN1cnJlbnRMZW5ndGgsXG4gICAgICAgICAgICBub3JtYWwgPSBWZWN0b3IuZGl2KGRlbHRhLCBjdXJyZW50TGVuZ3RoKSxcbiAgICAgICAgICAgIGZvcmNlID0gVmVjdG9yLm11bHQoZGVsdGEsIGRpZmZlcmVuY2UgKiAwLjUgKiBjb25zdHJhaW50LnN0aWZmbmVzcyAqIHRpbWVTY2FsZSAqIHRpbWVTY2FsZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBpZiBkaWZmZXJlbmNlIGlzIHZlcnkgc21hbGwsIHdlIGNhbiBza2lwXG4gICAgICAgIGlmIChNYXRoLmFicygxIC0gKGN1cnJlbnRMZW5ndGggLyBjb25zdHJhaW50Lmxlbmd0aCkpIDwgX21pbkRpZmZlcmVuY2UgKiB0aW1lU2NhbGUpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdmFyIHZlbG9jaXR5UG9pbnRBLFxuICAgICAgICAgICAgdmVsb2NpdHlQb2ludEIsXG4gICAgICAgICAgICBvZmZzZXRBLFxuICAgICAgICAgICAgb2Zmc2V0QixcbiAgICAgICAgICAgIG9BbixcbiAgICAgICAgICAgIG9CbixcbiAgICAgICAgICAgIGJvZHlBRGVub20sXG4gICAgICAgICAgICBib2R5QkRlbm9tO1xuICAgIFxuICAgICAgICBpZiAoYm9keUEgJiYgIWJvZHlBLmlzU3RhdGljKSB7XG4gICAgICAgICAgICAvLyBwb2ludCBib2R5IG9mZnNldFxuICAgICAgICAgICAgb2Zmc2V0QSA9IHsgXG4gICAgICAgICAgICAgICAgeDogcG9pbnRBV29ybGQueCAtIGJvZHlBLnBvc2l0aW9uLnggKyBmb3JjZS54LCBcbiAgICAgICAgICAgICAgICB5OiBwb2ludEFXb3JsZC55IC0gYm9keUEucG9zaXRpb24ueSArIGZvcmNlLnlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB2ZWxvY2l0eVxuICAgICAgICAgICAgYm9keUEudmVsb2NpdHkueCA9IGJvZHlBLnBvc2l0aW9uLnggLSBib2R5QS5wb3NpdGlvblByZXYueDtcbiAgICAgICAgICAgIGJvZHlBLnZlbG9jaXR5LnkgPSBib2R5QS5wb3NpdGlvbi55IC0gYm9keUEucG9zaXRpb25QcmV2Lnk7XG4gICAgICAgICAgICBib2R5QS5hbmd1bGFyVmVsb2NpdHkgPSBib2R5QS5hbmdsZSAtIGJvZHlBLmFuZ2xlUHJldjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gZmluZCBwb2ludCB2ZWxvY2l0eSBhbmQgYm9keSBtYXNzXG4gICAgICAgICAgICB2ZWxvY2l0eVBvaW50QSA9IFZlY3Rvci5hZGQoYm9keUEudmVsb2NpdHksIFZlY3Rvci5tdWx0KFZlY3Rvci5wZXJwKG9mZnNldEEpLCBib2R5QS5hbmd1bGFyVmVsb2NpdHkpKTtcbiAgICAgICAgICAgIG9BbiA9IFZlY3Rvci5kb3Qob2Zmc2V0QSwgbm9ybWFsKTtcbiAgICAgICAgICAgIGJvZHlBRGVub20gPSBib2R5QS5pbnZlcnNlTWFzcyArIGJvZHlBLmludmVyc2VJbmVydGlhICogb0FuICogb0FuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmVsb2NpdHlQb2ludEEgPSB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgICAgIGJvZHlBRGVub20gPSBib2R5QSA/IGJvZHlBLmludmVyc2VNYXNzIDogMDtcbiAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIGlmIChib2R5QiAmJiAhYm9keUIuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIC8vIHBvaW50IGJvZHkgb2Zmc2V0XG4gICAgICAgICAgICBvZmZzZXRCID0geyBcbiAgICAgICAgICAgICAgICB4OiBwb2ludEJXb3JsZC54IC0gYm9keUIucG9zaXRpb24ueCAtIGZvcmNlLngsIFxuICAgICAgICAgICAgICAgIHk6IHBvaW50QldvcmxkLnkgLSBib2R5Qi5wb3NpdGlvbi55IC0gZm9yY2UueSBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHVwZGF0ZSB2ZWxvY2l0eVxuICAgICAgICAgICAgYm9keUIudmVsb2NpdHkueCA9IGJvZHlCLnBvc2l0aW9uLnggLSBib2R5Qi5wb3NpdGlvblByZXYueDtcbiAgICAgICAgICAgIGJvZHlCLnZlbG9jaXR5LnkgPSBib2R5Qi5wb3NpdGlvbi55IC0gYm9keUIucG9zaXRpb25QcmV2Lnk7XG4gICAgICAgICAgICBib2R5Qi5hbmd1bGFyVmVsb2NpdHkgPSBib2R5Qi5hbmdsZSAtIGJvZHlCLmFuZ2xlUHJldjtcblxuICAgICAgICAgICAgLy8gZmluZCBwb2ludCB2ZWxvY2l0eSBhbmQgYm9keSBtYXNzXG4gICAgICAgICAgICB2ZWxvY2l0eVBvaW50QiA9IFZlY3Rvci5hZGQoYm9keUIudmVsb2NpdHksIFZlY3Rvci5tdWx0KFZlY3Rvci5wZXJwKG9mZnNldEIpLCBib2R5Qi5hbmd1bGFyVmVsb2NpdHkpKTtcbiAgICAgICAgICAgIG9CbiA9IFZlY3Rvci5kb3Qob2Zmc2V0Qiwgbm9ybWFsKTtcbiAgICAgICAgICAgIGJvZHlCRGVub20gPSBib2R5Qi5pbnZlcnNlTWFzcyArIGJvZHlCLmludmVyc2VJbmVydGlhICogb0JuICogb0JuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmVsb2NpdHlQb2ludEIgPSB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgICAgIGJvZHlCRGVub20gPSBib2R5QiA/IGJvZHlCLmludmVyc2VNYXNzIDogMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHJlbGF0aXZlVmVsb2NpdHkgPSBWZWN0b3Iuc3ViKHZlbG9jaXR5UG9pbnRCLCB2ZWxvY2l0eVBvaW50QSksXG4gICAgICAgICAgICBub3JtYWxJbXB1bHNlID0gVmVjdG9yLmRvdChub3JtYWwsIHJlbGF0aXZlVmVsb2NpdHkpIC8gKGJvZHlBRGVub20gKyBib2R5QkRlbm9tKTtcbiAgICBcbiAgICAgICAgaWYgKG5vcm1hbEltcHVsc2UgPiAwKSBub3JtYWxJbXB1bHNlID0gMDtcbiAgICBcbiAgICAgICAgdmFyIG5vcm1hbFZlbG9jaXR5ID0ge1xuICAgICAgICAgICAgeDogbm9ybWFsLnggKiBub3JtYWxJbXB1bHNlLCBcbiAgICAgICAgICAgIHk6IG5vcm1hbC55ICogbm9ybWFsSW1wdWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB0b3JxdWU7XG4gXG4gICAgICAgIGlmIChib2R5QSAmJiAhYm9keUEuaXNTdGF0aWMpIHtcbiAgICAgICAgICAgIHRvcnF1ZSA9IFZlY3Rvci5jcm9zcyhvZmZzZXRBLCBub3JtYWxWZWxvY2l0eSkgKiBib2R5QS5pbnZlcnNlSW5lcnRpYSAqICgxIC0gY29uc3RyYWludC5hbmd1bGFyU3RpZmZuZXNzKTtcblxuICAgICAgICAgICAgLy8ga2VlcCB0cmFjayBvZiBhcHBsaWVkIGltcHVsc2VzIGZvciBwb3N0IHNvbHZpbmdcbiAgICAgICAgICAgIGJvZHlBLmNvbnN0cmFpbnRJbXB1bHNlLnggLT0gZm9yY2UueDtcbiAgICAgICAgICAgIGJvZHlBLmNvbnN0cmFpbnRJbXB1bHNlLnkgLT0gZm9yY2UueTtcbiAgICAgICAgICAgIGJvZHlBLmNvbnN0cmFpbnRJbXB1bHNlLmFuZ2xlICs9IHRvcnF1ZTtcblxuICAgICAgICAgICAgLy8gYXBwbHkgZm9yY2VzXG4gICAgICAgICAgICBib2R5QS5wb3NpdGlvbi54IC09IGZvcmNlLng7XG4gICAgICAgICAgICBib2R5QS5wb3NpdGlvbi55IC09IGZvcmNlLnk7XG4gICAgICAgICAgICBib2R5QS5hbmdsZSArPSB0b3JxdWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYm9keUIgJiYgIWJvZHlCLmlzU3RhdGljKSB7XG4gICAgICAgICAgICB0b3JxdWUgPSBWZWN0b3IuY3Jvc3Mob2Zmc2V0Qiwgbm9ybWFsVmVsb2NpdHkpICogYm9keUIuaW52ZXJzZUluZXJ0aWEgKiAoMSAtIGNvbnN0cmFpbnQuYW5ndWxhclN0aWZmbmVzcyk7XG5cbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgYXBwbGllZCBpbXB1bHNlcyBmb3IgcG9zdCBzb2x2aW5nXG4gICAgICAgICAgICBib2R5Qi5jb25zdHJhaW50SW1wdWxzZS54ICs9IGZvcmNlLng7XG4gICAgICAgICAgICBib2R5Qi5jb25zdHJhaW50SW1wdWxzZS55ICs9IGZvcmNlLnk7XG4gICAgICAgICAgICBib2R5Qi5jb25zdHJhaW50SW1wdWxzZS5hbmdsZSAtPSB0b3JxdWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGFwcGx5IGZvcmNlc1xuICAgICAgICAgICAgYm9keUIucG9zaXRpb24ueCArPSBmb3JjZS54O1xuICAgICAgICAgICAgYm9keUIucG9zaXRpb24ueSArPSBmb3JjZS55O1xuICAgICAgICAgICAgYm9keUIuYW5nbGUgLT0gdG9ycXVlO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUGVyZm9ybXMgYm9keSB1cGRhdGVzIHJlcXVpcmVkIGFmdGVyIHNvbHZpbmcgY29uc3RyYWludHMuXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHBvc3RTb2x2ZUFsbFxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKi9cbiAgICBDb25zdHJhaW50LnBvc3RTb2x2ZUFsbCA9IGZ1bmN0aW9uKGJvZGllcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgaW1wdWxzZSA9IGJvZHkuY29uc3RyYWludEltcHVsc2U7XG5cbiAgICAgICAgICAgIGlmIChpbXB1bHNlLnggPT09IDAgJiYgaW1wdWxzZS55ID09PSAwICYmIGltcHVsc2UuYW5nbGUgPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIGZhbHNlKTtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIGdlb21ldHJ5IGFuZCByZXNldFxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBib2R5LnBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnQgPSBib2R5LnBhcnRzW2pdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIFZlcnRpY2VzLnRyYW5zbGF0ZShwYXJ0LnZlcnRpY2VzLCBpbXB1bHNlKTtcblxuICAgICAgICAgICAgICAgIGlmIChqID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnggKz0gaW1wdWxzZS54O1xuICAgICAgICAgICAgICAgICAgICBwYXJ0LnBvc2l0aW9uLnkgKz0gaW1wdWxzZS55O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChpbXB1bHNlLmFuZ2xlICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIFZlcnRpY2VzLnJvdGF0ZShwYXJ0LnZlcnRpY2VzLCBpbXB1bHNlLmFuZ2xlLCBib2R5LnBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgQXhlcy5yb3RhdGUocGFydC5heGVzLCBpbXB1bHNlLmFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGogPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBWZWN0b3Iucm90YXRlQWJvdXQocGFydC5wb3NpdGlvbiwgaW1wdWxzZS5hbmdsZSwgYm9keS5wb3NpdGlvbiwgcGFydC5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBCb3VuZHMudXBkYXRlKHBhcnQuYm91bmRzLCBwYXJ0LnZlcnRpY2VzLCBib2R5LnZlbG9jaXR5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaW1wdWxzZS5hbmdsZSA9IDA7XG4gICAgICAgICAgICBpbXB1bHNlLnggPSAwO1xuICAgICAgICAgICAgaW1wdWxzZS55ID0gMDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKlxuICAgICpcbiAgICAqICBQcm9wZXJ0aWVzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGludGVnZXIgYE51bWJlcmAgdW5pcXVlbHkgaWRlbnRpZnlpbmcgbnVtYmVyIGdlbmVyYXRlZCBpbiBgQ29tcG9zaXRlLmNyZWF0ZWAgYnkgYENvbW1vbi5uZXh0SWRgLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlkXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIGRlbm90aW5nIHRoZSB0eXBlIG9mIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0eXBlXG4gICAgICogQHR5cGUgc3RyaW5nXG4gICAgICogQGRlZmF1bHQgXCJjb25zdHJhaW50XCJcbiAgICAgKiBAcmVhZE9ubHlcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGFyYml0cmFyeSBgU3RyaW5nYCBuYW1lIHRvIGhlbHAgdGhlIHVzZXIgaWRlbnRpZnkgYW5kIG1hbmFnZSBib2RpZXMuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgbGFiZWxcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcIkNvbnN0cmFpbnRcIlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gYE9iamVjdGAgdGhhdCBkZWZpbmVzIHRoZSByZW5kZXJpbmcgcHJvcGVydGllcyB0byBiZSBjb25zdW1lZCBieSB0aGUgbW9kdWxlIGBNYXR0ZXIuUmVuZGVyYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXJcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0aGUgY29uc3RyYWludCBzaG91bGQgYmUgcmVuZGVyZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyLnZpc2libGVcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IGRlZmluZXMgdGhlIGxpbmUgd2lkdGggdG8gdXNlIHdoZW4gcmVuZGVyaW5nIHRoZSBjb25zdHJhaW50IG91dGxpbmUuXG4gICAgICogQSB2YWx1ZSBvZiBgMGAgbWVhbnMgbm8gb3V0bGluZSB3aWxsIGJlIHJlbmRlcmVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHJlbmRlci5saW5lV2lkdGhcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBTdHJpbmdgIHRoYXQgZGVmaW5lcyB0aGUgc3Ryb2tlIHN0eWxlIHRvIHVzZSB3aGVuIHJlbmRlcmluZyB0aGUgY29uc3RyYWludCBvdXRsaW5lLlxuICAgICAqIEl0IGlzIHRoZSBzYW1lIGFzIHdoZW4gdXNpbmcgYSBjYW52YXMsIHNvIGl0IGFjY2VwdHMgQ1NTIHN0eWxlIHByb3BlcnR5IHZhbHVlcy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSByZW5kZXIuc3Ryb2tlU3R5bGVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBhIHJhbmRvbSBjb2xvdXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBmaXJzdCBwb3NzaWJsZSBgQm9keWAgdGhhdCB0aGlzIGNvbnN0cmFpbnQgaXMgYXR0YWNoZWQgdG8uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm9keUFcbiAgICAgKiBAdHlwZSBib2R5XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNlY29uZCBwb3NzaWJsZSBgQm9keWAgdGhhdCB0aGlzIGNvbnN0cmFpbnQgaXMgYXR0YWNoZWQgdG8uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm9keUJcbiAgICAgKiBAdHlwZSBib2R5XG4gICAgICogQGRlZmF1bHQgbnVsbFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgVmVjdG9yYCB0aGF0IHNwZWNpZmllcyB0aGUgb2Zmc2V0IG9mIHRoZSBjb25zdHJhaW50IGZyb20gY2VudGVyIG9mIHRoZSBgY29uc3RyYWludC5ib2R5QWAgaWYgZGVmaW5lZCwgb3RoZXJ3aXNlIGEgd29ybGQtc3BhY2UgcG9zaXRpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcG9pbnRBXG4gICAgICogQHR5cGUgdmVjdG9yXG4gICAgICogQGRlZmF1bHQgeyB4OiAwLCB5OiAwIH1cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFZlY3RvcmAgdGhhdCBzcGVjaWZpZXMgdGhlIG9mZnNldCBvZiB0aGUgY29uc3RyYWludCBmcm9tIGNlbnRlciBvZiB0aGUgYGNvbnN0cmFpbnQuYm9keUFgIGlmIGRlZmluZWQsIG90aGVyd2lzZSBhIHdvcmxkLXNwYWNlIHBvc2l0aW9uLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHBvaW50QlxuICAgICAqIEB0eXBlIHZlY3RvclxuICAgICAqIEBkZWZhdWx0IHsgeDogMCwgeTogMCB9XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSBzdGlmZm5lc3Mgb2YgdGhlIGNvbnN0cmFpbnQsIGkuZS4gdGhlIHJhdGUgYXQgd2hpY2ggaXQgcmV0dXJucyB0byBpdHMgcmVzdGluZyBgY29uc3RyYWludC5sZW5ndGhgLlxuICAgICAqIEEgdmFsdWUgb2YgYDFgIG1lYW5zIHRoZSBjb25zdHJhaW50IHNob3VsZCBiZSB2ZXJ5IHN0aWZmLlxuICAgICAqIEEgdmFsdWUgb2YgYDAuMmAgbWVhbnMgdGhlIGNvbnN0cmFpbnQgYWN0cyBsaWtlIGEgc29mdCBzcHJpbmcuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgc3RpZmZuZXNzXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgdGFyZ2V0IHJlc3RpbmcgbGVuZ3RoIG9mIHRoZSBjb25zdHJhaW50LiBcbiAgICAgKiBJdCBpcyBjYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgaW4gYENvbnN0cmFpbnQuY3JlYXRlYCBmcm9tIGluaXRpYWwgcG9zaXRpb25zIG9mIHRoZSBgY29uc3RyYWludC5ib2R5QWAgYW5kIGBjb25zdHJhaW50LmJvZHlCYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBsZW5ndGhcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKi9cblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Nb3VzZUNvbnN0cmFpbnRgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBtb3VzZSBjb25zdHJhaW50cy5cbiogTW91c2UgY29uc3RyYWludHMgYXJlIHVzZWQgZm9yIGFsbG93aW5nIHVzZXIgaW50ZXJhY3Rpb24sIHByb3ZpZGluZyB0aGUgYWJpbGl0eSB0byBtb3ZlIGJvZGllcyB2aWEgdGhlIG1vdXNlIG9yIHRvdWNoLlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgTW91c2VDb25zdHJhaW50XG4qL1xuXG52YXIgTW91c2VDb25zdHJhaW50ID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VDb25zdHJhaW50O1xuXG52YXIgVmVydGljZXMgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZXJ0aWNlcycpO1xudmFyIFNsZWVwaW5nID0gcmVxdWlyZSgnLi4vY29yZS9TbGVlcGluZycpO1xudmFyIE1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9Nb3VzZScpO1xudmFyIEV2ZW50cyA9IHJlcXVpcmUoJy4uL2NvcmUvRXZlbnRzJyk7XG52YXIgRGV0ZWN0b3IgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vRGV0ZWN0b3InKTtcbnZhciBDb25zdHJhaW50ID0gcmVxdWlyZSgnLi9Db25zdHJhaW50Jyk7XG52YXIgQ29tcG9zaXRlID0gcmVxdWlyZSgnLi4vYm9keS9Db21wb3NpdGUnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IG1vdXNlIGNvbnN0cmFpbnQuXG4gICAgICogQWxsIHByb3BlcnRpZXMgaGF2ZSBkZWZhdWx0IHZhbHVlcywgYW5kIG1hbnkgYXJlIHByZS1jYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gb3RoZXIgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqIEBwYXJhbSB7fSBvcHRpb25zXG4gICAgICogQHJldHVybiB7TW91c2VDb25zdHJhaW50fSBBIG5ldyBNb3VzZUNvbnN0cmFpbnRcbiAgICAgKi9cbiAgICBNb3VzZUNvbnN0cmFpbnQuY3JlYXRlID0gZnVuY3Rpb24oZW5naW5lLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBtb3VzZSA9IChlbmdpbmUgPyBlbmdpbmUubW91c2UgOiBudWxsKSB8fCAob3B0aW9ucyA/IG9wdGlvbnMubW91c2UgOiBudWxsKTtcblxuICAgICAgICBpZiAoIW1vdXNlKSB7XG4gICAgICAgICAgICBpZiAoZW5naW5lICYmIGVuZ2luZS5yZW5kZXIgJiYgZW5naW5lLnJlbmRlci5jYW52YXMpIHtcbiAgICAgICAgICAgICAgICBtb3VzZSA9IE1vdXNlLmNyZWF0ZShlbmdpbmUucmVuZGVyLmNhbnZhcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgbW91c2UgPSBNb3VzZS5jcmVhdGUob3B0aW9ucy5lbGVtZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbW91c2UgPSBNb3VzZS5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICBDb21tb24ubG9nKCdNb3VzZUNvbnN0cmFpbnQuY3JlYXRlOiBvcHRpb25zLm1vdXNlIHdhcyB1bmRlZmluZWQsIG9wdGlvbnMuZWxlbWVudCB3YXMgdW5kZWZpbmVkLCBtYXkgbm90IGZ1bmN0aW9uIGFzIGV4cGVjdGVkJywgJ3dhcm4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25zdHJhaW50ID0gQ29uc3RyYWludC5jcmVhdGUoeyBcbiAgICAgICAgICAgIGxhYmVsOiAnTW91c2UgQ29uc3RyYWludCcsXG4gICAgICAgICAgICBwb2ludEE6IG1vdXNlLnBvc2l0aW9uLFxuICAgICAgICAgICAgcG9pbnRCOiB7IHg6IDAsIHk6IDAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogMC4wMSwgXG4gICAgICAgICAgICBzdGlmZm5lc3M6IDAuMSxcbiAgICAgICAgICAgIGFuZ3VsYXJTdGlmZm5lc3M6IDEsXG4gICAgICAgICAgICByZW5kZXI6IHtcbiAgICAgICAgICAgICAgICBzdHJva2VTdHlsZTogJyM5MEVFOTAnLFxuICAgICAgICAgICAgICAgIGxpbmVXaWR0aDogM1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICB0eXBlOiAnbW91c2VDb25zdHJhaW50JyxcbiAgICAgICAgICAgIG1vdXNlOiBtb3VzZSxcbiAgICAgICAgICAgIGVsZW1lbnQ6IG51bGwsXG4gICAgICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICAgICAgY29uc3RyYWludDogY29uc3RyYWludCxcbiAgICAgICAgICAgIGNvbGxpc2lvbkZpbHRlcjoge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAweDAwMDEsXG4gICAgICAgICAgICAgICAgbWFzazogMHhGRkZGRkZGRixcbiAgICAgICAgICAgICAgICBncm91cDogMFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBtb3VzZUNvbnN0cmFpbnQgPSBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICBFdmVudHMub24oZW5naW5lLCAndGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGFsbEJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMoZW5naW5lLndvcmxkKTtcbiAgICAgICAgICAgIE1vdXNlQ29uc3RyYWludC51cGRhdGUobW91c2VDb25zdHJhaW50LCBhbGxCb2RpZXMpO1xuICAgICAgICAgICAgX3RyaWdnZXJFdmVudHMobW91c2VDb25zdHJhaW50KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIG1vdXNlQ29uc3RyYWludDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgZ2l2ZW4gbW91c2UgY29uc3RyYWludC5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtNb3VzZUNvbnN0cmFpbnR9IG1vdXNlQ29uc3RyYWludFxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKi9cbiAgICBNb3VzZUNvbnN0cmFpbnQudXBkYXRlID0gZnVuY3Rpb24obW91c2VDb25zdHJhaW50LCBib2RpZXMpIHtcbiAgICAgICAgdmFyIG1vdXNlID0gbW91c2VDb25zdHJhaW50Lm1vdXNlLFxuICAgICAgICAgICAgY29uc3RyYWludCA9IG1vdXNlQ29uc3RyYWludC5jb25zdHJhaW50LFxuICAgICAgICAgICAgYm9keSA9IG1vdXNlQ29uc3RyYWludC5ib2R5O1xuXG4gICAgICAgIGlmIChtb3VzZS5idXR0b24gPT09IDApIHtcbiAgICAgICAgICAgIGlmICghY29uc3RyYWludC5ib2R5Qikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZHkgPSBib2RpZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChCb3VuZHMuY29udGFpbnMoYm9keS5ib3VuZHMsIG1vdXNlLnBvc2l0aW9uKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAmJiBEZXRlY3Rvci5jYW5Db2xsaWRlKGJvZHkuY29sbGlzaW9uRmlsdGVyLCBtb3VzZUNvbnN0cmFpbnQuY29sbGlzaW9uRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGJvZHkucGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBqIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJ0ID0gYm9keS5wYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoVmVydGljZXMuY29udGFpbnMocGFydC52ZXJ0aWNlcywgbW91c2UucG9zaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQucG9pbnRBID0gbW91c2UucG9zaXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQuYm9keUIgPSBtb3VzZUNvbnN0cmFpbnQuYm9keSA9IGJvZHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQucG9pbnRCID0geyB4OiBtb3VzZS5wb3NpdGlvbi54IC0gYm9keS5wb3NpdGlvbi54LCB5OiBtb3VzZS5wb3NpdGlvbi55IC0gYm9keS5wb3NpdGlvbi55IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnQuYW5nbGVCID0gYm9keS5hbmdsZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBTbGVlcGluZy5zZXQoYm9keSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFdmVudHMudHJpZ2dlcihtb3VzZUNvbnN0cmFpbnQsICdzdGFydGRyYWcnLCB7IG1vdXNlOiBtb3VzZSwgYm9keTogYm9keSB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFNsZWVwaW5nLnNldChjb25zdHJhaW50LmJvZHlCLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY29uc3RyYWludC5wb2ludEEgPSBtb3VzZS5wb3NpdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0cmFpbnQuYm9keUIgPSBtb3VzZUNvbnN0cmFpbnQuYm9keSA9IG51bGw7XG4gICAgICAgICAgICBjb25zdHJhaW50LnBvaW50QiA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChib2R5KVxuICAgICAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKG1vdXNlQ29uc3RyYWludCwgJ2VuZGRyYWcnLCB7IG1vdXNlOiBtb3VzZSwgYm9keTogYm9keSB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUcmlnZ2VycyBtb3VzZSBjb25zdHJhaW50IGV2ZW50cy5cbiAgICAgKiBAbWV0aG9kIF90cmlnZ2VyRXZlbnRzXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge21vdXNlfSBtb3VzZUNvbnN0cmFpbnRcbiAgICAgKi9cbiAgICB2YXIgX3RyaWdnZXJFdmVudHMgPSBmdW5jdGlvbihtb3VzZUNvbnN0cmFpbnQpIHtcbiAgICAgICAgdmFyIG1vdXNlID0gbW91c2VDb25zdHJhaW50Lm1vdXNlLFxuICAgICAgICAgICAgbW91c2VFdmVudHMgPSBtb3VzZS5zb3VyY2VFdmVudHM7XG5cbiAgICAgICAgaWYgKG1vdXNlRXZlbnRzLm1vdXNlbW92ZSlcbiAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKG1vdXNlQ29uc3RyYWludCwgJ21vdXNlbW92ZScsIHsgbW91c2U6IG1vdXNlIH0pO1xuXG4gICAgICAgIGlmIChtb3VzZUV2ZW50cy5tb3VzZWRvd24pXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihtb3VzZUNvbnN0cmFpbnQsICdtb3VzZWRvd24nLCB7IG1vdXNlOiBtb3VzZSB9KTtcblxuICAgICAgICBpZiAobW91c2VFdmVudHMubW91c2V1cClcbiAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKG1vdXNlQ29uc3RyYWludCwgJ21vdXNldXAnLCB7IG1vdXNlOiBtb3VzZSB9KTtcblxuICAgICAgICAvLyByZXNldCB0aGUgbW91c2Ugc3RhdGUgcmVhZHkgZm9yIHRoZSBuZXh0IHN0ZXBcbiAgICAgICAgTW91c2UuY2xlYXJTb3VyY2VFdmVudHMobW91c2UpO1xuICAgIH07XG5cbiAgICAvKlxuICAgICpcbiAgICAqICBFdmVudHMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIHRoZSBtb3VzZSBoYXMgbW92ZWQgKG9yIGEgdG91Y2ggbW92ZXMpIGR1cmluZyB0aGUgbGFzdCBzdGVwXG4gICAgKlxuICAgICogQGV2ZW50IG1vdXNlbW92ZVxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHttb3VzZX0gZXZlbnQubW91c2UgVGhlIGVuZ2luZSdzIG1vdXNlIGluc3RhbmNlXG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgd2hlbiB0aGUgbW91c2UgaXMgZG93biAob3IgYSB0b3VjaCBoYXMgc3RhcnRlZCkgZHVyaW5nIHRoZSBsYXN0IHN0ZXBcbiAgICAqXG4gICAgKiBAZXZlbnQgbW91c2Vkb3duXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge21vdXNlfSBldmVudC5tb3VzZSBUaGUgZW5naW5lJ3MgbW91c2UgaW5zdGFuY2VcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIHRoZSBtb3VzZSBpcyB1cCAob3IgYSB0b3VjaCBoYXMgZW5kZWQpIGR1cmluZyB0aGUgbGFzdCBzdGVwXG4gICAgKlxuICAgICogQGV2ZW50IG1vdXNldXBcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bW91c2V9IGV2ZW50Lm1vdXNlIFRoZSBlbmdpbmUncyBtb3VzZSBpbnN0YW5jZVxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIHdoZW4gdGhlIHVzZXIgc3RhcnRzIGRyYWdnaW5nIGEgYm9keVxuICAgICpcbiAgICAqIEBldmVudCBzdGFydGRyYWdcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bW91c2V9IGV2ZW50Lm1vdXNlIFRoZSBlbmdpbmUncyBtb3VzZSBpbnN0YW5jZVxuICAgICogQHBhcmFtIHtib2R5fSBldmVudC5ib2R5IFRoZSBib2R5IGJlaW5nIGRyYWdnZWRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCB3aGVuIHRoZSB1c2VyIGVuZHMgZHJhZ2dpbmcgYSBib2R5XG4gICAgKlxuICAgICogQGV2ZW50IGVuZGRyYWdcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bW91c2V9IGV2ZW50Lm1vdXNlIFRoZSBlbmdpbmUncyBtb3VzZSBpbnN0YW5jZVxuICAgICogQHBhcmFtIHtib2R5fSBldmVudC5ib2R5IFRoZSBib2R5IHRoYXQgaGFzIHN0b3BwZWQgYmVpbmcgZHJhZ2dlZFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKlxuICAgICpcbiAgICAqICBQcm9wZXJ0aWVzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFN0cmluZ2AgZGVub3RpbmcgdGhlIHR5cGUgb2Ygb2JqZWN0LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHR5cGVcbiAgICAgKiBAdHlwZSBzdHJpbmdcbiAgICAgKiBAZGVmYXVsdCBcImNvbnN0cmFpbnRcIlxuICAgICAqIEByZWFkT25seVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBNb3VzZWAgaW5zdGFuY2UgaW4gdXNlLiBJZiBub3Qgc3VwcGxpZWQgaW4gYE1vdXNlQ29uc3RyYWludC5jcmVhdGVgLCBvbmUgd2lsbCBiZSBjcmVhdGVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IG1vdXNlXG4gICAgICogQHR5cGUgbW91c2VcbiAgICAgKiBAZGVmYXVsdCBtb3VzZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBCb2R5YCB0aGF0IGlzIGN1cnJlbnRseSBiZWluZyBtb3ZlZCBieSB0aGUgdXNlciwgb3IgYG51bGxgIGlmIG5vIGJvZHkuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgYm9keVxuICAgICAqIEB0eXBlIGJvZHlcbiAgICAgKiBAZGVmYXVsdCBudWxsXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgYENvbnN0cmFpbnRgIG9iamVjdCB0aGF0IGlzIHVzZWQgdG8gbW92ZSB0aGUgYm9keSBkdXJpbmcgaW50ZXJhY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29uc3RyYWludFxuICAgICAqIEB0eXBlIGNvbnN0cmFpbnRcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGBPYmplY3RgIHRoYXQgc3BlY2lmaWVzIHRoZSBjb2xsaXNpb24gZmlsdGVyIHByb3BlcnRpZXMuXG4gICAgICogVGhlIGNvbGxpc2lvbiBmaWx0ZXIgYWxsb3dzIHRoZSB1c2VyIHRvIGRlZmluZSB3aGljaCB0eXBlcyBvZiBib2R5IHRoaXMgbW91c2UgY29uc3RyYWludCBjYW4gaW50ZXJhY3Qgd2l0aC5cbiAgICAgKiBTZWUgYGJvZHkuY29sbGlzaW9uRmlsdGVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb2xsaXNpb25GaWx0ZXJcbiAgICAgKiBAdHlwZSBvYmplY3RcbiAgICAgKi9cblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Db21tb25gIG1vZHVsZSBjb250YWlucyB1dGlsaXR5IGZ1bmN0aW9ucyB0aGF0IGFyZSBjb21tb24gdG8gYWxsIG1vZHVsZXMuXG4qXG4qIEBjbGFzcyBDb21tb25cbiovXG5cbnZhciBDb21tb24gPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21tb247XG5cbihmdW5jdGlvbigpIHtcblxuICAgIENvbW1vbi5fbmV4dElkID0gMDtcbiAgICBDb21tb24uX3NlZWQgPSAwO1xuXG4gICAgLyoqXG4gICAgICogRXh0ZW5kcyB0aGUgb2JqZWN0IGluIHRoZSBmaXJzdCBhcmd1bWVudCB1c2luZyB0aGUgb2JqZWN0IGluIHRoZSBzZWNvbmQgYXJndW1lbnQuXG4gICAgICogQG1ldGhvZCBleHRlbmRcbiAgICAgKiBAcGFyYW0ge30gb2JqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBkZWVwXG4gICAgICogQHJldHVybiB7fSBvYmogZXh0ZW5kZWRcbiAgICAgKi9cbiAgICBDb21tb24uZXh0ZW5kID0gZnVuY3Rpb24ob2JqLCBkZWVwKSB7XG4gICAgICAgIHZhciBhcmdzU3RhcnQsXG4gICAgICAgICAgICBhcmdzLFxuICAgICAgICAgICAgZGVlcENsb25lO1xuXG4gICAgICAgIGlmICh0eXBlb2YgZGVlcCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICBhcmdzU3RhcnQgPSAyO1xuICAgICAgICAgICAgZGVlcENsb25lID0gZGVlcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFyZ3NTdGFydCA9IDE7XG4gICAgICAgICAgICBkZWVwQ2xvbmUgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgYXJnc1N0YXJ0KTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBhcmdzW2ldO1xuXG4gICAgICAgICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlZXBDbG9uZSAmJiBzb3VyY2VbcHJvcF0gJiYgc291cmNlW3Byb3BdLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb2JqW3Byb3BdIHx8IG9ialtwcm9wXS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gb2JqW3Byb3BdIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbW1vbi5leHRlbmQob2JqW3Byb3BdLCBkZWVwQ2xvbmUsIHNvdXJjZVtwcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBjbG9uZSBvZiB0aGUgb2JqZWN0LCBpZiBkZWVwIGlzIHRydWUgcmVmZXJlbmNlcyB3aWxsIGFsc28gYmUgY2xvbmVkLlxuICAgICAqIEBtZXRob2QgY2xvbmVcbiAgICAgKiBAcGFyYW0ge30gb2JqXG4gICAgICogQHBhcmFtIHtib29sfSBkZWVwXG4gICAgICogQHJldHVybiB7fSBvYmogY2xvbmVkXG4gICAgICovXG4gICAgQ29tbW9uLmNsb25lID0gZnVuY3Rpb24ob2JqLCBkZWVwKSB7XG4gICAgICAgIHJldHVybiBDb21tb24uZXh0ZW5kKHt9LCBkZWVwLCBvYmopO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsaXN0IG9mIGtleXMgZm9yIHRoZSBnaXZlbiBvYmplY3QuXG4gICAgICogQG1ldGhvZCBrZXlzXG4gICAgICogQHBhcmFtIHt9IG9ialxuICAgICAqIEByZXR1cm4ge3N0cmluZ1tdfSBrZXlzXG4gICAgICovXG4gICAgQ29tbW9uLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKVxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG5cbiAgICAgICAgLy8gYXZvaWQgaGFzT3duUHJvcGVydHkgZm9yIHBlcmZvcm1hbmNlXG4gICAgICAgIHZhciBrZXlzID0gW107XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopXG4gICAgICAgICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGxpc3Qgb2YgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gb2JqZWN0LlxuICAgICAqIEBtZXRob2QgdmFsdWVzXG4gICAgICogQHBhcmFtIHt9IG9ialxuICAgICAqIEByZXR1cm4ge2FycmF5fSBBcnJheSBvZiB0aGUgb2JqZWN0cyBwcm9wZXJ0eSB2YWx1ZXNcbiAgICAgKi9cbiAgICBDb21tb24udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChPYmplY3Qua2V5cykge1xuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzLnB1c2gob2JqW2tleXNbaV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGF2b2lkIGhhc093blByb3BlcnR5IGZvciBwZXJmb3JtYW5jZVxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKVxuICAgICAgICAgICAgdmFsdWVzLnB1c2gob2JqW2tleV0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgaGV4IGNvbG91ciBzdHJpbmcgbWFkZSBieSBsaWdodGVuaW5nIG9yIGRhcmtlbmluZyBjb2xvciBieSBwZXJjZW50LlxuICAgICAqIEBtZXRob2Qgc2hhZGVDb2xvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJjZW50XG4gICAgICogQHJldHVybiB7c3RyaW5nfSBBIGhleCBjb2xvdXJcbiAgICAgKi9cbiAgICBDb21tb24uc2hhZGVDb2xvciA9IGZ1bmN0aW9uKGNvbG9yLCBwZXJjZW50KSB7ICAgXG4gICAgICAgIC8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvNTU2MDI0OC9wcm9ncmFtbWF0aWNhbGx5LWxpZ2h0ZW4tb3ItZGFya2VuLWEtaGV4LWNvbG9yXG4gICAgICAgIHZhciBjb2xvckludGVnZXIgPSBwYXJzZUludChjb2xvci5zbGljZSgxKSwxNiksIFxuICAgICAgICAgICAgYW1vdW50ID0gTWF0aC5yb3VuZCgyLjU1ICogcGVyY2VudCksIFxuICAgICAgICAgICAgUiA9IChjb2xvckludGVnZXIgPj4gMTYpICsgYW1vdW50LCBcbiAgICAgICAgICAgIEIgPSAoY29sb3JJbnRlZ2VyID4+IDggJiAweDAwRkYpICsgYW1vdW50LCBcbiAgICAgICAgICAgIEcgPSAoY29sb3JJbnRlZ2VyICYgMHgwMDAwRkYpICsgYW1vdW50O1xuICAgICAgICByZXR1cm4gXCIjXCIgKyAoMHgxMDAwMDAwICsgKFIgPCAyNTUgPyBSIDwgMSA/IDAgOiBSIDoyNTUpICogMHgxMDAwMCBcbiAgICAgICAgICAgICAgICArIChCIDwgMjU1ID8gQiA8IDEgPyAwIDogQiA6IDI1NSkgKiAweDEwMCBcbiAgICAgICAgICAgICAgICArIChHIDwgMjU1ID8gRyA8IDEgPyAwIDogRyA6IDI1NSkpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2h1ZmZsZXMgdGhlIGdpdmVuIGFycmF5IGluLXBsYWNlLlxuICAgICAqIFRoZSBmdW5jdGlvbiB1c2VzIGEgc2VlZGVkIHJhbmRvbSBnZW5lcmF0b3IuXG4gICAgICogQG1ldGhvZCBzaHVmZmxlXG4gICAgICogQHBhcmFtIHthcnJheX0gYXJyYXlcbiAgICAgKiBAcmV0dXJuIHthcnJheX0gYXJyYXkgc2h1ZmZsZWQgcmFuZG9tbHlcbiAgICAgKi9cbiAgICBDb21tb24uc2h1ZmZsZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSBhcnJheS5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgICAgICB2YXIgaiA9IE1hdGguZmxvb3IoQ29tbW9uLnJhbmRvbSgpICogKGkgKyAxKSk7XG4gICAgICAgICAgICB2YXIgdGVtcCA9IGFycmF5W2ldO1xuICAgICAgICAgICAgYXJyYXlbaV0gPSBhcnJheVtqXTtcbiAgICAgICAgICAgIGFycmF5W2pdID0gdGVtcDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXJyYXk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJhbmRvbWx5IGNob29zZXMgYSB2YWx1ZSBmcm9tIGEgbGlzdCB3aXRoIGVxdWFsIHByb2JhYmlsaXR5LlxuICAgICAqIFRoZSBmdW5jdGlvbiB1c2VzIGEgc2VlZGVkIHJhbmRvbSBnZW5lcmF0b3IuXG4gICAgICogQG1ldGhvZCBjaG9vc2VcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBjaG9pY2VzXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBBIHJhbmRvbSBjaG9pY2Ugb2JqZWN0IGZyb20gdGhlIGFycmF5XG4gICAgICovXG4gICAgQ29tbW9uLmNob29zZSA9IGZ1bmN0aW9uKGNob2ljZXMpIHtcbiAgICAgICAgcmV0dXJuIGNob2ljZXNbTWF0aC5mbG9vcihDb21tb24ucmFuZG9tKCkgKiBjaG9pY2VzLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIG9iamVjdCBpcyBhIEhUTUxFbGVtZW50LCBvdGhlcndpc2UgZmFsc2UuXG4gICAgICogQG1ldGhvZCBpc0VsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgSFRNTEVsZW1lbnQsIG90aGVyd2lzZSBmYWxzZVxuICAgICAqL1xuICAgIENvbW1vbi5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiBvYmo9PT1cIm9iamVjdFwiKSAmJlxuICAgICAgICAgICAgICAob2JqLm5vZGVUeXBlPT09MSkgJiYgKHR5cGVvZiBvYmouc3R5bGUgPT09IFwib2JqZWN0XCIpICYmXG4gICAgICAgICAgICAgICh0eXBlb2Ygb2JqLm93bmVyRG9jdW1lbnQgPT09XCJvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBvYmplY3QgaXMgYW4gYXJyYXkuXG4gICAgICogQG1ldGhvZCBpc0FycmF5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9ialxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBpcyBhbiBhcnJheSwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgICovXG4gICAgQ29tbW9uLmlzQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgZ2l2ZW4gdmFsdWUgY2xhbXBlZCBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZS5cbiAgICAgKiBAbWV0aG9kIGNsYW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1pblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXhcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSB2YWx1ZSBjbGFtcGVkIGJldHdlZW4gbWluIGFuZCBtYXggaW5jbHVzaXZlXG4gICAgICovXG4gICAgQ29tbW9uLmNsYW1wID0gZnVuY3Rpb24odmFsdWUsIG1pbiwgbWF4KSB7XG4gICAgICAgIGlmICh2YWx1ZSA8IG1pbilcbiAgICAgICAgICAgIHJldHVybiBtaW47XG4gICAgICAgIGlmICh2YWx1ZSA+IG1heClcbiAgICAgICAgICAgIHJldHVybiBtYXg7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIHNpZ24gb2YgdGhlIGdpdmVuIHZhbHVlLlxuICAgICAqIEBtZXRob2Qgc2lnblxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZVxuICAgICAqIEByZXR1cm4ge251bWJlcn0gLTEgaWYgbmVnYXRpdmUsICsxIGlmIDAgb3IgcG9zaXRpdmVcbiAgICAgKi9cbiAgICBDb21tb24uc2lnbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA8IDAgPyAtMSA6IDE7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHRpbWVzdGFtcCAoaGlnaC1yZXMgaWYgYXZhaWxhYmxlKS5cbiAgICAgKiBAbWV0aG9kIG5vd1xuICAgICAqIEByZXR1cm4ge251bWJlcn0gdGhlIGN1cnJlbnQgdGltZXN0YW1wIChoaWdoLXJlcyBpZiBhdmFpbGFibGUpXG4gICAgICovXG4gICAgQ29tbW9uLm5vdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzIyMTI5NC9ob3ctZG8teW91LWdldC1hLXRpbWVzdGFtcC1pbi1qYXZhc2NyaXB0XG4gICAgICAgIC8vIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL2Rhdmlkd2F0ZXJzdG9uLzI5ODI1MzFcblxuICAgICAgICB2YXIgcGVyZm9ybWFuY2UgPSB3aW5kb3cucGVyZm9ybWFuY2UgfHwge307XG5cbiAgICAgICAgcGVyZm9ybWFuY2Uubm93ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdyAgICB8fFxuICAgICAgICAgICAgcGVyZm9ybWFuY2Uud2Via2l0Tm93ICAgICB8fFxuICAgICAgICAgICAgcGVyZm9ybWFuY2UubXNOb3cgICAgICAgICB8fFxuICAgICAgICAgICAgcGVyZm9ybWFuY2Uub05vdyAgICAgICAgICB8fFxuICAgICAgICAgICAgcGVyZm9ybWFuY2UubW96Tm93ICAgICAgICB8fFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7IHJldHVybiArKG5ldyBEYXRlKCkpOyB9O1xuICAgICAgICB9KSgpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH07XG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgcmFuZG9tIHZhbHVlIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBhIG1heGltdW0gdmFsdWUgaW5jbHVzaXZlLlxuICAgICAqIFRoZSBmdW5jdGlvbiB1c2VzIGEgc2VlZGVkIHJhbmRvbSBnZW5lcmF0b3IuXG4gICAgICogQG1ldGhvZCByYW5kb21cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWluXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1heFxuICAgICAqIEByZXR1cm4ge251bWJlcn0gQSByYW5kb20gbnVtYmVyIGJldHdlZW4gbWluIGFuZCBtYXggaW5jbHVzaXZlXG4gICAgICovXG4gICAgQ29tbW9uLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgICAgIG1pbiA9ICh0eXBlb2YgbWluICE9PSBcInVuZGVmaW5lZFwiKSA/IG1pbiA6IDA7XG4gICAgICAgIG1heCA9ICh0eXBlb2YgbWF4ICE9PSBcInVuZGVmaW5lZFwiKSA/IG1heCA6IDE7XG4gICAgICAgIHJldHVybiBtaW4gKyBfc2VlZGVkUmFuZG9tKCkgKiAobWF4IC0gbWluKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYSBDU1MgaGV4IGNvbG91ciBzdHJpbmcgaW50byBhbiBpbnRlZ2VyLlxuICAgICAqIEBtZXRob2QgY29sb3JUb051bWJlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb2xvclN0cmluZ1xuICAgICAqIEByZXR1cm4ge251bWJlcn0gQW4gaW50ZWdlciByZXByZXNlbnRpbmcgdGhlIENTUyBoZXggc3RyaW5nXG4gICAgICovXG4gICAgQ29tbW9uLmNvbG9yVG9OdW1iZXIgPSBmdW5jdGlvbihjb2xvclN0cmluZykge1xuICAgICAgICBjb2xvclN0cmluZyA9IGNvbG9yU3RyaW5nLnJlcGxhY2UoJyMnLCcnKTtcblxuICAgICAgICBpZiAoY29sb3JTdHJpbmcubGVuZ3RoID09IDMpIHtcbiAgICAgICAgICAgIGNvbG9yU3RyaW5nID0gY29sb3JTdHJpbmcuY2hhckF0KDApICsgY29sb3JTdHJpbmcuY2hhckF0KDApXG4gICAgICAgICAgICAgICAgICAgICAgICArIGNvbG9yU3RyaW5nLmNoYXJBdCgxKSArIGNvbG9yU3RyaW5nLmNoYXJBdCgxKVxuICAgICAgICAgICAgICAgICAgICAgICAgKyBjb2xvclN0cmluZy5jaGFyQXQoMikgKyBjb2xvclN0cmluZy5jaGFyQXQoMik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoY29sb3JTdHJpbmcsIDE2KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSB3cmFwcGVyIGZvciBjb25zb2xlLmxvZywgZm9yIHByb3ZpZGluZyBlcnJvcnMgYW5kIHdhcm5pbmdzLlxuICAgICAqIEBtZXRob2QgbG9nXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAqL1xuICAgIENvbW1vbi5sb2cgPSBmdW5jdGlvbihtZXNzYWdlLCB0eXBlKSB7XG4gICAgICAgIGlmICghY29uc29sZSB8fCAhY29uc29sZS5sb2cgfHwgIWNvbnNvbGUud2FybilcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcblxuICAgICAgICBjYXNlICd3YXJuJzpcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignTWF0dGVyLmpzOicsIG1lc3NhZ2UpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdNYXR0ZXIuanM6JywgbWVzc2FnZSk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIG5leHQgdW5pcXVlIHNlcXVlbnRpYWwgSUQuXG4gICAgICogQG1ldGhvZCBuZXh0SWRcbiAgICAgKiBAcmV0dXJuIHtOdW1iZXJ9IFVuaXF1ZSBzZXF1ZW50aWFsIElEXG4gICAgICovXG4gICAgQ29tbW9uLm5leHRJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gQ29tbW9uLl9uZXh0SWQrKztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBjcm9zcyBicm93c2VyIGNvbXBhdGlibGUgaW5kZXhPZiBpbXBsZW1lbnRhdGlvbi5cbiAgICAgKiBAbWV0aG9kIGluZGV4T2ZcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBoYXlzdGFja1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBuZWVkbGVcbiAgICAgKi9cbiAgICBDb21tb24uaW5kZXhPZiA9IGZ1bmN0aW9uKGhheXN0YWNrLCBuZWVkbGUpIHtcbiAgICAgICAgaWYgKGhheXN0YWNrLmluZGV4T2YpXG4gICAgICAgICAgICByZXR1cm4gaGF5c3RhY2suaW5kZXhPZihuZWVkbGUpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGF5c3RhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChoYXlzdGFja1tpXSA9PT0gbmVlZGxlKVxuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG5cbiAgICB2YXIgX3NlZWRlZFJhbmRvbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9uZ3J5bWFuLzM4MzA0ODlcbiAgICAgICAgQ29tbW9uLl9zZWVkID0gKENvbW1vbi5fc2VlZCAqIDkzMDEgKyA0OTI5NykgJSAyMzMyODA7XG4gICAgICAgIHJldHVybiBDb21tb24uX3NlZWQgLyAyMzMyODA7XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5FbmdpbmVgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGVuZ2luZXMuXG4qIEFuIGVuZ2luZSBpcyBhIGNvbnRyb2xsZXIgdGhhdCBtYW5hZ2VzIHVwZGF0aW5nIHRoZSBzaW11bGF0aW9uIG9mIHRoZSB3b3JsZC5cbiogU2VlIGBNYXR0ZXIuUnVubmVyYCBmb3IgYW4gb3B0aW9uYWwgZ2FtZSBsb29wIHV0aWxpdHkuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBFbmdpbmVcbiovXG5cbnZhciBFbmdpbmUgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbmdpbmU7XG5cbnZhciBXb3JsZCA9IHJlcXVpcmUoJy4uL2JvZHkvV29ybGQnKTtcbnZhciBTbGVlcGluZyA9IHJlcXVpcmUoJy4vU2xlZXBpbmcnKTtcbnZhciBSZXNvbHZlciA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9SZXNvbHZlcicpO1xudmFyIFJlbmRlciA9IHJlcXVpcmUoJy4uL3JlbmRlci9SZW5kZXInKTtcbnZhciBQYWlycyA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9QYWlycycpO1xudmFyIE1ldHJpY3MgPSByZXF1aXJlKCcuL01ldHJpY3MnKTtcbnZhciBHcmlkID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL0dyaWQnKTtcbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL0V2ZW50cycpO1xudmFyIENvbXBvc2l0ZSA9IHJlcXVpcmUoJy4uL2JvZHkvQ29tcG9zaXRlJyk7XG52YXIgQ29uc3RyYWludCA9IHJlcXVpcmUoJy4uL2NvbnN0cmFpbnQvQ29uc3RyYWludCcpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4vQ29tbW9uJyk7XG52YXIgQm9keSA9IHJlcXVpcmUoJy4uL2JvZHkvQm9keScpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IGVuZ2luZS4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogQWxsIHByb3BlcnRpZXMgaGF2ZSBkZWZhdWx0IHZhbHVlcywgYW5kIG1hbnkgYXJlIHByZS1jYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gb3RoZXIgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEByZXR1cm4ge2VuZ2luZX0gZW5naW5lXG4gICAgICovXG4gICAgRW5naW5lLmNyZWF0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gb3B0aW9ucyBtYXkgYmUgcGFzc2VkIGFzIHRoZSBmaXJzdCAoYW5kIG9ubHkpIGFyZ3VtZW50XG4gICAgICAgIG9wdGlvbnMgPSBDb21tb24uaXNFbGVtZW50KGVsZW1lbnQpID8gb3B0aW9ucyA6IGVsZW1lbnQ7XG4gICAgICAgIGVsZW1lbnQgPSBDb21tb24uaXNFbGVtZW50KGVsZW1lbnQpID8gZWxlbWVudCA6IG51bGw7XG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgIGlmIChlbGVtZW50IHx8IG9wdGlvbnMucmVuZGVyKSB7XG4gICAgICAgICAgICBDb21tb24ubG9nKCdFbmdpbmUuY3JlYXRlOiBlbmdpbmUucmVuZGVyIGlzIGRlcHJlY2F0ZWQgKHNlZSBkb2NzKScsICd3YXJuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbkl0ZXJhdGlvbnM6IDYsXG4gICAgICAgICAgICB2ZWxvY2l0eUl0ZXJhdGlvbnM6IDQsXG4gICAgICAgICAgICBjb25zdHJhaW50SXRlcmF0aW9uczogMixcbiAgICAgICAgICAgIGVuYWJsZVNsZWVwaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGV2ZW50czogW10sXG4gICAgICAgICAgICB0aW1pbmc6IHtcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IDAsXG4gICAgICAgICAgICAgICAgdGltZVNjYWxlOiAxXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYnJvYWRwaGFzZToge1xuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IEdyaWRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgZW5naW5lID0gQ29tbW9uLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gQGRlcHJlY2F0ZWRcbiAgICAgICAgaWYgKGVsZW1lbnQgfHwgZW5naW5lLnJlbmRlcikge1xuICAgICAgICAgICAgdmFyIHJlbmRlckRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogUmVuZGVyXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbmdpbmUucmVuZGVyID0gQ29tbW9uLmV4dGVuZChyZW5kZXJEZWZhdWx0cywgZW5naW5lLnJlbmRlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBAZGVwcmVjYXRlZFxuICAgICAgICBpZiAoZW5naW5lLnJlbmRlciAmJiBlbmdpbmUucmVuZGVyLmNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgIGVuZ2luZS5yZW5kZXIgPSBlbmdpbmUucmVuZGVyLmNvbnRyb2xsZXIuY3JlYXRlKGVuZ2luZS5yZW5kZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQGRlcHJlY2F0ZWRcbiAgICAgICAgaWYgKGVuZ2luZS5yZW5kZXIpIHtcbiAgICAgICAgICAgIGVuZ2luZS5yZW5kZXIuZW5naW5lID0gZW5naW5lO1xuICAgICAgICB9XG5cbiAgICAgICAgZW5naW5lLndvcmxkID0gb3B0aW9ucy53b3JsZCB8fCBXb3JsZC5jcmVhdGUoZW5naW5lLndvcmxkKTtcbiAgICAgICAgZW5naW5lLnBhaXJzID0gUGFpcnMuY3JlYXRlKCk7XG4gICAgICAgIGVuZ2luZS5icm9hZHBoYXNlID0gZW5naW5lLmJyb2FkcGhhc2UuY29udHJvbGxlci5jcmVhdGUoZW5naW5lLmJyb2FkcGhhc2UpO1xuICAgICAgICBlbmdpbmUubWV0cmljcyA9IGVuZ2luZS5tZXRyaWNzIHx8IHsgZXh0ZW5kZWQ6IGZhbHNlIH07XG5cbiAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgIGVuZ2luZS5tZXRyaWNzID0gTWV0cmljcy5jcmVhdGUoZW5naW5lLm1ldHJpY3MpO1xuICAgICAgICAvLyBAZW5kaWZcblxuICAgICAgICByZXR1cm4gZW5naW5lO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNb3ZlcyB0aGUgc2ltdWxhdGlvbiBmb3J3YXJkIGluIHRpbWUgYnkgYGRlbHRhYCBtcy5cbiAgICAgKiBUaGUgYGNvcnJlY3Rpb25gIGFyZ3VtZW50IGlzIGFuIG9wdGlvbmFsIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSB0aW1lIGNvcnJlY3Rpb24gZmFjdG9yIHRvIGFwcGx5IHRvIHRoZSB1cGRhdGUuXG4gICAgICogVGhpcyBjYW4gaGVscCBpbXByb3ZlIHRoZSBhY2N1cmFjeSBvZiB0aGUgc2ltdWxhdGlvbiBpbiBjYXNlcyB3aGVyZSBgZGVsdGFgIGlzIGNoYW5naW5nIGJldHdlZW4gdXBkYXRlcy5cbiAgICAgKiBUaGUgdmFsdWUgb2YgYGNvcnJlY3Rpb25gIGlzIGRlZmluZWQgYXMgYGRlbHRhIC8gbGFzdERlbHRhYCwgaS5lLiB0aGUgcGVyY2VudGFnZSBjaGFuZ2Ugb2YgYGRlbHRhYCBvdmVyIHRoZSBsYXN0IHN0ZXAuXG4gICAgICogVGhlcmVmb3JlIHRoZSB2YWx1ZSBpcyBhbHdheXMgYDFgIChubyBjb3JyZWN0aW9uKSB3aGVuIGBkZWx0YWAgY29uc3RhbnQgKG9yIHdoZW4gbm8gY29ycmVjdGlvbiBpcyBkZXNpcmVkLCB3aGljaCBpcyB0aGUgZGVmYXVsdCkuXG4gICAgICogU2VlIHRoZSBwYXBlciBvbiA8YSBocmVmPVwiaHR0cDovL2xvbmVzb2NrLm5ldC9hcnRpY2xlL3ZlcmxldC5odG1sXCI+VGltZSBDb3JyZWN0ZWQgVmVybGV0PC9hPiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIFRyaWdnZXJzIGBiZWZvcmVVcGRhdGVgIGFuZCBgYWZ0ZXJVcGRhdGVgIGV2ZW50cy5cbiAgICAgKiBUcmlnZ2VycyBgY29sbGlzaW9uU3RhcnRgLCBgY29sbGlzaW9uQWN0aXZlYCBhbmQgYGNvbGxpc2lvbkVuZGAgZXZlbnRzLlxuICAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbZGVsdGE9MTYuNjY2XVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbY29ycmVjdGlvbj0xXVxuICAgICAqL1xuICAgIEVuZ2luZS51cGRhdGUgPSBmdW5jdGlvbihlbmdpbmUsIGRlbHRhLCBjb3JyZWN0aW9uKSB7XG4gICAgICAgIGRlbHRhID0gZGVsdGEgfHwgMTAwMCAvIDYwO1xuICAgICAgICBjb3JyZWN0aW9uID0gY29ycmVjdGlvbiB8fCAxO1xuXG4gICAgICAgIHZhciB3b3JsZCA9IGVuZ2luZS53b3JsZCxcbiAgICAgICAgICAgIHRpbWluZyA9IGVuZ2luZS50aW1pbmcsXG4gICAgICAgICAgICBicm9hZHBoYXNlID0gZW5naW5lLmJyb2FkcGhhc2UsXG4gICAgICAgICAgICBicm9hZHBoYXNlUGFpcnMgPSBbXSxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgLy8gaW5jcmVtZW50IHRpbWVzdGFtcFxuICAgICAgICB0aW1pbmcudGltZXN0YW1wICs9IGRlbHRhICogdGltaW5nLnRpbWVTY2FsZTtcblxuICAgICAgICAvLyBjcmVhdGUgYW4gZXZlbnQgb2JqZWN0XG4gICAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogdGltaW5nLnRpbWVzdGFtcFxuICAgICAgICB9O1xuXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKGVuZ2luZSwgJ2JlZm9yZVVwZGF0ZScsIGV2ZW50KTtcblxuICAgICAgICAvLyBnZXQgbGlzdHMgb2YgYWxsIGJvZGllcyBhbmQgY29uc3RyYWludHMsIG5vIG1hdHRlciB3aGF0IGNvbXBvc2l0ZXMgdGhleSBhcmUgaW5cbiAgICAgICAgdmFyIGFsbEJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMod29ybGQpLFxuICAgICAgICAgICAgYWxsQ29uc3RyYWludHMgPSBDb21wb3NpdGUuYWxsQ29uc3RyYWludHMod29ybGQpO1xuXG4gICAgICAgIC8vIEBpZiBERUJVR1xuICAgICAgICAvLyByZXNldCBtZXRyaWNzIGxvZ2dpbmdcbiAgICAgICAgTWV0cmljcy5yZXNldChlbmdpbmUubWV0cmljcyk7XG4gICAgICAgIC8vIEBlbmRpZlxuXG4gICAgICAgIC8vIGlmIHNsZWVwaW5nIGVuYWJsZWQsIGNhbGwgdGhlIHNsZWVwaW5nIGNvbnRyb2xsZXJcbiAgICAgICAgaWYgKGVuZ2luZS5lbmFibGVTbGVlcGluZylcbiAgICAgICAgICAgIFNsZWVwaW5nLnVwZGF0ZShhbGxCb2RpZXMsIHRpbWluZy50aW1lU2NhbGUpO1xuXG4gICAgICAgIC8vIGFwcGxpZXMgZ3Jhdml0eSB0byBhbGwgYm9kaWVzXG4gICAgICAgIF9ib2RpZXNBcHBseUdyYXZpdHkoYWxsQm9kaWVzLCB3b3JsZC5ncmF2aXR5KTtcblxuICAgICAgICAvLyB1cGRhdGUgYWxsIGJvZHkgcG9zaXRpb24gYW5kIHJvdGF0aW9uIGJ5IGludGVncmF0aW9uXG4gICAgICAgIF9ib2RpZXNVcGRhdGUoYWxsQm9kaWVzLCBkZWx0YSwgdGltaW5nLnRpbWVTY2FsZSwgY29ycmVjdGlvbiwgd29ybGQuYm91bmRzKTtcblxuICAgICAgICAvLyB1cGRhdGUgYWxsIGNvbnN0cmFpbnRzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbmdpbmUuY29uc3RyYWludEl0ZXJhdGlvbnM7IGkrKykge1xuICAgICAgICAgICAgQ29uc3RyYWludC5zb2x2ZUFsbChhbGxDb25zdHJhaW50cywgdGltaW5nLnRpbWVTY2FsZSk7XG4gICAgICAgIH1cbiAgICAgICAgQ29uc3RyYWludC5wb3N0U29sdmVBbGwoYWxsQm9kaWVzKTtcblxuICAgICAgICAvLyBicm9hZHBoYXNlIHBhc3M6IGZpbmQgcG90ZW50aWFsIGNvbGxpc2lvbiBwYWlyc1xuICAgICAgICBpZiAoYnJvYWRwaGFzZS5jb250cm9sbGVyKSB7XG5cbiAgICAgICAgICAgIC8vIGlmIHdvcmxkIGlzIGRpcnR5LCB3ZSBtdXN0IGZsdXNoIHRoZSB3aG9sZSBncmlkXG4gICAgICAgICAgICBpZiAod29ybGQuaXNNb2RpZmllZClcbiAgICAgICAgICAgICAgICBicm9hZHBoYXNlLmNvbnRyb2xsZXIuY2xlYXIoYnJvYWRwaGFzZSk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgZ3JpZCBidWNrZXRzIGJhc2VkIG9uIGN1cnJlbnQgYm9kaWVzXG4gICAgICAgICAgICBicm9hZHBoYXNlLmNvbnRyb2xsZXIudXBkYXRlKGJyb2FkcGhhc2UsIGFsbEJvZGllcywgZW5naW5lLCB3b3JsZC5pc01vZGlmaWVkKTtcbiAgICAgICAgICAgIGJyb2FkcGhhc2VQYWlycyA9IGJyb2FkcGhhc2UucGFpcnNMaXN0O1xuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBpZiBubyBicm9hZHBoYXNlIHNldCwgd2UganVzdCBwYXNzIGFsbCBib2RpZXNcbiAgICAgICAgICAgIGJyb2FkcGhhc2VQYWlycyA9IGFsbEJvZGllcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIGFsbCBjb21wb3NpdGUgbW9kaWZpZWQgZmxhZ3NcbiAgICAgICAgaWYgKHdvcmxkLmlzTW9kaWZpZWQpIHtcbiAgICAgICAgICAgIENvbXBvc2l0ZS5zZXRNb2RpZmllZCh3b3JsZCwgZmFsc2UsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5hcnJvd3BoYXNlIHBhc3M6IGZpbmQgYWN0dWFsIGNvbGxpc2lvbnMsIHRoZW4gY3JlYXRlIG9yIHVwZGF0ZSBjb2xsaXNpb24gcGFpcnNcbiAgICAgICAgdmFyIGNvbGxpc2lvbnMgPSBicm9hZHBoYXNlLmRldGVjdG9yKGJyb2FkcGhhc2VQYWlycywgZW5naW5lKTtcblxuICAgICAgICAvLyB1cGRhdGUgY29sbGlzaW9uIHBhaXJzXG4gICAgICAgIHZhciBwYWlycyA9IGVuZ2luZS5wYWlycyxcbiAgICAgICAgICAgIHRpbWVzdGFtcCA9IHRpbWluZy50aW1lc3RhbXA7XG4gICAgICAgIFBhaXJzLnVwZGF0ZShwYWlycywgY29sbGlzaW9ucywgdGltZXN0YW1wKTtcbiAgICAgICAgUGFpcnMucmVtb3ZlT2xkKHBhaXJzLCB0aW1lc3RhbXApO1xuXG4gICAgICAgIC8vIHdha2UgdXAgYm9kaWVzIGludm9sdmVkIGluIGNvbGxpc2lvbnNcbiAgICAgICAgaWYgKGVuZ2luZS5lbmFibGVTbGVlcGluZylcbiAgICAgICAgICAgIFNsZWVwaW5nLmFmdGVyQ29sbGlzaW9ucyhwYWlycy5saXN0LCB0aW1pbmcudGltZVNjYWxlKTtcblxuICAgICAgICAvLyB0cmlnZ2VyIGNvbGxpc2lvbiBldmVudHNcbiAgICAgICAgaWYgKHBhaXJzLmNvbGxpc2lvblN0YXJ0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdjb2xsaXNpb25TdGFydCcsIHsgcGFpcnM6IHBhaXJzLmNvbGxpc2lvblN0YXJ0IH0pO1xuXG4gICAgICAgIC8vIGl0ZXJhdGl2ZWx5IHJlc29sdmUgcG9zaXRpb24gYmV0d2VlbiBjb2xsaXNpb25zXG4gICAgICAgIFJlc29sdmVyLnByZVNvbHZlUG9zaXRpb24ocGFpcnMubGlzdCk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBlbmdpbmUucG9zaXRpb25JdGVyYXRpb25zOyBpKyspIHtcbiAgICAgICAgICAgIFJlc29sdmVyLnNvbHZlUG9zaXRpb24ocGFpcnMubGlzdCwgdGltaW5nLnRpbWVTY2FsZSk7XG4gICAgICAgIH1cbiAgICAgICAgUmVzb2x2ZXIucG9zdFNvbHZlUG9zaXRpb24oYWxsQm9kaWVzKTtcblxuICAgICAgICAvLyBpdGVyYXRpdmVseSByZXNvbHZlIHZlbG9jaXR5IGJldHdlZW4gY29sbGlzaW9uc1xuICAgICAgICBSZXNvbHZlci5wcmVTb2x2ZVZlbG9jaXR5KHBhaXJzLmxpc3QpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZW5naW5lLnZlbG9jaXR5SXRlcmF0aW9uczsgaSsrKSB7XG4gICAgICAgICAgICBSZXNvbHZlci5zb2x2ZVZlbG9jaXR5KHBhaXJzLmxpc3QsIHRpbWluZy50aW1lU2NhbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdHJpZ2dlciBjb2xsaXNpb24gZXZlbnRzXG4gICAgICAgIGlmIChwYWlycy5jb2xsaXNpb25BY3RpdmUubGVuZ3RoID4gMClcbiAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKGVuZ2luZSwgJ2NvbGxpc2lvbkFjdGl2ZScsIHsgcGFpcnM6IHBhaXJzLmNvbGxpc2lvbkFjdGl2ZSB9KTtcblxuICAgICAgICBpZiAocGFpcnMuY29sbGlzaW9uRW5kLmxlbmd0aCA+IDApXG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdjb2xsaXNpb25FbmQnLCB7IHBhaXJzOiBwYWlycy5jb2xsaXNpb25FbmQgfSk7XG5cbiAgICAgICAgLy8gQGlmIERFQlVHXG4gICAgICAgIC8vIHVwZGF0ZSBtZXRyaWNzIGxvZ1xuICAgICAgICBNZXRyaWNzLnVwZGF0ZShlbmdpbmUubWV0cmljcywgZW5naW5lKTtcbiAgICAgICAgLy8gQGVuZGlmXG5cbiAgICAgICAgLy8gY2xlYXIgZm9yY2UgYnVmZmVyc1xuICAgICAgICBfYm9kaWVzQ2xlYXJGb3JjZXMoYWxsQm9kaWVzKTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdhZnRlclVwZGF0ZScsIGV2ZW50KTtcblxuICAgICAgICByZXR1cm4gZW5naW5lO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogTWVyZ2VzIHR3byBlbmdpbmVzIGJ5IGtlZXBpbmcgdGhlIGNvbmZpZ3VyYXRpb24gb2YgYGVuZ2luZUFgIGJ1dCByZXBsYWNpbmcgdGhlIHdvcmxkIHdpdGggdGhlIG9uZSBmcm9tIGBlbmdpbmVCYC5cbiAgICAgKiBAbWV0aG9kIG1lcmdlXG4gICAgICogQHBhcmFtIHtlbmdpbmV9IGVuZ2luZUFcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lQlxuICAgICAqL1xuICAgIEVuZ2luZS5tZXJnZSA9IGZ1bmN0aW9uKGVuZ2luZUEsIGVuZ2luZUIpIHtcbiAgICAgICAgQ29tbW9uLmV4dGVuZChlbmdpbmVBLCBlbmdpbmVCKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChlbmdpbmVCLndvcmxkKSB7XG4gICAgICAgICAgICBlbmdpbmVBLndvcmxkID0gZW5naW5lQi53b3JsZDtcblxuICAgICAgICAgICAgRW5naW5lLmNsZWFyKGVuZ2luZUEpO1xuXG4gICAgICAgICAgICB2YXIgYm9kaWVzID0gQ29tcG9zaXRlLmFsbEJvZGllcyhlbmdpbmVBLndvcmxkKTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcbiAgICAgICAgICAgICAgICBTbGVlcGluZy5zZXQoYm9keSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJvZHkuaWQgPSBDb21tb24ubmV4dElkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBlbmdpbmUgaW5jbHVkaW5nIHRoZSB3b3JsZCwgcGFpcnMgYW5kIGJyb2FkcGhhc2UuXG4gICAgICogQG1ldGhvZCBjbGVhclxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKi9cbiAgICBFbmdpbmUuY2xlYXIgPSBmdW5jdGlvbihlbmdpbmUpIHtcbiAgICAgICAgdmFyIHdvcmxkID0gZW5naW5lLndvcmxkO1xuICAgICAgICBcbiAgICAgICAgUGFpcnMuY2xlYXIoZW5naW5lLnBhaXJzKTtcblxuICAgICAgICB2YXIgYnJvYWRwaGFzZSA9IGVuZ2luZS5icm9hZHBoYXNlO1xuICAgICAgICBpZiAoYnJvYWRwaGFzZS5jb250cm9sbGVyKSB7XG4gICAgICAgICAgICB2YXIgYm9kaWVzID0gQ29tcG9zaXRlLmFsbEJvZGllcyh3b3JsZCk7XG4gICAgICAgICAgICBicm9hZHBoYXNlLmNvbnRyb2xsZXIuY2xlYXIoYnJvYWRwaGFzZSk7XG4gICAgICAgICAgICBicm9hZHBoYXNlLmNvbnRyb2xsZXIudXBkYXRlKGJyb2FkcGhhc2UsIGJvZGllcywgZW5naW5lLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBaZXJvZXMgdGhlIGBib2R5LmZvcmNlYCBhbmQgYGJvZHkudG9ycXVlYCBmb3JjZSBidWZmZXJzLlxuICAgICAqIEBtZXRob2QgYm9kaWVzQ2xlYXJGb3JjZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKi9cbiAgICB2YXIgX2JvZGllc0NsZWFyRm9yY2VzID0gZnVuY3Rpb24oYm9kaWVzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgLy8gcmVzZXQgZm9yY2UgYnVmZmVyc1xuICAgICAgICAgICAgYm9keS5mb3JjZS54ID0gMDtcbiAgICAgICAgICAgIGJvZHkuZm9yY2UueSA9IDA7XG4gICAgICAgICAgICBib2R5LnRvcnF1ZSA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwbHlzIGEgbWFzcyBkZXBlbmRhbnQgZm9yY2UgdG8gYWxsIGdpdmVuIGJvZGllcy5cbiAgICAgKiBAbWV0aG9kIGJvZGllc0FwcGx5R3Jhdml0eVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBncmF2aXR5XG4gICAgICovXG4gICAgdmFyIF9ib2RpZXNBcHBseUdyYXZpdHkgPSBmdW5jdGlvbihib2RpZXMsIGdyYXZpdHkpIHtcbiAgICAgICAgdmFyIGdyYXZpdHlTY2FsZSA9IHR5cGVvZiBncmF2aXR5LnNjYWxlICE9PSAndW5kZWZpbmVkJyA/IGdyYXZpdHkuc2NhbGUgOiAwLjAwMTtcblxuICAgICAgICBpZiAoKGdyYXZpdHkueCA9PT0gMCAmJiBncmF2aXR5LnkgPT09IDApIHx8IGdyYXZpdHlTY2FsZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmIChib2R5LmlzU3RhdGljIHx8IGJvZHkuaXNTbGVlcGluZylcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gYXBwbHkgZ3Jhdml0eVxuICAgICAgICAgICAgYm9keS5mb3JjZS55ICs9IGJvZHkubWFzcyAqIGdyYXZpdHkueSAqIGdyYXZpdHlTY2FsZTtcbiAgICAgICAgICAgIGJvZHkuZm9yY2UueCArPSBib2R5Lm1hc3MgKiBncmF2aXR5LnggKiBncmF2aXR5U2NhbGU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwbHlzIGBCb2R5LnVwZGF0ZWAgdG8gYWxsIGdpdmVuIGBib2RpZXNgLlxuICAgICAqIEBtZXRob2QgdXBkYXRlQWxsXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlbHRhVGltZSBcbiAgICAgKiBUaGUgYW1vdW50IG9mIHRpbWUgZWxhcHNlZCBiZXR3ZWVuIHVwZGF0ZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZVNjYWxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvcnJlY3Rpb24gXG4gICAgICogVGhlIFZlcmxldCBjb3JyZWN0aW9uIGZhY3RvciAoZGVsdGFUaW1lIC8gbGFzdERlbHRhVGltZSlcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gd29ybGRCb3VuZHNcbiAgICAgKi9cbiAgICB2YXIgX2JvZGllc1VwZGF0ZSA9IGZ1bmN0aW9uKGJvZGllcywgZGVsdGFUaW1lLCB0aW1lU2NhbGUsIGNvcnJlY3Rpb24sIHdvcmxkQm91bmRzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgaWYgKGJvZHkuaXNTdGF0aWMgfHwgYm9keS5pc1NsZWVwaW5nKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBCb2R5LnVwZGF0ZShib2R5LCBkZWx0YVRpbWUsIHRpbWVTY2FsZSwgY29ycmVjdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQW4gYWxpYXMgZm9yIGBSdW5uZXIucnVuYCwgc2VlIGBNYXR0ZXIuUnVubmVyYCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICAgKiBAbWV0aG9kIHJ1blxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQganVzdCBiZWZvcmUgYW4gdXBkYXRlXG4gICAgKlxuICAgICogQGV2ZW50IGJlZm9yZVVwZGF0ZVxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYWZ0ZXIgZW5naW5lIHVwZGF0ZSBhbmQgYWxsIGNvbGxpc2lvbiBldmVudHNcbiAgICAqXG4gICAgKiBAZXZlbnQgYWZ0ZXJVcGRhdGVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIGVuZ2luZSB1cGRhdGUsIHByb3ZpZGVzIGEgbGlzdCBvZiBhbGwgcGFpcnMgdGhhdCBoYXZlIHN0YXJ0ZWQgdG8gY29sbGlkZSBpbiB0aGUgY3VycmVudCB0aWNrIChpZiBhbnkpXG4gICAgKlxuICAgICogQGV2ZW50IGNvbGxpc2lvblN0YXJ0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge30gZXZlbnQucGFpcnMgTGlzdCBvZiBhZmZlY3RlZCBwYWlyc1xuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYWZ0ZXIgZW5naW5lIHVwZGF0ZSwgcHJvdmlkZXMgYSBsaXN0IG9mIGFsbCBwYWlycyB0aGF0IGFyZSBjb2xsaWRpbmcgaW4gdGhlIGN1cnJlbnQgdGljayAoaWYgYW55KVxuICAgICpcbiAgICAqIEBldmVudCBjb2xsaXNpb25BY3RpdmVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5wYWlycyBMaXN0IG9mIGFmZmVjdGVkIHBhaXJzXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhZnRlciBlbmdpbmUgdXBkYXRlLCBwcm92aWRlcyBhIGxpc3Qgb2YgYWxsIHBhaXJzIHRoYXQgaGF2ZSBlbmRlZCBjb2xsaXNpb24gaW4gdGhlIGN1cnJlbnQgdGljayAoaWYgYW55KVxuICAgICpcbiAgICAqIEBldmVudCBjb2xsaXNpb25FbmRcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7fSBldmVudC5wYWlycyBMaXN0IG9mIGFmZmVjdGVkIHBhaXJzXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSBudW1iZXIgb2YgcG9zaXRpb24gaXRlcmF0aW9ucyB0byBwZXJmb3JtIGVhY2ggdXBkYXRlLlxuICAgICAqIFRoZSBoaWdoZXIgdGhlIHZhbHVlLCB0aGUgaGlnaGVyIHF1YWxpdHkgdGhlIHNpbXVsYXRpb24gd2lsbCBiZSBhdCB0aGUgZXhwZW5zZSBvZiBwZXJmb3JtYW5jZS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBwb3NpdGlvbkl0ZXJhdGlvbnNcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCA2XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSBudW1iZXIgb2YgdmVsb2NpdHkgaXRlcmF0aW9ucyB0byBwZXJmb3JtIGVhY2ggdXBkYXRlLlxuICAgICAqIFRoZSBoaWdoZXIgdGhlIHZhbHVlLCB0aGUgaGlnaGVyIHF1YWxpdHkgdGhlIHNpbXVsYXRpb24gd2lsbCBiZSBhdCB0aGUgZXhwZW5zZSBvZiBwZXJmb3JtYW5jZS5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB2ZWxvY2l0eUl0ZXJhdGlvbnNcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCA0XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBbiBpbnRlZ2VyIGBOdW1iZXJgIHRoYXQgc3BlY2lmaWVzIHRoZSBudW1iZXIgb2YgY29uc3RyYWludCBpdGVyYXRpb25zIHRvIHBlcmZvcm0gZWFjaCB1cGRhdGUuXG4gICAgICogVGhlIGhpZ2hlciB0aGUgdmFsdWUsIHRoZSBoaWdoZXIgcXVhbGl0eSB0aGUgc2ltdWxhdGlvbiB3aWxsIGJlIGF0IHRoZSBleHBlbnNlIG9mIHBlcmZvcm1hbmNlLlxuICAgICAqIFRoZSBkZWZhdWx0IHZhbHVlIG9mIGAyYCBpcyB1c3VhbGx5IHZlcnkgYWRlcXVhdGUuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY29uc3RyYWludEl0ZXJhdGlvbnNcbiAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgKiBAZGVmYXVsdCAyXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBzcGVjaWZpZXMgd2hldGhlciB0aGUgZW5naW5lIHNob3VsZCBhbGxvdyBzbGVlcGluZyB2aWEgdGhlIGBNYXR0ZXIuU2xlZXBpbmdgIG1vZHVsZS5cbiAgICAgKiBTbGVlcGluZyBjYW4gaW1wcm92ZSBzdGFiaWxpdHkgYW5kIHBlcmZvcm1hbmNlLCBidXQgb2Z0ZW4gYXQgdGhlIGV4cGVuc2Ugb2YgYWNjdXJhY3kuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgZW5hYmxlU2xlZXBpbmdcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEFuIGBPYmplY3RgIGNvbnRhaW5pbmcgcHJvcGVydGllcyByZWdhcmRpbmcgdGhlIHRpbWluZyBzeXN0ZW1zIG9mIHRoZSBlbmdpbmUuIFxuICAgICAqXG4gICAgICogQHByb3BlcnR5IHRpbWluZ1xuICAgICAqIEB0eXBlIG9iamVjdFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgTnVtYmVyYCB0aGF0IHNwZWNpZmllcyB0aGUgZ2xvYmFsIHNjYWxpbmcgZmFjdG9yIG9mIHRpbWUgZm9yIGFsbCBib2RpZXMuXG4gICAgICogQSB2YWx1ZSBvZiBgMGAgZnJlZXplcyB0aGUgc2ltdWxhdGlvbi5cbiAgICAgKiBBIHZhbHVlIG9mIGAwLjFgIGdpdmVzIGEgc2xvdy1tb3Rpb24gZWZmZWN0LlxuICAgICAqIEEgdmFsdWUgb2YgYDEuMmAgZ2l2ZXMgYSBzcGVlZC11cCBlZmZlY3QuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdGltaW5nLnRpbWVTY2FsZVxuICAgICAqIEB0eXBlIG51bWJlclxuICAgICAqIEBkZWZhdWx0IDFcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgdGhlIGN1cnJlbnQgc2ltdWxhdGlvbi10aW1lIGluIG1pbGxpc2Vjb25kcyBzdGFydGluZyBmcm9tIGAwYC4gXG4gICAgICogSXQgaXMgaW5jcmVtZW50ZWQgb24gZXZlcnkgYEVuZ2luZS51cGRhdGVgIGJ5IHRoZSBnaXZlbiBgZGVsdGFgIGFyZ3VtZW50LiBcbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB0aW1pbmcudGltZXN0YW1wXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMFxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW5zdGFuY2Ugb2YgYSBgUmVuZGVyYCBjb250cm9sbGVyLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBhIGBNYXR0ZXIuUmVuZGVyYCBpbnN0YW5jZSBjcmVhdGVkIGJ5IGBFbmdpbmUuY3JlYXRlYC5cbiAgICAgKiBPbmUgbWF5IGFsc28gZGV2ZWxvcCBhIGN1c3RvbSByZW5kZXJlciBtb2R1bGUgYmFzZWQgb24gYE1hdHRlci5SZW5kZXJgIGFuZCBwYXNzIGFuIGluc3RhbmNlIG9mIGl0IHRvIGBFbmdpbmUuY3JlYXRlYCB2aWEgYG9wdGlvbnMucmVuZGVyYC5cbiAgICAgKlxuICAgICAqIEEgbWluaW1hbCBjdXN0b20gcmVuZGVyZXIgb2JqZWN0IG11c3QgZGVmaW5lIGF0IGxlYXN0IHRocmVlIGZ1bmN0aW9uczogYGNyZWF0ZWAsIGBjbGVhcmAgYW5kIGB3b3JsZGAgKHNlZSBgTWF0dGVyLlJlbmRlcmApLlxuICAgICAqIEl0IGlzIGFsc28gcG9zc2libGUgdG8gaW5zdGVhZCBwYXNzIHRoZSBfbW9kdWxlXyByZWZlcmVuY2UgdmlhIGBvcHRpb25zLnJlbmRlci5jb250cm9sbGVyYCBhbmQgYEVuZ2luZS5jcmVhdGVgIHdpbGwgaW5zdGFudGlhdGUgb25lIGZvciB5b3UuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgcmVuZGVyXG4gICAgICogQHR5cGUgcmVuZGVyXG4gICAgICogQGRlcHJlY2F0ZWQgc2VlIERlbW8uanMgZm9yIGFuIGV4YW1wbGUgb2YgY3JlYXRpbmcgYSByZW5kZXJlclxuICAgICAqIEBkZWZhdWx0IGEgTWF0dGVyLlJlbmRlciBpbnN0YW5jZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQW4gaW5zdGFuY2Ugb2YgYSBicm9hZHBoYXNlIGNvbnRyb2xsZXIuIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGEgYE1hdHRlci5HcmlkYCBpbnN0YW5jZSBjcmVhdGVkIGJ5IGBFbmdpbmUuY3JlYXRlYC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBicm9hZHBoYXNlXG4gICAgICogQHR5cGUgZ3JpZFxuICAgICAqIEBkZWZhdWx0IGEgTWF0dGVyLkdyaWQgaW5zdGFuY2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYFdvcmxkYCBjb21wb3NpdGUgb2JqZWN0IHRoYXQgd2lsbCBjb250YWluIGFsbCBzaW11bGF0ZWQgYm9kaWVzIGFuZCBjb25zdHJhaW50cy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSB3b3JsZFxuICAgICAqIEB0eXBlIHdvcmxkXG4gICAgICogQGRlZmF1bHQgYSBNYXR0ZXIuV29ybGQgaW5zdGFuY2VcbiAgICAgKi9cblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5FdmVudHNgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIHRvIGZpcmUgYW5kIGxpc3RlbiB0byBldmVudHMgb24gb3RoZXIgb2JqZWN0cy5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIEV2ZW50c1xuKi9cblxudmFyIEV2ZW50cyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50cztcblxudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4vQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0byB0aGUgZ2l2ZW4gb2JqZWN0J3MgYGV2ZW50TmFtZWAuXG4gICAgICogQG1ldGhvZCBvblxuICAgICAqIEBwYXJhbSB7fSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgRXZlbnRzLm9uID0gZnVuY3Rpb24ob2JqZWN0LCBldmVudE5hbWVzLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgbmFtZXMgPSBldmVudE5hbWVzLnNwbGl0KCcgJyksXG4gICAgICAgICAgICBuYW1lO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgICAgICAgIG9iamVjdC5ldmVudHMgPSBvYmplY3QuZXZlbnRzIHx8IHt9O1xuICAgICAgICAgICAgb2JqZWN0LmV2ZW50c1tuYW1lXSA9IG9iamVjdC5ldmVudHNbbmFtZV0gfHwgW107XG4gICAgICAgICAgICBvYmplY3QuZXZlbnRzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIHRoZSBnaXZlbiBldmVudCBjYWxsYmFjay4gSWYgbm8gY2FsbGJhY2ssIGNsZWFycyBhbGwgY2FsbGJhY2tzIGluIGBldmVudE5hbWVzYC4gSWYgbm8gYGV2ZW50TmFtZXNgLCBjbGVhcnMgYWxsIGV2ZW50cy5cbiAgICAgKiBAbWV0aG9kIG9mZlxuICAgICAqIEBwYXJhbSB7fSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnROYW1lc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgRXZlbnRzLm9mZiA9IGZ1bmN0aW9uKG9iamVjdCwgZXZlbnROYW1lcywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCFldmVudE5hbWVzKSB7XG4gICAgICAgICAgICBvYmplY3QuZXZlbnRzID0ge307XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYW5kbGUgRXZlbnRzLm9mZihvYmplY3QsIGNhbGxiYWNrKVxuICAgICAgICBpZiAodHlwZW9mIGV2ZW50TmFtZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gZXZlbnROYW1lcztcbiAgICAgICAgICAgIGV2ZW50TmFtZXMgPSBDb21tb24ua2V5cyhvYmplY3QuZXZlbnRzKS5qb2luKCcgJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmFtZXMgPSBldmVudE5hbWVzLnNwbGl0KCcgJyk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IG9iamVjdC5ldmVudHNbbmFtZXNbaV1dLFxuICAgICAgICAgICAgICAgIG5ld0NhbGxiYWNrcyA9IFtdO1xuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2sgJiYgY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBjYWxsYmFja3MubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrc1tqXSAhPT0gY2FsbGJhY2spXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDYWxsYmFja3MucHVzaChjYWxsYmFja3Nbal0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb2JqZWN0LmV2ZW50c1tuYW1lc1tpXV0gPSBuZXdDYWxsYmFja3M7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgYWxsIHRoZSBjYWxsYmFja3Mgc3Vic2NyaWJlZCB0byB0aGUgZ2l2ZW4gb2JqZWN0J3MgYGV2ZW50TmFtZWAsIGluIHRoZSBvcmRlciB0aGV5IHN1YnNjcmliZWQsIGlmIGFueS5cbiAgICAgKiBAbWV0aG9kIHRyaWdnZXJcbiAgICAgKiBAcGFyYW0ge30gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50TmFtZXNcbiAgICAgKiBAcGFyYW0ge30gZXZlbnRcbiAgICAgKi9cbiAgICBFdmVudHMudHJpZ2dlciA9IGZ1bmN0aW9uKG9iamVjdCwgZXZlbnROYW1lcywgZXZlbnQpIHtcbiAgICAgICAgdmFyIG5hbWVzLFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIGNhbGxiYWNrcyxcbiAgICAgICAgICAgIGV2ZW50Q2xvbmU7XG5cbiAgICAgICAgaWYgKG9iamVjdC5ldmVudHMpIHtcbiAgICAgICAgICAgIGlmICghZXZlbnQpXG4gICAgICAgICAgICAgICAgZXZlbnQgPSB7fTtcblxuICAgICAgICAgICAgbmFtZXMgPSBldmVudE5hbWVzLnNwbGl0KCcgJyk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tzID0gb2JqZWN0LmV2ZW50c1tuYW1lXTtcblxuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRDbG9uZSA9IENvbW1vbi5jbG9uZShldmVudCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBldmVudENsb25lLm5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICBldmVudENsb25lLnNvdXJjZSA9IG9iamVjdDtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNhbGxiYWNrcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzW2pdLmFwcGx5KG9iamVjdCwgW2V2ZW50Q2xvbmVdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbn0pKCk7XG4iLCIvLyBAaWYgREVCVUdcbi8qKlxuKiBfSW50ZXJuYWwgQ2xhc3NfLCBub3QgZ2VuZXJhbGx5IHVzZWQgb3V0c2lkZSBvZiB0aGUgZW5naW5lJ3MgaW50ZXJuYWxzLlxuKlxuKi9cblxudmFyIE1ldHJpY3MgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZXRyaWNzO1xuXG52YXIgQ29tcG9zaXRlID0gcmVxdWlyZSgnLi4vYm9keS9Db21wb3NpdGUnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IG1ldHJpY3MuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEByZXR1cm4ge21ldHJpY3N9IEEgbmV3IG1ldHJpY3NcbiAgICAgKi9cbiAgICBNZXRyaWNzLmNyZWF0ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgZXh0ZW5kZWQ6IGZhbHNlLFxuICAgICAgICAgICAgbmFycm93RGV0ZWN0aW9uczogMCxcbiAgICAgICAgICAgIG5hcnJvd3BoYXNlVGVzdHM6IDAsXG4gICAgICAgICAgICBuYXJyb3dSZXVzZTogMCxcbiAgICAgICAgICAgIG5hcnJvd1JldXNlQ291bnQ6IDAsXG4gICAgICAgICAgICBtaWRwaGFzZVRlc3RzOiAwLFxuICAgICAgICAgICAgYnJvYWRwaGFzZVRlc3RzOiAwLFxuICAgICAgICAgICAgbmFycm93RWZmOiAwLjAwMDEsXG4gICAgICAgICAgICBtaWRFZmY6IDAuMDAwMSxcbiAgICAgICAgICAgIGJyb2FkRWZmOiAwLjAwMDEsXG4gICAgICAgICAgICBjb2xsaXNpb25zOiAwLFxuICAgICAgICAgICAgYnVja2V0czogMCxcbiAgICAgICAgICAgIGJvZGllczogMCxcbiAgICAgICAgICAgIHBhaXJzOiAwXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIGZhbHNlLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVzZXRzIG1ldHJpY3MuXG4gICAgICogQG1ldGhvZCByZXNldFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHttZXRyaWNzfSBtZXRyaWNzXG4gICAgICovXG4gICAgTWV0cmljcy5yZXNldCA9IGZ1bmN0aW9uKG1ldHJpY3MpIHtcbiAgICAgICAgaWYgKG1ldHJpY3MuZXh0ZW5kZWQpIHtcbiAgICAgICAgICAgIG1ldHJpY3MubmFycm93RGV0ZWN0aW9ucyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd3BoYXNlVGVzdHMgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5uYXJyb3dSZXVzZSA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd1JldXNlQ291bnQgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5taWRwaGFzZVRlc3RzID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MuYnJvYWRwaGFzZVRlc3RzID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MubmFycm93RWZmID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MubWlkRWZmID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MuYnJvYWRFZmYgPSAwO1xuICAgICAgICAgICAgbWV0cmljcy5jb2xsaXNpb25zID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MuYnVja2V0cyA9IDA7XG4gICAgICAgICAgICBtZXRyaWNzLnBhaXJzID0gMDtcbiAgICAgICAgICAgIG1ldHJpY3MuYm9kaWVzID0gMDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIG1ldHJpY3MuXG4gICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7bWV0cmljc30gbWV0cmljc1xuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKi9cbiAgICBNZXRyaWNzLnVwZGF0ZSA9IGZ1bmN0aW9uKG1ldHJpY3MsIGVuZ2luZSkge1xuICAgICAgICBpZiAobWV0cmljcy5leHRlbmRlZCkge1xuICAgICAgICAgICAgdmFyIHdvcmxkID0gZW5naW5lLndvcmxkLFxuICAgICAgICAgICAgICAgIGJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMod29ybGQpO1xuXG4gICAgICAgICAgICBtZXRyaWNzLmNvbGxpc2lvbnMgPSBtZXRyaWNzLm5hcnJvd0RldGVjdGlvbnM7XG4gICAgICAgICAgICBtZXRyaWNzLnBhaXJzID0gZW5naW5lLnBhaXJzLmxpc3QubGVuZ3RoO1xuICAgICAgICAgICAgbWV0cmljcy5ib2RpZXMgPSBib2RpZXMubGVuZ3RoO1xuICAgICAgICAgICAgbWV0cmljcy5taWRFZmYgPSAobWV0cmljcy5uYXJyb3dEZXRlY3Rpb25zIC8gKG1ldHJpY3MubWlkcGhhc2VUZXN0cyB8fCAxKSkudG9GaXhlZCgyKTtcbiAgICAgICAgICAgIG1ldHJpY3MubmFycm93RWZmID0gKG1ldHJpY3MubmFycm93RGV0ZWN0aW9ucyAvIChtZXRyaWNzLm5hcnJvd3BoYXNlVGVzdHMgfHwgMSkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBtZXRyaWNzLmJyb2FkRWZmID0gKDEgLSAobWV0cmljcy5icm9hZHBoYXNlVGVzdHMgLyAoYm9kaWVzLmxlbmd0aCB8fCAxKSkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICBtZXRyaWNzLm5hcnJvd1JldXNlID0gKG1ldHJpY3MubmFycm93UmV1c2VDb3VudCAvIChtZXRyaWNzLm5hcnJvd3BoYXNlVGVzdHMgfHwgMSkpLnRvRml4ZWQoMik7XG4gICAgICAgICAgICAvL3ZhciBicm9hZHBoYXNlID0gZW5naW5lLmJyb2FkcGhhc2VbZW5naW5lLmJyb2FkcGhhc2UuY3VycmVudF07XG4gICAgICAgICAgICAvL2lmIChicm9hZHBoYXNlLmluc3RhbmNlKVxuICAgICAgICAgICAgLy8gICAgbWV0cmljcy5idWNrZXRzID0gQ29tbW9uLmtleXMoYnJvYWRwaGFzZS5pbnN0YW5jZS5idWNrZXRzKS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuLy8gQGVuZGlmXG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuTW91c2VgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIG1vdXNlIGlucHV0cy5cbipcbiogQGNsYXNzIE1vdXNlXG4qL1xuXG52YXIgTW91c2UgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZTtcblxudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBtb3VzZSBpbnB1dC5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnRcbiAgICAgKiBAcmV0dXJuIHttb3VzZX0gQSBuZXcgbW91c2VcbiAgICAgKi9cbiAgICBNb3VzZS5jcmVhdGUgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICAgIHZhciBtb3VzZSA9IHt9O1xuXG4gICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgQ29tbW9uLmxvZygnTW91c2UuY3JlYXRlOiBlbGVtZW50IHdhcyB1bmRlZmluZWQsIGRlZmF1bHRpbmcgdG8gZG9jdW1lbnQuYm9keScsICd3YXJuJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIG1vdXNlLmVsZW1lbnQgPSBlbGVtZW50IHx8IGRvY3VtZW50LmJvZHk7XG4gICAgICAgIG1vdXNlLmFic29sdXRlID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgIG1vdXNlLnBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgIG1vdXNlLm1vdXNlZG93blBvc2l0aW9uID0geyB4OiAwLCB5OiAwIH07XG4gICAgICAgIG1vdXNlLm1vdXNldXBQb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xuICAgICAgICBtb3VzZS5vZmZzZXQgPSB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgbW91c2Uuc2NhbGUgPSB7IHg6IDEsIHk6IDEgfTtcbiAgICAgICAgbW91c2Uud2hlZWxEZWx0YSA9IDA7XG4gICAgICAgIG1vdXNlLmJ1dHRvbiA9IC0xO1xuICAgICAgICBtb3VzZS5waXhlbFJhdGlvID0gbW91c2UuZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGl4ZWwtcmF0aW8nKSB8fCAxO1xuXG4gICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cyA9IHtcbiAgICAgICAgICAgIG1vdXNlbW92ZTogbnVsbCxcbiAgICAgICAgICAgIG1vdXNlZG93bjogbnVsbCxcbiAgICAgICAgICAgIG1vdXNldXA6IG51bGwsXG4gICAgICAgICAgICBtb3VzZXdoZWVsOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtb3VzZS5tb3VzZW1vdmUgPSBmdW5jdGlvbihldmVudCkgeyBcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IF9nZXRSZWxhdGl2ZU1vdXNlUG9zaXRpb24oZXZlbnQsIG1vdXNlLmVsZW1lbnQsIG1vdXNlLnBpeGVsUmF0aW8pLFxuICAgICAgICAgICAgICAgIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcztcblxuICAgICAgICAgICAgaWYgKHRvdWNoZXMpIHtcbiAgICAgICAgICAgICAgICBtb3VzZS5idXR0b24gPSAwO1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vdXNlLmFic29sdXRlLnggPSBwb3NpdGlvbi54O1xuICAgICAgICAgICAgbW91c2UuYWJzb2x1dGUueSA9IHBvc2l0aW9uLnk7XG4gICAgICAgICAgICBtb3VzZS5wb3NpdGlvbi54ID0gbW91c2UuYWJzb2x1dGUueCAqIG1vdXNlLnNjYWxlLnggKyBtb3VzZS5vZmZzZXQueDtcbiAgICAgICAgICAgIG1vdXNlLnBvc2l0aW9uLnkgPSBtb3VzZS5hYnNvbHV0ZS55ICogbW91c2Uuc2NhbGUueSArIG1vdXNlLm9mZnNldC55O1xuICAgICAgICAgICAgbW91c2Uuc291cmNlRXZlbnRzLm1vdXNlbW92ZSA9IGV2ZW50O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbW91c2UubW91c2Vkb3duID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IF9nZXRSZWxhdGl2ZU1vdXNlUG9zaXRpb24oZXZlbnQsIG1vdXNlLmVsZW1lbnQsIG1vdXNlLnBpeGVsUmF0aW8pLFxuICAgICAgICAgICAgICAgIHRvdWNoZXMgPSBldmVudC5jaGFuZ2VkVG91Y2hlcztcblxuICAgICAgICAgICAgaWYgKHRvdWNoZXMpIHtcbiAgICAgICAgICAgICAgICBtb3VzZS5idXR0b24gPSAwO1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1vdXNlLmJ1dHRvbiA9IGV2ZW50LmJ1dHRvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW91c2UuYWJzb2x1dGUueCA9IHBvc2l0aW9uLng7XG4gICAgICAgICAgICBtb3VzZS5hYnNvbHV0ZS55ID0gcG9zaXRpb24ueTtcbiAgICAgICAgICAgIG1vdXNlLnBvc2l0aW9uLnggPSBtb3VzZS5hYnNvbHV0ZS54ICogbW91c2Uuc2NhbGUueCArIG1vdXNlLm9mZnNldC54O1xuICAgICAgICAgICAgbW91c2UucG9zaXRpb24ueSA9IG1vdXNlLmFic29sdXRlLnkgKiBtb3VzZS5zY2FsZS55ICsgbW91c2Uub2Zmc2V0Lnk7XG4gICAgICAgICAgICBtb3VzZS5tb3VzZWRvd25Qb3NpdGlvbi54ID0gbW91c2UucG9zaXRpb24ueDtcbiAgICAgICAgICAgIG1vdXNlLm1vdXNlZG93blBvc2l0aW9uLnkgPSBtb3VzZS5wb3NpdGlvbi55O1xuICAgICAgICAgICAgbW91c2Uuc291cmNlRXZlbnRzLm1vdXNlZG93biA9IGV2ZW50O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbW91c2UubW91c2V1cCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSBfZ2V0UmVsYXRpdmVNb3VzZVBvc2l0aW9uKGV2ZW50LCBtb3VzZS5lbGVtZW50LCBtb3VzZS5waXhlbFJhdGlvKSxcbiAgICAgICAgICAgICAgICB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXM7XG5cbiAgICAgICAgICAgIGlmICh0b3VjaGVzKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbW91c2UuYnV0dG9uID0gLTE7XG4gICAgICAgICAgICBtb3VzZS5hYnNvbHV0ZS54ID0gcG9zaXRpb24ueDtcbiAgICAgICAgICAgIG1vdXNlLmFic29sdXRlLnkgPSBwb3NpdGlvbi55O1xuICAgICAgICAgICAgbW91c2UucG9zaXRpb24ueCA9IG1vdXNlLmFic29sdXRlLnggKiBtb3VzZS5zY2FsZS54ICsgbW91c2Uub2Zmc2V0Lng7XG4gICAgICAgICAgICBtb3VzZS5wb3NpdGlvbi55ID0gbW91c2UuYWJzb2x1dGUueSAqIG1vdXNlLnNjYWxlLnkgKyBtb3VzZS5vZmZzZXQueTtcbiAgICAgICAgICAgIG1vdXNlLm1vdXNldXBQb3NpdGlvbi54ID0gbW91c2UucG9zaXRpb24ueDtcbiAgICAgICAgICAgIG1vdXNlLm1vdXNldXBQb3NpdGlvbi55ID0gbW91c2UucG9zaXRpb24ueTtcbiAgICAgICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZXVwID0gZXZlbnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgbW91c2UubW91c2V3aGVlbCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBtb3VzZS53aGVlbERlbHRhID0gTWF0aC5tYXgoLTEsIE1hdGgubWluKDEsIGV2ZW50LndoZWVsRGVsdGEgfHwgLWV2ZW50LmRldGFpbCkpO1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBNb3VzZS5zZXRFbGVtZW50KG1vdXNlLCBtb3VzZS5lbGVtZW50KTtcblxuICAgICAgICByZXR1cm4gbW91c2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGVsZW1lbnQgdGhlIG1vdXNlIGlzIGJvdW5kIHRvIChhbmQgcmVsYXRpdmUgdG8pLlxuICAgICAqIEBtZXRob2Qgc2V0RWxlbWVudFxuICAgICAqIEBwYXJhbSB7bW91c2V9IG1vdXNlXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudFxuICAgICAqL1xuICAgIE1vdXNlLnNldEVsZW1lbnQgPSBmdW5jdGlvbihtb3VzZSwgZWxlbWVudCkge1xuICAgICAgICBtb3VzZS5lbGVtZW50ID0gZWxlbWVudDtcblxuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG1vdXNlLm1vdXNlbW92ZSk7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgbW91c2UubW91c2Vkb3duKTtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgbW91c2UubW91c2V1cCk7XG4gICAgICAgIFxuICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCBtb3VzZS5tb3VzZXdoZWVsKTtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Nb3VzZVNjcm9sbCcsIG1vdXNlLm1vdXNld2hlZWwpO1xuXG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgbW91c2UubW91c2Vtb3ZlKTtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgbW91c2UubW91c2Vkb3duKTtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIG1vdXNlLm1vdXNldXApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgYWxsIGNhcHR1cmVkIHNvdXJjZSBldmVudHMuXG4gICAgICogQG1ldGhvZCBjbGVhclNvdXJjZUV2ZW50c1xuICAgICAqIEBwYXJhbSB7bW91c2V9IG1vdXNlXG4gICAgICovXG4gICAgTW91c2UuY2xlYXJTb3VyY2VFdmVudHMgPSBmdW5jdGlvbihtb3VzZSkge1xuICAgICAgICBtb3VzZS5zb3VyY2VFdmVudHMubW91c2Vtb3ZlID0gbnVsbDtcbiAgICAgICAgbW91c2Uuc291cmNlRXZlbnRzLm1vdXNlZG93biA9IG51bGw7XG4gICAgICAgIG1vdXNlLnNvdXJjZUV2ZW50cy5tb3VzZXVwID0gbnVsbDtcbiAgICAgICAgbW91c2Uuc291cmNlRXZlbnRzLm1vdXNld2hlZWwgPSBudWxsO1xuICAgICAgICBtb3VzZS53aGVlbERlbHRhID0gMDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgbW91c2UgcG9zaXRpb24gb2Zmc2V0LlxuICAgICAqIEBtZXRob2Qgc2V0T2Zmc2V0XG4gICAgICogQHBhcmFtIHttb3VzZX0gbW91c2VcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gb2Zmc2V0XG4gICAgICovXG4gICAgTW91c2Uuc2V0T2Zmc2V0ID0gZnVuY3Rpb24obW91c2UsIG9mZnNldCkge1xuICAgICAgICBtb3VzZS5vZmZzZXQueCA9IG9mZnNldC54O1xuICAgICAgICBtb3VzZS5vZmZzZXQueSA9IG9mZnNldC55O1xuICAgICAgICBtb3VzZS5wb3NpdGlvbi54ID0gbW91c2UuYWJzb2x1dGUueCAqIG1vdXNlLnNjYWxlLnggKyBtb3VzZS5vZmZzZXQueDtcbiAgICAgICAgbW91c2UucG9zaXRpb24ueSA9IG1vdXNlLmFic29sdXRlLnkgKiBtb3VzZS5zY2FsZS55ICsgbW91c2Uub2Zmc2V0Lnk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIG1vdXNlIHBvc2l0aW9uIHNjYWxlLlxuICAgICAqIEBtZXRob2Qgc2V0U2NhbGVcbiAgICAgKiBAcGFyYW0ge21vdXNlfSBtb3VzZVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBzY2FsZVxuICAgICAqL1xuICAgIE1vdXNlLnNldFNjYWxlID0gZnVuY3Rpb24obW91c2UsIHNjYWxlKSB7XG4gICAgICAgIG1vdXNlLnNjYWxlLnggPSBzY2FsZS54O1xuICAgICAgICBtb3VzZS5zY2FsZS55ID0gc2NhbGUueTtcbiAgICAgICAgbW91c2UucG9zaXRpb24ueCA9IG1vdXNlLmFic29sdXRlLnggKiBtb3VzZS5zY2FsZS54ICsgbW91c2Uub2Zmc2V0Lng7XG4gICAgICAgIG1vdXNlLnBvc2l0aW9uLnkgPSBtb3VzZS5hYnNvbHV0ZS55ICogbW91c2Uuc2NhbGUueSArIG1vdXNlLm9mZnNldC55O1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgbW91c2UgcG9zaXRpb24gcmVsYXRpdmUgdG8gYW4gZWxlbWVudCBnaXZlbiBhIHNjcmVlbiBwaXhlbCByYXRpby5cbiAgICAgKiBAbWV0aG9kIF9nZXRSZWxhdGl2ZU1vdXNlUG9zaXRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7fSBldmVudFxuICAgICAqIEBwYXJhbSB7fSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBpeGVsUmF0aW9cbiAgICAgKiBAcmV0dXJuIHt9XG4gICAgICovXG4gICAgdmFyIF9nZXRSZWxhdGl2ZU1vdXNlUG9zaXRpb24gPSBmdW5jdGlvbihldmVudCwgZWxlbWVudCwgcGl4ZWxSYXRpbykge1xuICAgICAgICB2YXIgZWxlbWVudEJvdW5kcyA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICByb290Tm9kZSA9IChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHwgZG9jdW1lbnQuYm9keS5wYXJlbnROb2RlIHx8IGRvY3VtZW50LmJvZHkpLFxuICAgICAgICAgICAgc2Nyb2xsWCA9ICh3aW5kb3cucGFnZVhPZmZzZXQgIT09IHVuZGVmaW5lZCkgPyB3aW5kb3cucGFnZVhPZmZzZXQgOiByb290Tm9kZS5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgc2Nyb2xsWSA9ICh3aW5kb3cucGFnZVlPZmZzZXQgIT09IHVuZGVmaW5lZCkgPyB3aW5kb3cucGFnZVlPZmZzZXQgOiByb290Tm9kZS5zY3JvbGxUb3AsXG4gICAgICAgICAgICB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgICB4LCB5O1xuICAgICAgICBcbiAgICAgICAgaWYgKHRvdWNoZXMpIHtcbiAgICAgICAgICAgIHggPSB0b3VjaGVzWzBdLnBhZ2VYIC0gZWxlbWVudEJvdW5kcy5sZWZ0IC0gc2Nyb2xsWDtcbiAgICAgICAgICAgIHkgPSB0b3VjaGVzWzBdLnBhZ2VZIC0gZWxlbWVudEJvdW5kcy50b3AgLSBzY3JvbGxZO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeCA9IGV2ZW50LnBhZ2VYIC0gZWxlbWVudEJvdW5kcy5sZWZ0IC0gc2Nyb2xsWDtcbiAgICAgICAgICAgIHkgPSBldmVudC5wYWdlWSAtIGVsZW1lbnRCb3VuZHMudG9wIC0gc2Nyb2xsWTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgeDogeCAvIChlbGVtZW50LmNsaWVudFdpZHRoIC8gZWxlbWVudC53aWR0aCAqIHBpeGVsUmF0aW8pLFxuICAgICAgICAgICAgeTogeSAvIChlbGVtZW50LmNsaWVudEhlaWdodCAvIGVsZW1lbnQuaGVpZ2h0ICogcGl4ZWxSYXRpbylcbiAgICAgICAgfTtcbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlJ1bm5lcmAgbW9kdWxlIGlzIGFuIG9wdGlvbmFsIHV0aWxpdHkgd2hpY2ggcHJvdmlkZXMgYSBnYW1lIGxvb3AsIFxuKiB0aGF0IGhhbmRsZXMgY29udGludW91c2x5IHVwZGF0aW5nIGEgYE1hdHRlci5FbmdpbmVgIGZvciB5b3Ugd2l0aGluIGEgYnJvd3Nlci5cbiogSXQgaXMgaW50ZW5kZWQgZm9yIGRldmVsb3BtZW50IGFuZCBkZWJ1Z2dpbmcgcHVycG9zZXMsIGJ1dCBtYXkgYWxzbyBiZSBzdWl0YWJsZSBmb3Igc2ltcGxlIGdhbWVzLlxuKiBJZiB5b3UgYXJlIHVzaW5nIHlvdXIgb3duIGdhbWUgbG9vcCBpbnN0ZWFkLCB0aGVuIHlvdSBkbyBub3QgbmVlZCB0aGUgYE1hdHRlci5SdW5uZXJgIG1vZHVsZS5cbiogSW5zdGVhZCBqdXN0IGNhbGwgYEVuZ2luZS51cGRhdGUoZW5naW5lLCBkZWx0YSlgIGluIHlvdXIgb3duIGxvb3AuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBSdW5uZXJcbiovXG5cbnZhciBSdW5uZXIgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBSdW5uZXI7XG5cbnZhciBFdmVudHMgPSByZXF1aXJlKCcuL0V2ZW50cycpO1xudmFyIEVuZ2luZSA9IHJlcXVpcmUoJy4vRW5naW5lJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gICAgICAgIF9jYW5jZWxBbmltYXRpb25GcmFtZTtcblxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCBmdW5jdGlvbihjYWxsYmFjayl7IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhDb21tb24ubm93KCkpOyB9LCAxMDAwIC8gNjApOyB9O1xuICAgXG4gICAgICAgIF9jYW5jZWxBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWUgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cubXNDYW5jZWxBbmltYXRpb25GcmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IFJ1bm5lci4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogQG1ldGhvZCBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge30gb3B0aW9uc1xuICAgICAqL1xuICAgIFJ1bm5lci5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGZwczogNjAsXG4gICAgICAgICAgICBjb3JyZWN0aW9uOiAxLFxuICAgICAgICAgICAgZGVsdGFTYW1wbGVTaXplOiA2MCxcbiAgICAgICAgICAgIGNvdW50ZXJUaW1lc3RhbXA6IDAsXG4gICAgICAgICAgICBmcmFtZUNvdW50ZXI6IDAsXG4gICAgICAgICAgICBkZWx0YUhpc3Rvcnk6IFtdLFxuICAgICAgICAgICAgdGltZVByZXY6IG51bGwsXG4gICAgICAgICAgICB0aW1lU2NhbGVQcmV2OiAxLFxuICAgICAgICAgICAgZnJhbWVSZXF1ZXN0SWQ6IG51bGwsXG4gICAgICAgICAgICBpc0ZpeGVkOiBmYWxzZSxcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWVcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcnVubmVyID0gQ29tbW9uLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgcnVubmVyLmRlbHRhID0gcnVubmVyLmRlbHRhIHx8IDEwMDAgLyBydW5uZXIuZnBzO1xuICAgICAgICBydW5uZXIuZGVsdGFNaW4gPSBydW5uZXIuZGVsdGFNaW4gfHwgMTAwMCAvIHJ1bm5lci5mcHM7XG4gICAgICAgIHJ1bm5lci5kZWx0YU1heCA9IHJ1bm5lci5kZWx0YU1heCB8fCAxMDAwIC8gKHJ1bm5lci5mcHMgKiAwLjUpO1xuICAgICAgICBydW5uZXIuZnBzID0gMTAwMCAvIHJ1bm5lci5kZWx0YTtcblxuICAgICAgICByZXR1cm4gcnVubmVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb250aW51b3VzbHkgdGlja3MgYSBgTWF0dGVyLkVuZ2luZWAgYnkgY2FsbGluZyBgUnVubmVyLnRpY2tgIG9uIHRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBldmVudC5cbiAgICAgKiBAbWV0aG9kIHJ1blxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKi9cbiAgICBSdW5uZXIucnVuID0gZnVuY3Rpb24ocnVubmVyLCBlbmdpbmUpIHtcbiAgICAgICAgLy8gY3JlYXRlIHJ1bm5lciBpZiBlbmdpbmUgaXMgZmlyc3QgYXJndW1lbnRcbiAgICAgICAgaWYgKHR5cGVvZiBydW5uZXIucG9zaXRpb25JdGVyYXRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZW5naW5lID0gcnVubmVyO1xuICAgICAgICAgICAgcnVubmVyID0gUnVubmVyLmNyZWF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGZ1bmN0aW9uIHJlbmRlcih0aW1lKXtcbiAgICAgICAgICAgIHJ1bm5lci5mcmFtZVJlcXVlc3RJZCA9IF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVyKTtcblxuICAgICAgICAgICAgaWYgKHRpbWUgJiYgcnVubmVyLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICBSdW5uZXIudGljayhydW5uZXIsIGVuZ2luZSwgdGltZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmV0dXJuIHJ1bm5lcjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQSBnYW1lIGxvb3AgdXRpbGl0eSB0aGF0IHVwZGF0ZXMgdGhlIGVuZ2luZSBhbmQgcmVuZGVyZXIgYnkgb25lIHN0ZXAgKGEgJ3RpY2snKS5cbiAgICAgKiBGZWF0dXJlcyBkZWx0YSBzbW9vdGhpbmcsIHRpbWUgY29ycmVjdGlvbiBhbmQgZml4ZWQgb3IgZHluYW1pYyB0aW1pbmcuXG4gICAgICogVHJpZ2dlcnMgYGJlZm9yZVRpY2tgLCBgdGlja2AgYW5kIGBhZnRlclRpY2tgIGV2ZW50cyBvbiB0aGUgZW5naW5lLlxuICAgICAqIENvbnNpZGVyIGp1c3QgYEVuZ2luZS51cGRhdGUoZW5naW5lLCBkZWx0YSlgIGlmIHlvdSdyZSB1c2luZyB5b3VyIG93biBsb29wLlxuICAgICAqIEBtZXRob2QgdGlja1xuICAgICAqIEBwYXJhbSB7cnVubmVyfSBydW5uZXJcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVcbiAgICAgKi9cbiAgICBSdW5uZXIudGljayA9IGZ1bmN0aW9uKHJ1bm5lciwgZW5naW5lLCB0aW1lKSB7XG4gICAgICAgIHZhciB0aW1pbmcgPSBlbmdpbmUudGltaW5nLFxuICAgICAgICAgICAgY29ycmVjdGlvbiA9IDEsXG4gICAgICAgICAgICBkZWx0YTtcblxuICAgICAgICAvLyBjcmVhdGUgYW4gZXZlbnQgb2JqZWN0XG4gICAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogdGltaW5nLnRpbWVzdGFtcFxuICAgICAgICB9O1xuXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKHJ1bm5lciwgJ2JlZm9yZVRpY2snLCBldmVudCk7XG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKGVuZ2luZSwgJ2JlZm9yZVRpY2snLCBldmVudCk7IC8vIEBkZXByZWNhdGVkXG5cbiAgICAgICAgaWYgKHJ1bm5lci5pc0ZpeGVkKSB7XG4gICAgICAgICAgICAvLyBmaXhlZCB0aW1lc3RlcFxuICAgICAgICAgICAgZGVsdGEgPSBydW5uZXIuZGVsdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkeW5hbWljIHRpbWVzdGVwIGJhc2VkIG9uIHdhbGwgY2xvY2sgYmV0d2VlbiBjYWxsc1xuICAgICAgICAgICAgZGVsdGEgPSAodGltZSAtIHJ1bm5lci50aW1lUHJldikgfHwgcnVubmVyLmRlbHRhO1xuICAgICAgICAgICAgcnVubmVyLnRpbWVQcmV2ID0gdGltZTtcblxuICAgICAgICAgICAgLy8gb3B0aW1pc3RpY2FsbHkgZmlsdGVyIGRlbHRhIG92ZXIgYSBmZXcgZnJhbWVzLCB0byBpbXByb3ZlIHN0YWJpbGl0eVxuICAgICAgICAgICAgcnVubmVyLmRlbHRhSGlzdG9yeS5wdXNoKGRlbHRhKTtcbiAgICAgICAgICAgIHJ1bm5lci5kZWx0YUhpc3RvcnkgPSBydW5uZXIuZGVsdGFIaXN0b3J5LnNsaWNlKC1ydW5uZXIuZGVsdGFTYW1wbGVTaXplKTtcbiAgICAgICAgICAgIGRlbHRhID0gTWF0aC5taW4uYXBwbHkobnVsbCwgcnVubmVyLmRlbHRhSGlzdG9yeSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGxpbWl0IGRlbHRhXG4gICAgICAgICAgICBkZWx0YSA9IGRlbHRhIDwgcnVubmVyLmRlbHRhTWluID8gcnVubmVyLmRlbHRhTWluIDogZGVsdGE7XG4gICAgICAgICAgICBkZWx0YSA9IGRlbHRhID4gcnVubmVyLmRlbHRhTWF4ID8gcnVubmVyLmRlbHRhTWF4IDogZGVsdGE7XG5cbiAgICAgICAgICAgIC8vIGNvcnJlY3Rpb24gZm9yIGRlbHRhXG4gICAgICAgICAgICBjb3JyZWN0aW9uID0gZGVsdGEgLyBydW5uZXIuZGVsdGE7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBlbmdpbmUgdGltaW5nIG9iamVjdFxuICAgICAgICAgICAgcnVubmVyLmRlbHRhID0gZGVsdGE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aW1lIGNvcnJlY3Rpb24gZm9yIHRpbWUgc2NhbGluZ1xuICAgICAgICBpZiAocnVubmVyLnRpbWVTY2FsZVByZXYgIT09IDApXG4gICAgICAgICAgICBjb3JyZWN0aW9uICo9IHRpbWluZy50aW1lU2NhbGUgLyBydW5uZXIudGltZVNjYWxlUHJldjtcblxuICAgICAgICBpZiAodGltaW5nLnRpbWVTY2FsZSA9PT0gMClcbiAgICAgICAgICAgIGNvcnJlY3Rpb24gPSAwO1xuXG4gICAgICAgIHJ1bm5lci50aW1lU2NhbGVQcmV2ID0gdGltaW5nLnRpbWVTY2FsZTtcbiAgICAgICAgcnVubmVyLmNvcnJlY3Rpb24gPSBjb3JyZWN0aW9uO1xuXG4gICAgICAgIC8vIGZwcyBjb3VudGVyXG4gICAgICAgIHJ1bm5lci5mcmFtZUNvdW50ZXIgKz0gMTtcbiAgICAgICAgaWYgKHRpbWUgLSBydW5uZXIuY291bnRlclRpbWVzdGFtcCA+PSAxMDAwKSB7XG4gICAgICAgICAgICBydW5uZXIuZnBzID0gcnVubmVyLmZyYW1lQ291bnRlciAqICgodGltZSAtIHJ1bm5lci5jb3VudGVyVGltZXN0YW1wKSAvIDEwMDApO1xuICAgICAgICAgICAgcnVubmVyLmNvdW50ZXJUaW1lc3RhbXAgPSB0aW1lO1xuICAgICAgICAgICAgcnVubmVyLmZyYW1lQ291bnRlciA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBFdmVudHMudHJpZ2dlcihydW5uZXIsICd0aWNrJywgZXZlbnQpO1xuICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICd0aWNrJywgZXZlbnQpOyAvLyBAZGVwcmVjYXRlZFxuXG4gICAgICAgIC8vIGlmIHdvcmxkIGhhcyBiZWVuIG1vZGlmaWVkLCBjbGVhciB0aGUgcmVuZGVyIHNjZW5lIGdyYXBoXG4gICAgICAgIGlmIChlbmdpbmUud29ybGQuaXNNb2RpZmllZCBcbiAgICAgICAgICAgICYmIGVuZ2luZS5yZW5kZXJcbiAgICAgICAgICAgICYmIGVuZ2luZS5yZW5kZXIuY29udHJvbGxlclxuICAgICAgICAgICAgJiYgZW5naW5lLnJlbmRlci5jb250cm9sbGVyLmNsZWFyKSB7XG4gICAgICAgICAgICBlbmdpbmUucmVuZGVyLmNvbnRyb2xsZXIuY2xlYXIoZW5naW5lLnJlbmRlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB1cGRhdGVcbiAgICAgICAgRXZlbnRzLnRyaWdnZXIocnVubmVyLCAnYmVmb3JlVXBkYXRlJywgZXZlbnQpO1xuICAgICAgICBFbmdpbmUudXBkYXRlKGVuZ2luZSwgZGVsdGEsIGNvcnJlY3Rpb24pO1xuICAgICAgICBFdmVudHMudHJpZ2dlcihydW5uZXIsICdhZnRlclVwZGF0ZScsIGV2ZW50KTtcblxuICAgICAgICAvLyByZW5kZXJcbiAgICAgICAgLy8gQGRlcHJlY2F0ZWRcbiAgICAgICAgaWYgKGVuZ2luZS5yZW5kZXIgJiYgZW5naW5lLnJlbmRlci5jb250cm9sbGVyKSB7XG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihydW5uZXIsICdiZWZvcmVSZW5kZXInLCBldmVudCk7XG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdiZWZvcmVSZW5kZXInLCBldmVudCk7IC8vIEBkZXByZWNhdGVkXG5cbiAgICAgICAgICAgIGVuZ2luZS5yZW5kZXIuY29udHJvbGxlci53b3JsZChlbmdpbmUucmVuZGVyKTtcblxuICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIocnVubmVyLCAnYWZ0ZXJSZW5kZXInLCBldmVudCk7XG4gICAgICAgICAgICBFdmVudHMudHJpZ2dlcihlbmdpbmUsICdhZnRlclJlbmRlcicsIGV2ZW50KTsgLy8gQGRlcHJlY2F0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKHJ1bm5lciwgJ2FmdGVyVGljaycsIGV2ZW50KTtcbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoZW5naW5lLCAnYWZ0ZXJUaWNrJywgZXZlbnQpOyAvLyBAZGVwcmVjYXRlZFxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmRzIGV4ZWN1dGlvbiBvZiBgUnVubmVyLnJ1bmAgb24gdGhlIGdpdmVuIGBydW5uZXJgLCBieSBjYW5jZWxpbmcgdGhlIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0IGV2ZW50IGxvb3AuXG4gICAgICogSWYgeW91IHdpc2ggdG8gb25seSB0ZW1wb3JhcmlseSBwYXVzZSB0aGUgZW5naW5lLCBzZWUgYGVuZ2luZS5lbmFibGVkYCBpbnN0ZWFkLlxuICAgICAqIEBtZXRob2Qgc3RvcFxuICAgICAqIEBwYXJhbSB7cnVubmVyfSBydW5uZXJcbiAgICAgKi9cbiAgICBSdW5uZXIuc3RvcCA9IGZ1bmN0aW9uKHJ1bm5lcikge1xuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWUocnVubmVyLmZyYW1lUmVxdWVzdElkKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWxpYXMgZm9yIGBSdW5uZXIucnVuYC5cbiAgICAgKiBAbWV0aG9kIHN0YXJ0XG4gICAgICogQHBhcmFtIHtydW5uZXJ9IHJ1bm5lclxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKi9cbiAgICBSdW5uZXIuc3RhcnQgPSBmdW5jdGlvbihydW5uZXIsIGVuZ2luZSkge1xuICAgICAgICBSdW5uZXIucnVuKHJ1bm5lciwgZW5naW5lKTtcbiAgICB9O1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgRXZlbnRzIERvY3VtZW50YXRpb25cbiAgICAqXG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYXQgdGhlIHN0YXJ0IG9mIGEgdGljaywgYmVmb3JlIGFueSB1cGRhdGVzIHRvIHRoZSBlbmdpbmUgb3IgdGltaW5nXG4gICAgKlxuICAgICogQGV2ZW50IGJlZm9yZVRpY2tcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIGVuZ2luZSB0aW1pbmcgdXBkYXRlZCwgYnV0IGp1c3QgYmVmb3JlIHVwZGF0ZVxuICAgICpcbiAgICAqIEBldmVudCB0aWNrXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhdCB0aGUgZW5kIG9mIGEgdGljaywgYWZ0ZXIgZW5naW5lIHVwZGF0ZSBhbmQgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgKlxuICAgICogQGV2ZW50IGFmdGVyVGlja1xuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYmVmb3JlIHVwZGF0ZVxuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVVcGRhdGVcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICovXG5cbiAgICAvKipcbiAgICAqIEZpcmVkIGFmdGVyIHVwZGF0ZVxuICAgICpcbiAgICAqIEBldmVudCBhZnRlclVwZGF0ZVxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYmVmb3JlIHJlbmRlcmluZ1xuICAgICpcbiAgICAqIEBldmVudCBiZWZvcmVSZW5kZXJcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICogQGRlcHJlY2F0ZWRcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBhZnRlciByZW5kZXJpbmdcbiAgICAqXG4gICAgKiBAZXZlbnQgYWZ0ZXJSZW5kZXJcbiAgICAqIEBwYXJhbSB7fSBldmVudCBBbiBldmVudCBvYmplY3RcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBldmVudC50aW1lc3RhbXAgVGhlIGVuZ2luZS50aW1pbmcudGltZXN0YW1wIG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50LnNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5uYW1lIFRoZSBuYW1lIG9mIHRoZSBldmVudFxuICAgICogQGRlcHJlY2F0ZWRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBzcGVjaWZpZXMgd2hldGhlciB0aGUgcnVubmVyIGlzIHJ1bm5pbmcgb3Igbm90LlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGVuYWJsZWRcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQSBgQm9vbGVhbmAgdGhhdCBzcGVjaWZpZXMgaWYgdGhlIHJ1bm5lciBzaG91bGQgdXNlIGEgZml4ZWQgdGltZXN0ZXAgKG90aGVyd2lzZSBpdCBpcyB2YXJpYWJsZSkuXG4gICAgICogSWYgdGltaW5nIGlzIGZpeGVkLCB0aGVuIHRoZSBhcHBhcmVudCBzaW11bGF0aW9uIHNwZWVkIHdpbGwgY2hhbmdlIGRlcGVuZGluZyBvbiB0aGUgZnJhbWUgcmF0ZSAoYnV0IGJlaGF2aW91ciB3aWxsIGJlIGRldGVybWluaXN0aWMpLlxuICAgICAqIElmIHRoZSB0aW1pbmcgaXMgdmFyaWFibGUsIHRoZW4gdGhlIGFwcGFyZW50IHNpbXVsYXRpb24gc3BlZWQgd2lsbCBiZSBjb25zdGFudCAoYXBwcm94aW1hdGVseSwgYnV0IGF0IHRoZSBjb3N0IG9mIGRldGVybWluaW5pc20pLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGlzRml4ZWRcbiAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgYE51bWJlcmAgdGhhdCBzcGVjaWZpZXMgdGhlIHRpbWUgc3RlcCBiZXR3ZWVuIHVwZGF0ZXMgaW4gbWlsbGlzZWNvbmRzLlxuICAgICAqIElmIGBlbmdpbmUudGltaW5nLmlzRml4ZWRgIGlzIHNldCB0byBgdHJ1ZWAsIHRoZW4gYGRlbHRhYCBpcyBmaXhlZC5cbiAgICAgKiBJZiBpdCBpcyBgZmFsc2VgLCB0aGVuIGBkZWx0YWAgY2FuIGR5bmFtaWNhbGx5IGNoYW5nZSB0byBtYWludGFpbiB0aGUgY29ycmVjdCBhcHBhcmVudCBzaW11bGF0aW9uIHNwZWVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGRlbHRhXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgMTAwMCAvIDYwXG4gICAgICovXG5cbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuU2xlZXBpbmdgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIHRvIG1hbmFnZSB0aGUgc2xlZXBpbmcgc3RhdGUgb2YgYm9kaWVzLlxuKlxuKiBAY2xhc3MgU2xlZXBpbmdcbiovXG5cbnZhciBTbGVlcGluZyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNsZWVwaW5nO1xuXG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi9FdmVudHMnKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgU2xlZXBpbmcuX21vdGlvbldha2VUaHJlc2hvbGQgPSAwLjE4O1xuICAgIFNsZWVwaW5nLl9tb3Rpb25TbGVlcFRocmVzaG9sZCA9IDAuMDg7XG4gICAgU2xlZXBpbmcuX21pbkJpYXMgPSAwLjk7XG5cbiAgICAvKipcbiAgICAgKiBQdXRzIGJvZGllcyB0byBzbGVlcCBvciB3YWtlcyB0aGVtIHVwIGRlcGVuZGluZyBvbiB0aGVpciBtb3Rpb24uXG4gICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqL1xuICAgIFNsZWVwaW5nLnVwZGF0ZSA9IGZ1bmN0aW9uKGJvZGllcywgdGltZVNjYWxlKSB7XG4gICAgICAgIHZhciB0aW1lRmFjdG9yID0gdGltZVNjYWxlICogdGltZVNjYWxlICogdGltZVNjYWxlO1xuXG4gICAgICAgIC8vIHVwZGF0ZSBib2RpZXMgc2xlZXBpbmcgc3RhdHVzXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXSxcbiAgICAgICAgICAgICAgICBtb3Rpb24gPSBib2R5LnNwZWVkICogYm9keS5zcGVlZCArIGJvZHkuYW5ndWxhclNwZWVkICogYm9keS5hbmd1bGFyU3BlZWQ7XG5cbiAgICAgICAgICAgIC8vIHdha2UgdXAgYm9kaWVzIGlmIHRoZXkgaGF2ZSBhIGZvcmNlIGFwcGxpZWRcbiAgICAgICAgICAgIGlmIChib2R5LmZvcmNlLnggIT09IDAgfHwgYm9keS5mb3JjZS55ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgU2xlZXBpbmcuc2V0KGJvZHksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG1pbk1vdGlvbiA9IE1hdGgubWluKGJvZHkubW90aW9uLCBtb3Rpb24pLFxuICAgICAgICAgICAgICAgIG1heE1vdGlvbiA9IE1hdGgubWF4KGJvZHkubW90aW9uLCBtb3Rpb24pO1xuICAgICAgICBcbiAgICAgICAgICAgIC8vIGJpYXNlZCBhdmVyYWdlIG1vdGlvbiBlc3RpbWF0aW9uIGJldHdlZW4gZnJhbWVzXG4gICAgICAgICAgICBib2R5Lm1vdGlvbiA9IFNsZWVwaW5nLl9taW5CaWFzICogbWluTW90aW9uICsgKDEgLSBTbGVlcGluZy5fbWluQmlhcykgKiBtYXhNb3Rpb247XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChib2R5LnNsZWVwVGhyZXNob2xkID4gMCAmJiBib2R5Lm1vdGlvbiA8IFNsZWVwaW5nLl9tb3Rpb25TbGVlcFRocmVzaG9sZCAqIHRpbWVGYWN0b3IpIHtcbiAgICAgICAgICAgICAgICBib2R5LnNsZWVwQ291bnRlciArPSAxO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChib2R5LnNsZWVwQ291bnRlciA+PSBib2R5LnNsZWVwVGhyZXNob2xkKVxuICAgICAgICAgICAgICAgICAgICBTbGVlcGluZy5zZXQoYm9keSwgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJvZHkuc2xlZXBDb3VudGVyID4gMCkge1xuICAgICAgICAgICAgICAgIGJvZHkuc2xlZXBDb3VudGVyIC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBzZXQgb2YgY29sbGlkaW5nIHBhaXJzLCB3YWtlcyB0aGUgc2xlZXBpbmcgYm9kaWVzIGludm9sdmVkLlxuICAgICAqIEBtZXRob2QgYWZ0ZXJDb2xsaXNpb25zXG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVTY2FsZVxuICAgICAqL1xuICAgIFNsZWVwaW5nLmFmdGVyQ29sbGlzaW9ucyA9IGZ1bmN0aW9uKHBhaXJzLCB0aW1lU2NhbGUpIHtcbiAgICAgICAgdmFyIHRpbWVGYWN0b3IgPSB0aW1lU2NhbGUgKiB0aW1lU2NhbGUgKiB0aW1lU2NhbGU7XG5cbiAgICAgICAgLy8gd2FrZSB1cCBib2RpZXMgaW52b2x2ZWQgaW4gY29sbGlzaW9uc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBkb24ndCB3YWtlIGluYWN0aXZlIHBhaXJzXG4gICAgICAgICAgICBpZiAoIXBhaXIuaXNBY3RpdmUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIHZhciBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbixcbiAgICAgICAgICAgICAgICBib2R5QSA9IGNvbGxpc2lvbi5ib2R5QS5wYXJlbnQsIFxuICAgICAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLmJvZHlCLnBhcmVudDtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyBkb24ndCB3YWtlIGlmIGF0IGxlYXN0IG9uZSBib2R5IGlzIHN0YXRpY1xuICAgICAgICAgICAgaWYgKChib2R5QS5pc1NsZWVwaW5nICYmIGJvZHlCLmlzU2xlZXBpbmcpIHx8IGJvZHlBLmlzU3RhdGljIHx8IGJvZHlCLmlzU3RhdGljKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBcbiAgICAgICAgICAgIGlmIChib2R5QS5pc1NsZWVwaW5nIHx8IGJvZHlCLmlzU2xlZXBpbmcpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2xlZXBpbmdCb2R5ID0gKGJvZHlBLmlzU2xlZXBpbmcgJiYgIWJvZHlBLmlzU3RhdGljKSA/IGJvZHlBIDogYm9keUIsXG4gICAgICAgICAgICAgICAgICAgIG1vdmluZ0JvZHkgPSBzbGVlcGluZ0JvZHkgPT09IGJvZHlBID8gYm9keUIgOiBib2R5QTtcblxuICAgICAgICAgICAgICAgIGlmICghc2xlZXBpbmdCb2R5LmlzU3RhdGljICYmIG1vdmluZ0JvZHkubW90aW9uID4gU2xlZXBpbmcuX21vdGlvbldha2VUaHJlc2hvbGQgKiB0aW1lRmFjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIFNsZWVwaW5nLnNldChzbGVlcGluZ0JvZHksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICBcbiAgICAvKipcbiAgICAgKiBTZXQgYSBib2R5IGFzIHNsZWVwaW5nIG9yIGF3YWtlLlxuICAgICAqIEBtZXRob2Qgc2V0XG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc1NsZWVwaW5nXG4gICAgICovXG4gICAgU2xlZXBpbmcuc2V0ID0gZnVuY3Rpb24oYm9keSwgaXNTbGVlcGluZykge1xuICAgICAgICB2YXIgd2FzU2xlZXBpbmcgPSBib2R5LmlzU2xlZXBpbmc7XG5cbiAgICAgICAgaWYgKGlzU2xlZXBpbmcpIHtcbiAgICAgICAgICAgIGJvZHkuaXNTbGVlcGluZyA9IHRydWU7XG4gICAgICAgICAgICBib2R5LnNsZWVwQ291bnRlciA9IGJvZHkuc2xlZXBUaHJlc2hvbGQ7XG5cbiAgICAgICAgICAgIGJvZHkucG9zaXRpb25JbXB1bHNlLnggPSAwO1xuICAgICAgICAgICAgYm9keS5wb3NpdGlvbkltcHVsc2UueSA9IDA7XG5cbiAgICAgICAgICAgIGJvZHkucG9zaXRpb25QcmV2LnggPSBib2R5LnBvc2l0aW9uLng7XG4gICAgICAgICAgICBib2R5LnBvc2l0aW9uUHJldi55ID0gYm9keS5wb3NpdGlvbi55O1xuXG4gICAgICAgICAgICBib2R5LmFuZ2xlUHJldiA9IGJvZHkuYW5nbGU7XG4gICAgICAgICAgICBib2R5LnNwZWVkID0gMDtcbiAgICAgICAgICAgIGJvZHkuYW5ndWxhclNwZWVkID0gMDtcbiAgICAgICAgICAgIGJvZHkubW90aW9uID0gMDtcblxuICAgICAgICAgICAgaWYgKCF3YXNTbGVlcGluZykge1xuICAgICAgICAgICAgICAgIEV2ZW50cy50cmlnZ2VyKGJvZHksICdzbGVlcFN0YXJ0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBib2R5LmlzU2xlZXBpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIGJvZHkuc2xlZXBDb3VudGVyID0gMDtcblxuICAgICAgICAgICAgaWYgKHdhc1NsZWVwaW5nKSB7XG4gICAgICAgICAgICAgICAgRXZlbnRzLnRyaWdnZXIoYm9keSwgJ3NsZWVwRW5kJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLkJvZGllc2AgbW9kdWxlIGNvbnRhaW5zIGZhY3RvcnkgbWV0aG9kcyBmb3IgY3JlYXRpbmcgcmlnaWQgYm9keSBtb2RlbHMgXG4qIHdpdGggY29tbW9ubHkgdXNlZCBib2R5IGNvbmZpZ3VyYXRpb25zIChzdWNoIGFzIHJlY3RhbmdsZXMsIGNpcmNsZXMgYW5kIG90aGVyIHBvbHlnb25zKS5cbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIEJvZGllc1xuKi9cblxuLy8gVE9ETzogdHJ1ZSBjaXJjbGUgYm9kaWVzXG5cbnZhciBCb2RpZXMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb2RpZXM7XG5cbnZhciBWZXJ0aWNlcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlcnRpY2VzJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcbnZhciBCb2R5ID0gcmVxdWlyZSgnLi4vYm9keS9Cb2R5Jyk7XG52YXIgQm91bmRzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQm91bmRzJyk7XG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVjdG9yJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmlnaWQgYm9keSBtb2RlbCB3aXRoIGEgcmVjdGFuZ2xlIGh1bGwuIFxuICAgICAqIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IHByb3BlcnRpZXMgeW91IHdpc2ggdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxuICAgICAqIFNlZSB0aGUgcHJvcGVydGllcyBzZWN0aW9uIG9mIHRoZSBgTWF0dGVyLkJvZHlgIG1vZHVsZSBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgcmVjdGFuZ2xlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aWR0aFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogQHJldHVybiB7Ym9keX0gQSBuZXcgcmVjdGFuZ2xlIGJvZHlcbiAgICAgKi9cbiAgICBCb2RpZXMucmVjdGFuZ2xlID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB2YXIgcmVjdGFuZ2xlID0geyBcbiAgICAgICAgICAgIGxhYmVsOiAnUmVjdGFuZ2xlIEJvZHknLFxuICAgICAgICAgICAgcG9zaXRpb246IHsgeDogeCwgeTogeSB9LFxuICAgICAgICAgICAgdmVydGljZXM6IFZlcnRpY2VzLmZyb21QYXRoKCdMIDAgMCBMICcgKyB3aWR0aCArICcgMCBMICcgKyB3aWR0aCArICcgJyArIGhlaWdodCArICcgTCAwICcgKyBoZWlnaHQpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuY2hhbWZlcikge1xuICAgICAgICAgICAgdmFyIGNoYW1mZXIgPSBvcHRpb25zLmNoYW1mZXI7XG4gICAgICAgICAgICByZWN0YW5nbGUudmVydGljZXMgPSBWZXJ0aWNlcy5jaGFtZmVyKHJlY3RhbmdsZS52ZXJ0aWNlcywgY2hhbWZlci5yYWRpdXMsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbWZlci5xdWFsaXR5LCBjaGFtZmVyLnF1YWxpdHlNaW4sIGNoYW1mZXIucXVhbGl0eU1heCk7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5jaGFtZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEJvZHkuY3JlYXRlKENvbW1vbi5leHRlbmQoe30sIHJlY3RhbmdsZSwgb3B0aW9ucykpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByaWdpZCBib2R5IG1vZGVsIHdpdGggYSB0cmFwZXpvaWQgaHVsbC4gXG4gICAgICogVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gb2YgdGhlIGBNYXR0ZXIuQm9keWAgbW9kdWxlIGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCB0cmFwZXpvaWRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzbG9wZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcmV0dXJuIHtib2R5fSBBIG5ldyB0cmFwZXpvaWQgYm9keVxuICAgICAqL1xuICAgIEJvZGllcy50cmFwZXpvaWQgPSBmdW5jdGlvbih4LCB5LCB3aWR0aCwgaGVpZ2h0LCBzbG9wZSwgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBzbG9wZSAqPSAwLjU7XG4gICAgICAgIHZhciByb29mID0gKDEgLSAoc2xvcGUgKiAyKSkgKiB3aWR0aDtcbiAgICAgICAgXG4gICAgICAgIHZhciB4MSA9IHdpZHRoICogc2xvcGUsXG4gICAgICAgICAgICB4MiA9IHgxICsgcm9vZixcbiAgICAgICAgICAgIHgzID0geDIgKyB4MSxcbiAgICAgICAgICAgIHZlcnRpY2VzUGF0aDtcblxuICAgICAgICBpZiAoc2xvcGUgPCAwLjUpIHtcbiAgICAgICAgICAgIHZlcnRpY2VzUGF0aCA9ICdMIDAgMCBMICcgKyB4MSArICcgJyArICgtaGVpZ2h0KSArICcgTCAnICsgeDIgKyAnICcgKyAoLWhlaWdodCkgKyAnIEwgJyArIHgzICsgJyAwJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZlcnRpY2VzUGF0aCA9ICdMIDAgMCBMICcgKyB4MiArICcgJyArICgtaGVpZ2h0KSArICcgTCAnICsgeDMgKyAnIDAnO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRyYXBlem9pZCA9IHsgXG4gICAgICAgICAgICBsYWJlbDogJ1RyYXBlem9pZCBCb2R5JyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiB7IHg6IHgsIHk6IHkgfSxcbiAgICAgICAgICAgIHZlcnRpY2VzOiBWZXJ0aWNlcy5mcm9tUGF0aCh2ZXJ0aWNlc1BhdGgpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuY2hhbWZlcikge1xuICAgICAgICAgICAgdmFyIGNoYW1mZXIgPSBvcHRpb25zLmNoYW1mZXI7XG4gICAgICAgICAgICB0cmFwZXpvaWQudmVydGljZXMgPSBWZXJ0aWNlcy5jaGFtZmVyKHRyYXBlem9pZC52ZXJ0aWNlcywgY2hhbWZlci5yYWRpdXMsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbWZlci5xdWFsaXR5LCBjaGFtZmVyLnF1YWxpdHlNaW4sIGNoYW1mZXIucXVhbGl0eU1heCk7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5jaGFtZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEJvZHkuY3JlYXRlKENvbW1vbi5leHRlbmQoe30sIHRyYXBlem9pZCwgb3B0aW9ucykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHJpZ2lkIGJvZHkgbW9kZWwgd2l0aCBhIGNpcmNsZSBodWxsLiBcbiAgICAgKiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBvZiB0aGUgYE1hdHRlci5Cb2R5YCBtb2R1bGUgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIGNpcmNsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcmFkaXVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbWF4U2lkZXNdXG4gICAgICogQHJldHVybiB7Ym9keX0gQSBuZXcgY2lyY2xlIGJvZHlcbiAgICAgKi9cbiAgICBCb2RpZXMuY2lyY2xlID0gZnVuY3Rpb24oeCwgeSwgcmFkaXVzLCBvcHRpb25zLCBtYXhTaWRlcykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICB2YXIgY2lyY2xlID0ge1xuICAgICAgICAgICAgbGFiZWw6ICdDaXJjbGUgQm9keScsXG4gICAgICAgICAgICBjaXJjbGVSYWRpdXM6IHJhZGl1c1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gYXBwcm94aW1hdGUgY2lyY2xlcyB3aXRoIHBvbHlnb25zIHVudGlsIHRydWUgY2lyY2xlcyBpbXBsZW1lbnRlZCBpbiBTQVRcbiAgICAgICAgbWF4U2lkZXMgPSBtYXhTaWRlcyB8fCAyNTtcbiAgICAgICAgdmFyIHNpZGVzID0gTWF0aC5jZWlsKE1hdGgubWF4KDEwLCBNYXRoLm1pbihtYXhTaWRlcywgcmFkaXVzKSkpO1xuXG4gICAgICAgIC8vIG9wdGltaXNhdGlvbjogYWx3YXlzIHVzZSBldmVuIG51bWJlciBvZiBzaWRlcyAoaGFsZiB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBheGVzKVxuICAgICAgICBpZiAoc2lkZXMgJSAyID09PSAxKVxuICAgICAgICAgICAgc2lkZXMgKz0gMTtcblxuICAgICAgICByZXR1cm4gQm9kaWVzLnBvbHlnb24oeCwgeSwgc2lkZXMsIHJhZGl1cywgQ29tbW9uLmV4dGVuZCh7fSwgY2lyY2xlLCBvcHRpb25zKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgcmlnaWQgYm9keSBtb2RlbCB3aXRoIGEgcmVndWxhciBwb2x5Z29uIGh1bGwgd2l0aCB0aGUgZ2l2ZW4gbnVtYmVyIG9mIHNpZGVzLiBcbiAgICAgKiBUaGUgb3B0aW9ucyBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0IHRoYXQgc3BlY2lmaWVzIGFueSBwcm9wZXJ0aWVzIHlvdSB3aXNoIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBvZiB0aGUgYE1hdHRlci5Cb2R5YCBtb2R1bGUgZm9yIGRldGFpbGVkIGluZm9ybWF0aW9uIG9uIHdoYXQgeW91IGNhbiBwYXNzIHZpYSB0aGUgYG9wdGlvbnNgIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIHBvbHlnb25cbiAgICAgKiBAcGFyYW0ge251bWJlcn0geFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNpZGVzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJhZGl1c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcmV0dXJuIHtib2R5fSBBIG5ldyByZWd1bGFyIHBvbHlnb24gYm9keVxuICAgICAqL1xuICAgIEJvZGllcy5wb2x5Z29uID0gZnVuY3Rpb24oeCwgeSwgc2lkZXMsIHJhZGl1cywgb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgICBpZiAoc2lkZXMgPCAzKVxuICAgICAgICAgICAgcmV0dXJuIEJvZGllcy5jaXJjbGUoeCwgeSwgcmFkaXVzLCBvcHRpb25zKTtcblxuICAgICAgICB2YXIgdGhldGEgPSAyICogTWF0aC5QSSAvIHNpZGVzLFxuICAgICAgICAgICAgcGF0aCA9ICcnLFxuICAgICAgICAgICAgb2Zmc2V0ID0gdGhldGEgKiAwLjU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWRlczsgaSArPSAxKSB7XG4gICAgICAgICAgICB2YXIgYW5nbGUgPSBvZmZzZXQgKyAoaSAqIHRoZXRhKSxcbiAgICAgICAgICAgICAgICB4eCA9IE1hdGguY29zKGFuZ2xlKSAqIHJhZGl1cyxcbiAgICAgICAgICAgICAgICB5eSA9IE1hdGguc2luKGFuZ2xlKSAqIHJhZGl1cztcblxuICAgICAgICAgICAgcGF0aCArPSAnTCAnICsgeHgudG9GaXhlZCgzKSArICcgJyArIHl5LnRvRml4ZWQoMykgKyAnICc7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcG9seWdvbiA9IHsgXG4gICAgICAgICAgICBsYWJlbDogJ1BvbHlnb24gQm9keScsXG4gICAgICAgICAgICBwb3NpdGlvbjogeyB4OiB4LCB5OiB5IH0sXG4gICAgICAgICAgICB2ZXJ0aWNlczogVmVydGljZXMuZnJvbVBhdGgocGF0aClcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAob3B0aW9ucy5jaGFtZmVyKSB7XG4gICAgICAgICAgICB2YXIgY2hhbWZlciA9IG9wdGlvbnMuY2hhbWZlcjtcbiAgICAgICAgICAgIHBvbHlnb24udmVydGljZXMgPSBWZXJ0aWNlcy5jaGFtZmVyKHBvbHlnb24udmVydGljZXMsIGNoYW1mZXIucmFkaXVzLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYW1mZXIucXVhbGl0eSwgY2hhbWZlci5xdWFsaXR5TWluLCBjaGFtZmVyLnF1YWxpdHlNYXgpO1xuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMuY2hhbWZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBCb2R5LmNyZWF0ZShDb21tb24uZXh0ZW5kKHt9LCBwb2x5Z29uLCBvcHRpb25zKSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBib2R5IHVzaW5nIHRoZSBzdXBwbGllZCB2ZXJ0aWNlcyAob3IgYW4gYXJyYXkgY29udGFpbmluZyBtdWx0aXBsZSBzZXRzIG9mIHZlcnRpY2VzKS5cbiAgICAgKiBJZiB0aGUgdmVydGljZXMgYXJlIGNvbnZleCwgdGhleSB3aWxsIHBhc3MgdGhyb3VnaCBhcyBzdXBwbGllZC5cbiAgICAgKiBPdGhlcndpc2UgaWYgdGhlIHZlcnRpY2VzIGFyZSBjb25jYXZlLCB0aGV5IHdpbGwgYmUgZGVjb21wb3NlZCBpZiBbcG9seS1kZWNvbXAuanNdKGh0dHBzOi8vZ2l0aHViLmNvbS9zY2h0ZXBwZS9wb2x5LWRlY29tcC5qcykgaXMgYXZhaWxhYmxlLlxuICAgICAqIE5vdGUgdGhhdCB0aGlzIHByb2Nlc3MgaXMgbm90IGd1YXJhbnRlZWQgdG8gc3VwcG9ydCBjb21wbGV4IHNldHMgb2YgdmVydGljZXMgKGUuZy4gdGhvc2Ugd2l0aCBob2xlcyBtYXkgZmFpbCkuXG4gICAgICogQnkgZGVmYXVsdCB0aGUgZGVjb21wb3NpdGlvbiB3aWxsIGRpc2NhcmQgY29sbGluZWFyIGVkZ2VzICh0byBpbXByb3ZlIHBlcmZvcm1hbmNlKS5cbiAgICAgKiBJdCBjYW4gYWxzbyBvcHRpb25hbGx5IGRpc2NhcmQgYW55IHBhcnRzIHRoYXQgaGF2ZSBhbiBhcmVhIGxlc3MgdGhhbiBgbWluaW11bUFyZWFgLlxuICAgICAqIElmIHRoZSB2ZXJ0aWNlcyBjYW4gbm90IGJlIGRlY29tcG9zZWQsIHRoZSByZXN1bHQgd2lsbCBmYWxsIGJhY2sgdG8gdXNpbmcgdGhlIGNvbnZleCBodWxsLlxuICAgICAqIFRoZSBvcHRpb25zIHBhcmFtZXRlciBpcyBhbiBvYmplY3QgdGhhdCBzcGVjaWZpZXMgYW55IGBNYXR0ZXIuQm9keWAgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogU2VlIHRoZSBwcm9wZXJ0aWVzIHNlY3Rpb24gb2YgdGhlIGBNYXR0ZXIuQm9keWAgbW9kdWxlIGZvciBkZXRhaWxlZCBpbmZvcm1hdGlvbiBvbiB3aGF0IHlvdSBjYW4gcGFzcyB2aWEgdGhlIGBvcHRpb25zYCBvYmplY3QuXG4gICAgICogQG1ldGhvZCBmcm9tVmVydGljZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XG4gICAgICogQHBhcmFtIFtbdmVjdG9yXV0gdmVydGV4U2V0c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiBAcGFyYW0ge2Jvb2x9IFtmbGFnSW50ZXJuYWw9ZmFsc2VdXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtyZW1vdmVDb2xsaW5lYXI9MC4wMV1cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW21pbmltdW1BcmVhPTEwXVxuICAgICAqIEByZXR1cm4ge2JvZHl9XG4gICAgICovXG4gICAgQm9kaWVzLmZyb21WZXJ0aWNlcyA9IGZ1bmN0aW9uKHgsIHksIHZlcnRleFNldHMsIG9wdGlvbnMsIGZsYWdJbnRlcm5hbCwgcmVtb3ZlQ29sbGluZWFyLCBtaW5pbXVtQXJlYSkge1xuICAgICAgICB2YXIgYm9keSxcbiAgICAgICAgICAgIHBhcnRzLFxuICAgICAgICAgICAgaXNDb252ZXgsXG4gICAgICAgICAgICB2ZXJ0aWNlcyxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIHYsXG4gICAgICAgICAgICB6O1xuXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBwYXJ0cyA9IFtdO1xuXG4gICAgICAgIGZsYWdJbnRlcm5hbCA9IHR5cGVvZiBmbGFnSW50ZXJuYWwgIT09ICd1bmRlZmluZWQnID8gZmxhZ0ludGVybmFsIDogZmFsc2U7XG4gICAgICAgIHJlbW92ZUNvbGxpbmVhciA9IHR5cGVvZiByZW1vdmVDb2xsaW5lYXIgIT09ICd1bmRlZmluZWQnID8gcmVtb3ZlQ29sbGluZWFyIDogMC4wMTtcbiAgICAgICAgbWluaW11bUFyZWEgPSB0eXBlb2YgbWluaW11bUFyZWEgIT09ICd1bmRlZmluZWQnID8gbWluaW11bUFyZWEgOiAxMDtcblxuICAgICAgICBpZiAoIXdpbmRvdy5kZWNvbXApIHtcbiAgICAgICAgICAgIENvbW1vbi5sb2coJ0JvZGllcy5mcm9tVmVydGljZXM6IHBvbHktZGVjb21wLmpzIHJlcXVpcmVkLiBDb3VsZCBub3QgZGVjb21wb3NlIHZlcnRpY2VzLiBGYWxsYmFjayB0byBjb252ZXggaHVsbC4nLCAnd2FybicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZW5zdXJlIHZlcnRleFNldHMgaXMgYW4gYXJyYXkgb2YgYXJyYXlzXG4gICAgICAgIGlmICghQ29tbW9uLmlzQXJyYXkodmVydGV4U2V0c1swXSkpIHtcbiAgICAgICAgICAgIHZlcnRleFNldHMgPSBbdmVydGV4U2V0c107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHYgPSAwOyB2IDwgdmVydGV4U2V0cy5sZW5ndGg7IHYgKz0gMSkge1xuICAgICAgICAgICAgdmVydGljZXMgPSB2ZXJ0ZXhTZXRzW3ZdO1xuICAgICAgICAgICAgaXNDb252ZXggPSBWZXJ0aWNlcy5pc0NvbnZleCh2ZXJ0aWNlcyk7XG5cbiAgICAgICAgICAgIGlmIChpc0NvbnZleCB8fCAhd2luZG93LmRlY29tcCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0NvbnZleCkge1xuICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlcyA9IFZlcnRpY2VzLmNsb2Nrd2lzZVNvcnQodmVydGljZXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZhbGxiYWNrIHRvIGNvbnZleCBodWxsIHdoZW4gZGVjb21wb3NpdGlvbiBpcyBub3QgcG9zc2libGVcbiAgICAgICAgICAgICAgICAgICAgdmVydGljZXMgPSBWZXJ0aWNlcy5odWxsKHZlcnRpY2VzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHsgeDogeCwgeTogeSB9LFxuICAgICAgICAgICAgICAgICAgICB2ZXJ0aWNlczogdmVydGljZXNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gaW5pdGlhbGlzZSBhIGRlY29tcG9zaXRpb25cbiAgICAgICAgICAgICAgICB2YXIgY29uY2F2ZSA9IG5ldyBkZWNvbXAuUG9seWdvbigpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25jYXZlLnZlcnRpY2VzLnB1c2goW3ZlcnRpY2VzW2ldLngsIHZlcnRpY2VzW2ldLnldKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyB2ZXJ0aWNlcyBhcmUgY29uY2F2ZSBhbmQgc2ltcGxlLCB3ZSBjYW4gZGVjb21wb3NlIGludG8gcGFydHNcbiAgICAgICAgICAgICAgICBjb25jYXZlLm1ha2VDQ1coKTtcbiAgICAgICAgICAgICAgICBpZiAocmVtb3ZlQ29sbGluZWFyICE9PSBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgY29uY2F2ZS5yZW1vdmVDb2xsaW5lYXJQb2ludHMocmVtb3ZlQ29sbGluZWFyKTtcblxuICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgcXVpY2sgZGVjb21wb3NpdGlvbiBhbGdvcml0aG0gKEJheWF6aXQpXG4gICAgICAgICAgICAgICAgdmFyIGRlY29tcG9zZWQgPSBjb25jYXZlLnF1aWNrRGVjb21wKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBmb3IgZWFjaCBkZWNvbXBvc2VkIGNodW5rXG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGRlY29tcG9zZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNodW5rID0gZGVjb21wb3NlZFtpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNodW5rVmVydGljZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHZlcnRpY2VzIGludG8gdGhlIGNvcnJlY3Qgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjaHVuay52ZXJ0aWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2h1bmtWZXJ0aWNlcy5wdXNoKHsgeDogY2h1bmsudmVydGljZXNbal1bMF0sIHk6IGNodW5rLnZlcnRpY2VzW2pdWzFdIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2tpcCBzbWFsbCBjaHVua3NcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1pbmltdW1BcmVhID4gMCAmJiBWZXJ0aWNlcy5hcmVhKGNodW5rVmVydGljZXMpIDwgbWluaW11bUFyZWEpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgYSBjb21wb3VuZCBwYXJ0XG4gICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFZlcnRpY2VzLmNlbnRyZShjaHVua1ZlcnRpY2VzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnRpY2VzOiBjaHVua1ZlcnRpY2VzXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNyZWF0ZSBib2R5IHBhcnRzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgcGFydHNbaV0gPSBCb2R5LmNyZWF0ZShDb21tb24uZXh0ZW5kKHBhcnRzW2ldLCBvcHRpb25zKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBmbGFnIGludGVybmFsIGVkZ2VzIChjb2luY2lkZW50IHBhcnQgZWRnZXMpXG4gICAgICAgIGlmIChmbGFnSW50ZXJuYWwpIHtcbiAgICAgICAgICAgIHZhciBjb2luY2lkZW50X21heF9kaXN0ID0gNTtcblxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnRBID0gcGFydHNbaV07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGogPSBpICsgMTsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJ0QiA9IHBhcnRzW2pdO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChCb3VuZHMub3ZlcmxhcHMocGFydEEuYm91bmRzLCBwYXJ0Qi5ib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGF2ID0gcGFydEEudmVydGljZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGJ2ID0gcGFydEIudmVydGljZXM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZXJhdGUgdmVydGljZXMgb2YgYm90aCBwYXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHBhcnRBLnZlcnRpY2VzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh6ID0gMDsgeiA8IHBhcnRCLnZlcnRpY2VzLmxlbmd0aDsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpbmQgZGlzdGFuY2VzIGJldHdlZW4gdGhlIHZlcnRpY2VzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkYSA9IFZlY3Rvci5tYWduaXR1ZGVTcXVhcmVkKFZlY3Rvci5zdWIocGF2WyhrICsgMSkgJSBwYXYubGVuZ3RoXSwgcGJ2W3pdKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYiA9IFZlY3Rvci5tYWduaXR1ZGVTcXVhcmVkKFZlY3Rvci5zdWIocGF2W2tdLCBwYnZbKHogKyAxKSAlIHBidi5sZW5ndGhdKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgYm90aCB2ZXJ0aWNlcyBhcmUgdmVyeSBjbG9zZSwgY29uc2lkZXIgdGhlIGVkZ2UgY29uY2lkZW50IChpbnRlcm5hbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhIDwgY29pbmNpZGVudF9tYXhfZGlzdCAmJiBkYiA8IGNvaW5jaWRlbnRfbWF4X2Rpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdltrXS5pc0ludGVybmFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBidlt6XS5pc0ludGVybmFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgcGFyZW50IGJvZHkgdG8gYmUgcmV0dXJuZWQsIHRoYXQgY29udGFpbnMgZ2VuZXJhdGVkIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgICAgICBib2R5ID0gQm9keS5jcmVhdGUoQ29tbW9uLmV4dGVuZCh7IHBhcnRzOiBwYXJ0cy5zbGljZSgwKSB9LCBvcHRpb25zKSk7XG4gICAgICAgICAgICBCb2R5LnNldFBvc2l0aW9uKGJvZHksIHsgeDogeCwgeTogeSB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGJvZHk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcGFydHNbMF07XG4gICAgICAgIH1cbiAgICB9O1xuXG59KSgpOyIsIi8qKlxuKiBUaGUgYE1hdHRlci5Db21wb3NpdGVzYCBtb2R1bGUgY29udGFpbnMgZmFjdG9yeSBtZXRob2RzIGZvciBjcmVhdGluZyBjb21wb3NpdGUgYm9kaWVzXG4qIHdpdGggY29tbW9ubHkgdXNlZCBjb25maWd1cmF0aW9ucyAoc3VjaCBhcyBzdGFja3MgYW5kIGNoYWlucykuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBDb21wb3NpdGVzXG4qL1xuXG52YXIgQ29tcG9zaXRlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0ZXM7XG5cbnZhciBDb21wb3NpdGUgPSByZXF1aXJlKCcuLi9ib2R5L0NvbXBvc2l0ZScpO1xudmFyIENvbnN0cmFpbnQgPSByZXF1aXJlKCcuLi9jb25zdHJhaW50L0NvbnN0cmFpbnQnKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xudmFyIEJvZHkgPSByZXF1aXJlKCcuLi9ib2R5L0JvZHknKTtcbnZhciBCb2RpZXMgPSByZXF1aXJlKCcuL0JvZGllcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgY29tcG9zaXRlIGNvbnRhaW5pbmcgYm9kaWVzIGNyZWF0ZWQgaW4gdGhlIGNhbGxiYWNrIGluIGEgZ3JpZCBhcnJhbmdlbWVudC5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIHVzZXMgdGhlIGJvZHkncyBib3VuZHMgdG8gcHJldmVudCBvdmVybGFwcy5cbiAgICAgKiBAbWV0aG9kIHN0YWNrXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHh4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHl5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm93c1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5HYXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm93R2FwXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZSBjb250YWluaW5nIG9iamVjdHMgY3JlYXRlZCBpbiB0aGUgY2FsbGJhY2tcbiAgICAgKi9cbiAgICBDb21wb3NpdGVzLnN0YWNrID0gZnVuY3Rpb24oeHgsIHl5LCBjb2x1bW5zLCByb3dzLCBjb2x1bW5HYXAsIHJvd0dhcCwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHN0YWNrID0gQ29tcG9zaXRlLmNyZWF0ZSh7IGxhYmVsOiAnU3RhY2snIH0pLFxuICAgICAgICAgICAgeCA9IHh4LFxuICAgICAgICAgICAgeSA9IHl5LFxuICAgICAgICAgICAgbGFzdEJvZHksXG4gICAgICAgICAgICBpID0gMDtcblxuICAgICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCByb3dzOyByb3crKykge1xuICAgICAgICAgICAgdmFyIG1heEhlaWdodCA9IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAodmFyIGNvbHVtbiA9IDA7IGNvbHVtbiA8IGNvbHVtbnM7IGNvbHVtbisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGJvZHkgPSBjYWxsYmFjayh4LCB5LCBjb2x1bW4sIHJvdywgbGFzdEJvZHksIGkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoYm9keSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYm9keUhlaWdodCA9IGJvZHkuYm91bmRzLm1heC55IC0gYm9keS5ib3VuZHMubWluLnksXG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5V2lkdGggPSBib2R5LmJvdW5kcy5tYXgueCAtIGJvZHkuYm91bmRzLm1pbi54OyBcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYm9keUhlaWdodCA+IG1heEhlaWdodClcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heEhlaWdodCA9IGJvZHlIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBCb2R5LnRyYW5zbGF0ZShib2R5LCB7IHg6IGJvZHlXaWR0aCAqIDAuNSwgeTogYm9keUhlaWdodCAqIDAuNSB9KTtcblxuICAgICAgICAgICAgICAgICAgICB4ID0gYm9keS5ib3VuZHMubWF4LnggKyBjb2x1bW5HYXA7XG5cbiAgICAgICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZEJvZHkoc3RhY2ssIGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgbGFzdEJvZHkgPSBib2R5O1xuICAgICAgICAgICAgICAgICAgICBpICs9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgeCArPSBjb2x1bW5HYXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB5ICs9IG1heEhlaWdodCArIHJvd0dhcDtcbiAgICAgICAgICAgIHggPSB4eDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdGFjaztcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIENoYWlucyBhbGwgYm9kaWVzIGluIHRoZSBnaXZlbiBjb21wb3NpdGUgdG9nZXRoZXIgdXNpbmcgY29uc3RyYWludHMuXG4gICAgICogQG1ldGhvZCBjaGFpblxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geE9mZnNldEFcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geU9mZnNldEFcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geE9mZnNldEJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0geU9mZnNldEJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gQSBuZXcgY29tcG9zaXRlIGNvbnRhaW5pbmcgb2JqZWN0cyBjaGFpbmVkIHRvZ2V0aGVyIHdpdGggY29uc3RyYWludHNcbiAgICAgKi9cbiAgICBDb21wb3NpdGVzLmNoYWluID0gZnVuY3Rpb24oY29tcG9zaXRlLCB4T2Zmc2V0QSwgeU9mZnNldEEsIHhPZmZzZXRCLCB5T2Zmc2V0Qiwgb3B0aW9ucykge1xuICAgICAgICB2YXIgYm9kaWVzID0gY29tcG9zaXRlLmJvZGllcztcbiAgICAgICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYm9keUEgPSBib2RpZXNbaSAtIDFdLFxuICAgICAgICAgICAgICAgIGJvZHlCID0gYm9kaWVzW2ldLFxuICAgICAgICAgICAgICAgIGJvZHlBSGVpZ2h0ID0gYm9keUEuYm91bmRzLm1heC55IC0gYm9keUEuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgICAgIGJvZHlBV2lkdGggPSBib2R5QS5ib3VuZHMubWF4LnggLSBib2R5QS5ib3VuZHMubWluLngsIFxuICAgICAgICAgICAgICAgIGJvZHlCSGVpZ2h0ID0gYm9keUIuYm91bmRzLm1heC55IC0gYm9keUIuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgICAgIGJvZHlCV2lkdGggPSBib2R5Qi5ib3VuZHMubWF4LnggLSBib2R5Qi5ib3VuZHMubWluLng7XG4gICAgICAgIFxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIGJvZHlBOiBib2R5QSxcbiAgICAgICAgICAgICAgICBwb2ludEE6IHsgeDogYm9keUFXaWR0aCAqIHhPZmZzZXRBLCB5OiBib2R5QUhlaWdodCAqIHlPZmZzZXRBIH0sXG4gICAgICAgICAgICAgICAgYm9keUI6IGJvZHlCLFxuICAgICAgICAgICAgICAgIHBvaW50QjogeyB4OiBib2R5QldpZHRoICogeE9mZnNldEIsIHk6IGJvZHlCSGVpZ2h0ICogeU9mZnNldEIgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGNvbnN0cmFpbnQgPSBDb21tb24uZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjb21wb3NpdGUsIENvbnN0cmFpbnQuY3JlYXRlKGNvbnN0cmFpbnQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbXBvc2l0ZS5sYWJlbCArPSAnIENoYWluJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb21wb3NpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbm5lY3RzIGJvZGllcyBpbiB0aGUgY29tcG9zaXRlIHdpdGggY29uc3RyYWludHMgaW4gYSBncmlkIHBhdHRlcm4sIHdpdGggb3B0aW9uYWwgY3Jvc3MgYnJhY2VzLlxuICAgICAqIEBtZXRob2QgbWVzaFxuICAgICAqIEBwYXJhbSB7Y29tcG9zaXRlfSBjb21wb3NpdGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSByb3dzXG4gICAgICogQHBhcmFtIHtib29sZWFufSBjcm9zc0JyYWNlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IFRoZSBjb21wb3NpdGUgY29udGFpbmluZyBvYmplY3RzIG1lc2hlZCB0b2dldGhlciB3aXRoIGNvbnN0cmFpbnRzXG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5tZXNoID0gZnVuY3Rpb24oY29tcG9zaXRlLCBjb2x1bW5zLCByb3dzLCBjcm9zc0JyYWNlLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBib2RpZXMgPSBjb21wb3NpdGUuYm9kaWVzLFxuICAgICAgICAgICAgcm93LFxuICAgICAgICAgICAgY29sLFxuICAgICAgICAgICAgYm9keUEsXG4gICAgICAgICAgICBib2R5QixcbiAgICAgICAgICAgIGJvZHlDO1xuICAgICAgICBcbiAgICAgICAgZm9yIChyb3cgPSAwOyByb3cgPCByb3dzOyByb3crKykge1xuICAgICAgICAgICAgZm9yIChjb2wgPSAxOyBjb2wgPCBjb2x1bW5zOyBjb2wrKykge1xuICAgICAgICAgICAgICAgIGJvZHlBID0gYm9kaWVzWyhjb2wgLSAxKSArIChyb3cgKiBjb2x1bW5zKV07XG4gICAgICAgICAgICAgICAgYm9keUIgPSBib2RpZXNbY29sICsgKHJvdyAqIGNvbHVtbnMpXTtcbiAgICAgICAgICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjb21wb3NpdGUsIENvbnN0cmFpbnQuY3JlYXRlKENvbW1vbi5leHRlbmQoeyBib2R5QTogYm9keUEsIGJvZHlCOiBib2R5QiB9LCBvcHRpb25zKSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocm93ID4gMCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29sID0gMDsgY29sIDwgY29sdW1uczsgY29sKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYm9keUEgPSBib2RpZXNbY29sICsgKChyb3cgLSAxKSAqIGNvbHVtbnMpXTtcbiAgICAgICAgICAgICAgICAgICAgYm9keUIgPSBib2RpZXNbY29sICsgKHJvdyAqIGNvbHVtbnMpXTtcbiAgICAgICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY29tcG9zaXRlLCBDb25zdHJhaW50LmNyZWF0ZShDb21tb24uZXh0ZW5kKHsgYm9keUE6IGJvZHlBLCBib2R5QjogYm9keUIgfSwgb3B0aW9ucykpKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY3Jvc3NCcmFjZSAmJiBjb2wgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5QyA9IGJvZGllc1soY29sIC0gMSkgKyAoKHJvdyAtIDEpICogY29sdW1ucyldO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY29tcG9zaXRlLCBDb25zdHJhaW50LmNyZWF0ZShDb21tb24uZXh0ZW5kKHsgYm9keUE6IGJvZHlDLCBib2R5QjogYm9keUIgfSwgb3B0aW9ucykpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjcm9zc0JyYWNlICYmIGNvbCA8IGNvbHVtbnMgLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib2R5QyA9IGJvZGllc1soY29sICsgMSkgKyAoKHJvdyAtIDEpICogY29sdW1ucyldO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ29tcG9zaXRlLmFkZENvbnN0cmFpbnQoY29tcG9zaXRlLCBDb25zdHJhaW50LmNyZWF0ZShDb21tb24uZXh0ZW5kKHsgYm9keUE6IGJvZHlDLCBib2R5QjogYm9keUIgfSwgb3B0aW9ucykpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbXBvc2l0ZS5sYWJlbCArPSAnIE1lc2gnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbXBvc2l0ZTtcbiAgICB9O1xuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBjb21wb3NpdGUgY29udGFpbmluZyBib2RpZXMgY3JlYXRlZCBpbiB0aGUgY2FsbGJhY2sgaW4gYSBweXJhbWlkIGFycmFuZ2VtZW50LlxuICAgICAqIFRoaXMgZnVuY3Rpb24gdXNlcyB0aGUgYm9keSdzIGJvdW5kcyB0byBwcmV2ZW50IG92ZXJsYXBzLlxuICAgICAqIEBtZXRob2QgcHlyYW1pZFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4eFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5zXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd3NcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY29sdW1uR2FwXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHJvd0dhcFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7Y29tcG9zaXRlfSBBIG5ldyBjb21wb3NpdGUgY29udGFpbmluZyBvYmplY3RzIGNyZWF0ZWQgaW4gdGhlIGNhbGxiYWNrXG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5weXJhbWlkID0gZnVuY3Rpb24oeHgsIHl5LCBjb2x1bW5zLCByb3dzLCBjb2x1bW5HYXAsIHJvd0dhcCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIENvbXBvc2l0ZXMuc3RhY2soeHgsIHl5LCBjb2x1bW5zLCByb3dzLCBjb2x1bW5HYXAsIHJvd0dhcCwgZnVuY3Rpb24oeCwgeSwgY29sdW1uLCByb3csIGxhc3RCb2R5LCBpKSB7XG4gICAgICAgICAgICB2YXIgYWN0dWFsUm93cyA9IE1hdGgubWluKHJvd3MsIE1hdGguY2VpbChjb2x1bW5zIC8gMikpLFxuICAgICAgICAgICAgICAgIGxhc3RCb2R5V2lkdGggPSBsYXN0Qm9keSA/IGxhc3RCb2R5LmJvdW5kcy5tYXgueCAtIGxhc3RCb2R5LmJvdW5kcy5taW4ueCA6IDA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyb3cgPiBhY3R1YWxSb3dzKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gcmV2ZXJzZSByb3cgb3JkZXJcbiAgICAgICAgICAgIHJvdyA9IGFjdHVhbFJvd3MgLSByb3c7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzdGFydCA9IHJvdyxcbiAgICAgICAgICAgICAgICBlbmQgPSBjb2x1bW5zIC0gMSAtIHJvdztcblxuICAgICAgICAgICAgaWYgKGNvbHVtbiA8IHN0YXJ0IHx8IGNvbHVtbiA+IGVuZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHJldHJvYWN0aXZlbHkgZml4IHRoZSBmaXJzdCBib2R5J3MgcG9zaXRpb24sIHNpbmNlIHdpZHRoIHdhcyB1bmtub3duXG4gICAgICAgICAgICBpZiAoaSA9PT0gMSkge1xuICAgICAgICAgICAgICAgIEJvZHkudHJhbnNsYXRlKGxhc3RCb2R5LCB7IHg6IChjb2x1bW4gKyAoY29sdW1ucyAlIDIgPT09IDEgPyAxIDogLTEpKSAqIGxhc3RCb2R5V2lkdGgsIHk6IDAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB4T2Zmc2V0ID0gbGFzdEJvZHkgPyBjb2x1bW4gKiBsYXN0Qm9keVdpZHRoIDogMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHh4ICsgeE9mZnNldCArIGNvbHVtbiAqIGNvbHVtbkdhcCwgeSwgY29sdW1uLCByb3csIGxhc3RCb2R5LCBpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBjb21wb3NpdGUgd2l0aCBhIE5ld3RvbidzIENyYWRsZSBzZXR1cCBvZiBib2RpZXMgYW5kIGNvbnN0cmFpbnRzLlxuICAgICAqIEBtZXRob2QgbmV3dG9uc0NyYWRsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4eFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2l6ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsZW5ndGhcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZSBuZXd0b25zQ3JhZGxlIGJvZHlcbiAgICAgKi9cbiAgICBDb21wb3NpdGVzLm5ld3RvbnNDcmFkbGUgPSBmdW5jdGlvbih4eCwgeXksIG51bWJlciwgc2l6ZSwgbGVuZ3RoKSB7XG4gICAgICAgIHZhciBuZXd0b25zQ3JhZGxlID0gQ29tcG9zaXRlLmNyZWF0ZSh7IGxhYmVsOiAnTmV3dG9ucyBDcmFkbGUnIH0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtYmVyOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzZXBhcmF0aW9uID0gMS45LFxuICAgICAgICAgICAgICAgIGNpcmNsZSA9IEJvZGllcy5jaXJjbGUoeHggKyBpICogKHNpemUgKiBzZXBhcmF0aW9uKSwgeXkgKyBsZW5ndGgsIHNpemUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgaW5lcnRpYTogSW5maW5pdHksIHJlc3RpdHV0aW9uOiAxLCBmcmljdGlvbjogMCwgZnJpY3Rpb25BaXI6IDAuMDAwMSwgc2xvcDogMSB9KSxcbiAgICAgICAgICAgICAgICBjb25zdHJhaW50ID0gQ29uc3RyYWludC5jcmVhdGUoeyBwb2ludEE6IHsgeDogeHggKyBpICogKHNpemUgKiBzZXBhcmF0aW9uKSwgeTogeXkgfSwgYm9keUI6IGNpcmNsZSB9KTtcblxuICAgICAgICAgICAgQ29tcG9zaXRlLmFkZEJvZHkobmV3dG9uc0NyYWRsZSwgY2lyY2xlKTtcbiAgICAgICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KG5ld3RvbnNDcmFkbGUsIGNvbnN0cmFpbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ld3RvbnNDcmFkbGU7XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgY29tcG9zaXRlIHdpdGggc2ltcGxlIGNhciBzZXR1cCBvZiBib2RpZXMgYW5kIGNvbnN0cmFpbnRzLlxuICAgICAqIEBtZXRob2QgY2FyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHh4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHl5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHdpZHRoXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGhlaWdodFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB3aGVlbFNpemVcbiAgICAgKiBAcmV0dXJuIHtjb21wb3NpdGV9IEEgbmV3IGNvbXBvc2l0ZSBjYXIgYm9keVxuICAgICAqL1xuICAgIENvbXBvc2l0ZXMuY2FyID0gZnVuY3Rpb24oeHgsIHl5LCB3aWR0aCwgaGVpZ2h0LCB3aGVlbFNpemUpIHtcbiAgICAgICAgdmFyIGdyb3VwID0gQm9keS5uZXh0R3JvdXAodHJ1ZSksXG4gICAgICAgICAgICB3aGVlbEJhc2UgPSAtMjAsXG4gICAgICAgICAgICB3aGVlbEFPZmZzZXQgPSAtd2lkdGggKiAwLjUgKyB3aGVlbEJhc2UsXG4gICAgICAgICAgICB3aGVlbEJPZmZzZXQgPSB3aWR0aCAqIDAuNSAtIHdoZWVsQmFzZSxcbiAgICAgICAgICAgIHdoZWVsWU9mZnNldCA9IDA7XG4gICAgXG4gICAgICAgIHZhciBjYXIgPSBDb21wb3NpdGUuY3JlYXRlKHsgbGFiZWw6ICdDYXInIH0pLFxuICAgICAgICAgICAgYm9keSA9IEJvZGllcy50cmFwZXpvaWQoeHgsIHl5LCB3aWR0aCwgaGVpZ2h0LCAwLjMsIHsgXG4gICAgICAgICAgICAgICAgY29sbGlzaW9uRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnJpY3Rpb246IDAuMDEsXG4gICAgICAgICAgICAgICAgY2hhbWZlcjoge1xuICAgICAgICAgICAgICAgICAgICByYWRpdXM6IDEwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgXG4gICAgICAgIHZhciB3aGVlbEEgPSBCb2RpZXMuY2lyY2xlKHh4ICsgd2hlZWxBT2Zmc2V0LCB5eSArIHdoZWVsWU9mZnNldCwgd2hlZWxTaXplLCB7IFxuICAgICAgICAgICAgY29sbGlzaW9uRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgZ3JvdXA6IGdyb3VwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnJpY3Rpb246IDAuOCxcbiAgICAgICAgICAgIGRlbnNpdHk6IDAuMDFcbiAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB2YXIgd2hlZWxCID0gQm9kaWVzLmNpcmNsZSh4eCArIHdoZWVsQk9mZnNldCwgeXkgKyB3aGVlbFlPZmZzZXQsIHdoZWVsU2l6ZSwgeyBcbiAgICAgICAgICAgIGNvbGxpc2lvbkZpbHRlcjoge1xuICAgICAgICAgICAgICAgIGdyb3VwOiBncm91cFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZyaWN0aW9uOiAwLjgsXG4gICAgICAgICAgICBkZW5zaXR5OiAwLjAxXG4gICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgdmFyIGF4ZWxBID0gQ29uc3RyYWludC5jcmVhdGUoe1xuICAgICAgICAgICAgYm9keUE6IGJvZHksXG4gICAgICAgICAgICBwb2ludEE6IHsgeDogd2hlZWxBT2Zmc2V0LCB5OiB3aGVlbFlPZmZzZXQgfSxcbiAgICAgICAgICAgIGJvZHlCOiB3aGVlbEEsXG4gICAgICAgICAgICBzdGlmZm5lc3M6IDAuMlxuICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICB2YXIgYXhlbEIgPSBDb25zdHJhaW50LmNyZWF0ZSh7XG4gICAgICAgICAgICBib2R5QTogYm9keSxcbiAgICAgICAgICAgIHBvaW50QTogeyB4OiB3aGVlbEJPZmZzZXQsIHk6IHdoZWVsWU9mZnNldCB9LFxuICAgICAgICAgICAgYm9keUI6IHdoZWVsQixcbiAgICAgICAgICAgIHN0aWZmbmVzczogMC4yXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgQ29tcG9zaXRlLmFkZEJvZHkoY2FyLCBib2R5KTtcbiAgICAgICAgQ29tcG9zaXRlLmFkZEJvZHkoY2FyLCB3aGVlbEEpO1xuICAgICAgICBDb21wb3NpdGUuYWRkQm9keShjYXIsIHdoZWVsQik7XG4gICAgICAgIENvbXBvc2l0ZS5hZGRDb25zdHJhaW50KGNhciwgYXhlbEEpO1xuICAgICAgICBDb21wb3NpdGUuYWRkQ29uc3RyYWludChjYXIsIGF4ZWxCKTtcblxuICAgICAgICByZXR1cm4gY2FyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgc2ltcGxlIHNvZnQgYm9keSBsaWtlIG9iamVjdC5cbiAgICAgKiBAbWV0aG9kIHNvZnRCb2R5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHh4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHl5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGNvbHVtbnNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm93c1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW5HYXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcm93R2FwXG4gICAgICogQHBhcmFtIHtib29sZWFufSBjcm9zc0JyYWNlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBhcnRpY2xlUmFkaXVzXG4gICAgICogQHBhcmFtIHt9IHBhcnRpY2xlT3B0aW9uc1xuICAgICAqIEBwYXJhbSB7fSBjb25zdHJhaW50T3B0aW9uc1xuICAgICAqIEByZXR1cm4ge2NvbXBvc2l0ZX0gQSBuZXcgY29tcG9zaXRlIHNvZnRCb2R5XG4gICAgICovXG4gICAgQ29tcG9zaXRlcy5zb2Z0Qm9keSA9IGZ1bmN0aW9uKHh4LCB5eSwgY29sdW1ucywgcm93cywgY29sdW1uR2FwLCByb3dHYXAsIGNyb3NzQnJhY2UsIHBhcnRpY2xlUmFkaXVzLCBwYXJ0aWNsZU9wdGlvbnMsIGNvbnN0cmFpbnRPcHRpb25zKSB7XG4gICAgICAgIHBhcnRpY2xlT3B0aW9ucyA9IENvbW1vbi5leHRlbmQoeyBpbmVydGlhOiBJbmZpbml0eSB9LCBwYXJ0aWNsZU9wdGlvbnMpO1xuICAgICAgICBjb25zdHJhaW50T3B0aW9ucyA9IENvbW1vbi5leHRlbmQoeyBzdGlmZm5lc3M6IDAuNCB9LCBjb25zdHJhaW50T3B0aW9ucyk7XG5cbiAgICAgICAgdmFyIHNvZnRCb2R5ID0gQ29tcG9zaXRlcy5zdGFjayh4eCwgeXksIGNvbHVtbnMsIHJvd3MsIGNvbHVtbkdhcCwgcm93R2FwLCBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgICAgICByZXR1cm4gQm9kaWVzLmNpcmNsZSh4LCB5LCBwYXJ0aWNsZVJhZGl1cywgcGFydGljbGVPcHRpb25zKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgQ29tcG9zaXRlcy5tZXNoKHNvZnRCb2R5LCBjb2x1bW5zLCByb3dzLCBjcm9zc0JyYWNlLCBjb25zdHJhaW50T3B0aW9ucyk7XG5cbiAgICAgICAgc29mdEJvZHkubGFiZWwgPSAnU29mdCBCb2R5JztcblxuICAgICAgICByZXR1cm4gc29mdEJvZHk7XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5BeGVzYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBzZXRzIG9mIGF4ZXMuXG4qXG4qIEBjbGFzcyBBeGVzXG4qL1xuXG52YXIgQXhlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF4ZXM7XG5cbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHNldCBvZiBheGVzIGZyb20gdGhlIGdpdmVuIHZlcnRpY2VzLlxuICAgICAqIEBtZXRob2QgZnJvbVZlcnRpY2VzXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcmV0dXJuIHtheGVzfSBBIG5ldyBheGVzIGZyb20gdGhlIGdpdmVuIHZlcnRpY2VzXG4gICAgICovXG4gICAgQXhlcy5mcm9tVmVydGljZXMgPSBmdW5jdGlvbih2ZXJ0aWNlcykge1xuICAgICAgICB2YXIgYXhlcyA9IHt9O1xuXG4gICAgICAgIC8vIGZpbmQgdGhlIHVuaXF1ZSBheGVzLCB1c2luZyBlZGdlIG5vcm1hbCBncmFkaWVudHNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGogPSAoaSArIDEpICUgdmVydGljZXMubGVuZ3RoLCBcbiAgICAgICAgICAgICAgICBub3JtYWwgPSBWZWN0b3Iubm9ybWFsaXNlKHsgXG4gICAgICAgICAgICAgICAgICAgIHg6IHZlcnRpY2VzW2pdLnkgLSB2ZXJ0aWNlc1tpXS55LCBcbiAgICAgICAgICAgICAgICAgICAgeTogdmVydGljZXNbaV0ueCAtIHZlcnRpY2VzW2pdLnhcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBncmFkaWVudCA9IChub3JtYWwueSA9PT0gMCkgPyBJbmZpbml0eSA6IChub3JtYWwueCAvIG5vcm1hbC55KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gbGltaXQgcHJlY2lzaW9uXG4gICAgICAgICAgICBncmFkaWVudCA9IGdyYWRpZW50LnRvRml4ZWQoMykudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGF4ZXNbZ3JhZGllbnRdID0gbm9ybWFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIENvbW1vbi52YWx1ZXMoYXhlcyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJvdGF0ZXMgYSBzZXQgb2YgYXhlcyBieSB0aGUgZ2l2ZW4gYW5nbGUuXG4gICAgICogQG1ldGhvZCByb3RhdGVcbiAgICAgKiBAcGFyYW0ge2F4ZXN9IGF4ZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGVcbiAgICAgKi9cbiAgICBBeGVzLnJvdGF0ZSA9IGZ1bmN0aW9uKGF4ZXMsIGFuZ2xlKSB7XG4gICAgICAgIGlmIChhbmdsZSA9PT0gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSksXG4gICAgICAgICAgICBzaW4gPSBNYXRoLnNpbihhbmdsZSk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBheGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYXhpcyA9IGF4ZXNbaV0sXG4gICAgICAgICAgICAgICAgeHg7XG4gICAgICAgICAgICB4eCA9IGF4aXMueCAqIGNvcyAtIGF4aXMueSAqIHNpbjtcbiAgICAgICAgICAgIGF4aXMueSA9IGF4aXMueCAqIHNpbiArIGF4aXMueSAqIGNvcztcbiAgICAgICAgICAgIGF4aXMueCA9IHh4O1xuICAgICAgICB9XG4gICAgfTtcblxufSkoKTtcbiIsIi8qKlxuKiBUaGUgYE1hdHRlci5Cb3VuZHNgIG1vZHVsZSBjb250YWlucyBtZXRob2RzIGZvciBjcmVhdGluZyBhbmQgbWFuaXB1bGF0aW5nIGF4aXMtYWxpZ25lZCBib3VuZGluZyBib3hlcyAoQUFCQikuXG4qXG4qIEBjbGFzcyBCb3VuZHNcbiovXG5cbnZhciBCb3VuZHMgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3VuZHM7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgYXhpcy1hbGlnbmVkIGJvdW5kaW5nIGJveCAoQUFCQikgZm9yIHRoZSBnaXZlbiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHJldHVybiB7Ym91bmRzfSBBIG5ldyBib3VuZHMgb2JqZWN0XG4gICAgICovXG4gICAgQm91bmRzLmNyZWF0ZSA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgICAgIHZhciBib3VuZHMgPSB7IFxuICAgICAgICAgICAgbWluOiB7IHg6IDAsIHk6IDAgfSwgXG4gICAgICAgICAgICBtYXg6IHsgeDogMCwgeTogMCB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHZlcnRpY2VzKVxuICAgICAgICAgICAgQm91bmRzLnVwZGF0ZShib3VuZHMsIHZlcnRpY2VzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBib3VuZHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgYm91bmRzIHVzaW5nIHRoZSBnaXZlbiB2ZXJ0aWNlcyBhbmQgZXh0ZW5kcyB0aGUgYm91bmRzIGdpdmVuIGEgdmVsb2NpdHkuXG4gICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gYm91bmRzXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVsb2NpdHlcbiAgICAgKi9cbiAgICBCb3VuZHMudXBkYXRlID0gZnVuY3Rpb24oYm91bmRzLCB2ZXJ0aWNlcywgdmVsb2NpdHkpIHtcbiAgICAgICAgYm91bmRzLm1pbi54ID0gSW5maW5pdHk7XG4gICAgICAgIGJvdW5kcy5tYXgueCA9IC1JbmZpbml0eTtcbiAgICAgICAgYm91bmRzLm1pbi55ID0gSW5maW5pdHk7XG4gICAgICAgIGJvdW5kcy5tYXgueSA9IC1JbmZpbml0eTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmVydGV4ID0gdmVydGljZXNbaV07XG4gICAgICAgICAgICBpZiAodmVydGV4LnggPiBib3VuZHMubWF4LngpIGJvdW5kcy5tYXgueCA9IHZlcnRleC54O1xuICAgICAgICAgICAgaWYgKHZlcnRleC54IDwgYm91bmRzLm1pbi54KSBib3VuZHMubWluLnggPSB2ZXJ0ZXgueDtcbiAgICAgICAgICAgIGlmICh2ZXJ0ZXgueSA+IGJvdW5kcy5tYXgueSkgYm91bmRzLm1heC55ID0gdmVydGV4Lnk7XG4gICAgICAgICAgICBpZiAodmVydGV4LnkgPCBib3VuZHMubWluLnkpIGJvdW5kcy5taW4ueSA9IHZlcnRleC55O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodmVsb2NpdHkpIHtcbiAgICAgICAgICAgIGlmICh2ZWxvY2l0eS54ID4gMCkge1xuICAgICAgICAgICAgICAgIGJvdW5kcy5tYXgueCArPSB2ZWxvY2l0eS54O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBib3VuZHMubWluLnggKz0gdmVsb2NpdHkueDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHZlbG9jaXR5LnkgPiAwKSB7XG4gICAgICAgICAgICAgICAgYm91bmRzLm1heC55ICs9IHZlbG9jaXR5Lnk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJvdW5kcy5taW4ueSArPSB2ZWxvY2l0eS55O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYm91bmRzIGNvbnRhaW5zIHRoZSBnaXZlbiBwb2ludC5cbiAgICAgKiBAbWV0aG9kIGNvbnRhaW5zXG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBwb2ludFxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIGJvdW5kcyBjb250YWluIHRoZSBwb2ludCwgb3RoZXJ3aXNlIGZhbHNlXG4gICAgICovXG4gICAgQm91bmRzLmNvbnRhaW5zID0gZnVuY3Rpb24oYm91bmRzLCBwb2ludCkge1xuICAgICAgICByZXR1cm4gcG9pbnQueCA+PSBib3VuZHMubWluLnggJiYgcG9pbnQueCA8PSBib3VuZHMubWF4LnggXG4gICAgICAgICAgICAgICAmJiBwb2ludC55ID49IGJvdW5kcy5taW4ueSAmJiBwb2ludC55IDw9IGJvdW5kcy5tYXgueTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSB0d28gYm91bmRzIGludGVyc2VjdC5cbiAgICAgKiBAbWV0aG9kIG92ZXJsYXBzXG4gICAgICogQHBhcmFtIHtib3VuZHN9IGJvdW5kc0FcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gYm91bmRzQlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIGJvdW5kcyBvdmVybGFwLCBvdGhlcndpc2UgZmFsc2VcbiAgICAgKi9cbiAgICBCb3VuZHMub3ZlcmxhcHMgPSBmdW5jdGlvbihib3VuZHNBLCBib3VuZHNCKSB7XG4gICAgICAgIHJldHVybiAoYm91bmRzQS5taW4ueCA8PSBib3VuZHNCLm1heC54ICYmIGJvdW5kc0EubWF4LnggPj0gYm91bmRzQi5taW4ueFxuICAgICAgICAgICAgICAgICYmIGJvdW5kc0EubWF4LnkgPj0gYm91bmRzQi5taW4ueSAmJiBib3VuZHNBLm1pbi55IDw9IGJvdW5kc0IubWF4LnkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2xhdGVzIHRoZSBib3VuZHMgYnkgdGhlIGdpdmVuIHZlY3Rvci5cbiAgICAgKiBAbWV0aG9kIHRyYW5zbGF0ZVxuICAgICAqIEBwYXJhbSB7Ym91bmRzfSBib3VuZHNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICovXG4gICAgQm91bmRzLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKGJvdW5kcywgdmVjdG9yKSB7XG4gICAgICAgIGJvdW5kcy5taW4ueCArPSB2ZWN0b3IueDtcbiAgICAgICAgYm91bmRzLm1heC54ICs9IHZlY3Rvci54O1xuICAgICAgICBib3VuZHMubWluLnkgKz0gdmVjdG9yLnk7XG4gICAgICAgIGJvdW5kcy5tYXgueSArPSB2ZWN0b3IueTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hpZnRzIHRoZSBib3VuZHMgdG8gdGhlIGdpdmVuIHBvc2l0aW9uLlxuICAgICAqIEBtZXRob2Qgc2hpZnRcbiAgICAgKiBAcGFyYW0ge2JvdW5kc30gYm91bmRzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvc2l0aW9uXG4gICAgICovXG4gICAgQm91bmRzLnNoaWZ0ID0gZnVuY3Rpb24oYm91bmRzLCBwb3NpdGlvbikge1xuICAgICAgICB2YXIgZGVsdGFYID0gYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54LFxuICAgICAgICAgICAgZGVsdGFZID0gYm91bmRzLm1heC55IC0gYm91bmRzLm1pbi55O1xuICAgICAgICAgICAgXG4gICAgICAgIGJvdW5kcy5taW4ueCA9IHBvc2l0aW9uLng7XG4gICAgICAgIGJvdW5kcy5tYXgueCA9IHBvc2l0aW9uLnggKyBkZWx0YVg7XG4gICAgICAgIGJvdW5kcy5taW4ueSA9IHBvc2l0aW9uLnk7XG4gICAgICAgIGJvdW5kcy5tYXgueSA9IHBvc2l0aW9uLnkgKyBkZWx0YVk7XG4gICAgfTtcbiAgICBcbn0pKCk7XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuU3ZnYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY29udmVydGluZyBTVkcgaW1hZ2VzIGludG8gYW4gYXJyYXkgb2YgdmVjdG9yIHBvaW50cy5cbipcbiogVG8gdXNlIHRoaXMgbW9kdWxlIHlvdSBhbHNvIG5lZWQgdGhlIFNWR1BhdGhTZWcgcG9seWZpbGw6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9nZXJzL3BhdGhzZWdcbipcbiogU2VlIHRoZSBpbmNsdWRlZCB1c2FnZSBbZXhhbXBsZXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9saWFicnUvbWF0dGVyLWpzL3RyZWUvbWFzdGVyL2V4YW1wbGVzKS5cbipcbiogQGNsYXNzIFN2Z1xuKi9cblxudmFyIFN2ZyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN2ZztcblxudmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhbiBTVkcgcGF0aCBpbnRvIGFuIGFycmF5IG9mIHZlY3RvciBwb2ludHMuXG4gICAgICogSWYgdGhlIGlucHV0IHBhdGggZm9ybXMgYSBjb25jYXZlIHNoYXBlLCB5b3UgbXVzdCBkZWNvbXBvc2UgdGhlIHJlc3VsdCBpbnRvIGNvbnZleCBwYXJ0cyBiZWZvcmUgdXNlLlxuICAgICAqIFNlZSBgQm9kaWVzLmZyb21WZXJ0aWNlc2Agd2hpY2ggcHJvdmlkZXMgc3VwcG9ydCBmb3IgdGhpcy5cbiAgICAgKiBOb3RlIHRoYXQgdGhpcyBmdW5jdGlvbiBpcyBub3QgZ3VhcmFudGVlZCB0byBzdXBwb3J0IGNvbXBsZXggcGF0aHMgKHN1Y2ggYXMgdGhvc2Ugd2l0aCBob2xlcykuXG4gICAgICogQG1ldGhvZCBwYXRoVG9WZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7U1ZHUGF0aEVsZW1lbnR9IHBhdGhcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3NhbXBsZUxlbmd0aD0xNV1cbiAgICAgKiBAcmV0dXJuIHtWZWN0b3JbXX0gcG9pbnRzXG4gICAgICovXG4gICAgU3ZnLnBhdGhUb1ZlcnRpY2VzID0gZnVuY3Rpb24ocGF0aCwgc2FtcGxlTGVuZ3RoKSB7XG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93b3V0L3N2Zy50b3BvbHkuanMvYmxvYi9tYXN0ZXIvc3ZnLnRvcG9seS5qc1xuICAgICAgICB2YXIgaSwgaWwsIHRvdGFsLCBwb2ludCwgc2VnbWVudCwgc2VnbWVudHMsIFxuICAgICAgICAgICAgc2VnbWVudHNRdWV1ZSwgbGFzdFNlZ21lbnQsIFxuICAgICAgICAgICAgbGFzdFBvaW50LCBzZWdtZW50SW5kZXgsIHBvaW50cyA9IFtdLFxuICAgICAgICAgICAgbHgsIGx5LCBsZW5ndGggPSAwLCB4ID0gMCwgeSA9IDA7XG5cbiAgICAgICAgc2FtcGxlTGVuZ3RoID0gc2FtcGxlTGVuZ3RoIHx8IDE1O1xuXG4gICAgICAgIHZhciBhZGRQb2ludCA9IGZ1bmN0aW9uKHB4LCBweSwgcGF0aFNlZ1R5cGUpIHtcbiAgICAgICAgICAgIC8vIGFsbCBvZGQtbnVtYmVyZWQgcGF0aCB0eXBlcyBhcmUgcmVsYXRpdmUgZXhjZXB0IFBBVEhTRUdfQ0xPU0VQQVRIICgxKVxuICAgICAgICAgICAgdmFyIGlzUmVsYXRpdmUgPSBwYXRoU2VnVHlwZSAlIDIgPT09IDEgJiYgcGF0aFNlZ1R5cGUgPiAxO1xuXG4gICAgICAgICAgICAvLyB3aGVuIHRoZSBsYXN0IHBvaW50IGRvZXNuJ3QgZXF1YWwgdGhlIGN1cnJlbnQgcG9pbnQgYWRkIHRoZSBjdXJyZW50IHBvaW50XG4gICAgICAgICAgICBpZiAoIWxhc3RQb2ludCB8fCBweCAhPSBsYXN0UG9pbnQueCB8fCBweSAhPSBsYXN0UG9pbnQueSkge1xuICAgICAgICAgICAgICAgIGlmIChsYXN0UG9pbnQgJiYgaXNSZWxhdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBseCA9IGxhc3RQb2ludC54O1xuICAgICAgICAgICAgICAgICAgICBseSA9IGxhc3RQb2ludC55O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGx4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbHkgPSAwO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogbHggKyBweCxcbiAgICAgICAgICAgICAgICAgICAgeTogbHkgKyBweVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBzZXQgbGFzdCBwb2ludFxuICAgICAgICAgICAgICAgIGlmIChpc1JlbGF0aXZlIHx8ICFsYXN0UG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFzdFBvaW50ID0gcG9pbnQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcG9pbnRzLnB1c2gocG9pbnQpO1xuXG4gICAgICAgICAgICAgICAgeCA9IGx4ICsgcHg7XG4gICAgICAgICAgICAgICAgeSA9IGx5ICsgcHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGFkZFNlZ21lbnRQb2ludCA9IGZ1bmN0aW9uKHNlZ21lbnQpIHtcbiAgICAgICAgICAgIHZhciBzZWdUeXBlID0gc2VnbWVudC5wYXRoU2VnVHlwZUFzTGV0dGVyLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgICAgIC8vIHNraXAgcGF0aCBlbmRzXG4gICAgICAgICAgICBpZiAoc2VnVHlwZSA9PT0gJ1onKSBcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIG1hcCBzZWdtZW50IHRvIHggYW5kIHlcbiAgICAgICAgICAgIHN3aXRjaCAoc2VnVHlwZSkge1xuXG4gICAgICAgICAgICBjYXNlICdNJzpcbiAgICAgICAgICAgIGNhc2UgJ0wnOlxuICAgICAgICAgICAgY2FzZSAnVCc6XG4gICAgICAgICAgICBjYXNlICdDJzpcbiAgICAgICAgICAgIGNhc2UgJ1MnOlxuICAgICAgICAgICAgY2FzZSAnUSc6XG4gICAgICAgICAgICAgICAgeCA9IHNlZ21lbnQueDtcbiAgICAgICAgICAgICAgICB5ID0gc2VnbWVudC55O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnSCc6XG4gICAgICAgICAgICAgICAgeCA9IHNlZ21lbnQueDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1YnOlxuICAgICAgICAgICAgICAgIHkgPSBzZWdtZW50Lnk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFkZFBvaW50KHgsIHksIHNlZ21lbnQucGF0aFNlZ1R5cGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGVuc3VyZSBwYXRoIGlzIGFic29sdXRlXG4gICAgICAgIF9zdmdQYXRoVG9BYnNvbHV0ZShwYXRoKTtcblxuICAgICAgICAvLyBnZXQgdG90YWwgbGVuZ3RoXG4gICAgICAgIHRvdGFsID0gcGF0aC5nZXRUb3RhbExlbmd0aCgpO1xuXG4gICAgICAgIC8vIHF1ZXVlIHNlZ21lbnRzXG4gICAgICAgIHNlZ21lbnRzID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBwYXRoLnBhdGhTZWdMaXN0Lm51bWJlck9mSXRlbXM7IGkgKz0gMSlcbiAgICAgICAgICAgIHNlZ21lbnRzLnB1c2gocGF0aC5wYXRoU2VnTGlzdC5nZXRJdGVtKGkpKTtcblxuICAgICAgICBzZWdtZW50c1F1ZXVlID0gc2VnbWVudHMuY29uY2F0KCk7XG5cbiAgICAgICAgLy8gc2FtcGxlIHRocm91Z2ggcGF0aFxuICAgICAgICB3aGlsZSAobGVuZ3RoIDwgdG90YWwpIHtcbiAgICAgICAgICAgIC8vIGdldCBzZWdtZW50IGF0IHBvc2l0aW9uXG4gICAgICAgICAgICBzZWdtZW50SW5kZXggPSBwYXRoLmdldFBhdGhTZWdBdExlbmd0aChsZW5ndGgpO1xuICAgICAgICAgICAgc2VnbWVudCA9IHNlZ21lbnRzW3NlZ21lbnRJbmRleF07XG5cbiAgICAgICAgICAgIC8vIG5ldyBzZWdtZW50XG4gICAgICAgICAgICBpZiAoc2VnbWVudCAhPSBsYXN0U2VnbWVudCkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChzZWdtZW50c1F1ZXVlLmxlbmd0aCAmJiBzZWdtZW50c1F1ZXVlWzBdICE9IHNlZ21lbnQpXG4gICAgICAgICAgICAgICAgICAgIGFkZFNlZ21lbnRQb2ludChzZWdtZW50c1F1ZXVlLnNoaWZ0KCkpO1xuXG4gICAgICAgICAgICAgICAgbGFzdFNlZ21lbnQgPSBzZWdtZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgcG9pbnRzIGluIGJldHdlZW4gd2hlbiBjdXJ2aW5nXG4gICAgICAgICAgICAvLyBUT0RPOiBhZGFwdGl2ZSBzYW1wbGluZ1xuICAgICAgICAgICAgc3dpdGNoIChzZWdtZW50LnBhdGhTZWdUeXBlQXNMZXR0ZXIudG9VcHBlckNhc2UoKSkge1xuXG4gICAgICAgICAgICBjYXNlICdDJzpcbiAgICAgICAgICAgIGNhc2UgJ1QnOlxuICAgICAgICAgICAgY2FzZSAnUyc6XG4gICAgICAgICAgICBjYXNlICdRJzpcbiAgICAgICAgICAgIGNhc2UgJ0EnOlxuICAgICAgICAgICAgICAgIHBvaW50ID0gcGF0aC5nZXRQb2ludEF0TGVuZ3RoKGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgYWRkUG9pbnQocG9pbnQueCwgcG9pbnQueSwgMCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW5jcmVtZW50IGJ5IHNhbXBsZSB2YWx1ZVxuICAgICAgICAgICAgbGVuZ3RoICs9IHNhbXBsZUxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCByZW1haW5pbmcgc2VnbWVudHMgbm90IHBhc3NlZCBieSBzYW1wbGluZ1xuICAgICAgICBmb3IgKGkgPSAwLCBpbCA9IHNlZ21lbnRzUXVldWUubGVuZ3RoOyBpIDwgaWw7ICsraSlcbiAgICAgICAgICAgIGFkZFNlZ21lbnRQb2ludChzZWdtZW50c1F1ZXVlW2ldKTtcblxuICAgICAgICByZXR1cm4gcG9pbnRzO1xuICAgIH07XG5cbiAgICB2YXIgX3N2Z1BhdGhUb0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICAgICAgICAvLyBodHRwOi8vcGhyb2d6Lm5ldC9jb252ZXJ0LXN2Zy1wYXRoLXRvLWFsbC1hYnNvbHV0ZS1jb21tYW5kc1xuICAgICAgICB2YXIgeDAsIHkwLCB4MSwgeTEsIHgyLCB5Miwgc2VncyA9IHBhdGgucGF0aFNlZ0xpc3QsXG4gICAgICAgICAgICB4ID0gMCwgeSA9IDAsIGxlbiA9IHNlZ3MubnVtYmVyT2ZJdGVtcztcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICB2YXIgc2VnID0gc2Vncy5nZXRJdGVtKGkpLFxuICAgICAgICAgICAgICAgIHNlZ1R5cGUgPSBzZWcucGF0aFNlZ1R5cGVBc0xldHRlcjtcblxuICAgICAgICAgICAgaWYgKC9bTUxIVkNTUVRBXS8udGVzdChzZWdUeXBlKSkge1xuICAgICAgICAgICAgICAgIGlmICgneCcgaW4gc2VnKSB4ID0gc2VnLng7XG4gICAgICAgICAgICAgICAgaWYgKCd5JyBpbiBzZWcpIHkgPSBzZWcueTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCd4MScgaW4gc2VnKSB4MSA9IHggKyBzZWcueDE7XG4gICAgICAgICAgICAgICAgaWYgKCd4MicgaW4gc2VnKSB4MiA9IHggKyBzZWcueDI7XG4gICAgICAgICAgICAgICAgaWYgKCd5MScgaW4gc2VnKSB5MSA9IHkgKyBzZWcueTE7XG4gICAgICAgICAgICAgICAgaWYgKCd5MicgaW4gc2VnKSB5MiA9IHkgKyBzZWcueTI7XG4gICAgICAgICAgICAgICAgaWYgKCd4JyBpbiBzZWcpIHggKz0gc2VnLng7XG4gICAgICAgICAgICAgICAgaWYgKCd5JyBpbiBzZWcpIHkgKz0gc2VnLnk7XG5cbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHNlZ1R5cGUpIHtcblxuICAgICAgICAgICAgICAgIGNhc2UgJ20nOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ01vdmV0b0Ficyh4LCB5KSwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2wnOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ0xpbmV0b0Ficyh4LCB5KSwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2gnOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ0xpbmV0b0hvcml6b250YWxBYnMoeCksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd2JzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdMaW5ldG9WZXJ0aWNhbEFicyh5KSwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2MnOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ0N1cnZldG9DdWJpY0Ficyh4LCB5LCB4MSwgeTEsIHgyLCB5MiksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdzJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdDdXJ2ZXRvQ3ViaWNTbW9vdGhBYnMoeCwgeSwgeDIsIHkyKSwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3EnOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ0N1cnZldG9RdWFkcmF0aWNBYnMoeCwgeSwgeDEsIHkxKSwgaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICBzZWdzLnJlcGxhY2VJdGVtKHBhdGguY3JlYXRlU1ZHUGF0aFNlZ0N1cnZldG9RdWFkcmF0aWNTbW9vdGhBYnMoeCwgeSksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdhJzpcbiAgICAgICAgICAgICAgICAgICAgc2Vncy5yZXBsYWNlSXRlbShwYXRoLmNyZWF0ZVNWR1BhdGhTZWdBcmNBYnMoeCwgeSwgc2VnLnIxLCBzZWcucjIsIHNlZy5hbmdsZSwgc2VnLmxhcmdlQXJjRmxhZywgc2VnLnN3ZWVwRmxhZyksIGkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd6JzpcbiAgICAgICAgICAgICAgICBjYXNlICdaJzpcbiAgICAgICAgICAgICAgICAgICAgeCA9IHgwO1xuICAgICAgICAgICAgICAgICAgICB5ID0geTA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2VnVHlwZSA9PSAnTScgfHwgc2VnVHlwZSA9PSAnbScpIHtcbiAgICAgICAgICAgICAgICB4MCA9IHg7XG4gICAgICAgICAgICAgICAgeTAgPSB5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxufSkoKTsiLCIvKipcbiogVGhlIGBNYXR0ZXIuVmVjdG9yYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyB2ZWN0b3JzLlxuKiBWZWN0b3JzIGFyZSB0aGUgYmFzaXMgb2YgYWxsIHRoZSBnZW9tZXRyeSByZWxhdGVkIG9wZXJhdGlvbnMgaW4gdGhlIGVuZ2luZS5cbiogQSBgTWF0dGVyLlZlY3RvcmAgb2JqZWN0IGlzIG9mIHRoZSBmb3JtIGB7IHg6IDAsIHk6IDAgfWAuXG4qXG4qIFNlZSB0aGUgaW5jbHVkZWQgdXNhZ2UgW2V4YW1wbGVzXShodHRwczovL2dpdGh1Yi5jb20vbGlhYnJ1L21hdHRlci1qcy90cmVlL21hc3Rlci9leGFtcGxlcykuXG4qXG4qIEBjbGFzcyBWZWN0b3JcbiovXG5cbi8vIFRPRE86IGNvbnNpZGVyIHBhcmFtcyBmb3IgcmV1c2luZyB2ZWN0b3Igb2JqZWN0c1xuXG52YXIgVmVjdG9yID0ge307XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjdG9yO1xuXG4oZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IHZlY3Rvci5cbiAgICAgKiBAbWV0aG9kIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHlcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvclxuICAgICAqL1xuICAgIFZlY3Rvci5jcmVhdGUgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHJldHVybiB7IHg6IHggfHwgMCwgeTogeSB8fCAwIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSBuZXcgdmVjdG9yIHdpdGggYHhgIGFuZCBgeWAgY29waWVkIGZyb20gdGhlIGdpdmVuIGB2ZWN0b3JgLlxuICAgICAqIEBtZXRob2QgY2xvbmVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyBjbG9uZWQgdmVjdG9yXG4gICAgICovXG4gICAgVmVjdG9yLmNsb25lID0gZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICAgIHJldHVybiB7IHg6IHZlY3Rvci54LCB5OiB2ZWN0b3IueSB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBtYWduaXR1ZGUgKGxlbmd0aCkgb2YgYSB2ZWN0b3IuXG4gICAgICogQG1ldGhvZCBtYWduaXR1ZGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgbWFnbml0dWRlIG9mIHRoZSB2ZWN0b3JcbiAgICAgKi9cbiAgICBWZWN0b3IubWFnbml0dWRlID0gZnVuY3Rpb24odmVjdG9yKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQoKHZlY3Rvci54ICogdmVjdG9yLngpICsgKHZlY3Rvci55ICogdmVjdG9yLnkpKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgbWFnbml0dWRlIChsZW5ndGgpIG9mIGEgdmVjdG9yICh0aGVyZWZvcmUgc2F2aW5nIGEgYHNxcnRgIG9wZXJhdGlvbikuXG4gICAgICogQG1ldGhvZCBtYWduaXR1ZGVTcXVhcmVkXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEByZXR1cm4ge251bWJlcn0gVGhlIHNxdWFyZWQgbWFnbml0dWRlIG9mIHRoZSB2ZWN0b3JcbiAgICAgKi9cbiAgICBWZWN0b3IubWFnbml0dWRlU3F1YXJlZCA9IGZ1bmN0aW9uKHZlY3Rvcikge1xuICAgICAgICByZXR1cm4gKHZlY3Rvci54ICogdmVjdG9yLngpICsgKHZlY3Rvci55ICogdmVjdG9yLnkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSb3RhdGVzIHRoZSB2ZWN0b3IgYWJvdXQgKDAsIDApIGJ5IHNwZWNpZmllZCBhbmdsZS5cbiAgICAgKiBAbWV0aG9kIHJvdGF0ZVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGVcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciByb3RhdGVkIGFib3V0ICgwLCAwKVxuICAgICAqL1xuICAgIFZlY3Rvci5yb3RhdGUgPSBmdW5jdGlvbih2ZWN0b3IsIGFuZ2xlKSB7XG4gICAgICAgIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSksIHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHZlY3Rvci54ICogY29zIC0gdmVjdG9yLnkgKiBzaW4sXG4gICAgICAgICAgICB5OiB2ZWN0b3IueCAqIHNpbiArIHZlY3Rvci55ICogY29zXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJvdGF0ZXMgdGhlIHZlY3RvciBhYm91dCBhIHNwZWNpZmllZCBwb2ludCBieSBzcGVjaWZpZWQgYW5nbGUuXG4gICAgICogQG1ldGhvZCByb3RhdGVBYm91dFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gW291dHB1dF1cbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciByb3RhdGVkIGFib3V0IHRoZSBwb2ludFxuICAgICAqL1xuICAgIFZlY3Rvci5yb3RhdGVBYm91dCA9IGZ1bmN0aW9uKHZlY3RvciwgYW5nbGUsIHBvaW50LCBvdXRwdXQpIHtcbiAgICAgICAgdmFyIGNvcyA9IE1hdGguY29zKGFuZ2xlKSwgc2luID0gTWF0aC5zaW4oYW5nbGUpO1xuICAgICAgICBpZiAoIW91dHB1dCkgb3V0cHV0ID0ge307XG4gICAgICAgIHZhciB4ID0gcG9pbnQueCArICgodmVjdG9yLnggLSBwb2ludC54KSAqIGNvcyAtICh2ZWN0b3IueSAtIHBvaW50LnkpICogc2luKTtcbiAgICAgICAgb3V0cHV0LnkgPSBwb2ludC55ICsgKCh2ZWN0b3IueCAtIHBvaW50LngpICogc2luICsgKHZlY3Rvci55IC0gcG9pbnQueSkgKiBjb3MpO1xuICAgICAgICBvdXRwdXQueCA9IHg7XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGlzZXMgYSB2ZWN0b3IgKHN1Y2ggdGhhdCBpdHMgbWFnbml0dWRlIGlzIGAxYCkuXG4gICAgICogQG1ldGhvZCBub3JtYWxpc2VcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBBIG5ldyB2ZWN0b3Igbm9ybWFsaXNlZFxuICAgICAqL1xuICAgIFZlY3Rvci5ub3JtYWxpc2UgPSBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgICAgdmFyIG1hZ25pdHVkZSA9IFZlY3Rvci5tYWduaXR1ZGUodmVjdG9yKTtcbiAgICAgICAgaWYgKG1hZ25pdHVkZSA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiB7IHg6IDAsIHk6IDAgfTtcbiAgICAgICAgcmV0dXJuIHsgeDogdmVjdG9yLnggLyBtYWduaXR1ZGUsIHk6IHZlY3Rvci55IC8gbWFnbml0dWRlIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGRvdC1wcm9kdWN0IG9mIHR3byB2ZWN0b3JzLlxuICAgICAqIEBtZXRob2QgZG90XG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckFcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQlxuICAgICAqIEByZXR1cm4ge251bWJlcn0gVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSB0d28gdmVjdG9yc1xuICAgICAqL1xuICAgIFZlY3Rvci5kb3QgPSBmdW5jdGlvbih2ZWN0b3JBLCB2ZWN0b3JCKSB7XG4gICAgICAgIHJldHVybiAodmVjdG9yQS54ICogdmVjdG9yQi54KSArICh2ZWN0b3JBLnkgKiB2ZWN0b3JCLnkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjcm9zcy1wcm9kdWN0IG9mIHR3byB2ZWN0b3JzLlxuICAgICAqIEBtZXRob2QgY3Jvc3NcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JCXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgY3Jvc3MgcHJvZHVjdCBvZiB0aGUgdHdvIHZlY3RvcnNcbiAgICAgKi9cbiAgICBWZWN0b3IuY3Jvc3MgPSBmdW5jdGlvbih2ZWN0b3JBLCB2ZWN0b3JCKSB7XG4gICAgICAgIHJldHVybiAodmVjdG9yQS54ICogdmVjdG9yQi55KSAtICh2ZWN0b3JBLnkgKiB2ZWN0b3JCLngpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjcm9zcy1wcm9kdWN0IG9mIHRocmVlIHZlY3RvcnMuXG4gICAgICogQG1ldGhvZCBjcm9zczNcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JCXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckNcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBjcm9zcyBwcm9kdWN0IG9mIHRoZSB0aHJlZSB2ZWN0b3JzXG4gICAgICovXG4gICAgVmVjdG9yLmNyb3NzMyA9IGZ1bmN0aW9uKHZlY3RvckEsIHZlY3RvckIsIHZlY3RvckMpIHtcbiAgICAgICAgcmV0dXJuICh2ZWN0b3JCLnggLSB2ZWN0b3JBLngpICogKHZlY3RvckMueSAtIHZlY3RvckEueSkgLSAodmVjdG9yQi55IC0gdmVjdG9yQS55KSAqICh2ZWN0b3JDLnggLSB2ZWN0b3JBLngpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBBZGRzIHRoZSB0d28gdmVjdG9ycy5cbiAgICAgKiBAbWV0aG9kIGFkZFxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JBXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckJcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gW291dHB1dF1cbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciBvZiB2ZWN0b3JBIGFuZCB2ZWN0b3JCIGFkZGVkXG4gICAgICovXG4gICAgVmVjdG9yLmFkZCA9IGZ1bmN0aW9uKHZlY3RvckEsIHZlY3RvckIsIG91dHB1dCkge1xuICAgICAgICBpZiAoIW91dHB1dCkgb3V0cHV0ID0ge307XG4gICAgICAgIG91dHB1dC54ID0gdmVjdG9yQS54ICsgdmVjdG9yQi54O1xuICAgICAgICBvdXRwdXQueSA9IHZlY3RvckEueSArIHZlY3RvckIueTtcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU3VidHJhY3RzIHRoZSB0d28gdmVjdG9ycy5cbiAgICAgKiBAbWV0aG9kIHN1YlxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JBXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvckJcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gW291dHB1dF1cbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IEEgbmV3IHZlY3RvciBvZiB2ZWN0b3JBIGFuZCB2ZWN0b3JCIHN1YnRyYWN0ZWRcbiAgICAgKi9cbiAgICBWZWN0b3Iuc3ViID0gZnVuY3Rpb24odmVjdG9yQSwgdmVjdG9yQiwgb3V0cHV0KSB7XG4gICAgICAgIGlmICghb3V0cHV0KSBvdXRwdXQgPSB7fTtcbiAgICAgICAgb3V0cHV0LnggPSB2ZWN0b3JBLnggLSB2ZWN0b3JCLng7XG4gICAgICAgIG91dHB1dC55ID0gdmVjdG9yQS55IC0gdmVjdG9yQi55O1xuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBNdWx0aXBsaWVzIGEgdmVjdG9yIGFuZCBhIHNjYWxhci5cbiAgICAgKiBAbWV0aG9kIG11bHRcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjYWxhclxuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gQSBuZXcgdmVjdG9yIG11bHRpcGxpZWQgYnkgc2NhbGFyXG4gICAgICovXG4gICAgVmVjdG9yLm11bHQgPSBmdW5jdGlvbih2ZWN0b3IsIHNjYWxhcikge1xuICAgICAgICByZXR1cm4geyB4OiB2ZWN0b3IueCAqIHNjYWxhciwgeTogdmVjdG9yLnkgKiBzY2FsYXIgfTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGl2aWRlcyBhIHZlY3RvciBhbmQgYSBzY2FsYXIuXG4gICAgICogQG1ldGhvZCBkaXZcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHNjYWxhclxuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gQSBuZXcgdmVjdG9yIGRpdmlkZWQgYnkgc2NhbGFyXG4gICAgICovXG4gICAgVmVjdG9yLmRpdiA9IGZ1bmN0aW9uKHZlY3Rvciwgc2NhbGFyKSB7XG4gICAgICAgIHJldHVybiB7IHg6IHZlY3Rvci54IC8gc2NhbGFyLCB5OiB2ZWN0b3IueSAvIHNjYWxhciB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBwZXJwZW5kaWN1bGFyIHZlY3Rvci4gU2V0IGBuZWdhdGVgIHRvIHRydWUgZm9yIHRoZSBwZXJwZW5kaWN1bGFyIGluIHRoZSBvcHBvc2l0ZSBkaXJlY3Rpb24uXG4gICAgICogQG1ldGhvZCBwZXJwXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEBwYXJhbSB7Ym9vbH0gW25lZ2F0ZT1mYWxzZV1cbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IFRoZSBwZXJwZW5kaWN1bGFyIHZlY3RvclxuICAgICAqL1xuICAgIFZlY3Rvci5wZXJwID0gZnVuY3Rpb24odmVjdG9yLCBuZWdhdGUpIHtcbiAgICAgICAgbmVnYXRlID0gbmVnYXRlID09PSB0cnVlID8gLTEgOiAxO1xuICAgICAgICByZXR1cm4geyB4OiBuZWdhdGUgKiAtdmVjdG9yLnksIHk6IG5lZ2F0ZSAqIHZlY3Rvci54IH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE5lZ2F0ZXMgYm90aCBjb21wb25lbnRzIG9mIGEgdmVjdG9yIHN1Y2ggdGhhdCBpdCBwb2ludHMgaW4gdGhlIG9wcG9zaXRlIGRpcmVjdGlvbi5cbiAgICAgKiBAbWV0aG9kIG5lZ1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JcbiAgICAgKiBAcmV0dXJuIHt2ZWN0b3J9IFRoZSBuZWdhdGVkIHZlY3RvclxuICAgICAqL1xuICAgIFZlY3Rvci5uZWcgPSBmdW5jdGlvbih2ZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHsgeDogLXZlY3Rvci54LCB5OiAtdmVjdG9yLnkgfTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYW5nbGUgaW4gcmFkaWFucyBiZXR3ZWVuIHRoZSB0d28gdmVjdG9ycyByZWxhdGl2ZSB0byB0aGUgeC1heGlzLlxuICAgICAqIEBtZXRob2QgYW5nbGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gdmVjdG9yQVxuICAgICAqIEBwYXJhbSB7dmVjdG9yfSB2ZWN0b3JCXG4gICAgICogQHJldHVybiB7bnVtYmVyfSBUaGUgYW5nbGUgaW4gcmFkaWFuc1xuICAgICAqL1xuICAgIFZlY3Rvci5hbmdsZSA9IGZ1bmN0aW9uKHZlY3RvckEsIHZlY3RvckIpIHtcbiAgICAgICAgcmV0dXJuIE1hdGguYXRhbjIodmVjdG9yQi55IC0gdmVjdG9yQS55LCB2ZWN0b3JCLnggLSB2ZWN0b3JBLngpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUZW1wb3JhcnkgdmVjdG9yIHBvb2wgKG5vdCB0aHJlYWQtc2FmZSkuXG4gICAgICogQHByb3BlcnR5IF90ZW1wXG4gICAgICogQHR5cGUge3ZlY3RvcltdfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgVmVjdG9yLl90ZW1wID0gW1ZlY3Rvci5jcmVhdGUoKSwgVmVjdG9yLmNyZWF0ZSgpLCBcbiAgICAgICAgICAgICAgICAgICAgVmVjdG9yLmNyZWF0ZSgpLCBWZWN0b3IuY3JlYXRlKCksIFxuICAgICAgICAgICAgICAgICAgICBWZWN0b3IuY3JlYXRlKCksIFZlY3Rvci5jcmVhdGUoKV07XG5cbn0pKCk7IiwiLyoqXG4qIFRoZSBgTWF0dGVyLlZlcnRpY2VzYCBtb2R1bGUgY29udGFpbnMgbWV0aG9kcyBmb3IgY3JlYXRpbmcgYW5kIG1hbmlwdWxhdGluZyBzZXRzIG9mIHZlcnRpY2VzLlxuKiBBIHNldCBvZiB2ZXJ0aWNlcyBpcyBhbiBhcnJheSBvZiBgTWF0dGVyLlZlY3RvcmAgd2l0aCBhZGRpdGlvbmFsIGluZGV4aW5nIHByb3BlcnRpZXMgaW5zZXJ0ZWQgYnkgYFZlcnRpY2VzLmNyZWF0ZWAuXG4qIEEgYE1hdHRlci5Cb2R5YCBtYWludGFpbnMgYSBzZXQgb2YgdmVydGljZXMgdG8gcmVwcmVzZW50IHRoZSBzaGFwZSBvZiB0aGUgb2JqZWN0IChpdHMgY29udmV4IGh1bGwpLlxuKlxuKiBTZWUgdGhlIGluY2x1ZGVkIHVzYWdlIFtleGFtcGxlc10oaHR0cHM6Ly9naXRodWIuY29tL2xpYWJydS9tYXR0ZXItanMvdHJlZS9tYXN0ZXIvZXhhbXBsZXMpLlxuKlxuKiBAY2xhc3MgVmVydGljZXNcbiovXG5cbnZhciBWZXJ0aWNlcyA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlcnRpY2VzO1xuXG52YXIgVmVjdG9yID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVjdG9yJyk7XG52YXIgQ29tbW9uID0gcmVxdWlyZSgnLi4vY29yZS9Db21tb24nKTtcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBzZXQgb2YgYE1hdHRlci5Cb2R5YCBjb21wYXRpYmxlIHZlcnRpY2VzLlxuICAgICAqIFRoZSBgcG9pbnRzYCBhcmd1bWVudCBhY2NlcHRzIGFuIGFycmF5IG9mIGBNYXR0ZXIuVmVjdG9yYCBwb2ludHMgb3JpZW50YXRlZCBhcm91bmQgdGhlIG9yaWdpbiBgKDAsIDApYCwgZm9yIGV4YW1wbGU6XG4gICAgICpcbiAgICAgKiAgICAgW3sgeDogMCwgeTogMCB9LCB7IHg6IDI1LCB5OiA1MCB9LCB7IHg6IDUwLCB5OiAwIH1dXG4gICAgICpcbiAgICAgKiBUaGUgYFZlcnRpY2VzLmNyZWF0ZWAgbWV0aG9kIHJldHVybnMgYSBuZXcgYXJyYXkgb2YgdmVydGljZXMsIHdoaWNoIGFyZSBzaW1pbGFyIHRvIE1hdHRlci5WZWN0b3Igb2JqZWN0cyxcbiAgICAgKiBidXQgd2l0aCBzb21lIGFkZGl0aW9uYWwgcmVmZXJlbmNlcyByZXF1aXJlZCBmb3IgZWZmaWNpZW50IGNvbGxpc2lvbiBkZXRlY3Rpb24gcm91dGluZXMuXG4gICAgICpcbiAgICAgKiBOb3RlIHRoYXQgdGhlIGBib2R5YCBhcmd1bWVudCBpcyBub3Qgb3B0aW9uYWwsIGEgYE1hdHRlci5Cb2R5YCByZWZlcmVuY2UgbXVzdCBiZSBwcm92aWRlZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHt2ZWN0b3JbXX0gcG9pbnRzXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICovXG4gICAgVmVydGljZXMuY3JlYXRlID0gZnVuY3Rpb24ocG9pbnRzLCBib2R5KSB7XG4gICAgICAgIHZhciB2ZXJ0aWNlcyA9IFtdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcG9pbnQgPSBwb2ludHNbaV0sXG4gICAgICAgICAgICAgICAgdmVydGV4ID0ge1xuICAgICAgICAgICAgICAgICAgICB4OiBwb2ludC54LFxuICAgICAgICAgICAgICAgICAgICB5OiBwb2ludC55LFxuICAgICAgICAgICAgICAgICAgICBpbmRleDogaSxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgICAgICAgICAgaXNJbnRlcm5hbDogZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKHZlcnRleCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmVydGljZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBhIHN0cmluZyBjb250YWluaW5nIG9yZGVyZWQgeCB5IHBhaXJzIHNlcGFyYXRlZCBieSBzcGFjZXMgKGFuZCBvcHRpb25hbGx5IGNvbW1hcyksIFxuICAgICAqIGludG8gYSBgTWF0dGVyLlZlcnRpY2VzYCBvYmplY3QgZm9yIHRoZSBnaXZlbiBgTWF0dGVyLkJvZHlgLlxuICAgICAqIEZvciBwYXJzaW5nIFNWRyBwYXRocywgc2VlIGBTdmcucGF0aFRvVmVydGljZXNgLlxuICAgICAqIEBtZXRob2QgZnJvbVBhdGhcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxuICAgICAqIEBwYXJhbSB7Ym9keX0gYm9keVxuICAgICAqIEByZXR1cm4ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqL1xuICAgIFZlcnRpY2VzLmZyb21QYXRoID0gZnVuY3Rpb24ocGF0aCwgYm9keSkge1xuICAgICAgICB2YXIgcGF0aFBhdHRlcm4gPSAvTD9cXHMqKFtcXC1cXGRcXC5lXSspW1xccyxdKihbXFwtXFxkXFwuZV0rKSovaWcsXG4gICAgICAgICAgICBwb2ludHMgPSBbXTtcblxuICAgICAgICBwYXRoLnJlcGxhY2UocGF0aFBhdHRlcm4sIGZ1bmN0aW9uKG1hdGNoLCB4LCB5KSB7XG4gICAgICAgICAgICBwb2ludHMucHVzaCh7IHg6IHBhcnNlRmxvYXQoeCksIHk6IHBhcnNlRmxvYXQoeSkgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBWZXJ0aWNlcy5jcmVhdGUocG9pbnRzLCBib2R5KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgY2VudHJlIChjZW50cm9pZCkgb2YgdGhlIHNldCBvZiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIGNlbnRyZVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHJldHVybiB7dmVjdG9yfSBUaGUgY2VudHJlIHBvaW50XG4gICAgICovXG4gICAgVmVydGljZXMuY2VudHJlID0gZnVuY3Rpb24odmVydGljZXMpIHtcbiAgICAgICAgdmFyIGFyZWEgPSBWZXJ0aWNlcy5hcmVhKHZlcnRpY2VzLCB0cnVlKSxcbiAgICAgICAgICAgIGNlbnRyZSA9IHsgeDogMCwgeTogMCB9LFxuICAgICAgICAgICAgY3Jvc3MsXG4gICAgICAgICAgICB0ZW1wLFxuICAgICAgICAgICAgajtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBqID0gKGkgKyAxKSAlIHZlcnRpY2VzLmxlbmd0aDtcbiAgICAgICAgICAgIGNyb3NzID0gVmVjdG9yLmNyb3NzKHZlcnRpY2VzW2ldLCB2ZXJ0aWNlc1tqXSk7XG4gICAgICAgICAgICB0ZW1wID0gVmVjdG9yLm11bHQoVmVjdG9yLmFkZCh2ZXJ0aWNlc1tpXSwgdmVydGljZXNbal0pLCBjcm9zcyk7XG4gICAgICAgICAgICBjZW50cmUgPSBWZWN0b3IuYWRkKGNlbnRyZSwgdGVtcCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gVmVjdG9yLmRpdihjZW50cmUsIDYgKiBhcmVhKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYXZlcmFnZSAobWVhbikgb2YgdGhlIHNldCBvZiB2ZXJ0aWNlcy5cbiAgICAgKiBAbWV0aG9kIG1lYW5cbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEByZXR1cm4ge3ZlY3Rvcn0gVGhlIGF2ZXJhZ2UgcG9pbnRcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5tZWFuID0gZnVuY3Rpb24odmVydGljZXMpIHtcbiAgICAgICAgdmFyIGF2ZXJhZ2UgPSB7IHg6IDAsIHk6IDAgfTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhdmVyYWdlLnggKz0gdmVydGljZXNbaV0ueDtcbiAgICAgICAgICAgIGF2ZXJhZ2UueSArPSB2ZXJ0aWNlc1tpXS55O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFZlY3Rvci5kaXYoYXZlcmFnZSwgdmVydGljZXMubGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0aGUgYXJlYSBvZiB0aGUgc2V0IG9mIHZlcnRpY2VzLlxuICAgICAqIEBtZXRob2QgYXJlYVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtib29sfSBzaWduZWRcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBhcmVhXG4gICAgICovXG4gICAgVmVydGljZXMuYXJlYSA9IGZ1bmN0aW9uKHZlcnRpY2VzLCBzaWduZWQpIHtcbiAgICAgICAgdmFyIGFyZWEgPSAwLFxuICAgICAgICAgICAgaiA9IHZlcnRpY2VzLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJlYSArPSAodmVydGljZXNbal0ueCAtIHZlcnRpY2VzW2ldLngpICogKHZlcnRpY2VzW2pdLnkgKyB2ZXJ0aWNlc1tpXS55KTtcbiAgICAgICAgICAgIGogPSBpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNpZ25lZClcbiAgICAgICAgICAgIHJldHVybiBhcmVhIC8gMjtcblxuICAgICAgICByZXR1cm4gTWF0aC5hYnMoYXJlYSkgLyAyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRoZSBtb21lbnQgb2YgaW5lcnRpYSAoc2Vjb25kIG1vbWVudCBvZiBhcmVhKSBvZiB0aGUgc2V0IG9mIHZlcnRpY2VzIGdpdmVuIHRoZSB0b3RhbCBtYXNzLlxuICAgICAqIEBtZXRob2QgaW5lcnRpYVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1hc3NcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFRoZSBwb2x5Z29uJ3MgbW9tZW50IG9mIGluZXJ0aWFcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5pbmVydGlhID0gZnVuY3Rpb24odmVydGljZXMsIG1hc3MpIHtcbiAgICAgICAgdmFyIG51bWVyYXRvciA9IDAsXG4gICAgICAgICAgICBkZW5vbWluYXRvciA9IDAsXG4gICAgICAgICAgICB2ID0gdmVydGljZXMsXG4gICAgICAgICAgICBjcm9zcyxcbiAgICAgICAgICAgIGo7XG5cbiAgICAgICAgLy8gZmluZCB0aGUgcG9seWdvbidzIG1vbWVudCBvZiBpbmVydGlhLCB1c2luZyBzZWNvbmQgbW9tZW50IG9mIGFyZWFcbiAgICAgICAgLy8gaHR0cDovL3d3dy5waHlzaWNzZm9ydW1zLmNvbS9zaG93dGhyZWFkLnBocD90PTI1MjkzXG4gICAgICAgIGZvciAodmFyIG4gPSAwOyBuIDwgdi5sZW5ndGg7IG4rKykge1xuICAgICAgICAgICAgaiA9IChuICsgMSkgJSB2Lmxlbmd0aDtcbiAgICAgICAgICAgIGNyb3NzID0gTWF0aC5hYnMoVmVjdG9yLmNyb3NzKHZbal0sIHZbbl0pKTtcbiAgICAgICAgICAgIG51bWVyYXRvciArPSBjcm9zcyAqIChWZWN0b3IuZG90KHZbal0sIHZbal0pICsgVmVjdG9yLmRvdCh2W2pdLCB2W25dKSArIFZlY3Rvci5kb3QodltuXSwgdltuXSkpO1xuICAgICAgICAgICAgZGVub21pbmF0b3IgKz0gY3Jvc3M7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gKG1hc3MgLyA2KSAqIChudW1lcmF0b3IgLyBkZW5vbWluYXRvcik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFRyYW5zbGF0ZXMgdGhlIHNldCBvZiB2ZXJ0aWNlcyBpbi1wbGFjZS5cbiAgICAgKiBAbWV0aG9kIHRyYW5zbGF0ZVxuICAgICAqIEBwYXJhbSB7dmVydGljZXN9IHZlcnRpY2VzXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHZlY3RvclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsYXJcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy50cmFuc2xhdGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgdmVjdG9yLCBzY2FsYXIpIHtcbiAgICAgICAgdmFyIGk7XG4gICAgICAgIGlmIChzY2FsYXIpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldLnggKz0gdmVjdG9yLnggKiBzY2FsYXI7XG4gICAgICAgICAgICAgICAgdmVydGljZXNbaV0ueSArPSB2ZWN0b3IueSAqIHNjYWxhcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzW2ldLnggKz0gdmVjdG9yLng7XG4gICAgICAgICAgICAgICAgdmVydGljZXNbaV0ueSArPSB2ZWN0b3IueTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2ZXJ0aWNlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUm90YXRlcyB0aGUgc2V0IG9mIHZlcnRpY2VzIGluLXBsYWNlLlxuICAgICAqIEBtZXRob2Qgcm90YXRlXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYW5nbGVcbiAgICAgKiBAcGFyYW0ge3ZlY3Rvcn0gcG9pbnRcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5yb3RhdGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgYW5nbGUsIHBvaW50KSB7XG4gICAgICAgIGlmIChhbmdsZSA9PT0gMClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB2YXIgY29zID0gTWF0aC5jb3MoYW5nbGUpLFxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4oYW5nbGUpO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2ZXJ0aWNlID0gdmVydGljZXNbaV0sXG4gICAgICAgICAgICAgICAgZHggPSB2ZXJ0aWNlLnggLSBwb2ludC54LFxuICAgICAgICAgICAgICAgIGR5ID0gdmVydGljZS55IC0gcG9pbnQueTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHZlcnRpY2UueCA9IHBvaW50LnggKyAoZHggKiBjb3MgLSBkeSAqIHNpbik7XG4gICAgICAgICAgICB2ZXJ0aWNlLnkgPSBwb2ludC55ICsgKGR4ICogc2luICsgZHkgKiBjb3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHBvaW50YCBpcyBpbnNpZGUgdGhlIHNldCBvZiBgdmVydGljZXNgLlxuICAgICAqIEBtZXRob2QgY29udGFpbnNcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7dmVjdG9yfSBwb2ludFxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZlcnRpY2VzIGNvbnRhaW5zIHBvaW50LCBvdGhlcndpc2UgZmFsc2VcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5jb250YWlucyA9IGZ1bmN0aW9uKHZlcnRpY2VzLCBwb2ludCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdmVydGljZSA9IHZlcnRpY2VzW2ldLFxuICAgICAgICAgICAgICAgIG5leHRWZXJ0aWNlID0gdmVydGljZXNbKGkgKyAxKSAlIHZlcnRpY2VzLmxlbmd0aF07XG4gICAgICAgICAgICBpZiAoKHBvaW50LnggLSB2ZXJ0aWNlLngpICogKG5leHRWZXJ0aWNlLnkgLSB2ZXJ0aWNlLnkpICsgKHBvaW50LnkgLSB2ZXJ0aWNlLnkpICogKHZlcnRpY2UueCAtIG5leHRWZXJ0aWNlLngpID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTY2FsZXMgdGhlIHZlcnRpY2VzIGZyb20gYSBwb2ludCAoZGVmYXVsdCBpcyBjZW50cmUpIGluLXBsYWNlLlxuICAgICAqIEBtZXRob2Qgc2NhbGVcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY2FsZVhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2NhbGVZXG4gICAgICogQHBhcmFtIHt2ZWN0b3J9IHBvaW50XG4gICAgICovXG4gICAgVmVydGljZXMuc2NhbGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgc2NhbGVYLCBzY2FsZVksIHBvaW50KSB7XG4gICAgICAgIGlmIChzY2FsZVggPT09IDEgJiYgc2NhbGVZID09PSAxKVxuICAgICAgICAgICAgcmV0dXJuIHZlcnRpY2VzO1xuXG4gICAgICAgIHBvaW50ID0gcG9pbnQgfHwgVmVydGljZXMuY2VudHJlKHZlcnRpY2VzKTtcblxuICAgICAgICB2YXIgdmVydGV4LFxuICAgICAgICAgICAgZGVsdGE7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmVydGV4ID0gdmVydGljZXNbaV07XG4gICAgICAgICAgICBkZWx0YSA9IFZlY3Rvci5zdWIodmVydGV4LCBwb2ludCk7XG4gICAgICAgICAgICB2ZXJ0aWNlc1tpXS54ID0gcG9pbnQueCArIGRlbHRhLnggKiBzY2FsZVg7XG4gICAgICAgICAgICB2ZXJ0aWNlc1tpXS55ID0gcG9pbnQueSArIGRlbHRhLnkgKiBzY2FsZVk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmVydGljZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoYW1mZXJzIGEgc2V0IG9mIHZlcnRpY2VzIGJ5IGdpdmluZyB0aGVtIHJvdW5kZWQgY29ybmVycywgcmV0dXJucyBhIG5ldyBzZXQgb2YgdmVydGljZXMuXG4gICAgICogVGhlIHJhZGl1cyBwYXJhbWV0ZXIgaXMgYSBzaW5nbGUgbnVtYmVyIG9yIGFuIGFycmF5IHRvIHNwZWNpZnkgdGhlIHJhZGl1cyBmb3IgZWFjaCB2ZXJ0ZXguXG4gICAgICogQG1ldGhvZCBjaGFtZmVyXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcltdfSByYWRpdXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcXVhbGl0eVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBxdWFsaXR5TWluXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHF1YWxpdHlNYXhcbiAgICAgKi9cbiAgICBWZXJ0aWNlcy5jaGFtZmVyID0gZnVuY3Rpb24odmVydGljZXMsIHJhZGl1cywgcXVhbGl0eSwgcXVhbGl0eU1pbiwgcXVhbGl0eU1heCkge1xuICAgICAgICByYWRpdXMgPSByYWRpdXMgfHwgWzhdO1xuXG4gICAgICAgIGlmICghcmFkaXVzLmxlbmd0aClcbiAgICAgICAgICAgIHJhZGl1cyA9IFtyYWRpdXNdO1xuXG4gICAgICAgIC8vIHF1YWxpdHkgZGVmYXVsdHMgdG8gLTEsIHdoaWNoIGlzIGF1dG9cbiAgICAgICAgcXVhbGl0eSA9ICh0eXBlb2YgcXVhbGl0eSAhPT0gJ3VuZGVmaW5lZCcpID8gcXVhbGl0eSA6IC0xO1xuICAgICAgICBxdWFsaXR5TWluID0gcXVhbGl0eU1pbiB8fCAyO1xuICAgICAgICBxdWFsaXR5TWF4ID0gcXVhbGl0eU1heCB8fCAxNDtcblxuICAgICAgICB2YXIgbmV3VmVydGljZXMgPSBbXTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcHJldlZlcnRleCA9IHZlcnRpY2VzW2kgLSAxID49IDAgPyBpIC0gMSA6IHZlcnRpY2VzLmxlbmd0aCAtIDFdLFxuICAgICAgICAgICAgICAgIHZlcnRleCA9IHZlcnRpY2VzW2ldLFxuICAgICAgICAgICAgICAgIG5leHRWZXJ0ZXggPSB2ZXJ0aWNlc1soaSArIDEpICUgdmVydGljZXMubGVuZ3RoXSxcbiAgICAgICAgICAgICAgICBjdXJyZW50UmFkaXVzID0gcmFkaXVzW2kgPCByYWRpdXMubGVuZ3RoID8gaSA6IHJhZGl1cy5sZW5ndGggLSAxXTtcblxuICAgICAgICAgICAgaWYgKGN1cnJlbnRSYWRpdXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICBuZXdWZXJ0aWNlcy5wdXNoKHZlcnRleCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcmV2Tm9ybWFsID0gVmVjdG9yLm5vcm1hbGlzZSh7IFxuICAgICAgICAgICAgICAgIHg6IHZlcnRleC55IC0gcHJldlZlcnRleC55LCBcbiAgICAgICAgICAgICAgICB5OiBwcmV2VmVydGV4LnggLSB2ZXJ0ZXgueFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBuZXh0Tm9ybWFsID0gVmVjdG9yLm5vcm1hbGlzZSh7IFxuICAgICAgICAgICAgICAgIHg6IG5leHRWZXJ0ZXgueSAtIHZlcnRleC55LCBcbiAgICAgICAgICAgICAgICB5OiB2ZXJ0ZXgueCAtIG5leHRWZXJ0ZXgueFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHZhciBkaWFnb25hbFJhZGl1cyA9IE1hdGguc3FydCgyICogTWF0aC5wb3coY3VycmVudFJhZGl1cywgMikpLFxuICAgICAgICAgICAgICAgIHJhZGl1c1ZlY3RvciA9IFZlY3Rvci5tdWx0KENvbW1vbi5jbG9uZShwcmV2Tm9ybWFsKSwgY3VycmVudFJhZGl1cyksXG4gICAgICAgICAgICAgICAgbWlkTm9ybWFsID0gVmVjdG9yLm5vcm1hbGlzZShWZWN0b3IubXVsdChWZWN0b3IuYWRkKHByZXZOb3JtYWwsIG5leHROb3JtYWwpLCAwLjUpKSxcbiAgICAgICAgICAgICAgICBzY2FsZWRWZXJ0ZXggPSBWZWN0b3Iuc3ViKHZlcnRleCwgVmVjdG9yLm11bHQobWlkTm9ybWFsLCBkaWFnb25hbFJhZGl1cykpO1xuXG4gICAgICAgICAgICB2YXIgcHJlY2lzaW9uID0gcXVhbGl0eTtcblxuICAgICAgICAgICAgaWYgKHF1YWxpdHkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgLy8gYXV0b21hdGljYWxseSBkZWNpZGUgcHJlY2lzaW9uXG4gICAgICAgICAgICAgICAgcHJlY2lzaW9uID0gTWF0aC5wb3coY3VycmVudFJhZGl1cywgMC4zMikgKiAxLjc1O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmVjaXNpb24gPSBDb21tb24uY2xhbXAocHJlY2lzaW9uLCBxdWFsaXR5TWluLCBxdWFsaXR5TWF4KTtcblxuICAgICAgICAgICAgLy8gdXNlIGFuIGV2ZW4gdmFsdWUgZm9yIHByZWNpc2lvbiwgbW9yZSBsaWtlbHkgdG8gcmVkdWNlIGF4ZXMgYnkgdXNpbmcgc3ltbWV0cnlcbiAgICAgICAgICAgIGlmIChwcmVjaXNpb24gJSAyID09PSAxKVxuICAgICAgICAgICAgICAgIHByZWNpc2lvbiArPSAxO1xuXG4gICAgICAgICAgICB2YXIgYWxwaGEgPSBNYXRoLmFjb3MoVmVjdG9yLmRvdChwcmV2Tm9ybWFsLCBuZXh0Tm9ybWFsKSksXG4gICAgICAgICAgICAgICAgdGhldGEgPSBhbHBoYSAvIHByZWNpc2lvbjtcblxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBwcmVjaXNpb247IGorKykge1xuICAgICAgICAgICAgICAgIG5ld1ZlcnRpY2VzLnB1c2goVmVjdG9yLmFkZChWZWN0b3Iucm90YXRlKHJhZGl1c1ZlY3RvciwgdGhldGEgKiBqKSwgc2NhbGVkVmVydGV4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3VmVydGljZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNvcnRzIHRoZSBpbnB1dCB2ZXJ0aWNlcyBpbnRvIGNsb2Nrd2lzZSBvcmRlciBpbiBwbGFjZS5cbiAgICAgKiBAbWV0aG9kIGNsb2Nrd2lzZVNvcnRcbiAgICAgKiBAcGFyYW0ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqIEByZXR1cm4ge3ZlcnRpY2VzfSB2ZXJ0aWNlc1xuICAgICAqL1xuICAgIFZlcnRpY2VzLmNsb2Nrd2lzZVNvcnQgPSBmdW5jdGlvbih2ZXJ0aWNlcykge1xuICAgICAgICB2YXIgY2VudHJlID0gVmVydGljZXMubWVhbih2ZXJ0aWNlcyk7XG5cbiAgICAgICAgdmVydGljZXMuc29ydChmdW5jdGlvbih2ZXJ0ZXhBLCB2ZXJ0ZXhCKSB7XG4gICAgICAgICAgICByZXR1cm4gVmVjdG9yLmFuZ2xlKGNlbnRyZSwgdmVydGV4QSkgLSBWZWN0b3IuYW5nbGUoY2VudHJlLCB2ZXJ0ZXhCKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHZlcnRpY2VzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIHZlcnRpY2VzIGZvcm0gYSBjb252ZXggc2hhcGUgKHZlcnRpY2VzIG11c3QgYmUgaW4gY2xvY2t3aXNlIG9yZGVyKS5cbiAgICAgKiBAbWV0aG9kIGlzQ29udmV4XG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcmV0dXJuIHtib29sfSBgdHJ1ZWAgaWYgdGhlIGB2ZXJ0aWNlc2AgYXJlIGNvbnZleCwgYGZhbHNlYCBpZiBub3QgKG9yIGBudWxsYCBpZiBub3QgY29tcHV0YWJsZSkuXG4gICAgICovXG4gICAgVmVydGljZXMuaXNDb252ZXggPSBmdW5jdGlvbih2ZXJ0aWNlcykge1xuICAgICAgICAvLyBodHRwOi8vcGF1bGJvdXJrZS5uZXQvZ2VvbWV0cnkvcG9seWdvbm1lc2gvXG5cbiAgICAgICAgdmFyIGZsYWcgPSAwLFxuICAgICAgICAgICAgbiA9IHZlcnRpY2VzLmxlbmd0aCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIHo7XG5cbiAgICAgICAgaWYgKG4gPCAzKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgaiA9IChpICsgMSkgJSBuO1xuICAgICAgICAgICAgayA9IChpICsgMikgJSBuO1xuICAgICAgICAgICAgeiA9ICh2ZXJ0aWNlc1tqXS54IC0gdmVydGljZXNbaV0ueCkgKiAodmVydGljZXNba10ueSAtIHZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgeiAtPSAodmVydGljZXNbal0ueSAtIHZlcnRpY2VzW2ldLnkpICogKHZlcnRpY2VzW2tdLnggLSB2ZXJ0aWNlc1tqXS54KTtcblxuICAgICAgICAgICAgaWYgKHogPCAwKSB7XG4gICAgICAgICAgICAgICAgZmxhZyB8PSAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh6ID4gMCkge1xuICAgICAgICAgICAgICAgIGZsYWcgfD0gMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZsYWcgPT09IDMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZmxhZyAhPT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGNvbnZleCBodWxsIG9mIHRoZSBpbnB1dCB2ZXJ0aWNlcyBhcyBhIG5ldyBhcnJheSBvZiBwb2ludHMuXG4gICAgICogQG1ldGhvZCBodWxsXG4gICAgICogQHBhcmFtIHt2ZXJ0aWNlc30gdmVydGljZXNcbiAgICAgKiBAcmV0dXJuIFt2ZXJ0ZXhdIHZlcnRpY2VzXG4gICAgICovXG4gICAgVmVydGljZXMuaHVsbCA9IGZ1bmN0aW9uKHZlcnRpY2VzKSB7XG4gICAgICAgIC8vIGh0dHA6Ly9lbi53aWtpYm9va3Mub3JnL3dpa2kvQWxnb3JpdGhtX0ltcGxlbWVudGF0aW9uL0dlb21ldHJ5L0NvbnZleF9odWxsL01vbm90b25lX2NoYWluXG5cbiAgICAgICAgdmFyIHVwcGVyID0gW10sXG4gICAgICAgICAgICBsb3dlciA9IFtdLCBcbiAgICAgICAgICAgIHZlcnRleCxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgLy8gc29ydCB2ZXJ0aWNlcyBvbiB4LWF4aXMgKHktYXhpcyBmb3IgdGllcylcbiAgICAgICAgdmVydGljZXMgPSB2ZXJ0aWNlcy5zbGljZSgwKTtcbiAgICAgICAgdmVydGljZXMuc29ydChmdW5jdGlvbih2ZXJ0ZXhBLCB2ZXJ0ZXhCKSB7XG4gICAgICAgICAgICB2YXIgZHggPSB2ZXJ0ZXhBLnggLSB2ZXJ0ZXhCLng7XG4gICAgICAgICAgICByZXR1cm4gZHggIT09IDAgPyBkeCA6IHZlcnRleEEueSAtIHZlcnRleEIueTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gYnVpbGQgbG93ZXIgaHVsbFxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZlcnRleCA9IHZlcnRpY2VzW2ldO1xuXG4gICAgICAgICAgICB3aGlsZSAobG93ZXIubGVuZ3RoID49IDIgXG4gICAgICAgICAgICAgICAgICAgJiYgVmVjdG9yLmNyb3NzMyhsb3dlcltsb3dlci5sZW5ndGggLSAyXSwgbG93ZXJbbG93ZXIubGVuZ3RoIC0gMV0sIHZlcnRleCkgPD0gMCkge1xuICAgICAgICAgICAgICAgIGxvd2VyLnBvcCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsb3dlci5wdXNoKHZlcnRleCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBidWlsZCB1cHBlciBodWxsXG4gICAgICAgIGZvciAoaSA9IHZlcnRpY2VzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB2ZXJ0ZXggPSB2ZXJ0aWNlc1tpXTtcblxuICAgICAgICAgICAgd2hpbGUgKHVwcGVyLmxlbmd0aCA+PSAyIFxuICAgICAgICAgICAgICAgICAgICYmIFZlY3Rvci5jcm9zczModXBwZXJbdXBwZXIubGVuZ3RoIC0gMl0sIHVwcGVyW3VwcGVyLmxlbmd0aCAtIDFdLCB2ZXJ0ZXgpIDw9IDApIHtcbiAgICAgICAgICAgICAgICB1cHBlci5wb3AoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXBwZXIucHVzaCh2ZXJ0ZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uY2F0ZW5hdGlvbiBvZiB0aGUgbG93ZXIgYW5kIHVwcGVyIGh1bGxzIGdpdmVzIHRoZSBjb252ZXggaHVsbFxuICAgICAgICAvLyBvbWl0IGxhc3QgcG9pbnRzIGJlY2F1c2UgdGhleSBhcmUgcmVwZWF0ZWQgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgb3RoZXIgbGlzdFxuICAgICAgICB1cHBlci5wb3AoKTtcbiAgICAgICAgbG93ZXIucG9wKCk7XG5cbiAgICAgICAgcmV0dXJuIHVwcGVyLmNvbmNhdChsb3dlcik7XG4gICAgfTtcblxufSkoKTtcbiIsInZhciBNYXR0ZXIgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuTWF0dGVyLnZlcnNpb24gPSAnbWFzdGVyJztcblxuTWF0dGVyLkJvZHkgPSByZXF1aXJlKCcuLi9ib2R5L0JvZHknKTtcbk1hdHRlci5Db21wb3NpdGUgPSByZXF1aXJlKCcuLi9ib2R5L0NvbXBvc2l0ZScpO1xuTWF0dGVyLldvcmxkID0gcmVxdWlyZSgnLi4vYm9keS9Xb3JsZCcpO1xuXG5NYXR0ZXIuQ29udGFjdCA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9Db250YWN0Jyk7XG5NYXR0ZXIuRGV0ZWN0b3IgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vRGV0ZWN0b3InKTtcbk1hdHRlci5HcmlkID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL0dyaWQnKTtcbk1hdHRlci5QYWlycyA9IHJlcXVpcmUoJy4uL2NvbGxpc2lvbi9QYWlycycpO1xuTWF0dGVyLlBhaXIgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vUGFpcicpO1xuTWF0dGVyLlF1ZXJ5ID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL1F1ZXJ5Jyk7XG5NYXR0ZXIuUmVzb2x2ZXIgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vUmVzb2x2ZXInKTtcbk1hdHRlci5TQVQgPSByZXF1aXJlKCcuLi9jb2xsaXNpb24vU0FUJyk7XG5cbk1hdHRlci5Db25zdHJhaW50ID0gcmVxdWlyZSgnLi4vY29uc3RyYWludC9Db25zdHJhaW50Jyk7XG5NYXR0ZXIuTW91c2VDb25zdHJhaW50ID0gcmVxdWlyZSgnLi4vY29uc3RyYWludC9Nb3VzZUNvbnN0cmFpbnQnKTtcblxuTWF0dGVyLkNvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5NYXR0ZXIuRW5naW5lID0gcmVxdWlyZSgnLi4vY29yZS9FbmdpbmUnKTtcbk1hdHRlci5FdmVudHMgPSByZXF1aXJlKCcuLi9jb3JlL0V2ZW50cycpO1xuTWF0dGVyLk1vdXNlID0gcmVxdWlyZSgnLi4vY29yZS9Nb3VzZScpO1xuTWF0dGVyLlJ1bm5lciA9IHJlcXVpcmUoJy4uL2NvcmUvUnVubmVyJyk7XG5NYXR0ZXIuU2xlZXBpbmcgPSByZXF1aXJlKCcuLi9jb3JlL1NsZWVwaW5nJyk7XG5cbi8vIEBpZiBERUJVR1xuTWF0dGVyLk1ldHJpY3MgPSByZXF1aXJlKCcuLi9jb3JlL01ldHJpY3MnKTtcbi8vIEBlbmRpZlxuXG5NYXR0ZXIuQm9kaWVzID0gcmVxdWlyZSgnLi4vZmFjdG9yeS9Cb2RpZXMnKTtcbk1hdHRlci5Db21wb3NpdGVzID0gcmVxdWlyZSgnLi4vZmFjdG9yeS9Db21wb3NpdGVzJyk7XG5cbk1hdHRlci5BeGVzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQXhlcycpO1xuTWF0dGVyLkJvdW5kcyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L0JvdW5kcycpO1xuTWF0dGVyLlN2ZyA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1N2ZycpO1xuTWF0dGVyLlZlY3RvciA9IHJlcXVpcmUoJy4uL2dlb21ldHJ5L1ZlY3RvcicpO1xuTWF0dGVyLlZlcnRpY2VzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvVmVydGljZXMnKTtcblxuTWF0dGVyLlJlbmRlciA9IHJlcXVpcmUoJy4uL3JlbmRlci9SZW5kZXInKTtcbk1hdHRlci5SZW5kZXJQaXhpID0gcmVxdWlyZSgnLi4vcmVuZGVyL1JlbmRlclBpeGknKTtcblxuLy8gYWxpYXNlc1xuXG5NYXR0ZXIuV29ybGQuYWRkID0gTWF0dGVyLkNvbXBvc2l0ZS5hZGQ7XG5NYXR0ZXIuV29ybGQucmVtb3ZlID0gTWF0dGVyLkNvbXBvc2l0ZS5yZW1vdmU7XG5NYXR0ZXIuV29ybGQuYWRkQ29tcG9zaXRlID0gTWF0dGVyLkNvbXBvc2l0ZS5hZGRDb21wb3NpdGU7XG5NYXR0ZXIuV29ybGQuYWRkQm9keSA9IE1hdHRlci5Db21wb3NpdGUuYWRkQm9keTtcbk1hdHRlci5Xb3JsZC5hZGRDb25zdHJhaW50ID0gTWF0dGVyLkNvbXBvc2l0ZS5hZGRDb25zdHJhaW50O1xuTWF0dGVyLldvcmxkLmNsZWFyID0gTWF0dGVyLkNvbXBvc2l0ZS5jbGVhcjtcbk1hdHRlci5FbmdpbmUucnVuID0gTWF0dGVyLlJ1bm5lci5ydW47XG4iLCIvKipcbiogVGhlIGBNYXR0ZXIuUmVuZGVyYCBtb2R1bGUgaXMgYSBzaW1wbGUgSFRNTDUgY2FudmFzIGJhc2VkIHJlbmRlcmVyIGZvciB2aXN1YWxpc2luZyBpbnN0YW5jZXMgb2YgYE1hdHRlci5FbmdpbmVgLlxuKiBJdCBpcyBpbnRlbmRlZCBmb3IgZGV2ZWxvcG1lbnQgYW5kIGRlYnVnZ2luZyBwdXJwb3NlcywgYnV0IG1heSBhbHNvIGJlIHN1aXRhYmxlIGZvciBzaW1wbGUgZ2FtZXMuXG4qIEl0IGluY2x1ZGVzIGEgbnVtYmVyIG9mIGRyYXdpbmcgb3B0aW9ucyBpbmNsdWRpbmcgd2lyZWZyYW1lLCB2ZWN0b3Igd2l0aCBzdXBwb3J0IGZvciBzcHJpdGVzIGFuZCB2aWV3cG9ydHMuXG4qXG4qIEBjbGFzcyBSZW5kZXJcbiovXG5cbnZhciBSZW5kZXIgPSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXI7XG5cbnZhciBDb21tb24gPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1vbicpO1xudmFyIENvbXBvc2l0ZSA9IHJlcXVpcmUoJy4uL2JvZHkvQ29tcG9zaXRlJyk7XG52YXIgQm91bmRzID0gcmVxdWlyZSgnLi4vZ2VvbWV0cnkvQm91bmRzJyk7XG52YXIgRXZlbnRzID0gcmVxdWlyZSgnLi4vY29yZS9FdmVudHMnKTtcbnZhciBHcmlkID0gcmVxdWlyZSgnLi4vY29sbGlzaW9uL0dyaWQnKTtcbnZhciBWZWN0b3IgPSByZXF1aXJlKCcuLi9nZW9tZXRyeS9WZWN0b3InKTtcblxuKGZ1bmN0aW9uKCkge1xuICAgIFxuICAgIHZhciBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgX3JlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgZnVuY3Rpb24oY2FsbGJhY2speyB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soQ29tbW9uLm5vdygpKTsgfSwgMTAwMCAvIDYwKTsgfTtcbiAgIFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyByZW5kZXJlci4gVGhlIG9wdGlvbnMgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyBhbnkgcHJvcGVydGllcyB5b3Ugd2lzaCB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXG4gICAgICogQWxsIHByb3BlcnRpZXMgaGF2ZSBkZWZhdWx0IHZhbHVlcywgYW5kIG1hbnkgYXJlIHByZS1jYWxjdWxhdGVkIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gb3RoZXIgcHJvcGVydGllcy5cbiAgICAgKiBTZWUgdGhlIHByb3BlcnRpZXMgc2VjdGlvbiBiZWxvdyBmb3IgZGV0YWlsZWQgaW5mb3JtYXRpb24gb24gd2hhdCB5b3UgY2FuIHBhc3MgdmlhIHRoZSBgb3B0aW9uc2Agb2JqZWN0LlxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqIEByZXR1cm4ge3JlbmRlcn0gQSBuZXcgcmVuZGVyZXJcbiAgICAgKi9cbiAgICBSZW5kZXIuY3JlYXRlID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjb250cm9sbGVyOiBSZW5kZXIsXG4gICAgICAgICAgICBlbmdpbmU6IG51bGwsXG4gICAgICAgICAgICBlbGVtZW50OiBudWxsLFxuICAgICAgICAgICAgY2FudmFzOiBudWxsLFxuICAgICAgICAgICAgbW91c2U6IG51bGwsXG4gICAgICAgICAgICBmcmFtZVJlcXVlc3RJZDogbnVsbCxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogODAwLFxuICAgICAgICAgICAgICAgIGhlaWdodDogNjAwLFxuICAgICAgICAgICAgICAgIHBpeGVsUmF0aW86IDEsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyNmYWZhZmEnLFxuICAgICAgICAgICAgICAgIHdpcmVmcmFtZUJhY2tncm91bmQ6ICcjMjIyJyxcbiAgICAgICAgICAgICAgICBoYXNCb3VuZHM6ICEhb3B0aW9ucy5ib3VuZHMsXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB3aXJlZnJhbWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dTbGVlcGluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93RGVidWc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dCcm9hZHBoYXNlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93Qm91bmRzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93VmVsb2NpdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dDb2xsaXNpb25zOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93U2VwYXJhdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dBeGVzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93UG9zaXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93QW5nbGVJbmRpY2F0b3I6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dJZHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dTaGFkb3dzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93VmVydGV4TnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0NvbnZleEh1bGxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93SW50ZXJuYWxFZGdlczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd01vdXNlUG9zaXRpb246IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlbmRlciA9IENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIGlmIChyZW5kZXIuY2FudmFzKSB7XG4gICAgICAgICAgICByZW5kZXIuY2FudmFzLndpZHRoID0gcmVuZGVyLm9wdGlvbnMud2lkdGggfHwgcmVuZGVyLmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgIHJlbmRlci5jYW52YXMuaGVpZ2h0ID0gcmVuZGVyLm9wdGlvbnMuaGVpZ2h0IHx8IHJlbmRlci5jYW52YXMuaGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgcmVuZGVyLm1vdXNlID0gb3B0aW9ucy5tb3VzZTtcbiAgICAgICAgcmVuZGVyLmVuZ2luZSA9IG9wdGlvbnMuZW5naW5lO1xuICAgICAgICByZW5kZXIuY2FudmFzID0gcmVuZGVyLmNhbnZhcyB8fCBfY3JlYXRlQ2FudmFzKHJlbmRlci5vcHRpb25zLndpZHRoLCByZW5kZXIub3B0aW9ucy5oZWlnaHQpO1xuICAgICAgICByZW5kZXIuY29udGV4dCA9IHJlbmRlci5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgcmVuZGVyLnRleHR1cmVzID0ge307XG5cbiAgICAgICAgcmVuZGVyLmJvdW5kcyA9IHJlbmRlci5ib3VuZHMgfHwgeyBcbiAgICAgICAgICAgIG1pbjogeyBcbiAgICAgICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgICAgIHk6IDBcbiAgICAgICAgICAgIH0sIFxuICAgICAgICAgICAgbWF4OiB7IFxuICAgICAgICAgICAgICAgIHg6IHJlbmRlci5jYW52YXMud2lkdGgsXG4gICAgICAgICAgICAgICAgeTogcmVuZGVyLmNhbnZhcy5oZWlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAocmVuZGVyLm9wdGlvbnMucGl4ZWxSYXRpbyAhPT0gMSkge1xuICAgICAgICAgICAgUmVuZGVyLnNldFBpeGVsUmF0aW8ocmVuZGVyLCByZW5kZXIub3B0aW9ucy5waXhlbFJhdGlvKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChDb21tb24uaXNFbGVtZW50KHJlbmRlci5lbGVtZW50KSkge1xuICAgICAgICAgICAgcmVuZGVyLmVsZW1lbnQuYXBwZW5kQ2hpbGQocmVuZGVyLmNhbnZhcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBDb21tb24ubG9nKCdSZW5kZXIuY3JlYXRlOiBvcHRpb25zLmVsZW1lbnQgd2FzIHVuZGVmaW5lZCwgcmVuZGVyLmNhbnZhcyB3YXMgY3JlYXRlZCBidXQgbm90IGFwcGVuZGVkJywgJ3dhcm4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZW5kZXI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnRpbnVvdXNseSB1cGRhdGVzIHRoZSByZW5kZXIgY2FudmFzIG9uIHRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBldmVudC5cbiAgICAgKiBAbWV0aG9kIHJ1blxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKi9cbiAgICBSZW5kZXIucnVuID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIChmdW5jdGlvbiBsb29wKHRpbWUpe1xuICAgICAgICAgICAgcmVuZGVyLmZyYW1lUmVxdWVzdElkID0gX3JlcXVlc3RBbmltYXRpb25GcmFtZShsb29wKTtcbiAgICAgICAgICAgIFJlbmRlci53b3JsZChyZW5kZXIpO1xuICAgICAgICB9KSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmRzIGV4ZWN1dGlvbiBvZiBgUmVuZGVyLnJ1bmAgb24gdGhlIGdpdmVuIGByZW5kZXJgLCBieSBjYW5jZWxpbmcgdGhlIGFuaW1hdGlvbiBmcmFtZSByZXF1ZXN0IGV2ZW50IGxvb3AuXG4gICAgICogQG1ldGhvZCBzdG9wXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqL1xuICAgIFJlbmRlci5zdG9wID0gZnVuY3Rpb24ocmVuZGVyKSB7XG4gICAgICAgIF9jYW5jZWxBbmltYXRpb25GcmFtZShyZW5kZXIuZnJhbWVSZXF1ZXN0SWQpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBwaXhlbCByYXRpbyBvZiB0aGUgcmVuZGVyZXIgYW5kIHVwZGF0ZXMgdGhlIGNhbnZhcy5cbiAgICAgKiBUbyBhdXRvbWF0aWNhbGx5IGRldGVjdCB0aGUgY29ycmVjdCByYXRpbywgcGFzcyB0aGUgc3RyaW5nIGAnYXV0bydgIGZvciBgcGl4ZWxSYXRpb2AuXG4gICAgICogQG1ldGhvZCBzZXRQaXhlbFJhdGlvXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwaXhlbFJhdGlvXG4gICAgICovXG4gICAgUmVuZGVyLnNldFBpeGVsUmF0aW8gPSBmdW5jdGlvbihyZW5kZXIsIHBpeGVsUmF0aW8pIHtcbiAgICAgICAgdmFyIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIGNhbnZhcyA9IHJlbmRlci5jYW52YXM7XG5cbiAgICAgICAgaWYgKHBpeGVsUmF0aW8gPT09ICdhdXRvJykge1xuICAgICAgICAgICAgcGl4ZWxSYXRpbyA9IF9nZXRQaXhlbFJhdGlvKGNhbnZhcyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRpb25zLnBpeGVsUmF0aW8gPSBwaXhlbFJhdGlvO1xuICAgICAgICBjYW52YXMuc2V0QXR0cmlidXRlKCdkYXRhLXBpeGVsLXJhdGlvJywgcGl4ZWxSYXRpbyk7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IG9wdGlvbnMud2lkdGggKiBwaXhlbFJhdGlvO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgKiBwaXhlbFJhdGlvO1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBvcHRpb25zLndpZHRoICsgJ3B4JztcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgcmVuZGVyLmNvbnRleHQuc2NhbGUocGl4ZWxSYXRpbywgcGl4ZWxSYXRpbyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgdGhlIGdpdmVuIGBlbmdpbmVgJ3MgYE1hdHRlci5Xb3JsZGAgb2JqZWN0LlxuICAgICAqIFRoaXMgaXMgdGhlIGVudHJ5IHBvaW50IGZvciBhbGwgcmVuZGVyaW5nIGFuZCBzaG91bGQgYmUgY2FsbGVkIGV2ZXJ5IHRpbWUgdGhlIHNjZW5lIGNoYW5nZXMuXG4gICAgICogQG1ldGhvZCB3b3JsZFxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKi9cbiAgICBSZW5kZXIud29ybGQgPSBmdW5jdGlvbihyZW5kZXIpIHtcbiAgICAgICAgdmFyIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICB3b3JsZCA9IGVuZ2luZS53b3JsZCxcbiAgICAgICAgICAgIGNhbnZhcyA9IHJlbmRlci5jYW52YXMsXG4gICAgICAgICAgICBjb250ZXh0ID0gcmVuZGVyLmNvbnRleHQsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBhbGxCb2RpZXMgPSBDb21wb3NpdGUuYWxsQm9kaWVzKHdvcmxkKSxcbiAgICAgICAgICAgIGFsbENvbnN0cmFpbnRzID0gQ29tcG9zaXRlLmFsbENvbnN0cmFpbnRzKHdvcmxkKSxcbiAgICAgICAgICAgIGJhY2tncm91bmQgPSBvcHRpb25zLndpcmVmcmFtZXMgPyBvcHRpb25zLndpcmVmcmFtZUJhY2tncm91bmQgOiBvcHRpb25zLmJhY2tncm91bmQsXG4gICAgICAgICAgICBib2RpZXMgPSBbXSxcbiAgICAgICAgICAgIGNvbnN0cmFpbnRzID0gW10sXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIHZhciBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogZW5naW5lLnRpbWluZy50aW1lc3RhbXBcbiAgICAgICAgfTtcblxuICAgICAgICBFdmVudHMudHJpZ2dlcihyZW5kZXIsICdiZWZvcmVSZW5kZXInLCBldmVudCk7XG5cbiAgICAgICAgLy8gYXBwbHkgYmFja2dyb3VuZCBpZiBpdCBoYXMgY2hhbmdlZFxuICAgICAgICBpZiAocmVuZGVyLmN1cnJlbnRCYWNrZ3JvdW5kICE9PSBiYWNrZ3JvdW5kKVxuICAgICAgICAgICAgX2FwcGx5QmFja2dyb3VuZChyZW5kZXIsIGJhY2tncm91bmQpO1xuXG4gICAgICAgIC8vIGNsZWFyIHRoZSBjYW52YXMgd2l0aCBhIHRyYW5zcGFyZW50IGZpbGwsIHRvIGFsbG93IHRoZSBjYW52YXMgYmFja2dyb3VuZCB0byBzaG93XG4gICAgICAgIGNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1pbic7XG4gICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJ0cmFuc3BhcmVudFwiO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgICAgIGNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ3NvdXJjZS1vdmVyJztcblxuICAgICAgICAvLyBoYW5kbGUgYm91bmRzXG4gICAgICAgIGlmIChvcHRpb25zLmhhc0JvdW5kcykge1xuICAgICAgICAgICAgdmFyIGJvdW5kc1dpZHRoID0gcmVuZGVyLmJvdW5kcy5tYXgueCAtIHJlbmRlci5ib3VuZHMubWluLngsXG4gICAgICAgICAgICAgICAgYm91bmRzSGVpZ2h0ID0gcmVuZGVyLmJvdW5kcy5tYXgueSAtIHJlbmRlci5ib3VuZHMubWluLnksXG4gICAgICAgICAgICAgICAgYm91bmRzU2NhbGVYID0gYm91bmRzV2lkdGggLyBvcHRpb25zLndpZHRoLFxuICAgICAgICAgICAgICAgIGJvdW5kc1NjYWxlWSA9IGJvdW5kc0hlaWdodCAvIG9wdGlvbnMuaGVpZ2h0O1xuXG4gICAgICAgICAgICAvLyBmaWx0ZXIgb3V0IGJvZGllcyB0aGF0IGFyZSBub3QgaW4gdmlld1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGFsbEJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gYWxsQm9kaWVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChCb3VuZHMub3ZlcmxhcHMoYm9keS5ib3VuZHMsIHJlbmRlci5ib3VuZHMpKVxuICAgICAgICAgICAgICAgICAgICBib2RpZXMucHVzaChib2R5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBjb25zdHJhaW50cyB0aGF0IGFyZSBub3QgaW4gdmlld1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGFsbENvbnN0cmFpbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnN0cmFpbnQgPSBhbGxDb25zdHJhaW50c1tpXSxcbiAgICAgICAgICAgICAgICAgICAgYm9keUEgPSBjb25zdHJhaW50LmJvZHlBLFxuICAgICAgICAgICAgICAgICAgICBib2R5QiA9IGNvbnN0cmFpbnQuYm9keUIsXG4gICAgICAgICAgICAgICAgICAgIHBvaW50QVdvcmxkID0gY29uc3RyYWludC5wb2ludEEsXG4gICAgICAgICAgICAgICAgICAgIHBvaW50QldvcmxkID0gY29uc3RyYWludC5wb2ludEI7XG5cbiAgICAgICAgICAgICAgICBpZiAoYm9keUEpIHBvaW50QVdvcmxkID0gVmVjdG9yLmFkZChib2R5QS5wb3NpdGlvbiwgY29uc3RyYWludC5wb2ludEEpO1xuICAgICAgICAgICAgICAgIGlmIChib2R5QikgcG9pbnRCV29ybGQgPSBWZWN0b3IuYWRkKGJvZHlCLnBvc2l0aW9uLCBjb25zdHJhaW50LnBvaW50Qik7XG5cbiAgICAgICAgICAgICAgICBpZiAoIXBvaW50QVdvcmxkIHx8ICFwb2ludEJXb3JsZClcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICBpZiAoQm91bmRzLmNvbnRhaW5zKHJlbmRlci5ib3VuZHMsIHBvaW50QVdvcmxkKSB8fCBCb3VuZHMuY29udGFpbnMocmVuZGVyLmJvdW5kcywgcG9pbnRCV29ybGQpKVxuICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50cy5wdXNoKGNvbnN0cmFpbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0cmFuc2Zvcm0gdGhlIHZpZXdcbiAgICAgICAgICAgIGNvbnRleHQuc2NhbGUoMSAvIGJvdW5kc1NjYWxlWCwgMSAvIGJvdW5kc1NjYWxlWSk7XG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSgtcmVuZGVyLmJvdW5kcy5taW4ueCwgLXJlbmRlci5ib3VuZHMubWluLnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3RyYWludHMgPSBhbGxDb25zdHJhaW50cztcbiAgICAgICAgICAgIGJvZGllcyA9IGFsbEJvZGllcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb3B0aW9ucy53aXJlZnJhbWVzIHx8IChlbmdpbmUuZW5hYmxlU2xlZXBpbmcgJiYgb3B0aW9ucy5zaG93U2xlZXBpbmcpKSB7XG4gICAgICAgICAgICAvLyBmdWxseSBmZWF0dXJlZCByZW5kZXJpbmcgb2YgYm9kaWVzXG4gICAgICAgICAgICBSZW5kZXIuYm9kaWVzKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLnNob3dDb252ZXhIdWxscylcbiAgICAgICAgICAgICAgICBSZW5kZXIuYm9keUNvbnZleEh1bGxzKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcblxuICAgICAgICAgICAgLy8gb3B0aW1pc2VkIG1ldGhvZCBmb3Igd2lyZWZyYW1lcyBvbmx5XG4gICAgICAgICAgICBSZW5kZXIuYm9keVdpcmVmcmFtZXMocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd0JvdW5kcylcbiAgICAgICAgICAgIFJlbmRlci5ib2R5Qm91bmRzKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob3B0aW9ucy5zaG93QXhlcyB8fCBvcHRpb25zLnNob3dBbmdsZUluZGljYXRvcilcbiAgICAgICAgICAgIFJlbmRlci5ib2R5QXhlcyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG4gICAgICAgIFxuICAgICAgICBpZiAob3B0aW9ucy5zaG93UG9zaXRpb25zKVxuICAgICAgICAgICAgUmVuZGVyLmJvZHlQb3NpdGlvbnMocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dWZWxvY2l0eSlcbiAgICAgICAgICAgIFJlbmRlci5ib2R5VmVsb2NpdHkocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dJZHMpXG4gICAgICAgICAgICBSZW5kZXIuYm9keUlkcyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1NlcGFyYXRpb25zKVxuICAgICAgICAgICAgUmVuZGVyLnNlcGFyYXRpb25zKHJlbmRlciwgZW5naW5lLnBhaXJzLmxpc3QsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChvcHRpb25zLnNob3dDb2xsaXNpb25zKVxuICAgICAgICAgICAgUmVuZGVyLmNvbGxpc2lvbnMocmVuZGVyLCBlbmdpbmUucGFpcnMubGlzdCwgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd1ZlcnRleE51bWJlcnMpXG4gICAgICAgICAgICBSZW5kZXIudmVydGV4TnVtYmVycyhyZW5kZXIsIGJvZGllcywgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd01vdXNlUG9zaXRpb24pXG4gICAgICAgICAgICBSZW5kZXIubW91c2VQb3NpdGlvbihyZW5kZXIsIHJlbmRlci5tb3VzZSwgY29udGV4dCk7XG5cbiAgICAgICAgUmVuZGVyLmNvbnN0cmFpbnRzKGNvbnN0cmFpbnRzLCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob3B0aW9ucy5zaG93QnJvYWRwaGFzZSAmJiBlbmdpbmUuYnJvYWRwaGFzZS5jb250cm9sbGVyID09PSBHcmlkKVxuICAgICAgICAgICAgUmVuZGVyLmdyaWQocmVuZGVyLCBlbmdpbmUuYnJvYWRwaGFzZSwgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuc2hvd0RlYnVnKVxuICAgICAgICAgICAgUmVuZGVyLmRlYnVnKHJlbmRlciwgY29udGV4dCk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuaGFzQm91bmRzKSB7XG4gICAgICAgICAgICAvLyByZXZlcnQgdmlldyB0cmFuc2Zvcm1zXG4gICAgICAgICAgICBjb250ZXh0LnNldFRyYW5zZm9ybShvcHRpb25zLnBpeGVsUmF0aW8sIDAsIDAsIG9wdGlvbnMucGl4ZWxSYXRpbywgMCwgMCk7XG4gICAgICAgIH1cblxuICAgICAgICBFdmVudHMudHJpZ2dlcihyZW5kZXIsICdhZnRlclJlbmRlcicsIGV2ZW50KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgZGVidWdcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmRlYnVnID0gZnVuY3Rpb24ocmVuZGVyLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICB3b3JsZCA9IGVuZ2luZS53b3JsZCxcbiAgICAgICAgICAgIG1ldHJpY3MgPSBlbmdpbmUubWV0cmljcyxcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIGJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMod29ybGQpLFxuICAgICAgICAgICAgc3BhY2UgPSBcIiAgICBcIjtcblxuICAgICAgICBpZiAoZW5naW5lLnRpbWluZy50aW1lc3RhbXAgLSAocmVuZGVyLmRlYnVnVGltZXN0YW1wIHx8IDApID49IDUwMCkge1xuICAgICAgICAgICAgdmFyIHRleHQgPSBcIlwiO1xuXG4gICAgICAgICAgICBpZiAobWV0cmljcy50aW1pbmcpIHtcbiAgICAgICAgICAgICAgICB0ZXh0ICs9IFwiZnBzOiBcIiArIE1hdGgucm91bmQobWV0cmljcy50aW1pbmcuZnBzKSArIHNwYWNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBAaWYgREVCVUdcbiAgICAgICAgICAgIGlmIChtZXRyaWNzLmV4dGVuZGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1ldHJpY3MudGltaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gXCJkZWx0YTogXCIgKyBtZXRyaWNzLnRpbWluZy5kZWx0YS50b0ZpeGVkKDMpICsgc3BhY2U7XG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gXCJjb3JyZWN0aW9uOiBcIiArIG1ldHJpY3MudGltaW5nLmNvcnJlY3Rpb24udG9GaXhlZCgzKSArIHNwYWNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJib2RpZXM6IFwiICsgYm9kaWVzLmxlbmd0aCArIHNwYWNlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVuZ2luZS5icm9hZHBoYXNlLmNvbnRyb2xsZXIgPT09IEdyaWQpXG4gICAgICAgICAgICAgICAgICAgIHRleHQgKz0gXCJidWNrZXRzOiBcIiArIG1ldHJpY3MuYnVja2V0cyArIHNwYWNlO1xuXG4gICAgICAgICAgICAgICAgdGV4dCArPSBcIlxcblwiO1xuXG4gICAgICAgICAgICAgICAgdGV4dCArPSBcImNvbGxpc2lvbnM6IFwiICsgbWV0cmljcy5jb2xsaXNpb25zICsgc3BhY2U7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBcInBhaXJzOiBcIiArIGVuZ2luZS5wYWlycy5saXN0Lmxlbmd0aCArIHNwYWNlO1xuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJicm9hZDogXCIgKyBtZXRyaWNzLmJyb2FkRWZmICsgc3BhY2U7XG4gICAgICAgICAgICAgICAgdGV4dCArPSBcIm1pZDogXCIgKyBtZXRyaWNzLm1pZEVmZiArIHNwYWNlO1xuICAgICAgICAgICAgICAgIHRleHQgKz0gXCJuYXJyb3c6IFwiICsgbWV0cmljcy5uYXJyb3dFZmYgKyBzcGFjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEBlbmRpZiAgICAgICAgICAgIFxuXG4gICAgICAgICAgICByZW5kZXIuZGVidWdTdHJpbmcgPSB0ZXh0O1xuICAgICAgICAgICAgcmVuZGVyLmRlYnVnVGltZXN0YW1wID0gZW5naW5lLnRpbWluZy50aW1lc3RhbXA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVuZGVyLmRlYnVnU3RyaW5nKSB7XG4gICAgICAgICAgICBjLmZvbnQgPSBcIjEycHggQXJpYWxcIjtcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC41KSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ3JnYmEoMCwwLDAsMC41KSc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzcGxpdCA9IHJlbmRlci5kZWJ1Z1N0cmluZy5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjLmZpbGxUZXh0KHNwbGl0W2ldLCA1MCwgNTAgKyBpICogMTgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGNvbnN0cmFpbnRzXG4gICAgICogQHBhcmFtIHtjb25zdHJhaW50W119IGNvbnN0cmFpbnRzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmNvbnN0cmFpbnRzID0gZnVuY3Rpb24oY29uc3RyYWludHMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29uc3RyYWludHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjb25zdHJhaW50ID0gY29uc3RyYWludHNbaV07XG5cbiAgICAgICAgICAgIGlmICghY29uc3RyYWludC5yZW5kZXIudmlzaWJsZSB8fCAhY29uc3RyYWludC5wb2ludEEgfHwgIWNvbnN0cmFpbnQucG9pbnRCKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICB2YXIgYm9keUEgPSBjb25zdHJhaW50LmJvZHlBLFxuICAgICAgICAgICAgICAgIGJvZHlCID0gY29uc3RyYWludC5ib2R5QjtcblxuICAgICAgICAgICAgaWYgKGJvZHlBKSB7XG4gICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjLm1vdmVUbyhib2R5QS5wb3NpdGlvbi54ICsgY29uc3RyYWludC5wb2ludEEueCwgYm9keUEucG9zaXRpb24ueSArIGNvbnN0cmFpbnQucG9pbnRBLnkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjLmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgIGMubW92ZVRvKGNvbnN0cmFpbnQucG9pbnRBLngsIGNvbnN0cmFpbnQucG9pbnRBLnkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYm9keUIpIHtcbiAgICAgICAgICAgICAgICBjLmxpbmVUbyhib2R5Qi5wb3NpdGlvbi54ICsgY29uc3RyYWludC5wb2ludEIueCwgYm9keUIucG9zaXRpb24ueSArIGNvbnN0cmFpbnQucG9pbnRCLnkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjLmxpbmVUbyhjb25zdHJhaW50LnBvaW50Qi54LCBjb25zdHJhaW50LnBvaW50Qi55KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYy5saW5lV2lkdGggPSBjb25zdHJhaW50LnJlbmRlci5saW5lV2lkdGg7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gY29uc3RyYWludC5yZW5kZXIuc3Ryb2tlU3R5bGU7XG4gICAgICAgICAgICBjLnN0cm9rZSgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBib2R5U2hhZG93c1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmJvZHlTaGFkb3dzID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgZW5naW5lID0gcmVuZGVyLmVuZ2luZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmICghYm9keS5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgaWYgKGJvZHkuY2lyY2xlUmFkaXVzKSB7XG4gICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICBjLmFyYyhib2R5LnBvc2l0aW9uLngsIGJvZHkucG9zaXRpb24ueSwgYm9keS5jaXJjbGVSYWRpdXMsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICBjLmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjLmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgIGMubW92ZVRvKGJvZHkudmVydGljZXNbMF0ueCwgYm9keS52ZXJ0aWNlc1swXS55KTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMTsgaiA8IGJvZHkudmVydGljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYy5saW5lVG8oYm9keS52ZXJ0aWNlc1tqXS54LCBib2R5LnZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjLmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZGlzdGFuY2VYID0gYm9keS5wb3NpdGlvbi54IC0gcmVuZGVyLm9wdGlvbnMud2lkdGggKiAwLjUsXG4gICAgICAgICAgICAgICAgZGlzdGFuY2VZID0gYm9keS5wb3NpdGlvbi55IC0gcmVuZGVyLm9wdGlvbnMuaGVpZ2h0ICogMC4yLFxuICAgICAgICAgICAgICAgIGRpc3RhbmNlID0gTWF0aC5hYnMoZGlzdGFuY2VYKSArIE1hdGguYWJzKGRpc3RhbmNlWSk7XG5cbiAgICAgICAgICAgIGMuc2hhZG93Q29sb3IgPSAncmdiYSgwLDAsMCwwLjE1KSc7XG4gICAgICAgICAgICBjLnNoYWRvd09mZnNldFggPSAwLjA1ICogZGlzdGFuY2VYO1xuICAgICAgICAgICAgYy5zaGFkb3dPZmZzZXRZID0gMC4wNSAqIGRpc3RhbmNlWTtcbiAgICAgICAgICAgIGMuc2hhZG93Qmx1ciA9IDEgKyAxMiAqIE1hdGgubWluKDEsIGRpc3RhbmNlIC8gMTAwMCk7XG5cbiAgICAgICAgICAgIGMuZmlsbCgpO1xuXG4gICAgICAgICAgICBjLnNoYWRvd0NvbG9yID0gbnVsbDtcbiAgICAgICAgICAgIGMuc2hhZG93T2Zmc2V0WCA9IG51bGw7XG4gICAgICAgICAgICBjLnNoYWRvd09mZnNldFkgPSBudWxsO1xuICAgICAgICAgICAgYy5zaGFkb3dCbHVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBib2RpZXNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2RpZXMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBlbmdpbmUgPSByZW5kZXIuZW5naW5lLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zLFxuICAgICAgICAgICAgc2hvd0ludGVybmFsRWRnZXMgPSBvcHRpb25zLnNob3dJbnRlcm5hbEVkZ2VzIHx8ICFvcHRpb25zLndpcmVmcmFtZXMsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBrO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmICghYm9keS5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gaGFuZGxlIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgICAgICBmb3IgKGsgPSBib2R5LnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgayA8IGJvZHkucGFydHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0ID0gYm9keS5wYXJ0c1trXTtcblxuICAgICAgICAgICAgICAgIGlmICghcGFydC5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93U2xlZXBpbmcgJiYgYm9keS5pc1NsZWVwaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIGMuZ2xvYmFsQWxwaGEgPSAwLjUgKiBwYXJ0LnJlbmRlci5vcGFjaXR5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGFydC5yZW5kZXIub3BhY2l0eSAhPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBjLmdsb2JhbEFscGhhID0gcGFydC5yZW5kZXIub3BhY2l0eTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGFydC5yZW5kZXIuc3ByaXRlICYmIHBhcnQucmVuZGVyLnNwcml0ZS50ZXh0dXJlICYmICFvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFydCBzcHJpdGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwcml0ZSA9IHBhcnQucmVuZGVyLnNwcml0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHR1cmUgPSBfZ2V0VGV4dHVyZShyZW5kZXIsIHNwcml0ZS50ZXh0dXJlKTtcblxuICAgICAgICAgICAgICAgICAgICBjLnRyYW5zbGF0ZShwYXJ0LnBvc2l0aW9uLngsIHBhcnQucG9zaXRpb24ueSk7IFxuICAgICAgICAgICAgICAgICAgICBjLnJvdGF0ZShwYXJ0LmFuZ2xlKTtcblxuICAgICAgICAgICAgICAgICAgICBjLmRyYXdJbWFnZShcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHR1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLndpZHRoICogLXNwcml0ZS54T2Zmc2V0ICogc3ByaXRlLnhTY2FsZSwgXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLmhlaWdodCAqIC1zcHJpdGUueU9mZnNldCAqIHNwcml0ZS55U2NhbGUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dHVyZS53aWR0aCAqIHNwcml0ZS54U2NhbGUsIFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dHVyZS5oZWlnaHQgKiBzcHJpdGUueVNjYWxlXG4gICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmV2ZXJ0IHRyYW5zbGF0aW9uLCBob3BlZnVsbHkgZmFzdGVyIHRoYW4gc2F2ZSAvIHJlc3RvcmVcbiAgICAgICAgICAgICAgICAgICAgYy5yb3RhdGUoLXBhcnQuYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICBjLnRyYW5zbGF0ZSgtcGFydC5wb3NpdGlvbi54LCAtcGFydC5wb3NpdGlvbi55KTsgXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcGFydCBwb2x5Z29uXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0LmNpcmNsZVJhZGl1cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuYXJjKHBhcnQucG9zaXRpb24ueCwgcGFydC5wb3NpdGlvbi55LCBwYXJ0LmNpcmNsZVJhZGl1cywgMCwgMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5iZWdpblBhdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQudmVydGljZXNbMF0ueCwgcGFydC52ZXJ0aWNlc1swXS55KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDE7IGogPCBwYXJ0LnZlcnRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJ0LnZlcnRpY2VzW2ogLSAxXS5pc0ludGVybmFsIHx8IHNob3dJbnRlcm5hbEVkZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMubGluZVRvKHBhcnQudmVydGljZXNbal0ueCwgcGFydC52ZXJ0aWNlc1tqXS55KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnZlcnRpY2VzW2pdLngsIHBhcnQudmVydGljZXNbal0ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnQudmVydGljZXNbal0uaXNJbnRlcm5hbCAmJiAhc2hvd0ludGVybmFsRWRnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5tb3ZlVG8ocGFydC52ZXJ0aWNlc1soaiArIDEpICUgcGFydC52ZXJ0aWNlcy5sZW5ndGhdLngsIHBhcnQudmVydGljZXNbKGogKyAxKSAlIHBhcnQudmVydGljZXMubGVuZ3RoXS55KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubGluZVRvKHBhcnQudmVydGljZXNbMF0ueCwgcGFydC52ZXJ0aWNlc1swXS55KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5maWxsU3R5bGUgPSBwYXJ0LnJlbmRlci5maWxsU3R5bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmxpbmVXaWR0aCA9IHBhcnQucmVuZGVyLmxpbmVXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSBwYXJ0LnJlbmRlci5zdHJva2VTdHlsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMuZmlsbCgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICcjYmJiJztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGMuc3Ryb2tlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYy5nbG9iYWxBbHBoYSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogT3B0aW1pc2VkIG1ldGhvZCBmb3IgZHJhd2luZyBib2R5IHdpcmVmcmFtZXMgaW4gb25lIHBhc3NcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keVdpcmVmcmFtZXNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5V2lyZWZyYW1lcyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIHNob3dJbnRlcm5hbEVkZ2VzID0gcmVuZGVyLm9wdGlvbnMuc2hvd0ludGVybmFsRWRnZXMsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgaztcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIC8vIHJlbmRlciBhbGwgYm9kaWVzXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmICghYm9keS5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgLy8gaGFuZGxlIGNvbXBvdW5kIHBhcnRzXG4gICAgICAgICAgICBmb3IgKGsgPSBib2R5LnBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgayA8IGJvZHkucGFydHMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0ID0gYm9keS5wYXJ0c1trXTtcblxuICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQudmVydGljZXNbMF0ueCwgcGFydC52ZXJ0aWNlc1swXS55KTtcblxuICAgICAgICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBwYXJ0LnZlcnRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFydC52ZXJ0aWNlc1tqIC0gMV0uaXNJbnRlcm5hbCB8fCBzaG93SW50ZXJuYWxFZGdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5saW5lVG8ocGFydC52ZXJ0aWNlc1tqXS54LCBwYXJ0LnZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYy5tb3ZlVG8ocGFydC52ZXJ0aWNlc1tqXS54LCBwYXJ0LnZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnQudmVydGljZXNbal0uaXNJbnRlcm5hbCAmJiAhc2hvd0ludGVybmFsRWRnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQudmVydGljZXNbKGogKyAxKSAlIHBhcnQudmVydGljZXMubGVuZ3RoXS54LCBwYXJ0LnZlcnRpY2VzWyhqICsgMSkgJSBwYXJ0LnZlcnRpY2VzLmxlbmd0aF0ueSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYy5saW5lVG8ocGFydC52ZXJ0aWNlc1swXS54LCBwYXJ0LnZlcnRpY2VzWzBdLnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZVN0eWxlID0gJyNiYmInO1xuICAgICAgICBjLnN0cm9rZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBPcHRpbWlzZWQgbWV0aG9kIGZvciBkcmF3aW5nIGJvZHkgY29udmV4IGh1bGwgd2lyZWZyYW1lcyBpbiBvbmUgcGFzc1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBib2R5Q29udmV4SHVsbHNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5Q29udmV4SHVsbHMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgcGFydCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgaztcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIC8vIHJlbmRlciBjb252ZXggaHVsbHNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFib2R5LnJlbmRlci52aXNpYmxlIHx8IGJvZHkucGFydHMubGVuZ3RoID09PSAxKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjLm1vdmVUbyhib2R5LnZlcnRpY2VzWzBdLngsIGJvZHkudmVydGljZXNbMF0ueSk7XG5cbiAgICAgICAgICAgIGZvciAoaiA9IDE7IGogPCBib2R5LnZlcnRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgYy5saW5lVG8oYm9keS52ZXJ0aWNlc1tqXS54LCBib2R5LnZlcnRpY2VzW2pdLnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjLmxpbmVUbyhib2R5LnZlcnRpY2VzWzBdLngsIGJvZHkudmVydGljZXNbMF0ueSk7XG4gICAgICAgIH1cblxuICAgICAgICBjLmxpbmVXaWR0aCA9IDE7XG4gICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJztcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVuZGVycyBib2R5IHZlcnRleCBudW1iZXJzLlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCB2ZXJ0ZXhOdW1iZXJzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIudmVydGV4TnVtYmVycyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBqLFxuICAgICAgICAgICAgaztcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFydHMgPSBib2RpZXNbaV0ucGFydHM7XG4gICAgICAgICAgICBmb3IgKGsgPSBwYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGsgPCBwYXJ0cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJ0ID0gcGFydHNba107XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHBhcnQudmVydGljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYy5maWxsU3R5bGUgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJztcbiAgICAgICAgICAgICAgICAgICAgYy5maWxsVGV4dChpICsgJ18nICsgaiwgcGFydC5wb3NpdGlvbi54ICsgKHBhcnQudmVydGljZXNbal0ueCAtIHBhcnQucG9zaXRpb24ueCkgKiAwLjgsIHBhcnQucG9zaXRpb24ueSArIChwYXJ0LnZlcnRpY2VzW2pdLnkgLSBwYXJ0LnBvc2l0aW9uLnkpICogMC44KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVuZGVycyBtb3VzZSBwb3NpdGlvbi5cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgbW91c2VQb3NpdGlvblxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge21vdXNlfSBtb3VzZVxuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5tb3VzZVBvc2l0aW9uID0gZnVuY3Rpb24ocmVuZGVyLCBtb3VzZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQ7XG4gICAgICAgIGMuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC44KSc7XG4gICAgICAgIGMuZmlsbFRleHQobW91c2UucG9zaXRpb24ueCArICcgICcgKyBtb3VzZS5wb3NpdGlvbi55LCBtb3VzZS5wb3NpdGlvbi54ICsgNSwgbW91c2UucG9zaXRpb24ueSAtIDUpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBib2R5IGJvdW5kc1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBib2R5Qm91bmRzXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keUJvdW5kcyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnM7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV07XG5cbiAgICAgICAgICAgIGlmIChib2R5LnJlbmRlci52aXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcnRzID0gYm9kaWVzW2ldLnBhcnRzO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSBwYXJ0cy5sZW5ndGggPiAxID8gMSA6IDA7IGogPCBwYXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2pdO1xuICAgICAgICAgICAgICAgICAgICBjLnJlY3QocGFydC5ib3VuZHMubWluLngsIHBhcnQuYm91bmRzLm1pbi55LCBwYXJ0LmJvdW5kcy5tYXgueCAtIHBhcnQuYm91bmRzLm1pbi54LCBwYXJ0LmJvdW5kcy5tYXgueSAtIHBhcnQuYm91bmRzLm1pbi55KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4wOCknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdyZ2JhKDAsMCwwLDAuMSknO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEcmF3cyBib2R5IGFuZ2xlIGluZGljYXRvcnMgYW5kIGF4ZXNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keUF4ZXNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5QXhlcyA9IGZ1bmN0aW9uKHJlbmRlciwgYm9kaWVzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnMsXG4gICAgICAgICAgICBwYXJ0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGosXG4gICAgICAgICAgICBrO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSBib2RpZXNbaV0sXG4gICAgICAgICAgICAgICAgcGFydHMgPSBib2R5LnBhcnRzO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLnNob3dBeGVzKSB7XG4gICAgICAgICAgICAgICAgLy8gcmVuZGVyIGFsbCBheGVzXG4gICAgICAgICAgICAgICAgZm9yIChqID0gcGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBqIDwgcGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcGFydCA9IHBhcnRzW2pdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgcGFydC5heGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXhpcyA9IHBhcnQuYXhlc1trXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKHBhcnQucG9zaXRpb24ueCwgcGFydC5wb3NpdGlvbi55KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMubGluZVRvKHBhcnQucG9zaXRpb24ueCArIGF4aXMueCAqIDIwLCBwYXJ0LnBvc2l0aW9uLnkgKyBheGlzLnkgKiAyMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IHBhcnRzLmxlbmd0aCA+IDEgPyAxIDogMDsgaiA8IHBhcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQgPSBwYXJ0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHBhcnQuYXhlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVuZGVyIGEgc2luZ2xlIGF4aXMgaW5kaWNhdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhwYXJ0LnBvc2l0aW9uLngsIHBhcnQucG9zaXRpb24ueSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjLmxpbmVUbygocGFydC52ZXJ0aWNlc1swXS54ICsgcGFydC52ZXJ0aWNlc1twYXJ0LnZlcnRpY2VzLmxlbmd0aC0xXS54KSAvIDIsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHBhcnQudmVydGljZXNbMF0ueSArIHBhcnQudmVydGljZXNbcGFydC52ZXJ0aWNlcy5sZW5ndGgtMV0ueSkgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAnaW5kaWFucmVkJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgwLDAsMCwwLjgpJztcbiAgICAgICAgICAgIGMuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ292ZXJsYXknO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZSgpO1xuICAgICAgICBjLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9ICdzb3VyY2Utb3Zlcic7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIGJvZHkgcG9zaXRpb25zXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGJvZHlQb3NpdGlvbnNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5W119IGJvZGllc1xuICAgICAqIEBwYXJhbSB7UmVuZGVyaW5nQ29udGV4dH0gY29udGV4dFxuICAgICAqL1xuICAgIFJlbmRlci5ib2R5UG9zaXRpb25zID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0LFxuICAgICAgICAgICAgZW5naW5lID0gcmVuZGVyLmVuZ2luZSxcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIGJvZHksXG4gICAgICAgICAgICBwYXJ0LFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGs7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICAvLyByZW5kZXIgY3VycmVudCBwb3NpdGlvbnNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGJvZGllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYm9keSA9IGJvZGllc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFib2R5LnJlbmRlci52aXNpYmxlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAvLyBoYW5kbGUgY29tcG91bmQgcGFydHNcbiAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCBib2R5LnBhcnRzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgICAgICAgICAgcGFydCA9IGJvZHkucGFydHNba107XG4gICAgICAgICAgICAgICAgYy5hcmMocGFydC5wb3NpdGlvbi54LCBwYXJ0LnBvc2l0aW9uLnksIDMsIDAsIDIgKiBNYXRoLlBJLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYy5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ2luZGlhbnJlZCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDAsMCwwLDAuNSknO1xuICAgICAgICB9XG4gICAgICAgIGMuZmlsbCgpO1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgLy8gcmVuZGVyIHByZXZpb3VzIHBvc2l0aW9uc1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBib2R5ID0gYm9kaWVzW2ldO1xuICAgICAgICAgICAgaWYgKGJvZHkucmVuZGVyLnZpc2libGUpIHtcbiAgICAgICAgICAgICAgICBjLmFyYyhib2R5LnBvc2l0aW9uUHJldi54LCBib2R5LnBvc2l0aW9uUHJldi55LCAyLCAwLCAyICogTWF0aC5QSSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGMuY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwxNjUsMCwwLjgpJztcbiAgICAgICAgYy5maWxsKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERyYXdzIGJvZHkgdmVsb2NpdHlcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keVZlbG9jaXR5XG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7Ym9keVtdfSBib2RpZXNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuYm9keVZlbG9jaXR5ID0gZnVuY3Rpb24ocmVuZGVyLCBib2RpZXMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGMgPSBjb250ZXh0O1xuXG4gICAgICAgIGMuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBib2R5ID0gYm9kaWVzW2ldO1xuXG4gICAgICAgICAgICBpZiAoIWJvZHkucmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIGMubW92ZVRvKGJvZHkucG9zaXRpb24ueCwgYm9keS5wb3NpdGlvbi55KTtcbiAgICAgICAgICAgIGMubGluZVRvKGJvZHkucG9zaXRpb24ueCArIChib2R5LnBvc2l0aW9uLnggLSBib2R5LnBvc2l0aW9uUHJldi54KSAqIDIsIGJvZHkucG9zaXRpb24ueSArIChib2R5LnBvc2l0aW9uLnkgLSBib2R5LnBvc2l0aW9uUHJldi55KSAqIDIpO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAzO1xuICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ2Nvcm5mbG93ZXJibHVlJztcbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRHJhd3MgYm9keSBpZHNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgYm9keUlkc1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2JvZHlbXX0gYm9kaWVzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmJvZHlJZHMgPSBmdW5jdGlvbihyZW5kZXIsIGJvZGllcywgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBpLFxuICAgICAgICAgICAgajtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYm9kaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIWJvZGllc1tpXS5yZW5kZXIudmlzaWJsZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgdmFyIHBhcnRzID0gYm9kaWVzW2ldLnBhcnRzO1xuICAgICAgICAgICAgZm9yIChqID0gcGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBqIDwgcGFydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzW2pdO1xuICAgICAgICAgICAgICAgIGMuZm9udCA9IFwiMTJweCBBcmlhbFwiO1xuICAgICAgICAgICAgICAgIGMuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC41KSc7XG4gICAgICAgICAgICAgICAgYy5maWxsVGV4dChwYXJ0LmlkLCBwYXJ0LnBvc2l0aW9uLnggKyAxMCwgcGFydC5wb3NpdGlvbi55IC0gMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIGNvbGxpc2lvbnNcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtwYWlyW119IHBhaXJzXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmNvbGxpc2lvbnMgPSBmdW5jdGlvbihyZW5kZXIsIHBhaXJzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBjb3JyZWN0ZWQsXG4gICAgICAgICAgICBib2R5QSxcbiAgICAgICAgICAgIGJvZHlCLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGo7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICAvLyByZW5kZXIgY29sbGlzaW9uIHBvc2l0aW9uc1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBwYWlyLmFjdGl2ZUNvbnRhY3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnRhY3QgPSBwYWlyLmFjdGl2ZUNvbnRhY3RzW2pdLFxuICAgICAgICAgICAgICAgICAgICB2ZXJ0ZXggPSBjb250YWN0LnZlcnRleDtcbiAgICAgICAgICAgICAgICBjLnJlY3QodmVydGV4LnggLSAxLjUsIHZlcnRleC55IC0gMS41LCAzLjUsIDMuNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuNyknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5maWxsU3R5bGUgPSAnb3JhbmdlJztcbiAgICAgICAgfVxuICAgICAgICBjLmZpbGwoKTtcblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgXG4gICAgICAgIC8vIHJlbmRlciBjb2xsaXNpb24gbm9ybWFsc1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcblxuICAgICAgICAgICAgaWYgKCFwYWlyLmlzQWN0aXZlKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICBjb2xsaXNpb24gPSBwYWlyLmNvbGxpc2lvbjtcblxuICAgICAgICAgICAgaWYgKHBhaXIuYWN0aXZlQ29udGFjdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBub3JtYWxQb3NYID0gcGFpci5hY3RpdmVDb250YWN0c1swXS52ZXJ0ZXgueCxcbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsUG9zWSA9IHBhaXIuYWN0aXZlQ29udGFjdHNbMF0udmVydGV4Lnk7XG5cbiAgICAgICAgICAgICAgICBpZiAocGFpci5hY3RpdmVDb250YWN0cy5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9ybWFsUG9zWCA9IChwYWlyLmFjdGl2ZUNvbnRhY3RzWzBdLnZlcnRleC54ICsgcGFpci5hY3RpdmVDb250YWN0c1sxXS52ZXJ0ZXgueCkgLyAyO1xuICAgICAgICAgICAgICAgICAgICBub3JtYWxQb3NZID0gKHBhaXIuYWN0aXZlQ29udGFjdHNbMF0udmVydGV4LnkgKyBwYWlyLmFjdGl2ZUNvbnRhY3RzWzFdLnZlcnRleC55KSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjb2xsaXNpb24uYm9keUIgPT09IGNvbGxpc2lvbi5zdXBwb3J0c1swXS5ib2R5IHx8IGNvbGxpc2lvbi5ib2R5QS5pc1N0YXRpYyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjLm1vdmVUbyhub3JtYWxQb3NYIC0gY29sbGlzaW9uLm5vcm1hbC54ICogOCwgbm9ybWFsUG9zWSAtIGNvbGxpc2lvbi5ub3JtYWwueSAqIDgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGMubW92ZVRvKG5vcm1hbFBvc1ggKyBjb2xsaXNpb24ubm9ybWFsLnggKiA4LCBub3JtYWxQb3NZICsgY29sbGlzaW9uLm5vcm1hbC55ICogOCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYy5saW5lVG8obm9ybWFsUG9zWCwgbm9ybWFsUG9zWSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LDE2NSwwLDAuNyknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdvcmFuZ2UnO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBzZXBhcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge3BhaXJbXX0gcGFpcnNcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuc2VwYXJhdGlvbnMgPSBmdW5jdGlvbihyZW5kZXIsIHBhaXJzLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBjID0gY29udGV4dCxcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIHBhaXIsXG4gICAgICAgICAgICBjb2xsaXNpb24sXG4gICAgICAgICAgICBjb3JyZWN0ZWQsXG4gICAgICAgICAgICBib2R5QSxcbiAgICAgICAgICAgIGJvZHlCLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGo7XG5cbiAgICAgICAgYy5iZWdpblBhdGgoKTtcblxuICAgICAgICAvLyByZW5kZXIgc2VwYXJhdGlvbnNcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IHBhaXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwYWlyID0gcGFpcnNbaV07XG5cbiAgICAgICAgICAgIGlmICghcGFpci5pc0FjdGl2ZSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcblxuICAgICAgICAgICAgY29sbGlzaW9uID0gcGFpci5jb2xsaXNpb247XG4gICAgICAgICAgICBib2R5QSA9IGNvbGxpc2lvbi5ib2R5QTtcbiAgICAgICAgICAgIGJvZHlCID0gY29sbGlzaW9uLmJvZHlCO1xuXG4gICAgICAgICAgICB2YXIgayA9IDE7XG5cbiAgICAgICAgICAgIGlmICghYm9keUIuaXNTdGF0aWMgJiYgIWJvZHlBLmlzU3RhdGljKSBrID0gMC41O1xuICAgICAgICAgICAgaWYgKGJvZHlCLmlzU3RhdGljKSBrID0gMDtcblxuICAgICAgICAgICAgYy5tb3ZlVG8oYm9keUIucG9zaXRpb24ueCwgYm9keUIucG9zaXRpb24ueSk7XG4gICAgICAgICAgICBjLmxpbmVUbyhib2R5Qi5wb3NpdGlvbi54IC0gY29sbGlzaW9uLnBlbmV0cmF0aW9uLnggKiBrLCBib2R5Qi5wb3NpdGlvbi55IC0gY29sbGlzaW9uLnBlbmV0cmF0aW9uLnkgKiBrKTtcblxuICAgICAgICAgICAgayA9IDE7XG5cbiAgICAgICAgICAgIGlmICghYm9keUIuaXNTdGF0aWMgJiYgIWJvZHlBLmlzU3RhdGljKSBrID0gMC41O1xuICAgICAgICAgICAgaWYgKGJvZHlBLmlzU3RhdGljKSBrID0gMDtcblxuICAgICAgICAgICAgYy5tb3ZlVG8oYm9keUEucG9zaXRpb24ueCwgYm9keUEucG9zaXRpb24ueSk7XG4gICAgICAgICAgICBjLmxpbmVUbyhib2R5QS5wb3NpdGlvbi54ICsgY29sbGlzaW9uLnBlbmV0cmF0aW9uLnggKiBrLCBib2R5QS5wb3NpdGlvbi55ICsgY29sbGlzaW9uLnBlbmV0cmF0aW9uLnkgKiBrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLndpcmVmcmFtZXMpIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMTY1LDAsMC41KSc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjLnN0cm9rZVN0eWxlID0gJ29yYW5nZSc7XG4gICAgICAgIH1cbiAgICAgICAgYy5zdHJva2UoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2QgZ3JpZFxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge2dyaWR9IGdyaWRcbiAgICAgKiBAcGFyYW0ge1JlbmRlcmluZ0NvbnRleHR9IGNvbnRleHRcbiAgICAgKi9cbiAgICBSZW5kZXIuZ3JpZCA9IGZ1bmN0aW9uKHJlbmRlciwgZ3JpZCwgY29udGV4dCkge1xuICAgICAgICB2YXIgYyA9IGNvbnRleHQsXG4gICAgICAgICAgICBvcHRpb25zID0gcmVuZGVyLm9wdGlvbnM7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgYy5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwxODAsMCwwLjEpJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGMuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMTgwLDAsMC41KSc7XG4gICAgICAgIH1cblxuICAgICAgICBjLmJlZ2luUGF0aCgpO1xuXG4gICAgICAgIHZhciBidWNrZXRLZXlzID0gQ29tbW9uLmtleXMoZ3JpZC5idWNrZXRzKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1Y2tldEtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBidWNrZXRJZCA9IGJ1Y2tldEtleXNbaV07XG5cbiAgICAgICAgICAgIGlmIChncmlkLmJ1Y2tldHNbYnVja2V0SWRdLmxlbmd0aCA8IDIpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgIHZhciByZWdpb24gPSBidWNrZXRJZC5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgYy5yZWN0KDAuNSArIHBhcnNlSW50KHJlZ2lvblswXSwgMTApICogZ3JpZC5idWNrZXRXaWR0aCwgXG4gICAgICAgICAgICAgICAgICAgIDAuNSArIHBhcnNlSW50KHJlZ2lvblsxXSwgMTApICogZ3JpZC5idWNrZXRIZWlnaHQsIFxuICAgICAgICAgICAgICAgICAgICBncmlkLmJ1Y2tldFdpZHRoLCBcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5idWNrZXRIZWlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgYy5saW5lV2lkdGggPSAxO1xuICAgICAgICBjLnN0cm9rZSgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCBpbnNwZWN0b3JcbiAgICAgKiBAcGFyYW0ge2luc3BlY3Rvcn0gaW5zcGVjdG9yXG4gICAgICogQHBhcmFtIHtSZW5kZXJpbmdDb250ZXh0fSBjb250ZXh0XG4gICAgICovXG4gICAgUmVuZGVyLmluc3BlY3RvciA9IGZ1bmN0aW9uKGluc3BlY3RvciwgY29udGV4dCkge1xuICAgICAgICB2YXIgZW5naW5lID0gaW5zcGVjdG9yLmVuZ2luZSxcbiAgICAgICAgICAgIHNlbGVjdGVkID0gaW5zcGVjdG9yLnNlbGVjdGVkLFxuICAgICAgICAgICAgcmVuZGVyID0gaW5zcGVjdG9yLnJlbmRlcixcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIGJvdW5kcztcblxuICAgICAgICBpZiAob3B0aW9ucy5oYXNCb3VuZHMpIHtcbiAgICAgICAgICAgIHZhciBib3VuZHNXaWR0aCA9IHJlbmRlci5ib3VuZHMubWF4LnggLSByZW5kZXIuYm91bmRzLm1pbi54LFxuICAgICAgICAgICAgICAgIGJvdW5kc0hlaWdodCA9IHJlbmRlci5ib3VuZHMubWF4LnkgLSByZW5kZXIuYm91bmRzLm1pbi55LFxuICAgICAgICAgICAgICAgIGJvdW5kc1NjYWxlWCA9IGJvdW5kc1dpZHRoIC8gcmVuZGVyLm9wdGlvbnMud2lkdGgsXG4gICAgICAgICAgICAgICAgYm91bmRzU2NhbGVZID0gYm91bmRzSGVpZ2h0IC8gcmVuZGVyLm9wdGlvbnMuaGVpZ2h0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZXh0LnNjYWxlKDEgLyBib3VuZHNTY2FsZVgsIDEgLyBib3VuZHNTY2FsZVkpO1xuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoLXJlbmRlci5ib3VuZHMubWluLngsIC1yZW5kZXIuYm91bmRzLm1pbi55KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gc2VsZWN0ZWRbaV0uZGF0YTtcblxuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoMC41LCAwLjUpO1xuICAgICAgICAgICAgY29udGV4dC5saW5lV2lkdGggPSAxO1xuICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwxNjUsMCwwLjkpJztcbiAgICAgICAgICAgIGNvbnRleHQuc2V0TGluZURhc2goWzEsMl0pO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKGl0ZW0udHlwZSkge1xuXG4gICAgICAgICAgICBjYXNlICdib2R5JzpcblxuICAgICAgICAgICAgICAgIC8vIHJlbmRlciBib2R5IHNlbGVjdGlvbnNcbiAgICAgICAgICAgICAgICBib3VuZHMgPSBpdGVtLmJvdW5kcztcbiAgICAgICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQucmVjdChNYXRoLmZsb29yKGJvdW5kcy5taW4ueCAtIDMpLCBNYXRoLmZsb29yKGJvdW5kcy5taW4ueSAtIDMpLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5mbG9vcihib3VuZHMubWF4LnggLSBib3VuZHMubWluLnggKyA2KSwgTWF0aC5mbG9vcihib3VuZHMubWF4LnkgLSBib3VuZHMubWluLnkgKyA2KSk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5jbG9zZVBhdGgoKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN0cm9rZSgpO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NvbnN0cmFpbnQnOlxuXG4gICAgICAgICAgICAgICAgLy8gcmVuZGVyIGNvbnN0cmFpbnQgc2VsZWN0aW9uc1xuICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IGl0ZW0ucG9pbnRBO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmJvZHlBKVxuICAgICAgICAgICAgICAgICAgICBwb2ludCA9IGl0ZW0ucG9pbnRCO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5hcmMocG9pbnQueCwgcG9pbnQueSwgMTAsIDAsIDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb250ZXh0LnNldExpbmVEYXNoKFtdKTtcbiAgICAgICAgICAgIGNvbnRleHQudHJhbnNsYXRlKC0wLjUsIC0wLjUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVuZGVyIHNlbGVjdGlvbiByZWdpb25cbiAgICAgICAgaWYgKGluc3BlY3Rvci5zZWxlY3RTdGFydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGV4dC50cmFuc2xhdGUoMC41LCAwLjUpO1xuICAgICAgICAgICAgY29udGV4dC5saW5lV2lkdGggPSAxO1xuICAgICAgICAgICAgY29udGV4dC5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwxNjUsMCwwLjYpJztcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LDE2NSwwLDAuMSknO1xuICAgICAgICAgICAgYm91bmRzID0gaW5zcGVjdG9yLnNlbGVjdEJvdW5kcztcbiAgICAgICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgICAgICBjb250ZXh0LnJlY3QoTWF0aC5mbG9vcihib3VuZHMubWluLngpLCBNYXRoLmZsb29yKGJvdW5kcy5taW4ueSksIFxuICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGguZmxvb3IoYm91bmRzLm1heC54IC0gYm91bmRzLm1pbi54KSwgTWF0aC5mbG9vcihib3VuZHMubWF4LnkgLSBib3VuZHMubWluLnkpKTtcbiAgICAgICAgICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgICAgICAgICBjb250ZXh0LnN0cm9rZSgpO1xuICAgICAgICAgICAgY29udGV4dC5maWxsKCk7XG4gICAgICAgICAgICBjb250ZXh0LnRyYW5zbGF0ZSgtMC41LCAtMC41KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLmhhc0JvdW5kcylcbiAgICAgICAgICAgIGNvbnRleHQuc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBtZXRob2QgX2NyZWF0ZUNhbnZhc1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHt9IHdpZHRoXG4gICAgICogQHBhcmFtIHt9IGhlaWdodFxuICAgICAqIEByZXR1cm4gY2FudmFzXG4gICAgICovXG4gICAgdmFyIF9jcmVhdGVDYW52YXMgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgY2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGNhbnZhcy5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgY2FudmFzLm9uc2VsZWN0c3RhcnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9O1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBwaXhlbCByYXRpbyBvZiB0aGUgY2FudmFzLlxuICAgICAqIEBtZXRob2QgX2dldFBpeGVsUmF0aW9cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNhbnZhc1xuICAgICAqIEByZXR1cm4ge051bWJlcn0gcGl4ZWwgcmF0aW9cbiAgICAgKi9cbiAgICB2YXIgX2dldFBpeGVsUmF0aW8gPSBmdW5jdGlvbihjYW52YXMpIHtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIGRldmljZVBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLFxuICAgICAgICAgICAgYmFja2luZ1N0b3JlUGl4ZWxSYXRpbyA9IGNvbnRleHQud2Via2l0QmFja2luZ1N0b3JlUGl4ZWxSYXRpbyB8fCBjb250ZXh0Lm1vekJhY2tpbmdTdG9yZVBpeGVsUmF0aW9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgY29udGV4dC5tc0JhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHwgY29udGV4dC5vQmFja2luZ1N0b3JlUGl4ZWxSYXRpb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCBjb250ZXh0LmJhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHwgMTtcblxuICAgICAgICByZXR1cm4gZGV2aWNlUGl4ZWxSYXRpbyAvIGJhY2tpbmdTdG9yZVBpeGVsUmF0aW87XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHJlcXVlc3RlZCB0ZXh0dXJlIChhbiBJbWFnZSkgdmlhIGl0cyBwYXRoXG4gICAgICogQG1ldGhvZCBfZ2V0VGV4dHVyZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtyZW5kZXJ9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbWFnZVBhdGhcbiAgICAgKiBAcmV0dXJuIHtJbWFnZX0gdGV4dHVyZVxuICAgICAqL1xuICAgIHZhciBfZ2V0VGV4dHVyZSA9IGZ1bmN0aW9uKHJlbmRlciwgaW1hZ2VQYXRoKSB7XG4gICAgICAgIHZhciBpbWFnZSA9IHJlbmRlci50ZXh0dXJlc1tpbWFnZVBhdGhdO1xuXG4gICAgICAgIGlmIChpbWFnZSlcbiAgICAgICAgICAgIHJldHVybiBpbWFnZTtcblxuICAgICAgICBpbWFnZSA9IHJlbmRlci50ZXh0dXJlc1tpbWFnZVBhdGhdID0gbmV3IEltYWdlKCk7XG4gICAgICAgIGltYWdlLnNyYyA9IGltYWdlUGF0aDtcblxuICAgICAgICByZXR1cm4gaW1hZ2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFwcGxpZXMgdGhlIGJhY2tncm91bmQgdG8gdGhlIGNhbnZhcyB1c2luZyBDU1MuXG4gICAgICogQG1ldGhvZCBhcHBseUJhY2tncm91bmRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7cmVuZGVyfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYmFja2dyb3VuZFxuICAgICAqL1xuICAgIHZhciBfYXBwbHlCYWNrZ3JvdW5kID0gZnVuY3Rpb24ocmVuZGVyLCBiYWNrZ3JvdW5kKSB7XG4gICAgICAgIHZhciBjc3NCYWNrZ3JvdW5kID0gYmFja2dyb3VuZDtcblxuICAgICAgICBpZiAoLyhqcGd8Z2lmfHBuZykkLy50ZXN0KGJhY2tncm91bmQpKVxuICAgICAgICAgICAgY3NzQmFja2dyb3VuZCA9ICd1cmwoJyArIGJhY2tncm91bmQgKyAnKSc7XG5cbiAgICAgICAgcmVuZGVyLmNhbnZhcy5zdHlsZS5iYWNrZ3JvdW5kID0gY3NzQmFja2dyb3VuZDtcbiAgICAgICAgcmVuZGVyLmNhbnZhcy5zdHlsZS5iYWNrZ3JvdW5kU2l6ZSA9IFwiY29udGFpblwiO1xuICAgICAgICByZW5kZXIuY3VycmVudEJhY2tncm91bmQgPSBiYWNrZ3JvdW5kO1xuICAgIH07XG5cbiAgICAvKlxuICAgICpcbiAgICAqICBFdmVudHMgRG9jdW1lbnRhdGlvblxuICAgICpcbiAgICAqL1xuXG4gICAgLyoqXG4gICAgKiBGaXJlZCBiZWZvcmUgcmVuZGVyaW5nXG4gICAgKlxuICAgICogQGV2ZW50IGJlZm9yZVJlbmRlclxuICAgICogQHBhcmFtIHt9IGV2ZW50IEFuIGV2ZW50IG9iamVjdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGV2ZW50LnRpbWVzdGFtcCBUaGUgZW5naW5lLnRpbWluZy50aW1lc3RhbXAgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQuc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IG9mIHRoZSBldmVudFxuICAgICogQHBhcmFtIHt9IGV2ZW50Lm5hbWUgVGhlIG5hbWUgb2YgdGhlIGV2ZW50XG4gICAgKi9cblxuICAgIC8qKlxuICAgICogRmlyZWQgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgKlxuICAgICogQGV2ZW50IGFmdGVyUmVuZGVyXG4gICAgKiBAcGFyYW0ge30gZXZlbnQgQW4gZXZlbnQgb2JqZWN0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gZXZlbnQudGltZXN0YW1wIFRoZSBlbmdpbmUudGltaW5nLnRpbWVzdGFtcCBvZiB0aGUgZXZlbnRcbiAgICAqIEBwYXJhbSB7fSBldmVudC5zb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb2YgdGhlIGV2ZW50XG4gICAgKiBAcGFyYW0ge30gZXZlbnQubmFtZSBUaGUgbmFtZSBvZiB0aGUgZXZlbnRcbiAgICAqL1xuXG4gICAgLypcbiAgICAqXG4gICAgKiAgUHJvcGVydGllcyBEb2N1bWVudGF0aW9uXG4gICAgKlxuICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGJhY2stcmVmZXJlbmNlIHRvIHRoZSBgTWF0dGVyLlJlbmRlcmAgbW9kdWxlLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGNvbnRyb2xsZXJcbiAgICAgKiBAdHlwZSByZW5kZXJcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgcmVmZXJlbmNlIHRvIHRoZSBgTWF0dGVyLkVuZ2luZWAgaW5zdGFuY2UgdG8gYmUgdXNlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBlbmdpbmVcbiAgICAgKiBAdHlwZSBlbmdpbmVcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEEgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHdoZXJlIHRoZSBjYW52YXMgaXMgdG8gYmUgaW5zZXJ0ZWQgKGlmIGByZW5kZXIuY2FudmFzYCBoYXMgbm90IGJlZW4gc3BlY2lmaWVkKVxuICAgICAqXG4gICAgICogQHByb3BlcnR5IGVsZW1lbnRcbiAgICAgKiBAdHlwZSBIVE1MRWxlbWVudFxuICAgICAqIEBkZWZhdWx0IG51bGxcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSBjYW52YXMgZWxlbWVudCB0byByZW5kZXIgdG8uIElmIG5vdCBzcGVjaWZpZWQsIG9uZSB3aWxsIGJlIGNyZWF0ZWQgaWYgYHJlbmRlci5lbGVtZW50YCBoYXMgYmVlbiBzcGVjaWZpZWQuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgY2FudmFzXG4gICAgICogQHR5cGUgSFRNTENhbnZhc0VsZW1lbnRcbiAgICAgKiBAZGVmYXVsdCBudWxsXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgY29uZmlndXJhdGlvbiBvcHRpb25zIG9mIHRoZSByZW5kZXJlci5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBvcHRpb25zXG4gICAgICogQHR5cGUge31cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSB0YXJnZXQgd2lkdGggaW4gcGl4ZWxzIG9mIHRoZSBgcmVuZGVyLmNhbnZhc2AgdG8gYmUgY3JlYXRlZC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBvcHRpb25zLndpZHRoXG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgODAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdGFyZ2V0IGhlaWdodCBpbiBwaXhlbHMgb2YgdGhlIGByZW5kZXIuY2FudmFzYCB0byBiZSBjcmVhdGVkLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IG9wdGlvbnMuaGVpZ2h0XG4gICAgICogQHR5cGUgbnVtYmVyXG4gICAgICogQGRlZmF1bHQgNjAwXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGZsYWcgdGhhdCBzcGVjaWZpZXMgaWYgYHJlbmRlci5ib3VuZHNgIHNob3VsZCBiZSB1c2VkIHdoZW4gcmVuZGVyaW5nLlxuICAgICAqXG4gICAgICogQHByb3BlcnR5IG9wdGlvbnMuaGFzQm91bmRzXG4gICAgICogQHR5cGUgYm9vbGVhblxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBBIGBCb3VuZHNgIG9iamVjdCB0aGF0IHNwZWNpZmllcyB0aGUgZHJhd2luZyB2aWV3IHJlZ2lvbi4gXG4gICAgICogUmVuZGVyaW5nIHdpbGwgYmUgYXV0b21hdGljYWxseSB0cmFuc2Zvcm1lZCBhbmQgc2NhbGVkIHRvIGZpdCB3aXRoaW4gdGhlIGNhbnZhcyBzaXplIChgcmVuZGVyLm9wdGlvbnMud2lkdGhgIGFuZCBgcmVuZGVyLm9wdGlvbnMuaGVpZ2h0YCkuXG4gICAgICogVGhpcyBhbGxvd3MgZm9yIGNyZWF0aW5nIHZpZXdzIHRoYXQgY2FuIHBhbiBvciB6b29tIGFyb3VuZCB0aGUgc2NlbmUuXG4gICAgICogWW91IG11c3QgYWxzbyBzZXQgYHJlbmRlci5vcHRpb25zLmhhc0JvdW5kc2AgdG8gYHRydWVgIHRvIGVuYWJsZSBib3VuZGVkIHJlbmRlcmluZy5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBib3VuZHNcbiAgICAgKiBAdHlwZSBib3VuZHNcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIFRoZSAyZCByZW5kZXJpbmcgY29udGV4dCBmcm9tIHRoZSBgcmVuZGVyLmNhbnZhc2AgZWxlbWVudC5cbiAgICAgKlxuICAgICAqIEBwcm9wZXJ0eSBjb250ZXh0XG4gICAgICogQHR5cGUgQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBUaGUgc3ByaXRlIHRleHR1cmUgY2FjaGUuXG4gICAgICpcbiAgICAgKiBAcHJvcGVydHkgdGV4dHVyZXNcbiAgICAgKiBAdHlwZSB7fVxuICAgICAqL1xuXG59KSgpO1xuIiwiLyoqXG4qIFRoZSBgTWF0dGVyLlJlbmRlclBpeGlgIG1vZHVsZSBpcyBhbiBleGFtcGxlIHJlbmRlcmVyIHVzaW5nIHBpeGkuanMuXG4qIFNlZSBhbHNvIGBNYXR0ZXIuUmVuZGVyYCBmb3IgYSBjYW52YXMgYmFzZWQgcmVuZGVyZXIuXG4qXG4qIEBjbGFzcyBSZW5kZXJQaXhpXG4qIEBkZXByZWNhdGVkIHRoZSBNYXR0ZXIuUmVuZGVyUGl4aSBtb2R1bGUgd2lsbCBzb29uIGJlIHJlbW92ZWQgZnJvbSB0aGUgTWF0dGVyLmpzIGNvcmUuXG4qIEl0IHdpbGwgbGlrZWx5IGJlIG1vdmVkIHRvIGl0cyBvd24gcmVwb3NpdG9yeSAoYnV0IG1haW50ZW5hbmNlIHdpbGwgYmUgbGltaXRlZCkuXG4qL1xuXG52YXIgUmVuZGVyUGl4aSA9IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlclBpeGk7XG5cbnZhciBDb21wb3NpdGUgPSByZXF1aXJlKCcuLi9ib2R5L0NvbXBvc2l0ZScpO1xudmFyIENvbW1vbiA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbW9uJyk7XG5cbihmdW5jdGlvbigpIHtcblxuICAgIHZhciBfcmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgX3JlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgZnVuY3Rpb24oY2FsbGJhY2speyB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soQ29tbW9uLm5vdygpKTsgfSwgMTAwMCAvIDYwKTsgfTtcbiAgIFxuICAgICAgICBfY2FuY2VsQW5pbWF0aW9uRnJhbWUgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1vekNhbmNlbEFuaW1hdGlvbkZyYW1lIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCB3aW5kb3cud2Via2l0Q2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1zQ2FuY2VsQW5pbWF0aW9uRnJhbWU7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgUGl4aS5qcyBXZWJHTCByZW5kZXJlclxuICAgICAqIEBtZXRob2QgY3JlYXRlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJuIHtSZW5kZXJQaXhpfSBBIG5ldyByZW5kZXJlclxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgUmVuZGVyUGl4aS5jcmVhdGUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIENvbW1vbi5sb2coJ1JlbmRlclBpeGkuY3JlYXRlOiBNYXR0ZXIuUmVuZGVyUGl4aSBpcyBkZXByZWNhdGVkIChzZWUgZG9jcyknLCAnd2FybicpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFJlbmRlclBpeGksXG4gICAgICAgICAgICBlbmdpbmU6IG51bGwsXG4gICAgICAgICAgICBlbGVtZW50OiBudWxsLFxuICAgICAgICAgICAgZnJhbWVSZXF1ZXN0SWQ6IG51bGwsXG4gICAgICAgICAgICBjYW52YXM6IG51bGwsXG4gICAgICAgICAgICByZW5kZXJlcjogbnVsbCxcbiAgICAgICAgICAgIGNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHNwcml0ZUNvbnRhaW5lcjogbnVsbCxcbiAgICAgICAgICAgIHBpeGlPcHRpb25zOiBudWxsLFxuICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHdpZHRoOiA4MDAsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiA2MDAsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJyNmYWZhZmEnLFxuICAgICAgICAgICAgICAgIHdpcmVmcmFtZUJhY2tncm91bmQ6ICcjMjIyJyxcbiAgICAgICAgICAgICAgICBoYXNCb3VuZHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgd2lyZWZyYW1lczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93U2xlZXBpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd0RlYnVnOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93QnJvYWRwaGFzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0JvdW5kczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1ZlbG9jaXR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzaG93Q29sbGlzaW9uczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0F4ZXM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dQb3NpdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNob3dBbmdsZUluZGljYXRvcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd0lkczogZmFsc2UsXG4gICAgICAgICAgICAgICAgc2hvd1NoYWRvd3M6IGZhbHNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHJlbmRlciA9IENvbW1vbi5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpLFxuICAgICAgICAgICAgdHJhbnNwYXJlbnQgPSAhcmVuZGVyLm9wdGlvbnMud2lyZWZyYW1lcyAmJiByZW5kZXIub3B0aW9ucy5iYWNrZ3JvdW5kID09PSAndHJhbnNwYXJlbnQnO1xuXG4gICAgICAgIC8vIGluaXQgcGl4aVxuICAgICAgICByZW5kZXIucGl4aU9wdGlvbnMgPSByZW5kZXIucGl4aU9wdGlvbnMgfHwge1xuICAgICAgICAgICAgdmlldzogcmVuZGVyLmNhbnZhcyxcbiAgICAgICAgICAgIHRyYW5zcGFyZW50OiB0cmFuc3BhcmVudCxcbiAgICAgICAgICAgIGFudGlhbGlhczogdHJ1ZSxcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogb3B0aW9ucy5iYWNrZ3JvdW5kXG4gICAgICAgIH07XG5cbiAgICAgICAgcmVuZGVyLm1vdXNlID0gb3B0aW9ucy5tb3VzZTtcbiAgICAgICAgcmVuZGVyLmVuZ2luZSA9IG9wdGlvbnMuZW5naW5lO1xuICAgICAgICByZW5kZXIucmVuZGVyZXIgPSByZW5kZXIucmVuZGVyZXIgfHwgbmV3IFBJWEkuV2ViR0xSZW5kZXJlcihyZW5kZXIub3B0aW9ucy53aWR0aCwgcmVuZGVyLm9wdGlvbnMuaGVpZ2h0LCByZW5kZXIucGl4aU9wdGlvbnMpO1xuICAgICAgICByZW5kZXIuY29udGFpbmVyID0gcmVuZGVyLmNvbnRhaW5lciB8fCBuZXcgUElYSS5Db250YWluZXIoKTtcbiAgICAgICAgcmVuZGVyLnNwcml0ZUNvbnRhaW5lciA9IHJlbmRlci5zcHJpdGVDb250YWluZXIgfHwgbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgICAgIHJlbmRlci5jYW52YXMgPSByZW5kZXIuY2FudmFzIHx8IHJlbmRlci5yZW5kZXJlci52aWV3O1xuICAgICAgICByZW5kZXIuYm91bmRzID0gcmVuZGVyLmJvdW5kcyB8fCB7IFxuICAgICAgICAgICAgbWluOiB7XG4gICAgICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgICAgICB5OiAwXG4gICAgICAgICAgICB9LCBcbiAgICAgICAgICAgIG1heDogeyBcbiAgICAgICAgICAgICAgICB4OiByZW5kZXIub3B0aW9ucy53aWR0aCxcbiAgICAgICAgICAgICAgICB5OiByZW5kZXIub3B0aW9ucy5oZWlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBjYWNoZXNcbiAgICAgICAgcmVuZGVyLnRleHR1cmVzID0ge307XG4gICAgICAgIHJlbmRlci5zcHJpdGVzID0ge307XG4gICAgICAgIHJlbmRlci5wcmltaXRpdmVzID0ge307XG5cbiAgICAgICAgLy8gdXNlIGEgc3ByaXRlIGJhdGNoIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICByZW5kZXIuY29udGFpbmVyLmFkZENoaWxkKHJlbmRlci5zcHJpdGVDb250YWluZXIpO1xuXG4gICAgICAgIC8vIGluc2VydCBjYW52YXNcbiAgICAgICAgaWYgKENvbW1vbi5pc0VsZW1lbnQocmVuZGVyLmVsZW1lbnQpKSB7XG4gICAgICAgICAgICByZW5kZXIuZWxlbWVudC5hcHBlbmRDaGlsZChyZW5kZXIuY2FudmFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIENvbW1vbi5sb2coJ05vIFwicmVuZGVyLmVsZW1lbnRcIiBwYXNzZWQsIFwicmVuZGVyLmNhbnZhc1wiIHdhcyBub3QgaW5zZXJ0ZWQgaW50byBkb2N1bWVudC4nLCAnd2FybicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcHJldmVudCBtZW51cyBvbiBjYW52YXNcbiAgICAgICAgcmVuZGVyLmNhbnZhcy5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcbiAgICAgICAgcmVuZGVyLmNhbnZhcy5vbnNlbGVjdHN0YXJ0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfTtcblxuICAgICAgICByZXR1cm4gcmVuZGVyO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb250aW51b3VzbHkgdXBkYXRlcyB0aGUgcmVuZGVyIGNhbnZhcyBvbiB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgZXZlbnQuXG4gICAgICogQG1ldGhvZCBydW5cbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLnJ1biA9IGZ1bmN0aW9uKHJlbmRlcikge1xuICAgICAgICAoZnVuY3Rpb24gbG9vcCh0aW1lKXtcbiAgICAgICAgICAgIHJlbmRlci5mcmFtZVJlcXVlc3RJZCA9IF9yZXF1ZXN0QW5pbWF0aW9uRnJhbWUobG9vcCk7XG4gICAgICAgICAgICBSZW5kZXJQaXhpLndvcmxkKHJlbmRlcik7XG4gICAgICAgIH0pKCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEVuZHMgZXhlY3V0aW9uIG9mIGBSZW5kZXIucnVuYCBvbiB0aGUgZ2l2ZW4gYHJlbmRlcmAsIGJ5IGNhbmNlbGluZyB0aGUgYW5pbWF0aW9uIGZyYW1lIHJlcXVlc3QgZXZlbnQgbG9vcC5cbiAgICAgKiBAbWV0aG9kIHN0b3BcbiAgICAgKiBAcGFyYW0ge3JlbmRlcn0gcmVuZGVyXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLnN0b3AgPSBmdW5jdGlvbihyZW5kZXIpIHtcbiAgICAgICAgX2NhbmNlbEFuaW1hdGlvbkZyYW1lKHJlbmRlci5mcmFtZVJlcXVlc3RJZCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgc2NlbmUgZ3JhcGhcbiAgICAgKiBAbWV0aG9kIGNsZWFyXG4gICAgICogQHBhcmFtIHtSZW5kZXJQaXhpfSByZW5kZXJcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIFJlbmRlclBpeGkuY2xlYXIgPSBmdW5jdGlvbihyZW5kZXIpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IHJlbmRlci5jb250YWluZXIsXG4gICAgICAgICAgICBzcHJpdGVDb250YWluZXIgPSByZW5kZXIuc3ByaXRlQ29udGFpbmVyO1xuXG4gICAgICAgIC8vIGNsZWFyIHN0YWdlIGNvbnRhaW5lclxuICAgICAgICB3aGlsZSAoY29udGFpbmVyLmNoaWxkcmVuWzBdKSB7IFxuICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5jaGlsZHJlblswXSk7IFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2xlYXIgc3ByaXRlIGJhdGNoXG4gICAgICAgIHdoaWxlIChzcHJpdGVDb250YWluZXIuY2hpbGRyZW5bMF0pIHsgXG4gICAgICAgICAgICBzcHJpdGVDb250YWluZXIucmVtb3ZlQ2hpbGQoc3ByaXRlQ29udGFpbmVyLmNoaWxkcmVuWzBdKTsgXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYmdTcHJpdGUgPSByZW5kZXIuc3ByaXRlc1snYmctMCddO1xuXG4gICAgICAgIC8vIGNsZWFyIGNhY2hlc1xuICAgICAgICByZW5kZXIudGV4dHVyZXMgPSB7fTtcbiAgICAgICAgcmVuZGVyLnNwcml0ZXMgPSB7fTtcbiAgICAgICAgcmVuZGVyLnByaW1pdGl2ZXMgPSB7fTtcblxuICAgICAgICAvLyBzZXQgYmFja2dyb3VuZCBzcHJpdGVcbiAgICAgICAgcmVuZGVyLnNwcml0ZXNbJ2JnLTAnXSA9IGJnU3ByaXRlO1xuICAgICAgICBpZiAoYmdTcHJpdGUpXG4gICAgICAgICAgICBjb250YWluZXIuYWRkQ2hpbGRBdChiZ1Nwcml0ZSwgMCk7XG5cbiAgICAgICAgLy8gYWRkIHNwcml0ZSBiYXRjaCBiYWNrIGludG8gY29udGFpbmVyXG4gICAgICAgIHJlbmRlci5jb250YWluZXIuYWRkQ2hpbGQocmVuZGVyLnNwcml0ZUNvbnRhaW5lcik7XG5cbiAgICAgICAgLy8gcmVzZXQgYmFja2dyb3VuZCBzdGF0ZVxuICAgICAgICByZW5kZXIuY3VycmVudEJhY2tncm91bmQgPSBudWxsO1xuXG4gICAgICAgIC8vIHJlc2V0IGJvdW5kcyB0cmFuc2Zvcm1zXG4gICAgICAgIGNvbnRhaW5lci5zY2FsZS5zZXQoMSwgMSk7XG4gICAgICAgIGNvbnRhaW5lci5wb3NpdGlvbi5zZXQoMCwgMCk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGJhY2tncm91bmQgb2YgdGhlIGNhbnZhcyBcbiAgICAgKiBAbWV0aG9kIHNldEJhY2tncm91bmRcbiAgICAgKiBAcGFyYW0ge1JlbmRlclBpeGl9IHJlbmRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBiYWNrZ3JvdW5kXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLnNldEJhY2tncm91bmQgPSBmdW5jdGlvbihyZW5kZXIsIGJhY2tncm91bmQpIHtcbiAgICAgICAgaWYgKHJlbmRlci5jdXJyZW50QmFja2dyb3VuZCAhPT0gYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgdmFyIGlzQ29sb3IgPSBiYWNrZ3JvdW5kLmluZGV4T2YgJiYgYmFja2dyb3VuZC5pbmRleE9mKCcjJykgIT09IC0xLFxuICAgICAgICAgICAgICAgIGJnU3ByaXRlID0gcmVuZGVyLnNwcml0ZXNbJ2JnLTAnXTtcblxuICAgICAgICAgICAgaWYgKGlzQ29sb3IpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBzb2xpZCBiYWNrZ3JvdW5kIGNvbG9yXG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gQ29tbW9uLmNvbG9yVG9OdW1iZXIoYmFja2dyb3VuZCk7XG4gICAgICAgICAgICAgICAgcmVuZGVyLnJlbmRlcmVyLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGJhY2tncm91bmQgc3ByaXRlIGlmIGV4aXN0aW5nXG4gICAgICAgICAgICAgICAgaWYgKGJnU3ByaXRlKVxuICAgICAgICAgICAgICAgICAgICByZW5kZXIuY29udGFpbmVyLnJlbW92ZUNoaWxkKGJnU3ByaXRlKTsgXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGluaXRpYWxpc2UgYmFja2dyb3VuZCBzcHJpdGUgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgaWYgKCFiZ1Nwcml0ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dHVyZSA9IF9nZXRUZXh0dXJlKHJlbmRlciwgYmFja2dyb3VuZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgYmdTcHJpdGUgPSByZW5kZXIuc3ByaXRlc1snYmctMCddID0gbmV3IFBJWEkuU3ByaXRlKHRleHR1cmUpO1xuICAgICAgICAgICAgICAgICAgICBiZ1Nwcml0ZS5wb3NpdGlvbi54ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYmdTcHJpdGUucG9zaXRpb24ueSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHJlbmRlci5jb250YWluZXIuYWRkQ2hpbGRBdChiZ1Nwcml0ZSwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZW5kZXIuY3VycmVudEJhY2tncm91bmQgPSBiYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2NyaXB0aW9uXG4gICAgICogQG1ldGhvZCB3b3JsZFxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIFJlbmRlclBpeGkud29ybGQgPSBmdW5jdGlvbihyZW5kZXIpIHtcbiAgICAgICAgdmFyIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICB3b3JsZCA9IGVuZ2luZS53b3JsZCxcbiAgICAgICAgICAgIHJlbmRlcmVyID0gcmVuZGVyLnJlbmRlcmVyLFxuICAgICAgICAgICAgY29udGFpbmVyID0gcmVuZGVyLmNvbnRhaW5lcixcbiAgICAgICAgICAgIG9wdGlvbnMgPSByZW5kZXIub3B0aW9ucyxcbiAgICAgICAgICAgIGJvZGllcyA9IENvbXBvc2l0ZS5hbGxCb2RpZXMod29ybGQpLFxuICAgICAgICAgICAgYWxsQ29uc3RyYWludHMgPSBDb21wb3NpdGUuYWxsQ29uc3RyYWludHMod29ybGQpLFxuICAgICAgICAgICAgY29uc3RyYWludHMgPSBbXSxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMud2lyZWZyYW1lcykge1xuICAgICAgICAgICAgUmVuZGVyUGl4aS5zZXRCYWNrZ3JvdW5kKHJlbmRlciwgb3B0aW9ucy53aXJlZnJhbWVCYWNrZ3JvdW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFJlbmRlclBpeGkuc2V0QmFja2dyb3VuZChyZW5kZXIsIG9wdGlvbnMuYmFja2dyb3VuZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBoYW5kbGUgYm91bmRzXG4gICAgICAgIHZhciBib3VuZHNXaWR0aCA9IHJlbmRlci5ib3VuZHMubWF4LnggLSByZW5kZXIuYm91bmRzLm1pbi54LFxuICAgICAgICAgICAgYm91bmRzSGVpZ2h0ID0gcmVuZGVyLmJvdW5kcy5tYXgueSAtIHJlbmRlci5ib3VuZHMubWluLnksXG4gICAgICAgICAgICBib3VuZHNTY2FsZVggPSBib3VuZHNXaWR0aCAvIHJlbmRlci5vcHRpb25zLndpZHRoLFxuICAgICAgICAgICAgYm91bmRzU2NhbGVZID0gYm91bmRzSGVpZ2h0IC8gcmVuZGVyLm9wdGlvbnMuaGVpZ2h0O1xuXG4gICAgICAgIGlmIChvcHRpb25zLmhhc0JvdW5kcykge1xuICAgICAgICAgICAgLy8gSGlkZSBib2RpZXMgdGhhdCBhcmUgbm90IGluIHZpZXdcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYm9keSA9IGJvZGllc1tpXTtcbiAgICAgICAgICAgICAgICBib2R5LnJlbmRlci5zcHJpdGUudmlzaWJsZSA9IEJvdW5kcy5vdmVybGFwcyhib2R5LmJvdW5kcywgcmVuZGVyLmJvdW5kcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZpbHRlciBvdXQgY29uc3RyYWludHMgdGhhdCBhcmUgbm90IGluIHZpZXdcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBhbGxDb25zdHJhaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjb25zdHJhaW50ID0gYWxsQ29uc3RyYWludHNbaV0sXG4gICAgICAgICAgICAgICAgICAgIGJvZHlBID0gY29uc3RyYWludC5ib2R5QSxcbiAgICAgICAgICAgICAgICAgICAgYm9keUIgPSBjb25zdHJhaW50LmJvZHlCLFxuICAgICAgICAgICAgICAgICAgICBwb2ludEFXb3JsZCA9IGNvbnN0cmFpbnQucG9pbnRBLFxuICAgICAgICAgICAgICAgICAgICBwb2ludEJXb3JsZCA9IGNvbnN0cmFpbnQucG9pbnRCO1xuXG4gICAgICAgICAgICAgICAgaWYgKGJvZHlBKSBwb2ludEFXb3JsZCA9IFZlY3Rvci5hZGQoYm9keUEucG9zaXRpb24sIGNvbnN0cmFpbnQucG9pbnRBKTtcbiAgICAgICAgICAgICAgICBpZiAoYm9keUIpIHBvaW50QldvcmxkID0gVmVjdG9yLmFkZChib2R5Qi5wb3NpdGlvbiwgY29uc3RyYWludC5wb2ludEIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFwb2ludEFXb3JsZCB8fCAhcG9pbnRCV29ybGQpXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKEJvdW5kcy5jb250YWlucyhyZW5kZXIuYm91bmRzLCBwb2ludEFXb3JsZCkgfHwgQm91bmRzLmNvbnRhaW5zKHJlbmRlci5ib3VuZHMsIHBvaW50QldvcmxkKSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3RyYWludHMucHVzaChjb25zdHJhaW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdHJhbnNmb3JtIHRoZSB2aWV3XG4gICAgICAgICAgICBjb250YWluZXIuc2NhbGUuc2V0KDEgLyBib3VuZHNTY2FsZVgsIDEgLyBib3VuZHNTY2FsZVkpO1xuICAgICAgICAgICAgY29udGFpbmVyLnBvc2l0aW9uLnNldCgtcmVuZGVyLmJvdW5kcy5taW4ueCAqICgxIC8gYm91bmRzU2NhbGVYKSwgLXJlbmRlci5ib3VuZHMubWluLnkgKiAoMSAvIGJvdW5kc1NjYWxlWSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3RyYWludHMgPSBhbGxDb25zdHJhaW50cztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBib2RpZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBSZW5kZXJQaXhpLmJvZHkocmVuZGVyLCBib2RpZXNbaV0pO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb25zdHJhaW50cy5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIFJlbmRlclBpeGkuY29uc3RyYWludChyZW5kZXIsIGNvbnN0cmFpbnRzW2ldKTtcblxuICAgICAgICByZW5kZXJlci5yZW5kZXIoY29udGFpbmVyKTtcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBEZXNjcmlwdGlvblxuICAgICAqIEBtZXRob2QgY29uc3RyYWludFxuICAgICAqIEBwYXJhbSB7ZW5naW5lfSBlbmdpbmVcbiAgICAgKiBAcGFyYW0ge2NvbnN0cmFpbnR9IGNvbnN0cmFpbnRcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIFJlbmRlclBpeGkuY29uc3RyYWludCA9IGZ1bmN0aW9uKHJlbmRlciwgY29uc3RyYWludCkge1xuICAgICAgICB2YXIgZW5naW5lID0gcmVuZGVyLmVuZ2luZSxcbiAgICAgICAgICAgIGJvZHlBID0gY29uc3RyYWludC5ib2R5QSxcbiAgICAgICAgICAgIGJvZHlCID0gY29uc3RyYWludC5ib2R5QixcbiAgICAgICAgICAgIHBvaW50QSA9IGNvbnN0cmFpbnQucG9pbnRBLFxuICAgICAgICAgICAgcG9pbnRCID0gY29uc3RyYWludC5wb2ludEIsXG4gICAgICAgICAgICBjb250YWluZXIgPSByZW5kZXIuY29udGFpbmVyLFxuICAgICAgICAgICAgY29uc3RyYWludFJlbmRlciA9IGNvbnN0cmFpbnQucmVuZGVyLFxuICAgICAgICAgICAgcHJpbWl0aXZlSWQgPSAnYy0nICsgY29uc3RyYWludC5pZCxcbiAgICAgICAgICAgIHByaW1pdGl2ZSA9IHJlbmRlci5wcmltaXRpdmVzW3ByaW1pdGl2ZUlkXTtcblxuICAgICAgICAvLyBpbml0aWFsaXNlIGNvbnN0cmFpbnQgcHJpbWl0aXZlIGlmIG5vdCBleGlzdGluZ1xuICAgICAgICBpZiAoIXByaW1pdGl2ZSlcbiAgICAgICAgICAgIHByaW1pdGl2ZSA9IHJlbmRlci5wcmltaXRpdmVzW3ByaW1pdGl2ZUlkXSA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG5cbiAgICAgICAgLy8gZG9uJ3QgcmVuZGVyIGlmIGNvbnN0cmFpbnQgZG9lcyBub3QgaGF2ZSB0d28gZW5kIHBvaW50c1xuICAgICAgICBpZiAoIWNvbnN0cmFpbnRSZW5kZXIudmlzaWJsZSB8fCAhY29uc3RyYWludC5wb2ludEEgfHwgIWNvbnN0cmFpbnQucG9pbnRCKSB7XG4gICAgICAgICAgICBwcmltaXRpdmUuY2xlYXIoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGFkZCB0byBzY2VuZSBncmFwaCBpZiBub3QgYWxyZWFkeSB0aGVyZVxuICAgICAgICBpZiAoQ29tbW9uLmluZGV4T2YoY29udGFpbmVyLmNoaWxkcmVuLCBwcmltaXRpdmUpID09PSAtMSlcbiAgICAgICAgICAgIGNvbnRhaW5lci5hZGRDaGlsZChwcmltaXRpdmUpO1xuXG4gICAgICAgIC8vIHJlbmRlciB0aGUgY29uc3RyYWludCBvbiBldmVyeSB1cGRhdGUsIHNpbmNlIHRoZXkgY2FuIGNoYW5nZSBkeW5hbWljYWxseVxuICAgICAgICBwcmltaXRpdmUuY2xlYXIoKTtcbiAgICAgICAgcHJpbWl0aXZlLmJlZ2luRmlsbCgwLCAwKTtcbiAgICAgICAgcHJpbWl0aXZlLmxpbmVTdHlsZShjb25zdHJhaW50UmVuZGVyLmxpbmVXaWR0aCwgQ29tbW9uLmNvbG9yVG9OdW1iZXIoY29uc3RyYWludFJlbmRlci5zdHJva2VTdHlsZSksIDEpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGJvZHlBKSB7XG4gICAgICAgICAgICBwcmltaXRpdmUubW92ZVRvKGJvZHlBLnBvc2l0aW9uLnggKyBwb2ludEEueCwgYm9keUEucG9zaXRpb24ueSArIHBvaW50QS55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByaW1pdGl2ZS5tb3ZlVG8ocG9pbnRBLngsIHBvaW50QS55KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChib2R5Qikge1xuICAgICAgICAgICAgcHJpbWl0aXZlLmxpbmVUbyhib2R5Qi5wb3NpdGlvbi54ICsgcG9pbnRCLngsIGJvZHlCLnBvc2l0aW9uLnkgKyBwb2ludEIueSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcmltaXRpdmUubGluZVRvKHBvaW50Qi54LCBwb2ludEIueSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmltaXRpdmUuZW5kRmlsbCgpO1xuICAgIH07XG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzY3JpcHRpb25cbiAgICAgKiBAbWV0aG9kIGJvZHlcbiAgICAgKiBAcGFyYW0ge2VuZ2luZX0gZW5naW5lXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICBSZW5kZXJQaXhpLmJvZHkgPSBmdW5jdGlvbihyZW5kZXIsIGJvZHkpIHtcbiAgICAgICAgdmFyIGVuZ2luZSA9IHJlbmRlci5lbmdpbmUsXG4gICAgICAgICAgICBib2R5UmVuZGVyID0gYm9keS5yZW5kZXI7XG5cbiAgICAgICAgaWYgKCFib2R5UmVuZGVyLnZpc2libGUpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgaWYgKGJvZHlSZW5kZXIuc3ByaXRlICYmIGJvZHlSZW5kZXIuc3ByaXRlLnRleHR1cmUpIHtcbiAgICAgICAgICAgIHZhciBzcHJpdGVJZCA9ICdiLScgKyBib2R5LmlkLFxuICAgICAgICAgICAgICAgIHNwcml0ZSA9IHJlbmRlci5zcHJpdGVzW3Nwcml0ZUlkXSxcbiAgICAgICAgICAgICAgICBzcHJpdGVDb250YWluZXIgPSByZW5kZXIuc3ByaXRlQ29udGFpbmVyO1xuXG4gICAgICAgICAgICAvLyBpbml0aWFsaXNlIGJvZHkgc3ByaXRlIGlmIG5vdCBleGlzdGluZ1xuICAgICAgICAgICAgaWYgKCFzcHJpdGUpXG4gICAgICAgICAgICAgICAgc3ByaXRlID0gcmVuZGVyLnNwcml0ZXNbc3ByaXRlSWRdID0gX2NyZWF0ZUJvZHlTcHJpdGUocmVuZGVyLCBib2R5KTtcblxuICAgICAgICAgICAgLy8gYWRkIHRvIHNjZW5lIGdyYXBoIGlmIG5vdCBhbHJlYWR5IHRoZXJlXG4gICAgICAgICAgICBpZiAoQ29tbW9uLmluZGV4T2Yoc3ByaXRlQ29udGFpbmVyLmNoaWxkcmVuLCBzcHJpdGUpID09PSAtMSlcbiAgICAgICAgICAgICAgICBzcHJpdGVDb250YWluZXIuYWRkQ2hpbGQoc3ByaXRlKTtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIGJvZHkgc3ByaXRlXG4gICAgICAgICAgICBzcHJpdGUucG9zaXRpb24ueCA9IGJvZHkucG9zaXRpb24ueDtcbiAgICAgICAgICAgIHNwcml0ZS5wb3NpdGlvbi55ID0gYm9keS5wb3NpdGlvbi55O1xuICAgICAgICAgICAgc3ByaXRlLnJvdGF0aW9uID0gYm9keS5hbmdsZTtcbiAgICAgICAgICAgIHNwcml0ZS5zY2FsZS54ID0gYm9keVJlbmRlci5zcHJpdGUueFNjYWxlIHx8IDE7XG4gICAgICAgICAgICBzcHJpdGUuc2NhbGUueSA9IGJvZHlSZW5kZXIuc3ByaXRlLnlTY2FsZSB8fCAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHByaW1pdGl2ZUlkID0gJ2ItJyArIGJvZHkuaWQsXG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlID0gcmVuZGVyLnByaW1pdGl2ZXNbcHJpbWl0aXZlSWRdLFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IHJlbmRlci5jb250YWluZXI7XG5cbiAgICAgICAgICAgIC8vIGluaXRpYWxpc2UgYm9keSBwcmltaXRpdmUgaWYgbm90IGV4aXN0aW5nXG4gICAgICAgICAgICBpZiAoIXByaW1pdGl2ZSkge1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZSA9IHJlbmRlci5wcmltaXRpdmVzW3ByaW1pdGl2ZUlkXSA9IF9jcmVhdGVCb2R5UHJpbWl0aXZlKHJlbmRlciwgYm9keSk7XG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlLmluaXRpYWxBbmdsZSA9IGJvZHkuYW5nbGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFkZCB0byBzY2VuZSBncmFwaCBpZiBub3QgYWxyZWFkeSB0aGVyZVxuICAgICAgICAgICAgaWYgKENvbW1vbi5pbmRleE9mKGNvbnRhaW5lci5jaGlsZHJlbiwgcHJpbWl0aXZlKSA9PT0gLTEpXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFkZENoaWxkKHByaW1pdGl2ZSk7XG5cbiAgICAgICAgICAgIC8vIHVwZGF0ZSBib2R5IHByaW1pdGl2ZVxuICAgICAgICAgICAgcHJpbWl0aXZlLnBvc2l0aW9uLnggPSBib2R5LnBvc2l0aW9uLng7XG4gICAgICAgICAgICBwcmltaXRpdmUucG9zaXRpb24ueSA9IGJvZHkucG9zaXRpb24ueTtcbiAgICAgICAgICAgIHByaW1pdGl2ZS5yb3RhdGlvbiA9IGJvZHkuYW5nbGUgLSBwcmltaXRpdmUuaW5pdGlhbEFuZ2xlO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBib2R5IHNwcml0ZVxuICAgICAqIEBtZXRob2QgX2NyZWF0ZUJvZHlTcHJpdGVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7UmVuZGVyUGl4aX0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHJldHVybiB7UElYSS5TcHJpdGV9IHNwcml0ZVxuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgdmFyIF9jcmVhdGVCb2R5U3ByaXRlID0gZnVuY3Rpb24ocmVuZGVyLCBib2R5KSB7XG4gICAgICAgIHZhciBib2R5UmVuZGVyID0gYm9keS5yZW5kZXIsXG4gICAgICAgICAgICB0ZXh0dXJlUGF0aCA9IGJvZHlSZW5kZXIuc3ByaXRlLnRleHR1cmUsXG4gICAgICAgICAgICB0ZXh0dXJlID0gX2dldFRleHR1cmUocmVuZGVyLCB0ZXh0dXJlUGF0aCksXG4gICAgICAgICAgICBzcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZSk7XG5cbiAgICAgICAgc3ByaXRlLmFuY2hvci54ID0gYm9keS5yZW5kZXIuc3ByaXRlLnhPZmZzZXQ7XG4gICAgICAgIHNwcml0ZS5hbmNob3IueSA9IGJvZHkucmVuZGVyLnNwcml0ZS55T2Zmc2V0O1xuXG4gICAgICAgIHJldHVybiBzcHJpdGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBib2R5IHByaW1pdGl2ZVxuICAgICAqIEBtZXRob2QgX2NyZWF0ZUJvZHlQcmltaXRpdmVcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwYXJhbSB7UmVuZGVyUGl4aX0gcmVuZGVyXG4gICAgICogQHBhcmFtIHtib2R5fSBib2R5XG4gICAgICogQHJldHVybiB7UElYSS5HcmFwaGljc30gZ3JhcGhpY3NcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIHZhciBfY3JlYXRlQm9keVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHJlbmRlciwgYm9keSkge1xuICAgICAgICB2YXIgYm9keVJlbmRlciA9IGJvZHkucmVuZGVyLFxuICAgICAgICAgICAgb3B0aW9ucyA9IHJlbmRlci5vcHRpb25zLFxuICAgICAgICAgICAgcHJpbWl0aXZlID0gbmV3IFBJWEkuR3JhcGhpY3MoKSxcbiAgICAgICAgICAgIGZpbGxTdHlsZSA9IENvbW1vbi5jb2xvclRvTnVtYmVyKGJvZHlSZW5kZXIuZmlsbFN0eWxlKSxcbiAgICAgICAgICAgIHN0cm9rZVN0eWxlID0gQ29tbW9uLmNvbG9yVG9OdW1iZXIoYm9keVJlbmRlci5zdHJva2VTdHlsZSksXG4gICAgICAgICAgICBzdHJva2VTdHlsZUluZGljYXRvciA9IENvbW1vbi5jb2xvclRvTnVtYmVyKGJvZHlSZW5kZXIuc3Ryb2tlU3R5bGUpLFxuICAgICAgICAgICAgc3Ryb2tlU3R5bGVXaXJlZnJhbWUgPSBDb21tb24uY29sb3JUb051bWJlcignI2JiYicpLFxuICAgICAgICAgICAgc3Ryb2tlU3R5bGVXaXJlZnJhbWVJbmRpY2F0b3IgPSBDb21tb24uY29sb3JUb051bWJlcignI0NENUM1QycpLFxuICAgICAgICAgICAgcGFydDtcblxuICAgICAgICBwcmltaXRpdmUuY2xlYXIoKTtcblxuICAgICAgICAvLyBoYW5kbGUgY29tcG91bmQgcGFydHNcbiAgICAgICAgZm9yICh2YXIgayA9IGJvZHkucGFydHMubGVuZ3RoID4gMSA/IDEgOiAwOyBrIDwgYm9keS5wYXJ0cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgICAgcGFydCA9IGJvZHkucGFydHNba107XG5cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlLmJlZ2luRmlsbChmaWxsU3R5bGUsIDEpO1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lU3R5bGUoYm9keVJlbmRlci5saW5lV2lkdGgsIHN0cm9rZVN0eWxlLCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlLmJlZ2luRmlsbCgwLCAwKTtcbiAgICAgICAgICAgICAgICBwcmltaXRpdmUubGluZVN0eWxlKDEsIHN0cm9rZVN0eWxlV2lyZWZyYW1lLCAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJpbWl0aXZlLm1vdmVUbyhwYXJ0LnZlcnRpY2VzWzBdLnggLSBib2R5LnBvc2l0aW9uLngsIHBhcnQudmVydGljZXNbMF0ueSAtIGJvZHkucG9zaXRpb24ueSk7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSAxOyBqIDwgcGFydC52ZXJ0aWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lVG8ocGFydC52ZXJ0aWNlc1tqXS54IC0gYm9keS5wb3NpdGlvbi54LCBwYXJ0LnZlcnRpY2VzW2pdLnkgLSBib2R5LnBvc2l0aW9uLnkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmltaXRpdmUubGluZVRvKHBhcnQudmVydGljZXNbMF0ueCAtIGJvZHkucG9zaXRpb24ueCwgcGFydC52ZXJ0aWNlc1swXS55IC0gYm9keS5wb3NpdGlvbi55KTtcblxuICAgICAgICAgICAgcHJpbWl0aXZlLmVuZEZpbGwoKTtcblxuICAgICAgICAgICAgLy8gYW5nbGUgaW5kaWNhdG9yXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5zaG93QW5nbGVJbmRpY2F0b3IgfHwgb3B0aW9ucy5zaG93QXhlcykge1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5iZWdpbkZpbGwoMCwgMCk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy53aXJlZnJhbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lU3R5bGUoMSwgc3Ryb2tlU3R5bGVXaXJlZnJhbWVJbmRpY2F0b3IsIDEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lU3R5bGUoMSwgc3Ryb2tlU3R5bGVJbmRpY2F0b3IpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5tb3ZlVG8ocGFydC5wb3NpdGlvbi54IC0gYm9keS5wb3NpdGlvbi54LCBwYXJ0LnBvc2l0aW9uLnkgLSBib2R5LnBvc2l0aW9uLnkpO1xuICAgICAgICAgICAgICAgIHByaW1pdGl2ZS5saW5lVG8oKChwYXJ0LnZlcnRpY2VzWzBdLnggKyBwYXJ0LnZlcnRpY2VzW3BhcnQudmVydGljZXMubGVuZ3RoLTFdLngpIC8gMiAtIGJvZHkucG9zaXRpb24ueCksIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKChwYXJ0LnZlcnRpY2VzWzBdLnkgKyBwYXJ0LnZlcnRpY2VzW3BhcnQudmVydGljZXMubGVuZ3RoLTFdLnkpIC8gMiAtIGJvZHkucG9zaXRpb24ueSkpO1xuXG4gICAgICAgICAgICAgICAgcHJpbWl0aXZlLmVuZEZpbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcmltaXRpdmU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIHJlcXVlc3RlZCB0ZXh0dXJlIChhIFBJWEkuVGV4dHVyZSkgdmlhIGl0cyBwYXRoXG4gICAgICogQG1ldGhvZCBfZ2V0VGV4dHVyZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtSZW5kZXJQaXhpfSByZW5kZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW1hZ2VQYXRoXG4gICAgICogQHJldHVybiB7UElYSS5UZXh0dXJlfSB0ZXh0dXJlXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICB2YXIgX2dldFRleHR1cmUgPSBmdW5jdGlvbihyZW5kZXIsIGltYWdlUGF0aCkge1xuICAgICAgICB2YXIgdGV4dHVyZSA9IHJlbmRlci50ZXh0dXJlc1tpbWFnZVBhdGhdO1xuXG4gICAgICAgIGlmICghdGV4dHVyZSlcbiAgICAgICAgICAgIHRleHR1cmUgPSByZW5kZXIudGV4dHVyZXNbaW1hZ2VQYXRoXSA9IFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoaW1hZ2VQYXRoKTtcblxuICAgICAgICByZXR1cm4gdGV4dHVyZTtcbiAgICB9O1xuXG59KSgpO1xuIl19
