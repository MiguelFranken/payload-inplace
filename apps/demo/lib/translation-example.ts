import { createLocalReq, type Payload } from "payload";

/** Seed both language versions of one disposable demo record. Reuse the shared row IDs. */
export async function seedTranslation(payload: Payload) {
  const slug = "studio-visit";
  const {
    docs: [existing],
  } = await payload.find({
    collection: "localizedPages",
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    locale: "en",
    fallbackLocale: false,
  });
  if (existing) {
    const german = await payload.findByID({
      collection: "localizedPages",
      id: existing.id,
      depth: 0,
      overrideAccess: true,
      locale: "de",
      fallbackLocale: false,
    });
    // The German seed writes the title and story together.
    if (german.title != null || german.layout?.[0]?.heading != null) return;
  }

  const req = await createLocalReq(
    { context: { visualEditorSystemWrite: true } },
    payload,
  );
  const english =
    existing ??
    (await payload.create({
      collection: "localizedPages",
      overrideAccess: true,
      req,
      locale: "en",
      fallbackLocale: false,
      data: {
        title: "Studio visit",
        slug,
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
    }));

  const story = english.layout?.[0];
  if (!story?.items?.length)
    throw new Error("Translation seed is missing its rows");
  const labels = new Map([
    ["showroom", "Der Ausstellungsraum"],
    ["workshop", "Die Werkstatt"],
  ]);
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
          items: story.items.map((item) => ({
            ...item,
            label: labels.get(item.sharedCode ?? "") ?? null,
          })),
        },
      ],
      _status: "published",
    },
  });
}
