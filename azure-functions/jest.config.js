module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ["**/test/**/*.test.ts"],
    moduleFileExtensions: ["ts", "js", "json", "node"],
    roots: ["<rootDir>/test"],
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
        "^.+\\.js$": "babel-jest"
    },
    transformIgnorePatterns: [
        "node_modules/(?!(franc-min|trigram-utils|n-gram|collapse-white-space)/)"
    ],
    reporters: [
        "default",
        ["jest-junit", {
            outputDirectory: "reports",
            outputName: "jest-junit.xml",
            suiteName: "jest tests",
            classNameTemplate: "{classname}-{title}",
            titleTemplate: "{title}",
            ancestorSeparator: " › ",
            usePathForSuiteName: "true"
        }]
    ],
    testTimeout: 50000
};
