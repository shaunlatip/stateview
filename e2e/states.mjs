// Interaction states for the runtime gate (`harden-check --prod` reads this via .harden.json "steps").
// Each state is reached at 1440 and 375 and scanned like a route: axe (scoped to the dialog if one
// is open), focus inside open dialogs, overflow, screenshot. Add one per dialog-with-errors,
// failed request, filled form or other state you can only reach by doing something.
//
// export default [
//   { name: "create-dialog-errors", route: "/", run: async (page) => {
//       await page.getByRole("button", { name: "New project" }).click();
//       await page.getByRole("button", { name: "Create" }).click();
//   } },
//   { name: "load-failed", route: "/", run: async (page) => {
//       await page.route("**/api/**", (r) => r.fulfill({ status: 500 }));
//       await page.reload();
//   } },
// ];

export default [];
