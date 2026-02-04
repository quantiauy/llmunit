# CLI Reference

The LLMUnit CLI is designed for speed and seamless integration into terminal-based workflows and CI/CD pipelines.

## Basic Usage

Run the CLI using Bun from the project root:

```bash
bun run test:cli <promptName>
```

Replace `<promptName>` with the name of the folder inside `tests/` that contains your prompt and test cases.

## Global Options

| Option | Description | Default |
| :--- | :--- | :--- |
| `-m, --model <model>` | Specify the LLM model to test | `openai/gpt-oss-safeguard-20b` |
| `-j, --judge <model>` | Specify the model to use as a judge | `openai/gpt-oss-safeguard-20b` |
| `-l, --list` | List all available prompts to test | - |
| `--help` | Show help information | - |

## Examples

### Run a specific test with defaults
```bash
bun run test:cli customer_service_bot
```

### Run with a custom model and judge
```bash
bun run test:cli code_reviewer -m anthropic/claude-3.5-sonnet -j openai/gpt-4o
```

## Integration into CI

You can integrate the CLI into your GitHub Actions or GitLab CI to ensure no prompt regressions are merged:

```yaml
# Example GitHub Action Step
- name: Run Prompt Tests
  run: bun run test:cli core_agent -m gpt-4o
```
