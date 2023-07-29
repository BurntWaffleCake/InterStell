class ProjectileGroup extends Phaser.Physics.Arcade.Group {
    constructor(scene, spriteName) {
        super(scene.physics.world, scene);

        // Initialize the group
        this.createMultiple({
            classType: Projectile, // This is the class we create just below
            frameQuantity: 1000, // Create 200 instances in the pool
            active: false,
            visible: false,
            key: spriteName
        })
    }

    fire(x, y, direction, config) {
        // Get the first available sprite in the group
        const newProjectile = this.getFirstDead(false);
        if (newProjectile) {
            newProjectile.fire(x, y, direction, config);
        }
    }
}

class Projectile extends Phaser.Physics.Arcade.Sprite {
    _distanceTraveled = 0;
    _previousPosition;
    _secondsPassed = 0;
    _pierceCount = 0;
    _piercedObjects = [];

    UUID;

    active = false;

    maxDistance = 0;
    maxPierce = 0;
    damage = 0;

    constructor(scene, x, y, spriteName) {
        super(scene, x, y, spriteName);

        this._previousPosition = { x: x, y: y } //reset previous position for distance calculation
        this._distanceTraveled = 0;
        this._secondsPassed = 0;
        this._pierceCount = 0;
    }

    resetValues(x, y) {
        this._previousPosition = { x: x, y: y } //reset previous position for distance calculation
        this._distanceTraveled = 0;
        this._secondsPassed = 0;
        this._pierceCount = 0;
        this._piercedObjects = []

        this.maxDistance = 0;
        this.maxPierce = 0;
        this.damage = 0;
    }

    _testAlive() {
        if (!this.active) { return false }
        if (this.y <= 0 || this.y >= config.height || this.x <= 0 || this.x >= config.width) { return false }
        if (this.maxDistance <= this._distanceTraveled) { return false };
        if (this._pierceCount > this.maxPierce) { return false };
        return true
    }

    preUpdate(time, delta) { // before the game updates physics
        super.preUpdate(time, delta);

        if (!this._testAlive()) {
            this.active = false;
            this.visible = false;
            return
        }

        this._timePassed += delta;
        this._distanceTraveled += Phaser.Math.Distance.Between(this._previousPosition.x, this._previousPosition.y, this.x, this.y);

        this._previousPosition = { x: this.x, y: this.y }
        this.rotation = Math.atan2(this.body.velocity.y / this.body.velocity.length(), this.body.velocity.x / this.body.velocity.length());
    }

    fire(x, y, direction, config) {
        this.resetValues(x, y);

        this.enableBody(true, x, y, true, true);
        this.setActive(true);
        this.setVisible(true);

        this.setBodySize(config.width || 10, config.height || 10, true);
        this.setDisplaySize(25, 5)
        this.maxDistance = config.maxDistance;
        this.maxPierce = config.maxPierce;
        this.damage = config.damage;

        this.active = true;

        direction.normalize();
        this.setVelocity((config.speed) * direction.x, (config.speed) * direction.y) // default speed is 100
    }

    onHit(hitObject) {
        if (!this.active) { return }
        if (this._piercedObjects.find(element => element == hitObject.UUID)) { return }
        this._pierceCount += 1;
        this._piercedObjects.push(hitObject.UUID);
    }
}

class Player extends Phaser.Physics.Arcade.Sprite {
    _iframeremainingtime = 0;
    _timesincelastshot = 0;

    iframeTime = .45; //seconds

    shootTimer;
    shooting = false
    shotDebounce = false

    myscene;
    myprojectilegroup;

    accelerationFactor = 1000
    turnAcceleration = 1000
    turnRate = 145
    movementSpeed = 3000
    maxMovementSpeed = 250

    health = 100
    xp = 0;
    level = 1;
    levelreq = 30

    shotAmount = 1
    shotSpread = 7
    fireRate = 120 // rounds per minute

    shotSpeed = 1000
    shotDamage = 10;
    shotPierce = 0;
    shotDistance = 10000;

    options = [];
    type;
    rarity;

    used;

    img1;
    img2;
    img3;

    text1;
    text2;
    text3;

