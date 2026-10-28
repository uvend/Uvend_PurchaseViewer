import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";

const blue = rgb(0.18, 0.45, 0.78);
const blueHeader = rgb(0.16, 0.42, 0.74);
const blueWash = rgb(0.91, 0.95, 0.99);
const ink = rgb(0.12, 0.13, 0.15);
const muted = rgb(0.28, 0.31, 0.36);
const white = rgb(1, 1, 1);

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 40;

const issuer = {
  name: "Uvend",
  lines: [] as string[],
};

export type InvoiceStatement = {
  number: string;
  createdAt: Date;
  job: {
    title: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    address: string;
  };
  items: {
    kind: string;
    description: string;
    amount: number;
  }[];
};

export type JobCardDocument = {
  title: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string;
  createdAt: Date;
  assignedTo: string | null;
  notes: {
    text: string;
    source: string;
    createdAt: Date;
    author: string | null;
    location: string | null;
  }[];
  purchases: {
    shopName: string;
    description: string;
    purchasedAt: Date;
  }[];
  invoices: {
    number: string;
    total: number;
  }[];
};

export async function renderInvoiceStatement(statement: InvoiceStatement) {
  const sheet = await Sheet.create();
  sheet.letterhead("INVOICE");

  const total = statement.items.reduce((sum, item) => sum + item.amount, 0);
  const billLines = [
    statement.job.customerName,
    statement.job.address,
    statement.job.title,
    statement.job.customerPhone ? `Mobile: ${statement.job.customerPhone}` : null,
    statement.job.customerEmail ? `Email: ${statement.job.customerEmail}` : null,
  ].filter((line): line is string => Boolean(line));

  sheet.parties("Bill To", billLines, [
    ["Invoice No :", statement.number],
    ["Invoice Date :", formatDate(statement.createdAt, false)],
    ["Due Date :", "On receipt"],
  ]);

  const rows =
    statement.items.length > 0
      ? statement.items.map((item, index) => [
          String(index + 1),
          `${kindLabel(item.kind)} - ${item.description}`,
          "1",
          money(item.amount),
          money(item.amount),
        ])
      : [["", "No charges recorded", "", "", money(0)]];

  sheet.grid(["Sl.", "Description", "Qty", "Rate", "Amount"], rows, [36, 268, 48, 86, 86], [false, false, true, true, true]);

  sheet.totals(
    [
      ["Subtotal", money(total)],
      ["Total", money(total)],
      ["Paid", money(0)],
      ["Balance Due", money(total)],
    ],
    "Payment instructions",
    ["Due on receipt."],
  );
  sheet.signOff();
  sheet.tagline("Making Utilities Smarter");

  return sheet.bytes();
}

export async function renderJobCard(card: JobCardDocument) {
  const sheet = await Sheet.create();
  sheet.letterhead("JOB CARD");

  const customer = [
    card.customerName,
    card.address,
    card.customerPhone ? `Mobile: ${card.customerPhone}` : null,
    card.customerEmail ? `Email: ${card.customerEmail}` : null,
  ].filter((line): line is string => Boolean(line));

  sheet.parties("Customer", customer, [
    ["Job :", card.title],
    ["Status :", statusLabel(card.status)],
    ["Opened :", formatDate(card.createdAt, false)],
    ["Assigned :", card.assignedTo || "Unassigned"],
  ]);

  const notes =
    card.notes.length > 0
      ? card.notes.map((note, index) => [
          String(index + 1),
          note.text,
          note.author || (note.source === "voice" ? "Voice" : "Typed"),
          formatDate(note.createdAt, false),
        ])
      : [["", "No notes recorded", "", ""]];

  sheet.grid(["Sl.", "Note", "By", "Date"], notes, [36, 300, 90, 98], [false, false, false, true]);

  const purchases =
    card.purchases.length > 0
      ? card.purchases.map((purchase, index) => [
          String(index + 1),
          purchase.shopName,
          purchase.description,
          formatDate(purchase.purchasedAt, false),
        ])
      : [["", "No purchases linked", "", ""]];

  sheet.heading("Purchases");
  sheet.grid(["Sl.", "Shop", "Description", "Date"], purchases, [36, 130, 260, 98], [false, false, false, true]);

  const invoices =
    card.invoices.length > 0
      ? card.invoices.map((invoice, index) => [String(index + 1), invoice.number, money(invoice.total)])
      : [["", "No invoice yet", ""]];

  sheet.heading("Invoices");
  sheet.grid(["Sl.", "Number", "Total"], invoices, [36, 360, 128], [false, false, true]);
  sheet.signOff();

  return sheet.bytes();
}

