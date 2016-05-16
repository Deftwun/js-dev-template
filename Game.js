
// https://www.npmjs.com/package/gameloop
var Game = require("gameloop");
// http://brm.io/matter-js
var Matter = require("matter-js");

var game = new Game({
  fps:15
});

game.physics = Matter.Engine.create();
game.physics.world.gravity = {x:0,y:.5};

game.renderer = Matter.Render.create({
    element: document.body,
    engine: game.physics,
    options: {
      width:800,
      height:600
    }
});

game.on('start', function () {
  var world = game.physics.world,
      ball = Matter.Bodies.circle(400,300,30,{restitution:.5}),
      floor = Matter.Bodies.rectangle(400,600,800,50,{isStatic:true});
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
});

game.on('draw', function (renderer, dt) {
  Matter.Render.world(this.renderer);
});

module.exports = game;
