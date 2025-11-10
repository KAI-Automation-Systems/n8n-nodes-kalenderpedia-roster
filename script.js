// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Game State
let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let food = { x: 15, y: 15 };
let powerUp = null;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let gameSpeed = 150;

// Power-Up Types
const POWERUP_TYPES = {
    SPEED: { 
        name: 'Speed Boost', 
        icon: '⚡', 
        color: '#ff6b00', 
        duration: 5000,
        effect: () => { gameSpeed = 80; },
        reset: () => { gameSpeed = 150 - (level - 1) * 10; }
    },
    SLOW: { 
        name: 'Slow Motion', 
        icon: '🐌', 
        color: '#00ffff', 
        duration: 6000,
        effect: () => { gameSpeed = 250; },
        reset: () => { gameSpeed = 150 - (level - 1) * 10; }
    },
    DOUBLE: { 
        name: 'Double Points', 
        icon: '💎', 
        color: '#ff00ff', 
        duration: 8000,
        effect: () => { /* Handled in score calculation */ },
        reset: () => { /* No reset needed */ }
    },
    SHIELD: { 
        name: 'Shield', 
        icon: '🛡️', 
        color: '#00ffff', 
        duration: 7000,
        effect: () => { /* Handled in collision */ },
        reset: () => { /* No reset needed */ }
    },
    SHRINK: { 
        name: 'Shrink', 
        icon: '📉', 
        color: '#ffff00', 
        duration: 0,
        effect: () => { 
            if (snake.length > 3) {
                snake = snake.slice(0, Math.max(3, snake.length - 3));
            }
        },
        reset: () => { /* Instant effect */ }
    }
};

let activePowerUp = null;
let powerUpEndTime = 0;
let powerUpSpawnTimer = 0;
let powerUpSpawnInterval = 15000 + Math.random() * 5000; // 15-20 seconds
let doublePoints = false;
let shieldActive = false;

// Initialize
document.getElementById('high-score').textContent = highScore;
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Keyboard Controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameRunning) return;
        togglePause();
        return;
    }

    if (gamePaused || !gameRunning) return;

    const key = e.key.toLowerCase();
    
    // Prevent reverse direction
    if ((key === 'arrowup' || key === 'w') && direction.y === 0) {
        direction = { x: 0, y: -1 };
    } else if ((key === 'arrowdown' || key === 's') && direction.y === 0) {
        direction = { x: 0, y: 1 };
    } else if ((key === 'arrowleft' || key === 'a') && direction.x === 0) {
        direction = { x: -1, y: 0 };
    } else if ((key === 'arrowright' || key === 'd') && direction.x === 0) {
        direction = { x: 1, y: 0 };
    }
});

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pause-screen').classList.toggle('hidden', !gamePaused);
    if (!gamePaused) {
        gameLoop();
    }
}

function startGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 0, y: 0 };
    score = 0;
    level = 1;
    gameSpeed = 150;
    gameRunning = true;
    gamePaused = false;
    powerUp = null;
    activePowerUp = null;
    powerUpSpawnTimer = 0;
    powerUpSpawnInterval = 15000 + Math.random() * 5000;
    doublePoints = false;
    shieldActive = false;
    
    spawnFood();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    updateScore();
    gameLoop();
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Make sure food doesn't spawn on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            spawnFood();
            return;
        }
    }
}

function spawnPowerUp() {
    if (powerUp !== null) return; // Power-up already exists
    
    const types = Object.keys(POWERUP_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    const powerUpType = POWERUP_TYPES[randomType];
    
    let powerUpPos;
    do {
        powerUpPos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (
        snake.some(segment => segment.x === powerUpPos.x && segment.y === powerUpPos.y) ||
        (food.x === powerUpPos.x && food.y === powerUpPos.y)
    );
    
    powerUp = {
        x: powerUpPos.x,
        y: powerUpPos.y,
        type: randomType,
        ...powerUpType
    };
}

function activatePowerUp(powerUpType) {
    // Reset previous power-up if active
    if (activePowerUp) {
        activePowerUp.reset();
    }
    
    activePowerUp = powerUpType;
    
    if (powerUpType.type === 'SHRINK') {
        powerUpType.effect();
        powerUp = null;
        activePowerUp = null;
        updatePowerUpDisplay();
        return;
    }
    
    powerUpType.effect();
    powerUpEndTime = Date.now() + powerUpType.duration;
    
    if (powerUpType.type === 'DOUBLE') {
        doublePoints = true;
    } else if (powerUpType.type === 'SHIELD') {
        shieldActive = true;
    }
    
    updatePowerUpDisplay();
}

function updatePowerUpDisplay() {
    const display = document.getElementById('active-powerup');
    if (activePowerUp && activePowerUp.type !== 'SHRINK') {
        display.textContent = `${activePowerUp.icon} ${activePowerUp.name} (${Math.ceil((powerUpEndTime - Date.now()) / 1000)}s)`;
        display.classList.add('active');
        display.style.borderColor = activePowerUp.color;
    } else {
        display.classList.remove('active');
        display.textContent = '';
    }
}

function checkPowerUpExpiry() {
    if (activePowerUp && powerUpEndTime > 0 && Date.now() > powerUpEndTime) {
        activePowerUp.reset();
        activePowerUp = null;
        doublePoints = false;
        shieldActive = false;
        updatePowerUpDisplay();
    } else if (activePowerUp && activePowerUp.type !== 'SHRINK') {
        updatePowerUpDisplay();
    }
}

function drawPixelatedRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * gridSize, y * gridSize, width, height);
    // Add pixelated effect
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * gridSize, y * gridSize, width, height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            // Head
            drawPixelatedRect(segment.x, segment.y, gridSize, gridSize, '#00ff00');
            // Eyes
            ctx.fillStyle = '#000';
            if (direction.x === 1) {
                ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 5, 3, 3);
                ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 12, 3, 3);
            } else if (direction.x === -1) {
                ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 5, 3, 3);
                ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 12, 3, 3);
            } else if (direction.y === 1) {
                ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 12, 3, 3);
                ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 12, 3, 3);
            } else if (direction.y === -1) {
                ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 5, 3, 3);
                ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 5, 3, 3);
            }
        } else {
            // Body
            const shade = Math.max(0, 200 - index * 5);
            drawPixelatedRect(segment.x, segment.y, gridSize, gridSize, `rgb(0, ${shade}, 0)`);
        }
    });
    
    // Shield effect
    if (shieldActive && snake.length > 0) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
            snake[0].x * gridSize + gridSize / 2,
            snake[0].y * gridSize + gridSize / 2,
            gridSize / 2 + 2,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }
}