    commonUpgradePics = ['bulletSpeedCommon', 'damageCommon', 'fireRateCommon', 'maxPierceCommon', 'shotSpreadCommon', 'vampCommon'];
    rareUpgradePics = ['bulletSpeedRare', 'damageRare', 'fireRateRare', 'maxPierceRare', 'shotSpreadRare', 'vampRare'];
    epicUpgradePics = ['bulletSpeedEpic', 'damageEpic', 'fireRateEpic', 'maxPierceEpic', 'shotSpreadEpic', 'vampEpic'];
    legendaryUpgradePics = ['bulletSpeedLegendary', 'damageLegendary', 'fireRateLegendary', 'maxPierceLegendary', 'shotSpreadLegendary', 'vampLegendary'];
    mythicUpgradePics = ['bulletSpeedMythic', 'damageMythic', 'fireRateMythic', 'maxPierceMythic', 'shotSpreadMythic', 'vampMythic'];

    commonUpgradeEffects = [200, 4, 40, 2, 1, .125];
    rareUpgradeEffects = [400, 8, 80, 4, 2, .25];
    epicUpgradeEffects = [800, 16, 160, 8, 3, .5];
    legendaryUpgradeEffects = [1600, 32, 32, 16, 4, 1];
    MythicUpgradeEffects = [3200, 64, 64, 32, 5, 2];

    upgradePics = [this.commonUpgradePics, this.rareUpgradePics, this.epicUpgradePics, this.legendaryUpgradePics, this.mythicUpgradePics];
    upgradeEffects = [this.commonUpgradeEffects, this.rareUpgradeEffects, this.epicUpgradeEffects, this.legendaryUpgradeEffects, this.MythicUpgradeEffects]
    types = [this.shotSpeed, this.shotDamage, this.fireRate, this.shotPierce, this.shotAmount, this.vamp];

    vamp = 0;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        //this.setCollideWorldBounds(true);

        this.setDamping(true)
        this.setDrag(.25, .25)
        this.setAngularDrag(100)
        this.setBounce(.5, .5)
        this.setMaxVelocity(this.maxMovementSpeed, this.maxMovementSpeed)
        this.myscene = scene;
        this.myprojectilegroup = scene.playerProjectileGroup

