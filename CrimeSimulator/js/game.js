// =====================================================
// GLOBAL ERROR HANDLER FOR EASY CLIENT-SIDE DEBUGGING
// =====================================================
window.onerror = function(msg, url, line, col, error) {
    console.error("CRIME SIMULATOR JS ERROR:", msg, "\nLine:", line, "\nCol:", col, "\nURL:", url);
    return true; // Suppress default browser error dialogs
};

// =====================================================
// CRIME SIMULATOR - Shadow Heist 3D Core Engine v3.2
// =====================================================

const TILE_SIZE = 4;

// DOM Elements Cache
let elStealthIndicator, elSuspicionFill, elBackpackStatus, elBreathFill, elActiveToolDisplay, elToolAmmo, elMissionTimer, elNoiseDbText, elWave1, elWave2, elPrompt;
let elDriveDistance, elDriveStars, elDriveSpeedVal, elDriveHealthFill;
let elNightVisionOverlay, elPoliceFlashOverlay;
let elUpgGloves, elUpgNvg, elUpgServer, elUpgChassis, elUpgV8, elUpgRadar, elUpgJammer, elUpgKevlar;

window.addEventListener('DOMContentLoaded', () => {
    elStealthIndicator = document.getElementById('stealth-indicator');
    elSuspicionFill = document.getElementById('suspicion-fill');
    elBackpackStatus = document.getElementById('backpack-status');
    elBreathFill = document.getElementById('breath-fill');
    elActiveToolDisplay = document.getElementById('active-tool-display');
    elToolAmmo = document.getElementById('tool-ammo');
    elMissionTimer = document.getElementById('mission-timer');
    elNoiseDbText = document.getElementById('noise-db-text');
    elWave1 = document.getElementById('wave-1');
    elWave2 = document.getElementById('wave-2');
    elPrompt = document.getElementById('interaction-prompt');
    elDriveDistance = document.getElementById('drive-distance');
    elDriveStars = document.getElementById('drive-stars');
    elDriveSpeedVal = document.getElementById('drive-speed-val');
    elDriveHealthFill = document.getElementById('drive-health-fill');
    elNightVisionOverlay = document.getElementById('nightvision-overlay');
    elPoliceFlashOverlay = document.getElementById('police-flash-overlay');
    elUpgGloves = document.getElementById('upg-gloves');
    elUpgNvg = document.getElementById('upg-nvg');
    elUpgServer = document.getElementById('upg-server');
    elUpgChassis = document.getElementById('upg-chassis');
    elUpgV8 = document.getElementById('upg-v8');
    elUpgRadar = document.getElementById('upg-radar');
    elUpgJammer = document.getElementById('upg-jammer');
    elUpgKevlar = document.getElementById('upg-kevlar');
    
    // Bind sensitivity slider
    const elSens = document.getElementById('mouse-sensitivity');
    const elSensVal = document.getElementById('sensitivity-value');
    if (elSens) {
        mouseSensitivity = parseFloat(elSens.value);
        if (elSensVal) elSensVal.textContent = mouseSensitivity.toFixed(4);
        elSens.addEventListener('input', () => {
            mouseSensitivity = parseFloat(elSens.value);
            if (elSensVal) elSensVal.textContent = mouseSensitivity.toFixed(4);
        });
    }
});

let mouseSensitivity = 0.0006;

// DOM Values Cache to prevent layout reflows
let lastDisplayedNoise = -1;
let lastDisplayedSuspicion = -1;
let lastDisplayedStamina = -1;
let lastPromptText = "";
let lastPromptVisible = false;

// Pre-allocated reusable static Vector math classes to prevent GC pauses
const _forwardVec = new THREE.Vector3();
const _sideVec = new THREE.Vector3();
const _rawForwardVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _tempOldPos = new THREE.Vector3();
const _guardForward = new THREE.Vector3();
const _guardToPlayer = new THREE.Vector3();
const _camToPlayer = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _guardDir = new THREE.Vector3();
const _tempProjOffset = new THREE.Vector3();

// Reusable static Raycaster
const interactionRaycaster = new THREE.Raycaster();

// Wall bounds cache array
let wallBounds = [];

function addWallCollision(mesh, widthX = TILE_SIZE, widthZ = TILE_SIZE) {
    walls.push(mesh);
    wallBounds.push({
        mesh: mesh,
        minX: mesh.position.x - widthX / 2,
        maxX: mesh.position.x + widthX / 2,
        minZ: mesh.position.z - widthZ / 2,
        maxZ: mesh.position.z + widthZ / 2
    });
}

function getDistance2DSq(x1, z1, x2, z2) {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return dx * dx + dz * dz;
}

// ===================== ECONOMY & STATE =====================
let debt = 25000;
let cleanCash = 500;
let dirtyCash = 0;
let permanentHeat = 0; // Permanent police heat percentage (0% to 100%)

let upgrades = {
    gloves: false,
    nvg: false,
    server: false,
    chassis: false,
    v8: false,
    radar: false,
    jammer: false,
    kevlar: false
};

let inventory = {
    lockpick: 3,
    titanium: 0,
    titaniumDurability: 5, // 5 mistakes allowed
    iem: 0,                 // EMP device
    gas: 1,
    crowbar: false,
    boots: false            // Felt-sole boots
};

// Loot storage in Hideout
let hideoutStash = []; // Items: TV, Laptop, Gold Bar

// Current mission data
let currentJob = null;
let backpack = []; // Items: cash, files, gold bar, USB key
let carTrunk = []; 
let activeTool = 'hands'; // 'hands', 'lockpick', 'titanium', 'iem', 'gas', 'crowbar', 'dart', 'heavy_load'
let alertLevel = 'clear'; // 'clear', 'suspicious', 'alarm'
let suspicion = 0;
let missionTime = 300;
let missionTimerInterval = null;
let playerFlashlight = false;
let playerNoise = 0; // Current noise level in dB
let projectiles = [];
let animationFrameId = null;
let footstepTimer = 0;

// Lockpicking state
let lockpickActive = false;
let lockpickTarget = null;
let lockpickAngle = 0;
let lockpickSweetSpot = 0;
let lockpickTumblersCracked = 0;
let lockpickSpeed = 0.05;

// Hacking (Electrical box) state
let elecActive = false;
let elecTargetTarget = null;
let elecStage = 0;
let elecIndicatorPos = 0;
let elecIndicatorDir = 1;
let elecTargetPos = 50;

// Glass cutter state
let glassActive = false;
let glassProgress = 0;
let glassTargetAngle = 0;
let mouseIsDown = false;
let glassTargetDoor = null;

// Thermal drill state
let drillActive = false;
let drillProgress = 0;
let drillTemp = 20; // Starts at room temperature
let drillTargetSafe = null;

// Blowtorch melting state
let torchActive = false;
let torchProgress = 0;
let torchDragging = false;
let goldItemToMeltIndex = -1;

// Holding Breath (Apnée) state
let isHoldingBreath = false;
let breathStamina = 100;
let breathCooldown = false;

// 3D Car Chase (Driving Phase) state
let drivingActive = false;
let drivingSpeed = 0;
let drivingDistance = 0;
let drivingHealth = 100;
let drivingSearchStars = 3;
let drivingHeadlights = true;
let drivingLanes = [-3, 0, 3]; // Left, Middle, Right positions
let drivingPlayerLane = 1; // Middle
let drivingObstacles = [];
let drivingSpawnTimer = 0;
let drivingCarModel = null;
let drivingRoadSegments = [];
let speedLines = [];

// Web Audio API context for radio effects, alarms, and engine hums
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Walkie Talkie Beep Sound Effect
function playRadioBeep() {
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
        
        // Short white noise static
        const bufferSize = audioCtx.sampleRate * 0.08;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        noise.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start();
    } catch(e) {}
}

// Synthesized Sound Effects
function playAlarmSiren() {
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
    } catch(e) {}
}

function playFootstepSound() {
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(70, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    } catch(e) {}
}

function playDogBarkSound() {
    initAudio();
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(45, audioCtx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.16);
    } catch(e) {}
}

function playGlassCrackSound() {
    initAudio();
    if (!audioCtx) return;
    try {
        const bufferSize = audioCtx.sampleRate * 0.12;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.1);
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    } catch(e) {}
}

function startEngineSound() {
    initAudio();
    if (!audioCtx || engineOsc) return;
    try {
        engineOsc = audioCtx.createOscillator();
        engineGain = audioCtx.createGain();
        engineOsc.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
        engineGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
        engineOsc.start();
    } catch(e) {}
}

function stopEngineSound() {
    if (engineOsc) {
        try {
            engineOsc.stop();
            engineOsc.disconnect();
        } catch(e){}
        engineOsc = null;
        engineGain = null;
    }
}

function setEngineSoundPitch(freq) {
    if (engineOsc) {
        engineOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    }
}

let sirenOsc = null;
let sirenGain = null;
let sirenFreqDir = 1;
let sirenFreqVal = 600;

function startSirenSound() {
    initAudio();
    if (!audioCtx || sirenOsc) return;
    try {
        sirenOsc = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();
        sirenOsc.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOsc.type = 'sawtooth';
        sirenOsc.frequency.setValueAtTime(sirenFreqVal, audioCtx.currentTime);
        sirenGain.gain.setValueAtTime(0.005, audioCtx.currentTime);
        sirenOsc.start();
    } catch(e) {}
}

function stopSirenSound() {
    if (sirenOsc) {
        try {
            sirenOsc.stop();
            sirenOsc.disconnect();
        } catch(e) {}
        sirenOsc = null;
        sirenGain = null;
    }
}

function updateSirenSound(delta, distance) {
    if (!sirenOsc) return;
    sirenFreqVal += sirenFreqDir * delta * 700;
    if (sirenFreqVal > 950) {
        sirenFreqVal = 950;
        sirenFreqDir = -1;
    } else if (sirenFreqVal < 450) {
        sirenFreqVal = 450;
        sirenFreqDir = 1;
    }
    sirenOsc.frequency.setValueAtTime(sirenFreqVal, audioCtx.currentTime);
    
    if (sirenGain) {
        const vol = Math.max(0, Math.min(0.015, (1 - distance / 35) * 0.015));
        sirenGain.gain.setValueAtTime(vol, audioCtx.currentTime);
    }
}

let tensionOsc = null;
let tensionGain = null;
let tensionInterval = null;
let tensionSeqStep = 0;

function startTensionMusic() {
    initAudio();
    if (!audioCtx || tensionOsc) return;
    try {
        tensionOsc = audioCtx.createOscillator();
        tensionGain = audioCtx.createGain();
        tensionOsc.connect(tensionGain);
        tensionGain.connect(audioCtx.destination);
        tensionOsc.type = 'triangle';
        tensionOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
        tensionGain.gain.setValueAtTime(0.012, audioCtx.currentTime);
        tensionOsc.start();
        
        tensionSeqStep = 0;
        tensionInterval = setInterval(() => {
            if (!audioCtx || !tensionOsc) return;
            let notes = alertLevel === 'alarm' ? [65.4, 73.4, 82.4, 73.4] : [55, 55, 61.7, 55];
            if (drivingActive) {
                notes = [110, 130.8, 146.8, 130.8];
            }
            const note = notes[tensionSeqStep % notes.length];
            tensionOsc.frequency.setValueAtTime(note, audioCtx.currentTime);
            
            tensionGain.gain.cancelScheduledValues(audioCtx.currentTime);
            tensionGain.gain.setValueAtTime(0.015, audioCtx.currentTime);
            tensionGain.gain.exponentialRampToValueAtTime(0.002, audioCtx.currentTime + 0.35);
            
            tensionSeqStep++;
        }, alertLevel === 'alarm' ? 380 : 700);
    } catch(e) {}
}

function stopTensionMusic() {
    if (tensionInterval) {
        clearInterval(tensionInterval);
        tensionInterval = null;
    }
    if (tensionOsc) {
        try {
            tensionOsc.stop();
            tensionOsc.disconnect();
        } catch(e) {}
        tensionOsc = null;
        tensionGain = null;
    }
}

// ===================== UI PAGES & TAB MANAGEMENT =====================
const screens = {
    hideout: document.getElementById('hideout-screen'),
    game: document.getElementById('game-screen'),
    lockpick: document.getElementById('lockpick-screen'),
    hacking: document.getElementById('hacking-screen'),
    glass: document.getElementById('glass-cutter-screen'),
    drill: document.getElementById('thermal-drill-screen'),
    blowtorch: document.getElementById('blowtorch-screen'),
    trunk: document.getElementById('trunk-screen'),
    result: document.getElementById('result-screen'),
    lockOverlay: document.getElementById('lock-screen')
};

function showScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if (key === screenKey) {
            screens[key].classList.remove('hidden');
        } else {
            screens[key].classList.add('hidden');
        }
    });
    if (screenKey === 'game') {
        if (!animationFrameId && renderer && scene && camera) {
            prevTime = performance.now(); // Reset delta clock
            animate3D();
        }
    }
}

// Navigation Tabs
document.getElementById('black-market-tab').addEventListener('click', () => switchTab('black-market'));
document.getElementById('contracts-tab').addEventListener('click', () => switchTab('contracts'));
document.getElementById('dismantle-tab').addEventListener('click', () => switchTab('dismantle'));

function switchTab(tabKey) {
    const tabs = {
        'black-market': { btn: 'black-market-tab', sec: 'black-market-section' },
        'contracts': { btn: 'contracts-tab', sec: 'contracts-section' },
        'dismantle': { btn: 'dismantle-tab', sec: 'dismantle-section' }
    };
    
    Object.keys(tabs).forEach(k => {
        const t = tabs[k];
        if (k === tabKey) {
            document.getElementById(t.btn).classList.add('active');
            document.getElementById(t.sec).classList.remove('hidden');
        } else {
            document.getElementById(t.btn).classList.remove('active');
            document.getElementById(t.sec).classList.add('hidden');
        }
    });
    
    if (tabKey === 'dismantle') {
        renderDismantleStation();
    }
}

