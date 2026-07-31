module.exports = {
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }]
  }
};
