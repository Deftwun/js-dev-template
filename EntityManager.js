var uniqueID = 0;

var Entity = function(options){
  this.id = uniqueID++;
  this.health = 1;
  this.bodies = [];
}


var Manager = {
  entities : [],
  removedEntities : []
};

Manager.prototype = {
  createEntity : function(options){
    this.entities.push(new Entity());
  },

  update: function(dt){
    for (var i=0; i < this.entities.size; i++){
      this.entities[i].update(dt);
    }

    for (var i=0; i < this.removedEntities.size; i++){
      Matter.World.remove(world,this.removedEntities[i].bodies);
      this.entities.splice(i,1);
    }
  }
}
