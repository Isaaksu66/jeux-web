// Player.js
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 220; // Juste milieu entre 250 et 180
        
        // Stats
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.xp = 0;
        this.xpToNextLevel = 15; // Juste milieu entre 10 et 25
        this.level = 1;
        
        // Weapon config
        this.shootTimer = 0;
        this.fireRate = 0.5; 
        this.damage = 10;
        this.pierce = 1; 
        this.projectileSpeed = 600;
        
        this.isDead = false;
        this.invincibilityTimer = 0;
        
        // Animation
        this.wobble = 0;
        
        // Armes secondaires
        this.weapons = [];
    }

    update(dt, game) {
        if (this.isDead) return;

        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= dt;
        }

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
        
        if (dx !== 0 || dy !== 0) {
            this.wobble += dt * 15;
        } else {
            this.wobble = 0;
        }

        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shoot(game);
        }
        
        // Update secondary weapons
        this.weapons.forEach(w => w.update(dt, this, game));
    }

    shoot(game) {
        if (!Input.mouseDown) return;

        this.shootTimer = this.fireRate;
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
        
        Audio.play('shoot');
        Particles.emit(this.x, this.y, '#FFF', 3, 3);
        
        // Petit recul visuel du joueur
        this.x -= Math.cos(angle) * 5;
        this.y -= Math.sin(angle) * 5;
    }

    takeDamage(amount) {
        if (this.invincibilityTimer > 0) return;
        
        this.hp -= amount;
        Audio.play('hit');
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
        }
        Particles.emit(this.x, this.y, '#FF5252', 15, 6);
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
        
        Audio.play('levelup');
        game.triggerLevelUp();
    }

    draw(ctx, game) {
        if (this.isDead) return;

        // Dessin des armes (Aura en dessous du joueur, Orbes)
        this.weapons.forEach(w => w.draw(ctx, this));

        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Orientation des yeux vers la souris
        const targetX = Input.mouseX + game.renderer.camera.x;
        const targetY = Input.mouseY + game.renderer.camera.y;
        const angle = MathUtils.angle(this.x, this.y, targetX, targetY);
        
        const squash = 1 + Math.sin(this.wobble) * 0.1;
        const stretch = 1 - Math.sin(this.wobble) * 0.1;
        ctx.scale(squash, stretch);

        // Ombre portée
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 15, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corps Principal (Bleu)
        ctx.fillStyle = '#29B6F6';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Reflet
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-5, -5, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Contour
        ctx.strokeStyle = '#0277BD';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Yeux tournés vers la souris
        const eyeOffset = 3;
        const ex = Math.cos(angle) * eyeOffset;
        const ey = Math.sin(angle) * eyeOffset;

        // Blanc des yeux
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-8 + ex, -5 + ey, 6, 0, Math.PI * 2);
        ctx.arc(8 + ex, -5 + ey, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pupilles
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(-8 + ex*1.5, -5 + ey*1.5, 3, 0, Math.PI * 2);
        ctx.arc(8 + ex*1.5, -5 + ey*1.5, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw HP Bar
        const barWidth = 40;
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(this.x - barWidth/2, this.y + 25, barWidth, 6);
        ctx.fillStyle = '#64DD17';
        ctx.fillRect(this.x - barWidth/2, this.y + 25, barWidth * (this.hp / this.maxHp), 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - barWidth/2, this.y + 25, barWidth, 6);
    }
}
