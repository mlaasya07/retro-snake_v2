document.getElementById('startButton').addEventListener('click', () => {
  gameManager.startGame();
});

class GameManager {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gridSize = 20;
    this.tileCount = this.canvas.width / this.gridSize;
    
    // Game state
    this.snake = [];
    this.direction = { x: 0, y: 0 };
    this.pills = [];
    this.score = 0;
    this.level = 1;
    this.gameRunning = false;
    this.gamePaused = false;
    this.gameInterval = null;
    this.startTime = null;
    this.baseSpeed = 200;
    this.currentSpeed = this.baseSpeed;
    
    // Performance tracking
    this.pillsEaten = 0;
    this.blackPillsAvoided = 0;
    
    // Pill types and their properties
    this.pillTypes = {
      red: { color: '#ff4444', points: 1, effect: 'grow' },
      white: { color: '#ffffff', points: 2, effect: 'bonus' },
      blue: { color: '#4444ff', points: 0, effect: 'death', duration: 15000 }
    };
    
    // Visual effects
    this.particles = [];
    this.screenShake = 0;
    
    this.initializeEventListeners();
    this.showMenu();
  }
  
  initializeEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    
    // Prevent default behavior for game keys
    document.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    
    // Handle window focus/blur for auto-pause
    window.addEventListener('blur', () => {
      if (this.gameRunning && !this.gamePaused) {
        this.pauseGame();
      }
    });
  }
  
  handleKeyPress(event) {
    if (!this.gameRunning) return;
    
    const key = event.code;
    
    // Pause/Resume
    if (key === 'Space') {
      event.preventDefault();
      this.togglePause();
      return;
    }
    
    // Return to menu
    if (key === 'Escape') {
      event.preventDefault();
      if (this.gamePaused) {
        this.endGame();
        this.showMenu();
      }
      return;
    }
    
    if (this.gamePaused) return;
    
    // Movement controls (Arrow keys and WASD)
    let newDirection = { ...this.direction };
    
    switch (key) {
      case 'ArrowLeft':
      case 'KeyA':
        if (this.direction.x === 0) newDirection = { x: -1, y: 0 };
        break;
      case 'ArrowUp':
      case 'KeyW':
        if (this.direction.y === 0) newDirection = { x: 0, y: -1 };
        break;
      case 'ArrowRight':
      case 'KeyD':
        if (this.direction.x === 0) newDirection = { x: 1, y: 0 };
        break;
      case 'ArrowDown':
      case 'KeyS':
        if (this.direction.y === 0) newDirection = { x: 0, y: 1 };
        break;
    }
    
    this.direction = newDirection;
  }
  
  startGame() {
    // Hide all screens
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    
    // Show game container
    document.querySelector('.game-container').style.display = 'flex';
    
    // Initialize game state
    this.snake = [{ x: Math.floor(this.tileCount / 2), y: Math.floor(this.tileCount / 2) }];
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.level = 1;
    this.pillsEaten = 0;
    this.blackPillsAvoided = 0;
    this.gameRunning = true;
    this.gamePaused = false;
    this.startTime = Date.now();
    this.currentSpeed = this.baseSpeed;
    this.particles = [];
    this.screenShake = 0;
    
    // Generate initial pills
    this.pills = [];
    this.generateInitialPills();
    
    // Update UI
    this.updateUI();
    
    // Start game loop
    this.gameInterval = setInterval(() => this.gameLoop(), this.currentSpeed);
  }
  
  gameLoop() {
    if (this.gamePaused) return;
    
    this.update();
    this.render();
  }
  
  update() {
    // Move snake
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;
    
    // Check wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.endGame();
      return;
    }
    
    // Check self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.endGame();
      return;
    }
    
    this.snake.unshift(head);
    
    // Check pill collision
    let pillEaten = false;
    for (let i = this.pills.length - 1; i >= 0; i--) {
      const pill = this.pills[i];
      if (head.x === pill.x && head.y === pill.y) {
        this.eatPill(pill);
        this.pills.splice(i, 1);
        pillEaten = true;
        break;
      }
    }
    
    // Remove tail if no pill eaten
    if (!pillEaten) {
      this.snake.pop();
    }
    
    // Maintain pill count
    this.maintainPillCounts();
    
    // Update particles
    this.updateParticles();
    
    // Update screen shake
    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.1) this.screenShake = 0;
    }
    
    // Level progression
    this.checkLevelProgression();
  }
  
  eatPill(pill) {
    const pillType = this.pillTypes[pill.type];
    
    switch (pill.type) {
      case 'red':
        this.score += pillType.points;
        this.pillsEaten++;
        this.createParticles(pill.x * this.gridSize + this.gridSize / 2, 
                           pill.y * this.gridSize + this.gridSize / 2, 
                           pillType.color);
        break;
        
      case 'white':
        this.score += pillType.points;
        this.pillsEaten++;
        this.createParticles(pill.x * this.gridSize + this.gridSize / 2, 
                           pill.y * this.gridSize + this.gridSize / 2, 
                           pillType.color);
        break;
        
      case 'blue':
        this.screenShake = 10;
        this.createExplosion(pill.x * this.gridSize + this.gridSize / 2, 
                           pill.y * this.gridSize + this.gridSize / 2);
        this.endGame();
        return;
    }
    
    this.updateUI();
  }
  
  generateInitialPills() {
    // Generate at least 2 red pills
    for (let i = 0; i < 2; i++) {
      this.generatePill('red');
    }
    
    // Generate at least 1 white pill
    this.generatePill('white');
    
    // Optionally generate a blue pill (30% chance)
    if (Math.random() < 0.3) {
      this.generatePill('blue');
    }
  }
  
  maintainPillCounts() {
    const redCount = this.pills.filter(p => p.type === 'red').length;
    const whiteCount = this.pills.filter(p => p.type === 'white').length;
    
    // Ensure minimum counts
    while (redCount + this.pills.filter(p => p.type === 'red').length < 2) {
      this.generatePill('red');
    }
    
    if (whiteCount === 0) {
      this.generatePill('white');
    }
    
    // Occasionally add blue pills (10% chance per update)
    if (Math.random() < 0.1 && !this.pills.some(p => p.type === 'blue')) {
      this.generatePill('blue');
    }
  }
  
  generatePill(forceType = null) {
    let position;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      position = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
      attempts++;
    } while (
      attempts < maxAttempts && 
      (this.isPositionOccupied(position) || this.isTooCloseToSnake(position))
    );
    
    if (attempts >= maxAttempts) return; // Prevent infinite loop
    
    const pillType = forceType || this.getRandomPillType();
    const pill = {
      x: position.x,
      y: position.y,
      type: pillType,
      pulse: 0,
      createdAt: Date.now()
    };
    
    // Add timer for blue pills
    if (pillType === 'blue') {
      setTimeout(() => {
        const index = this.pills.findIndex(p => p === pill);
        if (index !== -1) {
          this.pills.splice(index, 1);
        }
      }, this.pillTypes.blue.duration);
    }
    
    this.pills.push(pill);
  }
  
  getRandomPillType() {
    // Random selection with preference for red
    const rand = Math.random();
    if (rand < 0.6) return 'red';
    if (rand < 0.9) return 'white';
    return 'blue';
  }
  
  isPositionOccupied(position) {
    return this.snake.some(segment => segment.x === position.x && segment.y === position.y) ||
           this.pills.some(pill => pill.x === position.x && pill.y === position.y);
  }
  
  isTooCloseToSnake(position) {
    const head = this.snake[0];
    const distance = Math.abs(position.x - head.x) + Math.abs(position.y - head.y);
    return distance < 3; // Minimum distance from snake head
  }
  
  checkLevelProgression() {
    const newLevel = Math.floor(this.score / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.increaseSpeed();
      this.updateUI();
      
      // Level up effect
      this.createLevelUpEffect();
    }
  }
  
  increaseSpeed() {
    this.currentSpeed = Math.max(80, this.baseSpeed - (this.level - 1) * 15);
    clearInterval(this.gameInterval);
    this.gameInterval = setInterval(() => this.gameLoop(), this.currentSpeed);
  }
  
  createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color: color,
        size: Math.random() * 4 + 2
      });
    }
  }
  
  createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1,
        color: '#ff4444',
        size: Math.random() * 6 + 3
      });
    }
  }
  
  createLevelUpEffect() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20,
        life: 1,
        color: '#00ff00',
        size: Math.random() * 5 + 2
      });
    }
  }
  
  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.life -= 0.02;
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  render() {
    // Apply screen shake
    this.ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(shakeX, shakeY);
    }
    
    // Clear canvas with solid black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw snake
    this.drawSnake();
    
    // Draw pills
    this.drawPills();
    
    // Draw particles
    this.drawParticles();
    
    this.ctx.restore();
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= this.tileCount; i++) {
      const pos = i * this.gridSize;
      this.ctx.beginPath();
      this.ctx.moveTo(pos, 0);
      this.ctx.lineTo(pos, this.canvas.height);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos);
      this.ctx.lineTo(this.canvas.width, pos);
      this.ctx.stroke();
    }
  }
  
  drawSnake() {
    this.snake.forEach((segment, index) => {
      const x = segment.x * this.gridSize;
      const y = segment.y * this.gridSize;
      
      if (index === 0) {
        // Draw head with glow effect
        this.ctx.shadowColor = '#00ff00';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
        
        // Draw eyes
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#000000';
        const eyeSize = 3;
        const eyeOffset = 5;
        this.ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
        this.ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
      } else {
        // Draw body with gradient
        const alpha = Math.max(0.3, 1 - (index / this.snake.length) * 0.7);
        this.ctx.shadowColor = 'rgba(0, 255, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
        this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
      }
    });
    
    this.ctx.shadowBlur = 0;
  }
  
  drawPills() {
    this.pills.forEach(pill => {
      const x = pill.x * this.gridSize;
      const y = pill.y * this.gridSize;
      const pillConfig = this.pillTypes[pill.type];
      
      // Update pulse animation
      pill.pulse = (pill.pulse + 0.1) % (Math.PI * 2);
      const pulseScale = 1 + Math.sin(pill.pulse) * 0.1;
      
      // Draw pill with glow
      this.ctx.shadowColor = pillConfig.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = pillConfig.color;
      
      const radius = ((this.gridSize - 4) / 2) * pulseScale;
      const centerX = x + this.gridSize / 2;
      const centerY = y + this.gridSize / 2;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add inner highlight for 3D effect
      if (pill.type !== 'blue') {
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - 2, centerY - 2, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
    
    this.ctx.shadowBlur = 0;
  }
  
  drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.globalAlpha = particle.life;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    });
    
    this.ctx.globalAlpha = 1;
  }
  
  togglePause() {
    if (this.gamePaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }
  
  pauseGame() {
    this.gamePaused = true;
    document.getElementById('pauseScreen').style.display = 'flex';
  }
  
  resumeGame() {
    this.gamePaused = false;
    document.getElementById('pauseScreen').style.display = 'none';
  }
  
  endGame() {
    this.gameRunning = false;
    this.gamePaused = false;
    clearInterval(this.gameInterval);
    
    // Calculate game statistics
    const survivalTime = Math.floor((Date.now() - this.startTime) / 1000);
    const performance = this.calculatePerformance();
    
    // Update final score display
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('finalLevel').textContent = this.level;
    document.getElementById('survivalTime').textContent = survivalTime;
    document.getElementById('performanceRating').textContent = performance.rating;
    document.getElementById('performanceRating').style.color = performance.color;
    
    // Hide game container and show game over screen
    document.querySelector('.game-container').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'flex';
  }
  
  calculatePerformance() {
    const efficiency = this.pillsEaten > 0 ? (this.score / this.pillsEaten) : 0;
    const survivalTime = (Date.now() - this.startTime) / 1000;
    const scorePerSecond = this.score / survivalTime;
    
    let rating, color;
    
    if (this.score >= 50) {
      rating = "Neural Master";
      color = "#ff82ac";
    } else if (this.score >= 30) {
      rating = "Advanced Operator";
      color = "#ff82ac";
    } else if (this.score >= 20) {
      rating = "Skilled Technician";
      color = "#ff82ac";
    } else if (this.score >= 10) {
      rating = "Competent User";
      color = "#f5427e";
    } else {
      rating = "Novice Subject";
      color = "#ff82ac";
    }
    
    return { rating, color };
  }
  
  showMenu() {
    // Hide all screens
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    document.querySelector('.game-container').style.display = 'none';
    
    // Show start screen
    document.getElementById('startScreen').style.display = 'flex';
    
    // Reset game state
    this.gameRunning = false;
    this.gamePaused = false;
    clearInterval(this.gameInterval);
  }
  
  updateUI() {
    document.getElementById('currentScore').textContent = this.score;
    document.getElementById('currentLevel').textContent = this.level;
    
    // Update speed display
    let speedText;
    if (this.currentSpeed >= 180) speedText = "Slow";
    else if (this.currentSpeed >= 140) speedText = "Normal";
    else if (this.currentSpeed >= 100) speedText = "Fast";
    else speedText = "Extreme";
    
    document.getElementById('currentSpeed').textContent = speedText;
  }
}

// Initialize game when page loads
const gameManager = new GameManager();

// Make gameManager globally accessible for button onclick handlers
window.gameManager = gameManager;