        this.text1 = scene.add.text(160, 385, '', { fontSize: '50px', fill: '#FFFFFF', font: '35px courier' });
        this.text2 = scene.add.text(160, 585, '', { fontSize: '50px', fill: '#FFFFFF', font: '35px courier' });
        this.text3 = scene.add.text(160, 785, '', { fontSize: '50px', fill: '#FFFFFF', font: '35px courier' });
    }

    shoot() {
        if (Phaser.Math.Between(1, 5) == 1) {
            this.myscene.sound.play('pew')
        } else {
            this.myscene.sound.play('playerShoot')
        }


        let playerLookVector = new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation))

        for (let i = 0; i < this.shotAmount; i++) {
            let dividend = ~~(this.shotAmount / 2)
            let bulletLookVector = playerLookVector.clone()
            let evenAddition = (this.shotAmount % 2 == 0) ? (this.shotSpread / 2 * Math.PI / 180) : 0

            bulletLookVector.rotate((this.shotSpread * Math.PI / 180) * (i - dividend) + evenAddition)
            this.myprojectilegroup.fire(this.x, this.y, bulletLookVector, {
                speed: this.shotSpeed,
                damage: this.shotDamage,
                maxPierce: this.shotPierce,
                maxDistance: this.shotDistance,
                width: 15,
                heigh: 10
            })
        }
        if (this.vamp > 3) {
            this.vamp = 3;
        }
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    updatePlayerMovement() {
        this.setAcceleration(0, 0)
        this.setAngularAcceleration(0)

        let playerMouseDelta = new Phaser.Math.Vector2(this.myscene.input.mousePointer.x - this.x, this.myscene.input.mousePointer.y - this.y)
        let playerLookVector = new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation))

        this.setRotation(Math.atan2(playerMouseDelta.y, playerMouseDelta.x))

        let movementVector = new Phaser.Math.Vector2(0, 0)

        if (this.myscene.keys.W.isDown) { movementVector.add(new Phaser.Math.Vector2(0, -1)) }
        if (this.myscene.keys.A.isDown) { movementVector.add(new Phaser.Math.Vector2(-1, 0)) }
        if (this.myscene.keys.S.isDown) { movementVector.add(new Phaser.Math.Vector2(0, 1)) }
        if (this.myscene.keys.D.isDown) { movementVector.add(new Phaser.Math.Vector2(1, 0)) }

        movementVector.normalize()

        this.setAcceleration(this.movementSpeed * movementVector.x, this.movementSpeed * movementVector.y)
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)

        if (!this.isAlive()) {
            this.myscene.playerDied();
            this.destroy()
            return
        }

        if (this.health > 100) {
            this.health = 100;
        }

        if (this._iframeremainingtime > 0) {
            this._iframeremainingtime = Math.max(0, this._iframeremainingtime - deltaTime);
        }

        this._timesincelastshot += deltaTime
        if (this._timesincelastshot >= (1 / (this.fireRate / 60) * 1000) && this.myscene.input.mousePointer.isDown) {
            this._timesincelastshot = 0;
            this.shoot()
        }

        this.updatePlayerMovement()

        this.myscene.gui.setText(("HP: " + this.health + "  |  Level: " + this.level + "  |  XP Needed: " + (this.levelreq - this.xp)));
    }

    takeDamage(damage) {
        if (this._iframeremainingtime > 0) {
            return;
        }
        this.myscene.sound.play('playerHit')
        this._iframeremainingtime = this.iframeTime * 1000;
        this.health -= damage;
    }

    checkxp() {
        if (this.xp >= this.levelreq) {
            if (this.img1) {
                this.img1.setVisible(false);
                this.img2.setVisible(false);
                this.img3.setVisible(false);
                this.text1.setText('');
                this.text2.setText('');
                this.text3.setText('');
            }
            this.xp -= this.levelreq;
            this.level += 1;
            this.health += 25;
            if (this.health > 100) {
                this.health = 100;
            }
            this.levelreq = Math.floor(this.levelreq * 1.25)
            if (this.level == 5) {
                for (let i = 1; i <= 2; i++) {
                    this.myscene.createShooterEnemy(this.myscene)
                }
            } if (this.level <= 5) {
                this.myscene.createSwarmEnemy(this.myscene);
            } else if (this.level >= 6) {
                this.myscene.createShooterEnemy(this.myscene);
                this.myscene.createSwarmEnemy(this.myscene);
            }
            if (this.level % 10 == 0) {
                this.myscene.createTankEnemy(this.myscene);
            }
            // this.myscene.createTankEnemy(this.myscene);
            this.rarity = 0;
            let rarityVal = Phaser.Math.Between(1, 10000)
            if (rarityVal <= 5000) {
                this.rarity = 0;
            } else if (rarityVal >= 5001 && rarityVal <= 8000) {
                this.rarity = 1;
            } else if (rarityVal >= 8001 && rarityVal <= 9000) {
                this.rarity = 2;
            } else if (rarityVal >= 9000 && rarityVal <= 9500) {
                this.rarity = 3;
            } else if (rarityVal >= 9500 && rarityVal <= 10000) {
                this.rarity = 4;
            }

            this.used = [];

            // for(let i = 0; i < 3; i++){
            this.type = Phaser.Math.Between(0, 5);
            while (this.used.includes(this.type)) {
                this.type = Phaser.Math.Between(0, 5);
            }
            this.img1 = this.myscene.add.image(100, 400 + (0), this.upgradePics[this.rarity][this.type]);
            this.img1.setScale(.075);
            this.used.push(this.type);
            if (this.type == 0) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " BULLET SPEED"));
            }
            if (this.type == 1) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " DAMAGE"));
            }
            if (this.type == 2) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " FIRE RATE"));
            }
            if (this.type == 3) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " PIERCE"));
            }
            if (this.type == 4) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " SHOT AMOUNT"));
            }
            if (this.type == 5) {
                this.text1 = this.text1.setText(("[1] +" + this.upgradeEffects[this.rarity][this.type] + " LIFE STEAL"));
            }

            this.type = Phaser.Math.Between(0, 5);
            while (this.used.includes(this.type)) {
                this.type = Phaser.Math.Between(0, 5);
            }
            this.img2 = this.myscene.add.image(100, 400 + (200), this.upgradePics[this.rarity][this.type]);
            this.img2.setScale(.075);
            this.used.push(this.type);
            if (this.type == 0) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " BULLET SPEED"));
            }
            if (this.type == 1) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " DAMAGE"));
            }
            if (this.type == 2) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " FIRE RATE"));
            }
            if (this.type == 3) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " PIERCE"));
            }
            if (this.type == 4) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " SHOT AMOUNT"));
            }
            if (this.type == 5) {
                this.text2 = this.text2.setText(("[2] +" + this.upgradeEffects[this.rarity][this.type] + " LIFE STEAL"));
            }

            this.type = Phaser.Math.Between(0, 5);
            while (this.used.includes(this.type)) {
                this.type = Phaser.Math.Between(0, 5);
            }
            this.img3 = this.myscene.add.image(100, 400 + (400), this.upgradePics[this.rarity][this.type]);
            this.img3.setScale(.075);
            this.used.push(this.type);
            if (this.type == 0) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " BULLET SPEED"));
            }
            if (this.type == 1) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " DAMAGE"));
            }
            if (this.type == 2) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " FIRE RATE"));
            }
            if (this.type == 3) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " PIERCE"));
            }
            if (this.type == 4) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " SHOT AMOUNT"));
            }
            if (this.type == 5) {
                this.text3 = this.text3.setText(("[3] +" + this.upgradeEffects[this.rarity][this.type] + " LIFE STEAL"));
            }

            this.options.push(this.upgradeEffects[3][this.type]);
        }
    }

    selectOne() {
        this.type = this.used[0]
        if (this.type == 0) {
            this.shotSpeed += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 1) {
            this.shotDamage += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 2) {
            this.fireRate += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 3) {
            this.shotPierce += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 4) {
            this.shotAmount += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 5) {
            this.vamp += this.upgradeEffects[this.rarity][this.type]
        }
        this.used = [];

        this.img1.setVisible(false);
        this.img2.setVisible(false);
        this.img3.setVisible(false);
        this.text1.setText('');
        this.text2.setText('');
        this.text3.setText('');
    }

    selectTwo() {
        this.type = this.used[1]
        if (this.type == 0) {
            this.shotSpeed += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 1) {
            this.shotDamage += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 2) {
            this.fireRate += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 3) {
            this.shotPierce += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 4) {
            this.shotAmount += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 5) {
            this.vamp += this.upgradeEffects[this.rarity][this.type]
        }
        this.used = [];

        this.img1.setVisible(false);
        this.img2.setVisible(false);
        this.img3.setVisible(false);
        this.text1.setText('');
        this.text2.setText('');
        this.text3.setText('');
    }

    selectThree() {
        this.type = this.used[2]
        if (this.type == 0) {
            this.shotSpeed += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 1) {
            this.shotDamage += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 2) {
            this.fireRate += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 3) {
            this.shotPierce += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 4) {
            this.shotAmount += this.upgradeEffects[this.rarity][this.type]
        }
        if (this.type == 5) {
            this.vamp += this.upgradeEffects[this.rarity][this.type]
        }
        this.used = [];

        this.img1.setVisible(false);
        this.img2.setVisible(false);
        this.img3.setVisible(false);
        this.text1.setText('');
        this.text2.setText('');
        this.text3.setText('');
    }
}

class SwarmEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _scene;

    target;
    health = 30;
    moveDelay = 1; //seconds
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'swarmEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this.setGravityY(0);
        this.setScale(.3);
        this.move(this);
        this.setMaxVelocity(300, 300);
    }

    setTarget(target) {
        this.target = target
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this._scene.sound.play('explosion', { volume: .5 })
        this.destroy();
        this.alive = false;
        this._scene.player.xp += 5;
        this._scene.player.checkxp();
        this._scene.guiTimer = this._scene.time.delayedCall(10000, this._scene.createSwarmEnemy(this._scene));

        this._scene.player.health = Math.min(100, this._scene.player.health += this._scene.player.vamp)
    }

    //moves the enemy to a random targeted location
    move() {
        let newspotx = Phaser.Math.Between(1, config.width);
        let newspoty = Phaser.Math.Between(1, config.height);
        // this.setVelocity(0)

        this.setAccelerationX((this._scene.player.x - this.x) + Phaser.Math.Between(100, 300));
        this.setAccelerationY((this._scene.player.y - this.y) + Phaser.Math.Between(100, 300));
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x);

        this._timesincelastmove += deltaTime;
        if (this._timesincelastmove >= this.moveDelay * 1000) {
            this.move();
            this._timesincelastmove = 0;
        }


    }

    takeDamage(damage) {
        this.health -= damage;
        this._scene.sound.play('enemyHit')

        if (this._currentFlashTween && this._currentFlashTween.progress < 1) { return }
        this._currentFlashTween = this._scene.tweens.add({
            targets: this,
            alpha: 0,
            ease: 'Cubic.easeOut',
            duration: 50,
            repeat: 1,
            yoyo: true
        })
    }
}

class TankEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _shotdelaytime = 0;
    _scene;
    _projectileGroup;

    health = 10000;
    shotDelay = 3; //seconds
    attackDamage = 20;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'tankEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this._projectileGroup = scene.enemyProjectileGroup

        direction.normalize()
        this.setVelocity(direction.x * 100, direction.y * 100)

        this.setGravityY(0);
        this.setScale(.1);
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this._scene.sound.play('explosion', { volume: .5 })
        this.destroy();
        this.alive = false;

        this._scene.player.xp += 25;
        this._scene.player.checkxp()
        this._scene.player.health = Math.min(100, this._scene.player.health += this._scene.player.vamp)
        this._scene.createTankEnemy(this._scene);
    }

    shoot() {
        let randomStart = Phaser.Math.FloatBetween(0, Math.PI / 4)
        this._scene.sound.play('enemyShoot')
        for (let i = 0; i < 8; i++) {
            this._projectileGroup.fire(this.x, this.y, new Phaser.Math.Vector2(1, 0).rotate(randomStart + (Math.PI / 4 * i)), {
                speed: 500,
                damage: 5,
                maxPierce: 0,
                maxDistance: 1000,
                width: 30,
                height: 10,
            })
        }
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000;

        this._shotdelaytime = Math.max(0, this._shotdelaytime - deltaTime)
        if (this._shotdelaytime <= 0) {
            this.shoot();
            this._shotdelaytime = this.shotDelay * 1000
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this._scene.sound.play('enemyHit')
        if (this._currentFlashTween && this._currentFlashTween.progress < 1) { return }
        this._currentFlashTween = this._scene.tweens.add({
            targets: this,
            alpha: 0,
            ease: 'Cubic.easeOut',
            duration: 50,
            repeat: 1,
            yoyo: true
        })
    }
}

class AsteroidChunk extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 500;
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction, scale) {
        super(scene, x, y, 'asteroidChunk');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;

        this.setGravityY(0);
        this.setScale(Phaser.Math.FloatBetween(.05, scale / 2));

        direction.normalize()
        this.setVelocity(direction.x * 200 * (.5 - this.scale), direction.y * 200 * (.5 - this.scale))

        this.health *= this.scale
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000 * (1 + this.scale);
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class Asteroid extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 5000;
    attackDamage = 10;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'asteroid');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;

        this.setGravityY(0);
        this.setScale(Phaser.Math.FloatBetween(.05, .3));

        direction.normalize()
        this.setVelocity(direction.x * 100 * (.5 - this.scale), direction.y * 100 * (.5 - this.scale))

        this.health *= this.scale
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        for (let i = 0; i < 4; i++) {
            let newAsteroidChunk = new AsteroidChunk(this._scene, this.x, this.y, this.body.velocity.clone().rotate(Math.PI / 2 * i), this.scale)
            this._scene.enemies.push(newAsteroidChunk)
        }
        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = time / 1000 * (1 + this.scale);
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

class ShooterEnemy extends Phaser.Physics.Arcade.Sprite {
    _timesincelastmove = 0;
    _shotdelaytime = 0;
    _scene;
    _projectileGroup;
    _currentFlashTween;

    flashGraphic;

    target;
    health = 60;
    moveDelay = 1; //seconds
    shotDelay = 2; //seconds
    shotEnvelope = .5 // randomize to min and max
    attackDamage = 5;
    alive = true;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y) {
        super(scene, x, y, 'shooterEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this._projectileGroup = scene.enemyProjectileGroup

        this.setGravityY(0);
        this.setScale(.25);
        this.move(this);
        this.setMaxVelocity(150, 150);
        this.target = scene.player
    }

    setTarget(target) {
        this.target = target
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this._scene.sound.play('explosion', { volume: .5 })
        this.destroy();
        this.alive = false;
        this._scene.player.xp += 10;
        this._scene.player.checkxp();
        this._scene.guiTimer = this._scene.time.delayedCall(10000, this._scene.createShooterEnemy(this._scene));
        this._scene.player.health = Math.min(100, this._scene.player.health += this._scene.player.vamp)
    }

    //moves the enemy to a random targeted location
    move() {
        let newspotx = Phaser.Math.Between(1, config.width);
        let newspoty = Phaser.Math.Between(1, config.height);
        this.setAccelerationX((newspotx - this.x) / 3);
        this.setAccelerationY((newspoty - this.y) / 3);
    }

    shoot() {
        this._scene.sound.play('enemyShoot')
        this._projectileGroup.fire(this.x, this.y, new Phaser.Math.Vector2(Math.cos(this.rotation), Math.sin(this.rotation)), {
            speed: 500,
            damage: 10,
            maxPierce: 0,
            maxDistance: 1000,
            width: 10,
            height: 10,
        })
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.target.y - this.y, this.target.x - this.x);

        this._timesincelastmove += deltaTime;
        if (this._timesincelastmove >= this.moveDelay * 1000) {
            this.move();
            this._timesincelastmove = 0;
        }

        this._shotdelaytime = Math.max(0, this._shotdelaytime - deltaTime)
        if (this._shotdelaytime <= 0) {
            this.shoot();
            this._shotdelaytime = (this.shotDelay + Phaser.Math.FloatBetween(-this.shotEnvelope, this.shotEnvelope)) * 1000
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this._scene.sound.play('enemyHit')
        if (this._currentFlashTween && this._currentFlashTween.progress < 1) { return }
        this._currentFlashTween = this._scene.tweens.add({
            targets: this,
            alpha: 0,
            ease: 'Cubic.easeOut',
            duration: 50,
            repeat: 1,
            yoyo: true
        })
    }
}

