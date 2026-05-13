export default {
  entry: [
    // App entry points
    'src/presentation/popup/index.tsx',
    'src/presentation/background/background.ts',
    'src/presentation/settings/settings.ts',
    'src/presentation/content/content.ts',
    'src/presentation/side-panel/side-panel.ts',
    // Test files — trace imports so exported symbols used only in tests are not flagged
    'tests/**/*.ts',
    'tests/**/*.tsx',
    // Public API modules — all exports are intentional
    'src/domain/template/index.ts',
    'src/presentation/components/ui/button.tsx',
    'src/presentation/components/ui/tabs.tsx',
    'src/presentation/components/ui/select.tsx',
    'src/presentation/components/ui/card.tsx',
  ],
  ignore: ['dist/**'],
  ignoreDependencies: [
    '@fontsource-variable/geist',
    '@formatjs/intl',
    '@microsoft/eslint-formatter-sarif',
    '@testing-library/jest-dom',
    '@types/chrome',
    '@types/dompurify',
    'lint-staged',
    'eslint-formatter-',
  ],
  ignoreBinaries: ['rollup-plugin-visualizer'],
  rules: {
    types: 'off',
  },
};
