import { NextResponse } from "next/server";
import { verifyPassword, setAuthCookie } from "@/server/simpleAuth";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAuthCookie();
  return NextResponse.json({ success: true });
}
