const endpoint = "https://api.ocr.space/parse/image";
const maxBytes = 1024 * 1024;

type OcrSpaceWord = {
  WordText?: string;
};

type OcrSpaceResult = {
  ParsedText?: string | null;
  FileParseExitCode?: number | string;
  ErrorMessage?: unknown;
  ErrorDetails?: unknown;
  TextOverlay?: {
    Lines?: { Words?: OcrSpaceWord[] }[];
  } | null;
};

type OcrSpacePayload = {
  ParsedResults?: OcrSpaceResult[] | null;
  OCRExitCode?: number | string;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: unknown;
  ErrorDetails?: unknown;
  ProcessingTimeInMilliseconds?: string | number;
};

export class OcrSpaceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OcrSpaceError";
  }
}

export async function recognizeImage(file: File) {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();

  if (!apiKey) {
    throw new OcrSpaceError("OCR is not configured.", 500);
  }

  if (file.size <= 0) {
    throw new OcrSpaceError("The slip photo is empty.", 400);
  }

  if (file.size > maxBytes) {
    throw new OcrSpaceError("Slip photo must be under 1MB.", 400);
  }

  const body = new FormData();
  body.append("file", file, file.name || "slip.jpg");
  body.append("OCREngine", "2");
  body.append("isTable", "true");
  body.append("scale", "true");
  body.append("detectOrientation", "true");
  body.append("isOverlayRequired", "true");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { apikey: apiKey },
      body,
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as OcrSpacePayload | null;

    if (!response.ok) {
      console.error("OCR.space failed", { status: response.status });
      throw new OcrSpaceError(messageForHttp(response.status), response.status);
    }

    const pages = payload?.ParsedResults ?? [];
    const text = pages
      .map((page) => page.ParsedText?.trim() ?? "")
      .filter((page) => page.length > 0)
      .join("\n");
    const words = pages.flatMap((page) =>
      (page.TextOverlay?.Lines ?? []).flatMap((line) =>
        (line.Words ?? [])
          .map((word) => word.WordText?.trim() ?? "")
          .filter((word) => word.length > 0)
          .map((word) => ({ text: word, score: 1 })),
      ),
    );
    const exitCode = numberOf(payload?.OCRExitCode);
    const failed = payload?.IsErroredOnProcessing || exitCode === 3 || exitCode === 4 || !text;

    console.info("OCR.space", {
      exitCode,
      ms: payload?.ProcessingTimeInMilliseconds,
      words: words.length,
      failed,
    });

    if (failed) {
      throw new OcrSpaceError(messageForPayload(payload, pages), 422);
    }

    return {
      text,
      words,
      requestId: "",
      imageWidth: null,
      imageHeight: null,
    };
  } catch (error) {
    if (error instanceof OcrSpaceError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OcrSpaceError("The reader took too long. Type the slip for now.", 503);
    }

    throw new OcrSpaceError("The reader is unavailable. Type the slip for now.", 503);
  } finally {
    clearTimeout(timer);
  }
}

function messageForHttp(status: number) {
  if (status === 401 || status === 403) {
    return "OCR access key was rejected.";
  }

  if (status === 429) {
    return "The reader has reached its free daily limit. Type the slip for now.";
  }

  return "Could not read the slip.";
}

function messageForPayload(payload: OcrSpacePayload | null, pages: OcrSpaceResult[]) {
  const detail = cleanMessage(
    firstText(payload?.ErrorMessage) ||
      firstText(pages.find((page) => page.ErrorMessage)?.ErrorMessage) ||
      firstText(payload?.ErrorDetails),
  );

  if (/file size|too large|max file|1\s?mb/i.test(detail)) {
    return "Slip photo must be under 1MB.";
  }

  if (/timeout|timed out/i.test(detail)) {
    return "The reader took too long. Type the slip for now.";
  }

  if (detail) {
    return detail;
  }

  return "Could not read the slip.";
}

function firstText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string").join(" ").trim();
  }

  return "";
}

function cleanMessage(value: string) {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  const hidden = apiKey ? value.replaceAll(apiKey, "") : value;
  return hidden.replace(/\s+/g, " ").trim().slice(0, 180);
}

function numberOf(value: number | string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
