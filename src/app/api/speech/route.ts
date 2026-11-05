import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { transcribeSpeech } from "@/lib/elevenlabs";

const maxBytes = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Record a voice note first." }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return NextResponse.json({ error: "That recording is too long. Record a shorter note." }, { status: 400 });
  }

  try {
    const text = await transcribeSpeech(file);

    if (!text) {
      return NextResponse.json({ error: "No speech heard. Try again." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch {
    console.error("Speech transcription failed");
    return NextResponse.json({ error: "Could not turn that recording into text." }, { status: 500 });
  }
}
