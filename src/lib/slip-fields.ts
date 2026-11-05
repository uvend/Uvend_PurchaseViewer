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
const amountLabel = String.raw`\b(?:sub[\s-]*total|amount\s+given|token\s+amount|amount|amt)\b`;
const labelPattern = new RegExp(
  String.raw`\b(refunds?|change|grand\s+total|total\s+due|amount\s+due|balance\s+due|sub[\s-]*total|amount\s+given|token\s+amount|total|amount|amt)\b`,
  "gi",
);

type Slot = "refunds" | "total" | "amount";

type MoneyHit = {
  value: string;
  span: Span;
  subtotal: boolean;
};

export function parseSlipText(text: string): SlipFields {
  const lined = softenSlipText(text);
  const lines = lined
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const source = lines.join(" ");
  const starts: number[] = [];
  let cursor = 0;

  for (const line of lines) {
    starts.push(cursor);
    cursor += line.length + 1;
  }

  const taken: Span[] = [];
  const { hits, seen } = collectCandidates(lines, starts);
  const refunds = pick(hits.refunds, taken, "first");
  let total = pick(hits.total, taken, "last");
  const amountHit = pickHit(hits.amount, taken, "last");
  const amount = amountHit?.value ?? "";

  if (amountHit) {
    taken.push(amountHit.span);
  }

  if (!total && !seen.total) {
    total =
      takeLabeledMoney(source, /\bamount\s+given\b/gi, taken, "first")?.value ??
      takeFirstCurrency(source, taken)?.value ??
      (amountHit?.subtotal ? "" : amount);
  }

  const dateTime = takeDateTime(source, taken);
  const card = takeCard(source, taken);

  return {
    total: total ?? "",
    amount,
    refunds,
    dateTime: dateTime?.value ?? "",
    card: card?.value ?? "",
    notes: notesFromLines(lines, starts, taken),
  };
}

function collectCandidates(lines: string[], starts: number[]) {
  const hits: Record<Slot, MoneyHit[]> = { refunds: [], total: [], amount: [] };
  const seen: Record<Slot, boolean> = { refunds: false, total: false, amount: false };
  const consumed = new Set<number>();
  const empty: { slot: Slot; line: number; filled: boolean }[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const labels = labelsOnLine(lines[index]);

    for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
      const label = labels[labelIndex];
      seen[label.slot] = true;
      const segmentStart = label.index + label.length;
      const segmentEnd = labels[labelIndex + 1]?.index ?? lines[index].length;
      const after = firstMoneyMatch(lines[index].slice(segmentStart, segmentEnd));

      if (after && rememberHit(hits, label, starts[index] + segmentStart, after)) {
        consumed.add(index);
        continue;
      }

      const previousEnd = labelIndex === 0 ? 0 : labels[labelIndex - 1].index + labels[labelIndex - 1].length;
      const before = lastMoneyMatch(lines[index].slice(previousEnd, label.index));
      const beforeSpan = before
        ? {
            start: starts[index] + previousEnd + before.index,
            end: starts[index] + previousEnd + before.index + before.raw.length,
          }
        : null;

      if (
        before &&
        beforeSpan &&
        !Object.values(hits).some((slotHits) => slotHits.some((hit) => overlaps(hit.span, [beforeSpan])))
      ) {
        hits[label.slot].push({
          value: tidyMoney(before.raw),
          span: beforeSpan,
          subtotal: label.subtotal,
        });
        consumed.add(index);
        continue;
      }

      const nextLine = lines[index + 1];
      const lastOnLine = labelIndex === labels.length - 1;

      if (lastOnLine && nextLine && !lineHasLabel(nextLine)) {
        const nextMoney = firstMoneyMatch(nextLine);

        if (nextMoney && rememberHit(hits, label, starts[index + 1], nextMoney)) {
          consumed.add(index + 1);
          continue;
        }
      }

      empty.push({ slot: label.slot, line: index, filled: false });
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (consumed.has(index) || lineHasLabel(lines[index])) {
      continue;
    }

    const money = firstMoneyMatch(lines[index]);
    const owner = empty.filter((label) => label.line < index && !label.filled).at(-1);

    if (!money || !owner) {
      continue;
    }

    owner.filled = true;
    hits[owner.slot].push({
      value: tidyMoney(money.raw),
      span: {
        start: starts[index] + money.index,
        end: starts[index] + money.index + money.raw.length,
      },
      subtotal: false,
    });
  }

  return { hits, seen };
}

function labelsOnLine(line: string) {
  return [...line.matchAll(new RegExp(labelPattern.source, "gi"))]
    .map((match) => {
      const word = match[1] ?? match[0];
      const slot = slotForLabel(word);

      if (!slot) {
        return null;
      }

      return {
        slot,
        index: match.index ?? 0,
        length: match[0].length,
        subtotal: /^sub/i.test(word),
      };
    })
    .filter((label): label is { slot: Slot; index: number; length: number; subtotal: boolean } => Boolean(label));
}

function slotForLabel(word: string): Slot | null {
  if (/^(?:refunds?|change)$/i.test(word)) {
    return "refunds";
  }

  if (/^sub[\s-]*total$/i.test(word)) {
    return "amount";
  }

  if (/^(?:grand\s+total|total\s+due|amount\s+due|balance\s+due|total)$/i.test(word)) {
    return "total";
  }

  if (/^(?:amount\s+given|token\s+amount|amount|amt)$/i.test(word)) {
    return "amount";
  }

  return null;
}

