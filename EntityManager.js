var uniqueID = 0;

//ENtity
var Entity = function(options){
  var options = options || {

  };

  this.deleted = false;
  this.id = uniqueID++;
  this.bodies = [];
}

var Manager = {
  entities : [],
  deletedEntities : []
};

Manager.prototype = {
  createEntity : function(options){
    this.entities.push(new Entity(options));
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
