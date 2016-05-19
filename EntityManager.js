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
