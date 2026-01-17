import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/server/simpleAuth";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
