import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload } from "payload";

/** Seed only the disposable demo database through the native Local API. Uploads and commerce data never depend on a remote service. */
export async function seedCommerce(payload: Payload) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const upload = async (name: string, alt: string) =>
    payload.create({
      collection: "media",
      overrideAccess: true,
      data: { alt },
      filePath: path.join(dirname, "assets", name),
    });
  const studio = await upload(
    "studio.png",
    "Oak lounge chair and side table in a sunlit studio",
  );
  const chair = await upload(
    "arc-chair.png",
    "Arc lounge chair in natural oak with oat upholstery",
  );
  const product = await payload.create({
    collection: "products" as any,
    overrideAccess: true,
    data: {
      title: "Arc lounge chair",
      slug: "arc-chair",
      internalCost: 310,
      presentation: {
        layout: [
          {
            blockType: "productDetails",
            eyebrow: "The living collection",
            heading: "Arc lounge chair",
            description:
              "A quiet place to land. Solid oak, soft curves and a generous seat, made for the everyday.",
            image: chair.id,
            pricing: { amount: 640, currency: "EUR" },
            variants: [
              {
                name: "Natural oak / Oat",
                sku: "ARC-OAK-OAT",
                available: true,
                details: {
                  material: "Solid oak and woven linen",
                  care: [
                    { instruction: "Wipe the oak with a soft, dry cloth." },
                    {
                      instruction: "Spot clean the upholstery with mild soap.",
                    },
                  ],
                },
              },
              {
                name: "Natural oak / Moss",
                sku: "ARC-OAK-MOSS",
                available: false,
                leadTime: "Made to order in 4–6 weeks",
                details: {
                  material: "Solid oak and woven wool",
                  care: [
                    {
                      instruction:
                        "Brush the wool gently in the direction of the weave.",
                    },
                  ],
                },
              },
            ],
            specifications: [
              {
                label: "Materials",
                value: "Responsibly sourced oak. Woven linen upholstery.",
              },
              {
                label: "Dimensions",
                value: "W 74 × D 79 × H 76 cm. Seat height 40 cm.",
              },
              {
                label: "Made with care",
                value: "Built in small batches. Designed to be repaired.",
              },
            ],
          },
          {
            blockType: "editorial",
            heading: "Good things take their time.",
            description:
              "We work with small workshops and honest materials. Pieces with a useful life, and a story worth keeping.",
            image: studio.id,
          },
          {
            blockType: "faq",
            heading: "A few useful details",
            items: [
              {
                question: "How does delivery work?",
                answer:
                  "Your chair arrives assembled, with protective packaging that can be recycled.",
              },
              {
                question: "Can I order a fabric sample?",
                answer:
                  "This is a demonstration store. Use the editor to try different product content and settings.",
              },
            ],
          },
        ],
      },
      search: {
        title: "Arc lounge chair — Still & Form",
        description: "Solid oak and soft linen for slower days.",
      },
      _status: "published",
    } as any,
  });
  await payload.create({
    collection: "shops" as any,
    overrideAccess: true,
    data: {
      title: "Still & Form",
      slug: "home",
      _status: "published",
      layout: [
        {
          blockType: "collectionHero",
          eyebrow: "Objects for everyday living",
          heading: `A little more
room to slow down.`,
          description:
            "Considered furniture. Honest materials. Pieces you’ll want to live with for a long time.",
          image: studio.id,
        },
        {
          blockType: "productGrid",
          heading: "Fewer things. Better chosen.",
          description: "Meet the first piece in our living collection.",
          cards: [
            {
              product: product.id,
              heading: "Arc lounge chair",
              description: "Natural oak · Two upholstery finishes",
              priceCaption: "€640",
              image: chair.id,
              linkLabel: "View product",
            },
          ],
        },
        {
          blockType: "editorial",
          heading: `Made for living,
not just looking.`,
          description:
            "Our collection starts with a simple question: will it still feel right in ten years? Natural materials and thoughtful details do the rest.",
          image: chair.id,
        },
        {
          blockType: "faq",
          heading: "Good to know",
          items: [
            {
              question: "What is Still & Form?",
              answer:
                "A small demonstration storefront for Payload Inplace. Every piece of page content is backed by a native Payload field.",
            },
            {
              question: "Can I try editing this page?",
              answer:
                "Sign in with a synthetic demo account, then use the small edit button. Your changes are saved as drafts until you publish them.",
            },
          ],
        },
      ],
    } as any,
  });
}
