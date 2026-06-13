/** @type {import('jest').Config} */
const config = {
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: {
                    // ts-jest needs CommonJS output — override Next.js ESM settings
                    module: "commonjs",
                    moduleResolution: "node",
                    jsx: "react-jsx",
                    esModuleInterop: true,
                },
            },
        ],
    },
    testMatch: ["**/__tests__/**/*.(ts|tsx)"],
}

module.exports = config
