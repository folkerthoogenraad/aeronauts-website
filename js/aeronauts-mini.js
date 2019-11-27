
function angleLerp(from, to, f){
   var dist = to - from;

   if(dist > 180){
      dist = -(360 - dist);
   }
   if(dist < -180){
      dist = (360 + dist);
   }

   var n =  from + dist * f;

   if(n > 360) n -= 360;
   if(n < 0) n += 360;

   return n;
}

class GameObject{
   /**
    * @param {Game} game 
    */
   constructor(game){
      this.game = game;
   }

   /** @param { number } delta */
   update(delta){}
   /** @param { CanvasRenderingContext2D } context */
   draw(context) {}
}

class Bullet extends GameObject{
   constructor(game){
      super(game);

      this.x = 0;
      this.y = 0;
      this.velocityX = 1;
      this.velocityY = 0;
      
      this.image = new Image();
      this.image.src = "./img/bulletSprite.png";
   }
   
   /** @param { number } delta */
   update(delta){
      // Apply velocity
      this.x += this.velocityX * delta;
      this.y += this.velocityY * delta;

      // Outside of view
      let border = 32;

      if(this.x < -border || this.x > this.game.width + border || this.game.y < -border || this.y > this.game.height + border){
         this.game.removeGameObject(this);
      }

      // Collision detection
      for(var i = 0; i < this.game.destructableElements.length; i++){
         let element = this.game.destructableElements[i];

         if(!element.hasAttribute("data-destroyable")){
            continue;
         }

         let x = this.game.scale * this.x;
         let y = this.game.scale * this.y;

         let bbox = element.getBoundingClientRect();

         if(x > bbox.left && x < bbox.right && y > bbox.top && y < bbox.bottom){
            destroyElement(element);
            this.game.removeGameObject(this);
            break;
         }
      }
   }

   /** @param { CanvasRenderingContext2D } context */
   draw(context) {
      let angle = Math.atan2(this.velocityY, this.velocityX);

      let offsetX = 8;
      let offsetY = 1;

      let imghackscale = 3;

      context.save();
      context.translate(this.x, this.y);
      context.rotate(angle);

      context.drawImage(this.image, 0, 0, 16 * imghackscale, 2 * imghackscale, -offsetX, -offsetY, 16, 2);

      context.restore();
   }
}

class Player extends GameObject{
   constructor(game){
      super(game);

      this.x = 0; 
      this.y = 0;
      this.previousX = 0;
      this.previousY = 0;

      this.velocityX = 0;
      this.velocityY = 0;

      this.angle = 0;
      this.angleLerpSpeed = 0.2 * 60;

      this.gravity = 0.05 * 60 * 60;
      this.acceleration = 0.2 * 60 * 60;

      this.shootTimeout = 0;
      
      this.friction = 0.005;

      this.inputAngle = 0;
      this.inputAcceleration = 0;
      this.inputFire = false;

      this.image = new Image();
      this.image.src = "./img/playerSprite.png";
      
      this.active = false;
   }

   updateInput(){
      /** @type {Gamepad[]} */
      var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);

      if(gamepads.length === 0){
         return;
      }
   
      var gp = gamepads[0];

      if(gp == null || !gp.connected)
         return;

      // Read the x and y axis
      let axisX = gp.axes[0];
      let axisY = gp.axes[1];

      // Read the trigger axis
      let accel = gp.buttons[7].value;

      this.inputAcceleration = accel;
      this.inputAngle = Math.atan2(axisY, axisX) / Math.PI * 180;

      if(accel !== 0){
         this.active = true;
      }

      this.inputFire = gp.buttons[0].pressed;
   }

   /**
    * @param {number} delta Elapsed time since previous update in seconds
    */
   update(delta){
      this.updateInput();
      
      this.previousX = this.x;
      this.previousY = this.y;

      if(!this.active) {
         this.angle = 270;

         this.x = 24;
         this.y = this.game.height - 24;
         
         this.velocityX = 0;
         this.velocityY = 0;

         return;
      }

      // Apply gravity
      this.velocityY += this.gravity * delta;

      // Apply input
      this.angle = angleLerp(this.angle, this.inputAngle, this.angleLerpSpeed * delta);

      // Apply acceleration
      {
         let acceleration = this.inputAcceleration * this.acceleration;

         let dirX = Math.cos(this.angle * Math.PI / 180);
         let dirY = Math.sin(this.angle * Math.PI / 180);
   
         this.velocityX += dirX * acceleration * delta;
         this.velocityY += dirY * acceleration * delta;
      }

      // Apply friction
      {
         let speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);

         if(speed != 0){
            let dirX = this.velocityX / speed;
            let dirY = this.velocityY / speed;

            let amount = this.friction * speed * speed * delta; // Not sure if correct needs testing

            this.velocityX -= dirX * amount;
            this.velocityY -= dirY * amount;
         }
      }

      // Apply velocity
      this.x += this.velocityX * delta;
      this.y += this.velocityY * delta;

      // Shooting
      this.shootTimeout -= delta;
      if(this.inputFire && this.shootTimeout <= 0){
         this.shootTimeout = 0.2;

         let radAngle = Math.PI * this.angle / 180;

         let bullet = new Bullet(this.game);
         bullet.x = this.x;
         bullet.y = this.y;
         bullet.velocityX = Math.cos(radAngle) * 10 * 60;
         bullet.velocityY = Math.sin(radAngle) * 10 * 60;

         this.game.addGameObject(bullet);
      }

      let border = 32;

      if(this.x < -border || this.x > this.game.width + border || this.game.y < -border || this.y > this.game.height + border){
         this.active = false;
         console.log("outside of borders, resetting");
      }
   }

   /**
    * @param { CanvasRenderingContext2D } context
    */
   draw(context){
      let offsetX = 11;
      let offsetY = 8;

      let imghackscale = 3;

      context.save();
      context.translate(this.x, this.y);
      context.rotate(this.angle * Math.PI / 180);

      context.drawImage(this.image, 0, 0, 16 * imghackscale, 16 * imghackscale, -offsetX, -offsetY, 16, 16);

      context.restore();
   }
}

