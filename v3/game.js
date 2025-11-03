// ===================================
// I. TEMEL TANIMLAMALAR ve AYARLAR
// ===================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Renkler
const C_BLACK = '#000000';
const C_WHITE = '#FFFFFF';
const C_RED = '#EE2A35';    
const C_GREEN = '#009736';  
const C_YELLOW = '#FFD700'; 
const C_ORANGE = '#FFA500'; 
const C_BLUE_LIGHT = '#87CEEB'; 
const C_WATER = '#00BFFF'; 
const C_DIAPER = '#CCCCFF'; 
const C_FROZEN = 'rgba(173, 216, 230, 0.5)'; 
const C_SEA_SURFACE = '#0066CC'; 
const C_SEA_MID = '#004C99';     
const C_SEA_DEEP = '#003366';    
const C_SAND_LIGHT = '#F0DFA2'; 
const C_SAND_MEDIUM = '#E0CD8A'; 
const C_BROWN_DARK = '#8B4513';
const C_GREY_LIGHT = '#DDDDDD';
const C_GREY_MEDIUM = '#AAAAAA';
const C_GREY_DARK = '#666666';
const C_SKIN = '#FCD2A9';   
const C_DAMAGE_HINT = 'rgba(255, 0, 0, 0.5)';

// Oyun Parametreleri
const PLAYER_SPEED = 4.5; // Hız Artırıldı
const PLAYER_MAX_HEALTH = 3; // Can Sistemi
const ENEMY_SPAWN_INTERVAL = 90;
const ENEMY_SPAWN_DELAY = 180;
const ENEMY_SPEED_BASE = 2.0; 
const COAST_APPEAR_TIME = 60 * 60; 
const ENEMY_HEALTH_WATER = 3; 
const FREEZE_DURATION = 60; 
const DAMAGE_FLASH_DURATION = 15; 

// Oyun Durumu Değişkenleri
let playerShip;
let enemyShips = [];
let projectiles = [];
let pickups = [];
let backgroundObjects = [];
let keys = {};
let gameState = 'ready'; 
let score = 0;
let frameCount = 0;
let ammoCount = 5; 
let syringeAmmoCount = 0; 
let explosions = [];      
let coastYPosition = -300; 
let coastReachedThreshold = false;
let backgroundScrollSpeed = 1.0; 
let damageFlashTimer = 0; 


// ===================================
// II. KONTROL VE BAŞLATMA
// ===================================

document.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'Space' && gameState === 'playing') fireWater();
    if (e.code === 'KeyB' && gameState === 'playing') fireDiaper(); 
    if (e.code === 'KeyN' && gameState === 'playing') fireSyringe(); 
    
    // YENİ: ENTER tuşu ile yeniden başlatma
    if (e.code === 'Enter' && (gameState === 'win' || gameState === 'lose')) {
        resetGame();
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
// handleClicks kaldırıldı, yerine ENTER tuşu kullanılıyor

function resetGame() {
    playerShip = { 
        x: canvas.width / 2, 
        y: canvas.height - 80, 
        width: 60,  
        height: 100, 
        speed: PLAYER_SPEED,
        health: PLAYER_MAX_HEALTH, 
        isInvulnerable: false, 
        invulnerabilityTimer: 0
    };
    enemyShips = [];
    projectiles = [];
    pickups = [];
    explosions = []; 
    score = 0;
    frameCount = 0;
    ammoCount = 5;
    syringeAmmoCount = 0; 
    coastYPosition = -300; 
    coastReachedThreshold = false;
    damageFlashTimer = 0; 
    initializeBackgroundObjects();
    gameState = 'playing';
}

function initializeBackgroundObjects() {
    backgroundObjects = [];
    for (let i = 0; i < 50; i++) { 
        backgroundObjects.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 8 + 5, type: 'rock', speedFactor: Math.random() * 0.7 + 0.3 });
    }
    for (let i = 0; i < 10; i++) { 
        backgroundObjects.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 25 + 15, type: 'fish', speedFactor: Math.random() * 0.8 + 0.2, dirX: Math.random() > 0.5 ? 1 : -1 });
    }
    for (let i = 0; i < 20; i++) {
        backgroundObjects.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, width: Math.random() * 10 + 5, height: Math.random() * 30 + 20, type: 'seaweed', speedFactor: Math.random() * 0.4 + 0.1 });
    }
}


