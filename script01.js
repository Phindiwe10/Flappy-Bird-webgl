document.addEventListener("DOMContentLoaded",()=>{
const canvas = document.getElementById("gamecanvas");
const scoreSound = document.getElementById("scoreSound");
const hitSound = document.getElementById("hitSound");
document.getElementById("restartBtn").addEventListener("click", resetGame);

if (!canvas){
    console.error("canvas not found!");
    return;
}
const gl = canvas.getContext("webgl");
if (!gl){
    alert("webgl not supported in your browser");
    throw new Error("webgl not supported");
    return;
}
const bgColorPicker = document.getElementById("bgColorPicker");
bgColorPicker.addEventListener("input", (e) => {
  const hex = e.target.value;
  const rgb = hexToRGB(hex);
  gl.clearColor(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1.0);
});
function hexToRGB(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}
let pipeColor = [0.0, 1.0, 0.0]; // default green

const pipeColorPicker = document.getElementById("pipeColorPicker");
pipeColorPicker.addEventListener("input", (e) => {
  const rgb = hexToRGB(e.target.value);
  pipeColor = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
});
function hexToRGB(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

let gamePaused = true;
let countdownActive = false;

const countdownEl = document.getElementById("countdown");
const readyButton = document.getElementById("readyButton");

readyButton.addEventListener("click", () => {
  readyButton.classList.add("hidden"); // hide button
  startCountdown();
});

function startCountdown() {
  const messages = ["Ready", "3", "2", "1", "Go!"];
  let index = 0;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = messages[index];

  const interval = setInterval(() => {
    index++;
    if (index < messages.length) {
      countdownEl.textContent = messages[index];
    } else {
      clearInterval(interval);
      countdownEl.classList.add("hidden");
      gamePaused = false; // Game starts now
    }
  }, 1000);
}


// Set up background music
const bgMusic = document.getElementById("bgMusic");
document.addEventListener("keydown", () => {
  if (bgMusic.paused) {
    bgMusic.volume = 0.5; //  volume setting
    bgMusic.play();
  }
}, { once: true });

const muteBtn = document.getElementById("muteBtn");
const unmuteBtn = document.getElementById("unmuteBtn");

muteBtn.addEventListener("click", () => {
  bgMusic.muted = true;
});

unmuteBtn.addEventListener("click", () => {
  bgMusic.muted = false;
});
/*const volumeSlider = document.getElementById("volumeSlider");

/*volumeSlider.addEventListener("input", () => {
  bgMusic.volume = volumeSlider.value;
});*/
const helpButton = document.getElementById("helpButton");
const helpPanel = document.getElementById("helpPanel");
const closeHelp = document.getElementById("closeHelp");

helpButton.addEventListener("click", () => {
  helpPanel.classList.remove("hidden");
});

closeHelp.addEventListener("click", () => {
  helpPanel.classList.add("hidden");
});

function resizeCanvas(){
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

canvas.width =screenWidth;
canvas.height= screenHeight;

gl.viewport(0,0 ,canvas.width,canvas.height );
gl.clearColor(1, 0, 0, 0); 

}
resizeCanvas();
window.addEventListener("resize",resizeCanvas);

function createPerspectiveMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const rangeInv = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ]);
}

