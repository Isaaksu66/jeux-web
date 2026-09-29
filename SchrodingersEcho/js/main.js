// Données du niveau 1
const level1Data = {
    layout: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,5,1],
        [1,0,0,0,0,0,1,0,0,1,1,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,1],
        [1,0,0,1,1,1,1,0,0,1,0,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1],
        [1,1,1,1,0,1,1,1,1,1,3,1,1,1,1,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    spawn: { x: 2, y: 2 },
    buttons: [
        { id: 'door1', x: 2, y: 8 } // Bouton en bas à gauche
    ],
    doors: [
        { id: 'door1', x: 10, y: 7, isOpen: false } // Porte en haut à droite
    ]
};

// --- Explication du niveau 1 ---
// Le joueur spawn en (2,2).
// Il y a un mur qui le sépare du bouton (2,8) en ligne droite.
// Il y a une porte (10,7) fermée.
// Le but est de se diviser. Un fantôme va appuyer sur le bouton en (2,8),
// ce qui ouvre la porte en (10,7). L'autre fantôme peut alors passer la porte.
// Puis le joueur s'effondre sur le fantôme qui a passé la porte.

let renderer, level, player;
let lastTime = 0;

function init() {
    renderer = new Renderer('gameCanvas');
    level = new Level();
    level.load(level1Data);
    player = new Player(level);
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Update logic
    player.update();
    level.update(player.ghosts);
    particles.update();
    renderer.updateCamera(player, level);
    
    // Render
    renderer.draw(level, player, particles);
    
    // Check win condition
    if (player.ghosts.some(g => g.hasWon)) {
        document.getElementById('levelInfo').innerText = "Niveau Complété ! Bravo !";
        particles.emit(player.ghosts[0].x, player.ghosts[0].y, '#00FF00', 50);
        player.ghosts.forEach(g => g.hasWon = false); // Prevent spam
        setTimeout(() => init(), 3000); // Restart level for now
    }
    
    // Clear just pressed keys at end of frame
    Input.clearJustPressed();
    
    requestAnimationFrame(gameLoop);
}

// Start game when everything is loaded
window.addEventListener('load', init);