// ===================================
// III. OYUN MEKANİKLERİ
// ===================================

function fireWater() {
    projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 5, height: 15, speed: 8, type: 'water' });
}

function fireDiaper() {
    if (ammoCount > 0) {
        projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 15, height: 15, speed: 5, type: 'diaper' });
        ammoCount--;
    }
}

function fireSyringe() {
    if (syringeAmmoCount > 0) {
        projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 10, height: 30, speed: 10, type: 'syringe' });
        syringeAmmoCount--;
    }
}

function spawnEnemy() {
    enemyShips.push({
        x: Math.random() * (canvas.width - 100) + 50, 
        y: -100, 
        width: 45, 
        height: 80, 
        speed: ENEMY_SPEED_BASE + Math.random() * 1.5,
        health: ENEMY_HEALTH_WATER, 
        isFrozen: false, 
        freezeTimer: 0     
    });
}

function takeDamage() {
    if (!playerShip.isInvulnerable) {
        playerShip.health--;
        damageFlashTimer = DAMAGE_FLASH_DURATION;
        playerShip.isInvulnerable = true;
        playerShip.invulnerabilityTimer = 60; // 1 saniye dokunulmazlık
        
        if (playerShip.health <= 0) {
            gameState = 'lose';
            explosions.push({ x: playerShip.x, y: playerShip.y, radius: 10, maxRadius: 80, stage: 'destruction', timer: 60 });
        }
    }
}


function checkCollisions() {
    // 1. Oyuncu ve Düşman Çarpışması (Can Kaybı)
    enemyShips = enemyShips.filter(enemy => {
        if (
            playerShip.x - playerShip.width / 2 < enemy.x + enemy.width / 2 &&
            playerShip.x + playerShip.width / 2 > enemy.x - enemy.width / 2 &&
            playerShip.y - playerShip.height / 2 < enemy.y + enemy.height / 2 &&
            playerShip.y + playerShip.height / 2 > enemy.y - enemy.height / 2
        ) {
            takeDamage(); 
            
            // Çarpan düşmanı batır
            enemy.health = 0; 
            return false;
        }
        return true;
    });

    // 2. Mermi ve Düşman Çarpışması
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        let removedProjectile = false;
        
        for (let j = enemyShips.length - 1; j >= 0; j--) {
            const enemy = enemyShips[j];

            if (
                p.x - p.width / 2 < enemy.x + enemy.width / 2 &&
                p.x + p.width / 2 > enemy.x - enemy.width / 2 &&
                p.y - p.height / 2 < enemy.y + enemy.height / 2 &&
                p.y + p.height / 2 > enemy.y - enemy.height / 2
            ) {
                if (p.type === 'water') {
                    enemy.health--; 
                    enemy.freezeTimer = FREEZE_DURATION; 
                    score += 50; 
                    explosions.push({ x: enemy.x, y: enemy.y, radius: 2, maxRadius: 15, stage: 'hit_water', timer: 5 }); 
                } else if (p.type === 'diaper') {
                    enemy.health = 0; 
                    score += 500; 
                    explosions.push({ x: enemy.x, y: enemy.y, radius: 5, maxRadius: 30, stage: 'hit_diaper', timer: 10 }); 
                } else if (p.type === 'syringe') {
                    enemy.health = 0; 
                    score += 1000;
                }
                
                projectiles.splice(i, 1);
                removedProjectile = true;
                break;
            }
        }
        if (removedProjectile) continue;
    }
    
    // 3. Batık Düşman ve Ödül Bırakma
    enemyShips = enemyShips.filter(enemy => {
        if (enemy.health <= 0) {
            explosions.push({ x: enemy.x, y: enemy.y, radius: 10, maxRadius: 60, stage: 'destruction', timer: 30 });

            if (Math.random() < 0.33) { // %33 Şansla İlaç
                pickups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: 'syringe_ammo' });
            } else {
                pickups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: 'diaper_ammo' });
            }
            return false;
        }
        return true;
    });
}


// ===================================
// IV. GÜNCELLEME DÖNGÜLERİ
// ===================================

