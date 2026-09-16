// Jest setup matching the course's oo-model project (jest + babel-jest).
// `.cjs` because package.json has "type": "module".
module.exports = {
  testEnvironment: 'node',
  coverageProvider: 'v8',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Our sources use ESM-style `./card.js` imports (module: nodenext); map them back to the .ts files.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // Prefer .ts over any .js that `tsc` may have emitted next to the sources.
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'json', 'node'],
}