class Timer{
   constructor(){
      this.previousTime = 0;
   }

   start(){
      this.previousTime = this._now();
      
   }

   /**
    * @returns {number} Time in seconds since last update
    */
   delta(){
      let time = this._now();

      // Delta time in milliseconds
      let delta = time - this.previousTime;

      this.previousTime = time;

      // Return the time in seconds
      return delta / 1000;
   }

   _now(){
      if(window.performance.now !== undefined) return window.performance.now();
      return Date.now();
   }
}

class Game{
   /**
    * @param {HTMLCanvasElement} canvas 
    */
   constructor(canvas){
      this.canvas = canvas;
      this.context = canvas.getContext('2d');

      this.context.imageSmoothingEnabled = false;

      this.scale = 3;

      this.width = 100;
      this.height = 100;

      /** @type {GameObject[]} */
      this.gameObjects = [];

      this.player = new Player(this);

      this.addGameObject(this.player);

      this.timer = new Timer();

      this.destructableElements = document.querySelectorAll("[data-destroyable]");
   }

   init(){
      this.timer.start();

      this._requestLoop();
   }

   /**
    * @param {number} delta 
    */
   _loop(){
      this._requestLoop();

      let delta = this.timer.delta();

      this.update(delta);
      this.draw();
   }
   _requestLoop(){
      window.requestAnimationFrame(this._loop.bind(this));
   }

   /**
    * @param {number} width 
    * @param {number} height 
    */
   resize(width, height){
      this.canvas.width = width;
      this.canvas.height = height;
      this.width = width / this.scale;
      this.height = height / this.scale;

      this.canvas.style.width = width + "px";
      this.canvas.style.height = height + "px";

      //this.context.resetTransform();
      this.context.setTransform(1, 0, 0, 1, 0, 0);
      this.context.scale(this.scale, this.scale);
   }

   /**
    * @param {number} delta 
    */
   update(delta){
      this.onUpdate();
      this.gameObjects.forEach(object => {
         object.update(delta);
      });
   }

   onUpdate(){
      // Overwritable
   }

   /**
    * @param {GameObject} obj
    */
   addGameObject(obj){
      this.gameObjects.push(obj);
   }

   /**
    * @param {GameObject} obj 
    */
   removeGameObject(obj){
      this.gameObjects.splice(
         this.gameObjects.indexOf(obj),
         1
      )
   }

   draw(){
      this.context.clearRect(0, 0, this.width, this.height);

      this.gameObjects.forEach(object => {
         object.draw(this.context);
      });

      // Clear a small rectangle around the player
      //this.context.clearRect(this.player.previousX - 16, this.player.previousY - 16, 32, 32)

      //this.player.draw(this.context);
   }
}

/**
 * @param {HTMLElement} element 
 */
function destroyElement(element){
   // Make sure it can't be destroyed again
   element.removeAttribute("data-destroyable");

   let timer = new Timer();

   let y = 0;
   let vy = -Math.random() * 600;
   
   let rotationSpeed = (Math.random() * 2 - 1) * 60;
   let rotation = 0;

   let gravity = 0.25 * 60 * 60;

   let opacity = 10;
   let fade = 0.1 * 60;

   timer.start();

   let callback = ()=>{
      let delta = timer.delta();

      rotation += rotationSpeed * delta;

      vy += gravity * delta;
      y += vy * delta;

      opacity -= fade * delta;

      if(opacity < 1){
         element.style.opacity = opacity;
      }

      element.style.transform = `translateY(${y}px) rotateZ(${rotation}deg)`;

      if(opacity > 0){
         requestAnimationFrame(callback);
      }
      else{
         element.style.visibility = "hidden";
      }
   };

   requestAnimationFrame(callback);
}

function subdivideDestruction(){
   /** @type {HTMLElement[]} */
   let elements = document.querySelectorAll("[data-destroyable-subdivision]");
   
   elements.forEach(element => {
      let text = element.innerText;
      element.innerText = "";

      for(var i = 0; i < text.length; i++){
         let sp = document.createElement("span");
         sp.innerText = text.charAt(i);

         sp.setAttribute("data-destroyable", "");

         element.appendChild(sp);
      }
   });
}

function enableDebugDestruction(){
   let elements = document.querySelectorAll("[data-destroyable]");

   elements.forEach(element => {
      element.addEventListener("click", (event)=>{
         /** @type {HTMLElement} */
         let e = event.target;
         if(e.hasAttribute("data-destroyable")){
            destroyElement(e);
         }
      });
   });
}

function main(){
   subdivideDestruction();
   //enableDebugDestruction();

   /** @type { HTMLCanvasElement } */
   let canvas = document.getElementById("aeronauts");

   // Create the game 
   let game = new Game(canvas);

   // Set the default game size
   game.resize(window.innerWidth, window.innerHeight);

   // Respond to the resize events
   window.addEventListener("resize", (event)=>{
      game.resize(window.innerWidth, window.innerHeight);
   });

   game.init();

   let dim = document.getElementById("dim");

   game.onUpdate = ()=>{
      if(game.player.active){
         dim.classList.add("active");
      }
      else{
         dim.classList.remove("active");
      }
   };
}


document.addEventListener("DOMContentLoaded", main);