class RunnerEnemy extends Phaser.Physics.Arcade.Sprite {
    _scene;

    health = 20;
    attackDamage = 15;
    alive = true;

    useWave = true;
    waveAmplitude = 0
    waveTimeScale = 0

    moveDirection;

    UUID = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

    constructor(scene, x, y, direction) {
        super(scene, x, y, 'runnerEnemy');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this._scene = scene;
        this.setGravityY(0);
        this.setDisplaySize(45, 15)

        this.moveDirection = direction.normalize().scale(Phaser.Math.Between(400, 600))
        this.waveAmplitude = Phaser.Math.Between(0, 300)
        this.waveTimeScale = Phaser.Math.Between(1, 5)
    }

    isAlive() {
        if (this.health <= 0) { return false }
        return true
    }

    kill() {
        this._scene.sound.play('explosion', { volume: .5 })
        this._scene.player.xp += 1;
        this._scene.player.checkxp();
        this._scene.guiTimer = this._scene.time.delayedCall(10000, this._scene.createShooterEnemy(this._scene));
        this._scene.player.health = Math.min(100, this._scene.player.health += this._scene.player.vamp)

        this.destroy();
        this.alive = false;
    }

    preUpdate(time, deltaTime) {
        super.preUpdate(time, deltaTime)
        if (!this.isAlive()) { this.kill(); return; }

        this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);

        if (this.useWave) {
            let moveVector = this.moveDirection.clone()
            let rightVector = this.moveDirection.clone().normalize().rotate(Math.PI / 2).scale(this.waveAmplitude * Math.cos(this.waveTimeScale * time / 1000))

            this.body.velocity = moveVector.add(rightVector)
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        this._scene.sound.play('enemyHit')
        if (this._currentFlashTween && this._currentFlashTween.progress < 1) { return }
        this._currentFlashTween = this._scene.tweens.add({
            targets: this,
            alpha: 0,
            ease: 'Cubic.easeOut',
            duration: 50,
            repeat: 1,
            yoyo: true
        })
    }
}

class GameScreen extends Phaser.Scene {
    player;
    playerDead = false;

    playerProjectileGroup;
    enemyProjectileGroup;

    backgroundMusic;

    //Keyboard controls
    cursors;
    keys;
    space;

    guiTimer;
    gui;

    one;
    two;
    three;

    enemies = [];

    constructor() {
        super('gamescreen')
    }

