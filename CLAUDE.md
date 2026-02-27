# X MCP Server

Claude CodeからX (Twitter)を操作するMCPサーバー。

## Tech Stack
- Node.js 20+ / TypeScript strict / ESM
- @modelcontextprotocol/sdk (STDIO transport)
- twitter-api-v2 (OAuth 1.0a)
- zod / Vitest / Biome v2 / pnpm

## Commands
- `pnpm build` — TypeScript compile
- `pnpm dev` — ts-node で開発実行
- `pnpm test` — Vitest
- `pnpm lint` — Biome check
- `pnpm lint:fix` — Biome check --fix
- `pnpm typecheck` — tsc --noEmit
- `pnpm format` — Biome format --write

## Architecture
- STDIO transport: stdout は MCP プロトコル専用。ログは stderr のみ
- 環境変数: .env で API キー管理。コード・ログに含めない
- Tier: X_API_TIER=free|basic で機能制御
- ツール: src/tools/ に1ファイル1ツール。全11ツール常時登録

## Code Style
- ESM ("type": "module")
- Biome v2 でフォーマット + lint
- strict TypeScript (noUncheckedIndexedAccess 含む)
- エラーは errors.ts の formatError() で統一変換
