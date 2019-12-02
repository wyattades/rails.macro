# rails-routes-macro

Utilizes `babel-plugin-macros` to allow frontend code to access route paths from `config/routes.rb`

Example:
```js
import Routes from 'rails-routes/macro';

const myPath = Routes.my_cool_thing_path({ thing_id: '1234', some: 'query' });
```
transforms to:
```js
Routes.registerRoutes({ my_cool_thing: {...} });

const myPath = Routes.getPath('my_cool_thing', { thing_id: '1234', some: 'query' });
```

Which resolves to something like: `/my_cool_thing/1234?some=query`
