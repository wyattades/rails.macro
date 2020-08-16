const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const findCacheDir = require('find-cache-dir');
const { createMacro, MacroError } = require('babel-plugin-macros');
const importsHelpers = require('@babel/helper-module-imports');

const ROUTES_LIB_PATH =
  process.env.BABEL_ENV === 'test'
    ? path.resolve(__dirname, 'routes.js')
    : 'rails.macro/routes.js';

const CACHE_DIR = findCacheDir({ name: 'rails.macro' });

// only run's `generateFn` to create a file if the modification time
// of `outputFile` is less than that of `watchFile` (or `outputFile` DNE)
const memoGenerateFile = (watchFile, outputFile, generateFn, noCache) => {
  if (noCache) return generateFn();

  const inputStat = fs.statSync(watchFile);
  let outputStat;
  try {
    outputStat = fs.statSync(outputFile);
  } catch (_) {}

  if (outputStat && inputStat.mtime < outputStat.mtime)
    return fs.readFileSync(outputFile, 'utf8');

  const outputRaw = generateFn();
  fs.writeFileSync(outputFile, outputRaw, 'utf8');

  return outputRaw;
};

// We store all routes in the babel-loader process' memory.
// TODO: implement file watching to rerun this automatically
let routes;
const loadRoutes = (railsDir, noCache) => {
  if (routes) return;

  const rawJson = memoGenerateFile(
    path.resolve(railsDir, 'config/routes.rb'),
    path.resolve(CACHE_DIR, 'routes_export.json'),
    () => {
      console.log('Reloading rails routes...');
      try {
        return execSync(
          `bundle exec rails runner ${path.resolve(
            __dirname,
            'get_routes.rb'
          )}`,
          {
            cwd: railsDir,
          }
        )
          .toString()
          .trim();
      } catch (err) {
        console.error('Failed to load Rails routes!');
        throw err;
      }
    },
    noCache
  );

  routes = JSON.parse(rawJson);
  console.log('Loaded rails routes.');
};

const objSlice = (obj, keys) => {
  const sliced = {};
  for (const key of keys) sliced[key] = obj[key];
  return sliced;
};

module.exports = createMacro(
  function railsMacro({ references, state, babel, config = {} }) {
    loadRoutes(config.railsDir || state.cwd, config.cache === false);

    const T = babel.types;

    for (const key in references) {
      if (key !== 'Routes')
        throw new MacroError(
          `Unsupported named import '${key}'. Only 'Routes' is available`
        );
    }

    const routesReferences = references.Routes || [];
    if (routesReferences.length === 0) return;

    // Add a default import for our Routes helper module
    const routesLibIdent = importsHelpers.addDefault(
      routesReferences[0],
      ROUTES_LIB_PATH,
      { nameHint: 'RailsMacroRoutes' }
    );
    console.log(routesLibIdent);

    const routesToRegister = new Set();

    for (const referencePath of routesReferences) {
      // Sanity checks that the user is calling our method correctly
      if (
        !(
          referencePath.parent.type === 'MemberExpression' &&
          referencePath.parent.property.type === 'Identifier' &&
          referencePath.parent.object.type === 'Identifier' &&
          referencePath.parentPath.parent &&
          referencePath.parentPath.parent.type === 'CallExpression'
        )
      )
        throw new MacroError(
          `Format not supported: \`${referencePath
            .findParent(T.isExpression)
            .getSource()}\`. Must be in the form \`Routes.my_thing_path(anything)\``
        );

      const routeMethodName = referencePath.parent.property.name;
      const match = routeMethodName.match(/^(\w+)_(path|url)$/);
      if (!match)
        throw new MacroError(
          `Route method name must match '<routeName>_path' or '<routeName>_url', got '${routeMethodName}'`
        );
      const [, routeName, urlType] = match;

      if (!(routeName in routes))
        throw new MacroError(`Route name not found: ${routeName}`);

      // The code below performs the actual transformations
      // e.g. Replace `Routes.my_thing_path({ some: 'params' })` with `RailsMacroRoutes.getPath('my_thing', { some: 'params' })`

      referencePath.parentPath.get('object').replaceWith(routesLibIdent);

      referencePath.parentPath
        .get('property')
        .replaceWith(T.identifier(urlType === 'path' ? 'getPath' : 'getUrl'));

      const args = referencePath.parentPath.parentPath.node.arguments;
      args.unshift(T.stringLiteral(routeName));

      routesToRegister.add(routeName);
    }

    if (routesToRegister.size === 0) return;

    // We also need to call our helper method `registerRoutes` to initialize
    // each of the routes we use. This let's us declare a route's AST
    // once at the root of the source file so we aren't declaring a bunch
    // of new objects every time we call .getPath or .getUrl
    const registerRoutesNode = babel.template(
      `MODULE.registerRoutes(ROUTES, { host: HOST });`
    )({
      MODULE: routesLibIdent,
      ROUTES: T.valueToNode(objSlice(routes, routesToRegister)),
      HOST: config.host ? T.stringLiteral(config.host) : T.nullLiteral(),
    });

    // add it to the top of the file
    // NOTE: I think Babel is smart and puts it after the imports, but :shrug:
    state.file.path.unshiftContainer('body', registerRoutesNode);
  },
  { configName: 'railsMacro' }
);
