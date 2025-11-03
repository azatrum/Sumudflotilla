// ===================================
// I. TEMEL TANIMLAMALAR ve AYARLAR
// ===================================

// Canvas ve Context tanımlamaları (Hatanın düzgün çalışması için yukarı çekildi)
const canvas = document.getElementById('gameCanvas');
// 'gameCanvas' HTML'de tanımlı olacağı için null kontrolü yapmadan kullanıyoruz.
const ctx = canvas.getContext('2d'); 

// ... (Renkler ve diğer sabitler aynı kalacak)
const C_SKIN = '#FCD2A9';   
const C_DAMAGE_HINT = 'rgba(255, 0, 0, 0.5)';

// YENİ 3D GÖRÜNÜM RENKLERİ
const C_PLAYER_SHIP_BODY_TOP = '#A0A0A0';      // Açık gri (üst yüzey)
const C_PLAYER_SHIP_BODY_SIDE = '#707070';     // Orta gri (yan yüzey)
const C_PLAYER_SHIP_HULL_BOTTOM = '#404040';   // Koyu gri (alt gövde)
const C_PLAYER_SHIP_CABIN = '#505050';         // Kabin koyu
const C_ENEMY_SHIP_TOP = '#CC0000';            // Düşman gemisi üst yüzey (kırmızı)
const C_ENEMY_SHIP_SIDE = '#990000';           // Düşman gemisi yan yüzey (daha koyu kırmızı)
const C_WATER_LIGHT = '#00BFFF';               // Suyun parlak kısmı
const C_WATER_DARK = '#0066CC';                // Suyun derin kısmı
const C_FOAM = '#FFFFFF';                      // Dalga köpükleri
const C_SHADOW = 'rgba(0, 0, 0, 0.3)';         // Gölgeler için

// YENİ DALGA ANİMASYONU DEĞİŞKENLERİ
let waveOffset = 0;

// Renkler
const C_BLACK = '#000000';
const C_WHITE = '#FFFFFF';
const C_RED = '#EE2A35';    
const C_GREEN = '#009736';  
const C_YELLOW = '#FFD700'; 
const C_ORANGE = '#FFA500'; 
const C_BLUE_LIGHT = '#87CEEB'; 
const C_WATER = '#00BFFF'; 
const C_DIAPER_CLEAN = '#F0F8FF'; // Yeni: Temiz bez (ana renk)
const C_DIAPER_DIRTY = '#B8860B'; // Yeni: Kirli kahverengi (leke rengi)
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
let playerShip; // Başlangıçta tanımlı değil, initializeGameObjects'te tanımlanacak
let enemyShips = [];
let projectiles = [];
let pickups = [];
let backgroundObjects = [];
let keys = {};
let gameState = 'ready'; // Başlangıç durumu 'ready' olarak ayarlandı
let score = 0;
let frameCount = 0;
let ammoCount = 5; 
let syringeAmmoCount = 0; 
let explosions = [];      
let coastYPosition = -300; 
let coastReachedThreshold = false;
let backgroundScrollSpeed = 1.0; 
let damageFlashTimer = 0; 


// YENİ SES DOSYALARI (Lokal dosya yolu)
const SFX_WATER_FIRE = new Audio();
SFX_WATER_FIRE.src = './water-splash-80537.mp3';

const SFX_EXPLOSION = new Audio();
SFX_EXPLOSION.src = './explosion-fx-343683.mp3';

const SFX_HIT = new Audio();
SFX_HIT.src = './wooden-ship-break-85277.mp3';

const SFX_PICKUP = new Audio();
SFX_PICKUP.src = './get-coin-351945.mp3'; 

SFX_EXPLOSION.volume = 0.5;

// Yeni: Güvenli Ses Çalma Fonksiyonu
function playSound(sfx) {
    if (sfx) {
        sfx.currentTime = 0; // Sesi baştan başlat
        sfx.play().catch(e => {
            // Ses çalma hatasını görmezden geliyoruz (genellikle tarayıcı kısıtlamasıdır)
            // console.warn("Ses çalma hatası (kısıtlama):", e); 
        });
    }
}


// ===================================
// II. KONTROL VE BAŞLATMA
// ===================================

