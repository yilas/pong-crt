const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");
const music = document.getElementById("bgMusic");
const startup = document.getElementById("startup-effect");

// Supprime l'overlay après l'animation de démarrage
startup.addEventListener("animationend", () => {
  startup.style.display = "none";
});

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

let paddleWidth = 20;
let paddleHeight = H / 5;
const paddleSpeed = 5;      // raquette plus lente
const ballSize = 20;
const maxScore = 5;

const player = { x: 10, y: H / 2 - paddleHeight / 2, score: 0 };
const ai     = { x: W - 30, y: H / 2 - paddleHeight / 2, score: 0 };
const ball   = { x: W / 2, y: H / 2, dx: 1, dy: 1 };

// Difficultés : IA + vitesses de balle (base, max, incrément par rebond)
const difficulties = {
  EASY:   { aiMaxSpeed: 4, aiFollowFactor: 0.10, baseBallSpeed: 4, maxBallSpeed: 7,  speedIncrement: 0.25 },
  NORMAL: { aiMaxSpeed: 6, aiFollowFactor: 0.15, baseBallSpeed: 6, maxBallSpeed: 10, speedIncrement: 0.35 },
  HARD:   { aiMaxSpeed: 8, aiFollowFactor: 0.20, baseBallSpeed: 8, maxBallSpeed: 13, speedIncrement: 0.45 }
};

let currentDifficulty = "NORMAL";
let currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;

let upPressed = false, downPressed = false;
let running = false, paused = false;
let gameOver = false, winner = null; // 'player' ou 'ai'

// Gestion du resize : conserve les positions proportionnellement
window.addEventListener("resize", () => {
  const prevW = W;
  const prevH = H;

  const playerYRatio = player.y / prevH;
  const aiYRatio     = ai.y / prevH;
  const ballXRatio   = ball.x / prevW;
  const ballYRatio   = ball.y / prevH;

  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  paddleHeight = H / 5;
  player.y = playerYRatio * H;
  ai.y     = aiYRatio * H;
  ball.x   = ballXRatio * W;
  ball.y   = ballYRatio * H;
  ai.x     = W - 30; // recale l'IA à droite
});

// Définir la vitesse de la balle selon currentBallSpeed, en gardant la direction
function setBallSpeed() {
  const speed = currentBallSpeed;

  // Si dx/dy valent 0 par hasard, on leur donne un sens aléatoire
  const dirX = ball.dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(ball.dx);
  const dirY = ball.dy === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(ball.dy);

  // vitesse globale
  // on part sur un angle 45° initial si on est en "reset"
  const norm = Math.sqrt(1 * 1 + 1 * 1);
  const baseDx = dirX / norm;
  const baseDy = dirY / norm;

  ball.dx = baseDx * speed;
  ball.dy = baseDy * speed;
}

// Augmente progressivement la vitesse de la balle (jusqu'au max)
function increaseBallSpeed() {
  const diff = difficulties[currentDifficulty];
  currentBallSpeed = Math.min(diff.maxBallSpeed, currentBallSpeed + diff.speedIncrement);

  // Recalcule dx/dy à partir de l'angle actuel pour conserver la trajectoire
  const angle = Math.atan2(ball.dy, ball.dx);
  const speed = currentBallSpeed;
  ball.dx = Math.cos(angle) * speed;
  ball.dy = Math.sin(angle) * speed;
}

// Helpers de dessin
function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBall(x, y) {
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, ballSize, ballSize);
}

function drawScore() {
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(player.score, W / 4, 20);
  ctx.fillText(ai.score, (W * 3) / 4, 20);
}

function drawCenteredText(text, y) {
  ctx.font = "20px 'Press Start 2P'";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, y);
}

function resetBall(scoringPlayer) {
  scoringPlayer.score++;

  // Vérifie la fin de partie
  if (scoringPlayer.score >= maxScore) {
    gameOver = true;
    running = false;
    winner = (scoringPlayer === player) ? "player" : "ai";
    music.pause();
    return;
  }

  ball.x = W / 2;
  ball.y = H / 2;

  // direction aléatoire de base
  ball.dx = (Math.random() > 0.5 ? 1 : -1);
  ball.dy = (Math.random() > 0.5 ? 1 : -1);

  // Réinitialise la vitesse à la base de la difficulté
  currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  setBallSpeed();
}

function resetMatch() {
  player.score = 0;
  ai.score = 0;
  player.y = H / 2 - paddleHeight / 2;
  ai.y = H / 2 - paddleHeight / 2;
  ai.x = W - 30;

  ball.x = W / 2;
  ball.y = H / 2;
  ball.dx = (Math.random() > 0.5 ? 1 : -1);
  ball.dy = (Math.random() > 0.5 ? 1 : -1);

  currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  setBallSpeed();

  gameOver = false;
  winner = null;
  paused = false;
}

