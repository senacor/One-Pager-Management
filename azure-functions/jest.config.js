module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ["**/test/**/*.test.ts"],
    moduleFileExtensions: ["ts", "js", "json", "node"],
    roots: ["<rootDir>/test"],
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }]
    },
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
    testTimeout: 5000 // 5 seconds
};
