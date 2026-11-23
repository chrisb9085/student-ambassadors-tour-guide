import { session } from "../_lib/handlers.js";
import { deps } from "../_lib/env.js";

export function GET(request: Request) {
  return session(request, deps());
}
