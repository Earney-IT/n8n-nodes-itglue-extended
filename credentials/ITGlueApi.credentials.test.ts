import { ITGlueApi } from './ITGlueApi.credentials';

test('credential exposes region + apiKey and x-api-key auth', () => {
  const c = new ITGlueApi();
  expect(c.name).toBe('itglueApi');
  const names = c.properties.map(p => p.name);
  expect(names).toEqual(expect.arrayContaining(['region', 'apiKey']));
  expect(c.authenticate.properties.headers!['x-api-key']).toBe('={{$credentials.apiKey}}');
  expect(c.test.request.url).toBe('/organizations');
});
