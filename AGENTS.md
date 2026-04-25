# Agent Guidelines

## Package Manager

This project uses **npm** exclusively. Do **not** use `yarn`, `pnpm`, `bun`, or any other package manager.

- Install dependencies: `npm install`
- Run the dev server: `npm run dev`
- Run a script: `npm run <script>`

There is no `yarn.lock`, `.yarnrc`, `pnpm-lock.yaml`, or `bun.lockb` in this repo — keep it that way. If you see `yarn`, `pnpm`, or `bun` commands anywhere in generated code, PRs, or documentation, replace them with their `npm` equivalents.

Do **not** add `yarn` (or `pnpm`, `bun`) as a dependency in `package.json`.