function updatePlayer() {
    if (keys['ArrowUp']) playerShip.y -= playerShip.speed;
    if (keys['ArrowDown']) playerShip.y += playerShip.speed;
    if (keys['ArrowLeft']) playerShip.x -= playerShip.speed;
    if (keys['ArrowRight']) playerShip.x += playerShip.speed;

    playerShip.x = Math.max(playerShip.width / 2, Math.min(canvas.width - playerShip.width / 2, playerShip.x));
    playerShip.y = Math.max(playerShip.height / 2 + 40, Math.min(canvas.height - playerShip.height / 2, playerShip.y)); 

    if (playerShip.isInvulnerable) {
        playerShip.invulnerabilityTimer--;
        if (playerShip.invulnerabilityTimer <= 0) {
            playerShip.isInvulnerable = false;
        }
    }
    if (damageFlashTimer > 0) {
        damageFlashTimer--;
    }


    if (coastReachedThreshold && playerShip.y - playerShip.height / 2 <= coastYPosition + 40) { 
        gameState = 'win';
    }
}

function updateEnemies() {
    if (frameCount > ENEMY_SPAWN_DELAY && frameCount % ENEMY_SPAWN_INTERVAL === 0) { 
        spawnEnemy();
    }

    enemyShips.forEach(enemy => {
        if (enemy.freezeTimer > 0) {
            enemy.freezeTimer--;
            enemy.isFrozen = true;
            return; 
        } else {
            enemy.isFrozen = false;
        }

        if (!enemy.isFrozen) {
            const dx = playerShip.x - enemy.x;
            const dy = playerShip.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed * 0.7; 
                enemy.y += (dy / distance) * enemy.speed * 1.3; 
            } else {
                enemy.y += enemy.speed; 
            }
        }
    });

    enemyShips = enemyShips.filter(enemy => enemy.y < canvas.height + enemy.height);
}

function updateProjectiles() {
    projectiles.forEach(p => {
        if (p.type === 'syringe') {
            let target = null;
            let minDistance = Infinity;
            
            enemyShips.forEach(enemy => {
                const dx = enemy.x - p.x;
                const dy = enemy.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDistance) {
                    minDistance = dist;
                    target = enemy;
                }
            });
            
            if (target) {
                const dx = target.x - p.x;
                const dy = target.y - p.y;
                const angle = Math.atan2(dy, dx);
                
                p.x += Math.cos(angle) * p.speed;
                p.y += Math.sin(angle) * p.speed;
            } else {
                p.y -= p.speed;
            }
        } else {
            p.y -= p.speed;
        }
    });
    projectiles = projectiles.filter(p => p.y > -p.height);
}


function updatePickups() {
    pickups = pickups.filter(p => {
        p.y += 1.5; 
        
        if (
            playerShip.x - playerShip.width / 2 < p.x + p.width / 2 &&
            playerShip.x + playerShip.width / 2 > p.x - p.width / 2 &&
            playerShip.y - playerShip.height / 2 < p.y + p.height / 2 &&
            playerShip.y + playerShip.height / 2 > p.y - p.height / 2
        ) {
            if (p.type === 'diaper_ammo') {
                ammoCount++; 
            } else if (p.type === 'syringe_ammo') {
                syringeAmmoCount++; 
            }
            score += 200;
            return false; 
        }
        
        return p.y < canvas.height + 50; 
    });
}

function updateExplosions() {
    explosions = explosions.filter(exp => {
        exp.timer--;
        if (exp.stage === 'destruction') {
            exp.radius += (exp.maxRadius - exp.radius) * 0.1; 
        } else if (exp.stage.startsWith('hit')) {
            exp.radius += 3;
        }
        
        return exp.timer > 0;
    });
}


function updateBackground() {
    if (!coastReachedThreshold) {
        // Paralaks Kaydırma Hızı
        backgroundScrollSpeed = 2.0 + playerShip.speed * 0.5;
    } else {
        backgroundScrollSpeed = 0.5;
    }
    
    backgroundObjects.forEach(obj => {
        obj.y += backgroundScrollSpeed * obj.speedFactor;
        
        if (obj.type === 'fish') {
            obj.x += 0.5 * obj.dirX;
            if (obj.x > canvas.width + 50 || obj.x < -50) obj.dirX *= -1; 
        }
        if (obj.y > canvas.height + 50) {
            obj.y = -50;
            obj.x = Math.random() * canvas.width;
        }
    });
}

