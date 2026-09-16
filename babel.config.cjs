// Same Babel setup as the course's oo-model project.
// `.cjs` because package.json has "type": "module" and babel-jest loads config synchronously.
module.exports = {
    presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        '@babel/preset-typescript',
    ],
}
