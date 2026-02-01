const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false // Pon true para ver las cajas de colisión
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player, enemies, echoes;
let cursors, spaceKey, wasd;
let isDashing = false;
let canAttack = true;
const userId = "player_" + Math.floor(Math.random() * 1000); // ID aleatorio por sesión

function preload() {
    // Generamos texturas simples al vuelo (Cuadrados de colores)
    // Esto evita problemas de carga de imágenes externas
    let canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    let ctx = canvas.getContext('2d');
    
    // Textura blanca base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,32,32);
    this.textures.addBase64('base', canvas.toDataURL());
}

function create() {
    // 1. JUGADOR (Azul)
    player = this.physics.add.sprite(400, 300, 'base').setTint(0x00aaff);
    player.setCollideWorldBounds(true);
    
    // 2. ENEMIGOS (Rojos)
    enemies = this.physics.add.group();
    spawnEnemy(enemies); // Crear el primero

    // 3. ECOS / ITEMS (Verdes)
    echoes = this.physics.add.group();

    // 4. INPUTS
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.input.on('pointerdown', attack, this);

    // 5. COLISIONES
    this.physics.add.overlap(player, echoes, collectEcho, null, this);
    this.physics.add.overlap(player, enemies, takeDamage, null, this);
}

function update() {
    // Movimiento
    player.setVelocity(0);
    let speed = isDashing ? 500 : 200;

    // Soporte para Flechas y WASD
    if (cursors.left.isDown || wasd.left.isDown) player.setVelocityX(-speed);
    if (cursors.right.isDown || wasd.right.isDown) player.setVelocityX(speed);
    if (cursors.up.isDown || wasd.up.isDown) player.setVelocityY(-speed);
    if (cursors.down.isDown || wasd.down.isDown) player.setVelocityY(speed);

    // DASH / ESQUIVA PERFECTA
    if (Phaser.Input.Keyboard.JustDown(spaceKey) && !isDashing) {
        performDash();
    }

    // IA ENEMIGA
    enemies.children.iterate((child) => {
        if (child && child.active) {
            this.physics.moveToObject(child, player, 100);
        }
    });
}

function performDash() {
    isDashing = true;
    player.setTint(0xffffff); // Feedback visual (Invencible)
    player.setAlpha(0.5); // Efecto fantasma
    
    // Efecto "Bullet Time" simulado (hacer enemigos lentos)
    enemies.children.iterate(child => child.body.velocity.scale(0.1));

    setTimeout(() => {
        isDashing = false;
        player.setTint(0x00aaff);
        player.setAlpha(1);
    }, 250); // Dura 250ms
}

function attack() {
    if (!canAttack) return;
    
    // Efecto visual de golpe
    let slash = player.scene.add.rectangle(player.x, player.y, 80, 80, 0xffff00, 0.4);
    setTimeout(() => slash.destroy(), 100);

    // Detectar impacto
    let hit = false;
    enemies.children.iterate((enemy) => {
        if (enemy && enemy.active && Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) < 80) {
            // Drop de Eco
            let echo = echoes.create(enemy.x, enemy.y, 'base').setScale(0.5).setTint(0x00ff00);
            
            enemy.destroy();
            hit = true;
        }
    });

    if (hit) {
        // Respawn de enemigo tras 2 segundos
        setTimeout(() => spawnEnemy(enemies), 2000);
    }
}

function spawnEnemy(group) {
    let x = Phaser.Math.Between(50, 750);
    let y = Phaser.Math.Between(50, 550);
    group.create(x, y, 'base').setTint(0xff0000);
}

function takeDamage(player, enemy) {
    if (isDashing) return; // Si estás haciendo dash, eres inmune
    
    // Aquí iría lógica de vida (Flash rojo)
    player.setTint(0xff0000);
    setTimeout(() => player.setTint(0x00aaff), 100);
}

function collectEcho(player, echo) {
    echo.disableBody(true, true);
    
    // Feedback UI
    document.getElementById('status').innerText = "Guardando Eco...";

    // --- GUARDADO EN BACKEND (Usando rutas relativas) ---
    fetch('/api/save-echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, echoType: 'Shadow_Warrior' })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Inventario:", data.inventory);
        document.getElementById('status').innerText = `¡Eco Capturado! Total: ${data.inventory.length}`;
    })
    .catch(err => {
        console.error(err);
        document.getElementById('status').innerText = "Error al guardar";
    });
}
