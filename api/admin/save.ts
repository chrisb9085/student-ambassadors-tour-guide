import { save } from "../_lib/handlers.js";
import { deps } from "../_lib/env.js";

export function POST(request: Request) {
  return save(request, deps());
}
