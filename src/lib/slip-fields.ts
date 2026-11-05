export type SlipFields = {
  total: string;
  amount: string;
  refunds: string;
  dateTime: string;
  card: string;
  notes: string;
};

type Span = {
  start: number;
  end: number;
};

const moneySource = String.raw`(?:R|ZAR|\$)\s*\d{1,3}(?:[ ,]\d{3})*[.,]\d{2}|\d{1,3}(?:[ ,]\d{3})*[.,]\d{2}`;
const moneyInText = new RegExp(moneySource, "i");
const moneyBefore = new RegExp(String.raw`(${moneySource})\s*$`, "i");
const currencyMoney = /(?:R|ZAR|\$)\s*\d{1,3}(?:[ ,]\d{3})*[.,]\d{2}/gi;
const refundLabel = String.raw`\b(?:refunds?|change)\b`;
const totalLabel = String.raw`\b(?:grand\s+total|total\s+due|amount\s+due|balance\s+due|total)\b`;
const amountLabel = String.raw`\b(?:sub\s*total|subtotal|amount\s+given|token\s+amount|amount|amt)\b`;

export function parseSlipText(text: string): SlipFields {
  const lined = softenSlipText(text);
  const lines = lined
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const source = normalizeSlipText(lined);
  const taken: Span[] = [];

  const refunds = fieldFromLinesOrText(source, lines, refundLabel, taken, "first");
  let total = fieldFromLinesOrText(source, lines, totalLabel, taken, "last");
  const amount = fieldFromLinesOrText(source, lines, amountLabel, taken, "last");

  if (!total) {
    total =
      takeLabeledMoney(source, /\bamount\s+given\b/gi, taken, "first")?.value ??
      takeFirstCurrency(source, taken)?.value ??
      amount ??
      "";
  }
  const dateTime = takeDateTime(source, taken);
  const card = takeCard(source, taken);

  return {
    total: total ?? "",
    amount: amount ?? "",
    refunds: refunds ?? "",
    dateTime: dateTime?.value ?? "",
    card: card?.value ?? "",
    notes: remainder(source, taken),
  };
}

function fieldFromLinesOrText(
  source: string,
  lines: string[],
  labelSource: string,
  taken: Span[],
  which: "first" | "last",
) {
  const fromLine = moneyByLabel(lines, labelSource, which);

  if (fromLine && !valueAlreadyTaken(source, fromLine, taken)) {
    rememberValue(source, fromLine, taken);
    return fromLine;
  }

  return takeLabeledMoney(source, new RegExp(labelSource, "gi"), taken, which)?.value ?? "";
}

function moneyByLabel(lines: string[], labelSource: string, which: "first" | "last") {
  const found: string[] = [];
  const label = new RegExp(labelSource, "i");
  const anyLabel = new RegExp(`${refundLabel}|${totalLabel}|${amountLabel}`, "i");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = label.exec(line);
    label.lastIndex = 0;

    if (!match || isSubtotalWord(line, match.index ?? 0, match[0])) {
      continue;
    }

    const after = line.slice((match.index ?? 0) + match[0].length);
    const before = line.slice(0, match.index ?? 0);
    const next = lines[index + 1] ?? "";
    const nextValue = anyLabel.test(next) ? null : firstMoney(next);
    const value = firstMoney(after) ?? lastMoney(before) ?? nextValue;

    if (value) {
      found.push(value);
    }
  }

  return which === "last" ? (found.at(-1) ?? null) : (found[0] ?? null);
}

function firstMoney(text: string) {
  const match = text.match(moneyInText);
  return match?.[0] ? tidyMoney(match[0]) : null;
}

function lastMoney(text: string) {
  const matches = [...text.matchAll(new RegExp(moneySource, "gi"))];
  const last = matches.at(-1);
  return last ? tidyMoney(last[0]) : null;
}

function valueAlreadyTaken(text: string, value: string, taken: Span[]) {
  const span = moneySpan(text, value);
  return span ? overlaps(span, taken) : false;
}

function rememberValue(text: string, value: string, taken: Span[]) {
  const span = moneySpan(text, value);

  if (!span || overlaps(span, taken)) {
    return;
  }

  taken.push(span);
}

function moneySpan(text: string, value: string): Span | null {
  const compact = value.replace(/\s+/g, "");
  const body = compact.replace(/^(?:ZAR|R|\$)/i, "");
  const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = compact.startsWith("$")
    ? [`\\$\\s*${escaped}`]
    : /^(?:zar|r)/i.test(compact)
      ? [`R\\s*${escaped}`, `ZAR\\s*${escaped}`]
      : [escaped];

  for (const source of patterns) {
    const match = new RegExp(source, "i").exec(text);

    if (match) {
      return spanOf(match);
    }
  }

  return null;
}

function softenSlipText(text: string) {
  return text
    .replace(/[\u00a0\u2000-\u200b\u202f\ufeff]/g, " ")
    .replace(/[＄﹩]/g, "$")
    .replace(/[，]/g, ",")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function normalizeSlipText(text: string) {
  return softenSlipText(text).replace(/\s+/g, " ").trim();
}

function takeLabeledMoney(text: string, label: RegExp, taken: Span[], which: "first" | "last") {
  const found: { value: string; span: Span }[] = [];

  for (const match of text.matchAll(label)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps({ start, end }, taken) || isSubtotalWord(text, start, match[0])) {
      continue;
    }

    const windowText = text.slice(end, Math.min(text.length, end + 64));
    const after = windowText.match(moneyInText);
    if (after?.[0]) {
      const value = tidyMoney(after[0]);
      const span = { start, end: end + after.index! + after[0].length };
      if (!overlaps(span, taken)) {
        found.push({ value, span });
      }
      continue;
    }

    const beforeStart = Math.max(0, start - 32);
    const before = text.slice(beforeStart, start).match(moneyBefore);
    if (!before?.[1]) {
      continue;
    }

    const value = tidyMoney(before[1]);
    const span = { start: start - before[0].length, end };
    if (!overlaps(span, taken)) {
      found.push({ value, span });
    }
  }

  const picked = which === "last" ? found.at(-1) : found[0];
  if (!picked) {
    return null;
  }

  taken.push(picked.span);
  return picked;
}

