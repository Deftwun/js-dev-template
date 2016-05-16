
// https://www.npmjs.com/package/gameloop
var Game = require("gameloop");
// http://brm.io/matter-js
var Matter = require("matter-js");

var game = new Game({
  fps:15
});

game.physics = Matter.Engine.create();

//Debug Renderer
var render = Matter.Render.create({
    element: document.getElementById("canvas"),
    engine: game.physics,
    options: {
        width: 800,
        height: 600,
        pixelRatio: 1,
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
});

game.on('start', function () {

});

game.on('end', function (state) {

});

game.on('resume', function () {

});

game.on('pause', function () {

});

game.on('update', function(dt){
  Matter.Engine.update(this.physics,1000/this.fps);
  //console.log(this.options);
});

game.on('draw', function (renderer, dt) {
  Matter.Render.world(render);
  console.log('ok');
  
});

module.exports = game;
