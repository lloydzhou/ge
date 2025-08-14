import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      dir: 'esm',
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].js',
    },
    external: ['@antv/g-lite'],
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'esm',
        outDir: 'esm',
      }),
      isProduction && terser(),
    ],
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      dir: 'lib',
      format: 'cjs',
      sourcemap: true,
      entryFileNames: '[name].js',
    },
    external: ['@antv/g-lite'],
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'lib',
        outDir: 'lib',
      }),
      isProduction && terser(),
    ],
  },
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'GE',
      sourcemap: true,
      globals: {
        '@antv/g-lite': 'G',
      },
    },
    external: ['@antv/g-lite'],
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      isProduction && terser(),
    ],
  },
  // UMD minified build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'GE',
      sourcemap: true,
      globals: {
        '@antv/g-lite': 'G',
      },
    },
    external: ['@antv/g-lite'],
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
      }),
      terser(),
    ],
  },
];