# Barangay Policy Documents

This folder contains policy documents that the Smart Barangay AI reads to answer resident questions.

## How to Add Documents

Simply drop any of the following file types into this folder and restart the dev server:

| Format | Support |
|--------|---------|
| `.txt` | ✅ Built-in (no packages needed) |
| `.md`  | ✅ Built-in (no packages needed) |
| `.docx` | ✅ Install `mammoth`: `npm install mammoth` |
| `.pdf`  | ✅ Install `pdf-parse`: `npm install pdf-parse` |

## Installing PDF/DOCX Support

From the `apps/resident-pwa` directory:

```bash
# For DOCX (Word documents)
npm install mammoth

# For PDF
npm install pdf-parse
```

After installing, drop your `.docx` or `.pdf` files here — the AI will automatically read them.

## Current Documents

- `barangay-clearance-policy.txt` — Clearance requirements, fees, and procedures
- `barangay-ordinances.txt` — Curfew, noise, waste management, and other ordinances
- `barangay-document-services.txt` — Full guide to all barangay certificates

## Notes

- Documents are cached for 5 minutes (no restart needed after adding new ones in production)
- The AI uses keyword matching to find the most relevant paragraph from your documents
- Keep document text clear and structured for better AI responses
