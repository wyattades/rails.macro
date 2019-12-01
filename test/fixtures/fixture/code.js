import Routes from '../../../macro';

test('static path', () => {
  expect(Routes.things_path()).toBe('/things');

  expect(Routes.things_url()).toBe('http://example.com/things');
});

test('required parameters', () => {
  expect(Routes.thing_path({ id: 'wow', some: 'query' })).toBe(
    '/thing/wow?some=query'
  );

  expect(() => Routes.thing_path()).toThrow(/Missing required parameter/);

  expect(() => Routes.thing_path({ some: 'query' })).toThrow(
    /Missing required parameter/
  );

  expect(() => Routes.thing_url({ id: '', some: 'query' })).toThrow(
    /Missing required parameter/
  );
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
  expect(Routes.wild_a_path({ blob: '/foo/bar' })).toBe('/wild/foo/bar');
});
