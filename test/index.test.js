const path = require('path');
const fs = require('fs');
const pluginTester = require('babel-plugin-tester');
const babelPluginMacros = require('babel-plugin-macros');

const testLines = (title, error, ...sources) =>
  sources.map((code, i) => ({
    code: `import { Routes } from '../../macro';\n${code};`,
    babelOptions: {
      cwd: path.join(__dirname, 'server'),
      filename: path.join(__dirname, `server/__fake__.js`),
    },
    title: `${title} - #${i + 1}`,
    snapshot: false,
    error,
  }));

pluginTester.default({
  plugin: babelPluginMacros,
  pluginOptions: {
    railsMacro: {
      host: 'http://example.com',
      cache: false, // disable cache for tests
    },
  },
  snapshot: true,
  babelOptions: {
    sourceType: 'unambiguous',
    cwd: path.join(__dirname, 'server'),
  },
  fixtures: path.join(__dirname, 'fixtures'),
  tests: [
    ...testLines(
      'Should throw "Route name not found"',
      /Route name not found/,
      'Routes.dne_thingy_path();',
      'Routes.dne_thingy_url();'
    ),
    ...testLines(
      'Should throw "Format not supported"',
      /Format not supported/,
      'Routes.thing_path;',
      "Routes['thing_url']();"
    ),
  ],
});
