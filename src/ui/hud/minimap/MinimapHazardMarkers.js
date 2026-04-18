/**
 * Responsibility:
 * - ミニマップ上の hazard marker 正本、重なり判定、描画を担当する。
 *
 * Rules:
 * - marker schema の生成・判定・描画はこのファイルを正本にする。
 * - StageGimmick 側の hazard 生データは読み取り専用で扱い、このファイル外で minimap marker schema を増やさない。
 * - telegraph の重なり判定と描画色は必ず同じ marker schema を共有する。
 */
import {
  MINIMAP_PROJECT_POINT_A,
  MINIMAP_PROJECT_POINT_B,
  applyMinimapShadow,
} from './MinimapShared.js';

const VOID_JUDGEMENT_PILLAR_IMPACT_TIME = 1.25;
const ASTRAL_BLOOM_FINAL_PULSE_RADIUS = 20.0;
const ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH = 1.8;
const ASTRAL_BLOOM_MAX_DAMAGE_INNER_RADIUS = Math.max(0.35, ASTRAL_BLOOM_FINAL_PULSE_RADIUS - ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH);
const ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS = ASTRAL_BLOOM_FINAL_PULSE_RADIUS + ASTRAL_BLOOM_DAMAGE_BAND_HALF_WIDTH;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function getStageHazardMinimapMarkers(stageGimmicks) {
  const hazards = stageGimmicks?.hazards;
  if (!Array.isArray(hazards) || hazards.length === 0) return [];

  const markers = [];
  for (let i = 0; i < hazards.length; i += 1) {
    const hazard = hazards[i];
    if (!hazard) continue;

    if (hazard.kind === 'icefall') {
      const telegraph = hazard.age < 1.0;
      const active = !telegraph && hazard.age < 1.32;
      if (telegraph || active) {
        markers.push({
          shape: 'circle',
          x: hazard.x,
          z: hazard.z,
          radius: 4.2,
          telegraph,
        });
      }
      continue;
    }

    if (hazard.kind === 'mirrorSweep') {
      const dirX = Math.cos(hazard.angle);
      const dirZ = Math.sin(hazard.angle);
      const perpX = -dirZ;
      const perpZ = dirX;
      const ax = perpX * hazard.radius;
      const az = perpZ * hazard.radius;
      const bx = -ax;
      const bz = -az;
      const activeFade = 0.18;
      const activeRatio = clamp01((hazard.age - hazard.activeFrom) / activeFade);
      markers.push({
        shape: 'line',
        ax,
        az,
        bx,
        bz,
        thickness: activeRatio >= 0.55 ? 3.6 : 4.8,
        telegraph: activeRatio < 0.55,
      });
      continue;
    }

    if (hazard.kind === 'astralBloom') {
      markers.push({
        shape: 'circle',
        x: hazard.x,
        z: hazard.z,
        radius: ASTRAL_BLOOM_MAX_DAMAGE_OUTER_RADIUS,
        telegraph: true,
        singleTone: true,
      });
      if (hazard.age >= hazard.pulseStart) {
        markers.push({
          shape: 'ring',
          x: hazard.x,
          z: hazard.z,
          innerRadius: Math.max(0.35, hazard.pulseRadius - 1.8),
          outerRadius: hazard.pulseRadius + 1.8,
          telegraph: false,
        });
      }
      continue;
    }

    if (hazard.kind === 'voidPillar') {
      const impactTime = hazard.impactTime ?? VOID_JUDGEMENT_PILLAR_IMPACT_TIME;
      const startDelay = hazard.startDelay ?? 0;
      const t = hazard.age - startDelay;
      if (t < 0) continue;

      markers.push({
        shape: 'circle',
        x: hazard.x,
        z: hazard.z,
        radius: 5.3,
        telegraph: t < Math.max(0, impactTime - 0.08),
      });
      continue;
    }

    if (hazard.kind === 'voidRing') {
      if (hazard.age < hazard.pulseStart) {
        markers.push({
          shape: 'circle',
          x: hazard.x,
          z: hazard.z,
          radius: 10,
          telegraph: true,
        });
      } else {
        markers.push({
          shape: 'ring',
          x: hazard.x,
          z: hazard.z,
          innerRadius: Math.max(0.25, hazard.pulseRadius - 2.3),
          outerRadius: hazard.pulseRadius + 2.3,
          telegraph: false,
        });
      }
    }
  }

  return markers;
}

function pointToSegmentDistanceSq2D(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const abLenSq = (abx * abx) + (abz * abz);
  if (abLenSq <= 0.000001) {
    const dx = px - ax;
    const dz = pz - az;
    return (dx * dx) + (dz * dz);
  }
  const apx = px - ax;
  const apz = pz - az;
  const t = Math.max(0, Math.min(1, ((apx * abx) + (apz * abz)) / abLenSq));
  const nearestX = ax + (abx * t);
  const nearestZ = az + (abz * t);
  const dx = px - nearestX;
  const dz = pz - nearestZ;
  return (dx * dx) + (dz * dz);
}

