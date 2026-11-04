import { getPayload } from "payload";
import config from "./payload.config";
const payload = await getPayload({ config });
await payload.destroy();
// This one-shot worker owns no unfinished writes. Exiting closes Drizzle's auxiliary/primary pools.
process.exit(0);
