# Inkline Arena 完了履歴

この文書は、`docs/tasks.md` から完了として取り除いた Epic / Task の詳細記録を保持します。依存関係の参照 ID は維持されるため、後続 Epic から参照される完了済みタスクの実装内容や検証結果はここで確認します。

## Epic 1: データモデル

### 対象タスク

- `Task 1.1`: ゲーム定義モジュールを導入する
- `Task 1.2`: 現在のステージを `StageDefinition` にリファクタリングする
- `Task 1.3`: アクター状態に `LoadoutDefinition` 対応を追加する

### 完了概要

- `WeaponDefinition`、`SubWeaponDefinition`、`SpecialDefinition`、`LoadoutDefinition`、`MatchRuleDefinition`、`StageDefinition` を `src/game/definitions.ts` に導入した。
- 現行シューター、現行 Turf ルール、現行ステージを既定定義としてデータ化し、ID ベースの取得関数を追加した。
- ステージ補助関数を `StageDefinition` 引数ベースへ切り替え、`InkGame` のシーン構築、スポーン、ナビゲーション、射線判定が既定ステージ定義を使うように変更した。
- `ActorState` に `loadoutId` を追加し、初期化 / リセット処理を `src/game/actors.ts` のテスト可能なヘルパーへ切り出した。
- HUD 描画は表示メタデータを先に解決する構造へ整理し、後続のロードアウト表示追加に備えつつ既存 UI を維持した。

### 変更詳細

- 定義追加:
  - 既定 ID と取得 API を追加し、後続 Epic が `stage / rule / loadout / weapon` を直接参照できるようにした。
  - 現行実装で未使用の `sub/special` は、将来拡張のためのプレースホルダー定義として追加した。
- ステージ移行:
  - これまで `src/game/stage.ts` にハードコードされていた `obstacles`、`navigationNodes`、`teamSpawns`、`width/height` を `StageDefinition` に移した。
  - 移動解決、ブロック判定、射線判定、到達可能ノード列挙はすべて `StageDefinition` を受け取る純関数へ変えた。
- アクター状態移行:
  - 全アクターが `DEFAULT_LOADOUT_ID` を持つようになった。
  - リスポーン後も `loadoutId` を保持し、既定ステージのスポーンと初期 bot target を使って復元される。
- テスト:
  - 定義取得テストを追加した。
  - ステージテストを既定ステージ定義ベースに更新し、スポーン妥当性も検証対象に加えた。
  - アクターのロードアウト割り当て / リセット維持テストを追加した。

### 影響範囲

- `src/game/definitions.ts`
- `src/game/actors.ts`
- `src/game/stage.ts`
- `src/game/game.ts`
- `src/game/types.ts`
- `tests/definitions.test.ts`
- `tests/actors.test.ts`
- `tests/stage.test.ts`
- `tests/botGoal.test.ts`

### 検証結果

- `npm test`
- `npm run build`
- `npm run verify:layout`
