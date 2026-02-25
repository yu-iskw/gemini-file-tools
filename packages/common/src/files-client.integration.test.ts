import { describe, expect, it } from 'vitest';

import { createGeminiFilesClient } from './index';

const apiKey = process.env.GEMINI_API_KEY?.trim();
const describeIntegration = apiKey ? describe : describe.skip;

describeIntegration('files-client integration', () => {
  const client = createGeminiFilesClient({ apiKey: apiKey ?? '' });

  it('lists files with live Gemini API', async () => {
    const result = await client.listFiles({ pageSize: 10 });

    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files.length).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('gets a file when at least one file exists', async () => {
    const list = await client.listFiles({ pageSize: 1 });
    const firstFile = list.files[0];

    if (!firstFile?.name) {
      return;
    }

    const file = await client.getFile({ name: firstFile.name });
    expect(file.name).toBe(firstFile.name);
  }, 30_000);
});
