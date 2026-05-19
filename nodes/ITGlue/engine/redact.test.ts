import { redactSecrets, REDACTED } from './redact';
import { flattenResource } from './jsonapi';

test('redacts password / otp / *-password recursively, preserves other fields', () => {
  const out = redactSecrets([{ id: '1', password: 'p', 'otp-secret': 's', name: 'ok', child: { 'admin-password': 'q' } }]);
  expect(out).toEqual([{ id: '1', password: REDACTED, 'otp-secret': REDACTED, name: 'ok', child: { 'admin-password': REDACTED } }]);
});

test('non-secret object untouched', () => {
  expect(redactSecrets({ a: 1 })).toEqual({ a: 1 });
});

// --- Security-critical extra tests ---

test('bare key "otp" is redacted', () => {
  expect(redactSecrets({ otp: '123456', name: 'alice' })).toEqual({ otp: REDACTED, name: 'alice' });
});

test('bare key "password" is redacted', () => {
  expect(redactSecrets({ password: 'secret' })).toEqual({ password: REDACTED });
});

test('db_password is redacted', () => {
  expect(redactSecrets({ db_password: 'hunter2', host: 'localhost' })).toEqual({ db_password: REDACTED, host: 'localhost' });
});

test('one-time-password is redacted', () => {
  expect(redactSecrets({ 'one-time-password': 'abc', id: '5' })).toEqual({ 'one-time-password': REDACTED, id: '5' });
});

test('deep nesting — 3 levels', () => {
  const input = { a: { b: { password: 'deep', safe: 'yes' } } };
  expect(redactSecrets(input)).toEqual({ a: { b: { password: REDACTED, safe: 'yes' } } });
});

test('array of objects — each element redacted', () => {
  const input = [{ password: 'x' }, { name: 'bob', otp: '000' }];
  expect(redactSecrets(input)).toEqual([{ password: REDACTED }, { name: 'bob', otp: REDACTED }]);
});

test('null value under a secret key still becomes REDACTED', () => {
  expect(redactSecrets({ password: null })).toEqual({ password: REDACTED });
});

test('object value under a secret key still becomes REDACTED', () => {
  // The entire nested object is wiped, not recursed
  expect(redactSecrets({ password: { nested: 'data' } })).toEqual({ password: REDACTED });
});

test('array value under a secret key still becomes REDACTED', () => {
  expect(redactSecrets({ 'otp-secret': ['a', 'b'] })).toEqual({ 'otp-secret': REDACTED });
});

test('input is NOT mutated (purity)', () => {
  const original = { password: 'original', name: 'alice' };
  const cloned = { ...original };
  redactSecrets(original);
  expect(original).toEqual(cloned); // original unchanged
});

test('primitives pass through unchanged', () => {
  expect(redactSecrets('hello')).toBe('hello');
  expect(redactSecrets(42)).toBe(42);
  expect(redactSecrets(null)).toBe(null);
  expect(redactSecrets(undefined)).toBe(undefined);
  expect(redactSecrets(true)).toBe(true);
});

test('case-insensitive: PASSWORD, OTP are redacted', () => {
  expect(redactSecrets({ PASSWORD: 'x', OTP: 'y', Name: 'z' }))
    .toEqual({ PASSWORD: REDACTED, OTP: REDACTED, Name: 'z' });
});

test('otp_secret is redacted', () => {
  expect(redactSecrets({ otp_secret: 'totp', other: 1 })).toEqual({ otp_secret: REDACTED, other: 1 });
});

// --- Casing/separator-agnostic security contracts (post-flattenResource) ---

test('camelCase compound secrets ARE redacted (post-flattenResource shape)', () => {
  expect(redactSecrets({
    adminPassword: 'a', dbPassword: 'b', wifiPassword: 'c',
    otpSecret: 'd', oneTimePassword: 'e', passphrase: 'f',
  })).toEqual({
    adminPassword: REDACTED, dbPassword: REDACTED, wifiPassword: REDACTED,
    otpSecret: REDACTED, oneTimePassword: REDACTED, passphrase: REDACTED,
  });
});

test('password metadata fields are NOT redacted (handler needs them)', () => {
  expect(redactSecrets({
    passwordUpdatedAt: '2026-05-19T00:00:00Z',
    passwordCategoryId: '12', passwordCategoryName: 'VPN',
    passwordFolderId: '7', otpEnabled: true, name: 'VPN',
  })).toEqual({
    passwordUpdatedAt: '2026-05-19T00:00:00Z',
    passwordCategoryId: '12', passwordCategoryName: 'VPN',
    passwordFolderId: '7', otpEnabled: true, name: 'VPN',
  });
});

test('"passwords" relationship key is NOT redacted but bare "password" IS', () => {
  expect(redactSecrets({ password: 'x', relationships: { passwords: { data: [{ id: '1' }] } } }))
    .toEqual({ password: REDACTED, relationships: { passwords: { data: [{ id: '1' }] } } });
});

test('deep input is not mutated and a new reference is returned', () => {
  const input = { a: { b: { password: 'x' } } };
  const snap = JSON.parse(JSON.stringify(input));
  const out = redactSecrets(input);
  expect(input).toEqual(snap);
  expect(out).not.toBe(input);
  expect((out as any).a).not.toBe(input.a);
});

test('secrets survive the flattenResource -> redactSecrets pipeline', () => {
  const apiItem = { id: '3', type: 'passwords',
    attributes: { name: 'VPN', password: 'topsecret', 'otp-secret': 'TOTPSEED', 'admin-password': 'p', 'password-category-id': '9' } };
  const out = redactSecrets(flattenResource(apiItem));
  expect(out).toMatchObject({
    id: '3', type: 'passwords', name: 'VPN',
    password: REDACTED, otpSecret: REDACTED, adminPassword: REDACTED,
    passwordCategoryId: '9',
  });
});