function lineHasLabel(line: string) {
  return new RegExp(labelPattern.source, "i").test(line);
}

function rememberHit(
  hits: Record<Slot, MoneyHit[]>,
  label: { slot: Slot; subtotal: boolean },
  offset: number,
  money: { raw: string; index: number },
) {
  hits[label.slot].push({
    value: tidyMoney(money.raw),
    span: {
      start: offset + money.index,
      end: offset + money.index + money.raw.length,
    },
    subtotal: label.subtotal,
  });
  return true;
}

function firstMoneyMatch(text: string) {
  const match = new RegExp(moneySource, "i").exec(text);

  if (!match?.[0]) {
    return null;
  }

  return { raw: match[0], index: match.index ?? 0 };
}

function lastMoneyMatch(text: string) {
  const last = [...text.matchAll(new RegExp(moneySource, "gi"))].at(-1);

  if (!last?.[0]) {
    return null;
  }

  return { raw: last[0], index: last.index ?? 0 };
}

function pick(hits: MoneyHit[], taken: Span[], which: "first" | "last") {
  const picked = pickHit(hits, taken, which);

  if (!picked) {
    return "";
  }

  taken.push(picked.span);
  return picked.value;
}

function pickHit(hits: MoneyHit[], taken: Span[], which: "first" | "last") {
  const available = hits.filter((hit) => !overlaps(hit.span, taken));
  return which === "last" ? (available.at(-1) ?? null) : (available[0] ?? null);
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

    const windowText = text.slice(end, Math.min(text.length, end + 64, nextMoneyLabel(text, end)));
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

function nextMoneyLabel(text: string, from: number) {
  const match = new RegExp(`${refundLabel}|${amountLabel}|${totalLabel}`, "i").exec(text.slice(from));
  return match ? from + (match.index ?? 0) : text.length;
}

function isSubtotalWord(text: string, index: number, word: string) {
  if (!/^total$/i.test(word)) {
    return false;
  }

  return /sub[\s-]*$/i.test(text.slice(Math.max(0, index - 8), index));
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
  const masked = [...text.matchAll(/((?:[*x.]{2,}[\s*]*)+\d{4})\b/gi)].find(
    (match) => !overlaps(spanOf(match), taken),
  );
  const labeled = labeledCard(text, taken);
  const ending = [...text.matchAll(/\b(?:ending|ends)\s*(?:in|with)?\s*[:\-]?\s*(\d{4})\b/gi)].find(
    (match) => !overlaps(spanOf(match), taken),
  );

  if (!brand && !masked && !labeled && !ending) {
    return null;
  }

  if (brand) {
    taken.push(spanOf(brand));
  }

  if (masked) {
    taken.push(spanOf(masked));
  }

  if (labeled) {
    taken.push(labeled.span);
  }

  if (ending) {
    taken.push(spanOf(ending));
  }

  const lastFour = (masked?.[1] || labeled?.lastFour || ending?.[1] || "").replace(/\D/g, "").slice(-4);
  const brandName = brand ? brand[1].replace(/\s+/g, " ").toUpperCase() : "";
  const maskedText = lastFour ? `**** ${lastFour}` : "";
  const value = [brandName, maskedText].filter(Boolean).join(" ").trim();

  return value ? { value } : null;
}

function labeledCard(text: string, taken: Span[]) {
  const labels = text.matchAll(/\b(?:card|pan)(?:\s*(?:no|number|#))?\s*[:\-]?\s*/gi);

  for (const label of labels) {
    const valueStart = (label.index ?? 0) + label[0].length;
    const tail = text.slice(valueStart, valueStart + 48);
    const dateAt = tail.search(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/);
    const region = dateAt >= 0 ? tail.slice(0, dateAt) : tail;
    const number = region.match(/^(?:[*x.\s-]*)(\d(?:[\s-]*\d)*)/);

    if (!number?.[1]) {
      continue;
    }

    const digits = number[1].replace(/\D/g, "");

    if (digits.length !== 4 && (digits.length < 13 || digits.length > 19)) {
      continue;
    }

    const span = {
      start: label.index ?? 0,
      end: valueStart + (number.index ?? 0) + number[0].length,
    };

    if (overlaps(span, taken)) {
      continue;
    }

    return { lastFour: digits.slice(-4), span };
  }

  return null;
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

const capturedLabel =
  /\b(?:grand\s+total|total\s+due|amount\s+due|balance\s+due|sub[\s-]*total|amount\s+given|token\s+amount|refunds?|change|date|time|card(?:\s*(?:no|number|#))?|pan|amount|amt|total)\b\s*[:\-]?/gi;

function notesFromLines(lines: string[], starts: number[], taken: Span[]) {
  const pieces = lines.flatMap((line, index) => notePieces(clearTaken(line, starts[index], taken)));
  return pieces.join("\n\n");
}

function clearTaken(line: string, start: number, taken: Span[]) {
  const chars = [...line];

  for (const span of taken) {
    const from = Math.max(0, span.start - start);
    const to = Math.min(line.length, span.end - start);

    for (let index = from; index < to; index += 1) {
      chars[index] = " ";
    }
  }

  return chars.join("");
}

function notePieces(line: string) {
  return line
    .split(new RegExp(capturedLabel.source, "gi"))
    .map((piece) => piece.replace(/\s{2,}/g, " ").trim().replace(/^[:\-.,]+|[:\-.,]+$/g, "").trim())
    .filter(Boolean);
}
