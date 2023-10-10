import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
// import typescript from '@rollup/plugin-typescript';
import path from 'path';
// import { typescriptPaths } from 'rollup-plugin-typescript-paths';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    tsconfigPaths(),
  ],
  resolve: {
    alias: [
      {
        find: '@sefaris/core',
        replacement: path.resolve(__dirname, './src/core/index.ts'),
      },
      {
        find: '@sefaris/shared',
        replacement: path.resolve(__dirname, './src/shared/index.ts'),
      },
      {
        find: '@sefaris/utilities',
        replacement: path.resolve(__dirname, './src/utilities/index.ts'),
      },
    ],
  },
  build: {
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: 'sefaris',
      name: 'sefaris',
      formats: ['es', 'cjs'],
    },
  },
});
