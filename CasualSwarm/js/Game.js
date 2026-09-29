// Game.js
class Game {
    constructor() {
        this.player = new Player(0, 0);
        this.renderer = new Renderer('gameCanvas');
        
        this.enemies = [];
        this.projectiles = [];
        this.gems = [];
        
        this.state = 'PLAYING';
        this.score = 0;
        this.time = 0;
        
        this.wave = 1;
        this.gamePhase = 'HORDE'; // 'HORDE' ou 'BOSS'
        this.phaseTimer = 50.0; // 50 secondes avant le boss
        
        this.spawnTimer = 0;
        this.spawnRate = 1.0; // Juste milieu
        this.enemiesPerSpawn = 2; // Juste milieu
        
        this.bossSpawned = false;
        
        this.highWave = parseInt(localStorage.getItem('casualSwarmHighWave')) || 1;
        document.getElementById('high-score').innerText = `Record: VAGUE ${this.highWave}`;
        
        this.hasRevived = false; // Utilisé pour le système de pub
        
        window.gameInstance = this;
    }

    start() {
        document.getElementById('level-up-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('btn-restart').onclick = () => location.reload();
        
        document.getElementById('btn-revive').onclick = () => {
            if (this.hasRevived) return;
            this.showAdRevive();
        };
    }
    
    showAdRevive() {
        document.getElementById('game-over-screen').classList.add('hidden');
        const adScreen = document.getElementById('ad-screen');
        const adTimerText = document.getElementById('ad-timer');
        adScreen.classList.remove('hidden');
        
        let timeLeft = 3;
        adTimerText.innerText = timeLeft;
        
        const adInterval = setInterval(() => {
            timeLeft--;
            adTimerText.innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(adInterval);
                adScreen.classList.add('hidden');
                this.revivePlayer();
            }
        }, 1000);
    }
    
    revivePlayer() {
        this.hasRevived = true;
        this.player.hp = this.player.maxHp;
        this.player.isDead = false;
        this.player.invincibilityTimer = 5.0;
        this.state = 'PLAYING';
        
        // Repousser violemment tous les ennemis au lieu de les supprimer
        this.enemies.forEach(e => {
            const angle = MathUtils.angle(this.player.x, this.player.y, e.x, e.y);
            e.x += Math.cos(angle) * 600;
            e.y += Math.sin(angle) * 600;
        });
        
        // Effet d'invincibilité visuelle temporaire
        Particles.emit(this.player.x, this.player.y, '#FFEB3B', 50, 10, 1.0);
        
        // Cacher le bouton revive pour la prochaine fois
        document.getElementById('btn-revive').style.display = 'none';
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        this.time += dt;
        
        if (this.gamePhase === 'HORDE') {
            this.phaseTimer -= dt;
            if (this.phaseTimer <= 0) {
                this.gamePhase = 'BOSS';
                this.bossSpawned = false;
                DamageTexts.add(this.player.x, this.player.y - 100, "BOSS ROUND !", '#FF0000', 50);
                this.renderer.shake(15, 1.0);
            }
        }

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnRate;
            if (this.gamePhase === 'HORDE') {
                this.spawnEnemies();
            } else if (this.gamePhase === 'BOSS') {
                if (!this.bossSpawned) {
                    this.bossSpawned = true;
                    // Fait apparaitre le boss un peu à l'écart, avec le multiplicateur de wave
                    this.enemies.push(new Enemy(this.player.x + 600, this.player.y, 3, this.wave));
                }
                // Un mob très léger spawn de temps en temps pendant le boss pour garder un peu de vie (et d'xp potentielle)
                if (Math.random() < 0.2) {
                    this.enemies.push(new Enemy(this.player.x + 800, this.player.y, 0, this.wave));
                }
            }
        }

