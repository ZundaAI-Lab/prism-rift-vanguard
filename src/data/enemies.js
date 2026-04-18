/**
 * Responsibility:
 * - Enemy and boss balance definitions.
 *
 * Rules:
 * - Data only. Mesh building belongs to EnemyFactory.
 * - AI names and attack names are contract strings consumed by EnemySystem.
 * - Boss phase logic must read HP ratios from these max HP values; do not secretly multiply boss HP anywhere else.
 * - Stage-specific roster entries should stay grouped so future content passes can tune one biome without touching unrelated sectors.
 */
export const ENEMY_LIBRARY = {
  tutorialTarget: {
    name: 'TRAINING TARGET', behavior: 'sniper', mesh: 'trainingTarget', hp: 10, radius: 1.65, collisionShape: 'capsule', collisionHalfHeight: 1.2, speed: 0,
    preferredDist: 0, score: 0, crystal: [0, 0], shootCd: [99, 100], attackRange: 0, attack: 'none', bulletSpeed: 0, bulletDamage: 0,
    hover: 8.8, color: 0xff6576, accent: 0xfff1b8,
  },
  scarab: {
    name: 'SCARAB', behavior: 'hunter', mesh: 'scarab', hp: 24, radius: 1.8, speed: 9.2, preferredDist: 16,
    score: 120, crystal: [1, 2], shootCd: [1.15, 1.7], attackRange: 95, attack: 'single', bulletSpeed: 36, bulletDamage: 9,
    hover: 9.2, color: 0xff73cb, accent: 0x8ffff0,
  },
  glint: {
    name: 'GLINT', behavior: 'sniper', mesh: 'glint', hp: 18, radius: 1.55, speed: 7.2, preferredDist: 34,
    score: 135, crystal: [1, 3], shootCd: [1.5, 2.1], attackRange: 120, attack: 'lance', bulletSpeed: 48, bulletDamage: 11,
    hover: 11.2, color: 0x6ee8ff, accent: 0x92c7ff,
  },
  obelisk: {
    name: 'OBELISK', behavior: 'orbit', mesh: 'obelisk', hp: 34, radius: 2.05, collisionShape: 'capsule', collisionHalfHeight: 1.8, speed: 6.0, preferredDist: 24,
    score: 165, crystal: [2, 4], shootCd: [1.6, 2.3], attackRange: 100, attack: 'spread', bulletSpeed: 30, bulletDamage: 10,
    hover: 8.6, color: 0xffae68, accent: 0xff5ed5,
  },
  mirage: {
    name: 'MIRAGE', behavior: 'rusher', mesh: 'mirage', hp: 28, radius: 1.9, speed: 16.4, preferredDist: 18,
    score: 190, crystal: [2, 4], shootCd: [1.2, 1.7], attackRange: 90, attack: 'burst', bulletSpeed: 40, bulletDamage: 9,
    hover: 10.5, color: 0xb8a8ff, accent: 0xff8be1,
  },
  spore: {
    name: 'SPORE', behavior: 'artillery', mesh: 'spore', hp: 32, radius: 1.95, speed: 6.0, preferredDist: 28,
    score: 130, crystal: [1, 2], shootCd: [1.42, 1.95], attackRange: 106, attack: 'mortar', bulletSpeed: 26, bulletDamage: 13,
    hover: 9.8, color: 0xa5ff86, accent: 0x76ffd2,
  },
  manta: {
    name: 'MANTA', behavior: 'sweeper', mesh: 'manta', hp: 28, radius: 1.85, speed: 10.4, preferredDist: 23,
    score: 150, crystal: [1, 3], shootCd: [0.92, 1.3], attackRange: 104, attack: 'twin', bulletSpeed: 36, bulletDamage: 9,
    hover: 10.8, color: 0x6effb8, accent: 0xd4ffd8,
  },
  bloomer: {
    name: 'BLOOM NODE', behavior: 'orbit', mesh: 'bloomer', hp: 46, radius: 2.1, speed: 5.4, preferredDist: 26,
    score: 180, crystal: [2, 4], shootCd: [1.5, 2.05], attackRange: 110, attack: 'spray', bulletSpeed: 30, bulletDamage: 11,
    hover: 8.5, color: 0xffd74a, accent: 0x88ff9e,
  },
  leech: {
    name: 'LEECH', behavior: 'kamikaze', mesh: 'leech', hp: 20, radius: 1.3, speed: 18.4, preferredDist: 0,
    score: 115, crystal: [1, 2], shootCd: [99, 100], attackRange: 0, attack: 'none', bulletSpeed: 0, bulletDamage: 0,
    hover: 6.5, color: 0xb2ffea, accent: 0x49ff9e,
  },
  forgeCube: {
    name: 'FORGE CUBE', behavior: 'heavy', mesh: 'forgeCube', hp: 110, radius: 3.0, speed: 5.4, preferredDist: 21,
    score: 170, crystal: [2, 4], shootCd: [1.35, 1.8], attackRange: 110, attack: 'triple', bulletSpeed: 36, bulletDamage: 13,
    hover: 9.2, color: 0xff8e67, accent: 0xffd18b,
  },
  hellray: {
    name: 'HELLRAY', behavior: 'sweeper', mesh: 'hellray', hp: 46, radius: 1.85, speed: 18.8, preferredDist: 25,
    score: 200, crystal: [2, 4], shootCd: [0.92, 1.22], attackRange: 114, attack: 'lance', bulletSpeed: 52, bulletDamage: 10,
    hover: 11.5, color: 0xff6258, accent: 0xffc071,
  },
  mortar: {
    name: 'MORTAR', behavior: 'artillery', mesh: 'mortar', hp: 75, radius: 2.7, speed: 5.3, preferredDist: 34,
    score: 205, crystal: [2, 5], shootCd: [1.65, 2.15], attackRange: 132, attack: 'bomb', bulletSpeed: 24, bulletDamage: 14,
    hover: 12.2, color: 0xffbb6e, accent: 0xff6a55,
  },
  blade: {
    name: 'BLADE', behavior: 'rusher', mesh: 'blade', hp: 40, radius: 1.55, speed: 26.0, preferredDist: 14,
    score: 175, crystal: [2, 4], shootCd: [1.02, 1.4], attackRange: 92, attack: 'spread', bulletSpeed: 40, bulletDamage: 10,
    hover: 10.6, color: 0xffd875, accent: 0xff6055,
  },

  shardfin: {
    name: 'SHARDFIN', behavior: 'sniper', mesh: 'shardfin', hp: 66, radius: 1.75, speed: 10.0, preferredDist: 32,
    score: 220, crystal: [2, 4], shootCd: [0.98, 1.42], attackRange: 132, attack: 'lance', bulletSpeed: 58, bulletDamage: 13,
    hover: 12.4, color: 0xdaf7ff, accent: 0x95deff,
  },
  haloSeraph: {
    name: 'HALO SERAPH', behavior: 'sweeper', mesh: 'haloSeraph', hp: 84, radius: 1.8, speed: 24.8, preferredDist: 24,
    score: 240, crystal: [2, 4], shootCd: [0.92, 1.18], attackRange: 116, attack: 'fan', bulletSpeed: 42, bulletDamage: 10,
    hover: 13.2, color: 0xffffff, accent: 0x99ebff,
  },
  glacier: {
    name: 'GLACIER WARDEN', behavior: 'heavy', mesh: 'glacier', hp: 182, radius: 3.1, speed: 5.0, preferredDist: 26,
    score: 280, crystal: [3, 5], shootCd: [1.36, 1.72], attackRange: 120, attack: 'cross', bulletSpeed: 32, bulletDamage: 14,
    hover: 9.9, color: 0xcef1ff, accent: 0x7fcfff,
  },
  whiteout: {
    name: 'WHITEOUT', behavior: 'artillery', mesh: 'whiteout', hp: 128, radius: 2.45, speed: 8.5, preferredDist: 36,
    score: 255, crystal: [2, 5], shootCd: [1.42, 1.92], attackRange: 132, attack: 'shardfall', bulletSpeed: 28, bulletDamage: 13,
    hover: 14.5, color: 0xefffff, accent: 0xa8d7ff,
  },

  facet: {
    name: 'FACET DRONE', behavior: 'sniper', mesh: 'facet', hp: 108, radius: 1.75, speed: 10.6, preferredDist: 34,
    score: 240, crystal: [2, 4], shootCd: [0.94, 1.32], attackRange: 134, attack: 'split', bulletSpeed: 52, bulletDamage: 12,
    hover: 11.8, color: 0xf8f0ff, accent: 0xff8cd8,
  },
  watcher: {
    name: 'WATCHER', behavior: 'heavy', mesh: 'watcher', hp: 312, radius: 2.9, collisionShape: 'capsule', collisionHalfHeight: 1.65, speed: 6.0, preferredDist: 24,
    score: 270, crystal: [3, 5], shootCd: [1.1, 1.5], attackRange: 124, attack: 'beamlet', bulletSpeed: 44, bulletDamage: 13,
    hover: 10.2, color: 0xe2e8ff, accent: 0x93a7ff,
  },
  duelist: {
    name: 'DUELIST', behavior: 'blink', mesh: 'duelist', hp: 128, radius: 1.6, speed: 16.8, preferredDist: 18,
    score: 260, crystal: [2, 4], shootCd: [0.82, 1.12], attackRange: 104, attack: 'burst', bulletSpeed: 46, bulletDamage: 11,
    hover: 10.7, color: 0xffffff, accent: 0xff67b7,
  },
  reflector: {
    name: 'REFLECTOR', behavior: 'orbit', mesh: 'reflector', hp: 222, radius: 2.5, speed: 8.7, preferredDist: 28,
    score: 295, crystal: [3, 5], shootCd: [1.12, 1.55], attackRange: 118, attack: 'cross', bulletSpeed: 36, bulletDamage: 12,
    hover: 12.5, color: 0xe4f0ff, accent: 0xbfcbff,
  },

  reefRay: {
    name: 'REEF RAY', behavior: 'sweeper', mesh: 'reefRay', hp: 208, radius: 1.9, speed: 28.4, preferredDist: 24,
    score: 255, crystal: [2, 4], shootCd: [0.9, 1.15], attackRange: 134, attack: 'triple', bulletSpeed: 48, bulletDamage: 12,
    hover: 12.4, color: 0x80f3ff, accent: 0xff8df0,
  },
  urchin: {
    name: 'URCHIN NODE', behavior: 'orbit', mesh: 'urchin', hp: 396, radius: 2.65, speed: 16.1, preferredDist: 30,
    score: 300, crystal: [3, 6], shootCd: [1.22, 1.68], attackRange: 126, attack: 'nova', bulletSpeed: 30, bulletDamage: 12,
    hover: 11.6, color: 0xff9cf6, accent: 0x8de8ff,
  },
  drifter: {
    name: 'DRIFTER', behavior: 'artillery', mesh: 'drifter', hp: 262, radius: 2.0, speed: 8.0, preferredDist: 34,
    score: 285, crystal: [3, 5], shootCd: [1.36, 1.78], attackRange: 108, attack: 'mine', bulletSpeed: 22, bulletDamage: 16,
    hover: 14.8, color: 0xa8b6ff, accent: 0x9ffff7,
  },
  coralKnight: {
    name: 'CORAL KNIGHT', behavior: 'hunter', mesh: 'coralKnight', hp: 480, radius: 2.8, speed: 11.8, preferredDist: 22,
    score: 320, crystal: [3, 6], shootCd: [0.92, 1.24], attackRange: 124, attack: 'fan', bulletSpeed: 38, bulletDamage: 13,
    hover: 10.8, color: 0xffa0dd, accent: 0x74f1ff,
  },

  desertBoss: {
    name: 'OBELISK TITAN', isBoss: true, behavior: 'boss_desert', mesh: 'desertBoss', hp: 2800, radius: 6.2, collisionRadius: 7.4, collisionShape: 'capsule', collisionHalfHeight: 4.2, speed: 4.8, preferredDist: 28,
    score: 2400, crystal: [14, 18], shootCd: [0.7, 1.0], attackRange: 140, attack: 'boss', bulletSpeed: 38, bulletDamage: 14,
    hover: 11.5, color: 0xffcf7a, accent: 0xff76de,
  },
  swampBoss: {
    name: 'MYCELIUM QUEEN', isBoss: true, behavior: 'boss_swamp', mesh: 'swampBoss', hp: 4400, radius: 6.8, collisionRadius: 8.2, collisionShape: 'capsule', collisionHalfHeight: 4.6, speed: 4.4, preferredDist: 30,
    score: 2800, crystal: [16, 20], shootCd: [0.8, 1.1], attackRange: 140, attack: 'boss', bulletSpeed: 34, bulletDamage: 15,
    hover: 11.0, color: 0x93ff9c, accent: 0xc9ff7b,
  },
  forgeBoss: {
    name: 'SOLAR ANVIL', isBoss: true, behavior: 'boss_forge', mesh: 'forgeBoss', hp: 6000, radius: 7.0, collisionRadius: 8.4, speed: 5.1, preferredDist: 26,
    score: 3400, crystal: [18, 24], shootCd: [0.68, 0.95], attackRange: 160, attack: 'boss', bulletSpeed: 44, bulletDamage: 16,
    hover: 12.2, color: 0xff9f6a, accent: 0xffe28a,
  },
  frostBoss: {
    name: 'CHOIR OF RIME', isBoss: true, behavior: 'boss_frost', mesh: 'frostBoss', hp: 9600, radius: 7.2, collisionRadius: 8.6, speed: 5.0, preferredDist: 30,
    score: 4200, crystal: [22, 28], shootCd: [0.62, 0.88], attackRange: 165, attack: 'boss', bulletSpeed: 48, bulletDamage: 17,
    hover: 13.0, color: 0xf5feff, accent: 0x9edcff,
  },
  mirrorBoss: {
    name: 'PARALLAX THRONE', isBoss: true, behavior: 'boss_mirror', mesh: 'mirrorBoss', hp: 14000, radius: 7.4, collisionRadius: 8.9, speed: 5.3, preferredDist: 28,
    score: 4800, crystal: [24, 30], shootCd: [0.58, 0.82], attackRange: 170, attack: 'boss', bulletSpeed: 50, bulletDamage: 18,
    hover: 12.8, color: 0xf6f4ff, accent: 0xff7ed0,
  },
  astralBoss: {
    name: 'REEF HEART LEVIATHAN', isBoss: true, behavior: 'boss_astral', mesh: 'astralBoss', hp: 20000, radius: 7.8, collisionRadius: 9.1, speed: 32.1, preferredDist: 32,
    score: 5600, crystal: [28, 34], shootCd: [0.54, 0.76], attackRange: 176, attack: 'boss', bulletSpeed: 42, bulletDamage: 19,
    hover: 13.6, color: 0x9deaff, accent: 0xff8be9,
  },

  voidFortress: {
    name: 'IRON THRONE', isBoss: true, behavior: 'boss_final_fortress', mesh: 'voidFortress', hp: 40000, radius: 10.8, collisionRadius: 12.2, speed: 3.9, preferredDist: 42,
    score: 6000, crystal: [0, 0], shootCd: [0.48, 0.7], attackRange: 210, attack: 'boss', bulletSpeed: 56, bulletDamage: 20,
    hover: 20.0, color: 0xffc57f, accent: 0xff5cc9,
  },
  voidFighter: {
    name: 'SERAPH WRAITH', isBoss: true, behavior: 'boss_final_fighter', mesh: 'voidFighter', hp: 36000, radius: 5.6, collisionRadius: 6.4, speed: 60.0, preferredDist: 22,
    score: 12000, crystal: [0, 0], shootCd: [0.22, 0.42], attackRange: 220, attack: 'boss', bulletSpeed: 72, bulletDamage: 22,
    hover: 14.0, color: 0xe9f3ff, accent: 0x6fc8ff,
  },
};
