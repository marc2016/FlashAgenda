import type { Drehbuch } from "../zeitplan.ts";
import { DETAILS } from "./details.ts";
import { PRODUKT } from "./produkt.ts";

/** All videos, keys as in `npm run vertonen -- --video <key>`. */
export const DREHBUECHER: Record<string, Drehbuch> = { produkt: PRODUKT, details: DETAILS };
