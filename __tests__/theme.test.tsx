import React from 'react';
import Renderer from 'react-test-renderer';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ThemeProvider,
  THEME_STORAGE_KEY,
  colorsDark,
  colorsLight,
  useAppTheme,
} from '../src/theme';
import { ThemePicker } from '../src/components/ThemePicker';

let mockDeviceScheme: 'light' | 'dark' = 'light';
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockDeviceScheme,
}));
function Preview() {
  const { colors, mode } = useAppTheme();
  return (
    <View testID="preview" style={{ backgroundColor: colors.background }}>
      <Text>{mode}</Text>
      <ThemePicker />
    </View>
  );
}
async function mount() {
  let tree: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <Preview />
      </ThemeProvider>,
    );
  });
  return tree!;
}
async function select(tree: Renderer.ReactTestRenderer, label: string) {
  await Renderer.act(async () => {
    tree.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          node.props.accessibilityLabel === label,
      )[0]
      .props.onPress();
  });
}
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockDeviceScheme = 'light';
});
test('theme selection changes rendered colors and survives remount', async () => {
  let tree = await mount();
  await select(tree, 'Dark theme');
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsDark.background);
  expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  await Renderer.act(async () => tree.unmount());
  tree = await mount();
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsDark.background);
  await select(tree, 'Light theme');
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsLight.background);
  await Renderer.act(async () => tree.unmount());
});
test('system mode follows device changes, while explicit light mode stays light', async () => {
  const tree = await mount();
  mockDeviceScheme = 'dark';
  await Renderer.act(async () =>
    tree.update(
      <ThemeProvider>
        <Preview />
      </ThemeProvider>,
    ),
  );
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsDark.background);
  await select(tree, 'Light theme');
  await Renderer.act(async () =>
    tree.update(
      <ThemeProvider>
        <Preview />
      </ThemeProvider>,
    ),
  );
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsLight.background);
  await Renderer.act(async () => tree.unmount());
});
test('a delayed saved preference cannot override a new user selection', async () => {
  let resolveStored!: (value: string | null) => void;
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveStored = resolve;
      }),
  );
  const tree = await mount();
  await select(tree, 'Dark theme');
  await Renderer.act(async () => resolveStored('light'));
  expect(
    tree.root.findByProps({ testID: 'preview' }).props.style.backgroundColor,
  ).toBe(colorsDark.background);
  await Renderer.act(async () => tree.unmount());
});
