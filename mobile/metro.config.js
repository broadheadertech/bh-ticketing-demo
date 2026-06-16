// metro.config.js — lets the Expo app import the repo's Convex codegen
// ("../convex/_generated/api") that lives ABOVE this mobile/ project, and
// guarantees a single copy of react / react-native is bundled.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, ".."); // universal-ticketing-system/

const config = getDefaultConfig(projectRoot);

// 1. Watch the repo root so Metro picks up ../convex changes (hot reload).
config.watchFolders = [repoRoot];

// 2. Resolve modules from the app first, then the repo root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

// 3. Dedupe react / react-native to the app's copy so hooks don't break
//    when importing code from the repo root.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
};

module.exports = config;
