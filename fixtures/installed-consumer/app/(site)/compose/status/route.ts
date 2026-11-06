import type { NextRequest } from "next/server";
import { authorizedEditor } from "../../../../lib/authorized-editor";

/** Active-only session/capability check; the protected route owns its activation cookie. */
export async function GET(request: NextRequest) {
  const { context, document } = await authorizedEditor(
    request.nextUrl.searchParams.get("context") || undefined,
  );
  return Response.json(
    {
      revision: document._veRevision ?? document.updatedAt,
      expires: context.expires,
    },
    { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
  );
}
