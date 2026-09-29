class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.speed = 250; // pixels per second
        this.color = '#00ffff';
        
        // Stats
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.xp = 0;
        this.xpToNextLevel = 10;
        this.level = 1;
        
        // Weapon config
        this.shootTimer = 0;
        this.fireRate = 0.5; // seconds between shots
        this.damage = 10;
        this.pierce = 1; // how many enemies a projectile can hit
        this.projectileSpeed = 500;
        
        this.isDead = false;
    }

    update(dt, game) {
        if (this.isDead) return;

        // Mouvement
        let dx = 0;
        let dy = 0;

        if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) dy -= 1;
        if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) dy += 1;
        if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) dx -= 1;
        if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) dx += 1;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;

        // Auto-shoot
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shoot(game);
        }
    }

    shoot(game) {
        if (!Input.mouseDown) return; // Ne tire que si le joueur clique

        this.shootTimer = this.fireRate;
        
        // Convertir la position de la souris en position dans le monde du jeu
        const targetX = Input.mouseX + game.renderer.camera.x;
        const targetY = Input.mouseY + game.renderer.camera.y;
        
        const angle = MathUtils.angle(this.x, this.y, targetX, targetY);
        
        game.projectiles.push(new Projectile(
            this.x, this.y, 
            angle, 
            this.projectileSpeed, 
            this.damage, 
            this.pierce
        ));
        
        // Effet visuel
        Particles.emit(this.x, this.y, this.color, 5, 2);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
        Particles.emit(this.x, this.y, '#ff0000', 10, 4);
    }

    gainXp(amount, game) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp(game);
        }
    }

    levelUp(game) {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        
        // Heal on level up
        this.hp = Math.min(this.maxHp, this.hp + 20);
        
        // Trigger Level Up UI in game
        game.triggerLevelUp();
    }

    draw(ctx) {
        if (this.isDead) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Halo
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        // Shape (Triangle)
        ctx.beginPath();
        // Pointing up (or towards mouse, but we just draw it simple)
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size, this.size);
        ctx.lineTo(-this.size, this.size);
        ctx.closePath();
        
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();

        // Draw HP Bar
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(this.x - 20, this.y + 25, 40, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x - 20, this.y + 25, 40 * (this.hp / this.maxHp), 5);
    }
}
