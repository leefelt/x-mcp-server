# ADR-0002: Tier Gating

## Status
Accepted

## Context
X API の Free tier は書込のみ、Basic tier は読書両方をサポートする。

## Decision
全11ツールを常時登録し、実行時に tier チェックする。Free tier で読取ツールを実行すると TierError を返し、Basic tier へのアップグレードを案内する。

## Consequences
- ツール一覧で全機能が可視化される
- 実行時エラーで明確なガイダンスを提供
- 環境変数 X_API_TIER で制御（デフォルト: free）
