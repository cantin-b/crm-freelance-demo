import { NextResponse } from "next/server";

const MESSAGE =
  "CRM Freelance Demo runs with browser-side React state. API persistence is disabled in this public demo.";

function demoApiFallback() {
  return NextResponse.json({ error: MESSAGE }, { status: 404 });
}

export const GET = demoApiFallback;
export const POST = demoApiFallback;
export const PATCH = demoApiFallback;
export const DELETE = demoApiFallback;
export const PUT = demoApiFallback;
export const OPTIONS = demoApiFallback;
