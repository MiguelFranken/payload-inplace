import config from "@payload-config";
import { REST_POST } from "@payloadcms/next/routes";

const createMedia = REST_POST(config);

/** Delegate multipart parsing, current-user authentication and create ACL to Payload. */
export function POST(request: Request) {
  if (process.env.VE_DEMO_MEDIA_UPLOAD !== "1")
    return new Response(null, { status: 404 });

  return createMedia(request, { params: Promise.resolve({ slug: ["media"] }) });
}
