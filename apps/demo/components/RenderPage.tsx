import { getServerPageSlots } from "./ServerPageSlots";
import { RenderPageView } from "./RenderPageView";
/** Public and editor routes use identical presentational markup; server-only data stays in the host route. */
export async function RenderPage(props: Parameters<typeof RenderPageView>[0]) {
  return (
    <RenderPageView
      {...props}
      serverContent={await getServerPageSlots(props.document, props.root)}
    />
  );
}
