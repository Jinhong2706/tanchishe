(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const currentScoreSpan = document.getElementById('currentScore');
    const bestScoreSpan = document.getElementById('bestScore');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const colorSwatches = document.querySelectorAll('.swatch');
    const customColorInput = document.getElementById('customColor');
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const dpad = document.getElementById('dpad');
    const hintEl = document.getElementById('hint');

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    let GRID, COLS, ROWS, SIZE;
    if (isTouchDevice) {
        GRID = 20;
        COLS = 20;
        ROWS = 20;
        SIZE = COLS * GRID;
    } else {
        GRID = 22;
        COLS = 24;
        ROWS = 24;
        SIZE = COLS * GRID;
    }

    canvas.width = SIZE;
    canvas.height = SIZE;

    let startBtnW = Math.round(SIZE * 0.45);
    let startBtnH = Math.round(SIZE * 0.135);
    let startBtnX = (SIZE - startBtnW) / 2;
    let startBtnY = (SIZE - startBtnH) / 2 - Math.round(SIZE * 0.02);
    let startBtnRadius = Math.round(SIZE * 0.04);

    let pauseBarW = Math.round(SIZE * 0.035);
    let pauseBarH = Math.round(SIZE * 0.12);
    let pauseBarGap = Math.round(SIZE * 0.045);
    let pauseIconCX = SIZE / 2;
    let pauseIconCY = SIZE / 2 - Math.round(SIZE * 0.025);
    let pauseBarRadius = Math.round(SIZE * 0.01);

    let gameState = 'idle';
    let snake = [];
    let food = null;
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let score = 0;
    let bestScore = 0;
    let bgColor = '#000000';
    let moveInterval = 130;
    let lastMoveTime = 0;
    let animationId = null;
    let particles = [];

    if (!isTouchDevice) {
        dpad.style.display = 'none';
        hintEl.textContent = '方向键 / WASD 控制 | 空格键暂停/继续 | 点击色块切换背景 | 点击画布开始';
    }

    function loadBest() {
        try {
            const v = localStorage.getItem('snake_best_v2');
            if (v && !isNaN(parseInt(v, 10))) bestScore = parseInt(v, 10);
        } catch (e) {}
        bestScoreSpan.textContent = bestScore;
    }

    function saveBest() {
        if (score > bestScore) {
            bestScore = score;
            bestScoreSpan.textContent = bestScore;
            try { localStorage.setItem('snake_best_v2', bestScore); } catch (e) {}
        }
    }

    function init() {
        const startX = Math.floor(COLS / 4);
        const startY = Math.floor(ROWS / 2);
        snake = [
            { x: startX + 2, y: startY },
            { x: startX + 1, y: startY },
            { x: startX, y: startY }
        ];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        score = 0;
        particles = [];
        currentScoreSpan.textContent = '0';
        spawnFood();
        lastMoveTime = performance.now();
    }

    function spawnFood() {
        const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        const free = [];
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (!occupied.has(`${x},${y}`)) free.push({ x, y });
            }
        }
        if (free.length === 0) {
            setGameState('gameover');
            saveBest();
            return;
        }
        food = free[Math.floor(Math.random() * free.length)];
    }

    function addParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.5;
            const spd = 1.5 + Math.random() * 3;
            particles.push({
                x: x * GRID + GRID / 2,
                y: y * GRID + GRID / 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1,
                decay: 0.02 + Math.random() * 0.04,
                size: 2.5 + Math.random() * 2.5
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function update() {
        if (gameState !== 'playing') return;

        dir = { ...nextDir };
        const head = snake[0];
        const newHead = { x: head.x + dir.x, y: head.y + dir.y };

        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
            endGame();
            return;
        }
        if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            endGame();
            return;
        }

        snake.unshift(newHead);
        if (food && newHead.x === food.x && newHead.y === food.y) {
            score += 10;
            currentScoreSpan.textContent = score;
            addParticles(food.x, food.y);
            spawnFood();
        } else {
            snake.pop();
        }

        if (snake.length >= COLS * ROWS) {
            saveBest();
            setGameState('gameover');
        }
    }

    function endGame() {
        setGameState('gameover');
        saveBest();
        if (snake.length) addParticles(snake[0].x, snake[0].y);
    }

    function setGameState(newState) {
        const prevState = gameState;
        gameState = newState;

        if (newState === 'playing' && prevState === 'paused') {
            lastMoveTime = performance.now();
        }
        if (newState === 'playing' && prevState === 'idle') {
            lastMoveTime = performance.now();
        }
        updateUI();
    }

    function updateUI() {
        switch (gameState) {
            case 'idle':
                restartBtn.textContent = '开始游戏';
                pauseBtn.style.display = 'none';
                pauseBtn.classList.remove('resume');
                break;
            case 'playing':
                restartBtn.textContent = '重新开始';
                pauseBtn.style.display = 'inline-block';
                pauseBtn.textContent = '⏸ 暂停';
                pauseBtn.classList.remove('resume');
                break;
            case 'paused':
                restartBtn.textContent = '重新开始';
                pauseBtn.style.display = 'inline-block';
                pauseBtn.textContent = '▶ 继续';
                pauseBtn.classList.add('resume');
                break;
            case 'gameover':
                restartBtn.textContent = '重新开始';
                pauseBtn.style.display = 'none';
                pauseBtn.classList.remove('resume');
                break;
        }
    }

    function drawRoundedRect(x, y, w, h, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.arcTo(x + w, y, x + w, y + radius, radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        ctx.lineTo(x + radius, y + h);
        ctx.arcTo(x, y + h, x, y + h - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    function draw() {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, SIZE, SIZE);

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * GRID, 0);
            ctx.lineTo(i * GRID, SIZE);
            ctx.stroke();
            ctx.moveTo(0, i * GRID);
            ctx.lineTo(SIZE, i * GRID);
            ctx.stroke();
        }

        if (gameState !== 'idle') {
            if (food) {
                const fx = food.x * GRID,
                    fy = food.y * GRID;
                ctx.fillStyle = '#ff4d4d';
                ctx.shadowColor = '#ff4d4d';
                ctx.shadowBlur = 12;
                ctx.fillRect(fx, fy, GRID, GRID);
                ctx.fillStyle = 'rgba(255,180,180,0.7)';
                ctx.fillRect(fx + 2, fy + 2, GRID - 4, GRID - 4);
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            }

            snake.forEach((seg, idx) => {
                const sx = seg.x * GRID,
                    sy = seg.y * GRID;
                const isHead = idx === 0;
                ctx.fillStyle = isHead ? '#4caf50' : '#2e7d32';
                if (isHead) {
                    ctx.shadowColor = '#4caf50';
                    ctx.shadowBlur = 10;
                }
                ctx.fillRect(sx, sy, GRID, GRID);
                ctx.strokeStyle = isHead ? '#81c784' : '#1b5e20';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(sx + 0.5, sy + 0.5, GRID - 1, GRID - 1);
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            });

            particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = '#ffcc80';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        if (gameState === 'idle') {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            drawRoundedRect(startBtnX + 3, startBtnY + 3, startBtnW, startBtnH, startBtnRadius);
            ctx.fill();

            const btnGrad = ctx.createLinearGradient(startBtnX, startBtnY, startBtnX, startBtnY + startBtnH);
            btnGrad.addColorStop(0, '#5cbf62');
            btnGrad.addColorStop(1, '#388e3c');
            ctx.fillStyle = btnGrad;
            ctx.shadowColor = 'rgba(76,175,80,0.7)';
            ctx.shadowBlur = 20;
            drawRoundedRect(startBtnX, startBtnY, startBtnW, startBtnH, startBtnRadius);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            drawRoundedRect(startBtnX, startBtnY, startBtnW, startBtnH, startBtnRadius);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;
            ctx.fillText('开始游戏', SIZE / 2, startBtnY + startBtnH / 2);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
        }

        if (gameState === 'paused') {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, SIZE, SIZE);

            const bar1X = pauseIconCX - pauseBarGap / 2 - pauseBarW;
            const bar2X = pauseIconCX + pauseBarGap / 2;
            const barY = pauseIconCY - pauseBarH / 2;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255,255,255,0.6)';
            ctx.shadowBlur = 14;
            drawRoundedRect(bar1X, barY, pauseBarW, pauseBarH, pauseBarRadius);
            ctx.fill();
            drawRoundedRect(bar2X, barY, pauseBarW, pauseBarH, pauseBarRadius);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('已暂停', SIZE / 2, pauseIconCY + pauseBarH / 2 + 28);
            ctx.fillStyle = '#ccc';
            ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.fillText('点击屏幕或按空格键继续', SIZE / 2, pauseIconCY + pauseBarH / 2 + 52);
            ctx.textAlign = 'start';
        }

        if (gameState === 'gameover') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, SIZE, SIZE);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 10;
            ctx.fillText('游戏结束', SIZE / 2, SIZE / 2 - 15);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffc107';
            ctx.font = '18px "PingFang SC"';
            ctx.fillText('得分 ' + score, SIZE / 2, SIZE / 2 + 30);
            ctx.fillStyle = '#ccc';
            ctx.font = '13px "PingFang SC"';
            ctx.fillText('按空格键或点击按钮重新开始', SIZE / 2, SIZE / 2 + 58);
            ctx.textAlign = 'start';
        }
    }

    function loop(ts) {
        if (gameState === 'playing') {
            if (ts - lastMoveTime >= moveInterval) {
                update();
                lastMoveTime = ts;
            }
            updateParticles();
        }

        if (gameState === 'gameover' && particles.length > 0) {
            updateParticles();
        }

        draw();
        animationId = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (animationId) cancelAnimationFrame(animationId);
        lastMoveTime = performance.now();
        animationId = requestAnimationFrame(loop);
    }

    function stopLoop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    function setDirection(dx, dy) {
        if (gameState !== 'playing') return;
        if (dx === 0 && dy === 0) return;
        if (dx === -dir.x && dy === -dir.y && snake.length > 1) return;
        nextDir = { x: dx, y: dy };
    }

    function startFromIdle() {
        stopLoop();
        saveBest();
        init();
        setGameState('playing');
        updateUI();
        startLoop();
    }

    function resetToIdle() {
        stopLoop();
        saveBest();
        snake = [];
        food = null;
        score = 0;
        particles = [];
        currentScoreSpan.textContent = '0';
        setGameState('idle');
        startLoop();
    }

    function togglePause() {
        if (gameState === 'playing') {
            setGameState('paused');
        } else if (gameState === 'paused') {
            setGameState('playing');
        }
    }

    function setSpeedMode(interval) {
        moveInterval = interval;
        modeButtons.forEach(btn => {
            const speed = parseInt(btn.dataset.speed, 10);
            if (speed === interval) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const spd = parseInt(btn.dataset.speed, 10);
            setSpeedMode(spd);
        });
    });

    function setBgColor(color) {
        bgColor = color;
        canvas.style.backgroundColor = color;
        colorSwatches.forEach(sw => {
            sw.classList.remove('active');
            if (sw.dataset.color === color) sw.classList.add('active');
        });
        customColorInput.value = color;
    }

    colorSwatches.forEach(sw => {
        sw.addEventListener('click', (e) => {
            if (sw.classList.contains('swatch-custom')) return;
            const color = sw.dataset.color;
            if (color) setBgColor(color);
        });
    });

    customColorInput.addEventListener('input', () => {
        setBgColor(customColorInput.value);
        colorSwatches.forEach(s => s.classList.remove('active'));
    });

    function getCanvasCoords(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = SIZE / rect.width;
        const scaleY = SIZE / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function isInStartBtn(canvasX, canvasY) {
        return (
            canvasX >= startBtnX &&
            canvasX <= startBtnX + startBtnW &&
            canvasY >= startBtnY &&
            canvasY <= startBtnY + startBtnH
        );
    }

    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
            e.preventDefault();
        }

        if (key === ' ') {
            if (gameState === 'idle') {
                startFromIdle();
            } else if (gameState === 'playing' || gameState === 'paused') {
                togglePause();
            } else if (gameState === 'gameover') {
                resetToIdle();
            }
            return;
        }

        if (gameState !== 'playing') return;

        if (key === 'arrowup' || key === 'w') setDirection(0, -1);
        else if (key === 'arrowdown' || key === 's') setDirection(0, 1);
        else if (key === 'arrowleft' || key === 'a') setDirection(-1, 0);
        else if (key === 'arrowright' || key === 'd') setDirection(1, 0);
    });

    document.getElementById('dpadUp').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setDirection(0, -1);
    });
    document.getElementById('dpadDown').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setDirection(0, 1);
    });
    document.getElementById('dpadLeft').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setDirection(-1, 0);
    });
    document.getElementById('dpadRight').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        setDirection(1, 0);
    });

    restartBtn.addEventListener('click', () => {
        if (gameState === 'idle') {
            startFromIdle();
        } else {
            resetToIdle();
        }
    });

    pauseBtn.addEventListener('click', () => {
        togglePause();
    });

    canvas.addEventListener('click', (e) => {
        if (gameState === 'idle') {
            const coords = getCanvasCoords(e.clientX, e.clientY);
            if (isInStartBtn(coords.x, coords.y)) {
                startFromIdle();
            }
        } else if (gameState === 'paused') {
            togglePause();
        } else if (gameState === 'gameover') {
            resetToIdle();
        }
    });

    let mouseDown = null;
    let mouseDownTime = 0;
    canvas.addEventListener('mousedown', (e) => {
        mouseDown = { x: e.clientX, y: e.clientY };
        mouseDownTime = Date.now();
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!mouseDown) return;
        const dx = e.clientX - mouseDown.x;
        const dy = e.clientY - mouseDown.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const elapsed = Date.now() - mouseDownTime;
        const maxDist = Math.max(absDx, absDy);
        mouseDown = null;

        if (maxDist < 8 && elapsed < 400) {
            return;
        }
        if (maxDist >= 15 && gameState === 'playing') {
            if (absDx > absDy) setDirection(dx > 0 ? 1 : -1, 0);
            else setDirection(0, dy > 0 ? 1 : -1);
        }
    });

    let touchStart = null;
    let touchStartTime = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        touchStartTime = Date.now();
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!touchStart) {
            if (gameState === 'gameover') resetToIdle();
            if (gameState === 'paused') togglePause();
            touchStart = null;
            return;
        }
        const end = e.changedTouches[0];
        const dx = end.clientX - touchStart.x;
        const dy = end.clientY - touchStart.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const elapsed = Date.now() - touchStartTime;
        const maxDist = Math.max(absDx, absDy);

        if (maxDist < 15 && elapsed < 400) {
            if (gameState === 'idle') {
                const coords = getCanvasCoords(end.clientX, end.clientY);
                if (isInStartBtn(coords.x, coords.y)) {
                    startFromIdle();
                }
            } else if (gameState === 'paused') {
                togglePause();
            } else if (gameState === 'gameover') {
                resetToIdle();
            }
        } else if (maxDist >= 20 && gameState === 'playing') {
            if (absDx > absDy) setDirection(dx > 0 ? 1 : -1, 0);
            else setDirection(0, dy > 0 ? 1 : -1);
        }
        touchStart = null;
    });

    const resizeCanvas = () => {
        const container = canvas.parentElement;
        if (container.clientWidth < SIZE) {
            canvas.style.width = container.clientWidth + 'px';
            canvas.style.height = container.clientWidth + 'px';
        } else {
            canvas.style.width = SIZE + 'px';
            canvas.style.height = SIZE + 'px';
        }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    loadBest();
    setBgColor('#000000');
    setSpeedMode(130);
    gameState = 'idle';
    updateUI();
    startLoop();
})();
