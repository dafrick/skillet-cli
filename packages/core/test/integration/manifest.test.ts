import { describe, it } from 'vitest';

describe('manifest (.skill-meta.json)', () => {
  it.todo(
    'all required fields are present: name, source, sourceVersion, contentHash, renderHash, postInstallHash, adapterId, scope, installedAt',
  );
  it.todo('installedAt is a valid ISO 8601 UTC string');
  it.todo('postInstallHash matches re-hash of installed folder excluding .skill-meta.json');
  it.todo('contentHash has sha256: prefix followed by 64-char lowercase hex digest');
});
