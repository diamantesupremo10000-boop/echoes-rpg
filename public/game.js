const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, parent: 'game-container', width: '100%', height: '100%' },
    input: { activePointers: 3 },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, enemies, moveVec = { x: 0, y: 0 };
let joystickBase, joystickThumb, isDragging = false, isDashing = false;

function preload() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    
    // Jugador (Glow Tech)
    canvas.width = 64; canvas.height = 64;
    let g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0, '#00f2ff'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2); ctx.fill();
    this.textures.addBase64('hero', canvas.toDataURL());

    // Enemigo
    ctx.fillStyle = '#ff2255'; ctx.fillRect(0,0,64,64);
    this.textures.addBase64('mob', canvas.toDataURL());
}

function create() {
    const { width, height } = this.scale;
    
    // Jugador
    player = this.physics.add.sprite(width/2, height/2, 'hero');
    player.setCollideWorldBounds(true).setDrag(1000);

    enemies = this.physics.add.group();
    spawnEnemy(this);

    // Joystick Dinámico
    joystickBase = this.add.circle(0, 0, 60, 0xffffff, 0.1).setVisible(false).setStrokeStyle(2, 0x00f2ff);
    joystickThumb = this.add.circle(0, 0, 30, 0x00f2ff, 0.4).setVisible(false);

    // Botones (Derecha)
    const btnAtk = this.add.circle(width - 100, height - 100, 50, 0x00f2ff, 0.2).setInteractive().setStrokeStyle(3, 0x00f2ff);
    const btnDash = this.add.circle(width - 220, height - 70, 35, 0xffffff, 0.2).setInteractive().setStrokeStyle(2, 0xffffff);

    // Eventos Táctiles
    this.input.on('pointerdown', p => {
        if (p.x < width / 2) {
            isDragging = true;
            joystickBase.setPosition(p.x, p.y).setVisible(true);
            joystickThumb.setPosition(p.x, p.y).setVisible(true);
        }
    });

    this.input.on('pointermove', p => {
        if (isDragging) {
            let dist = Phaser.Math.Distance.Between(joystickBase.x, joystickBase.y, p.x, p.y);
            let angle = Phaser.Math.Angle.Between(joystickBase.x, joystickBase.y, p.x, p.y);
            let d = Math.min(dist, 60);
            joystickThumb.setPosition(joystickBase.x + Math.cos(angle)*d, joystickBase.y + Math.sin(angle)*d);
            moveVec = { x: Math.cos(angle)*(d/60), y: Math.sin(angle)*(d/60) };
        }
    });

    this.input.on('pointerup', () => {
        isDragging = false; moveVec = {x:0, y:0};
        joystickBase.setVisible(false); joystickThumb.setVisible(false);
    });

    btnAtk.on('pointerdown', () => {
        enemies.children.iterate(e => {
            if (e && Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < 120) {
                e.destroy();
                saveLocalEcho();
                setTimeout(() => spawnEnemy(this), 1500);
            }
        });
    });

    btnDash.on('pointerdown', () => {
        if (isDashing) return;
        isDashing = true; player.setAlpha(0.4);
        this.time.delayedCall(300, () => { isDashing = false; player.setAlpha(1); });
    });

    // Cargar ecos iniciales
    document.getElementById('echo-val').innerText = localStorage.getItem('echo_count') || 0;
}

function update() {
    let s = isDashing ? 800 : 350;
    player.setVelocity(moveVec.x * s, moveVec.y * s);
    enemies.children.iterate(e => { if(e) this.physics.moveToObject(e, player, 100); });
}

function spawnEnemy(scene) {
    scene.physics.add.sprite(Phaser.Math.Between(100, scene.scale.width-100), 100, 'mob');
}

function saveLocalEcho() {
    let count = parseInt(localStorage.getItem('echo_count') || '0') + 1;
    localStorage.setItem('echo_count', count);
    document.getElementById('echo-val').innerText = count;
}