function drawFood() {
    drawPixelatedRect(food.x, food.y, gridSize, gridSize, '#ff0000');
    // Add shine effect
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, 6, 6);
}

function drawPowerUp() {
    if (!powerUp) return;
    
    const x = powerUp.x * gridSize;
    const y = powerUp.y * gridSize;
    
    // Draw power-up shape based on type
    ctx.fillStyle = powerUp.color;
    
    switch (powerUp.type) {
        case 'SPEED':
            // Lightning shape (triangle)
            ctx.beginPath();
            ctx.moveTo(x + gridSize / 2, y + 2);
            ctx.lineTo(x + gridSize - 2, y + gridSize / 2);
            ctx.lineTo(x + gridSize / 2, y + gridSize / 2);
            ctx.lineTo(x + gridSize - 2, y + gridSize - 2);
            ctx.lineTo(x + 2, y + gridSize / 2);
            ctx.lineTo(x + gridSize / 2, y + gridSize / 2);
            ctx.closePath();
            ctx.fill();
            break;
        case 'SLOW':
            // Circle shape
            ctx.beginPath();
            ctx.arc(x + gridSize / 2, y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'DOUBLE':
            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(x + gridSize / 2, y + 2);
            ctx.lineTo(x + gridSize - 2, y + gridSize / 2);
            ctx.lineTo(x + gridSize / 2, y + gridSize - 2);
            ctx.lineTo(x + 2, y + gridSize / 2);
            ctx.closePath();
            ctx.fill();
            break;
        case 'SHIELD':
            // Shield shape (hexagon)
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = x + gridSize / 2 + (gridSize / 2 - 2) * Math.cos(angle);
                const py = y + gridSize / 2 + (gridSize / 2 - 2) * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            break;
        case 'SHRINK':
            // Square shape
            drawPixelatedRect(powerUp.x, powerUp.y, gridSize, gridSize, powerUp.color);
            break;
    }
    
    // Pulsing animation
    const pulse = Math.sin(Date.now() / 200) * 2;
    ctx.strokeStyle = powerUp.color;
    ctx.lineWidth = 2 + pulse;
    ctx.strokeRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
}

function update() {
    if (gamePaused || !gameRunning) return;
    
    // Don't update if no direction is set (wait for player input)
    if (direction.x === 0 && direction.y === 0) return;
    
    // Update power-up spawn timer
    powerUpSpawnTimer += gameSpeed;
    if (powerUpSpawnTimer >= powerUpSpawnInterval) {
        spawnPowerUp();
        powerUpSpawnTimer = 0;
        powerUpSpawnInterval = 15000 + Math.random() * 5000;
    }
    
    // Check power-up expiry
    checkPowerUpExpiry();
    
    // Move snake
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    
    // Check wall collision (wrap around or game over)
    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;
    
    // Check self collision
    if (!shieldActive) {
        for (let segment of snake) {
            if (head.x === segment.x && head.y === segment.y) {
                gameOver();
                return;
            }
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        let points = 10;
        if (doublePoints) points *= 2;
        score += points;
        
        // Level up every 50 points
        const newLevel = Math.floor(score / 50) + 1;
        if (newLevel > level) {
            level = newLevel;
            gameSpeed = Math.max(80, 150 - (level - 1) * 10);
            if (activePowerUp && activePowerUp.type === 'SPEED') {
                gameSpeed = 80;
            } else if (activePowerUp && activePowerUp.type === 'SLOW') {
                gameSpeed = 250;
            }
        }
        
        spawnFood();
        updateScore();
    } else {
        snake.pop();
    }
    
    // Check power-up collision
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        activatePowerUp(powerUp);
        powerUp = null;
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid (subtle)
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    
    drawFood();
    if (powerUp) drawPowerUp();
    drawSnake();
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    
    if (score > highScore) {
        highScore = score;
        document.getElementById('high-score').textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    // Reset power-up effects
    if (activePowerUp) {
        activePowerUp.reset();
        activePowerUp = null;
    }
    doublePoints = false;
    shieldActive = false;
    updatePowerUpDisplay();
}

function gameLoop() {
    if (!gameRunning || gamePaused) return;
    
    update();
    draw();
    
    setTimeout(gameLoop, gameSpeed);
}

// Initial draw
draw();

