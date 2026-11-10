# Documentation screenshots

The six `ecommerce-*.png` images are original, unedited **2880 × 2000 PNG** captures of the Still & Form synthetic commerce demo, refreshed on November 6, 2026. The review image was refreshed on November 11 to show whole checkbox values. Chromium renders at 1440 × 1000 CSS pixels with device scale factor 2; these are native high-density captures, not upscaled older images. The README displays them at up to 1440px and links to the originals.

| File                       | Actual state                                                    |
| -------------------------- | --------------------------------------------------------------- |
| `ecommerce-storefront.png` | Published storefront, anonymous browser, no editor              |
| `ecommerce-editor.png`     | Direct product heading editing and joined selection caption     |
| `ecommerce-media.png`      | Selected image and reusable contextual media library            |
| `ecommerce-fields.png`     | Native array-item fields with the conditional lead-time control |
| `ecommerce-sections.png`   | Searchable section catalogue and unsaved canvas example         |
| `ecommerce-review.png`     | Loaded, changed-only draft comparison before publication        |

## Reproduce

Follow [Contributing](../../CONTRIBUTING.md#refresh-documentation-screenshots), then run `corepack pnpm docs:media`. The opt-in [Playwright config](../../tests/playwright.docs.config.ts) and [capture flow](../../tests/browser/docs-media.spec.ts) create an isolated production build/database, verify each state and capture its original pixels. The flow never publishes. It also checks public desktop/tablet/mobile layouts and retains review-only images in `test-results/docs-media`; copy only the six reviewed commerce assets here.

Demo accounts, copy and schema data are synthetic. Product photography is generated; [prompts and original photographs](../../apps/demo/commerce/assets/README.md) are retained. The page appearance belongs to the demo renderer; the plugin supplies the authoring controls around a host's own frontend.

## Historical images

`inline-editing.png` and `sections.png` are retained for historical references. They come from [main validation run 41809345628](https://github.com/MiguelFranken/payload-inplace/actions/runs/41809345628), the source validation for npm 0.0.1. They are not the current README screenshot set.
