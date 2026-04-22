/**
 * Responsibility:
 * - store.enemies と同順の読み取り専用フレームビューを構築し、照準補助と弾判定から使う。
 *
 * Rules:
 * - truth source は常に EntityStore.enemies のまま。
 * - この runtime は敵の生死や位置を決めず、現在フレームの参照を軽くするための slot view だけを持つ。
 * - spawn / move / visibility change / remove で enemy 単位に同期し、毎フレーム全体再構築はしない。
 */
export function installEnemyFrameRuntime(EnemySystem) {
  EnemySystem.prototype.ensureEnemyFrameState = function ensureEnemyFrameState() {
    if (!this.enemyFrameEntries) this.enemyFrameEntries = [];
    if (!this.enemyFrameView) this.enemyFrameView = { entries: this.enemyFrameEntries, count: 0, token: 0 };
    if (!Number.isFinite(this.enemyFrameToken)) this.enemyFrameToken = 0;
  };

  EnemySystem.prototype.resetEnemyFrameView = function resetEnemyFrameView() {
    this.ensureEnemyFrameState();
    this.enemyFrameView.count = 0;
    this.enemyFrameToken = 0;
    this.enemyFrameView.token = 0;
  };

  EnemySystem.prototype.beginEnemyFrame = function beginEnemyFrame() {
    this.ensureEnemyFrameState();
    this.enemyFrameToken += 1;
    this.enemyFrameView.token = this.enemyFrameToken;
  };

  EnemySystem.prototype.registerEnemyFrameEntry = function registerEnemyFrameEntry(enemy) {
    this.ensureEnemyFrameState();
    if (!enemy?.alive || enemy.mesh?.visible === false) return false;
    if (enemy.frameIndex >= 0) return this.syncEnemyFrameEntry(enemy);

    const index = this.enemyFrameView.count;
    let entry = this.enemyFrameEntries[index];
    if (!entry) {
      entry = { enemy: null, x: 0, y: 0, z: 0, radius: 0, isBoss: false };
      this.enemyFrameEntries[index] = entry;
    }

    enemy.frameIndex = index;
    enemy.frameActive = true;
    this.enemyFrameView.count += 1;
    this.syncEnemyFrameEntry(enemy);
    return true;
  };

  EnemySystem.prototype.syncEnemyFrameEntry = function syncEnemyFrameEntry(enemy) {
    if (!enemy?.alive || enemy.mesh?.visible === false) {
      this.unregisterEnemyFrameEntry(enemy);
      return false;
    }
    this.ensureEnemyFrameState();
    if (enemy.frameIndex < 0) this.registerEnemyFrameEntry(enemy);
    const entry = this.enemyFrameEntries[enemy.frameIndex];
    if (!entry) return false;
    const position = enemy.mesh.position;
    entry.enemy = enemy;
    entry.x = position.x;
    entry.y = position.y;
    entry.z = position.z;
    entry.radius = Math.max(0, enemy.radius ?? enemy.def?.radius ?? 0);
    entry.isBoss = !!(enemy.isBoss ?? enemy.def?.isBoss);
    enemy.enemyFrameToken = this.enemyFrameToken;
    enemy.frameActive = true;
    const perf = this.game?.debug?.getPerformanceMonitor?.();
    perf?.sample?.('enemyFrameEntries', this.enemyFrameView.count);
    return true;
  };

  EnemySystem.prototype.unregisterEnemyFrameEntry = function unregisterEnemyFrameEntry(enemy) {
    const removeIndex = enemy?.frameIndex;
    if (!Number.isInteger(removeIndex) || removeIndex < 0) return false;

    const count = this.enemyFrameView.count;
    const lastIndex = count - 1;
    const entries = this.enemyFrameEntries;
    const removedEntry = entries[removeIndex];
    const movedEntry = entries[lastIndex];

    if (removeIndex !== lastIndex && removedEntry && movedEntry?.enemy) {
      removedEntry.enemy = movedEntry.enemy;
      removedEntry.x = movedEntry.x;
      removedEntry.y = movedEntry.y;
      removedEntry.z = movedEntry.z;
      removedEntry.radius = movedEntry.radius;
      removedEntry.isBoss = movedEntry.isBoss;
      movedEntry.enemy.frameIndex = removeIndex;
    }

    if (movedEntry) {
      movedEntry.enemy = null;
      movedEntry.x = 0;
      movedEntry.y = 0;
      movedEntry.z = 0;
      movedEntry.radius = 0;
      movedEntry.isBoss = false;
    }

    this.enemyFrameView.count = Math.max(0, lastIndex);
    enemy.frameIndex = -1;
    enemy.frameActive = false;
    return true;
  };

  EnemySystem.prototype.getEnemyFrameView = function getEnemyFrameView() {
    this.ensureEnemyFrameState();
    return this.enemyFrameView;
  };

  EnemySystem.prototype.isEnemyInCurrentFrameView = function isEnemyInCurrentFrameView(enemy) {
    if (!enemy?.alive || enemy.mesh?.visible === false) return false;
    const frameView = this.getEnemyFrameView();
    return enemy.frameIndex >= 0 && enemy.frameActive !== false && enemy.enemyFrameToken === frameView.token;
  };
}
