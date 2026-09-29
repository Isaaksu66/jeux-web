class FloatingText {
    constructor(x, y, text, color, size = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        
        this.life = 1.0;
        this.vy = -50; // Vitesse vers le haut
        
        // Un léger angle aléatoire pour le jus
        this.vx = (Math.random() - 0.5) * 30;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt * 1.5; // Disparaît en ~0.6 secondes
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = `900 ${this.size}px 'Fredoka', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Contour noir épais
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, this.x, this.y);
        
        // Intérieur coloré
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.restore();
    }
}

class FloatingTextManager {
    constructor() {
        this.texts = [];
    }

    add(x, y, text, color = '#FFF', size = 20) {
        this.texts.push(new FloatingText(x, y, text, color, size));
    }

    update(dt) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            this.texts[i].update(dt);
            if (this.texts[i].life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.texts.forEach(t => t.draw(ctx));
    }
}

const DamageTexts = new FloatingTextManager();