function createLookAtMatrix(eye, target, up ){
  const zAxis = normalize(subtractVectors(eye,target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return new Float32Array([
    xAxis[0], xAxis[1], xAxis[2],0,
     yAxis[0], yAxis[1], yAxis[2],0,
    zAxis[0], zAxis[1], zAxis[2],0,
    -dot(xAxis, eye), -dot(yAxis, eye),-dot(zAxis, eye),1
  ]);
}

function subtractVectors(a, b){
  return[a[0]-b[0], a[1]-b[1],a[2]-b[2]];
}
function normalize(v){
  const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
  return [v[0]/len, v[1]/len, v[2]/len];
}
function cross(a, b){
  return[
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}
function dot(a, b){
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function createTranslationMatrix(tx, ty, tz){
  return new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    tx,ty,tz,1
  ]);
}
let currentScore = 0;
let highScore = 0;
let isGameOver = false;

function compileShader(gl, source, type){
    const shader= gl.createShader(type);
gl.shaderSource(shader,source);
gl.compileShader(shader);
return shader;
}
const vssource =`
attribute vec3 a_position;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
void main(){
gl_Position =  u_projection* u_view* u_model*vec4(a_position,1.0);
}
`;
const fssource =`
precision mediump float;
uniform vec3 u_color;
uniform vec3 u_lightDirection;

void main(){
float ambient = 0.3;
float diffuse = max(dot(normalize(u_lightDirection),vec3(0.0,0.0,-1.0)),0.0);
gl_FragColor =vec4( u_color*(ambient+ diffuse),1.0);
}`;

const vertexShader = compileShader(gl, vssource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(gl, fssource, gl.FRAGMENT_SHADER);

//  Create and link the shader program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

//  Check for errors
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program linking error:", gl.getProgramInfoLog(program));
}

//  Use the program
gl.useProgram(program);

const birdVertices = new Float32Array([
    -0.1,-0.1,0.1,
    0.1,-0.1,0.1,
    -0.1, 0.1,0.1,
    0.1, 0.1,0.1,
    //back face 
    -0.1, -0.1,-0.1,
    0.1, -0.1,-0.1, 
    -0.1, 0.1,-0.1,
    0.1, 0.1,-0.1
]);

const birdBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffer);
gl.bufferData(gl.ARRAY_BUFFER, birdVertices, gl.STATIC_DRAW);

const birdIndices = new Uint16Array([
    0,1,2,2,1,3,
    4,5,6,6,5,7,
    0,4,2,2,4,6,
    1,5,3,3,5,7,
    2,3,6,6,3,7,
    0,1,4,4,1,5
]);
const birdIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, birdIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, birdIndices, gl.STATIC_DRAW);

const pipeIndices = new Uint16Array([
    0,1,2,2,1,3,
    4,5,6,6,5,7,
    0,4,2,2,4,6,
    1,5,3,3,5,7,
    2,3,6,6,3,7,
    0,1,4,4,1,5,

    8,9,10,10,9,11,
    12,13,14,14,13,15,
    8,12, 10,10,12,14,
    9,13,11,11,13,15,
    10,11,14,14,11,15,
    8,9,12,12,9,13
]);

const pipeIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pipeIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, pipeIndices, gl.STATIC_DRAW);

function createPipeVertices(x, gapHalfHeight) {
  const pipeWidth = 0.2;
  const pipeDepth = 0.2;

  const topY = 1.0;
  const bottomY = -1.0;
  const gapTop = gapHalfHeight;
  const gapBottom = -gapHalfHeight;

  return new Float32Array([
    // Top pipe
    x, gapTop, -pipeDepth,
    x + pipeWidth, gapTop, -pipeDepth,
    x, topY, -pipeDepth,
    x + pipeWidth, topY, -pipeDepth,
    x, gapTop, pipeDepth,
    x + pipeWidth, gapTop, pipeDepth,
    x, topY, pipeDepth,
    x + pipeWidth, topY, pipeDepth,

    // Bottom pipe
    x, bottomY, -pipeDepth,
    x + pipeWidth, bottomY, -pipeDepth,
    x, gapBottom, -pipeDepth,
    x + pipeWidth, gapBottom, -pipeDepth,
    x, bottomY, pipeDepth,
    x + pipeWidth, bottomY, pipeDepth,
    x, gapBottom, pipeDepth,
    x + pipeWidth, gapBottom, pipeDepth
  ]);
}



const projectionMatrix = createPerspectiveMatrix(
Math.PI/4,
canvas.width/canvas.height,
0.1,
100.0
);

const viewMatrix =createLookAtMatrix(

    [0,0,2],
    [0,0,0],
    [0,1,0]
);
const uProjection = gl.getUniformLocation(program,"u_projection");
const uView = gl.getUniformLocation(program,"u_view");
const uModel = gl.getUniformLocation(program,"u_model");
const uColor = gl.getUniformLocation(program,"u_color");
const uLightDirection = gl.getUniformLocation(program,"u_lightDirection");

gl.uniformMatrix4fv(uProjection, false, projectionMatrix);
gl.uniformMatrix4fv(uView, false, viewMatrix);
gl.uniform3fv(uLightDirection, [0.5,0.5,-1.0]);

// Fixed bird dimensions 
const birdWidth = 0.05;
const birdHeight = 0.01;