function applyEffect(paddle) {
  const relativeY = (ball.y + ballSize / 2) - (paddle.y + paddleHeight / 2);
  const normalized = relativeY / (paddleHeight / 2);
  // On modifie l'angle (donc dy) mais la norme sera recalée par increaseBallSpeed()
  ball.dy = normalized * currentBallSpeed;
}

function drawMenu() {
  ctx.clearRect(0, 0, W, H);
  drawCenteredText("PONG CRT DELUXE", H / 2 - 80);
  drawCenteredText("PRESS ENTER TO START", H / 2 - 20);
  drawCenteredText("SPACE = PAUSE", H / 2 + 20);
  drawCenteredText("1:EASY  2:NORMAL  3:HARD", H / 2 + 80);
  drawCenteredText("DIFFICULTY: " + currentDifficulty, H / 2 + 120);
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);
  drawCenteredText("PAUSE", H / 2);
}

function drawGameOver() {
  ctx.clearRect(0, 0, W, H);
  const message = winner === "player" ? "YOU WIN!" : "YOU LOSE!";
  drawCenteredText(message, H / 2 - 40);
  drawCenteredText("FINAL SCORE " + player.score + " - " + ai.score, H / 2 + 10);
  drawCenteredText("PRESS ENTER TO RESTART", H / 2 + 60);
}

function drawGame() {
  // Fond
  drawRect(0, 0, W, H, "black");

  // Ligne centrale
  for (let i = 0; i < H; i += 30) {
    drawRect(W / 2 - 5, i, 10, 10, "gray");
  }

  // Paddles
  drawRect(player.x, player.y, paddleWidth, paddleHeight, "white");
  drawRect(ai.x, ai.y, paddleWidth, paddleHeight, "white");

  // Balle + score
  drawBall(ball.x, ball.y);
  drawScore();

  // Mouvement joueur (vitesse réduite)
  if (upPressed && player.y > 0) player.y -= paddleSpeed;
  if (downPressed && player.y + paddleHeight < H) player.y += paddleSpeed;

  // Mouvement IA
  const { aiMaxSpeed, aiFollowFactor } = difficulties[currentDifficulty];
  let target = ball.y - (paddleHeight / 2) + ballSize / 2;
  let delta = target - ai.y;
  ai.y += Math.sign(delta) * Math.min(aiMaxSpeed, Math.abs(delta) * aiFollowFactor);

  // Clamp pour éviter de sortir de l'écran
  if (ai.y < 0) ai.y = 0;
  if (ai.y + paddleHeight > H) ai.y = H - paddleHeight;

  // Mouvement balle
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Rebonds haut/bas + accélération
  if (ball.y <= 0 || ball.y + ballSize >= H) {
    ball.dy = -ball.dy;
    increaseBallSpeed();
  }

  // Collisions joueur
  if (ball.x <= player.x + paddleWidth &&
      ball.y + ballSize > player.y &&
      ball.y < player.y + paddleHeight) {
    ball.dx = Math.abs(ball.dx); // repart vers la droite
    applyEffect(player);
    increaseBallSpeed();
  }

  // Collisions IA
  if (ball.x + ballSize >= ai.x &&
      ball.y + ballSize > ai.y &&
      ball.y < ai.y + paddleHeight) {
    ball.dx = -Math.abs(ball.dx); // repart vers la gauche
    applyEffect(ai);
    increaseBallSpeed();
  }

  // Points marqués (sans accélération, on reset)
  if (ball.x + ballSize < 0)  resetBall(ai);
  if (ball.x > W)             resetBall(player);
}

function startGame() {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.dx = (Math.random() > 0.5 ? 1 : -1);
  ball.dy = (Math.random() > 0.5 ? 1 : -1);

  currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  setBallSpeed();

  running = true;
  paused = false;
  music.play().catch(() => {});
}

function gameLoop() {
  if (!running) {
    if (gameOver) {
      drawGameOver();
    } else {
      drawMenu();
    }
    requestAnimationFrame(gameLoop);
    return;
  }

  if (paused) {
    drawPause();
    requestAnimationFrame(gameLoop);
    return;
  }

  drawGame();
  requestAnimationFrame(gameLoop);
}

// Gestion clavier
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp")   upPressed = true;
  if (e.key === "ArrowDown") downPressed = true;

  // Changement de difficulté
  if (e.key === "1") {
    currentDifficulty = "EASY";
    currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  }
  if (e.key === "2") {
    currentDifficulty = "NORMAL";
    currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  }
  if (e.key === "3") {
    currentDifficulty = "HARD";
    currentBallSpeed = difficulties[currentDifficulty].baseBallSpeed;
  }

  if (e.key === "Enter" && !running) {
    if (gameOver) {
      resetMatch();
    }
    startGame();
  }

  if (e.key === " ") {
    if (running && !gameOver) {
      paused = !paused;
      if (paused) {
        music.pause();
      } else {
        music.play().catch(() => {});
      }
    }
  }
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowUp")   upPressed = false;
  if (e.key === "ArrowDown") downPressed = false;
});

gameLoop();
