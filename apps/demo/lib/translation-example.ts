import type { Payload, PayloadRequest } from "payload";

/** Seed both language versions of one disposable demo record. Reuse the shared row IDs. */
export async function seedTranslation(payload: Payload, req: PayloadRequest) {
  const english = await payload.create({
    collection: "localizedPages",
    overrideAccess: true,
    req,
    locale: "en",
    fallbackLocale: false,
    data: {
      title: "Studio visit",
      slug: "studio-visit",
      layout: [
        {
          blockType: "localeStory",
          heading: "Visit the studio",
          caption: "Saturday tours start at ten.",
          items: [
            { label: "The showroom", sharedCode: "showroom" },
            { label: "The workshop", sharedCode: "workshop" },
          ],
        },
      ],
      _status: "published",
    },
  });

  const story = english.layout?.[0];
  if (!story?.items?.length)
    throw new Error("Translation seed is missing its rows");
  const labels = ["Der Ausstellungsraum", "Die Werkstatt"];
  await payload.update({
    collection: "localizedPages",
    id: english.id,
    overrideAccess: true,
    req,
    locale: "de",
    fallbackLocale: false,
    data: {
      title: "Studiobesuch",
      layout: [
        {
          ...story,
          heading: "Besuch im Studio",
          caption: null,
          items: story.items.map((item, index) => ({
            ...item,
            label: labels[index],
          })),
        },
      ],
      _status: "published",
    },
  });
}