document.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
    if (e.code === 'Space' && gameState === 'playing') fireWater();
    if (e.code === 'KeyB' && gameState === 'playing') fireDiaper(); 
    if (e.code === 'KeyN' && gameState === 'playing') fireSyringe(); 
    
    // ENTER tuşu ile yeniden başlatma
    if (e.code === 'Enter' && (gameState === 'win' || gameState === 'lose')) {
        // Bu kısım butondan bağımsız yeniden başlatma sağlar
        resetGame();
        document.getElementById('startButtonScreen').style.display = 'none'; // Kayıp/Kazanma ekranını da gizle
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// YENİ: Başlangıç/Sıfırlama yardımcı fonksiyonları
function initializeBackgroundObjects() {
    backgroundObjects = [];
    // Derinlik hissi için farklı hız faktörlerine sahip objeler
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

// YENİ: Sadece objeleri ve değişkenleri sıfırlayan fonksiyon (Hata çözümü için)
function initializeGameObjects() {
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
}

function resetGame() {
    initializeGameObjects(); // Objeleri sıfırla
    gameState = 'playing'; // Oyun durumunu başlat
}


// ===================================
// III. OYUN MEKANİKLERİ
// ===================================

function fireWater() {
    projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 5, height: 15, speed: 8, type: 'water' });
    playSound(SFX_WATER_FIRE); // Güvenli ses çalma
}

function fireDiaper() {
    if (ammoCount > 0) {
        projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 15, height: 15, speed: 5, type: 'diaper' });
        ammoCount--;
        playSound(SFX_WATER_FIRE); // Atış sesi
    }
}

function fireSyringe() {
    if (syringeAmmoCount > 0) {
        projectiles.push({ x: playerShip.x, y: playerShip.y - 50, width: 10, height: 30, speed: 10, type: 'syringe' });
        syringeAmmoCount--;
        playSound(SFX_WATER_FIRE); // Atış sesi
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
        playerShip.invulnerabilityTimer = 60; 
        
        if (playerShip.health <= 0) {
            gameState = 'lose';
            explosions.push({ x: playerShip.x, y: playerShip.y, radius: 10, maxRadius: 80, stage: 'destruction', timer: 60 });
            playSound(SFX_EXPLOSION); // Geminin batış sesi
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
            
            enemy.health = 0; 
            playSound(SFX_EXPLOSION); // Düşmanın batış sesi
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
                    playSound(SFX_HIT); // Vuruş sesi
                } else if (p.type === 'diaper') {
                    enemy.health = 0; 
                    score += 500; 
                    explosions.push({ x: enemy.x, y: enemy.y, radius: 5, maxRadius: 30, stage: 'hit_poop', timer: 15 }); 
                    playSound(SFX_EXPLOSION); // Bez patlama sesi
                } else if (p.type === 'syringe') {
                    enemy.health = 0; 
                    score += 1000;
                    playSound(SFX_EXPLOSION); // İlaç patlama sesi
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
            // Batma sesi yukarıda çalıyor.

            if (Math.random() < 0.33) { 
                pickups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: 'syringe_ammo' });
            } else {
                pickups.push({ x: enemy.x, y: enemy.y, width: 30, height: 30, type: 'diaper_ammo' });
            }
            return false;
        }
        return true;
    });
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
            playSound(SFX_PICKUP); // Toplama sesi
            return false; 
        }
        
        return p.y < canvas.height + 50; 
    });
}


// ... (Diğer update fonksiyonları aynı kalacak) ...

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

// updatePickups fonksiyonu yukarı taşındı ve güncellendi.

function updateExplosions() {
    explosions = explosions.filter(exp => {
        exp.timer--;
        if (exp.stage === 'destruction') {
            exp.radius += (exp.maxRadius - exp.radius) * 0.1; 
        } else if (exp.stage.startsWith('hit')) {
            exp.radius += 3;
        } else if (exp.stage === 'hit_poop') {
            exp.radius += 2;
        }
        
        return exp.timer > 0;
    });
}


