import { stops } from "../_lib/handlers.js";
import { deps } from "../_lib/env.js";

export function GET(request: Request) {
  return stops(request, deps());
}
