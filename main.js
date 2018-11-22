var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1000 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  backgroundColor: "#999999"
};

var that;

var ROBOT_SPEED = 250;
var ROBOT_JUMP = 500;
var LASER_SPEED = 3000;

var currentLevel = 0;

var cursors;
var robot;
var blocks;
var victory;
var portal_blue;
var laser_blue;
var portal_yellow;
var laser_yellow;

var blocksCollider;
var blueLaserCollider;
var yellowLaserCollider;

var victoryOverlap;
var bluePortalOverlap;
var yellowPortalOverlap;

var isMoving = false;

var sound_effect;

var game = new Phaser.Game(config);

function preload() {
  that = this;

  this.load.audio("space_music", ["assets/ObservingTheStar.ogg"]);
  this.load.audio("space_sound_effect", ["assets/highUp.mp3"]);

  this.load.image("block_white", "assets/50x50-white.png");
  this.load.image("block_black", "assets/50x50-black.png");
  this.load.image("robot", "assets/50x50-pink.png");

  this.load.image("victory", "assets/12x12-green.png");

  this.load.image("portal_blue", "assets/12x12-blue.png");
  this.load.image("portal_yellow", "assets/12x12-yellow.png");
}

function loadLevel(level) {
  if (!level) return;

  // Add the sprite for the robot
  const [rX, rY] = level.robot_initial_position;
  robot = that.physics.add.sprite(rX, rY, "robot");

  // Physic group for lasers
  laser_blue = that.physics.add.group();
  laser_yellow = that.physics.add.group();

  // Add blocks to the board
  blocks = that.physics.add.group({
    immovable: true,
    allowGravity: false
  });

  blocks.create(-25, 600, "block_white").setScale(1, 24);
  blocks.create(1625, 600, "block_white").setScale(1, 24);
  blocks.create(800, -25, "block_white").setScale(32, 1);
  blocks.create(800, 1225, "block_white").setScale(32, 1);

  if (level.blocks) {
    level.blocks.forEach(block => {
      const [x, y] = block.position;
      const [sX, sY] = block.scale;
      blocks.create(x, y, "block_black").setScale(sX, sY);
    });
  }

  const [x, y] = level.victory.position;
  const [sX, sY] = level.victory.scale;
  victory = that.physics.add.staticImage(x, y, "victory").setScale(sX, sY);

  victoryOverlap = that.physics.add.overlap(robot, victory, levelWon);
  blueLaserCollider = that.physics.add.collider(
    laser_blue,
    blocks,
    makePortal("blue")
  );
  yellowLaserCollider = that.physics.add.collider(
    laser_yellow,
    blocks,
    makePortal("yellow")
  );

  blocksCollider = that.physics.add.collider(robot, blocks);
}

function levelWon() {
  currentLevel = currentLevel + 1;
  that.scene.restart();
}

function create() {
  this.cameras.main.setBounds(0, 0, 1600, 1200);
  this.physics.world.setBounds(0, 0, 1600, 1200);

  // Register the keyboard for receiving inputs
  cursors = this.input.keyboard.createCursorKeys();

  // Starts playing an amazing
  //this.sound.add("space_music", { loop: true }).play();
  sound_effect = this.sound.add("space_sound_effect", { loop: false });

  // Camera :)
  this.cameras.main.setZoom(0.5);

  loadLevel(levels[currentLevel]);
}

const initCollider = () => {
  if (blocksCollider) blocksCollider.destroy();
  blocksCollider = that.physics.add.collider(robot, blocks);
};

const makePortal = color => (laser, block) => {
  const otherColor = color == "blue" ? "yellow" : "blue";
  var new_portal = that.physics.add.staticImage(
    laser.x,
    laser.y,
    "portal_" + color
  );
  new_portal.alpha = 0.8;
  new_overlap = that.physics.add.overlap(
    robot,
    new_portal,
    teleportTo(otherColor)
  );

  if (laser.body.touching.right) {
    new_portal._DIRECTION = "LEFT";
  } else if (laser.body.touching.left) {
    new_portal._DIRECTION = "RIGHT";
  } else if (laser.body.touching.up) {
    new_portal._DIRECTION = "DOWN";
  } else {
    new_portal._DIRECTION = "UP";
  }

  if (laser.body.touching.right || laser.body.touching.left) {
    new_portal.setScale(1, 6).refreshBody();
  } else {
    new_portal.setScale(6, 1).refreshBody();
  }

  if (color == "blue") {
    if (portal_blue) {
      portal_blue.destroy();
      bluePortalOverlap.destroy();
    }
    portal_blue = new_portal;
    bluePortalOverlap = new_overlap;
  } else {
    if (portal_yellow) {
      portal_yellow.destroy();
      yellowPortalOverlap.destroy();
    }
    portal_yellow = new_portal;
    yellowPortalOverlap = new_overlap;
  }
  laser.destroy();
  initCollider();
};

