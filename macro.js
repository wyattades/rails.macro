const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const findCacheDir = require('find-cache-dir');
const { createMacro, MacroError } = require('babel-plugin-macros');
const importsHelpers = require('@babel/helper-module-imports');

const PACKAGE_NAME = 'rails.macro';

const ROUTES_LIB_PATH =
  process.env.BABEL_ENV === 'test'
    ? path.resolve(__dirname, 'lib/routes.js')
    : `${PACKAGE_NAME}/lib/routes.js`;

const info = (...args) => console.log(`> ${PACKAGE_NAME}:`, ...args);

const getMTime = (filePath) => {
  try {
    return fs.statSync(filePath).mtime;
  } catch (_) {
    return null;
  }
};

// only run's `generateFn` to create a file if any of the modification times
// of `watchFiles` are sooner than that of `outputFile`, or if `outputFile` DNE
const memoGenerateFile = (watchFiles, outputFile, generateFn) => {
  if (!watchFiles || watchFiles.length === 0 || !outputFile)
    return generateFn();

  const outputTime = getMTime(outputFile);
  if (
    outputTime &&
    watchFiles.find((watchFile) => getMTime(watchFile) > outputTime)
  )
    return fs.readFileSync(outputFile, 'utf8');

  const outputRaw = generateFn();
  fs.writeFileSync(outputFile, outputRaw, 'utf8');

  return outputRaw;
};

let cacheDir;
const getCachePath = (filename) => {
  if (!cacheDir) cacheDir = findCacheDir({ name: PACKAGE_NAME, create: true });

  return path.resolve(cacheDir, filename);
};

const DEFAULT_WATCH_FILES = ['config/routes.rb'];

const loadRoutes = (config, cwd) => {
  let rawJson;

  if (config.preparsedRoutes) {
    const preparsedRoutes = path.resolve(cwd, config.preparsedRoutes);

    try {
      rawJson = fs.readFileSync(preparsedRoutes, 'utf8');
    } catch (err) {
      console.error(`Failed to load routes file ${preparsedRoutes}:`);
      throw err;
    }
  } else {
    const railsDir = config.railsDir || cwd;

    const useCache = config.cache !== false;

    // TODO: implement file watching for development to rerun parser automatically when `watchFiles` changes
    const watchFiles =
      useCache &&
      (Array.isArray(config.watchFiles)
        ? config.watchFiles
        : DEFAULT_WATCH_FILES
      ).map((watchFile) => path.resolve(railsDir, watchFile));

    const cacheFile = useCache && getCachePath('routes_cache.json');

    rawJson = memoGenerateFile(watchFiles, cacheFile, () => {
      info('Reloading Rails routes...');
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
    });
  }

  try {
    const res = JSON.parse(rawJson);

    if (res && typeof res === 'object') {
      info('Loaded Rails routes.');
      return res;
    }

    throw new Error('Failed to parse routes: Invalid JSON object');
  } catch (err) {
    console.error('Failed to parse routes:');
    throw err;
  }
};

const objSlice = (obj, keys) => {
  const sliced = {};
  for (const key of keys) sliced[key] = obj[key];
  return sliced;
};

// We store all routes in the babel-loader process' memory.
let routes;

module.exports = createMacro(
  function railsMacro({ references, state, babel, config = {} }) {
    if (!routes) routes = loadRoutes(config, state.cwd);

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
    const routesLibIdent = importsHelpers.addNamespace(
      routesReferences[0],
      ROUTES_LIB_PATH,
      { nameHint: 'RailsMacroRoutes' }
    );

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
