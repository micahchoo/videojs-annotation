import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const external = ['jquery', 'video.js'];
const globals = { jquery: 'jQuery', 'video.js': 'videojs' };

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
        file: 'build/videojs-annotation-comments.js',
        format: 'umd',
        name: 'VideojsAnnotationComments',
        globals,
        sourcemap: true
      },
      {
        file: 'build/videojs-annotation-comments.min.js',
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
        file: 'build/videojs-annotation-comments.cjs.js',
        format: 'cjs',
        exports: 'auto',
        sourcemap: true
      },
      {
        file: 'build/videojs-annotation-comments.cjs.min.js',
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
  }
];