class Sheet {
  private page: PDFPage;
  private y: number;

  private constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
    private logo: PDFImage,
  ) {
    this.page = doc.addPage([pageWidth, pageHeight]);
    this.y = pageHeight - 46;
  }

  static async create() {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const logo = await doc.embedPng(readFileSync(join(process.cwd(), "src/assets/uvend-logo.png")));
    return new Sheet(doc, font, bold, logo);
  }

  letterhead(title: string) {
    this.spaced(title, 20, this.bold, blue, 3.2);
    this.y -= 28;

    const blockTop = this.y;
    this.text(issuer.name, margin, this.y, 12, this.bold, blue);
    this.y -= 16;
    for (const line of issuer.lines) {
      this.text(line, margin, this.y, 9, this.font, muted);
      this.y -= 12;
    }
    const leftBottom = this.y;

    const logoWidth = 168;
    const logoHeight = (this.logo.height / this.logo.width) * logoWidth;
    this.page.drawImage(this.logo, {
      x: pageWidth - margin - logoWidth,
      y: blockTop - logoHeight + 12,
      width: logoWidth,
      height: logoHeight,
    });
    this.y = Math.min(leftBottom, blockTop - logoHeight) - 18;
  }

  parties(label: string, lines: string[], facts: [string, string][]) {
    const top = this.y;
    this.text(label, margin, top, 11, this.bold, blue);
    let left = top - 16;
    for (const line of lines) {
      const wrapped = wrap(this.safe(line), this.font, 10, 250);
      for (const row of wrapped) {
        this.text(row, margin, left, 10, this.font, ink);
        left -= 13;
      }
    }

    const labelX = 330;
    const valueRight = pageWidth - margin;
    let right = top;
    for (const [name, value] of facts) {
      this.text(name, labelX, right, 10, this.bold, ink);
      const shown = this.fit(value, this.bold, 10, 120);
      const width = this.bold.widthOfTextAtSize(shown, 10);
      this.page.drawText(shown, {
        x: valueRight - width,
        y: right,
        size: 10,
        font: this.bold,
        color: ink,
      });
      right -= 16;
    }

    this.y = Math.min(left, right) - 18;
  }

  heading(title: string) {
    this.ensure(28);
    this.text(title, margin, this.y, 11, this.bold, blue);
    this.y -= 16;
  }

  grid(headers: string[], rows: string[][], widths: number[], alignRight: boolean[]) {
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    this.drawGridRow(headers, widths, alignRight, 22, true, tableWidth);
    rows.forEach((row, index) => {
      const wrapped = row.map((cell, cellIndex) =>
        wrap(this.safe(cell), this.font, 9, Math.max(12, widths[cellIndex] - 12)),
      );
      const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
      const height = lineCount * 12 + 10;
      this.ensure(height + 4);
      if (index % 2 === 1) {
        this.page.drawRectangle({
          x: margin,
          y: this.y - height + 8,
          width: tableWidth,
          height,
          color: blueWash,
        });
      }
      wrapped.forEach((lines, cellIndex) => {
        const x = margin + widths.slice(0, cellIndex).reduce((sum, width) => sum + width, 0);
        lines.forEach((line, lineIndex) => {
          const size = 9;
          const textWidth = this.font.widthOfTextAtSize(line, size);
          const textX = alignRight[cellIndex] ? x + widths[cellIndex] - 6 - textWidth : x + 6;
          this.page.drawText(line, {
            x: textX,
            y: this.y - lineIndex * 12,
            size,
            font: this.font,
            color: ink,
          });
        });
      });
      this.y -= height;
    });
    this.y -= 16;
  }

  totals(rows: [string, string][], sideTitle: string, sideLines: string[]) {
    const top = this.y;
    this.text(sideTitle, margin, top, 11, this.bold, blue);
    let left = top - 16;
    for (const line of sideLines) {
      this.text(line, margin, left, 10, this.font, ink);
      left -= 14;
    }

    let right = top;
    rows.forEach(([label, value], index) => {
      const emphasize = index === rows.length - 1 || label === "Total";
      const font = emphasize ? this.bold : this.font;
      this.page.drawText(label, {
        x: 360,
        y: right,
        size: 10,
        font,
        color: ink,
      });
      const shown = this.safe(value);
      const width = font.widthOfTextAtSize(shown, 10);
      this.page.drawText(shown, {
        x: pageWidth - margin - width,
        y: right,
        size: 10,
        font,
        color: ink,
      });
      if (label === "Subtotal") {
        this.page.drawLine({
          start: { x: 360, y: right - 6 },
          end: { x: pageWidth - margin, y: right - 6 },
          thickness: 0.6,
          color: rgb(0.75, 0.78, 0.82),
        });
      }
      right -= 16;
    });

    this.y = Math.min(left, right) - 28;
  }

  signOff() {
    this.ensure(70);
    const x = 390;
    this.page.drawLine({
      start: { x, y: this.y },
      end: { x: pageWidth - margin, y: this.y },
      thickness: 0.8,
      color: ink,
    });
    const caption = "Authorized signatory";
    const width = this.font.widthOfTextAtSize(caption, 9);
    this.page.drawText(caption, {
      x: x + (pageWidth - margin - x - width) / 2,
      y: this.y - 14,
      size: 9,
      font: this.font,
      color: muted,
    });
  }

  tagline(value: string) {
    const size = 11;
    const shown = this.safe(value);
    const width = this.bold.widthOfTextAtSize(shown, size);
    this.page.drawText(shown, {
      x: (pageWidth - width) / 2,
      y: 28,
      size,
      font: this.bold,
      color: blue,
    });
  }

  async bytes() {
    return this.doc.save();
  }

  private drawGridRow(
    cells: string[],
    widths: number[],
    alignRight: boolean[],
    height: number,
    header: boolean,
    tableWidth: number,
  ) {
    this.ensure(height + 4);
    if (header) {
      this.page.drawRectangle({
        x: margin,
        y: this.y - height + 10,
        width: tableWidth,
        height,
        color: blueHeader,
      });
    }
    cells.forEach((cell, index) => {
      const x = margin + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
      const size = 9;
      const font = header ? this.bold : this.font;
      const shown = this.safe(cell);
      const textWidth = font.widthOfTextAtSize(shown, size);
      const textX = alignRight[index] ? x + widths[index] - 6 - textWidth : x + 6;
      this.page.drawText(shown, {
        x: textX,
        y: this.y,
        size,
        font,
        color: header ? white : ink,
      });
    });
    this.y -= height;
  }

  private spaced(text: string, size: number, font: PDFFont, color: typeof blue, tracking: number) {
    const chars = [...text];
    const total =
      chars.reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0) + tracking * (chars.length - 1);
    let x = (pageWidth - total) / 2;
    for (const char of chars) {
      this.page.drawText(char, { x, y: this.y, size, font, color });
      x += font.widthOfTextAtSize(char, size) + tracking;
    }
  }

  private text(value: string, x: number, y: number, size: number, font: PDFFont, color: typeof ink) {
    this.page.drawText(this.safe(value), { x, y, size, font, color });
  }

  private ensure(height: number) {
    if (this.y - height > 48) {
      return;
    }
    this.page = this.doc.addPage([pageWidth, pageHeight]);
    this.y = pageHeight - 48;
  }

  private fit(text: string, font: PDFFont, size: number, maxWidth: number) {
    let value = this.safe(text).replace(/\s+/g, " ").trim();
    if (font.widthOfTextAtSize(value, size) <= maxWidth) {
      return value;
    }
    while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
      value = value.slice(0, -1);
    }
    return `${value}...`;
  }

  private safe(text: string) {
    return text
      .replace(/\u2014|\u2013/g, "-")
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201c|\u201d/g, '"')
      .replace(/\u00a0|\u202f/g, " ")
      .replace(/[^\n\x20-\x7e]/g, "");
  }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const pieces = splitWord(word, font, size, maxWidth);
      for (const piece of pieces) {
        const next = current ? `${current} ${piece}` : piece;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          current = next;
        } else {
          if (current) lines.push(current);
          current = piece;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function splitWord(word: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) {
    return [word];
  }
  const parts: string[] = [];
  let current = "";
  for (const char of word) {
    const next = current + char;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export function money(amount: number) {
  const negative = amount < 0;
  const [whole, cents] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}R ${grouped}.${cents}`;
}

export function formatDate(value: Date, withTime = true) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: withTime ? "2-digit" : undefined,
    minute: withTime ? "2-digit" : undefined,
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("day")} ${get("month")} ${get("year")}`;
  return withTime ? `${date}, ${get("hour")}:${get("minute")}` : date;
}

export function kindLabel(kind: string) {
  if (kind === "MATERIALS") return "Materials";
  if (kind === "TOOLS") return "Tools";
  if (kind === "LABOUR") return "Labour";
  return kind;
}

export function statusLabel(status: string) {
  if (status === "TODO") return "To do";
  if (status === "ACTIVE") return "Active";
  if (status === "COMPLETE") return "Complete";
  return status;
}

export function pdfFileName(value: string, fallback: string) {
  const cleaned = value
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${cleaned || fallback}.pdf`;
}
