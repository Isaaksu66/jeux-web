// Particles.js
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
        const timeScale = dt * 60; 
        this.x += this.vx * timeScale;
        this.y += this.vy * timeScale;
        this.vx *= Math.pow(0.90, timeScale);
        this.vy *= Math.pow(0.90, timeScale);
        this.life -= this.decay * timeScale;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color;
        // Effet "Pop" cartoon: la taille diminue
        const currentSize = Math.max(0, this.size * this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Petit contour sombre pour le style cartoon
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    emit(x, y, color, count, speed = 5, size = 6, decay = 0.05) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length < this.maxParticles) {
                this.particles.push(new Particle(x, y, color, speed, size, decay));
            } else {
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
        this.particles.forEach(p => p.draw(ctx));
    }
}

const Particles = new ParticleManager();
