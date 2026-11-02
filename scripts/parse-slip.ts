import { parseSlipText } from "../src/lib/slip-fields.ts";

const samples = [
  "BUILDERS CEMENT PIPE TOTAL R 500.00 SUBTOTAL R 450.00 REFUND R 20.00 DATE 19/10/2026 TIME 14:32 VISA **** 7377",
  "Amount due 1 250,50 refunds R 0.00 card no 4412 02-11-2026 09:15 spare washers",
  "Amount given: $ 100.00 Token amount $ 100.00 Change:$ 0.00 MUNIX CREDIT TOKEN Meter 58102534326 Utility: Electricity Name: Zaid Test Address Langebaan",
];

const text = process.argv.slice(2).join(" ").trim();
const inputs = text ? [text] : samples;

for (const input of inputs) {
  console.log(input);
  console.log(JSON.stringify(parseSlipText(input), null, 2));
  console.log("");
}
