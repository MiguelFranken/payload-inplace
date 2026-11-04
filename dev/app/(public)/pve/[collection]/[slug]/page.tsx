import { renderPageEntry } from "../../../../../lib/page-entry";
export default async function Page({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  return renderPageEntry(collection, slug, `/${collection}/${slug}`);
}
