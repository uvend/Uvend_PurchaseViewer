const transientCodes = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "P1001",
  "P1017",
  "P2024",
]);

export function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return (
    transientCodes.has(code) ||
    /timed?\s*out|can't reach database|connection terminated|fetch failed/i.test(message)
  );
}

function withTimeout<T>(run: () => Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("Database timeout"), { code: "ETIMEDOUT" }));
    }, ms);

    run().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function withDbRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withTimeout(run, 15000);
    } catch (error) {
      lastError = error;

      if (!isTransientDbError(error) || attempt === attempts - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }

  throw lastError;
}

export function databaseErrorResponse(error: unknown, fallback: string) {
  console.error(error);

  return {
    error: isTransientDbError(error)
      ? "Database is waking up. Try that again."
      : fallback,
    status: isTransientDbError(error) ? 503 : 500,
  };
}
