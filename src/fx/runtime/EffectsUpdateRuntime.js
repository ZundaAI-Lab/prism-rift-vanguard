import * as THREE from 'three';
import { detachAndDispose } from '../../utils/three-dispose.js';
import {
  PLASMA_READY_FOLLOW_POSITION,
  WARP_STREAM_AXIS_A,
  WARP_STREAM_AXIS_B,
  WARP_STREAM_DIRECTION,
  WARP_STREAM_FROM,
  WARP_STREAM_POINT,
  WARP_STREAM_TO,
  WARP_STREAM_UP,
} from '../EffectsShared.js';

export function installEffectsUpdateRuntime(EffectsSystem) {
  EffectsSystem.prototype.update = function update(dt) {
    for (let i = this.game.store.effects.length - 1; i >= 0; i -= 1) {
      const fx = this.game.store.effects[i];
      fx.age += dt;
      const t = fx.age / fx.life;

      if (fx.kind === 'flash') {
        fx.mesh.scale.setScalar(1 + t * 2.8 * fx.scale);
        fx.mesh.material.opacity = 0.78 * (1 - t);
      } else if (fx.kind === 'explosion') {
        fx.mesh.scale.setScalar(1 + t * 3.4 * fx.scale);
        fx.mesh.material.opacity = 0.75 * (1 - t);
      } else if (fx.kind === 'shockwave') {
        fx.mesh.scale.setScalar(1 + t * 4.2);
        fx.mesh.material.opacity = 0.75 * (1 - t);
      } else if (fx.kind === 'spawnRift') {
        const pulse = Math.sin(Math.min(1, t) * Math.PI);
        const swirl = fx.age * (2.1 + Math.abs(fx.spin)) + fx.wobble;
        fx.mesh.position.y = fx.baseY + Math.sin(swirl * 2.6) * 0.05;
        fx.mesh.rotation.y += dt * fx.spin;

        fx.baseRing.scale.setScalar(0.6 + t * 1.35 + pulse * 0.35);
        fx.shearRing.rotation.y += dt * (1.8 + fx.spin * 0.35);
        fx.shearRing.scale.set(0.82 + pulse * 0.22, 1.08 + pulse * 0.42, 0.55 + pulse * 0.14);
        fx.core.scale.set(1.15 + pulse * 0.48, 0.32 + pulse * 0.18, 1.15 + pulse * 0.48);
        fx.core.position.y = 0.08 + pulse * 0.16;

        fx.veilA.position.y = 0.9 + pulse * 0.26;
        fx.veilB.position.y = fx.veilA.position.y;
        fx.veilA.scale.set(0.72 + pulse * 0.36, 0.84 + pulse * 0.32, 1);
        fx.veilB.scale.set(0.78 + pulse * 0.3, 0.88 + pulse * 0.36, 1);
        fx.veilA.rotation.z = Math.sin(swirl * 1.1) * 0.12;
        fx.veilB.rotation.z = -Math.cos(swirl * 1.05) * 0.12;

        const fade = t < 0.72 ? 1 : Math.max(0, 1 - ((t - 0.72) / 0.28));
        fx.baseRing.material.opacity = 0.38 * fx.intensity * fade;
        fx.shearRing.material.opacity = 0.28 * fx.intensity * fade;
        fx.veilA.material.opacity = 0.14 * fx.intensity * fade * (0.8 + pulse * 0.35);
        fx.veilB.material.opacity = 0.12 * fx.intensity * fade * (0.8 + pulse * 0.32);
        fx.core.material.opacity = 0.18 * fx.intensity * fade * (0.75 + pulse * 0.25);
      } else if (fx.kind === 'plasmaReadyBurst') {
        if (fx.followTarget) {
          fx.mesh.position.copy(PLASMA_READY_FOLLOW_POSITION.copy(fx.followTarget.position).add(fx.followOffset));
        }

        const eased = 1 - ((1 - Math.min(1, t)) ** 3);
        const fade = t < 0.34 ? 1 : Math.max(0, 1 - ((t - 0.34) / 0.66));
        const accentFade = t < 0.18 ? 1 : Math.max(0, 1 - ((t - 0.18) / 0.58));

        fx.mainRing.scale.setScalar(0.3 + eased * 2.2);
        fx.mainRing.material.opacity = 0.96 * fade;
        fx.mainRing.rotation.z += dt * 2.4;

        fx.accentRing.scale.setScalar(0.42 + eased * 2.95);
        fx.accentRing.material.opacity = 0.72 * accentFade;
        fx.accentRing.rotation.z -= dt * 3.1;

        fx.core.scale.set(1.55 + eased * 4.0, 0.42 + eased * 0.26, 1.55 + eased * 4.0);
        fx.core.material.opacity = 0.32 * Math.max(0, 1 - t * 1.5);
      } else if (fx.kind === 'mirrorWarpStream') {
        WARP_STREAM_FROM.copy(fx.from);
        WARP_STREAM_TO.copy(fx.to);
        WARP_STREAM_DIRECTION.subVectors(WARP_STREAM_TO, WARP_STREAM_FROM);
        const pathLength = Math.max(0.001, WARP_STREAM_DIRECTION.length());
        WARP_STREAM_DIRECTION.normalize();
        WARP_STREAM_AXIS_A.crossVectors(WARP_STREAM_DIRECTION, WARP_STREAM_UP);
        if (WARP_STREAM_AXIS_A.lengthSq() < 0.0001) WARP_STREAM_AXIS_A.set(1, 0, 0);
        WARP_STREAM_AXIS_A.normalize();
        WARP_STREAM_AXIS_B.crossVectors(WARP_STREAM_DIRECTION, WARP_STREAM_AXIS_A).normalize();

        const headT = THREE.MathUtils.smoothstep(Math.min(1, t), 0, 1);
        WARP_STREAM_POINT.lerpVectors(WARP_STREAM_FROM, WARP_STREAM_TO, headT);
        fx.core.position.copy(WARP_STREAM_POINT);
        fx.core.scale.setScalar((1.0 + (1 - t) * 1.2) * fx.scale);
        fx.core.material.opacity = 0.92 * (1 - Math.max(0, t - 0.75) / 0.25);

        for (const particle of fx.particles) {
          const trailT = THREE.MathUtils.clamp(headT - particle.offset * 0.28, 0, 1);
          WARP_STREAM_POINT.lerpVectors(WARP_STREAM_FROM, WARP_STREAM_TO, trailT);
          const swirl = particle.phase + fx.age * 26 + particle.offset * 8;
          const spread = (0.22 + (1 - trailT) * 0.46) * fx.scale;
          WARP_STREAM_POINT.addScaledVector(WARP_STREAM_AXIS_A, Math.sin(swirl) * spread);
          WARP_STREAM_POINT.addScaledVector(WARP_STREAM_AXIS_B, Math.cos(swirl * 1.17) * spread * 0.72);
          particle.mesh.position.copy(WARP_STREAM_POINT);
          particle.mesh.scale.setScalar(0.78 + (1 - particle.offset) * 1.15 + (1 - t) * 0.35);
          particle.mesh.material.opacity = 0.72 * (1 - particle.offset * 0.55) * (0.32 + (1 - t) * 0.9);
        }

        fx.mesh.position.y = Math.sin(fx.age * 44) * Math.min(0.12, pathLength * 0.0025);
      } else if (fx.kind === 'spark') {
        fx.velocity.y -= dt * 10;
        fx.mesh.position.addScaledVector(fx.velocity, dt);
        fx.mesh.material.opacity = 0.95 * (1 - t);
      } else if (fx.kind === 'trailSparkle') {
        fx.velocity.multiplyScalar(Math.max(0.92, 1 - dt * 1.8));
        fx.velocity.y += dt * 0.8;
        fx.mesh.position.addScaledVector(fx.velocity, dt);
        fx.mesh.rotation.x += fx.spinX * dt;
        fx.mesh.rotation.y += fx.spinY * dt;
        fx.mesh.rotation.z += fx.spinZ * dt;
        const twinkle = 0.72 + Math.abs(Math.sin(fx.twinklePhase + fx.age * fx.twinkleRate)) * 0.7;
        const fade = t < 0.68 ? 1 : Math.max(0, 1 - ((t - 0.68) / 0.32));
        fx.mesh.scale.setScalar(fx.baseScale * twinkle * (0.82 + (1 - t) * 0.45));
        fx.mesh.material.opacity = 0.9 * fade;
      }

      if (fx.age >= fx.life) {
        this.game.store.effects.splice(i, 1);
        detachAndDispose(fx.mesh);
      }
    }
  };
}
