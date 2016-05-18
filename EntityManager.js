//Entity
var Entity = function(options){
  this.deleted = false;
  this.body = null;

  //assign body to this entity
  this.setBody = function(body){
    body.entity = this;
    this.body = body;
  }

  //Override these methods with your own logic
  this.update = function(dt){
    //
  };
  this.collideStart = function(entity){
    //
  };
  this.collideEnd = function(entity){
    //
  }
  this.collideActive = function(entity){
    //
  }

}

function entityFromBody(body,entities){
  return entities.find(function(ent){
    return ent.id === body.label;
  });
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
  createEntity : function(options){
    var e = new Entity(options);
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
      Matter.World.remove(world,this.deletedEntities[i].bodies);
      var x = this.entities.indexOf(this.deletedEntities[i]);
      this.entities.splice(x,1);
    }
  }
}
