import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeDriveQueryValue } from '../api/google.mjs';

test('Google Drive search escapes quotes and backslashes', () => {
  assert.equal(escapeDriveQueryValue("owner's \\ report"), "owner\\'s \\\\ report");
});
