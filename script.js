const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const comboEl = document.getElementById('combo');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create background stars
const starsContainer = document.getElementById('stars');
for (let i = 0; i < 150; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    starsContainer.appendChild(star);
}

let score = 0;
let bestScore = localStorage.getItem('neonRushHardBest') || 0;
let lives = 3;
let level = 1;
let gameRunning = false;
let orbs = [];
let particles = [];
let lastTime = 0;
let spawnTimer = 0;
let spawnRate = 800;
let orbSpeed = 3.5;
let orbSizeMultiplier = 0.7;
let orbsSpawned = 0;
let multiOrbChance = 0.3;

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 15;
        this.speedY = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

class Orb {
    constructor() {
        this.radius = (Math.random() * 20 + 20) * orbSizeMultiplier;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = -this.radius;
        this.speed = (Math.random() * 2 + orbSpeed) * (1 + (level - 1) * 0.1);
        
        const colors = ['#ff006e', '#00f5ff', '#8338ec', '#ffbe0b', '#06ffa5'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.pulsate = 0;
    }

    update() {
        this.y += this.speed;
        this.pulsate += 0.1;
    }

    draw() {
        const pulse = Math.sin(this.pulsate) * 5;
        ctx.shadowBlur = 20 + pulse;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + pulse/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner white glow
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function spawnOrb() {
    orbs.push(new Orb());
    orbsSpawned++;
    
    // Hardcore level scaling
    if (orbsSpawned % 15 === 0) {
        level++;
        levelEl.textContent = level;
        spawnRate = Math.max(300, 800 - (level * 50));
        orbSpeed += 0.4;
        multiOrbChance = Math.min(0.8, multiOrbChance + 0.05);
        orbSizeMultiplier = Math.max(0.4, 0.7 - (level * 0.02));
        
        // Screen flash on level up
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }
}

function updateLives() {
    livesEl.textContent = '❤'.repeat(lives);
    if (lives === 1) livesEl.style.animation = 'pulseRed 0.5s infinite';
    else livesEl.style.animation = 'none';
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    spawnTimer += deltaTime;
    if (spawnTimer > spawnRate) {
        spawnOrb();
        if (Math.random() < multiOrbChance) spawnOrb();
        spawnTimer = 0;
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
        orbs[i].update();
        orbs[i].draw();

        if (orbs[i].y > canvas.height + orbs[i].radius) {
            orbs.splice(i, 1);
            lives--;
            updateLives();
            
            // Screen shake
            canvas.style.transform = `translate(${(Math.random()-0.5)*20}px, ${(Math.random()-0.5)*20}px)`;
            setTimeout(() => canvas.style.transform = 'translate(0,0)', 50);

            if (lives <= 0) endGame();
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

function handleInput(x, y) {
    if (!gameRunning) return;

    for (let i = orbs.length - 1; i >= 0; i--) {
        const dx = x - orbs[i].x;
        const dy = y - orbs[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < orbs[i].radius + 30) {
            createExplosion(orbs[i].x, orbs[i].y, orbs[i].color);
            score += 10 * level;
            scoreEl.textContent = score;
            orbs.splice(i, 1);
            return;
        }
    }
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleInput(touch.clientX, touch.clientY);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    handleInput(e.clientX, e.clientY);
});

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    orbs = [];
    particles = [];
    spawnRate = 800;
    orbSpeed = 3.5;
    orbSizeMultiplier = 0.7;
    spawnTimer = 0;
    orbsSpawned = 0;
    multiOrbChance = 0.3;
    gameRunning = true;
    lastTime = Date.now();
    
    scoreEl.textContent = '0';
    levelEl.textContent = '1';
    updateLives();
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    gameLoop();
}

function endGame() {
    gameRunning = false;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonRushHardBest', bestScore);
        bestScoreEl.textContent = `BEST: ${bestScore}`;
    }
    
    finalScoreEl.textContent = `SCORE: ${score}`;
    gameOverScreen.style.display = 'flex';
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