    preload() {
        this.load.image('stars', 'assets/images/newstarbackground.png');
        this.load.image('player', 'assets/images/maincharacter.png');

        this.load.image('swarmEnemy', 'assets/images/Swarm.png');
        this.load.image('shooterEnemy', 'assets/images/Imp.png')
        this.load.image('runnerEnemy', 'assets/images/Rocket.png')
        this.load.image('tankEnemy', 'assets/images/Tank.png')

        this.load.image('asteroid', 'assets/images/Asteroid.png')
        this.load.image('asteroidChunk', 'assets/images/AsteroidChunk.png')

        this.load.image('playerLaser', 'assets/images/PlayerLaser.png')
        this.load.image('enemyLaser', 'assets/images/EnemyLaser.png')

        this.load.image('bulletSpeedCommon', 'assets/images/bulletspeed_common.png')
        this.load.image('bulletSpeedRare', 'assets/images/bulletspeed_rare.png')
        this.load.image('bulletSpeedEpic', 'assets/images/bulletspeed_epic.png')
        this.load.image('bulletSpeedLegendary', 'assets/images/bulletspeed_legendary.png')
        this.load.image('bulletSpeedMythic', 'assets/images/bulletspeed_mythic.png')

        this.load.image('damageCommon', 'assets/images/Damage_Common.png')
        this.load.image('damageRare', 'assets/images/Damage_Rare.png')
        this.load.image('damageEpic', 'assets/images/Damage_Epic.png')
        this.load.image('damageLegendary', 'assets/images/Damage_Legendary.png')
        this.load.image('damageMythic', 'assets/images/Damage_Mythic.png')

        this.load.image('fireRateCommon', 'assets/images/fire_rate_common.png')
        this.load.image('fireRateRare', 'assets/images/fire_rate_rare.png')
        this.load.image('fireRateEpic', 'assets/images/fire_rate_epic.png')
        this.load.image('fireRateLegendary', 'assets/images/fire_rate_legendary.png')
        this.load.image('fireRateMythic', 'assets/images/fire_rate_mythic.png')

        this.load.image('maxPierceCommon', 'assets/images/MaxPierceCommon.png')
        this.load.image('maxPierceRare', 'assets/images/MaxPierceRare.png')
        this.load.image('maxPierceEpic', 'assets/images/MaxPierceEpic.png')
        this.load.image('maxPierceLegendary', 'assets/images/MaxPierceLegendary.png')
        this.load.image('maxPierceMythic', 'assets/images/MaxPierceMythic.png')

        this.load.image('shotSpreadCommon', 'assets/images/ShotSpreadCommon.png')
        this.load.image('shotSpreadRare', 'assets/images/ShotSpreadRare.png')
        this.load.image('shotSpreadEpic', 'assets/images/ShotSpreadEpic.png')
        this.load.image('shotSpreadLegendary', 'assets/images/ShotSpreadLegendary.png')
        this.load.image('shotSpreadMythic', 'assets/images/ShotSpreadMythic.png')

        this.load.image('vampCommon', 'assets/images/Vamp_Common_new.png')
        this.load.image('vampRare', 'assets/images/Vamp_Rare.png')
        this.load.image('vampEpic', 'assets/images/Vamp_Epic_new.png')
        this.load.image('vampLegendary', 'assets/images/Vamp_Legendary.png')
        this.load.image('vampMythic', 'assets/images/Vamp_Mythic.png')

        this.load.audio('playerHit', 'assets/audio/playerHit.mp3')
        this.load.audio('playerShoot', 'assets/audio/playerShoot.wav')
        this.load.audio('pew', 'assets/audio/Pew.mp3')
        this.load.audio('boom', 'assets/audio/Boom.mp3')
        this.load.audio('explosion', 'assets/audio/explosion.wav')
        this.load.audio('levelUp', 'assets/audio/powerUp.wav')
        this.load.audio('enemyHit', 'assets/audio/enemyHit.wav')
        this.load.audio('enemyShoot', 'assets/audio/enemyShoot.wav')
        this.load.audio('backgroundMusic', 'assets/audio/BackgroundMusic(Terraria.Calamity.UnholyInsurgency).mp3')
    }

    getRandomPointOnEdge() {
        let randomSide;
        let xOrY = Phaser.Math.Between(1, 2)

        if (Phaser.Math.Between(1, 2) == 1) { randomSide = 1; } else { randomSide = -1; }

        if (xOrY == 1) {
            return new Phaser.Math.Vector2(Phaser.Math.Between(0, config.width) * randomSide, -100);
        } else if (xOrY == 2) {
            return new Phaser.Math.Vector2(100 * randomSide, Phaser.Math.Between(0, config.width) * randomSide);
        }
    }

    createSwarmEnemy() {
        let spawnPoint = this.getRandomPointOnEdge()
        let myShooter = new SwarmEnemy(this, spawnPoint.x, spawnPoint.y)
        myShooter.target = this.player;
        this.enemies.push(myShooter)
    }

    createShooterEnemy() {
        let spawnPoint = this.getRandomPointOnEdge()
        let myShooter = new ShooterEnemy(this, spawnPoint.x, spawnPoint.y)
        myShooter.target = this.player;
        this.enemies.push(myShooter)
    }

    createTankEnemy() {
        let spawnPoint = this.getRandomPointOnEdge()
        let myTank = new TankEnemy(this, spawnPoint.x, spawnPoint.y, Phaser.Math.RandomXY(new Phaser.Math.Vector2(0, 0)));
        myTank.target = this.player;
        this.enemies.push(myTank)
    }

