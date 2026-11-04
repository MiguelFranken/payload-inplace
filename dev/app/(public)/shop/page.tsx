import PublishedPage from "../[collection]/[slug]/page";
export default function Page() {
  return (
    <PublishedPage
      params={Promise.resolve({ collection: "shops", slug: "home" })}
    />
  );
}
