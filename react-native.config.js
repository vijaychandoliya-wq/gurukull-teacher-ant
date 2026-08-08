/**
 * Ant Design Mobile renders every icon from a font, not from SVG. The icon
 * package declares its fonts with the `dependency.assets` key, which the CLI
 * dropped — it warns "dependency.assets is not allowed" and links nothing, so
 * every icon in the app renders as a tofu box.
 *
 * Declaring the fonts here as project assets is what actually gets them into
 * the build. `npx react-native-asset` copies them into android/app/src/main/
 * assets/fonts and the iOS bundle; the Android copies are also committed so a
 * clean checkout builds correctly without that extra step.
 */
module.exports = {
  assets: ['./node_modules/@ant-design/icons-react-native/fonts/'],
};
