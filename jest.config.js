module.exports = {
  preset: 'react-native',
  // Reanimated (pulled in by Ant's Collapse) reaches for native worklets at
  // import time. This resolver, shipped by the library, points those imports at
  // the non-native build so components can render under jest.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Ant Design Mobile and several of its dependencies ship untranspiled ESM,
  // so they have to go through Babel rather than being skipped as node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      [
        '(jest-)?react-native',
        '@react-native(-community)?',
        // Ant Design Mobile itself, then the dependencies of it that ship
        // untranspiled TS/JSX rather than a compiled build.
        '@ant-design',
        '@bang88',
        '@floating-ui',
        '@rc-component',
        'rc-field-form',
        'rc-util',
        'react-native-collapsible',
        'react-native-modal-popover',
        // React Native libraries this app depends on directly.
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-safe-area-context',
        'react-native-worklets',
      ].join('|') +
      ')/)',
  ],
};
