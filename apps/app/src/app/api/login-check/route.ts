import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const verification = await checkBotId();
    if (verification.isBot) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } catch (error) {
    console.error("BotID check failed:", error);
  }
  return NextResponse.json({ ok: true });
}
