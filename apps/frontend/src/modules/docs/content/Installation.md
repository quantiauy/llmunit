# Installation

This guide walks you through installing LLMUnit step by step. If you haven’t configured your environment yet (Bun, Node, Git, `.env`), complete [Setup](/docs/setup) first.

---

## Step 1: Clone the repository

Open a terminal, go to the folder where you want the project, and run:

```bash
git clone https://github.com/quantiauy/llmunit.git
cd llmunit
```

You should now be inside the project root (the `llmunit` folder).

---

## Step 2: Install dependencies

Install the project dependencies with Bun:

```bash
bun install
```

Wait until it finishes. If you see errors, check that [Bun is installed](/docs/setup#bun-configuration) and that you’re in the project root (`llmunit`).

---

## Step 3: Configure environment variables

Create a `.env` file in the project root (same folder as `package.json`) with at least:

```bash
# Database (Bun SQLite nativo)
DATABASE_URL="file:./prompt-testing.db"

# LLM
OPENROUTER_API_KEY=your_openrouter_api_key
DEFAULT_MODEL=openai/gpt-oss-safeguard-20b
DEFAULT_JUDGE_MODEL=openai/gpt-oss-safeguard-20b

# Server
PORT=3000
FRONTEND_PORT=5173
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

Replace `your_openrouter_api_key` with your real [OpenRouter API key](/docs/setup#openrouter-api-key). For the full list of variables, see [Setup — Environment Variables](/docs/setup#environment-variables).

---

## Step 4: Generate and set up the database

Generate the Prisma client and create the local database:

```bash
bun run db:generate
```

Then apply the schema to the database:

```bash
bun run db:push
```

If both commands finish without errors, the database is ready.

---

## Step 5: Run the application

Start the development environment (Backend, Frontend, and CLI):

```bash
bun run start
```

When it’s running you’ll have:

- **Backend API**: http://localhost:3000  
- **Frontend UI**: http://localhost:5173  
- **CLI**: use `bun run test:cli` from the project root when you need it

Open http://localhost:5173 in your browser to use the UI.

---

## 🛠️ Useful Developer Commands

Beyond the standard `start` command, here are the tools and scripts most useful for prompt developers:

### Prompt Testing (CLI)
Running tests directly in your terminal is often faster during iteration:
- **`bun run test:cli <promptName>`**: Run all test cases for a specific prompt.
- **`bun run test:cli <promptName> -m <model>`**: Force a specific model for the test run.
- **`bun run test:cli <promptName> -j <model>`**: Force a specific judge model.

### Full Verification
- **`bun run validate`**: The "Safe to Push" command. It builds the frontend and runs the entire test suite from scratch.
- **`bun run test:full`**: Performs a clean re-installation of dependencies and runs all tests in a fresh environment.

### Maintenance
- **`bun run check`**: Runs TypeScript type-checking across the entire monorepo.
- **`bun run clean`**: Deletes all `node_modules` in the project.
- **`bun run reset`**: Hard reset. Cleans all dependencies and re-installs them from scratch.
