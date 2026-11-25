export function parseSlipAmount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/[^\d,.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") {
    return null;
  }

  let normalized = cleaned;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized =
      cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export function formatRand(amount: number) {
  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}R ${grouped}.${fraction}`;
}

export function purchaseValue(purchase: { slipTotal: string | null; slipAmount: string | null }) {
  return parseSlipAmount(purchase.slipTotal) ?? parseSlipAmount(purchase.slipAmount);
}

export function purchaseMoneyLabel(purchase: { slipTotal: string | null; slipAmount: string | null }) {
  const amount = purchaseValue(purchase);

  if (amount != null) {
    return formatRand(amount);
  }

  return purchase.slipTotal?.trim() || purchase.slipAmount?.trim() || "—";
}

export function purchaserName(user: { name: string | null; username: string | null } | null | undefined) {
  return user?.name?.trim() || user?.username || "Unassigned";
}

export function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "?";
}

export function roleLabel(role: string | null | undefined) {
  if (role === "ADMIN") {
    return "Administrator";
  }

  if (role === "INSTALLER") {
    return "Installer";
  }

  if (role === "USER") {
    return "User";
  }

  return "Staff";
}

export function shortRef(id: string) {
  return id.slice(-6).toUpperCase();
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatPurchaseWhen(value: string) {
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const time = new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (date >= startToday) {
    return `Today, ${time}`;
  }

  if (date >= startYesterday) {
    return `Yesterday, ${time}`;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
