// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

// Tetris pieces (tetrominoes)
const PIECES = [
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: '#00f0f0' // I-piece (cyan)
    },
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#f0f000' // O-piece (yellow)
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#a000f0' // T-piece (purple)
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#00f000' // S-piece (green)
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#f00000' // Z-piece (red)
    },
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1]
        ],
        color: '#0000f0' // J-piece (blue)
    },
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]
        ],
        color: '#f0a000' // L-piece (orange)
    }
];

class Tetris {
    constructor() {
        this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        this.currentPiece = null;
        this.nextPiece = null;
        this.pieceX = 0;
        this.pieceY = 0;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameRunning = false;
        this.gamePaused = false;
        this.dropCounter = 0;
        this.dropInterval = 1000; // milliseconds
        this.lastTime = 0;
        this.particles = [];
        this.flashAlpha = 0;
        
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-piece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.overlay = document.getElementById('game-overlay');
        this.startButton = document.getElementById('start-button');
        this.scoreElement = document.getElementById('score');
        this.linesElement = document.getElementById('lines');
        this.levelElement = document.getElementById('level');
        
        this.setupEventListeners();
        this.spawnNextPiece();
    }
    
    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) {
                if (e.code === 'Space' && !this.gameRunning) {
                    this.startGame();
                } else if (e.code === 'KeyP' && this.gameRunning) {
                    this.togglePause();
                }
                return;
            }
            
            switch(e.code) {
                case 'ArrowLeft':
                    this.movePiece(-1, 0);
                    break;
                case 'ArrowRight':
                    this.movePiece(1, 0);
                    break;
                case 'ArrowDown':
                    this.movePiece(0, 1);
                    break;
                case 'ArrowUp':
                    this.rotatePiece();
                    break;
                case 'Space':
                    this.hardDrop();
                    break;
                case 'KeyP':
                    this.togglePause();
                    break;
            }
        });
    }
    
    startGame() {
        this.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.gameRunning = true;
        this.gamePaused = false;
        this.overlay.classList.add('hidden');
        this.spawnNextPiece();
        this.updateScore();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;
        const overlayTitle = document.getElementById('overlay-title');
        const overlayMessage = document.getElementById('overlay-message');
        if (this.gamePaused) {
            overlayTitle.textContent = 'Paused';
            overlayMessage.textContent = 'Press P to Resume';
            this.overlay.classList.remove('hidden');
        } else {
            this.overlay.classList.add('hidden');
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
        }
    }
    
    spawnNextPiece() {
        this.currentPiece = this.nextPiece || this.getRandomPiece();
        this.nextPiece = this.getRandomPiece();
        this.pieceX = Math.floor(BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
        this.pieceY = 0;
        
        if (this.isCollision(this.currentPiece.shape, this.pieceX, this.pieceY)) {
            this.gameOver();
        }
        
        this.drawNextPiece();
    }
    
    getRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * PIECES.length);
        const piece = PIECES[pieceIndex];
        return {
            shape: piece.shape.map(row => [...row]),
            color: piece.color
        };
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return;
        
        const newX = this.pieceX + dx;
        const newY = this.pieceY + dy;
        
        if (!this.isCollision(this.currentPiece.shape, newX, newY)) {
            this.pieceX = newX;
            this.pieceY = newY;
            this.draw();
        }
    }
    
    rotatePiece() {
        if (!this.currentPiece) return;
        
        const rotated = this.rotateMatrix(this.currentPiece.shape);
        
        // Try rotation at current position
        if (!this.isCollision(rotated, this.pieceX, this.pieceY)) {
            this.currentPiece.shape = rotated;
            this.draw();
            return;
        }
        
        // Try wall kicks (shift left/right)
        for (let offset of [-1, 1, -2, 2]) {
            if (!this.isCollision(rotated, this.pieceX + offset, this.pieceY)) {
                this.currentPiece.shape = rotated;
                this.pieceX += offset;
                this.draw();
                return;
            }
        }
    }
    
    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = matrix[i][j];
            }
        }
        
        return rotated;
    }
    
    hardDrop() {
        if (!this.currentPiece) return;
        
        let dropY = this.pieceY;
        while (!this.isCollision(this.currentPiece.shape, this.pieceX, dropY + 1)) {
            dropY++;
        }
        
        this.pieceY = dropY;
        this.lockPiece();
    }
    
    isCollision(shape, x, y) {
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    // Check boundaries
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return true;
                    }
                    
                    // Check collision with existing blocks (but allow negative Y for spawning)
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    lockPiece() {
        if (!this.currentPiece) return;
        
        // Place piece on board
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const y = this.pieceY + row;
                    const x = this.pieceX + col;
                    if (y >= 0) {
                        this.board[y][x] = this.currentPiece.color;
                    }
                }
            }
        }
        
        // Clear lines
        this.clearLines();
        
        // Spawn next piece
        this.spawnNextPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        const clearedRows = [];
        
        for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                clearedRows.push(row);
                this.board.splice(row, 1);
                this.board.unshift(Array(BOARD_WIDTH).fill(0));
                linesCleared++;
                row++; // Check same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            
            // Scoring: more lines = more points
            const lineScores = [0, 100, 300, 500, 800];
            this.score += lineScores[linesCleared] * this.level;
            
            // Level up every 10 lines
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            }
            
            // Create celebratory effects
            this.createCelebration(clearedRows, linesCleared);
            
            this.updateScore();
        }
    }
    
    createCelebration(clearedRows, linesCleared) {
        // Flash effect
        this.flashAlpha = 0.6;
        
        // Create particles for each cleared line
        clearedRows.forEach(row => {
            const y = row * BLOCK_SIZE;
            for (let i = 0; i < BOARD_WIDTH; i++) {
                const x = i * BLOCK_SIZE;
                // Create multiple particles per block
                for (let j = 0; j < 5; j++) {
                    this.particles.push({
                        x: x + BLOCK_SIZE / 2,
                        y: y + BLOCK_SIZE / 2,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8 - 2,
                        life: 1.0,
                        decay: 0.02 + Math.random() * 0.02,
                        color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                        size: 3 + Math.random() * 4
                    });
                }
            }
        });
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // gravity
            p.life -= p.decay;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Fade flash effect
        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.05;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    }
    
    drawParticles() {
        // Draw flash overlay
        if (this.flashAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.linesElement.textContent = this.lines;
        this.levelElement.textContent = this.level;
        
        // Add celebrate animation
        [this.scoreElement, this.linesElement, this.levelElement].forEach(el => {
            el.classList.remove('celebrate');
            // Trigger reflow to restart animation
            void el.offsetWidth;
            el.classList.add('celebrate');
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        this.drawBoard();
        
        // Draw current piece
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece, this.pieceX, this.pieceY);
        }
        
        // Draw grid
        this.drawGrid();
        
        // Update and draw particles
        this.updateParticles();
        this.drawParticles();
    }
    
    drawBoard() {
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col < BOARD_WIDTH; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }
    }
    
    drawPiece(piece, x, y) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    this.drawBlock(x + col, y + row, piece.color);
                }
            }
        }
    }
    
    drawBlock(x, y, color) {
        const pixelX = x * BLOCK_SIZE;
        const pixelY = y * BLOCK_SIZE;
        
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(pixelX + 1, pixelY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, BLOCK_SIZE - 2, 8);
        
        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(pixelX + 1, pixelY + BLOCK_SIZE - 9, BLOCK_SIZE - 2, 8);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * BLOCK_SIZE, 0);
            this.ctx.lineTo(x * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * BLOCK_SIZE);
            this.ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
            this.ctx.stroke();
        }
    }
    
    drawNextPiece() {
        if (!this.nextPiece) return;
        
        // Properly clear the canvas first
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        // Draw background
        this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const shape = this.nextPiece.shape;
        const blockSize = 25;
        const offsetX = (this.nextCanvas.width - shape[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - shape.length * blockSize) / 2;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const x = offsetX + col * blockSize;
                    const y = offsetY + row * blockSize;
                    
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                    
                    this.nextCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    this.nextCtx.fillRect(x + 1, y + 1, blockSize - 2, 6);
                    
                    this.nextCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    this.nextCtx.fillRect(x + 1, y + blockSize - 7, blockSize - 2, 6);
                }
            }
        }
    }
    
    gameLoop(currentTime) {
        if (!this.gameRunning || this.gamePaused) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.dropCounter += deltaTime;
        
        if (this.dropCounter >= this.dropInterval) {
            if (this.currentPiece) {
                if (!this.isCollision(this.currentPiece.shape, this.pieceX, this.pieceY + 1)) {
                    this.pieceY++;
                } else {
                    this.lockPiece();
                }
            }
            this.dropCounter = 0;
        }
        
        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    gameOver() {
        this.gameRunning = false;
        const overlayTitle = document.getElementById('overlay-title');
        const overlayMessage = document.getElementById('overlay-message');
        overlayTitle.textContent = 'Game Over';
        overlayMessage.textContent = `Final Score: ${this.score}`;
        this.overlay.classList.remove('hidden');
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Tetris();
    game.draw();
});
