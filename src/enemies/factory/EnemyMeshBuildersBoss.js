import { buildDesertBossMesh } from './bosses/DesertBossMeshBuilder.js';
import { buildSwampBossMesh } from './bosses/SwampBossMeshBuilder.js';
import { buildForgeBossMesh } from './bosses/ForgeBossMeshBuilder.js';
import { buildFrostBossMesh } from './bosses/FrostBossMeshBuilder.js';
import { buildMirrorBossMesh } from './bosses/MirrorBossMeshBuilder.js';
import { buildAstralBossMesh } from './bosses/AstralBossMeshBuilder.js';
import { buildVoidFortressMesh } from './bosses/VoidFortressMeshBuilder.js';
import { buildVoidFighterMesh } from './bosses/VoidFighterMeshBuilder.js';

const BOSS_MESH_BUILDERS = {
  desertBoss: buildDesertBossMesh,
  swampBoss: buildSwampBossMesh,
  forgeBoss: buildForgeBossMesh,
  frostBoss: buildFrostBossMesh,
  mirrorBoss: buildMirrorBossMesh,
  astralBoss: buildAstralBossMesh,
  voidFortress: buildVoidFortressMesh,
  voidFighter: buildVoidFighterMesh,
};

export function buildBossEnemyMesh(ctx) {
  const builder = BOSS_MESH_BUILDERS[ctx.def.mesh];
  if (!builder) return false;
  return builder(ctx);
}
