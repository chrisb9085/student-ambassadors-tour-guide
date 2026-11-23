import { logout } from "../_lib/handlers.js";

export function POST(request: Request) {
  return logout(request);
}
