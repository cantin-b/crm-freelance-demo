import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "crm_session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ success: true });
}
