import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { OcrSpaceError, recognizeImage } from "@/lib/ocr-space";
import { parseSlipText } from "@/lib/slip-fields";

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Add a slip photo." }, { status: 400 });
  }

  try {
    const result = await recognizeImage(file);
    return NextResponse.json({
      ...result,
      fields: parseSlipText(result.text),
    });
  } catch (error) {
    if (error instanceof OcrSpaceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json({ error: "Could not read the slip." }, { status: 500 });
  }
}
