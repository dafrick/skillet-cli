import { describe, it } from 'vitest';

describe('manifest (.skill-manifest.json)', () => {
  it.todo(
    'all required fields are present: name, description, source, declaredVersion, contentHash, renderHash, postInstallHash, adapterId, scope, libVersion, installedAt',
  );
  it.todo('installedAt is a valid ISO 8601 UTC string');
  it.todo('postInstallHash matches re-hash of installed folder excluding .skill-manifest.json');
  it.todo('contentHash has sha256: prefix followed by 64-char lowercase hex digest');
});
