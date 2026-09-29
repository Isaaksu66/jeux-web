class Particle {
    constructor(x, y, color, speed, size, lifeDecay) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed * Math.random();
        this.vy = Math.sin(angle) * speed * Math.random();
        this.size = size;
        this.life = 1.0;
        this.decay = lifeDecay || 0.02;
    }

    update(dt) {
        // Utilisation de dt pour l'indépendance du framerate
        const timeScale = dt * 60; 
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        
        // Friction
        this.vx *= Math.pow(0.95, timeScale);
        this.vy *= Math.pow(0.95, timeScale);
        
        this.life -= this.decay * timeScale;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        // On dessine un cercle pour les particules
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
        this.maxParticles = 1000; // Limite pour les perfs
    }

    emit(x, y, color, count, speed = 5, size = 3, decay = 0.03) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length < this.maxParticles) {
                this.particles.push(new Particle(x, y, color, speed, size, decay));
            } else {
                // Recycle old particles if we hit the limit
                this.particles[i % this.maxParticles] = new Particle(x, y, color, speed, size, decay);
            }
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => p.draw(ctx));
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    }
}

const Particles = new ParticleManager();
