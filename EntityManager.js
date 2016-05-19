var Matter = require("matter-js");

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
  cfg = cfg || {
    name : "unknown",
    physics: {
      shape:{
        type:"circle",
        radius:5
      }
    }
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
    var e = new Entity(cfg);
    this.entities.push(e);
    return e;
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
