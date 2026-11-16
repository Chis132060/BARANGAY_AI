/**
 * Tiny, dependency-free PDF serializer for read-only staff reference exports.
 * The PDF is a GENERATED SUMMARY, not a certified copy or original ordinance.
 * This deliberately handles text only; original signed PDFs stay in Policies.
 */
export type PdfSection = { heading: string; body: string[] };

const W = 595;
const H = 842;
const MARGIN = 48;

function printable(value: string): string {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-").replace(/₱/g, "PHP ")
    .replace(/•/g, "*").replace(/…/g, "...")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    // Core PDF fonts use WinAnsi. Avoid unsupported glyphs in generated exports.
    .replace(/[^\x09\x0A\x20-\x7E]/g, "?");
}

function escapePdf(value: string): string {
  return value.replace(/[\\()]/g, "\\$&");
}

function wrap(text: string, max = 91): string[] {
  const lines: string[] = [];
  for (const original of printable(text).split("\n")) {
    if (!original.trim()) { lines.push(""); continue; }
    let line = "";
    for (const token of original.trim().split(/\s+/)) {
      const pieces = token.match(new RegExp(".{1," + max + "}", "g")) ?? [token];
      for (const part of pieces) {
        if (!line) line = part;
        else if (line.length + part.length + 1 <= max) line += " " + part;
        else { lines.push(line); line = part; }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

type Line = { text: string; kind: "heading" | "normal" | "subtitle" };

export function buildReferenceGuidePdf(
  title: string,
  sections: PdfSection[],
  options?: { subtitle?: string; generatedAt?: string },
): Uint8Array {
  const lines: Line[] = [];
  lines.push({ kind: "heading", text: printable(title).slice(0, 130) });
  if (options?.subtitle) lines.push({ kind: "subtitle", text: printable(options.subtitle) });
  lines.push({ kind: "subtitle", text: "Generated reference only - NOT a signed ordinance, certified copy or legal advice." });
  lines.push({ kind: "subtitle", text: "Check the original official source and current amendments before relying on details." });
  lines.push({ kind: "subtitle", text: "Generated: " + (options?.generatedAt ?? new Date().toISOString().slice(0, 10)) });
  lines.push({ kind: "normal", text: "" });

  for (const section of sections) {
    for (const line of wrap(section.heading, 80)) lines.push({ kind: "heading", text: line });
    for (const paragraph of section.body) {
      for (const line of wrap(paragraph)) lines.push({ kind: "normal", text: line });
      lines.push({ kind: "normal", text: "" });
    }
  }

  const pages: Line[][] = [[]];
  let available = 55;
  for (const line of lines) {
    const cost = line.kind === "heading" ? 23 : line.kind === "subtitle" ? 16 : 13;
    if (available + cost > H - 54) {
      pages.push([]);
      available = 55;
    }
    pages[pages.length - 1].push(line);
    available += cost;
  }

  // PDF 1.4 objects are ASCII-only so xref positions are byte-accurate.
  const objects: string[] = [];
  const add = (o: string) => { objects.push(o); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageIds: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    const commands: string[] = [];
    let y = H - 60;
    for (const line of pages[p]) {
      const font = line.kind === "heading" ? boldId : fontId;
      const size = line.kind === "heading" ? 13 : line.kind === "subtitle" ? 9 : 10;
      if (line.text) commands.push(
        "BT /F" + font + " " + size + " Tf 0.10 0.17 0.27 rg " +
        MARGIN + " " + y.toFixed(2) + " Td (" + escapePdf(line.text) + ") Tj ET",
      );
      y -= line.kind === "heading" ? 23 : line.kind === "subtitle" ? 16 : 13;
    }
    commands.push("BT /F" + fontId + " 8 Tf 0.42 0.48 0.56 rg " +
      MARGIN + " 30 Td (" + escapePdf("Smart Barangay - reference export  |  Page " + (p + 1) + " / " + pages.length) + ") Tj ET");
    const stream = commands.join("\n") + "\n";
    const contentId = add("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
    const pageId = add("<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + W + " " + H + "] " +
      "/Resources << /Font << /F" + fontId + " " + fontId + " 0 R /F" + boldId + " " + boldId + " 0 R >> >> " +
      "/Contents " + contentId + " 0 R >>");
    pageIds.push(pageId);
  }
  objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
  objects[pagesId - 1] = "<< /Type /Pages /Kids [" + pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pages.length + " >>";

  let pdf = "%PDF-1.4\n%SmartBarangay\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xref = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) pdf += offsets[i].toString().padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalogId + " 0 R >>\n" +
    "startxref\n" + xref + "\n%%EOF\n";
  return new TextEncoder().encode(pdf);
}
