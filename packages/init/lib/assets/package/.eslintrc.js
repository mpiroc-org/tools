module.exports = {
    extends: [
        '@mpiroc-org'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
        tsconfigRootDir: __dirname
    }
}