    playerDied() {
        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;
        this.add.text(screenCenterX, screenCenterY, "YOU DIED", { fontSize: '100px', fill: '#FFFFFF', font: '75px courier' }).setOrigin(.5);

        this.time.delayedCall(3000, this.toMainScreen, [this]);
        this.backgroundMusic.stop()
    }

    toMainScreen(self) {
        self.scene.pause();
        self.scene.start("menuscreen");
    }

    create() {
        let background = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'stars').setOrigin(0, 0);
        this.playerProjectileGroup = new ProjectileGroup(this, 'playerLaser');
        this.enemyProjectileGroup = new ProjectileGroup(this, 'enemyLaser');

        this.player = new Player(this, 500, 500, this.playerProjectileGroup);

        for (let i = 0; i < 5; i++) {
            this.createSwarmEnemy();
        }

        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W, A, S, D');

        this.gui = this.add.text(450, 1100, ("HP: " + this.player.health + "  |  Level: " + this.player.level + "  |  XP Needed: " + (this.player.levelreq - this.player.xp)), { fontSize: '50px', fill: '#FFFFFF', font: '50px courier' });

        this.one = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.two = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
        this.three = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

        this.backgroundMusic = this.sound.add('backgroundMusic', { volume: .5, loop: true })
        this.backgroundMusic.play()
    }

    reflectPosition(target) {
        let targetHeight = target.height * target.scaleY
        let targetWidth = target.width * target.scaleX

        if (target.x >= game.scale.width + targetWidth) {
            target.x = 1
        } else if (target.x <= 0 - targetWidth) {
            target.x = game.scale.width - 1;
        }

        if (target.y >= game.scale.height + targetHeight) {
            target.y = 1
        } else if (target.y <= 0 - targetHeight) {
            target.y = game.scale.height - 1;
        }
    }

    update(time, delta) {
        let deltaSeconds = delta / 1000
        let timeSeconds = time / 1000

        for (let i = 0; i < this.enemies.length; i++) {
            this.reflectPosition(this.enemies[i])
        }
        this.reflectPosition(this.player)

        this.physics.overlap(this.player, this.enemies, function (player, targetEnemy) { player.takeDamage(targetEnemy.attackDamage); });
        this.physics.overlap(this.enemies, this.playerProjectileGroup, function (enemy, playerProjectile) { if (!playerProjectile.active) { return }; enemy.takeDamage(playerProjectile.damage); playerProjectile.onHit(enemy); })
        this.physics.overlap(this.player, this.enemyProjectileGroup, function (player, enemyProjectile) { if (!enemyProjectile.active) { return }; player.takeDamage(enemyProjectile.damage); enemyProjectile.onHit(player); })

        if (Phaser.Input.Keyboard.JustDown(this.one)) {
            this.player.selectOne();
        }
        if (Phaser.Input.Keyboard.JustDown(this.two)) {
            this.player.selectTwo();
        }
        if (Phaser.Input.Keyboard.JustDown(this.three)) {
            this.player.selectThree();
        }
    }
}

class MenuScreen extends Phaser.Scene {
    constructor() {
        super('menuscreen');
    }

    startGame() {
        this.scene.pause();
        this.scene.start('gamescreen');
    }

    preload() {
        this.load.image('stars', 'assets/images/newstarbackground.png');
    }

    create() {
        let background = this.add.tileSprite(0, 0, game.scale.width, game.scale.height, 'stars').setOrigin(0, 0);

        const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

        this.titleText = this.add.text(screenCenterX, screenCenterY, "INTERSTELL", { fontSize: '100px', fill: '#FFFFFF', font: '75px courier' }).setOrigin(.5);
        this.playText = this.add.text(screenCenterX, screenCenterY + 75, "PLAY", { fontSize: '75px', fill: '#FFFFFF', font: '50px courier' }).setOrigin(.5).setInteractive();
        this.playText.on('pointerdown', function () { this.scene.startGame(); })
        this.playText.on('pointerover', function () { this.setColor('#808080') })
        this.playText.on('pointerout', function () { this.setColor('#FFFFFF') })
    }
}

var config = {
    parent: "game",
    width: 1920,
    height: 1080,
    scale: {
        mode: Phaser.Scale. FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: 1,
        min: {
            width: 16,
            height: 9
        }
      
    },

    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            debugShowVelocity: true,
        }
    },
    zoom: 1,
    scene: [MenuScreen, GameScreen]

    //BIG BALLING
    //BigBalling2
};

const game = new Phaser.Game(config);

