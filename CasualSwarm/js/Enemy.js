class Enemy {
    constructor(x, y, type, wave = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        
        this.wobbleOffset = Math.random() * 100;
        this.time = 0;
        
        if (type === 0) {
            this.size = 15;
            this.speed = MathUtils.randomRange(100, 140); // Juste milieu
            this.hp = 10 * wave; // Les petits mobs scale un peu
            this.baseColor = '#E91E63'; // Pink blob
            this.borderColor = '#880E4F';
            this.xpValue = 1;
        } else if (type === 1) {
            this.size = 12;
            this.speed = MathUtils.randomRange(180, 220); // Très rapide (avant: 150-200)
            this.hp = 5 * wave;
            this.baseColor = '#FF9800'; // Orange fast
            this.borderColor = '#E65100';
            this.xpValue = 2;
        } else if (type === 2) {
            this.size = 25;
            this.speed = MathUtils.randomRange(60, 90); // Tank légèrement plus rapide
            this.hp = 40 * wave;
            this.baseColor = '#9C27B0'; // Purple tank
            this.borderColor = '#4A148C';
            this.xpValue = 5;
        } else {
            // type === 3 : BOSS
            this.size = 60;
            this.speed = 100 + (wave * 10); // Beaucoup plus rapide (1v1)
            this.hp = 400 * wave; // Plus de PV à chaque vague
            this.baseColor = '#D50000'; // Rouge vif
            this.borderColor = '#b71c1c';
            this.xpValue = 50 * wave;
        }
        
        this.isDead = false;
        this.damageCooldown = 0;
    }

    update(dt, player, otherEnemies) {
        if (this.isDead) return;
        this.time += dt * 10;

        const angle = MathUtils.angle(this.x, this.y, player.x, player.y);
        let vx = Math.cos(angle) * this.speed;
        let vy = Math.sin(angle) * this.speed;
        
        const checkCount = Math.min(otherEnemies.length, 5);
        for (let i = 0; i < checkCount; i++) {
            const index = Math.floor(Math.random() * otherEnemies.length);
            const other = otherEnemies[index];
            if (other === this || other.isDead) continue;
            
            const distSq = MathUtils.distanceSq(this.x, this.y, other.x, other.y);
            const minDist = this.size + other.size;
            
            if (distSq < minDist * minDist) {
                const sepAngle = MathUtils.angle(other.x, other.y, this.x, this.y);
                vx += Math.cos(sepAngle) * this.speed * 0.5;
                vy += Math.sin(sepAngle) * this.speed * 0.5;
            }
        }
        
        this.x += vx * dt;
        this.y += vy * dt;
        
        if (this.damageCooldown > 0) {
            this.damageCooldown -= dt;
        }
        
        const distToPlayerSq = MathUtils.distanceSq(this.x, this.y, player.x, player.y);
        const hitDist = this.size + player.size;
        
        if (distToPlayerSq < hitDist * hitDist && this.damageCooldown <= 0) {
            player.takeDamage(10);
            this.damageCooldown = 1.0; 
            this.x -= Math.cos(angle) * 30;
            this.y -= Math.sin(angle) * 30;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        Particles.emit(this.x, this.y, '#ffffff', 2, 2, 0.1);
        
        if (this.hp <= 0) {
            this.isDead = true;
            Particles.emit(this.x, this.y, this.baseColor, 10, 4);
        }
    }

    draw(ctx, player) {
        if (this.isDead) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Regarde vers le joueur
        const angle = MathUtils.angle(this.x, this.y, player.x, player.y);
        
        // Wobble animation (respiration / déplacement)
        const squash = 1 + Math.sin(this.time + this.wobbleOffset) * 0.1;
        const stretch = 1 - Math.sin(this.time + this.wobbleOffset) * 0.1;
        ctx.scale(squash, stretch);

        // Ombre
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.size, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corps Blob
        ctx.fillStyle = this.baseColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Yeux "Méchant"
        const ex = Math.cos(angle) * 4;
        const ey = Math.sin(angle) * 4;
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5 + ex, -3 + ey, 4, 0, Math.PI * 2);
        ctx.arc(5 + ex, -3 + ey, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-5 + ex*1.5, -3 + ey*1.5, 2, 0, Math.PI * 2);
        ctx.arc(5 + ex*1.5, -3 + ey*1.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Sourcils fâchés
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9 + ex, -7 + ey);
        ctx.lineTo(-2 + ex, -5 + ey);
        ctx.moveTo(9 + ex, -7 + ey);
        ctx.lineTo(2 + ex, -5 + ey);
        ctx.stroke();

        ctx.restore();
    }
}
