const path = require('path');
const fs = require('fs');
const pluginTester = require('babel-plugin-tester');
const babelPluginMacros = require('babel-plugin-macros');

const testLines = (title, error, src) =>
  src
    .trim()
    .split('\n')
    .map((code, i) => ({
      code: `import Routes from '../../macro';\n${code};`,
      babelOptions: {
        cwd: path.join(__dirname, 'server'),
        filename: path.join(__dirname, `server/__fake__.js`)
      },
      title,
      snapshot: false,
      error
    }));

const fixturesDir = path.resolve(__dirname, 'fixtures');

pluginTester.default({
  plugin: babelPluginMacros,
  pluginOptions: {
    railsRoutesMacro: {
      host: 'http://example.com',
      cache: false
    }
  },
  snapshot: true,
  babelOptions: {
    cwd: path.join(__dirname, 'server')
  },
  fixtures: path.join(__dirname, 'fixtures'),
  tests: [
    ...testLines(
      'Should throw "Route not found"',
      /Route not found/,
      `
  Routes.dne_thingy_path();
  Routes.dne_thingy_url();
  `
    ),
    ...testLines(
      'Should throw "Format not supported"',
      /Format not supported/,
      `
  Routes.thing_path;
  Routes['thing_url']();
  `
    )
  ]
});
