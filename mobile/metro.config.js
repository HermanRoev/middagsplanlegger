const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the root folder so we can import shared code
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages from the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies from the `node_modules`
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
