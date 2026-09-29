class Projectile {
    constructor(x, y, angle, speed, damage, pierce) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.pierce = pierce; // Nombre d'ennemis qu'il peut traverser
        
        this.size = 4;
        this.color = '#00ffff';
        this.lifeTime = 2.0; // Meurt après 2 secondes si touche rien
        this.hitEnemies = new Set(); // Pour ne pas toucher le même ennemi deux fois
        this.isDead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        this.lifeTime -= dt;
        if (this.lifeTime <= 0) {
            this.isDead = true;
        }
        
        // Particules de traînée
        if (Math.random() > 0.5) {
            Particles.emit(this.x, this.y, this.color, 1, 1, 0.1);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#fff';
        
        // Dessine une ligne orientée vers la vélocité
        const angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);
        
        ctx.fillRect(-this.size*2, -this.size/2, this.size*4, this.size);
        ctx.restore();
    }
}