let birdY = 0;
let birdX = 0;
let birdVelocity = 0;
const gravity = 0.001;
const jumpForce = 0.02;

let pipes = [];
let pipeSpawnTimer = 0;
let birdZ = 0;
const birdSpeed = 0.02;

document.addEventListener("keydown", (e) => {
if (e.code === "Space"){
    birdVelocity = -jumpForce;
}
});

function resetGame() {
  if (currentScore > highScore) {
    highScore = currentScore;
  }

  // Reset all game state
  currentScore = 0;
  birdY = 0;
  birdVelocity = 0;
  birdZ = 0;
  pipes = [];
  pipeSpawnTimer = 0;
  isGameOver = false;
  gameRunning = true;
  gamePaused = true; // countdown must be triggered again

  // Hide UI
  document.getElementById("gameOverScreen").classList.remove("visible");

  // Show Ready button again to start countdown
  document.getElementById("readyButton").classList.remove("hidden");
}


function updateBird(){
    birdVelocity += gravity;
    birdY += birdVelocity;
    birdZ = 0;
   

    if (birdY > 1.0) birdY = 1.0;
    if (birdY <-1.0) birdY = -1.0;
}

function drawBird(){
  gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffer);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, birdIndexBuffer);

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    const modelMatrix =createTranslationMatrix(0, birdY, birdZ);
   
    gl.uniformMatrix4fv(uModel, false, modelMatrix);
    gl.uniform3fv(uColor, [ 1.0, 1.0, 0.0]);
    gl.drawElements(gl.TRIANGLES, birdIndices.length, gl.UNSIGNED_SHORT, 0);
}
function updatePipes() {
  pipeSpawnTimer++;
  if (pipeSpawnTimer > 100) {
      const gapHeight = 0.2 + Math.random() * 0.2;
      pipes.push({
          x: 1.0,
          gapHeight: gapHeight,
          scored: false
      });
      pipeSpawnTimer = 0;
  }
  

  for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= 0.01;

      // Increment score if the pipe just passed the bird
      if (!pipes[i].scored && pipes[i].x + 0.2 < birdX) {
          currentScore++;
          pipes[i].scored = true;
      }

      if (pipes[i].x < -1.5) {
          pipes.splice(i, 1);
      }
      if (!pipes[i].scored && pipes[i].x + 0.2 < birdX) {
        currentScore++;
        pipes[i].scored = true;
        scoreSound.play();
    }
  }
}

  
  const pipeBuffer = gl.createBuffer();
function drawPipe(pipe){
  const pipeVertices = createPipeVertices(pipe.x, pipe.gapHeight);

  // Bind pipe's vertex and index buffers
 
  gl.bindBuffer(gl.ARRAY_BUFFER, pipeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pipeVertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pipeIndexBuffer); 

  // Set attribute pointer
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  const modelMatrix = createTranslationMatrix(pipe.x, 0, 0);
  
    gl.uniformMatrix4fv(uModel, false, modelMatrix);
    gl.uniform3fv(uColor, pipeColor);
    gl.drawElements(gl.TRIANGLES, pipeIndices.length, gl.UNSIGNED_SHORT, 0);   
}

let gameRunning = true;

function checkCollision() {
  for (const pipe of pipes) {
    const birdTop = birdY + birdHeight / 2;
    const birdBottom = birdY - birdHeight / 2;
    const birdLeft = birdX - birdWidth / 2;
    const birdRight = birdX + birdWidth / 2;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + 0.2;
    const gapTop = pipe.gapHeight;
    const gapBottom = -pipe.gapHeight;

    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      if (birdTop > gapTop || birdBottom < gapBottom) {
        gameRunning = false;
        const screen = document.getElementById("gameOverScreen");
screen.classList.add("visible");

        return;
      }
    }
  }
}

gl.enable(gl.DEPTH_TEST);


/*function resetGame(){
  birdY = 0;
  birdVelocity = 0;
  birdZ = 0;
  pipes = [];
}*/
function gameLoop(){
  if (!gamePaused && gameRunning) {
    updateBird();
    updatePipes();
    checkCollision();
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawBird();
  pipes.forEach(pipe => drawPipe(pipe));

  document.getElementById("scoreBoard").innerHTML =
       "Score: " + currentScore + "<br>High Score: " + highScore;

  requestAnimationFrame(gameLoop);
}

gameLoop();});