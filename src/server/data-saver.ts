import "server-only";
import { cookies, headers } from "next/headers";
import { DATA_SAVER_COOKIE } from "@/lib/data-saver";

/** Mode économie de données : en-tête Save-Data du navigateur, ou choix explicite du membre (cookie). */
export async function isDataSaver(): Promise<boolean> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const choice = c.get(DATA_SAVER_COOKIE)?.value;
  if (choice === "1") return true;
  if (choice === "0") return false;
  return h.get("save-data")?.toLowerCase() === "on";
}
