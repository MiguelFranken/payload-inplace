import { getPayload } from "payload";
import config from "./payload.config";

const payload = await getPayload({ config });

await payload.destroy();

process.exit(0);
