import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import builtins from 'rollup-plugin-node-builtins';

export default {
  input: "build/main/index.js",
  // todo: find a way to divide modules based on application
  //       customized config for each app? and one for the core?
  external: [ "jquery", "underscore", "d3", "sylvester"],
  output: {
    file: "static/js/app.js",
    format: "umd",
    name: "bcf",
    sourcemap: true,
    globals: {
      jquery: "$",
      underscore: "_",
      d3: "d3",
      sylvester: "sylvester"
    },
  },
  plugins: [
    builtins(),
    resolve({
      browser: true,
      // pass custom options to the resolve plugin
      customResolveOptions: {
        moduleDirectory: 'node_modules'
      }
    }),
    commonjs({
      namedExports: {
        "node_modules/ndarray-ops/ndarray-ops.js": ["sub", "add", "divseq"]
      }
    }),
    json()
  ]
};
