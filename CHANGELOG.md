# CHANGELOG

## npm-v1.0.0 - 2026-06-19
- ❌ **`bind-src` in loops:** Fixed an issue where `bind-src` does not work within a `for-each` context. ([#131](https://github.com/your-repo/issues/131))
- 🎨 **Dynamic CSS loading:** Resolved unexpected side effects caused by CSS files appending dynamically every time a Pelela page loads. ([#130](https://github.com/your-repo/issues/130))
- 🐦 **Self-closing tags layout break:** Fixed a bug where using a self-closing `<textarea ... />` (similar to the Twitter example) silently breaks the page layout. ([#132](https://github.com/your-repo/issues/132))
- 🚨 **Error screen:** Created a dedicated error screen for when PelelaJS fails to initialize or start up properly. ([#123](https://github.com/your-repo/issues/123))
- 🛡️ **Component validation:** Added validation to ensure components are not invoked outside the main `pelela` tag. ([#124](https://github.com/your-repo/issues/124))
- 📦 **Select option serialization:** Fixed serialization/deserialization limits so that `select` options are no longer strictly restricted to plain Java objects (POJOs). ([#128](https://github.com/your-repo/issues/128))

## npm-v0.7.1 - 2026-06-12
- 🐛 Fix vite-plugin-pelelajs not publishing with pelelajs

## npm-v0.7.0 - 2026-06-12
- 🪆 Component properties (props) are not reactive when nested #114
- 📍 Allow passing constants between components #115
- 🔗 for-each does not support nested attributes #113
- 🚀 Improvements to the CLI base example #110
- 🔀 Renaming a component must include the routes.ts file #112
- 🗺️ Allow navigating to a child component #117
- 🧱 Add an option so 'pelela new Component' can be added as <component> #119
- 🖼️ Add bind-src for img tags #121
- ⚙️ Add an initialize() mechanism for the view model #122
- 🚀 Task add changelog to release (#107)

## npm-v0.6.8 - 2026-05-28
- 🐛 Fix release-it configuration

## npm-v0.6.7 - 2026-05-28
- 🚀 Remove deprecated script and add check prior to start deploying

## npm-v0.6.6 - 2026-05-27
- 🚀 Add CHANGELOG to npm published folder

## npm-v0.6.5 - 2026-05-27
- 📝 Force npm publish interactively

## npm-v0.6.4 - 2026-05-27
- ⚙️ publish outside release-it

## npm-v0.6.3 - 2026-05-27
- 📝 Publish via npm instead of pnpm

## npm-v0.6.2 - 2026-05-27
- 🚀 Additional fix for npm publishing script

## npm-v0.6.1 - 2026-05-27
- 🚀 Fix npm publishing script

## npm-v0.6.0 - 2026-05-27
- 🆕 Add commands new & rename for CLI (#104)
- 👉 Task for each index (#109)
- 📖 Fix #73 - enhance doc (#103)
- 📏 Task migrate agent to linter rules (#99)
- 🐛 Fixes for npm & CLI (#96)
- 🎬 Create script and instructions for publishing to npm registry (#92)

## v0.5.13
- 🚀 Support for CSS file generation in the CLI `new` command (`--no-css` to skip)
- 🛠 Component name normalization in `new` and `rename` for better consistency
- 🔒 Improved security in component renaming using escaped RegExp
- 🌍 Enhancements in internationalization (i18n) for CLI commands
- 🧪 Test refactor to use exact comparisons and path constants
