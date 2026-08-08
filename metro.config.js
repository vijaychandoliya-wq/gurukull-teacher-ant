const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Plain-text Metro reporter.
 *
 * Metro's default TerminalReporter colourises output with `util.styleText`,
 * which only exists from Node 20.12. On older runtimes every Metro invocation —
 * including the release bundle step in the Gradle build — dies with
 * "_util.default.styleText is not a function" before it compiles anything.
 * Metro only ever calls `reporter.update(event)`, so a reporter that prints
 * uncoloured lines sidesteps that entirely while keeping build progress and
 * errors visible.
 */
const reporter = {
  update(event) {
    switch (event.type) {
      case 'bundle_build_started':
        console.log(`Metro: bundling ${event.bundleDetails?.entryFile ?? ''}`);
        break;
      case 'bundle_build_done':
        console.log('Metro: bundle complete');
        break;
      case 'bundle_build_failed':
        console.error('Metro: bundle FAILED');
        break;
      case 'bundling_error':
        console.error(`Metro error: ${event.error?.message ?? event.error}`);
        if (event.error?.stack) {
          console.error(event.error.stack);
        }
        break;
      case 'transform_cache_reset':
        console.log('Metro: transform cache reset');
        break;
      default:
        // Progress ticks and dep-graph chatter are noise in a CI-style log.
        break;
    }
  },
};

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {reporter};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
