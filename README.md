# rails.macro

> A babel macro to let JavaScript code access Ruby on Rails named routes

## Installation

Install [`babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros) (along with `rails.macro`) and add it to your babel config:

```bash
npm install --save-dev babel-plugin-macros rails.macro
```

**.babelrc**:

```json
{
  "plugins": ["macros"]
}
```

## Routes

Similar to Rails url helpers, `rails.macro` provides methods for each of your defined routes i.e. `<routeName>_path` and `<routeName>_url`. You can call them from the exported `Routes` object.

### Basic Usage

Given the Rails route `my_cool_thing`

**config/routes.rb**

```ruby
Rails.application.routes.draw do
  ...
  get 'my_cool_thing/:thing_id', as: :my_cool_thing
  ...
end
```

Access the path within your JavaScript code like:

```js
import { Routes } from 'rails.macro';

const myPath = Routes.my_cool_thing_path({ thing_id: 'abc123', some: 'query' });
// myPath === '/my_cool_thing/abc123?some=query'
```

### Absolute Urls

There are a few ways to define the url host when using the `<routeName>_url` methods. They are listed in priority order below:

1. Provide a `host` param to the url method. e.g.
   ```js
   Routes.my_cool_thing_url({
     thing_id: 'abc123',
     some: 'query',
     host: 'http://example.com',
   });
   // 'http://example.com/my_cool_thing/abc123?some=query'
   ```
2. Provide a global `host` option in the `railsMacro` [global config](#config).
3. As a fallback, `window.location.origin` is used if `window` is defined when the url method is called at runtime.

If none of these options are available, an error is thrown when the url method is called at runtime.

### More Examples

- `anchor` is a reserved parameter that appends a url hash
  ```js
  // Given Rails route definition: `get '/foo', as: :foo`
  Rails.foo_path({ anchor: 'buzz', wow: 123 });
  // Creates the string: /foo?wow=123#buzz
  ```
- You can also pass a string or number as the first argument if the route has an `:id` param
  ```js
  // Given Rails route definition: `get '/bar/:id', as: :bar`
  Rails.bar_path('buzz');
  // Creates the string: /bar/buzz
  ```

[See Jest tests for in-depth examples](./test/fixtures/routes/code.js)

### How it works

At build-time, your `config/routes.rb` file is parsed with <code>bundle exec rails runner [get_routes.rb](./get_routes.rb)</code>, and the route methods called in your JavaScript source code are transformed from:

```js
import { Routes } from 'rails.macro';
Routes.my_thing_path({ ...stuff });
Routes.my_thing_url({ ...stuff });
```

to something like:

```js
import RailsMacroRoutes from 'rails.macro/routes';
RailsMacroRoutes.registerRoutes({
  my_thing: {
    /* AST used to construct this route */
  },
});
RailsMacroRoutes.getPath('my_thing', { ...stuff });
RailsMacroRoutes.getUrl('my_thing', { ...stuff });
```

As you can see, only the route definitions needed in that specific file are provided in the resulting code. However, this means that if you use the same route in multiple files, that route definition code will be duplicated in each file.

The [qs](https://github.com/ljharb/qs) lib is used to encode queries, and tries to replicate Rails' `to_query` as closely as possible.

## Config

You can configure `rails.macro` by providing options to the
`babel-plugin-macros` config, under the namespace `railsMacro`:

**.babelrc**

```json
{
  "plugins": [
    ["macros", {
      "railsMacro": {
        ...
      }
    }]
  ]
}
```

### Config Options

| Name            | Default Value          | Description                                                                                                       |
| --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| host            | `undefined`            | Default url host used by `Routes.<routeName>_url` methods e.g. https://example.com                                |
| railsDir        | `process.cwd()`        | Path to the rails project directory you want to read routes from                                                  |
| cache           | `true`                 | Cache the parsed `routes.rb` results in the filesystem to speed up consecutive builds                             |
| watchFiles      | `['config/routes.rb']` | These files' modification times will be used to determine if we need to regenerate the routes when we start babel |
| preparsedRoutes | `undefined`            | Path to a preparsed routes json file. [More info](#pre-parsing-rails-routes)                                      |

## Pre-parsing Rails routes

If you're using `thread-loader` with `babel-loader`, `rails.macro` will try to parse and cache `config/routes.rb` in each thread, which might lead to undesirable results.

To avoid this, run `npx rails.macro preparse_routes > parsed_routes.json` before running babel/webpack, and set the config option `preparsedRoutes: './parsed_routes.json'`.

## Re-evaluating on change

For now, you must restart your dev-server if you change the Rails routes in `config/routes.rb`. A `watch` option may be considered in the future.

## Disclaimer

This library doesn't implement all Rails features:

- Route `constraints`. Unfortunately, this lib can't respect constraints since they allow `proc`s
- Rails treats empty strings as valid values for named params, so they are not considered "missing" if the named param is required. Instead, this lib does treat empty strings as "missing" and may throw an error if the named param is required
- Rails routes do special encoding on Hash/Array named params e.g.
  ```ruby
  # Route definition:
  get 'foo/:bar', as: :foo
  # Call this route with a Hash/Array for `bar`
  foo_path(bar: ['bar', { foo: 'buzz', wow: 123 }])
  # => /foo/bar%2Ffoo=buzz&wow=123
  ```
  This lib will instead ignored named params with Hash/Array values.

This library has only been tested with Rails 6.0.3 and uses internal Rails APIs that are subject to change.

This library allows you to expose Rails route definitions to frontend code, which may create potential security concerns if you rely on route secrecy.

⚠️ Use in production at your own risk! ⚠️

## License

[MIT](./LICENSE)
