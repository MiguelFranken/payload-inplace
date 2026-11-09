import { sql } from "@payloadcms/db-postgres";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { ConcurrencyAdapter } from "../types";

/** Payload 3.91 transaction adapter: serialize the document before native update/restore reads.
 * No direct writes to Payload content/version tables. Transaction-scoped locks release on commit/rollback.
 */
export function postgresConcurrency(): ConcurrencyAdapter {
  return {
    name: "payload-postgres-3.91",
    async lock(req, key) {
      const db = req.payload.db as unknown as PostgresAdapter;
      const transactionID = await req.transactionID;
      if (db.name !== "postgres" || !transactionID)
        throw new Error(
          "Visual editor requires an active Postgres transaction",
        );
      const tx = db.sessions[String(transactionID)]?.db;
      if (!tx)
        throw new Error(
          "Visual editor transaction is unavailable; refusing an unlocked write",
        );
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
      );
    },
  };
}
