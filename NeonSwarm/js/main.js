let game;
let lastTime = 0;
let frames = 0;
let lastFpsTime = 0;

function init() {
    game = new Game();
    game.start();
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    // Calcul du deltaTime en secondes
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // Limite si le jeu lag trop (ex: changement d'onglet)
    lastTime = timestamp;

    // Calcul FPS
    frames++;
    if (timestamp - lastFpsTime > 1000) {
        document.getElementById('fps').innerText = `FPS: ${frames}`;
        frames = 0;
        lastFpsTime = timestamp;
    }

    game.update(dt);
    game.renderer.updateCamera(game.player, dt);
    game.draw();
    
    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
