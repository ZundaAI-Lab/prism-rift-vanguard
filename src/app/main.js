import { bootstrapApp } from './bootstrap/bootstrapApp.js';

/*
 * main.js の責務
 * - ブラウザから最初に読み込まれるエントリーポイントに限定する
 * - app 配下の起動モジュールを呼び出すだけにする
 * - 実処理・状態管理・DOM 構築・ゲームループ制御を直接書かない
 *
 * main.js の更新ルール
 * - 画面生成処理は ui / app/bootstrap 側へ置く
 * - 起動シーケンスは app/bootstrap 側へ置く
 * - Game 生成や各 system の具体処理は core / 各責務モジュール側へ置く
 * - 一時対応でも main.js にロジックを足さない
 * - main.js で許可するのは import と起動呼び出しの最小配線のみ
 */

bootstrapApp();
