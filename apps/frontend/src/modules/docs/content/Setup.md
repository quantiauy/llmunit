# Setup

To get started with LLMUnit, you need to ensure your environment is properly configured.

## Prerequisites

- **Bun**: The toolkit for JavaScript and TypeScript.
- **Node.js**: Required for some dependencies.
- **Git**: For version control and cloning the repository.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DATABASE_URL="file:./dev.db"
```

## Initial Setup

Run the following commands to install dependencies and setup the database:

```bash
bun install
bun run db:generate
bun run db:push
```