function updateBackground() {
    // Düzeltildi: Background Scroll Speed doğru hesaplanıyor
    if (!coastReachedThreshold) {
        backgroundScrollSpeed = 1.0 + (playerShip.speed - PLAYER_SPEED) * 0.5; // Hız farkına göre dinamik kaydırma
    } else {
        backgroundScrollSpeed = 0.5;
    }
    
    backgroundObjects.forEach(obj => {
        obj.y += backgroundScrollSpeed * obj.speedFactor;
        
        if (obj.type === 'fish') {
            obj.x += 0.5 * obj.dirX;
            if (obj.x > canvas.width + 50 || obj.x < -50) obj.dirX *= -1; 
        }
        // Nesneler ekran dışına çıktığında yukarıdan rastgele konumda yeniden yaratılıyor
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
    
    if (playerShip.isInvulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(frameCount / 5) * 0.2; 
    }

    // Gemi Gövdesi (3D Benzeri)
    // Alt gövde - daha koyu
    ctx.fillStyle = C_PLAYER_SHIP_HULL_BOTTOM;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h); // Sol alt köşe
    ctx.lineTo(x + w * 0.95, y + h); // Sağ alt köşe
    ctx.lineTo(x + w, y + h * 0.9);   // Sağ orta
    ctx.lineTo(x, y + h * 0.9);       // Sol orta
    ctx.closePath();
    ctx.fill();

    // Üst güverte - ışıklandırılmış gibi
    ctx.fillStyle = C_PLAYER_SHIP_BODY_TOP;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.9); // Sol alt köşe
    ctx.lineTo(x + w * 0.95, y + h * 0.9); // Sağ alt köşe
    ctx.lineTo(x + w * 0.9, y + h * 0.7); // Sağ üst
    ctx.lineTo(x + w * 0.1, y + h * 0.7); // Sol üst
    ctx.closePath();
    ctx.fill();

    // Yan kenarlar için gölgelendirme
    ctx.fillStyle = C_PLAYER_SHIP_BODY_SIDE;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.9);
    ctx.lineTo(x + w * 0.05, y + h * 0.9);
    ctx.lineTo(x + w * 0.1, y + h * 0.7);
    ctx.lineTo(x + w * 0.05, y + h * 0.6); // Sol yan üst köşe
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.9);
    ctx.lineTo(x + w * 0.95, y + h * 0.9);
    ctx.lineTo(x + w * 0.9, y + h * 0.7);
    ctx.lineTo(x + w * 0.95, y + h * 0.6); // Sağ yan üst köşe
    ctx.closePath();
    ctx.fill();

    // Kabin (3D Benzeri)
    ctx.fillStyle = C_PLAYER_SHIP_CABIN;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.25, y + h * 0.6);
    ctx.lineTo(x + w * 0.75, y + h * 0.6);
    ctx.lineTo(x + w * 0.7, y + h * 0.2); // Üst güverteye doğru daralma
    ctx.lineTo(x + w * 0.3, y + h * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_PLAYER_SHIP_BODY_TOP; // Kabin üstü
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.2);
    ctx.lineTo(x + w * 0.7, y + h * 0.2);
    ctx.lineTo(x + w * 0.68, y + h * 0.15); // Hafif perspektif
    ctx.lineTo(x + w * 0.32, y + h * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_GREY_DARK; // Pencere
    ctx.fillRect(x + w * 0.35, y + h * 0.3, w * 0.3, h * 0.2);


    // Konteynerler (Basit 3D kutular)
    const containerW = w * 0.25;
    const containerH = h * 0.15;
    const containerYOffset = y + h * 0.65;
    const perspectiveOffset = 3; // 3D efekti için

    // Sarı Konteynerler
    ctx.fillStyle = C_YELLOW; // Üst yüzey
    ctx.fillRect(x + w * 0.1, containerYOffset, containerW, containerH);
    ctx.fillRect(x + w * 0.38, containerYOffset, containerW, containerH);
    ctx.fillRect(x + w * 0.66, containerYOffset, containerW, containerH);
    
    ctx.fillStyle = C_ORANGE; // Yan yüzey
    ctx.fillRect(x + w * 0.1 + containerW, containerYOffset + perspectiveOffset, perspectiveOffset, containerH - perspectiveOffset);
    ctx.fillRect(x + w * 0.38 + containerW, containerYOffset + perspectiveOffset, perspectiveOffset, containerH - perspectiveOffset);
    ctx.fillRect(x + w * 0.66 + containerW, containerYOffset + perspectiveOffset, perspectiveOffset, containerH - perspectiveOffset);

    // Kırmızı Konteynerler
    ctx.fillStyle = C_RED; // Üst yüzey
    ctx.fillRect(x + w * 0.25, containerYOffset - containerH, containerW, containerH);
    ctx.fillRect(x + w * 0.53, containerYOffset - containerH, containerW, containerH);

    ctx.fillStyle = C_BROWN_DARK; // Yan yüzey
    ctx.fillRect(x + w * 0.25 + containerW, containerYOffset - containerH + perspectiveOffset, perspectiveOffset, containerH - perspectiveOffset);
    ctx.fillRect(x + w * 0.53 + containerW, containerYOffset - containerH + perspectiveOffset, perspectiveOffset, containerH - perspectiveOffset);
    
    ctx.fillStyle = C_BLACK;
    ctx.font = '12px Arial, sans-serif'; 
    ctx.textAlign = 'center';
    ctx.fillText('SUMUD', x + w / 2, y + h * 0.8); 
    
    // Bayrak Direği ve Filistin Bayrağı
    ctx.fillStyle = C_GREY_DARK; // Direk
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
    const perspectiveOffset = 3; 
    
    const healthPercent = enemy.health / ENEMY_HEALTH_WATER;
    ctx.fillStyle = healthPercent > 0.6 ? C_GREEN : (healthPercent > 0.3 ? C_YELLOW : C_RED);
    ctx.fillRect(x + w * 0.1, y - 10, w * 0.8 * healthPercent, 5);
    
    // Gemi Gövdesi (3D Benzeri)
    ctx.fillStyle = C_ENEMY_SHIP_TOP; // Üst yüzey
    ctx.beginPath();
    ctx.moveTo(x + w * 0.1, y + h * 0.8);
    ctx.lineTo(x + w * 0.9, y + h * 0.8);
    ctx.lineTo(x + w * 0.85, y + h * 0.5); // Ön tarafa doğru daralma
    ctx.lineTo(x + w * 0.15, y + h * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_ENEMY_SHIP_SIDE; // Yan yüzey
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.8);
    ctx.lineTo(x + w * 0.1, y + h * 0.8);
    ctx.lineTo(x + w * 0.15, y + h * 0.5);
    ctx.lineTo(x + w * 0.05, y + h * 0.4); 
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + w, y + h * 0.8);
    ctx.lineTo(x + w * 0.9, y + h * 0.8);
    ctx.lineTo(x + w * 0.85, y + h * 0.5);
    ctx.lineTo(x + w * 0.95, y + h * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_BLACK; // Kaptan Köşkü
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h * 0.4);
    ctx.lineTo(x + w * 0.65, y + h * 0.4);
    ctx.lineTo(x + w * 0.6, y + h * 0.1);
    ctx.lineTo(x + w * 0.4, y + h * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = C_GREY_DARK; // Pencere
    ctx.fillRect(x + w * 0.42, y + h * 0.25, w * 0.16, h * 0.1);

    // DİREK ve İSRAİL BAYRAĞI
    ctx.fillStyle = C_GREY_MEDIUM; 
    ctx.fillRect(x + w / 2 - 2, y - 30, 4, 40); 

    const flagW = 25;
    const flagH = 20;
    const flagX = x + w / 2 + 2;
    const flagY = y - 30 + Math.sin(frameCount / 10) * 2; 

    // Mavi çizgiler
    ctx.fillStyle = '#0033A0'; 
    ctx.fillRect(flagX, flagY, flagW, flagH / 5);
    ctx.fillRect(flagX, flagY + flagH * 4 / 5, flagW, flagH / 5);
    
    // Beyaz zemin
    ctx.fillStyle = C_WHITE; 
    ctx.fillRect(flagX, flagY + flagH / 5, flagW, flagH * 3 / 5);
    
    // Davut Yıldızı
    ctx.strokeStyle = '#0033A0'; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(flagX + flagW / 2, flagY + flagH / 2 - flagH / 6);
    ctx.lineTo(flagX + flagW / 2 + flagW / 6, flagY + flagH / 2 + flagH / 10);
    ctx.lineTo(flagX + flagW / 2 - flagW / 6, flagY + flagH / 2 + flagH / 10);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(flagX + flagW / 2, flagY + flagH / 2 + flagH / 6);
    ctx.lineTo(flagX + flagW / 2 + flagW / 6, flagY + flagH / 2 - flagH / 10);
    ctx.lineTo(flagX + flagW / 2 - flagW / 6, flagY + flagH / 2 - flagH / 10);
    ctx.closePath();
    ctx.stroke();

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
            
        } else if (exp.stage === 'hit_poop') { // Bez/Kaka Patlaması Görseli
            ctx.fillStyle = C_DIAPER_DIRTY;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = C_ORANGE;
            ctx.beginPath();
            ctx.arc(exp.x + Math.sin(exp.timer) * 5, exp.y + Math.cos(exp.timer) * 5, exp.radius * 0.6, 0, Math.PI * 2);
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
    ctx.fillStyle = C_DIAPER_CLEAN; 
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
    
    // Bu kısım artık direkt mesajları çizmek için kullanılıyor.
    
    if (gameState === 'lose') {
        // İstenen iki satırlık mesaj buraya eklendi.
        ctx.fillStyle = C_RED;
        
        const line1 = "Şehitler ölmez! Sen kazandın...";
        const line2 = "Ama Allah rızası için tekrar dene!";
        
        // İlk satır (Orijinal konumdan 20px yukarı)
        ctx.fillText(line1, canvas.width / 2, canvas.height / 2 - 60); 
        
        // İkinci satır (İlk satırdan yaklaşık 30px aşağı)
        ctx.fillText(line2, canvas.width / 2, canvas.height / 2 - 30); 

    } else if (gameState === 'win') {
        // Kazanma durumu tek satır olarak kalmaya devam ediyor.
        const winMessage = "BAŞARDIN! Ambargo delindi!";
        ctx.fillStyle = C_GREEN;
        
        // Tek satır, ortalanmış konumda çiziliyor
        ctx.fillText(winMessage, canvas.width / 2, canvas.height / 2 - 40);
    }
    
    // Skor ve yeniden başlama mesajları aynı kalır
    ctx.fillStyle = C_YELLOW;
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText(`Skor: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 30);

    ctx.fillStyle = C_WHITE;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText("[ENTER] Tuşuna Basarak Yeniden Başla", canvas.width / 2, canvas.height / 2 + 90);
}

function drawAll() {
    // Yardımcı fonksiyonlar (DrawAll içinde kalabilir)
    function interpolateColor(color1, color2, factor) {
        if (factor <= 0) return color1;
        if (factor >= 1) return color2;

        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // 1. Arka Planın Düzleştirilmesi 
    ctx.fillStyle = C_SEA_DEEP; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dinamik dalgalı yüzey
    waveOffset = (waveOffset + 0.5) % (canvas.width * 2); 

    for (let i = 0; i < canvas.height; i += 20) { 
        const depthFactor = i / canvas.height; 
        
        const currentWaterColor = interpolateColor(C_SEA_SURFACE, C_SEA_DEEP, depthFactor);
        
        const waveHeight = 8 * (1 - depthFactor) + 2; 
        const waveFrequency = 0.02 * (1 - depthFactor) + 0.01;
        const waveSpeed = 0.01 * (1 - depthFactor) + 0.005;

        ctx.fillStyle = currentWaterColor;
        ctx.beginPath();
        ctx.moveTo(0, i + waveHeight * Math.sin(waveOffset * waveFrequency * 0.5));
        for (let j = 0; j <= canvas.width; j += 10) {
            ctx.lineTo(j, i + waveHeight * Math.sin(j * waveFrequency + waveOffset * waveSpeed));
        }
        ctx.lineTo(canvas.width, i + 20);
        ctx.lineTo(0, i + 20);
        ctx.closePath();
        ctx.fill();

        // Köpükler (Yüzeye yakın)
        if (i < 100) {
            ctx.fillStyle = C_FOAM;
            ctx.globalAlpha = 0.8 * (1 - depthFactor);
            ctx.beginPath();
            for (let j = 0; j <= canvas.width; j += 15) {
                const yPos = i + waveHeight * Math.sin(j * waveFrequency + waveOffset * waveSpeed);
                ctx.arc(j, yPos, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // 2. Arka Plan Nesneleri 
    backgroundObjects.sort((a, b) => a.speedFactor - b.speedFactor);
    backgroundObjects.forEach(drawDetailedBackgroundObject);
    
    // 3. Kıyı Şeridi
    drawGazzeCoastDetailed();

    // 4. Düşman Gemileri
    enemyShips.forEach(drawEnemyShipDetailed);

    // Sadece 'playing' durumunda veya kayıp/kazanma durumunda çiz
    if (gameState === 'playing' || gameState === 'win' || gameState === 'lose') {
        // 5. Oyuncu Gemisinin Gölgesi
        ctx.fillStyle = C_SHADOW;
        ctx.beginPath();
        ctx.ellipse(playerShip.x + 10, playerShip.y + playerShip.height / 2 + 5, playerShip.width * 0.8, playerShip.height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6. Oyuncu Gemisi (Üstte)
        drawPlayerShipDetailed();

        // 7. Füzeler/Mühimmat
        projectiles.forEach(p => {
            if (p.type === 'water') {
                ctx.fillStyle = C_BLUE_LIGHT;
            } else if (p.type === 'diaper') {
                ctx.fillStyle = C_DIAPER_DIRTY;
            } else if (p.type === 'syringe') {
                ctx.fillStyle = C_RED;
            }
            ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
        });

        // 8. Ödüller/Pickups
        pickups.forEach(p => {
            ctx.fillStyle = p.type === 'diaper_ammo' ? C_DIAPER_CLEAN : C_RED;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = C_BLACK;
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.type === 'diaper_ammo' ? 'B' : 'N', p.x, p.y + 3);
        });
    }

    // 9. Patlamalar
    drawExplosions();

    // 10. HUD
    // HUD sadece oyun oynanırken veya bitmişken çizilir (hazır ekranında butonu görmek için)
    if (gameState === 'playing' || gameState === 'win' || gameState === 'lose') {
        drawHUD();
    }

    // 11. Durum Mesajları
    if (gameState !== 'playing' && gameState !== 'ready') {
        drawMessage();
    }
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

        updateBackground(); 
    }
    
    drawAll();   
    
    requestAnimationFrame(gameLoop);
}

// YENİ BAŞLATMA LOGİĞİ
function initGame() {
    // Tarayıcı boyutlandırma hatası olmaması için bu kontrolü ekleyelim.
    if (canvas && ctx) {
        canvas.width = 800; 
        canvas.height = 600;
        
        initializeGameObjects(); // Hata çözümü: Objenin varlığını sağlar
        gameState = 'ready'; // Başlangıç ekranı için hazırla
        
        drawAll(); // Başlangıç ekranını bir kere çiz
        requestAnimationFrame(gameLoop); // Oyun döngüsünü başlat, ancak 'ready' olduğu için update fonksiyonları çalışmayacak.
    } else {
        console.error("Canvas elementi bulunamadı. Lütfen index.html dosyasını kontrol edin.");
    }
}


// Butona tıklama olayını dinle (index.html'den gelen element)
document.getElementById('startButton').addEventListener('click', () => {
    // Başlangıç ekranını gizle
    document.getElementById('startButtonScreen').style.display = 'none';

    // Sesleri oynatmaya hazırla ve kısıtlamayı aş
    // Tüm sesleri bir kere denemek daha güvenlidir
    const allSfx = [SFX_WATER_FIRE, SFX_EXPLOSION, SFX_HIT, SFX_PICKUP];
    allSfx.forEach(sfx => {
        sfx.volume = sfx === SFX_EXPLOSION ? 0.5 : 1.0;
        sfx.load(); // Ses dosyasını yüklemeyi zorla
        sfx.play().then(() => sfx.pause()).catch(e => { /* Hata yoksayıldı */ });
    });
    
    // Oyunu sıfırla ve 'playing' durumuna geçir
    resetGame();
});


initGame();