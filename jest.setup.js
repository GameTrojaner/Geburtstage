/**
 * Jest setup file - runs before any test files
 * Sets up React Native globals and other test environment requirements
 */

// Set React Native globals that are required by modules like expo-sqlite
global.__DEV__ = true;

// Mock TextEncoder/TextDecoder if needed (usually for crypto operations)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
