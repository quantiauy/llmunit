import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { SettingsService } from "../src/modules/settings/settings.service";
import { readFileSync } from "fs";
import { join } from "path";

describe("SettingsService", () => {
  let service: SettingsService;
  const rootDir = join(import.meta.dir, "../../../");
  const envFile = ".env.test";

  beforeAll(() => {
    service = new SettingsService();
  });

  test("should get settings with defaults", () => {
    const settings = service.getSettings();
    expect(settings).toBeDefined();
    expect(settings.DEFAULT_MODEL).toBeDefined();
  });

  test("should update settings and sync files", async () => {
    const testModel = "test/model-123";
    await service.updateSettings({ DEFAULT_MODEL: testModel });

    const settings = service.getSettings();
    expect(settings.DEFAULT_MODEL).toBe(testModel);

    // Verify file content
    const envPath = join(rootDir, envFile);
    const content = readFileSync(envPath, "utf8");
    expect(content).toContain(`DEFAULT_MODEL=${testModel}`);
  });

  afterAll(() => {
    // Cleanup is handled by posttest script
  });
});
