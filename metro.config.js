const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Add resolver options to help with the SHA-1 issue
    extraNodeModules: new Proxy({}, {
      get: (target, name) => {
        return path.join(process.cwd(), `node_modules/${name}`);
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
