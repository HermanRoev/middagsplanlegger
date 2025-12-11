const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project root directory
const projectRoot = path.resolve(__dirname, '..');
const mobileRoot = __dirname;

const config = getDefaultConfig(mobileRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [projectRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(mobileRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
