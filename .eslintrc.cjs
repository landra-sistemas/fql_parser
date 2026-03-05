module.exports = {
    root: true,
    env: {
        es2022: true,
        node: true
    },
    extends: ["eslint:recommended", "prettier"],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    ignorePatterns: ["dist/", "coverage/", "tmp/", "node_modules/"],
    overrides: [
        {
            files: ["test/**/*.js"],
            env: {
                mocha: true,
                node: true
            }
        }
    ]
};