function takeFirstCurrency(text: string, taken: Span[]) {
  for (const match of text.matchAll(currencyMoney)) {
    const span = spanOf(match);
    if (overlaps(span, taken)) {
      continue;
    }

    taken.push(span);
    return { value: tidyMoney(match[0]), span };
  }

  return null;
}

function isSubtotalWord(text: string, index: number, word: string) {
  if (!/^total$/i.test(word)) {
    return false;
  }

  return /sub\s*$/i.test(text.slice(Math.max(0, index - 4), index));
}

function takeDateTime(text: string, taken: Span[]) {
  const dateMatch = nearest(
    [...text.matchAll(/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g)],
    text,
    /\bdate\b/i,
    taken,
  );
  const timeMatch = nearest(
    [...text.matchAll(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\b/gi)],
    text,
    /\btime\b/i,
    taken,
  );

  if (!dateMatch && !timeMatch) {
    return null;
  }

  const spans = [dateMatch, timeMatch].filter((match): match is RegExpMatchArray => Boolean(match));
  for (const match of spans) {
    taken.push(spanWithHint(text, match, match === dateMatch ? /\bdate\b/i : /\btime\b/i));
  }

  const value = [dateMatch?.[1], timeMatch?.[1]?.toUpperCase()].filter(Boolean).join(" ");
  return { value };
}

function takeCard(text: string, taken: Span[]) {
  const brand = [...text.matchAll(/\b(visa|mastercard|master\s*card|amex|american\s+express|diners)\b/gi)].find(
    (match) => !overlaps(spanOf(match), taken),
  );
  const masked = [...text.matchAll(/((?:[*x.]{2,}[\s*]*)+\d{4})/gi)].find(
    (match) => !overlaps(spanOf(match), taken),
  );
  const labeled = [
    ...text.matchAll(
      /\b(?:card|pan|a\/c)(?:\s*(?:no|number|#))?\s*[:\-]?\s*((?:[*x.\s-]*\d){4,19})/gi,
    ),
  ].find((match) => !overlaps(spanOf(match), taken));
  const ending = [...text.matchAll(/\b(?:ending|ends)\s*(?:in|with)?\s*[:\-]?\s*(\d{4})\b/gi)].find(
    (match) => !overlaps(spanOf(match), taken),
  );

  if (!brand && !masked && !labeled && !ending) {
    return null;
  }

  for (const match of [brand, masked, labeled, ending]) {
    if (match) {
      taken.push(spanOf(match));
    }
  }

  const lastFour = (masked?.[1] || labeled?.[1] || ending?.[1] || "").replace(/\D/g, "").slice(-4);
  const brandName = brand ? brand[1].replace(/\s+/g, " ").toUpperCase() : "";
  const maskedText = lastFour ? `**** ${lastFour}` : "";
  const value = [brandName, maskedText].filter(Boolean).join(" ").trim();

  return value ? { value } : null;
}

function nearest(matches: RegExpMatchArray[], text: string, hint: RegExp, taken: Span[]) {
  const available = matches.filter((match) => !overlaps(spanOf(match), taken));
  const hintMatch = hint.exec(text);
  if (!hintMatch || available.length === 0) {
    return available[0];
  }

  const hintAt = hintMatch.index ?? 0;
  return available.reduce((closest, match) => {
    const distance = Math.abs((match.index ?? 0) - hintAt);
    const closestDistance = Math.abs((closest.index ?? 0) - hintAt);
    return distance < closestDistance ? match : closest;
  });
}

function spanOf(match: RegExpMatchArray): Span {
  const start = match.index ?? 0;
  return { start, end: start + match[0].length };
}

function spanWithHint(text: string, match: RegExpMatchArray, hint: RegExp): Span {
  const start = match.index ?? 0;
  const end = start + match[0].length;
  const before = text.slice(Math.max(0, start - 16), start);
  const hintMatch = before.match(new RegExp(`${hint.source}\\s*[:\\-]?\\s*$`, "i"));

  return hintMatch ? { start: start - hintMatch[0].length, end } : { start, end };
}

function overlaps(span: Span, taken: Span[]) {
  return taken.some((item) => span.start < item.end && span.end > item.start);
}

function tidyMoney(value: string) {
  const compact = value.replace(/\s+/g, "");

  if (/^zar/i.test(compact)) {
    return `R ${compact.slice(3)}`;
  }

  if (/^r/i.test(compact)) {
    return `R ${compact.slice(1)}`;
  }

  if (compact.startsWith("$")) {
    return `$ ${compact.slice(1)}`;
  }

  return compact;
}

function remainder(text: string, taken: Span[]) {
  const chars = [...text];
  for (const span of taken) {
    for (let index = span.start; index < span.end && index < chars.length; index += 1) {
      chars[index] = " ";
    }
  }

  return chars
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}