function isPlayerOverlappingTelegraphMarker(marker, playerMesh) {
  if (!marker || marker.telegraph !== true || !playerMesh?.position) return false;
  const px = playerMesh.position.x;
  const pz = playerMesh.position.z;

  if (marker.shape === 'circle') {
    const dx = px - (marker.x ?? 0);
    const dz = pz - (marker.z ?? 0);
    const radius = Math.max(0, marker.radius ?? 0);
    return ((dx * dx) + (dz * dz)) <= (radius * radius);
  }

  if (marker.shape === 'ring') {
    const dx = px - (marker.x ?? 0);
    const dz = pz - (marker.z ?? 0);
    const distSq = (dx * dx) + (dz * dz);
    const innerRadius = Math.max(0, marker.innerRadius ?? 0);
    const outerRadius = Math.max(innerRadius, marker.outerRadius ?? innerRadius);
    return distSq >= (innerRadius * innerRadius) && distSq <= (outerRadius * outerRadius);
  }

  if (marker.shape === 'line') {
    const halfThickness = Math.max(0.001, (marker.thickness ?? 3.2) * 0.5);
    return pointToSegmentDistanceSq2D(px, pz, marker.ax ?? 0, marker.az ?? 0, marker.bx ?? 0, marker.bz ?? 0) <= (halfThickness * halfThickness);
  }

  return false;
}

export function installMinimapHazardMarkers(UIRoot) {
  UIRoot.prototype.isPlayerOverlappingMinimapTelegraph = function isPlayerOverlappingMinimapTelegraph(playerMesh, markers = null) {
    if (!playerMesh) return false;
    const resolvedMarkers = Array.isArray(markers) ? markers : getStageHazardMinimapMarkers(this.game.stageGimmicks);
    if (!Array.isArray(resolvedMarkers) || resolvedMarkers.length === 0) return false;
    for (let i = 0; i < resolvedMarkers.length; i += 1) {
      if (isPlayerOverlappingTelegraphMarker(resolvedMarkers[i], playerMesh)) return true;
    }
    return false;
  };

  UIRoot.prototype.drawMinimapStageHazards = function drawMinimapStageHazards(ctx, cx, cy, radius, mapRange, playerMesh, markers = null) {
    const resolvedMarkers = Array.isArray(markers) ? markers : getStageHazardMinimapMarkers(this.game.stageGimmicks);
    if (!Array.isArray(resolvedMarkers) || resolvedMarkers.length === 0) return;
    const highContrast = this.game.optionState?.hud?.highContrast === true;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, radius - 1), 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < resolvedMarkers.length; i += 1) {
      const marker = resolvedMarkers[i];
      if (!marker) continue;

      const telegraph = marker.telegraph === true;
      const singleTone = marker.singleTone === true;
      const fillStyle = singleTone
        ? 'rgba(255, 184, 92, 0.18)'
        : telegraph
          ? 'rgba(255, 188, 96, 0.22)'
          : 'rgba(255, 168, 64, 0.32)';
      const strokeStyle = singleTone
        ? fillStyle
        : telegraph
          ? (highContrast ? 'rgba(255, 246, 224, 0.86)' : 'rgba(255, 198, 128, 0.58)')
          : (highContrast ? 'rgba(255, 245, 228, 0.96)' : 'rgba(255, 184, 88, 0.96)');
      const shadowColor = singleTone
        ? 'rgba(255, 186, 96, 0.22)'
        : telegraph
          ? 'rgba(255, 188, 96, 0.34)'
          : 'rgba(255, 162, 72, 0.62)';

      ctx.save();
      ctx.strokeStyle = strokeStyle;
      ctx.fillStyle = fillStyle;
      applyMinimapShadow(this, ctx, shadowColor, singleTone ? 0 : (telegraph ? 6 : 12));

      if (marker.shape === 'circle') {
        const point = this.projectMinimapWorldPointTo(MINIMAP_PROJECT_POINT_A, marker.x, marker.z, playerMesh, mapRange, radius);
        const drawRadius = Math.max(2, (marker.radius / mapRange) * radius);
        ctx.lineWidth = singleTone ? 0 : Math.max(1.1, drawRadius * (telegraph ? 0.2 : 0.24));
        ctx.beginPath();
        ctx.arc(cx + point.x, cy + point.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();
        if (!singleTone) ctx.stroke();
      } else if (marker.shape === 'ring') {
        const point = this.projectMinimapWorldPointTo(MINIMAP_PROJECT_POINT_A, marker.x, marker.z, playerMesh, mapRange, radius);
        const inner = Math.max(0, (marker.innerRadius / mapRange) * radius);
        const outer = Math.max(inner + 1, (marker.outerRadius / mapRange) * radius);
        const ringRadius = (inner + outer) * 0.5;
        ctx.lineWidth = Math.max(1.8, (outer - inner) * 1.18);
        ctx.beginPath();
        ctx.arc(cx + point.x, cy + point.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (marker.shape === 'line') {
        const a = this.projectMinimapWorldPointTo(MINIMAP_PROJECT_POINT_A, marker.ax, marker.az, playerMesh, mapRange, radius);
        const b = this.projectMinimapWorldPointTo(MINIMAP_PROJECT_POINT_B, marker.bx, marker.bz, playerMesh, mapRange, radius);
        ctx.lineWidth = Math.max(2.1, ((marker.thickness ?? 3.2) / mapRange) * radius * 2 * 1.18);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + a.x, cy + a.y);
        ctx.lineTo(cx + b.x, cy + b.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  };
}
