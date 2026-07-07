# Copilot Instructions

This GitHub Action is written in TypeScript and transpiled to JavaScript. Both
the TypeScript sources and the **generated** JavaScript code are contained in
this repository. The TypeScript sources are contained in the `src` directory and
the JavaScript code is contained in the `dist` directory. A GitHub Actions
workflow checks that the JavaScript code in `dist` is up-to-date. Therefore, you
should not review any changes to the contents of the `dist` folder and it is
expected that the JavaScript code in `dist` closely mirrors the TypeScript code
it is generated from.

## Repository Structure

| Path                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `__tests__/`         | Unit Tests                                               |
| `.devcontainer/`     | Development Container Configuration                      |
| `.github/`           | GitHub Configuration                                     |
| `dist/`              | Generated JavaScript Code                                |
| `script/`            | Helper Scripts (e.g. release script)                     |
| `src/`               | TypeScript Source Code                                   |
| `.checkov.yml`       | Checkov Security Scanner Configuration                   |
| `.env.example`       | Environment Variables Example for `@github/local-action` |
| `.licensed.yml`      | Licensed Dependency License Configuration                |
| `.markdown-lint.yml` | Markdown Linter Configuration                            |
| `.node-version`      | Node.js Version Configuration                            |
| `.prettierrc.yml`    | Prettier Formatter Configuration                         |
| `.yaml-lint.yml`     | YAML Linter Configuration                                |
| `action.yml`         | GitHub Action Metadata                                   |
| `actionlint.yml`     | Actionlint Configuration                                 |
| `CODEOWNERS`         | Code Owners File                                         |
| `CONTRIBUTING.md`    | Contributing Guidelines                                  |
| `eslint.config.mjs`  | ESLint Configuration                                     |
| `jest.config.js`     | Jest Configuration                                       |
| `LICENSE`            | License File                                             |
| `package.json`       | NPM Package Configuration                                |
| `README.md`          | Project Documentation                                    |
| `rollup.config.ts`   | Rollup Bundler Configuration                             |
| `trivy.yaml`         | Trivy Security Scanner Configuration                     |
| `tsconfig.json`      | TypeScript Configuration                                 |

## What This Action Does

This action comments a link to a downloadable artifact on a pull request
description. It uses `@actions/artifact` to look up an artifact by name from the
current workflow run, then updates the PR body via the GitHub API
(`@actions/github`) with a [nightly.link](https://nightly.link) download URL.

The PR body is updated idempotently using HTML comment markers so that
re-running the action replaces the existing link rather than appending a new
one.

## Environment Setup

Install dependencies by running:

```bash
npm install
```

## Testing

Ensure all unit tests pass by running:

```bash
npm run test
```

Unit tests should exist in the `__tests__` directory and are powered by `jest`
with ESM support via `ts-jest`.

## Bundling

Any time files in the `src` directory are changed, you should run the following
command to bundle the TypeScript code into JavaScript:

```bash
npm run bundle
```

## General Coding Guidelines

- Follow standard TypeScript and JavaScript coding conventions and best
  practices
- Changes should maintain consistency with existing patterns and style
- Document changes clearly and thoroughly, including updates to existing
  comments when appropriate
- Do not include basic, unnecessary comments that simply restate what the code
  is doing (focus on explaining _why_, not _what_)
- Use consistent error handling patterns throughout the codebase
- Use TypeScript's type system to ensure type safety and clarity
- Keep functions focused and manageable
- Use descriptive variable and function names that clearly convey their purpose
- After doing any refactoring, ensure to run `npm run test` to ensure that all
  tests still pass
- Use the `@actions/core` package for logging over `console` to ensure
  compatibility with GitHub Actions logging features

### Versioning

GitHub Actions are versioned using branch and tag names. Please ensure the
version in the project's `package.json` is updated to reflect the changes made
in the codebase. The version should follow
[Semantic Versioning](https://semver.org/) principles.

## Pull Request Guidelines

When creating a pull request (PR), please ensure that:

- Keep changes focused and minimal
- Formatting checks pass
- Linting checks pass
- Unit tests pass
- The action has been transpiled to JavaScript and the `dist` directory is
  up-to-date with the latest changes in the `src` directory
- If necessary, the `README.md` file is updated to reflect any changes in
  functionality or usage
