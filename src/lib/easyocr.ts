const endpoint = "https://console.easyocr.org/api/ocr";
const maxBytes = 3 * 1024 * 1024;

type EasyOcrPayload = {
  request_id?: string;
  message?: string;
  error?: string;
  cost?: number;
  remaining_quota?: number;
  words?: { text?: string; score?: number }[];
  image_width?: number;
  image_height?: number;
};

export class EasyOcrError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "EasyOcrError";
  }
}

export async function recognizeImage(file: File) {
  const accessKey = process.env.EASYOCR_ACCESS_KEY || process.env["x-access-key"];

  if (!accessKey) {
    throw new EasyOcrError("OCR is not configured.", 500);
  }

  if (file.size <= 0) {
    throw new EasyOcrError("The slip photo is empty.", 400);
  }

  if (file.size > maxBytes) {
    throw new EasyOcrError("Slip photo must be under 3MB.", 400);
  }

  const body = new FormData();
  body.append("file", file, file.name || "slip.jpg");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "X-Access-Key": accessKey },
      body,
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as EasyOcrPayload | null;
    const requestId = payload?.request_id;

    if (!response.ok) {
      console.error("EasyOCR failed", {
        status: response.status,
        requestId,
        message: payload?.message || payload?.error,
      });
      throw new EasyOcrError(messageForStatus(response.status, payload), response.status, requestId);
    }

    const words = (payload?.words ?? [])
      .map((word) => ({
        text: word.text?.trim() ?? "",
        score: typeof word.score === "number" ? word.score : 0,
      }))
      .filter((word) => word.text.length > 0);

    console.info("EasyOCR", {
      requestId,
      cost: payload?.cost,
      remaining: payload?.remaining_quota,
      words: words.length,
    });

    return {
      text: words.map((word) => word.text).join(" "),
      words,
      requestId: requestId ?? "",
      imageWidth: payload?.image_width ?? null,
      imageHeight: payload?.image_height ?? null,
    };
  } catch (error) {
    if (error instanceof EasyOcrError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new EasyOcrError("The reader took too long. Type the slip for now.", 503);
    }

    throw new EasyOcrError("The reader is unavailable. Type the slip for now.", 503);
  } finally {
    clearTimeout(timer);
  }
}

function messageForStatus(status: number, payload: EasyOcrPayload | null) {
  if (status === 401) {
    return "OCR access key was rejected.";
  }

  if (status === 402) {
    return "OCR credits are used up.";
  }

  if (status === 400) {
    return payload?.message || "That photo could not be read.";
  }

  if (status === 503) {
    return "The reader is busy. Type the slip for now.";
  }

  return "Could not read the slip.";
}
