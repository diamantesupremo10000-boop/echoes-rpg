const config = {
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.RESIZE, parent: 'game-container', width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, enemies, particles, moveVec = {x:0, y:0}, isDragging = false;
let joyBase, joyThumb, btnAtk, btnDash, isDashing = false;

function preload() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    
    // Generar Glow Disc (Jugador)
    canvas.width = 64; canvas.height = 64;
    let grad = ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, '#00f2ff'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(32,32,30,0,Math.PI*2); ctx.fill();
    this.textures.addBase64('p_glow', canvas.toDataURL());

    // Partícula de rastro
    canvas.width = 16; canvas.height = 16;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,16,16);
    this.textures.addBase64('spark', canvas.toDataURL());
}

function create() {
    const { width, height } = this.scale;

    // Fondo "Deep Space"
    this.add.graphics().fillGradientStyle(0x0a0a0c, 0x0a0a0c, 0x1a1a2e, 0x1a1a2e, 1).fillRect(0,0,width,height);

    // Sistema de partículas (Trail)
    particles = this.add.particles(0, 0, 'spark', {
        speed: 100, scale: { start: 0.1, end: 0 }, alpha: { start: 0.5, end: 0 },
        blendMode: 'ADD', follow: player
    });

    // Jugador
    player = this.physics.add.sprite(width/2, height/2, 'p_glow');
    player.setDamping(true).setDrag(0.1).setCollideWorldBounds(true);
    particles.startFollow(player);

    enemies = this.physics.add.group();
    spawnEnemy(this);

    // Controles Estilo WuWa
    createMobileUI(this, width, height);

    // Colisiones con efecto
    this.physics.add.overlap(player, enemies, (p, e) => {
        if(!isDashing) {
            this.cameras.main.shake(100, 0.01);
            p.setTint(0xff0000);
            setTimeout(() => p.clearTint(), 200);
        }
    });
}

function createMobileUI(scene, w, h) {
    joyBase = scene.add.circle(120, h - 120, 50, 0xffffff, 0.1).setStrokeStyle(2, 0x00f2ff);
    joyThumb = scene.add.circle(120, h - 120, 25, 0x00f2ff, 0.5);

    btnAtk = scene.add.circle(w - 100, h - 120, 45, 0x00f2ff, 0.2).setInteractive().setStrokeStyle(3, 0x00f2ff);
    btnDash = scene.add.circle(w - 200, h - 80, 30, 0xffffff, 0.2).setInteractive().setStrokeStyle(2, 0xffffff);

    scene.input.on('pointerdown', p => {
        if(p.x < w/2) { isDragging = true; joyBase.setPosition(p.x, p.y); joyThumb.setPosition(p.x, p.y); }
    });

    scene.input.on('pointermove', p => {
        if(isDragging) {
            let dist = Phaser.Math.Distance.Between(joyBase.x, joyBase.y, p.x, p.y);
            let angle = Phaser.Math.Angle.Between(joyBase.x, joyBase.y, p.x, p.y);
            let limit = 50;
            dist = Math.min(dist, limit);
            joyThumb.setPosition(joyBase.x + Math.cos(angle)*dist, joyBase.y + Math.sin(angle)*dist);
            moveVec = { x: Math.cos(angle) * (dist/limit), y: Math.sin(angle) * (dist/limit) };
        }
    });

    scene.input.on('pointerup', () => { isDragging = false; moveVec = {x:0, y:0}; joyThumb.setPosition(joyBase.x, joyBase.y); });

    btnAtk.on('pointerdown', () => doAttack(scene));
    btnDash.on('pointerdown', () => doDash(scene));
}

function doAttack(scene) {
    // Animación de ataque (Flash circular)
    let ring = scene.add.circle(player.x, player.y, 10, 0x00f2ff, 0.8);
    scene.tweens.add({
        targets: ring, radius: 100, alpha: 0, duration: 200, 
        onComplete: () => ring.destroy()
    });

    enemies.children.iterate(e => {
        if(e && Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y) < 100) {
            // Efecto Impacto
            createExplosion(scene, e.x, e.y);
            e.destroy();
            saveEchoToServer();
            setTimeout(() => spawnEnemy(scene), 2000);
        }
    });
}

function doDash(scene) {
    if(isDashing) return;
    isDashing = true;
    player.setAlpha(0.3);
    // Efecto de rastro fantasma
    scene.tweens.add({ targets: player, scale: 1.5, duration: 100, yoyo: true });
    setTimeout(() => { isDashing = false; player.setAlpha(1); }, 400);
}

function spawnEnemy(scene) {
    let e = scene.physics.add.sprite(Phaser.Math.Between(100, scene.scale.width-100), -50, 'p_glow').setTint(0xff4444);
    enemies.add(e);
}

function createExplosion(scene, x, y) {
    for(let i=0; i<10; i++) {
        let p = scene.add.rectangle(x, y, 4, 4, 0x00f2ff);
        scene.physics.add.existing(p);
        p.body.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
        scene.tweens.add({ targets: p, alpha: 0, duration: 500, onComplete: () => p.destroy() });
    }
}

function saveEchoToServer() {
    fetch('/api/save-echo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ userId: 'dev_user', type: 'Tacet_Core' })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById('echo-count').innerText = data.count;
    });
}

function update() {
    let s = isDashing ? 800 : 300;
    player.setVelocity(moveVec.x * s, moveVec.y * s);
    enemies.children.iterate(e => {
        if(e) game.scene.scenes[0].physics.moveToObject(e, player, 80);
    });
}
