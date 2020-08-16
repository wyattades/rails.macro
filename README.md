# rails.macro

> Allow JavaScript code to access the Rails named routes in `config/routes.rb`

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
2. Provide a global `host` option in the `railsMacro` [global config](#Config).
3. As a fallback, `window.location.origin` is used if `window` is defined when the url method is called at runtime.

If none of these options are available, an error is thrown when the url method is called at runtime.

### More Examples

[See Jest tests for in-depth examples](./test/index.test.js)

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

| Name     | Default         | Description                                                                           |
| -------- | --------------- | ------------------------------------------------------------------------------------- |
| host     | `undefined`     | Default url host used by `Routes.<routeName>_url` methods e.g. https://example.com    |
| railsDir | `process.cwd()` | Path to the rails project directory you want to read routes from                      |
| cache    | `true`          | Cache the parsed `routes.rb` results in the filesystem to speed up consecutive builds |

## Re-evaluating on change

For now, you must restart your dev-server if you change the Rails routes in `config/routes.rb`. A `watch` option may be considered in the future.

## Disclaimer

This library has only been tested with Rails 6.0.3 and uses internal Rails APIs that are subject to change.

This library allows you to expose Rails route definitions to frontend code, which may create potential security concerns if you rely on route secrecy.

⚠️ Use in production at your own risk! ⚠️

## License

[MIT](./LICENSE)
