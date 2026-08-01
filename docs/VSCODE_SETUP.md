# Visual Studio Code Build and Debug Setup

This repository includes a committed VS Code workspace, build tasks, debugger configurations, and extension recommendations.

## 1. Prerequisites

Complete [`PREREQUISITES_SETUP.md`](./PREREQUISITES_SETUP.md) first.

Minimum local requirements:

- Visual Studio Code;
- Node.js 22.18.0 or newer;
- npm;
- Git;
- `.env.local` containing synthetic Medplum credentials and resource IDs;
- Docker Desktop or Docker Engine for container tasks;
- AWS CLI credentials and `MEDPLUM_SECRET_ARN` for AWS tasks.

Do not store secrets in `.vscode`, the workspace file, or user settings.

## 2. Open the workspace

Open the repository through the included workspace file:

```bash
code 14y-pa-readiness-agent.code-workspace
```

Opening the folder directly also loads `.vscode/tasks.json`, `.vscode/launch.json`, and `.vscode/settings.json`.

When prompted, select **Use Workspace Version** for TypeScript. This uses the TypeScript version installed in `node_modules` rather than a globally installed version.

## 3. Install dependencies from VS Code

Open the Command Palette and select:

```text
Tasks: Run Task
→ 14Y: Install Dependencies
```

This runs:

```bash
npm install
```

Commit the generated `package-lock.json` after the first successful installation.

## 4. Default VS Code build

Use either:

- **Terminal → Run Build Task**;
- **Tasks: Run Build Task** from the Command Palette; or
- `Ctrl+Shift+B` on Windows/Linux and the configured build shortcut on macOS.

The default task is:

```text
14Y: Build and Verify
```

It executes, in order:

```bash
npm run typecheck
npm test
npm run build
```

A successful default build is required before any capability is labeled `[LIVE]`.

## 5. Available application tasks

| VS Code task | Action |
|---|---|
| `14Y: Typecheck` | Runs strict TypeScript checking |
| `14Y: Test` | Runs the Vitest suite once |
| `14Y: Production Build` | Creates the Next.js standalone build |
| `14Y: Build and Verify` | Runs all three static build gates |
| `14Y: Seed Synthetic Medplum Data` | Seeds the synthetic Medplum resources |
| `14Y: Demo Preflight` | Runs build gates and then seeds Medplum |
| `14Y: Start Development Server` | Starts Next.js at `http://localhost:3000` |
| `14Y: Docker Build` | Builds the local production image |
| `14Y: Docker Run` | Runs the image with `.env.local` |

The seed and preflight tasks require a complete `.env.local`.

## 6. Run and debug

Open **Run and Debug** and select one of the committed configurations.

### Debug Next.js Full Stack

```text
14Y: Debug Next.js Full Stack
```

This starts `npm run dev`, waits for the local URL, opens Chrome through the built-in JavaScript debugger, and supports server-side and browser breakpoints.

### Debug the seed script

```text
14Y: Debug Seed Script
```

This launches `npm run seed` with `.env.local`. Use only synthetic credentials.

### Debug the current Vitest file

Open a `*.test.ts` file and run:

```text
14Y: Debug Current Vitest File
```

The dependency tree must already be installed.

## 7. Docker build from VS Code

Run:

```text
Tasks: Run Task
→ 14Y: Docker Build
```

Then run:

```text
Tasks: Run Task
→ 14Y: Docker Run
```

Verify:

```bash
curl --fail http://localhost:3000/api/health
```

## 8. AWS build and deployment from VS Code

Available tasks:

- `14Y: AWS Install CDK Dependencies`;
- `14Y: AWS Build CDK`;
- `14Y: AWS CDK Synth`;
- `14Y: AWS Deploy`.

Before launching AWS synth or deploy, start VS Code from a shell that has the required AWS and CDK environment:

```bash
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION="$AWS_REGION"
export MEDPLUM_SECRET_ARN=<secret-arn>
export PRIVATE_TASKS=false
code 14y-pa-readiness-agent.code-workspace
```

VS Code tasks inherit the environment of the VS Code process. The integrated terminal environment alone does not retroactively change the environment of already-running task hosts.

Do not place `MEDPLUM_SECRET_ARN`, client secrets, or AWS credentials in committed task definitions.

Follow [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md) for secret creation, verification, and teardown.

## 9. Recommended workflow

```text
Install Dependencies
→ Build and Verify
→ Seed Synthetic Medplum Data
→ Debug Next.js Full Stack
→ Execute primary demo flow
→ Docker Build
→ AWS CDK Synth
→ AWS Deploy
```

## 10. Troubleshooting

### Build task cannot find TypeScript, Vitest, or Next.js

Run `14Y: Install Dependencies` and confirm `node_modules` exists.

### Build task uses the wrong Node version

VS Code tasks use the Node executable visible to the VS Code process. Activate Node 22.18.0 or newer before launching VS Code, then reopen the workspace.

### Seed task reports missing variables

Create `.env.local`, populate the Medplum client credentials, and restart the task.

### Debugger opens but breakpoints remain unbound

Confirm the application was started with `14Y: Debug Next.js Full Stack`, not only with a detached terminal command. Also confirm source maps were generated by the active development server.

### AWS task reports a missing secret ARN

Restart VS Code from a terminal where `MEDPLUM_SECRET_ARN` is exported, or run the deployment script directly in a configured terminal.

### Windows shell compatibility

The local npm, test, build, seed, Docker, and debugger tasks are cross-platform. The AWS deploy and destroy scripts are Bash scripts; use WSL, Git Bash, or run the CDK commands directly on Windows.
