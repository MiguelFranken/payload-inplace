# Documentation screenshots

The `ecommerce-*.png` files are original browser captures from the synthetic Still & Form demo. Chromium renders at 1440 × 1000 CSS pixels at 2× density, producing **2880 × 2000 PNGs**. The README, tour, and guides reuse these captures.

| File                                 | Actual state                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `ecommerce-storefront.png`           | Published storefront, anonymous browser, no editor                 |
| `ecommerce-editor.png`               | Direct product heading editing and joined selection caption        |
| `ecommerce-media.png`                | Selected image and reusable contextual media library               |
| `ecommerce-fields.png`               | Native array-item fields with the conditional lead-time control    |
| `ecommerce-block-actions.png`        | Selected Studio story caption and its section actions menu         |
| `ecommerce-block-positions.png`      | Eligible final positions for the selected Studio story             |
| `ecommerce-sections.png`             | Searchable section catalogue and unsaved canvas example            |
| `ecommerce-review.png`               | Field-level review with partial text and whole checkbox highlights |
| `ecommerce-rich-text.png`            | Inline Lexical editing with a selected phrase and Bold active      |
| `ecommerce-comparison-draft.png`     | Changed product section showing the saved draft                    |
| `ecommerce-comparison-published.png` | The same section showing the published heading                     |
| `ecommerce-comparison-elements.png`  | Changed heading and delivery estimate outlined on the draft        |

## Reproduce

Follow [Contributing](../../CONTRIBUTING.md#refresh-documentation-screenshots), then run `corepack pnpm docs:media`. The opt-in [Playwright config](../../tests/playwright.docs.config.ts) and [capture flow](../../tests/browser/docs-media.spec.ts) create an isolated production build/database, verify each state and capture its original pixels. The flow never publishes. It also checks public desktop/tablet/mobile layouts and retains those responsive checks in `test-results/docs-media`. Copy only the reviewed `ecommerce-*.png` captures used by the documentation.

Demo accounts, copy and schema data are synthetic. Product photography is generated; [prompts and original photographs](../../apps/demo/commerce/assets/README.md) are retained. The page appearance belongs to the demo renderer; the plugin supplies the authoring controls around a host's own frontend.

## Historical images

`inline-editing.png` and `sections.png` are retained for historical references. They come from [main validation run 41809345628](https://github.com/MiguelFranken/payload-inplace/actions/runs/41809345628), the source validation for npm 0.0.1. They are not the current README screenshot set.
