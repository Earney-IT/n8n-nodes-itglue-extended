import { redactSecrets, REDACTED } from './redact';

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
