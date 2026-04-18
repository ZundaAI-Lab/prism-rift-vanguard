/**
 * Responsibility:
 * - store.enemies と同順の読み取り専用フレームビューを構築し、照準補助と弾判定から使う。
 *
 * Rules:
 * - truth source は常に EntityStore.enemies のまま。
 * - この runtime は敵の生死や位置を決めず、現在フレームの参照を軽くするための snapshot だけを持つ。
 * - 位置更新後に再構築し、spawn/remove では dirty 化して次回アクセスで同期する。
 */
export function installEnemyFrameRuntime(EnemySystem) {
  EnemySystem.prototype.ensureEnemyFrameState = function ensureEnemyFrameState() {
    if (!this.enemyFrameEntries) this.enemyFrameEntries = [];
    if (!this.enemyFrameView) this.enemyFrameView = { entries: this.enemyFrameEntries, count: 0, token: 0 };
    if (!Number.isFinite(this.enemyFrameToken)) this.enemyFrameToken = 0;
    if (this.enemyFrameDirty == null) this.enemyFrameDirty = true;
  };

  EnemySystem.prototype.resetEnemyFrameView = function resetEnemyFrameView() {
    this.ensureEnemyFrameState();
    this.enemyFrameView.count = 0;
    this.enemyFrameDirty = true;
  };

  EnemySystem.prototype.markEnemyFrameDirty = function markEnemyFrameDirty() {
    this.ensureEnemyFrameState();
    this.enemyFrameDirty = true;
  };

  EnemySystem.prototype.rebuildEnemyFrameView = function rebuildEnemyFrameView() {
    this.ensureEnemyFrameState();
    const perf = this.game?.debug?.getPerformanceMonitor?.();
    perf?.count?.('enemyFrameRebuilds', 1);

    const entries = this.enemyFrameEntries;
    const token = this.enemyFrameToken + 1;
    this.enemyFrameToken = token;

    let count = 0;
    for (const enemy of this.game.store.enemies) {
      if (!enemy?.alive || enemy.mesh?.visible === false) continue;
      let entry = entries[count];
      if (!entry) {
        entry = { enemy: null, x: 0, y: 0, z: 0, radius: 0, isBoss: false };
        entries[count] = entry;
      }
      const position = enemy.mesh.position;
      entry.enemy = enemy;
      entry.x = position.x;
      entry.y = position.y;
      entry.z = position.z;
      entry.radius = Math.max(0, enemy.radius ?? enemy.def?.radius ?? 0);
      entry.isBoss = !!(enemy.isBoss ?? enemy.def?.isBoss);
      enemy.enemyFrameToken = token;
      count += 1;
    }

    this.enemyFrameView.count = count;
    this.enemyFrameView.token = token;
    this.enemyFrameDirty = false;
    perf?.sample?.('enemyFrameEntries', count);
    return this.enemyFrameView;
  };

  EnemySystem.prototype.getEnemyFrameView = function getEnemyFrameView() {
    this.ensureEnemyFrameState();
    if (this.enemyFrameDirty) this.rebuildEnemyFrameView();
    return this.enemyFrameView;
  };

  EnemySystem.prototype.isEnemyInCurrentFrameView = function isEnemyInCurrentFrameView(enemy) {
    if (!enemy?.alive || enemy.mesh?.visible === false) return false;
    const frameView = this.getEnemyFrameView();
    return enemy.enemyFrameToken === frameView.token;
  };
}
