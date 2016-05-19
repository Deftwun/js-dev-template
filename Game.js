
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
  console.log(ball);
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