function updateCoast() {
    if (frameCount >= COAST_APPEAR_TIME && !coastReachedThreshold) {
        coastYPosition += 1; 
        if (coastYPosition >= 0) { 
            coastYPosition = 0; 
            coastReachedThreshold = true;
        }
    }
}


// ===================================
// V. DETAYLI ÇİZİM FONKSİYONLARI (Render)
// ===================================

function drawPlayerShipDetailed() {
    
    if (damageFlashTimer > 0 && damageFlashTimer % 5 < 3) {
        ctx.fillStyle = C_DAMAGE_HINT;
        ctx.beginPath();
        ctx.arc(playerShip.x, playerShip.y, playerShip.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const x = playerShip.x - playerShip.width / 2;
    const y = playerShip.y - playerShip.height / 2;
    const w = playerShip.width;
    const h = playerShip.height;
    
    // Dokunulmazlık şeffaflığı
    if (playerShip.isInvulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(frameCount / 5) * 0.2; 
    }
    
    // Gemi Gövdesi 
    ctx.fillStyle = C_GREY_LIGHT;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.9); 
    ctx.lineTo(x + w, y + h * 0.9); 
    ctx.lineTo(x + w * 0.95, y + h); 
    ctx.lineTo(x + w * 0.05, y + h); 
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_GREY_MEDIUM; 
    ctx.beginPath(); 
    ctx.moveTo(x, y + h * 0.85);
    ctx.lineTo(x + w, y + h * 0.85);
    ctx.lineTo(x + w, y + h * 0.9);
    ctx.lineTo(x, y + h * 0.9);
    ctx.closePath();
    ctx.fill();

    // Güverte, Kabin, Konteynerler, Bayrak
    ctx.fillStyle = C_GREY_DARK;
    ctx.fillRect(x + w * 0.05, y + h * 0.6, w * 0.9, h * 0.25);
    ctx.fillStyle = C_GREY_LIGHT;
    ctx.fillRect(x + w * 0.25, y + h * 0.2, w * 0.5, h * 0.4);
    ctx.fillStyle = C_GREY_DARK; 
    ctx.fillRect(x + w * 0.3, y + h * 0.25, w * 0.4, h * 0.2);
    ctx.fillStyle = C_GREY_MEDIUM;
    ctx.fillRect(x + w * 0.7, y + h * 0.05, w * 0.15, h * 0.2);
    
    const containerW = w * 0.25;
    const containerH = h * 0.15;
    const containerYOffset = y + h * 0.65;
    ctx.fillStyle = C_YELLOW;
    ctx.fillRect(x + w * 0.1, containerYOffset, containerW, containerH);
    ctx.fillRect(x + w * 0.38, containerYOffset, containerW, containerH);
    ctx.fillRect(x + w * 0.66, containerYOffset, containerW, containerH);
    ctx.fillStyle = C_RED;
    ctx.fillRect(x + w * 0.25, containerYOffset - containerH, containerW, containerH);
    ctx.fillRect(x + w * 0.53, containerYOffset - containerH, containerW, containerH);
    
    ctx.fillStyle = C_BLACK;
    ctx.font = '12px Arial, sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText('SUMUD', x + w / 2, y + h * 0.8); 
    
    ctx.fillStyle = C_BLACK;
    ctx.fillRect(x + w - 10, y - 40, 3, 50); 
    const flagW = 35;
    const flagH = 25;
    const flagX = x + w - 10;
    const flagY = y - 40 + Math.sin(frameCount / 15) * 3; 

    ctx.fillStyle = C_BLACK;
    ctx.fillRect(flagX, flagY, flagW, flagH / 3);
    ctx.fillStyle = C_WHITE;
    ctx.fillRect(flagX, flagY + flagH / 3, flagW, flagH / 3);
    ctx.fillStyle = C_GREEN;
    ctx.fillRect(flagX, flagY + flagH * 2 / 3, flagW, flagH / 3);
    ctx.fillStyle = C_RED; 
    ctx.beginPath();
    ctx.moveTo(flagX, flagY); 
    ctx.lineTo(flagX, flagY + flagH); 
    ctx.lineTo(flagX - 12, flagY + flagH / 2); 
    ctx.fill();

    if (playerShip.isInvulnerable) {
        ctx.globalAlpha = 1.0;
    }
}

function drawEnemyShipDetailed(enemy) {
    const x = enemy.x - enemy.width / 2;
    const y = enemy.y - enemy.height / 2;
    const w = enemy.width;
    const h = enemy.height;
    
    const healthPercent = enemy.health / ENEMY_HEALTH_WATER;
    ctx.fillStyle = healthPercent > 0.6 ? C_GREEN : (healthPercent > 0.3 ? C_YELLOW : C_RED);
    ctx.fillRect(x + w * 0.1, y - 10, w * 0.8 * healthPercent, 5);
    
    ctx.fillStyle = '#A00000'; 
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.8);
    ctx.lineTo(x + w, y + h * 0.8);
    ctx.lineTo(x + w * 0.9, y + h); 
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#600000'; 
    ctx.fillRect(x, y + h * 0.75, w, h * 0.05);

    ctx.fillStyle = C_BLACK; 
    ctx.fillRect(x + w * 0.35, y + h * 0.2, w * 0.3, h * 0.5);
    ctx.fillStyle = C_GREY_DARK; 
    ctx.fillRect(x + w * 0.4, y + h * 0.25, w * 0.2, h * 0.3);

    ctx.fillStyle = C_GREY_LIGHT;
    ctx.fillRect(x + w * 0.475, y + h * 0.1, w * 0.05, h * 0.1);
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.05, 7, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.isFrozen) {
        ctx.fillStyle = C_FROZEN;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, w / 2 + 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawDetailedBackgroundObject(obj) {
    const alpha = 0.5 * obj.speedFactor; 
    if (obj.type === 'rock') {
        ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.size * Math.cos(0), obj.y + obj.size * Math.sin(0));
        for (let i = 1; i <= 6; i++) {
            const angle = (Math.PI / 3) * i;
            const radius = obj.size * (0.8 + Math.random() * 0.4); 
            ctx.lineTo(obj.x + radius * Math.cos(angle), obj.y + radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
    } else if (obj.type === 'fish') {
        ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(obj.x, obj.y, obj.size, obj.size / 2, Math.PI / 10 * obj.dirX, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(obj.x - obj.size * Math.cos(Math.PI / 10 * obj.dirX), obj.y - obj.size / 2 * Math.sin(Math.PI / 10 * obj.dirX)); 
        ctx.lineTo(obj.x - obj.size * 1.5 * Math.cos(Math.PI / 10 * obj.dirX) - obj.size / 3 * obj.dirX, obj.y - obj.size / 2 * Math.sin(Math.PI / 10 * obj.dirX) + obj.size / 2);
        ctx.lineTo(obj.x - obj.size * 1.5 * Math.cos(Math.PI / 10 * obj.dirX) - obj.size / 3 * obj.dirX, obj.y - obj.size / 2 * Math.sin(Math.PI / 10 * obj.dirX) - obj.size / 2);
        ctx.closePath();
        ctx.fill();
    } else if (obj.type === 'seaweed') {
        ctx.fillStyle = `rgba(50, 150, 80, ${alpha * 0.7})`; 
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y + obj.height);
        ctx.quadraticCurveTo(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.x, obj.y);
        ctx.quadraticCurveTo(obj.x - obj.width / 2, obj.y + obj.height / 2, obj.x, obj.y + obj.height);
        ctx.fill();
    }
}

function drawGazzeCoastDetailed() {
    if (coastYPosition > canvas.height) return;

    ctx.fillStyle = C_SAND_MEDIUM;
    ctx.beginPath();
    ctx.moveTo(0, coastYPosition + 30);
    ctx.lineTo(canvas.width, coastYPosition + 50);
    
    ctx.quadraticCurveTo(canvas.width * 0.9, coastYPosition + 120, 
                         canvas.width * 0.7, coastYPosition + 100);
    ctx.quadraticCurveTo(canvas.width * 0.5, coastYPosition + 150, 
                         canvas.width * 0.3, coastYPosition + 110);
    ctx.quadraticCurveTo(canvas.width * 0.1, coastYPosition + 80, 
                         0, coastYPosition + 100);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_SAND_LIGHT;
    ctx.beginPath();
    ctx.arc(canvas.width * 0.2, coastYPosition + 70, 25, 0, Math.PI * 2);
    ctx.arc(canvas.width * 0.6, coastYPosition + 90, 30, 0, Math.PI * 2);
    ctx.arc(canvas.width * 0.85, coastYPosition + 80, 20, 0, Math.PI * 2);
    ctx.fill();

    // Font düzeltmesi uygulandı
    ctx.fillStyle = C_BLACK;
    ctx.font = 'bold 36px "Arial Black", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText('GAZZE', canvas.width / 2, coastYPosition + 60);

    const jumpCycle = Math.sin(frameCount / 10); 
    const waveCycle = Math.sin(frameCount / 8);

    function drawDetailedPerson(px, py, isChild, waveHand) {
        const scale = isChild ? 0.7 : 1; 
        const headRadius = 7 * scale;
        const bodyH = 20 * scale;
        const bodyW = 12 * scale;
        const legH = 15 * scale;
        const armLength = 18 * scale;
        const armWidth = 4 * scale;
        
        const jumpOffset = jumpCycle > 0 ? jumpCycle * (isChild ? 8 : 4) : 0; 
        py -= jumpOffset; 

        ctx.fillStyle = isChild ? C_BLUE_LIGHT : C_GREEN; 
        ctx.beginPath();
        ctx.ellipse(px, py - headRadius - bodyH / 2 - legH, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = C_SKIN;
        ctx.beginPath();
        ctx.arc(px, py - headRadius - bodyH - legH, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = C_BROWN_DARK;
        ctx.beginPath();
        ctx.arc(px, py - headRadius - bodyH - legH - headRadius * 0.5, headRadius * 0.8, 0, Math.PI, true);
        ctx.fill();

        ctx.fillStyle = C_BROWN_DARK; 
        ctx.fillRect(px - bodyW/2 + 2, py - legH, bodyW / 2 - 4, legH);
        ctx.fillRect(px + 2, py - legH, bodyW / 2 - 4, legH);

        ctx.fillStyle = C_SKIN;
        if (waveHand) {
            ctx.save();
            ctx.translate(px + bodyW/2 + 2, py - headRadius - bodyH + 10);
            ctx.rotate(waveCycle * 0.5); 
            ctx.fillRect(0, -armWidth / 2, armLength, armWidth);
            ctx.restore();
        } else {
            ctx.fillRect(px + bodyW/2 + 2, py - headRadius - bodyH + 10, armLength, armWidth); 
            ctx.fillRect(px - bodyW/2 - 2 - armLength, py - headRadius - bodyH + 10, armLength, armWidth); 
        }
    }

    const peopleY = coastYPosition + 70; 
    if (peopleY > 0) { 
        drawDetailedPerson(100, peopleY, true, true);  
        drawDetailedPerson(250, peopleY, false, false); 
        drawDetailedPerson(400, peopleY, true, true);  
        drawDetailedPerson(550, peopleY, true, false);  
        drawDetailedPerson(700, peopleY, false, true); 
        drawDetailedPerson(180, peopleY, true, true);
        drawDetailedPerson(320, peopleY, false, false);
        drawDetailedPerson(630, peopleY, true, true);
    }
}

function drawExplosions() {
    explosions.forEach(exp => {
        ctx.save();
        ctx.globalAlpha = exp.timer / 30; 
        
        if (exp.stage === 'destruction') {
            ctx.fillStyle = C_ORANGE;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = C_RED;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (exp.stage === 'hit_water') {
            ctx.fillStyle = C_BLUE_LIGHT;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (exp.stage === 'hit_diaper') {
            ctx.fillStyle = C_WHITE;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

function drawHUD() {
    ctx.fillStyle = '#ADFF2F';
    ctx.font = '24px Arial, sans-serif'; 
    ctx.textAlign = 'left';
    ctx.fillText(`SKOR: ${Math.floor(score)}`, 20, canvas.height - 20); 

    // CAN GÖSTERGESİ (Sol üst)
    ctx.fillStyle = C_WHITE;
    ctx.font = '24px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CAN: ', 20, 30);
    
    for (let i = 0; i < PLAYER_MAX_HEALTH; i++) {
        ctx.fillStyle = i < playerShip.health ? C_RED : C_GREY_DARK;
        ctx.fillRect(80 + i * 25, 10, 20, 20); 
    }

    // MÜHİMMAT GÖSTERGESİ (Sağ alt)
    ctx.fillStyle = C_DIAPER; 
    ctx.font = '18px Arial, sans-serif'; 
    ctx.textAlign = 'right';
    ctx.fillText(`BEZ: ${ammoCount}`, canvas.width - 20, canvas.height - 40);
    
    ctx.fillStyle = C_RED; 
    ctx.font = '18px Arial, sans-serif'; 
    ctx.textAlign = 'right';
    ctx.fillText(`İLAÇ: ${syringeAmmoCount}`, canvas.width - 20, canvas.height - 20);
    
    ctx.fillStyle = C_WHITE;
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Su: [Space] | Bez: [B] | İlaç: [N]', canvas.width / 2, canvas.height - 20); 
}

function drawMessage() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = C_WHITE;
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    
    let mainMessage = '';
    
    if (gameState === 'lose') {
        mainMessage = "Yenildin... Allah rızası için tekrar dene!";
        ctx.fillStyle = C_RED;
    } else if (gameState === 'win') {
        mainMessage = "BAŞARDIN! GAZZE'YE ULAŞILDI!";
        ctx.fillStyle = C_GREEN;
    }

    ctx.fillText(mainMessage, canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = C_YELLOW;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText(`Skor: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 30);

    ctx.fillStyle = C_WHITE;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText("[ENTER] Tuşuna Basarak Yeniden Başla", canvas.width / 2, canvas.height / 2 + 90);
}


function drawAll() {
    // 1. Arka Plan
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, C_SEA_SURFACE);
    gradient.addColorStop(0.3, C_SEA_MID);
    gradient.addColorStop(0.7, C_SEA_DEEP);
    gradient.addColorStop(1, '#001A33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Akıcı Arka Plan Objeleri
    backgroundObjects.forEach(drawDetailedBackgroundObject); // Hata çözüldü: Tanım burada kullanılabilir.
    
    // 3. Kıyı
    drawGazzeCoastDetailed();
    
    // 4. Düşman Gemileri
    enemyShips.forEach(drawEnemyShipDetailed);
    
    // 5. Patlamalar ve Vuruş Efektleri
    drawExplosions();
    
    // 6. Mermiler
    projectiles.forEach(p => {
        if (p.type === 'water') {
            ctx.fillStyle = C_WATER;
            ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
        } else if (p.type === 'diaper') {
            ctx.fillStyle = C_DIAPER;
            ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
        } else if (p.type === 'syringe') {
            ctx.fillStyle = C_RED;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - p.height/2); 
            ctx.lineTo(p.x + p.width/2, p.y + p.height/2);
            ctx.lineTo(p.x - p.width/2, p.y + p.height/2);
            ctx.closePath();
            ctx.fill();
        }
    });

    // 7. Ödüller
    pickups.forEach(p => {
        ctx.fillStyle = p.type === 'diaper_ammo' ? C_DIAPER : C_RED;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C_BLACK;
        ctx.font = '14px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.type === 'diaper_ammo' ? 'B' : 'N', p.x, p.y + 5); 
    });

    // 8. Oyuncu Gemisi
    drawPlayerShipDetailed();
    
    // 9. HUD
    drawHUD();
}


// ===================================
// VI. ANA DÖNGÜ VE BAŞLATMA
// ===================================

function gameLoop() {
    frameCount++;

    if (gameState === 'playing') {
        updateCoast();
        updatePlayer();
        updateEnemies();
        updateProjectiles(); 
        updatePickups(); 
        updateExplosions(); 
        
        checkCollisions(); 
        
        score += 0.16; 

        updateBackground(); // BURADA OLDUĞUNDAN EMİN OLUN

    }
    
    drawAll();   

    if (gameState === 'win' || gameState === 'lose') {
        drawMessage();
    }
    
    requestAnimationFrame(gameLoop);
}

function initGame() {
    canvas.width = 800; 
    canvas.height = 600;
    
    resetGame();
    gameLoop(); 
}
initGame();