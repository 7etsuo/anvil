/**
 * Node-only project services. Kept out of the browser-facing core barrel so
 * authoring, filesystem, and test-runner dependencies never enter game builds.
 */
export { validateProject } from "./validate.js";
export type { TestOpts, TestReport } from "./test/runTests.js";
export { runTests } from "./test/runTests.js";
