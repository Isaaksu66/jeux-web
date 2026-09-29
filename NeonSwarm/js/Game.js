class Game {
    constructor() {
        this.player = new Player(0, 0);
        this.renderer = new Renderer('gameCanvas');
        
        this.enemies = [];
        this.projectiles = [];
        this.gems = [];
        
        this.state = 'PLAYING'; // PLAYING, LEVEL_UP, GAME_OVER
        this.score = 0;
        this.time = 0;
        
        // Spawner config
        this.spawnTimer = 0;
        this.spawnRate = 2.0; // Spawns every 2 seconds
        this.enemiesPerSpawn = 1; // Un seul ennemi à la fois au début
        this.difficultyTimer = 0;
        
        window.gameInstance = this; // Pour accès global facile depuis Drops.js
    }

    start() {
        // Hide UI
        document.getElementById('level-up-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        
        // Bind UI
        document.getElementById('btn-restart').onclick = () => location.reload();
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        this.time += dt;
        this.difficultyTimer += dt;
        
        // Augmenter la difficulté toutes les 15 secondes
        if (this.difficultyTimer > 15) {
            this.difficultyTimer = 0;
            this.spawnRate = Math.max(0.5, this.spawnRate - 0.1);
            // On augmente le nombre d'ennemis seulement si on a atteint une bonne vitesse de spawn
            if (this.spawnRate <= 1.0) {
                this.enemiesPerSpawn += 1;
            }
        }

        // Spawn logic
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnRate;
            this.spawnEnemies();
        }

        // Updates
        this.player.update(dt, this);
        Particles.update(dt);
        
        // Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt);
            if (p.isDead) this.projectiles.splice(i, 1);
        }

        // Enemies & Collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, this.player, this.enemies);
            
            // Collision avec projectiles
            for (const p of this.projectiles) {
                if (!p.isDead && !p.hitEnemies.has(e) && MathUtils.distanceSq(p.x, p.y, e.x, e.y) < (p.size + e.size) ** 2) {
                    e.takeDamage(p.damage);
                    p.hitEnemies.add(e);
                    if (p.hitEnemies.size >= p.pierce) {
                        p.isDead = true;
                    }
                }
            }

            if (e.isDead) {
                // Drop gem
                this.gems.push(new Gem(e.x, e.y, e.xpValue));
                this.score += e.xpValue * 10;
                this.renderer.shake(1, 0.1);
                this.enemies.splice(i, 1);
            }
        }

        // Gems
        for (let i = this.gems.length - 1; i >= 0; i--) {
            this.gems[i].update(dt, this.player);
            if (this.gems[i].isCollected) this.gems.splice(i, 1);
        }

        // Check Game Over
        if (this.player.isDead) {
            this.state = 'GAME_OVER';
            document.getElementById('game-over-screen').classList.remove('hidden');
            document.getElementById('final-time').innerText = Math.floor(this.time) + " s";
            document.getElementById('final-score').innerText = this.score;
        }
        
        this.updateUI();
    }

    spawnEnemies() {
        for (let i = 0; i < this.enemiesPerSpawn; i++) {
            // Spawn en dehors de l'écran (ex: rayon de 600px autour du joueur)
            const angle = Math.random() * Math.PI * 2;
            const dist = 800; // Hors de l'écran
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            // Type aléatoire basé sur le temps
            let type = 0;
            const r = Math.random();
            if (this.time > 30 && r > 0.8) type = 1; // Fast
            if (this.time > 60 && r > 0.9) type = 2; // Tank
            
            this.enemies.push(new Enemy(ex, ey, type));
        }
    }

    updateUI() {
        document.getElementById('score').innerText = `Score: ${this.score}`;
        document.getElementById('timer').innerText = `${Math.floor(this.time / 60).toString().padStart(2, '0')}:${Math.floor(this.time % 60).toString().padStart(2, '0')}`;
        
        const xpPercent = (this.player.xp / this.player.xpToNextLevel) * 100;
        document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;
        document.getElementById('level-display').innerText = `LVL ${this.player.level}`;
    }

    draw() {
        this.renderer.beginDraw();
        
        // Draw all entities
        this.gems.forEach(g => g.draw(this.renderer.ctx));
        this.enemies.forEach(e => e.draw(this.renderer.ctx));
        this.projectiles.forEach(p => p.draw(this.renderer.ctx));
        
        Particles.draw(this.renderer.ctx);
        this.player.draw(this.renderer.ctx);

        this.renderer.endDraw();
    }

    triggerLevelUp() {
        this.state = 'LEVEL_UP';
        const screen = document.getElementById('level-up-screen');
        screen.classList.remove('hidden');
        document.getElementById('new-level-title').innerText = `Niveau ${this.player.level}`;
        
        const container = document.getElementById('upgrades-container');
        container.innerHTML = '';
        
        // Définir des upgrades possibles
        const possibleUpgrades = [
            { title: "Cadence de tir", desc: "Tire 20% plus vite", action: () => { this.player.fireRate *= 0.8; } },
            { title: "Dégâts bruts", desc: "+5 Dégâts par tir", action: () => { this.player.damage += 5; } },
            { title: "Pénétration", desc: "Les tirs traversent +1 ennemi", action: () => { this.player.pierce += 1; } },
            { title: "Vitesse de déplacement", desc: "+20% Vitesse", action: () => { this.player.speed *= 1.2; } }
        ];
        
        // Choisir 3 upgrades au hasard
        // Mélanger le tableau
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