// Update HUD values
function updateHideoutHUD() {
    document.getElementById('debt-value').textContent = '$' + debt.toLocaleString();
    const debtProgress = Math.max(0, (debt / 25000) * 100);
    document.getElementById('debt-progress').style.width = debtProgress + '%';

    document.getElementById('heat-value').textContent = permanentHeat + '%';
    document.getElementById('heat-progress').style.width = permanentHeat + '%';
    
    document.getElementById('clean-cash').textContent = '$' + cleanCash.toLocaleString();
    document.getElementById('dirty-cash').textContent = '$' + dirtyCash.toLocaleString();
    
    document.getElementById('inv-lockpicks').textContent = inventory.lockpick;
    document.getElementById('inv-titanium-durability').textContent = inventory.titanium > 0 ? `${inventory.titaniumDurability}/5` : '0/5';
    document.getElementById('inv-iem').textContent = inventory.iem;
    document.getElementById('inv-gas').textContent = inventory.gas;
    document.getElementById('inv-crowbar').textContent = inventory.crowbar ? 'Yes' : 'No';
    document.getElementById('inv-boots').textContent = inventory.boots ? 'Yes' : 'No';
    
    // Upgrades indicators
    if (elUpgGloves) elUpgGloves.textContent = upgrades.gloves ? 'Yes' : 'No';
    if (elUpgNvg) elUpgNvg.textContent = upgrades.nvg ? 'Yes' : 'No';
    if (elUpgServer) elUpgServer.textContent = upgrades.server ? 'Yes (5% Fee)' : 'No';
    if (elUpgChassis) elUpgChassis.textContent = upgrades.chassis ? 'Yes (+50 HP)' : 'No';
    if (elUpgV8) elUpgV8.textContent = upgrades.v8 ? 'Yes (+40% Accel)' : 'No';
    if (elUpgRadar) elUpgRadar.textContent = upgrades.radar ? 'Yes' : 'No';
    if (elUpgJammer) elUpgJammer.textContent = upgrades.jammer ? 'Yes' : 'No';
    if (elUpgKevlar) elUpgKevlar.textContent = upgrades.kevlar ? 'Yes (-40% Dmg, +50 HP)' : 'No';
}

// Laundering Cash
document.getElementById('launder-btn').addEventListener('click', () => {
    if (dirtyCash <= 0) return;
    const feeRate = upgrades.server ? 0.05 : 0.15;
    const fee = Math.floor(dirtyCash * feeRate);
    const cleaned = dirtyCash - fee;
    cleanCash += cleaned;
    dirtyCash = 0;
    
    playRadioBeep();
    updateHideoutHUD();
    triggerRadioMessage("Lookout", "Cash laundered successfully. Keep it clean!");
});

// Buy Items
document.querySelectorAll('.shop-item').forEach(item => {
    const buyBtn = item.querySelector('.buy-btn');
    const itemName = item.getAttribute('data-item');
    const price = parseInt(item.getAttribute('data-price'), 10);
    
    buyBtn.addEventListener('click', () => {
        // Check if already purchased
        if ((itemName === 'crowbar' && inventory.crowbar) ||
            (itemName === 'boots' && inventory.boots) ||
            (upgrades[itemName] !== undefined && upgrades[itemName])) {
            alert("Amélioration déjà acquise !");
            return;
        }

        if (cleanCash >= price) {
            cleanCash -= price;
            if (itemName === 'lockpick') inventory.lockpick += 1;
            else if (itemName === 'titanium') {
                inventory.titanium += 1;
                inventory.titaniumDurability = 5;
            }
            else if (itemName === 'iem') inventory.iem += 1;
            else if (itemName === 'gas') inventory.gas += 1;
            else if (itemName === 'crowbar') inventory.crowbar = true;
            else if (itemName === 'boots') inventory.boots = true;
            else if (upgrades[itemName] !== undefined) {
                upgrades[itemName] = true;
            }
            
            updateHideoutHUD();
            playRadioBeep();
        } else {
            alert("Pas assez d'argent propre !");
        }
    });
});

// ===================== RADIO COMMUNICATIONS =====================
function triggerRadioMessage(sender, text) {
    const radioBox = document.getElementById('radio-box');
    const radioText = document.getElementById('radio-text');
    
    radioText.innerHTML = `<strong>${sender}:</strong> "${text}"`;
    radioBox.classList.remove('radio-hidden');
    playRadioBeep();
    
    setTimeout(() => {
        radioBox.classList.add('radio-hidden');
    }, 5500);
}

// ===================== DISMANTLE STATION LOGIC =====================
function renderDismantleStation() {
    const container = document.getElementById('dismantle-container');
    container.innerHTML = '';
    
    const electronics = hideoutStash.filter(item => item.type === 'tv' || item.type === 'laptop');
    const goldBars = hideoutStash.filter(item => item.type === 'gold bar');

    if (electronics.length === 0 && goldBars.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No items available for treatment in the Hideout.</p>';
        return;
    }
    
    // Render Electronics
    electronics.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'dismantle-card';
        let desc = item.type === 'tv' ? 'Can be stripped into Copper Wire and LCD panels.' : 'Can be stripped into Microchips and Circuit Boards.';
        card.innerHTML = `
            <div>
                <h3>📺 Stolen Heavy ${item.type.toUpperCase()}</h3>
                <p style="color: var(--text-muted); font-size: 13px;">${desc}</p>
            </div>
            <button class="btn-main" onclick="dismantleItem(${index})">🔨 STRIP FOR PARTS</button>
        `;
        container.appendChild(card);
    });

    // Render Gold Bars to melt
    goldBars.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'dismantle-card';
        card.innerHTML = `
            <div>
                <h3>🪙 Gold Bar (1kg)</h3>
                <p style="color: var(--text-muted); font-size: 13px;">Has Bank stamps. Must be melted with blowtorch to remove tracing.</p>
            </div>
            <button class="btn-main" onclick="launchGoldMelting(${index})">🔥 MELT GOLD STAMP ($8,000)</button>
        `;
        container.appendChild(card);
    });
}

window.dismantleItem = function(index) {
    let electronicsCount = 0;
    let mainIndex = -1;
    for (let i = 0; i < hideoutStash.length; i++) {
        if (hideoutStash[i].type === 'tv' || hideoutStash[i].type === 'laptop') {
            if (electronicsCount === index) {
                mainIndex = i;
                break;
            }
            electronicsCount++;
        }
    }
    if (mainIndex === -1) return;

    const item = hideoutStash.splice(mainIndex, 1)[0];
    let partsValue = item.type === 'tv' ? 3200 : 1800;
    
    dirtyCash += partsValue;
    playRadioBeep();
    updateHideoutHUD();
    renderDismantleStation();
    triggerRadioMessage("Hacker", `Stolen electronic dismantled! Secured parts worth $${partsValue.toLocaleString()} sold to Darknet.`);
};

// ===================== BLOWTORCH FUSION MINI-GAME =====================
function launchGoldMelting(index) {
    let goldCount = 0;
    let mainIndex = -1;
    for (let i = 0; i < hideoutStash.length; i++) {
        if (hideoutStash[i].type === 'gold bar') {
            if (goldCount === index) {
                mainIndex = i;
                break;
            }
            goldCount++;
        }
    }
    if (mainIndex === -1) return;

    goldItemToMeltIndex = mainIndex;
    torchActive = true;
    torchProgress = 0;
    torchDragging = false;
    
    document.getElementById('gold-fusion-progress-line').style.width = '0px';
    document.getElementById('torch-spark').classList.add('hidden');
    document.getElementById('torch-status').textContent = "Fusion de l'or : 0%";
    
    showScreen('blowtorch');
}

const blowtorchArea = document.getElementById('blowtorch-area');
const torchSpark = document.getElementById('torch-spark');

blowtorchArea.addEventListener('mousedown', (e) => {
    if (!torchActive) return;
    torchDragging = true;
    torchSpark.classList.remove('hidden');
    updateTorchPosition(e);
});

window.addEventListener('mousemove', (e) => {
    if (!torchActive || !torchDragging) return;
    updateTorchPosition(e);
});

window.addEventListener('mouseup', () => {
    if (!torchActive) return;
    torchDragging = false;
    torchSpark.classList.add('hidden');
});

function updateTorchPosition(e) {
    const rect = blowtorchArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    torchSpark.style.left = x + 'px';
    torchSpark.style.top = y + 'px';
    
    if (Math.abs(y - 50) < 16 && x >= 20 && x <= 300) {
        const progressX = x - 20;
        const currentTargetProgress = Math.floor((progressX / 280) * 100);
        
        if (currentTargetProgress > torchProgress && currentTargetProgress <= torchProgress + 15) {
            torchProgress = currentTargetProgress;
            document.getElementById('gold-fusion-progress-line').style.width = progressX + 'px';
            document.getElementById('torch-status').textContent = `FUSION DE L'OR : ${torchProgress}%`;
            
            if (Math.random() < 0.15) playRadioBeep(); 
            
            if (torchProgress >= 100) {
                successGoldMelting();
            }
        }
    }
}

function successGoldMelting() {
    torchActive = false;
    torchDragging = false;
    
    hideoutStash.splice(goldItemToMeltIndex, 1);
    cleanCash += 8000;
    
    playRadioBeep();
    updateHideoutHUD();
    showScreen('hideout');
    renderDismantleStation();
    
    alert("Lingot d'or fondu avec succès ! Le logo de la banque est effacé, vous encaissez $8 000 en argent propre !");
}

document.getElementById('close-blowtorch-btn').addEventListener('click', () => {
    torchActive = false;
    showScreen('hideout');
    renderDismantleStation();
});

// ===================== 3D GAME SETUP (THREE.JS) =====================
let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, crouch = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
let pointerLocked = false;
Object.defineProperty(window, 'pointerLocked', {
    get: () => pointerLocked,
    set: (v) => { pointerLocked = v; }
});
let flashlightLight = null;

// 3D Entities
let walls = [];
let floorTraps = [];
let guards = [];
let lootObjects = [];
let doors = [];
let lasers = [];
let guardDogs = [];
let getawayCar = null;
let cameras = [];
let rainGeometry = null;
let rainParticles = null;
const rainCount = 600;

// Interactive 3D Objects
let electricalBox = null;
let paintingCover = null;
let internalSafe = null;

let elecBoxSolved = false;
let elecBoxBridged = false;

// Map definitions
// 1 = Wall, 2 = Door (Locked), 3 = Safe, 4 = Cash Loot, 5 = Painting, 6 = Car, 7 = Parquet, 8 = Broken Glass, 9 = TV (Heavy), 0 = Empty
const MAP_SHOP = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,6,0,0,0,0,1,4,0,0,3,1],
    [1,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,2,7,7,7,7,1],
    [1,0,0,0,0,0,1,1,1,2,1,1],
    [1,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,1,4,5,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

const MAP_VILLA = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,6,0,8,8,1,0,0,0,0,1,5,0,3,1], 
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,2,0,0,0,0,2,0,0,0,1],
    [1,1,2,1,1,1,0,0,0,0,1,1,2,1,1], 
    [1,4,0,0,0,1,1,1,2,1,1,0,0,4,1],
    [1,0,0,0,0,1,9,0,0,0,2,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Initialize Pointer Lock
const lockBtn = document.getElementById('lock-btn');
lockBtn.addEventListener('click', () => {
    document.body.requestPointerLock();
});

// Robust Pointer Lock State change detection (v3.2)
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) {
        pointerLocked = true;
        screens.lockOverlay.classList.add('hidden');
        if (drivingActive) startEngineSound();
    } else {
        pointerLocked = false;
        stopEngineSound();
        if (!screens.game.classList.contains('hidden') && 
            !lockpickActive && !elecActive && !glassActive && !drillActive &&
            screens.trunk.classList.contains('hidden')) {
            screens.lockOverlay.classList.remove('hidden');
        }
    }
});

document.addEventListener('pointerlockerror', () => {
    // Fallback: If browser blocks pointer lock, bypass overlay and let player play
    pointerLocked = true;
    screens.lockOverlay.classList.add('hidden');
    triggerRadioMessage("Lookout", "Guetteur : 'Verrouillage souris bloqué par le navigateur. Contrôles de secours activés.'");
});

// Handle keys
let nightVisionActive = false;

function toggleNightVision() {
    if (drivingActive || !upgrades.nvg) return;
    nightVisionActive = !nightVisionActive;
    if (elNightVisionOverlay) {
        if (nightVisionActive) {
            elNightVisionOverlay.classList.remove('hidden');
        } else {
            elNightVisionOverlay.classList.add('hidden');
        }
    }
    
    // Boost ambient lighting when active
    if (scene) {
        scene.children.forEach(c => {
            if (c instanceof THREE.AmbientLight) {
                // Boost ambient to green-tinted light, otherwise restore standard/bridged ambient
                c.color.setHex(nightVisionActive ? 0x22ff55 : (elecBoxBridged ? 0x050512 : 0x22223c));
            }
        });
    }
    playRadioBeep();
}

