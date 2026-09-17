import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request) {
  await destroySession();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
