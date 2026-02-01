const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    input: { activePointers: 3 }, // Permite mover, atacar y esquivar al mismo tiempo
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player, enemies, echoes;
let moveVec = { x: 0, y: 0 };
let joystickBase, joystickThumb;
let isMoving = false;
let movePointer = null; // Rastrea el dedo del movimiento
let isDashing = false;

function preload() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    
    // Textura Jugador (Estilo Núcleo de Energía)
    canvas.width = 64; canvas.height = 64;
    let g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0, '#00f2ff'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2); ctx.fill();
    this.textures.addBase64('hero', canvas.toDataURL());

    // Textura Enemigo (Estilo Corrupción)
    ctx.fillStyle = '#ff2255'; ctx.fillRect(0,0,64,64);
    this.textures.addBase64('mob', canvas.toDataURL());
}

function create() {
    const { width, height } = this.scale;

    // Fondo estético
    this.add.grid(width/2, height/2, width*2, height*2, 64, 64, 0x00f2ff, 0.05);

    player = this.physics.add.sprite(width/2, height/2, 'hero');
    player.setCollideWorldBounds(true).setDrag(1000);

    enemies = this.physics.add.group();
    echoes = this.physics.add.group();
    spawnEnemy(this);

    // --- SISTEMA DE CONTROLES TÁCTILES ANDROID ---

    // 1. JOYSTICK DINÁMICO (Lado Izquierdo)
    joystickBase = this.add.circle(0, 0, 60, 0xffffff, 0.1).setVisible(false).setStrokeStyle(2, 0x00f2ff);
    joystickThumb = this.add.circle(0, 0, 30, 0x00f2ff, 0.4).setVisible(false);

    // 2. BOTONES DE ACCIÓN (Lado Derecho)
    const btnAtk = this.add.circle(width - 100, height - 120, 50, 0x00f2ff, 0.2).setInteractive().setStrokeStyle(3, 0x00f2ff);
    const btnDash = this.add.circle(width - 220, height - 80, 35, 0xffffff, 0.2).setInteractive().setStrokeStyle(2, 0xffffff);
    
    this.add.text(width - 125, height - 135, 'ATK', { fontSize: '24px', fontStyle: 'bold' }).setAlpha(0.7);
    this.add.text(width - 245, height - 95, 'DASH', { fontSize: '18px' }).setAlpha(0.7);

    // Lógica Multi-Touch
    this.input.on('pointerdown', (pointer) => {
        // Si toca la mitad izquierda de la pantalla -> Activa Joystick
        if (pointer.x < width / 2) {
            movePointer = pointer;
            isMoving = true;
            joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
            joystickThumb.setPosition(pointer.x, pointer.y).setVisible(true);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isMoving && pointer === movePointer) {
            let dist = Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
            let angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, pointer.x, pointer.y);
            let maxDist = 60;

            let finalDist = Math.min(dist, maxDist);
            joystickThumb.x = joystickBase.x + Math.cos(angle) * finalDist;
            joystickThumb.y = joystickBase.y + Math.sin(angle) * finalDist;

            moveVec.x = Math.cos(angle) * (finalDist / maxDist);
            moveVec.y = Math.sin(angle) * (finalDist / maxDist);
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (pointer === movePointer) {
            isMoving = false;
            moveVec = { x: 0, y: 0 };
            joystickBase.setVisible(false);
            joystickThumb.setVisible(false);
        }
    });

    // Eventos de botones (independientes del joystick)
    btnAtk.on('pointerdown', () => performAttack(this));
    btnDash.on('pointerdown', () => performDash(this));

    // Colisiones
    this.physics.add.overlap(player, enemies, (p, e) => {
        if (!isDashing) this.cameras.main.shake(100, 0.01);
    });
}

function update() {
    let speed = isDashing ? 800 : 350;
    player.setVelocity(moveVec.x * speed, moveVec.y * speed);

    if (moveVec.x !== 0 || moveVec.y !== 0) {
        player.rotation = Math.atan2(moveVec.y, moveVec.x);
    }

    enemies.children.iterate(e => {
        if (e) game.scene.scenes[0].physics.moveToObject(e, player, 100);
    });
}

function performAttack(scene) {
    // Efecto visual "Wave"
    let wave = scene.add.circle(player.x, player.y, 20, 0x00f2ff, 0.5);
    scene.tweens.add({
        targets: wave, radius: 120, alpha: 0, duration: 250, onComplete: () => wave.destroy()
    });

    enemies.children.iterate(e => {
        if (e && Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < 120) {
            e.destroy();
            saveEcho();
            setTimeout(() => spawnEnemy(scene), 1500);
        }
    });
}

function performDash(scene) {
    if (isDashing) return;
    isDashing = true;
    player.setAlpha(0.4);
    scene.time.delayedCall(300, () => {
        isDashing = false;
        player.setAlpha(1);
    });
}

function spawnEnemy(scene) {
    let x = Phaser.Math.Between(100, scene.scale.width - 100);
    let y = Phaser.Math.Between(100, scene.scale.height - 100);
    enemies.create(x, y, 'mob').setScale(0.8).setTint(0xff2255);
}

function saveEcho() {
    fetch('/api/save-echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'android_user', type: 'Echo_Core' })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('echo-count').innerText = data.count;
    });
}
