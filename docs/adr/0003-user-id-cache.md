# ADR-0003: User ID Cache

## Status
Accepted

## Context
like, retweet, timeline 等の操作に認証ユーザーの ID が必要。毎回 v2.me() を呼ぶのは非効率。

## Decision
client.ts でモジュールレベルの Promise キャッシュを実装。初回呼び出し時に v2.me() を実行し、以降はキャッシュを返す。

## Consequences
- API 呼び出し回数を最小化
- サーバーライフタイム中は同一ユーザー前提（MCP サーバーは単一ユーザー用）