        this.player.update(dt, this);
        Particles.update(dt);
        DamageTexts.update(dt);
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);
            if (p.isDead) this.projectiles.splice(i, 1);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, this.player, this.enemies);
            
            for (const p of this.projectiles) {
                if (!p.isDead && !p.hitEnemies.has(e) && MathUtils.distanceSq(p.x, p.y, e.x, e.y) < (p.size + e.size) ** 2) {
                    e.takeDamage(p.damage);
                    DamageTexts.add(e.x, e.y - 10, `-${p.damage}`, '#FFF', 18);
                    p.hitEnemies.add(e);
                    if (p.hitEnemies.size >= p.pierce) {
                        p.isDead = true;
                    }
                }
            }

            if (e.isDead) {
                if (e.type === 3) {
                    Audio.play('boss_dead');
                    // Explosion de gemmes pour le boss
                    for(let j=0; j<15; j++) {
                        this.gems.push(new Gem(e.x + MathUtils.randomRange(-50, 50), e.y + MathUtils.randomRange(-50, 50), 5));
                    }
                    this.renderer.shake(20, 0.5);
                    DamageTexts.add(e.x, e.y, "BOSS VAINCU !", '#FFD54F', 30);
                    
                    // Passer à la vague suivante
                    this.wave++;
                    this.gamePhase = 'HORDE';
                    this.phaseTimer = 50.0;
                    
                    // Augmentation de la difficulté
                    this.spawnRate = Math.max(0.2, 1.0 - (this.wave * 0.15)); // De plus en plus rapide
                    this.enemiesPerSpawn = 1 + this.wave; // De plus en plus nombreux
                    
                    DamageTexts.add(this.player.x, this.player.y - 150, `VAGUE ${this.wave}`, '#18FFFF', 40);
                } else {
                    this.gems.push(new Gem(e.x, e.y, e.xpValue));
                    this.renderer.shake(2, 0.1);
                }
                
                this.score += e.xpValue * 10;
                this.enemies.splice(i, 1);
            }
        }

        for (let i = this.gems.length - 1; i >= 0; i--) {
            this.gems[i].update(dt, this.player);
            if (this.gems[i].isCollected) this.gems.splice(i, 1);
        }

        if (this.player.isDead) {
            this.state = 'GAME_OVER';
            document.getElementById('game-over-screen').classList.remove('hidden');
            document.getElementById('final-wave').innerText = this.wave;
            document.getElementById('final-score').innerText = this.score;
            
            if (this.wave > this.highWave) {
                this.highWave = this.wave;
                localStorage.setItem('casualSwarmHighWave', this.highWave);
                document.getElementById('high-score').innerText = `Record: VAGUE ${this.highWave}`;
            }
        }
        
        this.updateUI();
    }

    spawnEnemies() {
        for (let i = 0; i < this.enemiesPerSpawn; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 800; 
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            let type = 0;
            const r = Math.random();
            if (this.time > 30 && r > 0.8) type = 1;
            if (this.time > 60 && r > 0.9) type = 2;
            
            this.enemies.push(new Enemy(ex, ey, type));
        }
    }

    updateUI() {
        document.getElementById('score').innerText = `Score: ${this.score}`;
        
        let timeDisplay = "";
        if (this.gamePhase === 'HORDE') {
            timeDisplay = `Horde: ${Math.ceil(this.phaseTimer)}s`;
        } else {
            timeDisplay = `BOSS ROUND`;
        }
        document.getElementById('timer').innerText = timeDisplay;
        
        const xpPercent = (this.player.xp / this.player.xpToNextLevel) * 100;
        document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;
        document.getElementById('level-display').innerText = `VAGUE ${this.wave} - LVL ${this.player.level}`;
    }

    draw() {
        this.renderer.beginDraw();
        
        // Z-sorting: Les gemmes en dessous, les ennemis, le joueur au-dessus
        this.gems.forEach(g => g.draw(this.renderer.ctx));
        // Sort enemies by Y position so blobs lower on screen appear in front
        this.enemies.sort((a,b) => a.y - b.y).forEach(e => e.draw(this.renderer.ctx, this.player));
        
        Particles.draw(this.renderer.ctx);
        this.projectiles.forEach(p => p.draw(this.renderer.ctx));
        this.player.draw(this.renderer.ctx, this);
        
        DamageTexts.draw(this.renderer.ctx);

        this.renderer.endDraw();
    }

    triggerLevelUp() {
        this.state = 'LEVEL_UP';
        const screen = document.getElementById('level-up-screen');
        screen.classList.remove('hidden');
        document.getElementById('new-level-title').innerText = `Niveau ${this.player.level}`;
        
        const container = document.getElementById('upgrades-container');
        container.innerHTML = '';
        
        const possibleUpgrades = [
            { title: "Tir Rapide", desc: "Tire 20% plus vite", action: () => { this.player.fireRate *= 0.8; } },
            { title: "Dégâts +", desc: "Plus de dégâts", action: () => { this.player.damage += 5; } },
            { title: "Balles Magiques", desc: "Perce +1 ennemi", action: () => { this.player.pierce += 1; } },
            { title: "Bottes Vives", desc: "+20% Vitesse", action: () => { this.player.speed *= 1.2; } },
            { title: "Aura Toxique", desc: "Zone de dégâts autour de vous", action: () => { 
                if (!this.player.weapons.some(w => w instanceof AuraWeapon)) {
                    this.player.weapons.push(new AuraWeapon());
                } else {
                    const w = this.player.weapons.find(w => w instanceof AuraWeapon);
                    w.damage += 5; w.radius += 10;
                }
            }},
            { title: "Orbes de Feu", desc: "Boules protectrices", action: () => { 
                if (!this.player.weapons.some(w => w instanceof OrbWeapon)) {
                    this.player.weapons.push(new OrbWeapon());
                } else {
                    const w = this.player.weapons.find(w => w instanceof OrbWeapon);
                    w.damage += 10;
                    w.orbs.push(w.orbs[0] + Math.PI/2); // Ajoute une orbe (approximatif, c'est pour l'effet)
                }
            }}
        ];
        
        const shuffled = possibleUpgrades.sort(() => 0.5 - Math.random());
        const choices = shuffled.slice(0, 3);
        
        choices.forEach(choice => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<h3>${choice.title}</h3><p>${choice.desc}</p>`;
            card.onclick = () => {
                choice.action();
                screen.classList.add('hidden');
                this.state = 'PLAYING';
            };
            container.appendChild(card);
        });
    }
}