document.addEventListener('keydown', e => {
    if (!pointerLocked) return;
    if (e.key === '1') selectTool('hands');
    if (e.key === '2') selectTool('lockpick');
    if (e.key === '3') selectTool('titanium');
    if (e.key === '4') selectTool('iem');
    if (e.key === '5') selectTool('gas');
    if (e.key === '6') selectTool('crowbar');
    
    if ((e.key === 'n' || e.key === 'N') && upgrades.nvg) {
        toggleNightVision();
    }
    
    if (e.key === 'e' || e.key === 'E') {
        interact();
    }
    if (e.key === 'f' || e.key === 'F') {
        toggleFlashlight();
    }

    if ((e.key === 'x' || e.key === 'X') && !isHoldingBreath && !breathCooldown) {
        isHoldingBreath = true;
    }
    
    if (drivingActive && (e.key === 'l' || e.key === 'L')) {
        drivingHeadlights = !drivingHeadlights;
        triggerRadioMessage("Lookout", drivingHeadlights ? "Phares allumés. Tu y vois plus clair !" : "Phares coupés. Tu passes inaperçu dans l'ombre.");
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'x' || e.key === 'X') {
        isHoldingBreath = false;
    }
});

function toggleFlashlight() {
    if (drivingActive) return;
    playerFlashlight = !playerFlashlight;
    flashlightLight.visible = playerFlashlight;
    playRadioBeep();
    triggerRadioMessage("Lookout", playerFlashlight ? "Lampe allumée. Fais gaffe aux cônes de garde !" : "Lampe éteinte. Reste discret.");
}

function selectTool(toolKey) {
    if (backpack.some(item => item.heavy)) {
        triggerRadioMessage("Hacker", "You are carrying a HEAVY load! Drop it in the trunk first.");
        return;
    }
    if (toolKey === 'lockpick' && inventory.lockpick <= 0) {
        triggerRadioMessage("Hacker", "No lockpicks left!");
        return;
    }
    if (toolKey === 'titanium' && inventory.titanium <= 0) {
        triggerRadioMessage("Hacker", "No Titanium lockpick left!");
        return;
    }
    if (toolKey === 'iem' && inventory.iem <= 0) {
        triggerRadioMessage("Hacker", "No EMP (IEM) device left!");
        return;
    }
    if (toolKey === 'gas' && inventory.gas <= 0) {
        triggerRadioMessage("Hacker", "No gas grenades left!");
        return;
    }
    if (toolKey === 'crowbar' && !inventory.crowbar) {
        triggerRadioMessage("Hacker", "No crowbar purchased.");
        return;
    }
    
    activeTool = toolKey;
    if (elActiveToolDisplay) elActiveToolDisplay.textContent = toolKey.toUpperCase();
    
    let ammoText = "";
    if (toolKey === 'lockpick') ammoText = `Qty: ${inventory.lockpick}`;
    else if (toolKey === 'titanium') ammoText = `Durability: ${inventory.titaniumDurability}/5`;
    else if (toolKey === 'iem') ammoText = `Qty: ${inventory.iem}`;
    else if (toolKey === 'gas') ammoText = `Qty: ${inventory.gas}`;
    else if (toolKey === 'crowbar') ammoText = `Reusable`;
    
    if (elToolAmmo) elToolAmmo.textContent = ammoText;
}

// Mouse look
document.addEventListener('mousemove', e => {
    if (!pointerLocked || drivingActive) return;
    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;
    
    camera.rotation.y -= movementX * mouseSensitivity;
    camera.rotation.x -= movementY * mouseSensitivity;
    camera.rotation.x = Math.max(-Math.PI/2.4, Math.min(Math.PI/2.4, camera.rotation.x));
});

// Keyboard controls with multi-layout support (WASD, ZQSD, arrows) (v3.2)
const onKeyDown = function (event) {
    const key = event.key.toLowerCase();
    
    if (drivingActive) {
        if (event.code === 'KeyA' || event.code === 'KeyQ' || event.code === 'ArrowLeft' || key === 'a' || key === 'q') {
            drivingPlayerLane = Math.max(0, drivingPlayerLane - 1);
        }
        if (event.code === 'KeyD' || event.code === 'ArrowRight' || key === 'd') {
            drivingPlayerLane = Math.min(2, drivingPlayerLane + 1);
        }
        if (event.code === 'Space') {
            event.preventDefault();
            drivingSpeed = Math.max(10, drivingSpeed - 15);
        }
        return;
    }

    if (event.code === 'KeyW' || event.code === 'KeyZ' || key === 'w' || key === 'z' || event.code === 'ArrowUp') {
        moveForward = true;
    }
    if (event.code === 'KeyA' || event.code === 'KeyQ' || key === 'a' || key === 'q' || event.code === 'ArrowLeft') {
        moveLeft = true;
    }
    if (event.code === 'KeyS' || key === 's' || event.code === 'ArrowDown') {
        moveBackward = true;
    }
    if (event.code === 'KeyD' || key === 'd' || event.code === 'ArrowRight') {
        moveRight = true;
    }
    if (event.code === 'KeyC' || key === 'c') {
        crouch = true;
    }
};

const onKeyUp = function (event) {
    if (drivingActive) return;
    const key = event.key.toLowerCase();
    
    if (event.code === 'KeyW' || event.code === 'KeyZ' || key === 'w' || key === 'z' || event.code === 'ArrowUp') {
        moveForward = false;
    }
    if (event.code === 'KeyA' || event.code === 'KeyQ' || key === 'a' || key === 'q' || event.code === 'ArrowLeft') {
        moveLeft = false;
    }
    if (event.code === 'KeyS' || key === 's' || event.code === 'ArrowDown') {
        moveBackward = false;
    }
    if (event.code === 'KeyD' || key === 'd' || event.code === 'ArrowRight') {
        moveRight = false;
    }
    if (event.code === 'KeyC' || key === 'c') {
        crouch = false;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Launch contracts
document.querySelectorAll('.launch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.contract-card');
        const jobKey = card.getAttribute('data-contract');
        launchMission(jobKey);
    });
});

document.getElementById('abort-btn').addEventListener('click', () => {
    abortMission();
});

// ===================== MISSION ENGINE BUILDER =====================
let mapGrid = [];
// TILE_SIZE defined at top

function cleanupScene() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    stopEngineSound();
    stopSirenSound();
    stopTensionMusic();
    
    if (missionTimerInterval) {
        clearInterval(missionTimerInterval);
        missionTimerInterval = null;
    }
    
    if (scene) {
        // Dispose of scene children, geometries, materials
        scene.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        
        // Remove rain particles
        if (rainParticles) {
            scene.remove(rainParticles);
            rainParticles = null;
        }
        if (rainGeometry) {
            rainGeometry.dispose();
            rainGeometry = null;
        }
        
        scene = null;
    }
    
    // Clear WebGL renderer and keep context
    if (renderer) {
        renderer.clear();
    }
    
    // Reset global references to old scene meshes
    flashlightLight = null;
    electricalBox = null;
    paintingCover = null;
    internalSafe = null;
    
    walls = [];
    wallBounds = []; // Clear collision cache
    floorTraps = [];
    guards = [];
    lootObjects = [];
    doors = [];
    lasers = [];
    guardDogs = [];
    getawayCar = null;
    cameras = [];
    projectiles = [];
    
    nightVisionActive = false;
    if (elNightVisionOverlay) {
        elNightVisionOverlay.classList.add('hidden');
    }
}

