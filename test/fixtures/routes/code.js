const { Routes } = require('../../../macro');

test('static path', () => {
  expect(Routes.things_path()).toBe('/things');

  expect(Routes.things_url()).toBe('http://example.com/things');
});

test('url anchors', () => {
  expect(Routes.things_path({ anchor: 'hello' })).toBe('/things#hello');
  expect(Routes.things_path({ anchor: '' })).toBe('/things#');
  expect(Routes.things_path({ anchor: [] })).toBe('/things#');
  expect(Routes.things_path({ anchor: {} })).toBe('/things#');
  // sanity check that 'qs' lib works
  expect(
    Routes.things_path({
      anchor: { wow: { foo: ['bar', 'buzz'], cats: 'garfield' } },
    })
  ).toBe(
    '/things#wow%5Bcats%5D=garfield&wow%5Bfoo%5D%5B%5D=bar&wow%5Bfoo%5D%5B%5D=buzz'
  );
  expect(Routes.things_path({ anchor: 123, other: 456 })).toBe(
    '/things?other=456#123'
  );
  expect(Routes.things_path({ anchor: 'cool/beans' })).toBe(
    '/things#cool%2Fbeans'
  );
  expect(Routes.things_path({ anchor: null })).toBe('/things');
  expect(Routes.things_path({ anchor: false })).toBe('/things');
  expect(Routes.things_path({ anchor: true })).toBe('/things#true');
});

test('custom host', () => {
  expect(Routes.things_url({ host: 'http://fizzbuzz.com' })).toBe(
    'http://fizzbuzz.com/things'
  );
  expect(Routes.things_path({ host: 'http://fizzbuzz.com' })).toBe('/things');
});

test('format param', () => {
  expect(Routes.things_path({ format: 'json' })).toBe('/things.json');

  expect(Routes.things_path({ format: '' })).toBe('/things');
  expect(Routes.things_path({ format: null })).toBe('/things');
  expect(Routes.things_path({ format: true })).toBe('/things');
  expect(Routes.things_path({ format: [] })).toBe('/things');
  expect(Routes.things_path({ format: {} })).toBe('/things');
});

test('required parameters', () => {
  expect(Routes.thing_path({ id: 'wow', some: 'query' })).toBe(
    '/thing/wow?some=query'
  );

  expect(() => Routes.thing_path()).toThrow(/Missing required parameter/);
  expect(() => Routes.thing_path({})).toThrow(/Missing required parameter/);
  expect(() => Routes.thing_path({ id: {} })).toThrow(
    /Missing required parameter/
  );

  expect(() => Routes.thing_path({ some: 'query' })).toThrow(
    /Missing required parameter/
  );

  expect(() => Routes.thing_path({ id: null })).toThrow(
    /Missing required parameter/
  );
  expect(() => Routes.thing_path(null)).toThrow(/Missing required parameter/);

  expect(() => Routes.thing_path({ id: false })).toThrow(
    /Missing required parameter/
  );
  expect(() => Routes.thing_path(false)).toThrow(/Missing required parameter/);

  expect(() => Routes.thing_path({ id: [] })).toThrow(
    /Missing required parameter/
  );
  expect(() => Routes.thing_path([])).toThrow(/Missing required parameter/);

  expect(() => Routes.thing_path({ id: '' })).toThrow(
    /Missing required parameter/
  );
  expect(() => Routes.thing_path('')).toThrow(/Missing required parameter/);

  expect(Routes.thing_path(true)).toBe('/thing/true');
  expect(Routes.thing_path({ id: true })).toBe('/thing/true');
});

test('optional static parts', () => {
  expect(Routes.thingy_path({ id: 'wow', some: 'query' })).toBe(
    '/thing/thingy/wow?some=query'
  );
});

test('optional parameters', () => {
  expect(() => Routes.foo_bar_path()).toThrow(/Missing required parameter/);

  expect(Routes.foo_bar_path({ bar: 'hello' })).toBe('/foo/hello');

  expect(Routes.foo_bar_path({ bar: 'hello', fizz: 'abc' })).toBe(
    '/foo/hello?fizz=abc'
  );

  expect(Routes.foo_bar_path({ bar: 'hello', buzz: 123 })).toBe(
    '/foo/hello?buzz=123'
  );
  expect(Routes.foo_bar_path({ bar: 'hello', fizz: 'abc', buzz: 123 })).toBe(
    '/foo/hello/abc/123'
  );
});

test('escaped parameters', () => {
  expect(Routes.thing_path({ id: 'escape/me', other: 'me/too' })).toBe(
    '/thing/escape%2Fme?other=me%2Ftoo'
  );

  // Rails accidentally encodes these named params, but we will
  // just treat them as empty string
  expect(() =>
    Routes.thing_path({
      id: { foo: ['bar', 'buzz'], cats: 'garfield' },
    })
  ).toThrow(/Missing required parameter/);
  expect(() =>
    Routes.thing_path({ id: ['bar', { foo: 'buzz', wow: 123 }] })
  ).toThrow(/Missing required parameter/);

  // sanity check normal usage of 'qs' lib
  expect(
    Routes.things_path({
      wow: { foo: ['bar', 'buzz'], cats: 'garfield' },
    })
  ).toBe(
    '/things?wow%5Bcats%5D=garfield&wow%5Bfoo%5D%5B%5D=bar&wow%5Bfoo%5D%5B%5D=buzz'
  );
});

test('nested optional parameters', () => {
  expect(() => Routes.foo_bark_path()).toThrow(/Missing required parameter/);
  expect(Routes.foo_bark_path({ bar: 'hello' })).toBe('/foo/hello');
  expect(Routes.foo_bark_path({ bar: 'hello', fizz: 'abc' })).toBe(
    '/foo/hello?fizz=abc'
  );
  expect(Routes.foo_bark_path({ bar: 'hello', buzz: 123 })).toBe(
    '/foo/hello/123'
  );
  expect(Routes.foo_bark_path({ bar: 'hello', fizz: 'abc', buzz: 123 })).toBe(
    '/foo/hello/bark/abc/123'
  );
});

test('glob patterns', () => {
  expect(Routes.wild_a_path()).toBe('/wild');
  expect(Routes.wild_b_path()).toBe('/wild');
  expect(() => Routes.wild_c_path()).toThrow(/Missing required parameter/);

  expect(Routes.wild_a_path({ blob: 'foo/bar' })).toBe('/wild/foo/bar');
  expect(Routes.wild_a_path({ blob: '/foo/bar/' })).toBe('/wild/foo/bar');
});
