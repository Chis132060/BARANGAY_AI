/**
 * GET /api/policies
 * Reads all policy documents from /public/documents/ and returns their content.
 * Supports: .txt, .md (native), .docx (via mammoth if installed), .pdf (via pdf-parse if installed).
 * Admins can drop real PDF or DOCX files into /public/documents/ and the AI will pick them up automatically.
 */

import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "public", "documents");

async function extractText(filePath: string, ext: string): Promise<string> {
  if (ext === ".txt" || ext === ".md") {
    return await readFile(filePath, "utf-8");
  }

  if (ext === ".docx") {
    try {
      // mammoth is optional — install with: npm install mammoth
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch {
      return ""; // mammoth not installed, skip
    }
  }

  if (ext === ".pdf") {
    try {
      // pdf-parse is optional — install with: npm install pdf-parse
      const pdfParse = (await import("pdf-parse")).default;
      const fileBuffer = await readFile(filePath);
      const result = await pdfParse(fileBuffer);
      return result.text;
    } catch {
      return ""; // pdf-parse not installed, skip
    }
  }

  return "";
}

export async function GET() {
  try {
    const files = await readdir(DOCS_DIR);
    const sections: string[] = [];

    for (const fileName of files) {
      const ext = path.extname(fileName).toLowerCase();
      if (![".txt", ".md", ".docx", ".pdf"].includes(ext)) continue;

      const filePath = path.join(DOCS_DIR, fileName);
      const text = await extractText(filePath, ext);

      if (text.trim()) {
        const displayName = fileName.replace(/\.[^.]+$/, "").replace(/-/g, " ").toUpperCase();
        sections.push(`\n\n=== DOCUMENT: ${displayName} ===\n${text.trim()}`);
      }
    }

    const combined = sections.join("\n\n");

    return NextResponse.json(
      { content: combined, documentCount: sections.length },
      {
        headers: {
          // Cache for 5 minutes — documents rarely change
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err: any) {
    console.error("[Policies API] Error reading documents:", err);
    return NextResponse.json({ content: "", documentCount: 0 });
  }
}
