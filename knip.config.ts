export default {
  entry: [
    'src/presentation/popup/index.tsx',
    'src/presentation/background/background.ts',
    'src/presentation/settings/settings.ts',
    'src/presentation/content/content.ts',
    'src/presentation/side-panel/side-panel.ts',
  ],
  ignore: ['dist/**', 'tests/**'],
};
