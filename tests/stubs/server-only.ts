/**
 * Stand-in for the `server-only` package under test.
 *
 * The real one throws on import to stop a server module reaching a client
 * bundle. That check belongs to the build; in a node test runner there is no
 * client bundle to protect, and letting it throw would mean the pure logic in
 * those modules could never be tested at all.
 */
export {};
