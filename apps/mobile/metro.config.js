const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// drizzle-kit para Expo emite migraciones como .sql importados vía babel-plugin-inline-import.
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');

// @app-laburo/shared vive fuera de apps/mobile (dependencia "file:" hacia
// packages/shared, no es parte del workspace de pnpm) — Metro necesita saber
// que debe observar esa carpeta y resolver el symlink que npm crea para ella.
// OJO: acotado solo a packages/shared (no toda la raíz del monorepo) — mirar
// la raíz completa hacía que expo-router escaneara archivos de apps/backend y
// del propio packages/shared/src como si fueran rutas válidas de la app.
config.watchFolders = [path.resolve(workspaceRoot, 'packages/shared')];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')];
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
