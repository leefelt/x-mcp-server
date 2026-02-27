# ADR-0001: STDIO Transport

## Status
Accepted

## Context
MCP サーバーの通信方式を選択する必要がある。

## Decision
STDIO transport を採用する。Claude Code がローカルプロセスとして起動し、stdin/stdout で JSON-RPC 通信する。

## Consequences
- stdout は MCP プロトコル専用。アプリケーションログは stderr に出力する
- HTTP サーバー不要でセットアップが簡単
- Claude Code の `claude mcp add` で直接登録可能
