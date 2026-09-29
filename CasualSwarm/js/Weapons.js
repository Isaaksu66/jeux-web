// Weapons.js
class Projectile {
    constructor(x, y, angle, speed, damage, pierce) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.pierce = pierce; 
        
        this.size = 8;
        this.color = '#FFF176'; // Jaune brillant
        this.borderColor = '#F57F17';
        this.lifeTime = 2.0; 
        this.hitEnemies = new Set(); 
        this.isDead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.isDead = true;
        }
        
        if (Math.random() > 0.6) {
            Particles.emit(this.x, this.y, '#FFF', 1, 1, 0.1);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);
        
        // Ombre
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(0, 10, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Projectile (Boule ovale)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.5, this.size, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }
}

class AuraWeapon {
    constructor() {
        this.radius = 80;
        this.damage = 5; // Dégâts par seconde
        this.color = 'rgba(100, 255, 100, 0.3)';
        this.borderColor = 'rgba(100, 255, 100, 0.8)';
    }

    update(dt, player, game) {
        // Inflige des dégâts en continu
        for (const e of game.enemies) {
            if (!e.isDead && MathUtils.distanceSq(player.x, player.y, e.x, e.y) < (this.radius + e.size)**2) {
                // Application des dégâts continus ajustés par le deltaTime
                const tickDamage = this.damage * dt;
                e.hp -= tickDamage; // Pas de fonction takeDamage directe pour éviter le spam de particules
                
                // On met une chance pour afficher le texte de dégât pour éviter d'inonder l'écran
                if (Math.random() < 0.1) {
                    DamageTexts.add(e.x, e.y - 10, `-${Math.ceil(this.damage)}`, '#64DD17', 14);
                    Particles.emit(e.x, e.y, '#64DD17', 1, 1, 0.1);
                }

                if (e.hp <= 0 && !e.isDead) {
                    e.isDead = true;
                    Particles.emit(e.x, e.y, e.baseColor, 10, 4);
                }
            }
        }
    }

    draw(ctx, player) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

class OrbWeapon {
    constructor() {
        this.orbs = [0, Math.PI]; // Angles initiaux pour 2 orbes
        this.radius = 60; // Distance du joueur
        this.speed = 3; // Vitesse de rotation
        this.size = 10;
        this.damage = 15;
    }

    update(dt, player, game) {
        for (let i = 0; i < this.orbs.length; i++) {
            this.orbs[i] += this.speed * dt;
            
            const ox = player.x + Math.cos(this.orbs[i]) * this.radius;
            const oy = player.y + Math.sin(this.orbs[i]) * this.radius;

            for (const e of game.enemies) {
                if (!e.isDead && e.damageCooldown <= 0 && MathUtils.distanceSq(ox, oy, e.x, e.y) < (this.size + e.size)**2) {
                    e.takeDamage(this.damage);
                    DamageTexts.add(e.x, e.y - 10, `-${this.damage}`, '#FF9800', 18);
                    e.damageCooldown = 0.5; // Empêche l'orbe de toucher plusieurs fois par seconde
                }
            }
            
            if (Math.random() > 0.5) {
                Particles.emit(ox, oy, '#FF9800', 1, 0.5, 0.1);
            }
        }
    }

    draw(ctx, player) {
        ctx.fillStyle = '#FF9800';
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 2;

        for (let i = 0; i < this.orbs.length; i++) {
            const ox = player.x + Math.cos(this.orbs[i]) * this.radius;
            const oy = player.y + Math.sin(this.orbs[i]) * this.radius;

            ctx.beginPath();
            ctx.arc(ox, oy, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}
