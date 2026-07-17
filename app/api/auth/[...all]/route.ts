import { getPasswordAuth } from "../../../lib/auth-server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return getPasswordAuth().handler(request);
}

export function POST(request: Request) {
  return getPasswordAuth().handler(request);
}
