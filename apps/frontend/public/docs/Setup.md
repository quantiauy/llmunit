# Setup

To get started with LLMUnit, you need to ensure your environment is properly configured.

## Prerequisites

- **Bun**: The toolkit for JavaScript and TypeScript.
- **Node.js**: Required for some dependencies.
- **Git**: For version control and cloning the repository.

## Bun configuration

### macOS / Linux

Install Bun with the official script:

```bash
curl -fsSL https://bun.sh/install | bash
```

Restart your terminal or run `source ~/.bashrc` (or `~/.zshrc`) so the `bun` command is available. Verify the installation:

```bash
bun --version
```

### Windows

Install Bun with PowerShell (run as Administrator if needed):

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Alternatively, you can use the Windows Subsystem for Linux (WSL) and follow the macOS/Linux instructions above.

After installation, restart your terminal and verify:

```powershell
bun --version
```

## OpenRouter API key

LLMUnit uses [OpenRouter](https://openrouter.ai/) to call LLM APIs. You need an API key to run tests.

### Steps to create and get your key

1. **Sign up**: Go to [https://openrouter.ai/](https://openrouter.ai/) and sign up or log in.
2. **Open keys**: In the dashboard, go to **Keys** (or [https://openrouter.ai/keys](https://openrouter.ai/keys)).
3. **Create a key**: Click **Create Key**, give it a name (e.g. "LLMUnit"), and create it.
4. **Copy the key**: Copy the key shown once (it starts with `sk-or-v1-...`). Store it somewhere safe; you won’t be able to see it again in full.
5. **Use it in LLMUnit**: Put the key in your `.env` file as `OPENROUTER_API_KEY` (see [Environment variables](#environment-variables) below).

You can add credits in the OpenRouter dashboard if you want to use paid models.

## Environment Variables

Create a `.env` file in the **project root** (same folder as `package.json`) with at least these variables. Replace `your_openrouter_api_key` with your real OpenRouter API key.

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