function launchMission(jobKey) {
    cleanupScene(); // Dispose of previous Three.js assets to prevent GPU memory leaks and progressive lag
    
    drivingActive = false;
    elecBoxSolved = false;
    elecBoxBridged = false;
    
    currentJob = jobKey;
    backpack = [];
    carTrunk = [];
    suspicion = 0;
    alertLevel = 'clear';
    missionTime = 300;
    playerFlashlight = false;
    playerNoise = 0;
    isHoldingBreath = false;
    breathStamina = 100;
    breathCooldown = false;
    
    // Reset DOM caches
    lastDisplayedNoise = -1;
    lastDisplayedSuspicion = -1;
    lastDisplayedStamina = -1;
    lastPromptText = "";
    lastPromptVisible = false;
    
    document.getElementById('game-screen').className = 'screen';
    
    // Toggle HUD panels
    const hudStealth = document.getElementById('hud-stealth');
    const hudDriving = document.getElementById('hud-driving');
    if (hudStealth) hudStealth.classList.remove('hidden');
    if (hudDriving) hudDriving.classList.add('hidden');
    
    if (elStealthIndicator) {
        elStealthIndicator.textContent = 'CLEAR';
        elStealthIndicator.className = 'stealth-clear';
    }
    if (elSuspicionFill) elSuspicionFill.style.width = '0%';
    if (elBackpackStatus) elBackpackStatus.textContent = 'BAG: Empty (0/2)';
    if (elBreathFill) elBreathFill.style.width = '100%';
    
    mapGrid = jobKey === 'shop' ? MAP_SHOP : MAP_VILLA;
    
    showScreen('game');
    screens.lockOverlay.classList.remove('hidden');
    
    // Scene Setup
    scene = new THREE.Scene();
    window.scene = scene; // Expose to window for testability
    scene.fog = new THREE.FogExp2(0x04040a, 0.04);
    
    // Camera & Flashlight
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    window.camera = camera; // Expose to window for testability
    camera.rotation.order = "YXZ";
    
    // Spawn camera looking at the house (+Z direction, yaw = 180 degrees)
    camera.rotation.set(0, Math.PI, 0);
    
    flashlightLight = new THREE.SpotLight(0xffffff, 4, 15, Math.PI / 6, 0.5, 1);
    flashlightLight.position.set(0, 0, 0);
    flashlightLight.target = new THREE.Object3D();
    flashlightLight.target.position.set(0, 0, -1);
    camera.add(flashlightLight);
    camera.add(flashlightLight.target);
    flashlightLight.visible = false;
    scene.add(camera);
    
    // Ambient & Moonlight lighting (Fixed pitch-black screen)
    const ambientLight = new THREE.AmbientLight(0x22223c); // brighter blue-grey ambient
    scene.add(ambientLight);
    
    const moonlight = new THREE.DirectionalLight(0x4f5e78, 1.6); // cool blue moonlight
    moonlight.position.set(10, 20, 10);
    scene.add(moonlight);
    
    // Build Map Grid
    walls = [];
    wallBounds = []; // Clear collision bounds cache
    lootObjects = [];
    doors = [];
    guards = [];
    lasers = [];
    guardDogs = [];
    floorTraps = [];
    
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, 4, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x141424, roughness: 0.9 });
    
    const floorGeo = new THREE.PlaneGeometry(mapGrid[0].length * TILE_SIZE, mapGrid.length * TILE_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x08080f, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((mapGrid[0].length * TILE_SIZE)/2, 0, (mapGrid.length * TILE_SIZE)/2);
    scene.add(floor);
    
    for (let r = 0; r < mapGrid.length; r++) {
        for (let c = 0; c < mapGrid[r].length; c++) {
            const val = mapGrid[r][c];
            const x = c * TILE_SIZE + TILE_SIZE/2;
            const z = r * TILE_SIZE + TILE_SIZE/2;
            
            if (val === 1) {
                const w = new THREE.Mesh(wallGeo, wallMat);
                w.position.set(x, 2, z);
                scene.add(w);
                addWallCollision(w, TILE_SIZE, TILE_SIZE);
            } else if (val === 2) {
                createDoor(x, z, r, c);
            } else if (val === 3) {
                createSafe(x, z);
            } else if (val === 4) {
                createLoot(x, z, 'cash', 600, 0.15, 0.1, 0.2, 0x00ff88, false);
            } else if (val === 5) {
                createPaintingCover(x, z);
            } else if (val === 6) {
                createGetawayCar(x, z);
                // Spawn further away from getaway car collision box
                camera.position.set(x, 1.8, z + 3.5);
            } else if (val === 7) {
                createFloorTrap(x, z, 'parquet', 0x7c2d12);
            } else if (val === 8) {
                createFloorTrap(x, z, 'glass', 0x00f0ff);
            } else if (val === 9) {
                createLoot(x, z, 'tv', 2500, 1.6, 0.9, 0.2, 0x334155, true);
            }
        }
    }
    
    // Spawn targets
    if (jobKey === 'shop') {
        spawnGuard(new THREE.Vector3(22, 1, 14), [
            new THREE.Vector3(22, 1, 14),
            new THREE.Vector3(34, 1, 14),
            new THREE.Vector3(34, 1, 22),
            new THREE.Vector3(22, 1, 22)
        ]);
        
        // Indoor point light for shop interior
        const storeLight = new THREE.PointLight(0xfffbeb, 2.0, 30);
        storeLight.position.set(20, 3.5, 16);
        scene.add(storeLight);
    } else {
        // Villa setup
        spawnGuard(new THREE.Vector3(30, 1, 6), [
            new THREE.Vector3(30, 1, 6),
            new THREE.Vector3(45, 1, 6),
            new THREE.Vector3(45, 1, 26),
            new THREE.Vector3(30, 1, 26)
        ]);
        spawnGuard(new THREE.Vector3(10, 1, 20), [
            new THREE.Vector3(10, 1, 20),
            new THREE.Vector3(25, 1, 20),
            new THREE.Vector3(25, 1, 28),
            new THREE.Vector3(10, 1, 28)
        ]);
        
        spawnGuardDog(new THREE.Vector3(22, 0.5, 12));
        createLasers(new THREE.Vector3(26, 1.8, 16));
        
        createSecurityCamera(26, 3.2, 8, 0); 
        createSecurityCamera(38, 3.2, 22, Math.PI / 2); 
        
        initRain();

        // Warm porch point lights for villa exterior aesthetics (Phase 2 & 3)
        const porchLight = new THREE.PointLight(0xffd8a8, 2.2, 15);
        porchLight.position.set(22, 3.0, 14); // Near patio window
        scene.add(porchLight);
        
        const streetLight = new THREE.PointLight(0xffe3b3, 1.8, 12);
        streetLight.position.set(6, 3.0, 12); // Near getaway car
        scene.add(streetLight);

        // Electrical Box Sabotage exterior (Phase 3)
        const boxGeo = new THREE.BoxGeometry(0.3, 0.8, 0.6);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5 });
        electricalBox = new THREE.Mesh(boxGeo, boxMat);
        electricalBox.position.set(4.3, 1.6, 18);
        scene.add(electricalBox);
    }
    
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas3D'), antialias: true });
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Comms Intro
    if (jobKey === 'villa') {
        triggerRadioMessage("Lookout", "Guetteur : 'Villa 202 en vue. Pluie torrentielle détectée. Nos pas font 40% de bruit en moins. Reste à l'abri des spots !'");
    } else {
        triggerRadioMessage("Lookout", "Guetteur : 'Marcus à l'écoute. Supérette tranquille, crochetage requis à l'arrière.'");
    }
    
    selectTool('hands');
    
    // Reset delta clock to prevent teleport/stuck issues (v3.2)
    prevTime = performance.now();
    
    missionTimerInterval = setInterval(() => {
        missionTime--;
        const min = Math.floor(missionTime / 60);
        const sec = missionTime % 60;
        if (elMissionTimer) elMissionTimer.textContent = `TIME: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        
        if (alertLevel === 'alarm') {
            playAlarmSiren();
        }
        
        if (missionTime <= 0) {
            triggerPoliceBusted();
        }
    }, 1000);
    
    startTensionMusic();
    animate3D();
}

function createDoor(x, z, row, col) {
    let alignZ = false;
    const wallAbove = (row > 0 && mapGrid[row-1][col] === 1);
    const wallBelow = (row < mapGrid.length - 1 && mapGrid[row+1][col] === 1);
    if (wallAbove || wallBelow) {
        alignZ = true;
    }
    const w = alignZ ? 0.4 : TILE_SIZE;
    const d = alignZ ? TILE_SIZE : 0.4;

    const doorGeo = new THREE.BoxGeometry(w, 3.8, d);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.65 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(x, 1.9, z);
    
    const isGlassPatio = (currentJob === 'villa' && row === 4 && col === 2);
    if (isGlassPatio) {
        door.material.color.setHex(0x00f0ff);
        door.material.transparent = true;
        door.material.opacity = 0.45;
    }

    door.userData = { type: 'door', locked: true, isGlassPatio, row, col, x, z, widthX: w, widthZ: d };
    scene.add(door);
    doors.push(door);
    addWallCollision(door, w, d);
}

function createSafe(x, z) {
    const safeGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const safeMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
    internalSafe = new THREE.Mesh(safeGeo, safeMat);
    internalSafe.position.set(x, 0.6, z);
    internalSafe.userData = { type: 'safe', locked: true, val: 3500 };
    scene.add(internalSafe);
    lootObjects.push(internalSafe);
}

function createPaintingCover(x, z) {
    const paintGeo = new THREE.BoxGeometry(0.1, 1.6, 2.0);
    const paintMat = new THREE.MeshStandardMaterial({ color: 0x881b1b, roughness: 0.3 });
    paintingCover = new THREE.Mesh(paintGeo, paintMat);
    paintingCover.position.set(x, 1.6, z); 
    paintingCover.userData = { type: 'painting_cover' };
    scene.add(paintingCover);
    paintingCover.userData.widthX = 0.1;
    paintingCover.userData.widthZ = 2.0;
    addWallCollision(paintingCover, 0.1, 2.0);
}

function createLoot(x, z, type, value, w, h, d, colorHex, heavy) {
    const lootGeo = new THREE.BoxGeometry(w, h, d);
    const lootMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
    const loot = new THREE.Mesh(lootGeo, lootMat);
    loot.position.set(x, h/2 + 0.1, z);
    loot.userData = { type: 'loot', lootType: type, val: value, picked: false, heavy: heavy };
    scene.add(loot);
    lootObjects.push(loot);
}

function createFloorTrap(x, z, trapType, colorHex) {
    const trapGeo = new THREE.PlaneGeometry(TILE_SIZE - 0.2, TILE_SIZE - 0.2);
    const trapMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const trap = new THREE.Mesh(trapGeo, trapMat);
    trap.rotation.x = -Math.PI / 2;
    trap.position.set(x, 0.02, z);
    trap.userData = { type: 'trap', trapType };
    scene.add(trap);
    floorTraps.push(trap);
}

function createGetawayCar(x, z) {
    const carGeo = new THREE.BoxGeometry(2.4, 1.8, 4.2);
    const carMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });
    getawayCar = new THREE.Mesh(carGeo, carMat);
    getawayCar.position.set(x, 0.9, z);
    getawayCar.userData = { type: 'car', widthX: 2.4, widthZ: 4.2 };
    scene.add(getawayCar);
    addWallCollision(getawayCar, 2.4, 4.2);
}

function createLasers(pos) {
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
    const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, 8);
    const beam = new THREE.Mesh(laserGeo, laserMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.copy(pos);
    beam.userData = { disabled: false, disabledTimer: 0 };
    scene.add(beam);
    lasers.push(beam);
}

function spawnGuard(startPos, waypoints) {
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.7 });
    const guard = new THREE.Mesh(bodyGeo, bodyMat);
    guard.position.copy(startPos);
    
    // Cone representation of Vision
    const coneGeo = new THREE.ConeGeometry(3.5, 8, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffb700, transparent: true, opacity: 0.2 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0, -4);
    guard.add(cone);
    
    guard.userData = {
        waypoints,
        currentWaypoint: 0,
        speed: 1.8,
        visionRange: 8,
        knockedOut: false,
        koTimer: 0
    };
    
    scene.add(guard);
    guards.push(guard);
}

function spawnGuardDog(startPos) {
    const dogGroup = new THREE.Group();
    dogGroup.position.copy(startPos);
    
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.6, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46 });
    const dog = new THREE.Mesh(bodyGeo, bodyMat);
    dogGroup.add(dog);
    
    const ringGeo = new THREE.RingGeometry(0.6, 0.7, 8);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.4;
    dogGroup.add(ring);
    
    dogGroup.userData = {
        knockedOut: false,
        koTimer: 0,
        baseMesh: dog,
        ringMesh: ring
    };
    
    scene.add(dogGroup);
    guardDogs.push(dogGroup);
}

// Security Wall Cameras (Phase 2)
function createSecurityCamera(x, y, z, baseAngle) {
    const camGroup = new THREE.Group();
    camGroup.position.set(x, y, z);
    
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.3, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    camGroup.add(body);
    
    const coneGeo = new THREE.ConeGeometry(2.5, 6, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.15 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0, -3.2);
    body.add(cone);
    
    camGroup.userData = {
        baseAngle,
        timer: Math.random() * 5,
        disabled: false,
        disabledTimer: 0,
        bodyMesh: body,
        coneMesh: cone
    };
    
    scene.add(camGroup);
    cameras.push(camGroup);
}

function updateCameras(delta) {
    cameras.forEach(cam => {
        if (cam.userData.disabled) {
            cam.userData.disabledTimer -= delta;
            if (cam.userData.disabledTimer <= 0) {
                cam.userData.disabled = false;
                cam.userData.coneMesh.visible = true;
                cam.userData.coneMesh.material.color.setHex(0x39ff14);
                triggerRadioMessage("Hacker", "Système de secours de la caméra réinitialisé ! Elle est de nouveau en ligne.");
            }
            return;
        }
        
        // Swing back and forth
        cam.userData.timer += delta * 0.5;
        const yaw = Math.sin(cam.userData.timer) * (Math.PI / 4); 
        cam.userData.bodyMesh.rotation.y = cam.userData.baseAngle + yaw;
        
        // Check if player is inside camera detection cone
        const dist = camera.position.distanceTo(cam.position);
        if (dist < 6.5) {
            _camToPlayer.subVectors(camera.position, cam.position).normalize();
            _camDir.set(0, 0, -1).applyQuaternion(cam.userData.bodyMesh.quaternion);
            _camDir.applyQuaternion(cam.quaternion);
            
            const dot = _camDir.dot(_camToPlayer);
            if (dot > 0.82) { 
                const heatMult = (1 + permanentHeat / 100);
                let mult = crouch ? 0.15 * heatMult : 0.4 * heatMult;
                if (upgrades.jammer) mult *= 0.5;
                suspicion = Math.min(100, suspicion + mult);
                alertLevel = 'suspicious';
                if (elStealthIndicator) {
                    elStealthIndicator.textContent = 'SPOTTED BY CAMERA!';
                    elStealthIndicator.className = 'stealth-warning';
                }
                
                cam.userData.coneMesh.material.color.setHex(0xff0055);
                if (suspicion >= 100) {
                    triggerAlarmState();
                }
            } else {
                cam.userData.coneMesh.material.color.setHex(0x39ff14);
            }
        }
    });
}

// Window resizing listener
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// ===================== DISTRACTION DARTS & IEM =====================
function fireDistractionDart() {
    if (inventory.dart <= 0) return;
    inventory.dart--;
    selectTool('dart');
    
    const dartGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const dartMat = new THREE.MeshBasicMaterial({ color: 0xffb700 });
    const dart = new THREE.Mesh(dartGeo, dartMat);
    dart.position.copy(camera.position).add(getForwardVector().multiplyScalar(0.5));
    scene.add(dart);
    
    projectiles.push({
        mesh: dart,
        velocity: getForwardVector().multiplyScalar(14),
        type: 'dart',
        gravity: 0.1,
        life: 25
    });
}

function triggerDartNoise(pos) {
    alertGuardsByNoise(pos, 16);
    triggerRadioMessage("Hacker", "Dart landed. Guard decoy triggered!");
}

function fireIEM() {
    if (inventory.iem <= 0) return;
    inventory.iem--;
    selectTool('iem');
    
    const iemGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const iemMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const iem = new THREE.Mesh(iemGeo, iemMat);
    iem.position.copy(camera.position).add(getForwardVector().multiplyScalar(0.5));
    scene.add(iem);
    
    projectiles.push({
        mesh: iem,
        velocity: getForwardVector().multiplyScalar(16),
        type: 'iem',
        gravity: 0.08,
        life: 30
    });
}

function triggerIEMDischarge(pos) {
    playGlassCrackSound(); 
    
    const pulseGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45 });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.position.copy(pos);
    scene.add(pulse);
    
    setTimeout(() => { scene.remove(pulse); }, 1000);
    
    cameras.forEach(cam => {
        if (cam.position.distanceTo(pos) < 5.5) {
            cam.userData.disabled = true;
            cam.userData.disabledTimer = 45; 
            cam.userData.coneMesh.visible = false;
            triggerRadioMessage("Hacker", "IEM connectée ! Caméra grillée pour 45 secondes.");
        }
    });
    
    lasers.forEach(laser => {
        if (laser.position.distanceTo(pos) < 5.5) {
            laser.userData.disabled = true;
            laser.userData.disabledTimer = 45;
            laser.visible = false;
            triggerRadioMessage("Hacker", "Lasers court-circuités pour 45 secondes.");
        }
    });
}

document.addEventListener('mousedown', e => {
    if (!pointerLocked) return;
    if (activeTool === 'dart') {
        fireDistractionDart();
    } else if (activeTool === 'iem') {
        fireIEM();
    } else if (activeTool === 'gas') {
        fireGasGrenade();
    }
});

function fireGasGrenade() {
    if (inventory.gas <= 0) return;
    inventory.gas--;
    selectTool('gas');
    
    const gasGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const gasMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const canister = new THREE.Mesh(gasGeo, gasMat);
    canister.position.copy(camera.position).add(getForwardVector().multiplyScalar(0.5));
    scene.add(canister);
    
    projectiles.push({
        mesh: canister,
        velocity: getForwardVector().multiplyScalar(10),
        type: 'gas',
        gravity: 0.15,
        life: 30
    });
}

function triggerGasCloud(pos) {
    triggerRadioMessage("Hacker", "Sleeping gas deployed!");
    const cloudGeo = new THREE.SphereGeometry(5, 12, 12);
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 });
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.copy(pos);
    scene.add(cloud);
    
    setTimeout(() => { scene.remove(cloud); }, 3000);
    
    guards.forEach(g => {
        if (g.position.distanceTo(pos) < 6) {
            g.userData.knockedOut = true;
            g.userData.koTimer = 900;
            g.children[0].visible = false;
            g.material.color.setHex(0x10b981);
            triggerRadioMessage("Lookout", "Garde endormi.");
        }
    });
    
    guardDogs.forEach(d => {
        if (d.position.distanceTo(pos) < 6) {
            d.userData.knockedOut = true;
            d.userData.koTimer = 900;
            d.userData.ringMesh.visible = false;
            d.userData.baseMesh.material.color.setHex(0x10b981);
            triggerRadioMessage("Lookout", "Le chien s'est endormi.");
        }
    });
}

// ===================== INTERACTIONS =====================
function interact() {
    interactionRaycaster.set(camera.position, getForwardVectorRaw()); 
    const intersects = interactionRaycaster.intersectObjects(scene.children);
    
    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        const obj = intersects[0].object;
        
        if (obj === paintingCover) {
            scene.remove(paintingCover);
            walls = walls.filter(w => w !== paintingCover);
            wallBounds = wallBounds.filter(b => b.mesh !== paintingCover);
            triggerRadioMessage("Lookout", "Marcus : 'Le coffre est derrière ! C'est du lourd, sors la perceuse thermique !'");
            playGlassCrackSound(); 
            paintingCover = null;
        } else if (obj.userData.type === 'door' && obj.userData.locked) {
            if (obj.userData.isGlassPatio) {
                launchGlassCutting(obj);
            } else {
                handleDoorInteraction(obj);
            }
        } else if (obj.userData.type === 'safe' && obj.userData.locked) {
            launchThermalDrill(obj);
        } else if (obj.userData.type === 'loot' && !obj.userData.picked) {
            handleLootCollection(obj);
        } else if (obj === getawayCar || (obj.parent && obj.parent === getawayCar)) {
            openGetawayTrunk();
        } else if (obj === electricalBox && !elecBoxSolved) {
            launchElectricalSabotage();
        }
    }
}

function handleDoorInteraction(door) {
    if (activeTool === 'lockpick') {
        if (inventory.lockpick > 0) {
            inventory.lockpick--;
            selectTool('lockpick');
            launchLockpicking(door, false);
        }
    } else if (activeTool === 'titanium') {
        if (inventory.titanium > 0) {
            launchLockpicking(door, true);
        }
    } else if (activeTool === 'crowbar') {
        door.userData.locked = false;
        scene.remove(door);
        walls = walls.filter(w => w !== door);
        wallBounds = wallBounds.filter(b => b.mesh !== door);
        alertGuardsByNoise(door.position, 16);
        playGlassCrackSound(); 
        triggerRadioMessage("Lookout", "Guetteur : 'La porte a volé en éclats ! Discrétion compromise.'");
    } else {
        triggerRadioMessage("Hacker", "Locked door. Use lockpicks or crowbar.");
    }
}

function handleLootCollection(loot) {
    if (backpack.length >= 2) {
        triggerRadioMessage("Lookout", "Marcus : 'Sac plein ! Vide-le dans le coffre du van.'");
        return;
    }
    
    loot.userData.picked = true;
    scene.remove(loot);
    
    backpack.push({
        type: loot.userData.lootType,
        val: loot.userData.val,
        heavy: loot.userData.heavy || false,
        sprayed: upgrades.gloves
    });
    
    if (upgrades.gloves && (loot.userData.lootType === 'secret files' || loot.userData.heavy)) {
        triggerRadioMessage("Hacker", "Empreintes protégées par les Gants Furtifs.");
    }

    if (elBackpackStatus) elBackpackStatus.textContent = `BAG: Filled (${backpack.length}/2)`;
    
    if (loot.userData.heavy) {
        activeTool = 'heavy_load';
        if (elActiveToolDisplay) {
            elActiveToolDisplay.textContent = 'HEAVY LOAD';
            elActiveToolDisplay.className = 'text-yellow';
        }
        if (elToolAmmo) elToolAmmo.textContent = 'Cannot use tools!';
        triggerRadioMessage("Lookout", "Marcus : 'La TV est lourde ! Tu es ralenti de 60%, va vider ton sac !'");
    } else {
        triggerRadioMessage("Hacker", `Loot récupéré : ${loot.userData.lootType.toUpperCase()} ($${loot.userData.val})`);
    }
}

function alertGuardsByNoise(sourcePos, radius) {
    const activeRadius = currentJob === 'villa' ? radius * 0.6 : radius;
    
    guards.forEach(g => {
        if (g.userData.knockedOut) return;
        const dist = g.position.distanceTo(sourcePos);
        if (dist < activeRadius) {
            suspicion = Math.min(100, suspicion + 35);
            updateSuspicionBar();
            g.children[0].material.color.setHex(0xff5500); 
            triggerRadioMessage("Lookout", "Guetteur : 'Un garde a entendu du bruit ! Il patrouille vers la zone.'");
        }
    });
}

// ===================== LOCKPICKING MINI-GAME =====================
let isTitaniumLockpick = false;

function launchLockpicking(target, isTitanium) {
    lockpickActive = true;
    lockpickTarget = target;
    isTitaniumLockpick = isTitanium;
    lockpickTumblersCracked = 0;
    lockpickAngle = 0;
    lockpickSweetSpot = Math.random() * Math.PI * 2;
    
    document.querySelectorAll('.tumbler').forEach(t => t.className = 'tumbler locked');
    showScreen('lockpick');
    document.exitPointerLock();
}

function updateLockpicking() {
    if (!lockpickActive) return;
    
    lockpickAngle += lockpickSpeed;
    if (lockpickAngle > Math.PI * 2) lockpickAngle -= Math.PI * 2;
    
    const sweetX = 80 + 70 * Math.cos(lockpickSweetSpot);
    const sweetY = 80 + 70 * Math.sin(lockpickSweetSpot);
    const indX = 80 + 70 * Math.cos(lockpickAngle);
    const indY = 80 + 70 * Math.sin(lockpickAngle);
    
    document.getElementById('lockpick-sweetspot').style.left = sweetX + 'px';
    document.getElementById('lockpick-sweetspot').style.top = sweetY + 'px';
    document.getElementById('lockpick-indicator').style.left = indX + 'px';
    document.getElementById('lockpick-indicator').style.top = indY + 'px';
}

document.addEventListener('keydown', e => {
    if (!lockpickActive) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        
        const diff = Math.abs(lockpickAngle - lockpickSweetSpot);
        const diffAlt = Math.PI * 2 - diff;
        const actualDiff = Math.min(diff, diffAlt);
        
        if (actualDiff < 0.38) {
            document.getElementById(`tumbler-${lockpickTumblersCracked}`).className = 'tumbler cracked';
            lockpickTumblersCracked++;
            playRadioBeep();
            
            if (lockpickTumblersCracked >= 3) {
                successLockpick();
            } else {
                lockpickSweetSpot = Math.random() * Math.PI * 2;
            }
        } else {
            if (isTitaniumLockpick) {
                inventory.titaniumDurability--;
                triggerRadioMessage("Hacker", `Aïe ! Erreur de crochetage. Durabilité titane : ${inventory.titaniumDurability}/5`);
                playGlassCrackSound(); 
                if (inventory.titaniumDurability <= 0) {
                    inventory.titanium--;
                    abortLockpicking(true);
                } else {
                    lockpickSweetSpot = Math.random() * Math.PI * 2;
                }
            } else {
                triggerRadioMessage("Hacker", "Crochet cassé ! Trop d'écart.");
                abortLockpicking(true);
            }
        }
    }
});

function successLockpick() {
    lockpickActive = false;
    showScreen('game');
    document.body.requestPointerLock();
    
    if (lockpickTarget.userData.type === 'door') {
        lockpickTarget.userData.locked = false;
        scene.remove(lockpickTarget);
        walls = walls.filter(w => w !== lockpickTarget);
        wallBounds = wallBounds.filter(b => b.mesh !== lockpickTarget);
        triggerRadioMessage("Lookout", "Guetteur : 'Serrure crochetée silencieusement.'");
    }
}

function abortLockpicking(broken = false) {
    lockpickActive = false;
    showScreen('game');
    document.body.requestPointerLock();
    
    if (broken) {
        suspicion = Math.min(100, suspicion + 20);
        updateSuspicionBar();
        triggerRadioMessage("Lookout", "Guetteur : 'Bruit de crochet cassé ! Suspicion en hausse.'");
    }
}

document.getElementById('abort-lockpick').addEventListener('click', () => {
    abortLockpicking(false);
});

// ===================== ELECTRICAL SABOTAGE MINI-GAME =====================
const elecScroller = document.getElementById('elec-hex-scroller');
const elecIndicator = document.getElementById('elec-indicator-bar');
const elecTargetBar = document.getElementById('elec-target-bar');

function launchElectricalSabotage() {
    document.exitPointerLock();
    elecActive = true;
    elecStage = 0;
    elecIndicatorPos = 0;
    elecIndicatorDir = 2; 
    elecTargetPos = 25 + Math.random() * 50; 
    
    elecTargetBar.style.left = elecTargetPos + '%';
    
    for (let i = 0; i < 4; i++) {
        document.getElementById(`elec-diode-${i}`).className = 'tumbler locked';
    }
    
    document.getElementById('elec-cables-panel').classList.add('hidden');
    showScreen('hacking');
}

function updateElectricalSabotage() {
    if (!elecActive) return;
    
    elecIndicatorPos += elecIndicatorDir;
    if (elecIndicatorPos > 100 || elecIndicatorPos < 0) {
        elecIndicatorDir = -elecIndicatorDir;
    }
    
    elecIndicator.style.left = elecIndicatorPos + '%';
    elecScroller.style.transform = `translateX(${Math.sin(performance.now() * 0.002) * 30}px)`;
}

document.addEventListener('keydown', e => {
    if (!elecActive || document.getElementById('hacking-screen').classList.contains('hidden')) return;
    
    if (e.key === 'a' || e.key === 'A' || e.key === 'q' || e.key === 'Q') {
        elecTargetPos = Math.max(10, elecTargetPos - 3);
        elecTargetBar.style.left = elecTargetPos + '%';
    }
    if (e.key === 'd' || e.key === 'D') {
        elecTargetPos = Math.min(90, elecTargetPos + 3);
        elecTargetBar.style.left = elecTargetPos + '%';
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        
        const diff = Math.abs(elecIndicatorPos - elecTargetPos);
        if (diff < 8) {
            document.getElementById(`elec-diode-${elecStage}`).className = 'tumbler cracked';
            elecStage++;
            playRadioBeep();
            
            if (elecStage >= 4) {
                document.getElementById('elec-cables-panel').classList.remove('hidden');
                triggerRadioMessage("Hacker", "Fréquences alignées ! Boîtier ouvert, coupe ou ponte les câbles colorés.");
            } else {
                elecTargetPos = 20 + Math.random() * 60;
                elecTargetBar.style.left = elecTargetPos + '%';
            }
        } else {
            suspicion = Math.min(100, suspicion + 10);
            updateSuspicionBar();
            playAlarmSiren(); 
            triggerRadioMessage("Lookout", "Guetteur : 'Mauvais timing ! Court-circuit sonore détecté (35 dB) !'");
        }
    }
});

// Cables actions (Phase 3)
document.getElementById('cable-red-btn').addEventListener('click', () => {
    triggerAlarmState();
    triggerRadioMessage("Lookout", "Guetteur : 'T'es fou ! T'as coupé l'alarme rouge, les condés ont été prévenus !'");
    closeElectricalSabotage();
});

document.getElementById('cable-blue-btn').addEventListener('click', () => {
    triggerRadioMessage("Lookout", "Lumières coupées ! La villa est plus sombre.");
    closeElectricalSabotage();
});

document.getElementById('cable-yellow-btn').addEventListener('click', () => {
    triggerRadioMessage("Lookout", "Caméras coupées !");
    closeElectricalSabotage();
});

document.getElementById('bridge-cables-btn').addEventListener('click', () => {
    elecBoxBridged = true;
    
    guards.forEach(g => {
        g.userData.visionRange = 5.0; 
    });
    
    cameras.forEach(cam => {
        cam.userData.disabled = true;
        cam.userData.disabledTimer = 9999;
        cam.userData.coneMesh.visible = false;
    });
    
    lasers.forEach(laser => {
        laser.userData.disabled = true;
        laser.visible = false;
    });
    
    scene.children.forEach(c => {
        if (c instanceof THREE.AmbientLight) {
            c.color.setHex(0x050512); // very dark blue
        }
        if (c instanceof THREE.DirectionalLight) {
            c.intensity = 0.2; // dim moon
        }
        if (c instanceof THREE.PointLight) {
            c.intensity = 0; // turn off porch / street light
        }
    });
    
    playGlassCrackSound(); 
    triggerRadioMessage("Hacker", "Pontage réussi ! Caméras et projecteurs HS, la villa est plongée dans le noir.");
    closeElectricalSabotage();
});

document.getElementById('abort-elec').addEventListener('click', () => {
    closeElectricalSabotage();
});

function closeElectricalSabotage() {
    elecActive = false;
    showScreen('game');
    document.body.requestPointerLock();
}

// ===================== GLASS CUTTER MINI-GAME (Phase 4) =====================
const glassTracer = document.getElementById('glass-tracer');
const glassArea = document.getElementById('glass-cutter-area');

function launchGlassCutting(door) {
    document.exitPointerLock();
    glassActive = true;
    glassTargetDoor = door;
    glassProgress = 0;
    glassTargetAngle = -Math.PI / 2; 
    mouseIsDown = false;
    
    document.getElementById('glass-progress-fill').style.width = '0%';
    document.getElementById('glass-cutter-status').textContent = 'Progression : 0%';
    document.getElementById('glass-circle-guide').className = '';
    
    showScreen('glass');
}

glassArea.addEventListener('mousedown', (e) => {
    if (!glassActive) return;
    mouseIsDown = true;
    checkGlassTracing(e);
});

window.addEventListener('mousemove', (e) => {
    if (!glassActive || !mouseIsDown) return;
    checkGlassTracing(e);
});

window.addEventListener('mouseup', () => {
    if (!glassActive) return;
    mouseIsDown = false;
    document.getElementById('glass-circle-guide').className = '';
});

function checkGlassTracing(e) {
    const rect = glassArea.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const targetRadius = 65;
    const inRange = (distance >= 53 && distance <= 77);
    
    let angle = Math.atan2(dy, dx);
    
    if (inRange) {
        document.getElementById('glass-circle-guide').className = 'glass-good';
        
        glassTracer.style.left = (centerX + targetRadius * Math.cos(angle)) + 'px';
        glassTracer.style.top = (centerY + targetRadius * Math.sin(angle)) + 'px';
        
        let angleDiff = angle - glassTargetAngle;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        if (angleDiff > 0 && angleDiff < 0.5) {
            glassProgress += angleDiff * 14.0; 
            glassTargetAngle = angle;
            
            const progressPercent = Math.min(100, Math.floor(glassProgress));
            document.getElementById('glass-progress-fill').style.width = progressPercent + '%';
            document.getElementById('glass-cutter-status').textContent = `Progression : ${progressPercent}%`;
            
            if (progressPercent >= 100) {
                successGlassCutter();
            }
        }
    } else {
        document.getElementById('glass-circle-guide').className = 'glass-bad';
        
        if (Math.random() < 0.04) {
            playGlassCrackSound();
            suspicion = Math.min(100, suspicion + 3);
            updateSuspicionBar();
            triggerRadioMessage("Lookout", "Marcus : 'Attention, le verre se fissure ! Va doucement !'");
        }
    }
}

function successGlassCutter() {
    glassActive = false;
    mouseIsDown = false;
    playGlassCrackSound(); 
    
    scene.remove(glassTargetDoor);
    walls = walls.filter(w => w !== glassTargetDoor);
    wallBounds = wallBounds.filter(b => b.mesh !== glassTargetDoor);
    
    showScreen('game');
    document.body.requestPointerLock();
    triggerRadioMessage("Lookout", "Guetteur : 'Disque de verre retiré ! Baie ouverte silencieusement.'");
}

document.getElementById('abort-glass').addEventListener('click', () => {
    glassActive = false;
    showScreen('game');
    document.body.requestPointerLock();
});

// ===================== THERMAL DRILL MINI-GAME (Phase 5) =====================
function launchThermalDrill(safe) {
    document.exitPointerLock();
    drillActive = true;
    drillTargetSafe = safe;
    drillProgress = 0;
    drillTemp = 20;
    
    document.getElementById('drill-progress-fill').style.width = '0%';
    document.getElementById('drill-status').textContent = 'FORAGE : 0%';
    document.getElementById('drill-temp-val').textContent = '20';
    document.getElementById('drill-temp-val').className = 'text-blue';
    
    showScreen('drill');
}

screens.drill.addEventListener('mousedown', (e) => {
    if (!drillActive || e.target.id === 'abort-drill') return;
    drillTemp = Math.min(300, drillTemp + 10); 
});

function updateThermalDrill() {
    if (!drillActive) return;
    
    drillTemp = Math.max(20, drillTemp - 0.9);
    
    const tempVal = document.getElementById('drill-temp-val');
    tempVal.textContent = Math.floor(drillTemp);
    
    if (drillTemp < 180) {
        tempVal.className = 'text-blue';
    } else if (drillTemp >= 180 && drillTemp <= 220) {
        tempVal.className = 'text-green';
        drillProgress += 0.22;
        const progressPercent = Math.min(100, Math.floor(drillProgress));
        document.getElementById('drill-progress-fill').style.width = progressPercent + '%';
        document.getElementById('drill-status').textContent = `FORAGE : ${progressPercent}%`;
        
        if (progressPercent >= 100) {
            successThermalDrill();
        }
    } else {
        tempVal.className = 'text-red';
        if (drillTemp > 250) {
            triggerAlarmState();
            triggerRadioMessage("Lookout", "Guetteur : 'La perceuse a surchauffé ! Les détecteurs de fumée ont déclenéch l'alarme !'");
            abortDrillGame();
        }
    }
    
    const percentHeight = (drillTemp / 300) * 100;
    document.getElementById('drill-temp-fill').style.height = percentHeight + '%';
}

function successThermalDrill() {
    drillActive = false;
    
    drillTargetSafe.userData.locked = false;
    drillTargetSafe.material.color.setHex(0x22c55e);
    
    backpack.push({ type: 'gold bar', val: 8000, heavy: true, sprayed: false });
    backpack.push({ type: 'cash', val: 3500, heavy: false, sprayed: false });
    backpack.push({ type: 'encrypted usb', val: 5000, heavy: false, sprayed: false });
    
    if (elBackpackStatus) elBackpackStatus.textContent = `BAG: Filled (${backpack.length}/2)`;
    
    activeTool = 'heavy_load';
    if (elActiveToolDisplay) {
        elActiveToolDisplay.textContent = 'HEAVY LOAD';
        elActiveToolDisplay.className = 'text-yellow';
    }
    if (elToolAmmo) elToolAmmo.textContent = 'Cannot use tools!';
    
    showScreen('game');
    document.body.requestPointerLock();
    triggerRadioMessage("Lookout", "Marcus : 'Coffre forcé ! Lingot d'or (lourd), cash et clé USB sécurisés dans le sac ! Vite au van.'");
}

function abortDrillGame() {
    drillActive = false;
    showScreen('game');
    document.body.requestPointerLock();
}

document.getElementById('abort-drill').addEventListener('click', () => {
    abortDrillGame();
});

// ===================== GETAWAY TRUNK SPACE =====================
function openGetawayTrunk() {
    document.exitPointerLock();
    showScreen('trunk');
    updateTrunkLists();
}

function getTrunkSlotsOccupied() {
    let slots = 0;
    carTrunk.forEach(item => {
        if (item.heavy) slots += 4;
        else if (item.type === 'painting') slots += 3;
        else slots += 1;
    });
    return slots;
}

function updateTrunkLists() {
    const bagList = document.getElementById('personal-bag-list');
    const gridContainer = document.getElementById('trunk-grid-container');
    
    bagList.innerHTML = '';
    gridContainer.innerHTML = '';
    
    backpack.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'inv-item-card';
        div.innerHTML = `<span>💰 ${item.type.toUpperCase()} ($${item.val}) ${item.heavy ? '(HEAVY)' : ''}</span> <span>📥 Pack</span>`;
        div.addEventListener('click', () => {
            carTrunk.push(backpack.splice(index, 1)[0]);
            if (item.heavy) selectTool('hands');
            updateTrunkLists();
            if (elBackpackStatus) elBackpackStatus.textContent = `BAG: Filled (${backpack.length}/2)`;
        });
        bagList.appendChild(div);
    });
    
    const totalSlotsUsed = getTrunkSlotsOccupied();
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'trunk-slot';
        if (i < totalSlotsUsed) {
            cell.className = 'trunk-slot occupied';
            if (i < totalSlotsUsed && i % 4 === 0) {
                cell.className = 'trunk-slot heavy-occupied';
            }
        }
        gridContainer.appendChild(cell);
    }
    
    let risk = 0;
    if (totalSlotsUsed > 16) {
        risk = Math.min(100, (totalSlotsUsed - 16) * 15);
    }
    
    document.getElementById('trunk-usage-label').textContent = `Space: ${totalSlotsUsed} / 16 Slots occupied`;
    const riskWarning = document.getElementById('escape-risk-warning');
    if (risk > 0) {
        riskWarning.textContent = `🚨 Escape Risk: ${risk}% (Trunk overloaded / police trap hazard!)`;
        riskWarning.className = 'text-red';
    } else {
        riskWarning.textContent = `Escape Risk: 0% (Trunk closed cleanly)`;
        riskWarning.className = 'text-green';
    }
}

document.getElementById('close-trunk-btn').addEventListener('click', () => {
    showScreen('game');
    document.body.requestPointerLock();
});

document.getElementById('secure-escape-btn').addEventListener('click', () => {
    const totalSlotsUsed = getTrunkSlotsOccupied();
    let risk = 0;
    if (totalSlotsUsed > 16) {
        risk = (totalSlotsUsed - 16) * 15;
    }
    
    if (Math.random() * 100 < risk) {
        endMission(false);
    } else {
        launch3DCarChase();
    }
});

// ===================== STEALTH & AI PATROL =====================
function updateGuardsAndStealth(delta) {
    if (alertLevel === 'alarm') return;
    
    let playerSpotted = false;
    let standingOrRunning = !crouch && (moveForward || moveBackward || moveLeft || moveRight);
    
    playerNoise = 0;
    if (standingOrRunning) {
        playerNoise = 65; 
    } else if (moveForward || moveBackward || moveLeft || moveRight) {
        playerNoise = 20; 
    } else {
        playerNoise = 0;
    }
    
    if (isHoldingBreath) {
        playerNoise = 0; 
    }
    
    if (currentJob === 'villa' && playerNoise > 0) {
        playerNoise = Math.max(12, Math.floor(playerNoise * 0.6));
    }
    
    const noiseVal = playerNoise || 12;
    if (noiseVal !== lastDisplayedNoise) {
        if (elNoiseDbText) elNoiseDbText.textContent = noiseVal + " dB";
        
        if (noiseVal > 12) {
            const scale = (noiseVal / 100) * 1.5;
            if (elWave1) {
                elWave1.style.transform = `scale(${scale})`;
                elWave1.style.opacity = '0.7';
            }
            if (elWave2) {
                elWave2.style.transform = `scale(${scale * 1.4})`;
                elWave2.style.opacity = '0.3';
            }
        } else {
            if (elWave1) {
                elWave1.style.transform = 'scale(0.1)';
                elWave1.style.opacity = '0';
            }
            if (elWave2) {
                elWave2.style.transform = 'scale(0.1)';
                elWave2.style.opacity = '0';
            }
        }
        lastDisplayedNoise = noiseVal;
    }
    
    floorTraps.forEach(trap => {
        const distSq = getDistance2DSq(camera.position.x, camera.position.z, trap.position.x, trap.position.z);
        if (distSq < 1.9 * 1.9) {
            if (trap.userData.trapType === 'parquet') {
                if (standingOrRunning) {
                    playerNoise = 45;
                    alertGuardsByNoise(camera.position, 18);
                } else if (moveForward || moveBackward || moveLeft || moveRight) {
                    playerNoise = 18;
                    alertGuardsByNoise(camera.position, 8);
                }
            } else if (trap.userData.trapType === 'glass') {
                if (!inventory.boots) {
                    playerNoise = 50;
                    alertGuardsByNoise(camera.position, 22);
                    if (Math.random() < 0.08) playGlassCrackSound();
                }
            }
        }
    });
    
    guardDogs.forEach(dog => {
        if (dog.userData.knockedOut) {
            dog.userData.koTimer--;
            if (dog.userData.koTimer <= 0) {
                dog.userData.knockedOut = false;
                dog.userData.ringMesh.visible = true;
                dog.userData.baseMesh.material.color.setHex(0x3f3f46);
            }
            return;
        }
        
        const distToPlayerSq = getDistance2DSq(camera.position.x, camera.position.z, dog.position.x, dog.position.z);
        
        if (distToPlayerSq < 4.0 * 4.0 && !isHoldingBreath) {
            playerNoise = 80;
            alertGuardsByNoise(dog.position, 24);
            dog.userData.baseMesh.material.color.setHex(0xff0055); 
            if (Math.random() < 0.08) playDogBarkSound();
            triggerRadioMessage("Lookout", "Guetteur : 'Le chien aboie ! Tous les gardes se dirigent vers le hall !'");
        }
    });
    
    guards.forEach(g => {
        if (g.userData.knockedOut) {
            g.userData.koTimer--;
            if (g.userData.koTimer <= 0) {
                g.userData.knockedOut = false;
                g.children[0].visible = true;
                g.material.color.setHex(0x1e1b4b);
            }
            return;
        }
        
        const target = g.userData.waypoints[g.userData.currentWaypoint];
        const distToTarget = g.position.distanceTo(target);
        if (distToTarget < 0.6) {
            g.userData.currentWaypoint = (g.userData.currentWaypoint + 1) % g.userData.waypoints.length;
        } else {
            _guardDir.subVectors(target, g.position).normalize();
            g.position.addScaledVector(_guardDir, 0.04);
            g.rotation.y = Math.atan2(_guardDir.x, _guardDir.z);
        }
        
        const distToPlayer = g.position.distanceTo(camera.position);
        if (distToPlayer < g.userData.visionRange) {
            _guardForward.set(0, 0, -1).applyQuaternion(g.quaternion);
            _guardToPlayer.subVectors(camera.position, g.position).normalize();
            const dot = _guardForward.dot(_guardToPlayer);
            
            const visionAngleLimit = currentJob === 'villa' ? 0.76 + 0.15 : 0.76;
            
            if (dot > visionAngleLimit && !isHoldingBreath) {
                playerSpotted = true;
            }
        }
        
        if (playerFlashlight && distToPlayer < 10) {
            _guardForward.set(0, 0, -1).applyQuaternion(g.quaternion);
            _guardToPlayer.subVectors(camera.position, g.position).normalize();
            const dot = _guardForward.dot(_guardToPlayer);
            if (dot > 0.65) {
                playerSpotted = true;
                suspicion = Math.min(100, suspicion + 1.5);
            }
        }
        
        doors.forEach(door => {
            if (!door.userData.locked && g.position.distanceTo(door.position) < 4) {
                suspicion = Math.min(100, suspicion + 0.2);
                g.children[0].material.color.setHex(0xffea00); 
            }
        });
    });
    
    updateCameras(delta);
    
    if (!elecBoxBridged) {
        lasers.forEach(l => {
            if (l.userData.disabled) {
                l.userData.disabledTimer -= delta;
                if (l.userData.disabledTimer <= 0) {
                    l.userData.disabled = false;
                    l.visible = true;
                }
                return;
            }
            
            _tempProjOffset.set(camera.position.x, l.position.y, camera.position.z);
            if (_tempProjOffset.distanceTo(l.position) < 0.65) {
                triggerAlarmState();
            }
        });
    }
    
    const heatMult = 1 + (permanentHeat / 100);
    
    if (playerSpotted) {
        const mult = crouch ? 0.20 * heatMult : 0.45 * heatMult;
        suspicion = Math.min(100, suspicion + mult);
        alertLevel = 'suspicious';
        if (elStealthIndicator) {
            elStealthIndicator.textContent = 'SPOTTED!';
            elStealthIndicator.className = 'stealth-warning';
        }
        
        if (suspicion >= 100) {
            triggerAlarmState();
        }
    } else {
        if (suspicion > 0) {
            suspicion = Math.max(0, suspicion - 0.25);
        } else {
            alertLevel = 'clear';
            if (elStealthIndicator) {
                elStealthIndicator.textContent = 'CLEAR';
                elStealthIndicator.className = 'stealth-clear';
            }
        }
    }
    
    updateSuspicionBar();

    // Update proximity sensor if active
    const elRadar = document.getElementById('radar-display');
    if (elRadar) {
        if (upgrades.radar && pointerLocked && !drivingActive) {
            elRadar.classList.remove('hidden');
            let minGuardDist = 9999;
            guards.forEach(g => {
                if (!g.userData.knockedOut) {
                    const dist = camera.position.distanceTo(g.position);
                    if (dist < minGuardDist) minGuardDist = dist;
                }
            });
            guardDogs.forEach(dog => {
                if (!dog.userData.knockedOut) {
                    const dist = camera.position.distanceTo(dog.position);
                    if (dist < minGuardDist) minGuardDist = dist;
                }
            });
            
            if (minGuardDist > 15) {
                elRadar.textContent = "RADAR: SÛR";
                elRadar.style.color = "var(--neon-blue)";
                elRadar.style.textShadow = "0 0 8px var(--neon-blue)";
            } else if (minGuardDist <= 15 && minGuardDist > 6) {
                elRadar.textContent = `RADAR: ATTENTION (${minGuardDist.toFixed(1)}m)`;
                elRadar.style.color = "var(--neon-yellow)";
                elRadar.style.textShadow = "0 0 8px var(--neon-yellow)";
            } else {
                const flash = Math.floor(performance.now() / 200) % 2 === 0;
                elRadar.textContent = `RADAR: DANGER (${minGuardDist.toFixed(1)}m)`;
                elRadar.style.color = flash ? "red" : "#ff4444";
                elRadar.style.textShadow = "0 0 8px red";
            }
        } else {
            elRadar.classList.add('hidden');
        }
    }
}

function updateSuspicionBar() {
    if (suspicion !== lastDisplayedSuspicion) {
        if (elSuspicionFill) elSuspicionFill.style.width = suspicion + '%';
        lastDisplayedSuspicion = suspicion;
    }
}

function triggerAlarmState() {
    if (alertLevel === 'alarm') return;
    alertLevel = 'alarm';
    suspicion = 100;
    updateSuspicionBar();
    if (elStealthIndicator) {
        elStealthIndicator.textContent = 'POLICE ALERT!';
        elStealthIndicator.className = 'stealth-alert';
    }
    
    document.getElementById('game-screen').classList.add('alarm-overlay-effect');
    
    missionTime = Math.min(missionTime, 120);
    triggerRadioMessage("Lookout", "Guetteur : 'Alarme déclenchée ! Le SWAT arrive dans 2 minutes, sors de là !'");
    
    stopTensionMusic();
    startTensionMusic();
}

function triggerPoliceBusted() {
    endMission(false);
}

// Normalized horizontal forward vector calculations
function getForwardVector() {
    _forwardVec.set(0, 0, -1);
    _forwardVec.applyQuaternion(camera.quaternion);
    _forwardVec.y = 0; 
    const len = _forwardVec.length();
    if (len > 0.0001) {
        _forwardVec.divideScalar(len);
    } else {
        _forwardVec.set(0, 0, -1);
        _forwardVec.applyAxisAngle(_upVec, camera.rotation.y);
    }
    return _forwardVec;
}

function getSideVector() {
    _sideVec.set(1, 0, 0);
    _sideVec.applyQuaternion(camera.quaternion);
    _sideVec.y = 0; 
    const len = _sideVec.length();
    if (len > 0.0001) {
        _sideVec.divideScalar(len);
    } else {
        _sideVec.set(1, 0, 0);
        _sideVec.applyAxisAngle(_upVec, camera.rotation.y);
    }
    return _sideVec;
}

function getForwardVectorRaw() {
    _rawForwardVec.set(0, 0, -1);
    _rawForwardVec.applyQuaternion(camera.quaternion);
    return _rawForwardVec;
}

function checkCollisionsWithWalls(position) {
    const radius = 0.5;
    const px = position.x;
    const pz = position.z;
    const minX_p = px - radius;
    const maxX_p = px + radius;
    const minZ_p = pz - radius;
    const maxZ_p = pz + radius;
    
    for (let i = 0; i < wallBounds.length; i++) {
        const b = wallBounds[i];
        if (maxX_p > b.minX && minX_p < b.maxX &&
            maxZ_p > b.minZ && minZ_p < b.maxZ) {
            return true;
        }
    }
    return false;
}

function checkFenceClimbing() {
    if (currentJob === 'villa') {
        if (camera.position.z > 28 && camera.position.x > 8 && camera.position.x < 35) {
            triggerRadioMessage("Lookout", "Marcus : 'La grille ! Balance le sac par-dessus et saute ! (Double Espace pour grimper)'");
        }
    }
}

let spacePressCount = 0;
let lastSpacePressTime = 0;
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && pointerLocked && !drivingActive && currentJob === 'villa') {
        const now = performance.now();
        if (now - lastSpacePressTime < 450) {
            spacePressCount++;
            if (spacePressCount >= 2) {
                if (camera.position.z > 28) {
                    camera.position.z = 29.8; 
                    playRadioBeep();
                    triggerRadioMessage("Lookout", "Marcus : 'Joli saut ! Charge le sac dans le coffre du van !'");
                }
                spacePressCount = 0;
            }
        } else {
            spacePressCount = 1;
        }
        lastSpacePressTime = now;
    }
});

// ===================== Rain Particles loop =====================
function initRain() {
    rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
        positions[i] = Math.random() * 60 - 30; // local coordinates
        positions[i+1] = Math.random() * 25 - 5; // vertical span from -5 to 20
        positions[i+2] = Math.random() * 60 - 30;
    }
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMat = new THREE.PointsMaterial({
        color: 0x64748b,
        size: 0.08,
        transparent: true,
        opacity: 0.45
    });
    rainParticles = new THREE.Points(rainGeometry, rainMat);
    scene.add(rainParticles);
}

function updateRain() {
    if (!rainParticles || currentJob !== 'villa') return;
    
    // Move rain vertically in local space (no CPU array writes, zero GPU memory uploads!)
    rainParticles.position.y -= 0.65;
    if (rainParticles.position.y < -15) {
        rainParticles.position.y = 5;
    }
    
    // Center the rain system horizontally on the player camera
    rainParticles.position.x = camera.position.x;
    rainParticles.position.z = camera.position.z;
}

// ===================== 3D CAR CHASE ESCAPE RUNNER =====================
function resetSpeedLine(line) {
    line.position.x = (Math.random() * 2 - 1) * 8;
    line.position.y = Math.random() * 4 + 0.1;
    line.position.z = -Math.random() * 80 - 10;
}

function launch3DCarChase() {
    drivingActive = true;
    drivingSpeed = 60; 
    drivingDistance = 0;
    let maxHp = 100;
    if (upgrades.chassis) maxHp += 50;
    if (upgrades.kevlar) maxHp += 50;
    drivingHealth = maxHp;
    drivingSearchStars = alertLevel === 'alarm' ? 3 : 1;
    drivingHeadlights = true;
    drivingPlayerLane = 1; 
    drivingObstacles = [];
    drivingRoadSegments = [];
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.05);
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 6); 
    camera.rotation.set(-0.25, 0, 0);
    
    const ambient = new THREE.AmbientLight(0x050510);
    scene.add(ambient);
    
    const vanGeo = new THREE.BoxGeometry(1.6, 1.4, 3.2);
    const vanMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    drivingVan = new THREE.Mesh(vanGeo, vanMat);
    drivingVan.position.set(0, 0.7, 0);
    scene.add(drivingVan);
    
    const redLightGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const l1 = new THREE.Mesh(redLightGeo, redLightMat);
    l1.position.set(-0.6, 0.5, 1.6);
    drivingVan.add(l1);
    const l2 = l1.clone();
    l2.position.set(0.6, 0.5, 1.6);
    drivingVan.add(l2);
    
    const headlights = new THREE.SpotLight(0xfffbeb, 8, 30, Math.PI / 4, 0.5, 1);
    headlights.position.set(0, 0.5, -1.6);
    headlights.target = new THREE.Object3D();
    headlights.target.position.set(0, 0.5, -10);
    drivingVan.add(headlights);
    drivingVan.add(headlights.target);
    
    for (let i = 0; i < 6; i++) {
        createRoadSegment(-i * 20);
    }
    
    // Spawn speed lines
    speedLines = [];
    const speedLineGeo = new THREE.BoxGeometry(0.02, 0.02, 3.5);
    const speedLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
    for (let i = 0; i < 15; i++) {
        const line = new THREE.Mesh(speedLineGeo, speedLineMat);
        resetSpeedLine(line);
        scene.add(line);
        speedLines.push(line);
    }
    
    showScreen('game');
    document.body.requestPointerLock();
    startEngineSound();
    
    stopTensionMusic();
    startTensionMusic();
    
    // Toggle HUD panels
    const hudStealth = document.getElementById('hud-stealth');
    const hudDriving = document.getElementById('hud-driving');
    if (hudStealth) hudStealth.classList.add('hidden');
    if (hudDriving) hudDriving.classList.remove('hidden');
    
    if (elDriveDistance) elDriveDistance.textContent = 'FUITE : 0 / 1000m';
    if (elDriveStars) elDriveStars.textContent = "RECHERCHE : " + "⭐".repeat(drivingSearchStars);
    if (elDriveSpeedVal) elDriveSpeedVal.textContent = Math.floor(drivingSpeed);
    
    if (elDriveHealthFill) elDriveHealthFill.style.width = (drivingHealth / maxHp * 100) + '%';
    
    triggerRadioMessage("Marcus", "Appuie sur le champignon ! Gyrophares repérés à l'arrière, dérape et coupe tes phares (L) dans l'ombre industrielle !");
}

function createRoadSegment(zPos) {
    const roadGeo = new THREE.PlaneGeometry(12, 20);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, zPos);
    scene.add(road);
    drivingRoadSegments.push(road);
    
    const lineGeo = new THREE.PlaneGeometry(0.2, 5);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.01, zPos);
    scene.add(line);
    drivingRoadSegments.push(line);
}

function spawnPoliceChaseCar() {
    const carGeo = new THREE.BoxGeometry(1.6, 1.2, 3.0);
    const carMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const cop = new THREE.Mesh(carGeo, carMat);
    
    const l1Geo = new THREE.SphereGeometry(0.12, 4, 4);
    const l1Mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const l1 = new THREE.Mesh(l1Geo, l1Mat);
    l1.position.set(-0.3, 0.7, 0);
    cop.add(l1);
    
    const l2Mat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const l2 = new THREE.Mesh(l1Geo, l2Mat);
    l2.position.set(0.3, 0.7, 0);
    cop.add(l2);
    
    const laneIndex = Math.floor(Math.random() * 3);
    cop.position.set(drivingLanes[laneIndex], 0.6, -70); 
    
    scene.add(cop);
    drivingObstacles.push({
        mesh: cop,
        type: 'police',
        lane: laneIndex,
        lightTimer: 0,
        light1: l1,
        light2: l2
    });
    playDogBarkSound(); 
}

function spawnDebrisObstacle() {
    const binGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 6);
    const binMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const bin = new THREE.Mesh(binGeo, binMat);
    
    const laneIndex = Math.floor(Math.random() * 3);
    bin.position.set(drivingLanes[laneIndex], 0.6, -75);
    scene.add(bin);
    drivingObstacles.push({
        mesh: bin,
        type: 'debris',
        lane: laneIndex
    });
}

function updateDriving(delta) {
    if (!drivingActive) return;
    
    const accel = upgrades.v8 ? 0.42 : 0.3;
    const deccel = upgrades.v8 ? 0.14 : 0.1;
    if (drivingHeadlights) {
        drivingSpeed = Math.min(130, drivingSpeed + accel); 
    } else {
        drivingSpeed = Math.min(85, drivingSpeed + deccel); 
    }
    
    setEngineSoundPitch(40 + drivingSpeed * 0.8);
    if (elDriveSpeedVal) elDriveSpeedVal.textContent = Math.floor(drivingSpeed);
    
    drivingDistance += (drivingSpeed * delta * 0.5);
    if (elDriveDistance) elDriveDistance.textContent = `FUITE : ${Math.floor(drivingDistance)} / 1000m`;
    
    drivingVan.children[2].visible = drivingHeadlights; 
    
    scene.children.forEach(c => {
        if (c instanceof THREE.AmbientLight) {
            c.color.setHex(drivingHeadlights ? 0x070718 : 0x010103);
        }
    });
    
    const targetX = drivingLanes[drivingPlayerLane];
    drivingVan.position.x += (targetX - drivingVan.position.x) * 0.12;
    
    drivingRoadSegments.forEach(seg => {
        seg.position.z += (drivingSpeed * delta * 0.3);
        if (seg.position.z > 20) {
            seg.position.z -= 120; 
        }
    });
    
    // Update speed lines particles positions
    speedLines.forEach(line => {
        line.position.z += (drivingSpeed * delta * 1.5);
        if (line.position.z > 10) {
            resetSpeedLine(line);
        }
    });
    
    drivingSpawnTimer += delta;
    if (drivingSpawnTimer > (drivingHeadlights ? 1.5 : 2.5)) {
        drivingSpawnTimer = 0;
        if (Math.random() < (drivingHeadlights ? 0.65 : 0.25)) {
            spawnPoliceChaseCar();
        } else {
            spawnDebrisObstacle();
        }
    }
    
    if (!drivingHeadlights) {
        if (Math.random() < 0.005) {
            drivingSearchStars = Math.max(0, drivingSearchStars - 1);
            if (elDriveStars) elDriveStars.textContent = "RECHERCHE : " + "⭐".repeat(drivingSearchStars);
        }
    } else {
        if (drivingSearchStars < 3 && Math.random() < 0.005) {
            drivingSearchStars = Math.min(3, drivingSearchStars + 1);
            if (elDriveStars) elDriveStars.textContent = "RECHERCHE : " + "⭐".repeat(drivingSearchStars);
        }
    }
    
    let policeNear = false;
    let closestPoliceDist = 9999;
    for (let i = 0; i < drivingObstacles.length; i++) {
        const obs = drivingObstacles[i];
        if (obs.type === 'police') {
            const zDist = Math.abs(obs.mesh.position.z - drivingVan.position.z);
            if (zDist < closestPoliceDist) {
                closestPoliceDist = zDist;
            }
            if (zDist < 35) {
                policeNear = true;
            }
        }
    }
    
    if (elPoliceFlashOverlay) {
        if (policeNear && drivingSearchStars > 0) {
            elPoliceFlashOverlay.classList.remove('hidden');
            elPoliceFlashOverlay.classList.add('flash-police-anim');
            startSirenSound();
            updateSirenSound(delta, closestPoliceDist);
        } else {
            elPoliceFlashOverlay.classList.add('hidden');
            elPoliceFlashOverlay.classList.remove('flash-police-anim');
            stopSirenSound();
        }
    }
    
    for (let i = drivingObstacles.length - 1; i >= 0; i--) {
        const obs = drivingObstacles[i];
        
        let speedMult = 0.5;
        if (obs.type === 'police' && drivingSearchStars > 0) {
            speedMult = 0.32; 
        }
        
        obs.mesh.position.z += (drivingSpeed * delta * speedMult);
        
        if (obs.type === 'police') {
            obs.lightTimer += delta * 12;
            const toggle = Math.sin(obs.lightTimer) > 0;
            obs.light1.visible = toggle;
            obs.light2.visible = !toggle;
        }
        
        if (obs.mesh.position.z > -1.5 && obs.mesh.position.z < 1.5) {
            const laneDiff = Math.abs(obs.mesh.position.x - drivingVan.position.x);
            if (laneDiff < 1.2) {
                let dmg = obs.type === 'police' ? 25 : 15;
                if (upgrades.kevlar) dmg = Math.floor(dmg * 0.6);
                drivingHealth = Math.max(0, drivingHealth - dmg);
                if (elDriveHealthFill) {
                    const maxHp = 100 + (upgrades.chassis ? 50 : 0) + (upgrades.kevlar ? 50 : 0);
                    elDriveHealthFill.style.width = (drivingHealth / maxHp * 100) + '%';
                }
                
                playGlassCrackSound(); 
                triggerRadioMessage("Lookout", obs.type === 'police' ? "Lookout : 'Aïe ! Manœuvre de déstabilisation de la police (PIT maneuver) !'" : "Lookout : 'Obstacle heurté, tiens la trajectoire !'");
                
                drivingVan.rotation.y = (Math.random() * 2 - 1) * 0.25;
                
                scene.remove(obs.mesh);
                drivingObstacles.splice(i, 1);
                continue;
            }
        }
        
        if (obs.mesh.position.z > 10) {
            scene.remove(obs.mesh);
            drivingObstacles.splice(i, 1);
        }
    }
    
    drivingVan.rotation.y *= 0.88;
    
    if (drivingHealth <= 0) {
        drivingActive = false;
        stopEngineSound();
        stopSirenSound();
        stopTensionMusic();
        endMission(false); 
    } else if (drivingDistance >= 1000) {
        drivingActive = false;
        stopEngineSound();
        stopSirenSound();
        stopTensionMusic();
        endMission(true); 
    }
}

// ===================== MISSION RESULTS =====================
function endMission(success) {
    clearInterval(missionTimerInterval);
    drivingActive = false;
    document.exitPointerLock();
    stopEngineSound();
    stopSirenSound();
    stopTensionMusic();
    
    if (elPoliceFlashOverlay) {
        elPoliceFlashOverlay.classList.remove('flash-police-anim');
        elPoliceFlashOverlay.classList.add('hidden');
    }
    
    document.getElementById('game-screen').className = 'screen';
    showScreen('result');
    
    const title = document.getElementById('result-title');
    const subtitle = document.getElementById('result-subtitle');
    const secureText = document.getElementById('res-loot-secured');
    const valueText = document.getElementById('res-loot-value');
    
    if (success) {
        title.textContent = 'CASSE DU SIÈCLE RÉUSSI !';
        title.className = 'title text-green';
        subtitle.textContent = "Vous avez semé les flics en van et ramené le butin à l'abri.";
        
        let totalVal = 0;
        let fingerprintRiskIncrease = 0;
        
        carTrunk.forEach(item => {
            if (item.heavy || item.type === 'gold bar') {
                hideoutStash.push(item);
            } else {
                totalVal += item.val;
            }
            
            if (!item.sprayed && (item.heavy || item.type === 'secret files' || item.type === 'encrypted usb')) {
                fingerprintRiskIncrease += 5;
            }
        });
        
        dirtyCash += totalVal;
        
        if (fingerprintRiskIncrease > 0) {
            permanentHeat = Math.min(100, permanentHeat + fingerprintRiskIncrease);
            alert(`Empreintes relevées par la police scientifique ! Votre jauge de recherche permanente augmente de +${fingerprintRiskIncrease}% !`);
        }
        
        secureText.textContent = `${carTrunk.length} Objets sécurisés`;
        valueText.textContent = `$${totalVal.toLocaleString()} cash direct + Objets stockés au garage`;
        valueText.className = 'text-yellow';
    } else {
        title.textContent = 'PIÉGÉ / BUSTED !';
        title.className = 'title text-red';
        subtitle.textContent = "Le SWAT vous a intercepté. Retour à la case prison avec caution salée.";
        
        cleanCash = Math.max(0, cleanCash - 2000);
        
        secureText.textContent = '0 Objets';
        valueText.textContent = '-$2,000 (Caution de libération)';
        valueText.className = 'text-red';
    }
    
    updateHideoutHUD();
}

function abortMission() {
    clearInterval(missionTimerInterval);
    drivingActive = false;
    document.exitPointerLock();
    stopEngineSound();
    stopSirenSound();
    stopTensionMusic();
    
    if (elPoliceFlashOverlay) {
        elPoliceFlashOverlay.classList.remove('flash-police-anim');
        elPoliceFlashOverlay.classList.add('hidden');
    }
    
    document.getElementById('game-screen').className = 'screen';
    showScreen('hideout');
    updateHideoutHUD();
}

document.getElementById('back-hideout-btn').addEventListener('click', () => {
    const paid = Math.min(debt, cleanCash + dirtyCash); 
    if (paid > 0) {
        if (cleanCash >= paid) {
            cleanCash -= paid;
        } else {
            dirtyCash -= (paid - cleanCash);
            cleanCash = 0;
        }
        debt -= paid;
        alert(`Virement de $${paid.toLocaleString()} effectué à vos créanciers.`);
    }

    if (debt <= 0) {
        alert("LIBERTÉ ENFIN ! Vous avez remboursé toutes vos dettes de prison ! Vous êtes enfin libre !");
        debt = 25000;
        permanentHeat = 0;
    }
    
    showScreen('hideout');
    updateHideoutHUD();
});

// ===================== ANIMATION LOOP =====================
function animate3D() {
    if (screens.game.classList.contains('hidden')) {
        animationFrameId = null;
        return;
    }
    
    animationFrameId = requestAnimationFrame(animate3D);
    
    if (lockpickActive) {
        updateLockpicking();
        return;
    }
    if (elecActive) {
        updateElectricalSabotage();
        return;
    }
    
    const time = performance.now();
    let delta = (time - prevTime) / 1000;
    if (delta > 0.1) delta = 0.1; // Capped delta safety (v3.2)
    
    if (drivingActive) {
        updateDriving(delta);
        prevTime = time;
        renderer.render(scene, camera);
        return;
    }
    
    if (drillActive) {
        updateThermalDrill();
    }
    
    if (pointerLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        const dirLen = direction.length();
        if (dirLen > 0) {
            direction.divideScalar(dirLen);
        }
        
        let speedMult = 250.0;
        if (crouch) speedMult = 110.0;
        if (isHoldingBreath) speedMult *= 0.5; 
        if (backpack.some(item => item.heavy)) speedMult *= 0.4;
        
        if (moveForward || moveBackward) velocity.z -= direction.z * speedMult * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speedMult * delta;
        
        _tempOldPos.copy(camera.position);
        
        // Split movement into X and Z to allow sliding along walls, and increase speed multiplier to 0.15 (from 0.05)
        const forwardVec = getForwardVector();
        const sideVec = getSideVector();
        
        const moveX = forwardVec.x * (-velocity.z * delta * 0.15) + sideVec.x * (-velocity.x * delta * 0.15);
        const moveZ = forwardVec.z * (-velocity.z * delta * 0.15) + sideVec.z * (-velocity.x * delta * 0.15);
        
        // Move X and test collision
        if (Math.abs(moveX) > 0.0001) {
            camera.position.x += moveX;
            if (checkCollisionsWithWalls(camera.position)) {
                camera.position.x = _tempOldPos.x;
                velocity.x = 0;
            }
        }
        
        // Move Z and test collision
        if (Math.abs(moveZ) > 0.0001) {
            camera.position.z += moveZ;
            if (checkCollisionsWithWalls(camera.position)) {
                camera.position.z = _tempOldPos.z;
                velocity.z = 0;
            }
        }
        
        camera.position.y = crouch ? 1.0 : 1.8;
        
        let isMoving = moveForward || moveBackward || moveLeft || moveRight;
        if (isMoving) {
            let stepInterval = crouch ? 0.65 : 0.38;
            footstepTimer += delta;
            if (footstepTimer >= stepInterval) {
                playFootstepSound();
                footstepTimer = 0;
            }
        } else {
            footstepTimer = 0;
        }
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            _tempProjOffset.copy(p.velocity).multiplyScalar(0.04);
            p.mesh.position.add(_tempProjOffset);
            p.velocity.y -= p.gravity;
            p.life--;
            
            if (p.mesh.position.y <= 0.2 || p.life <= 0) {
                if (p.type === 'gas') {
                    triggerGasCloud(p.mesh.position);
                } else if (p.type === 'dart') {
                    triggerDartNoise(p.mesh.position);
                } else if (p.type === 'iem') {
                    triggerIEMDischarge(p.mesh.position);
                }
                scene.remove(p.mesh);
                projectiles.splice(i, 1);
            }
        }
        
        if (isHoldingBreath) {
            breathStamina = Math.max(0, breathStamina - delta * 15);
            
            const staminaPercent = Math.floor(breathStamina);
            if (staminaPercent !== lastDisplayedStamina) {
                if (elBreathFill) elBreathFill.style.width = staminaPercent + '%';
                lastDisplayedStamina = staminaPercent;
            }
            
            if (breathStamina <= 0) {
                isHoldingBreath = false;
                breathCooldown = true;
                alertGuardsByNoise(camera.position, 12);
                playRadioBeep(); 
                triggerRadioMessage("Lookout", "Marcus : 'Tu n'as plus de souffle ! Fais attention !'");
            }
        } else {
            breathStamina = Math.min(100, breathStamina + delta * 20);
            
            const staminaPercent = Math.floor(breathStamina);
            if (staminaPercent !== lastDisplayedStamina) {
                if (elBreathFill) elBreathFill.style.width = staminaPercent + '%';
                lastDisplayedStamina = staminaPercent;
            }
            
            if (breathStamina >= 30) {
                breathCooldown = false;
            }
        }
        
        updateGuardsAndStealth(delta);
        updateRain();
        checkFenceClimbing();
        updateInteractionPrompt();
    }
    
    prevTime = time;
    renderer.render(scene, camera);
}

function updateInteractionPrompt() {
    if (!elPrompt) return;
    
    if (!pointerLocked || drivingActive) {
        if (lastPromptVisible) {
            elPrompt.classList.add('hidden');
            lastPromptVisible = false;
            lastPromptText = "";
        }
        return;
    }
    
    interactionRaycaster.set(camera.position, getForwardVectorRaw()); 
    const intersects = interactionRaycaster.intersectObjects(scene.children);
    
    let promptText = "";
    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        const obj = intersects[0].object;
        
        if (obj === paintingCover) {
            promptText = "[E] RETIRER LE TABLEAU";
        } else if (obj.userData.type === 'door' && obj.userData.locked) {
            if (obj.userData.isGlassPatio) {
                promptText = "[E] UTILISER LE COUPE-VERRE";
            } else {
                if (activeTool === 'lockpick') {
                    promptText = "[E] CROCHETER LA PORTE (Base)";
                } else if (activeTool === 'titanium') {
                    promptText = "[E] CROCHETER LA PORTE (Titane)";
                } else if (activeTool === 'crowbar') {
                    promptText = "[E] FORCER LA PORTE (Pied-de-biche)";
                } else {
                    promptText = "PORTE VERROUILLÉE (Sélectionne crochet/pied-de-biche)";
                }
            }
        } else if (obj.userData.type === 'safe' && obj.userData.locked) {
            promptText = "[E] POSER LA PERCEUSE THERMIQUE";
        } else if (obj.userData.type === 'loot' && !obj.userData.picked) {
            promptText = `[E] PRENDRE ${obj.userData.lootType.toUpperCase()} ($${obj.userData.val})`;
        } else if (obj === getawayCar || (obj.parent && obj.parent === getawayCar)) {
            promptText = "[E] OUVRIR LE COFFRE DU VAN";
        } else if (obj === electricalBox && !elecBoxSolved) {
            promptText = "[E] PIRATER LE BOÎTIER ÉLECTRIQUE";
        }
    }
    
    if (promptText) {
        if (promptText !== lastPromptText) {
            elPrompt.textContent = promptText;
            lastPromptText = promptText;
        }
        if (!lastPromptVisible) {
            elPrompt.classList.remove('hidden');
            lastPromptVisible = true;
        }
    } else {
        if (lastPromptVisible) {
            elPrompt.classList.add('hidden');
            lastPromptVisible = false;
            lastPromptText = "";
        }
    }
}

// Direct Start Bypass
window.addEventListener('load', () => {
    launchMission('villa');
});
