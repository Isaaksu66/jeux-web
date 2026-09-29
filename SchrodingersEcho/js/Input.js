class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (!this.justPressed[e.code]) {
                this.justPressed[e.code] = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    update() {
        // Reset justPressed after the frame has processed it
        // This will be called at the end of the game loop
    }

    clearJustPressed() {
        this.justPressed = {};
    }

    isDown(code) {
        return this.keys[code] === true;
    }

    isJustPressed(code) {
        return this.justPressed[code] === true;
    }
}

const Input = new InputManager();