const teleportTo = color => () => {
  var vX, vY, dX, dY;
  const _vX = robot.body.velocity.x;
  const _vY = robot.body.velocity.y;

  var portalTo = { blue: portal_blue, yellow: portal_yellow }[color];
  var portalFrom = { yellow: portal_blue, blue: portal_yellow }[color];

  if (!portalTo) {
    portalTo = portalFrom;
  }

  dX = { UP: 0, DOWN: 0, LEFT: -32, RIGHT: 32 }[portalTo._DIRECTION];
  dY = { UP: -32, DOWN: 32, LEFT: 0, RIGHT: 0 }[portalTo._DIRECTION];

  var vA = {
    UP: _vY,
    DOWN: -_vY,
    RIGHT: -_vX,
    LEFT: _vX
  }[portalFrom._DIRECTION];

  var vO = {
    UP: _vX,
    DOWN: -_vX,
    RIGHT: -_vY,
    LEFT: _vY
  }[portalFrom._DIRECTION];

  vA = Math.max(120, Math.min(1500, Math.abs(vA)));
  vO = Math.min(3000, vO);

  robot.body.x = portalTo.x + dX - 25;
  robot.body.y = portalTo.y + dY - 25;

  if (portalTo._DIRECTION == "UP") {
    robot.setVelocity(vO, -vA);
  } else if (portalTo._DIRECTION == "DOWN") {
    robot.setVelocity(-vO, vA);
  } else if (portalTo._DIRECTION == "RIGHT") {
    robot.setVelocity(vA, -vO);
  } else if (portalTo._DIRECTION == "LEFT") {
    robot.setVelocity(-vA, vO);
  }
};

function update() {
  const vX = robot.body.velocity.x;
  if (robot.body.touching.down) {
    robot.setVelocityX(0.85 * vX);
  } else {
    robot.setVelocityX(1 * vX);
  }

  // Shooting a blue portal
  if (cursors.space.isDown) {
    var speedX = cursors.left.isDown ? -1 : cursors.right.isDown ? 1 : 0;
    var speedY = cursors.up.isDown ? -1 : cursors.down.isDown ? 1 : 0;
    var norm = speedX * speedX + speedY * speedY;
    if (norm > 0 && laser_blue.children.size < 1) {
      var laser = laser_blue.create(robot.x, robot.y, "portal_blue");
      laser.body.allowGravity = false;
      laser.setVelocity(
        (LASER_SPEED * speedX) / norm,
        (LASER_SPEED * speedY) / norm
      );
    }
    return;
  }

  // Shooting a yellow portal
  if (cursors.shift.isDown) {
    var speedX = cursors.left.isDown ? -1 : cursors.right.isDown ? 1 : 0;
    var speedY = cursors.up.isDown ? -1 : cursors.down.isDown ? 1 : 0;
    var norm = speedX * speedX + speedY * speedY;
    if (norm > 0 && laser_yellow.children.size < 1) {
      var laser = laser_yellow.create(robot.x, robot.y, "portal_yellow");
      laser.body.allowGravity = false;
      laser.setVelocity(
        (LASER_SPEED * speedX) / norm,
        (LASER_SPEED * speedY) / norm
      );
    }
    return;
  }

  // Moving left and right
  if (cursors.left.isDown) {
    robot.setVelocityX(-ROBOT_SPEED);
  } else if (cursors.right.isDown) {
    robot.setVelocityX(ROBOT_SPEED);
  }

  // Jumping
  if (cursors.up.isDown && robot.body.touching.down) {
    robot.setVelocityY(-ROBOT_JUMP);
    //sound_effect.play();
  }

  // Going down faster
  if (cursors.down.isDown) {
  }
}
