import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const external = ['video.js'];
const reactExternal = ['video.js', 'react'];
const globals = { 'video.js': 'videojs' };

const babelPlugin = babel({
  babelHelpers: 'bundled',
  exclude: 'node_modules/**'
});

export default [
  // UMD bundle (registers plugin globally)
  {
    input: 'src/js/index.js',
    output: [
      {
        file: 'build/videojs-annotation.js',
        format: 'umd',
        name: 'VideojsAnnotationComments',
        globals,
        sourcemap: true
      },
      {
        file: 'build/videojs-annotation.min.js',
        format: 'umd',
        name: 'VideojsAnnotationComments',
        globals,
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    external,
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin
    ]
  },
  // CJS bundle (for require() usage)
  {
    input: 'src/js/annotation_comments.js',
    output: [
      {
        file: 'build/videojs-annotation.cjs.js',
        format: 'cjs',
        exports: 'auto',
        sourcemap: true
      },
      {
        file: 'build/videojs-annotation.cjs.min.js',
        format: 'cjs',
        exports: 'auto',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    external,
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin
    ]
  },
  // ESM bundle (for tree-shaking)
  {
    input: 'src/js/annotation_comments.js',
    output: [
      {
        file: 'build/videojs-annotation.esm.js',
        format: 'es',
        sourcemap: true
      },
      {
        file: 'build/videojs-annotation.esm.min.js',
        format: 'es',
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    external,
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin
    ]
  },
  // React adapter (ESM only, react is external)
  {
    input: 'src/react.js',
    output: [
      {
        file: 'build/videojs-annotation-react.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external: reactExternal,
    plugins: [
      resolve(),
      commonjs(),
      babelPlugin
    ]
  }
];
