"""Build a safe revised copy of the Barangay AI thesis PDF.

The original PDF is preserved byte-for-byte as the first part of the output.
This script appends a formal alignment addendum because a PDF-only source does
not provide reliable editable text/layout for replacing thesis paragraphs.
"""

from io import BytesIO
from pathlib import Path
import sys


PDF_TOOL_DIR = Path(r"C:\Users\donne\AppData\Local\Temp\barangay_ai_pdf_tools")
if str(PDF_TOOL_DIR) not in sys.path:
    sys.path.insert(0, str(PDF_TOOL_DIR))

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\donne\Downloads\Copy of the final Barangay AI - IT32.pdf")
REPO_OUTPUT = ROOT / "docs" / "BARANGAY_AI_CAPSTONE_THESIS_REVISED_WITH_ALIGNMENT_ADDENDUM.pdf"
DOWNLOAD_OUTPUT = Path(r"C:\Users\donne\Downloads\Smart_Barangay_Capstone_Thesis_Revised.pdf")


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=21, leading=26, alignment=TA_CENTER,
            textColor=colors.HexColor("#12355b"), spaceAfter=16,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", parent=base["Normal"], fontName="Helvetica",
            fontSize=11, leading=15, alignment=TA_CENTER,
            textColor=colors.HexColor("#3f4d5a"), spaceAfter=10,
        ),
        "h1": ParagraphStyle(
            "H1", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=16, leading=20, textColor=colors.HexColor("#12355b"),
            spaceBefore=4, spaceAfter=9,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=11, leading=14, textColor=colors.HexColor("#0b6e4f"),
            spaceBefore=7, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["BodyText"], fontName="Helvetica",
            fontSize=9.2, leading=13, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "Small", parent=base["BodyText"], fontName="Helvetica",
            fontSize=7.8, leading=10.5, spaceAfter=3,
        ),
        "center": ParagraphStyle(
            "Center", parent=base["BodyText"], fontName="Helvetica",
            fontSize=9, leading=13, alignment=TA_CENTER,
        ),
        "cell": ParagraphStyle(
            "Cell", parent=base["BodyText"], fontName="Helvetica",
            fontSize=7.5, leading=9.3,
        ),
        "cell_bold": ParagraphStyle(
            "CellBold", parent=base["BodyText"], fontName="Helvetica-Bold",
            fontSize=7.5, leading=9.3,
        ),
    }


def P(text, style):
    return Paragraph(text, style)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d8dee6"))
    canvas.line(0.6 * inch, 0.56 * inch, 7.9 * inch, 0.56 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#66717d"))
    canvas.drawString(0.6 * inch, 0.36 * inch, "Smart Barangay Capstone Thesis - Alignment Revision Addendum")
    canvas.drawRightString(7.9 * inch, 0.36 * inch, f"Addendum page {doc.page}")
    canvas.restoreState()


def table(data, widths, s, header=True):
    converted = []
    for row_index, row in enumerate(data):
        converted.append([
            P(str(value), s["cell_bold"] if header and row_index == 0 else s["cell"])
            for value in row
        ])
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#b8c2cc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12355b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ])
    for i in range(1 if header else 0, len(data)):
        if i % 2 == 0:
            commands.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f4f7fa")))
    t.setStyle(TableStyle(commands))
    return t


def build_addendum():
    s = styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=0.6 * inch, leftMargin=0.6 * inch,
        topMargin=0.58 * inch, bottomMargin=0.72 * inch,
        title="Smart Barangay Capstone Thesis - Alignment Revision Addendum",
        author="Barangay AI project team",
    )
    story = []

    # Page 1: cover and executive decision.
    story += [Spacer(1, 0.45 * inch), P("SMART BARANGAY", s["title"]),
              P("AI-Powered Web and Mobile Services Portal for Barangay Tandang Sora, Butuan City", s["subtitle"]),
              Spacer(1, 0.18 * inch), P("CAPSTONE THESIS ALIGNMENT REVISION ADDENDUM", s["h1"]),
              P("Prepared from the submitted 79-page PDF and the current system code audit. Revision date: 31 August 2026. Repository revision audited: 0d23a14.", s["center"]),
              Spacer(1, 0.28 * inch)]
    story.append(table([
        ["Decision", "Result"],
        ["Overall alignment", "The thesis direction is aligned with the project, but several claims are ahead of the current implementation."],
        ["What this revised copy does", "Preserves all original thesis pages, then appends corrected wording, an implementation matrix, and acceptance requirements."],
        ["Submission warning", "Do not claim payment processing, automatic filled-template generation, push/SMS delivery, permanent session deletion, or completed performance results until evidence exists."],
    ], [1.45 * inch, 5.7 * inch], s))
    story += [Spacer(1, 0.22 * inch), P("How to use this addendum", s["h2"]),
              P("The original pages are intentionally unchanged because no editable DOCX/ODT source was supplied. For the final defense or submission, use the replacement statements on the following pages in the editable manuscript, then export that manuscript as the official final PDF. This merged PDF is a safe review copy and an auditable record of the required changes.", s["body"]),
              P("Basis of review", s["h2"]),
              P("The review compared the thesis objectives, scope, framework, architecture, ERD, methodology, and requirements against the current resident PWA, admin portal, API, Supabase schema, and registration approval flow. The addendum reports only what can be supported by the current code and database design.", s["body"]),
              PageBreak()]

    # Page 2: requirement matrix.
    story += [P("1. Thesis-to-System Alignment Matrix", s["h1"]),
              P("Status meanings: Implemented = visible in code and reasonably testable; Partial = a working fragment exists but the thesis claim is broader; Missing = no complete implementation or evidence was found.", s["body"])]
    story.append(table([
        ["Thesis / requested capability", "Current status", "Required correction"],
        ["Dynamic chatbot form", "PARTIAL", "The chatbot can trigger a basic request card, but it is not yet a document-type-specific dynamic form with required fields, uploads, validation, and structured storage."],
        ["Admin receives requests; one session can contain multiple requests", "PARTIAL / BLOCKED", "Admin request views exist, but the chat message persistence uses a null session link and request-to-resident linkage must be verified against the residents UUID. Add parent session and child request records."],
        ["Ready-for-pickup notification and payment notice", "PARTIAL", "Notification storage/UI exists, but reliable status-triggered delivery and payment-required data are not complete. Add notification events, payment flag/amount, and delivery/read audit."],
        ["Filled template generated from chatbot data", "MISSING", "Implement a document template registry, field mapping, server-side generation, storage, and staff preview before claiming automation."],
        ["Dashboard reports from recorded requests", "PARTIAL", "Request data and dashboard surfaces exist, but a reproducible report-generation/export flow and tested metrics are required."],
        ["Resident registration with staff review/approval", "IMPLEMENTED IN CODE; VERIFY DEPLOYMENT", "The latest code has pending/approved/rejected flow and RLS migration. Apply migration in the target Supabase project and add applicant notifications and audit evidence."],
        ["Clickable questions only when answers are available", "PARTIAL", "Suggested questions are hard-coded. Build suggestions from approved knowledge records and hide questions with no answer/source."],
    ], [2.25 * inch, 1.35 * inch, 3.55 * inch], s))
    story += [Spacer(1, 0.18 * inch), P("Important scope correction", s["h2"]),
              P("The current application is a web/PWA implementation. The thesis should not describe a fully native Android/iOS application unless native builds are actually delivered and tested. The system also has a local knowledge fallback, so RAG answers must be labeled and tested for source provenance.", s["body"]),
              PageBreak()]

    # Page 3: replacement wording.
    story += [P("2. Replacement Statements for the Editable Thesis", s["h1"]),
              P("Insert these statements into the editable thesis sections. They are written to keep the capstone objective while accurately limiting claims to the current build.", s["body"]),
              P("Chapter 1 - Objectives", s["h2"]),
              P("Replace the claim that the system already automates the complete process from submission through completion and delivery with: <i>The system supports digital request submission, staff processing, status tracking, and resident notifications for configured services. Automated document generation, payment processing, and final delivery are target extensions unless they have been implemented and validated in the deployed system.</i>", s["body"]),
              P("Chapter 1 - Scope and Delimitations", s["h2"]),
              P("Use: <i>The resident interface is delivered as a responsive web/PWA experience. The current chatbot supports knowledge-based answers and a basic request-intake form. Service-specific fields, document uploads, generated templates, payment handling, and external SMS/push delivery are included only for services that have a working end-to-end implementation.</i>", s["body"]),
              P("Conceptual Framework / Architecture", s["h2"]),
              P("Replace the unconditional dynamic-form and deletion claims with: <i>The chatbot identifies whether a configured service requires intake data and routes the request to the administrative workflow. Session identity is generated at the client and sent to the API, but persistence, retention, and deletion controls must be explicitly enforced and demonstrated before claiming that conversation data is permanently deleted at interaction end.</i>", s["body"]),
              P("Privacy and Data Protection", s["h2"]),
              P("Use: <i>The system applies role-based access and database row-level security in configured environments. Privacy compliance requires a documented retention policy, access audit, deletion job or procedure, consent language, and verification that chat data is isolated by user and session. These controls should be reported as implemented only after deployment testing.</i>", s["body"]),
              P("Methodology and Evaluation", s["h2"]),
              P("Do not present planned respondent counts, query counts, UAT scores, or performance timings as completed results unless the raw instruments, participants, test runs, and computed results are included. Mark them as proposed evaluation targets until evidence is attached.", s["body"]),
              PageBreak()]

    # Page 4: implementation acceptance.
    story += [P("3. Required Implementation Before Full Thesis Alignment", s["h1"]),
              P("These are the minimum acceptance criteria for changing the status from partial/missing to implemented.", s["body"])]
    story.append(table([
        ["Priority", "Work item", "Acceptance evidence"],
        ["P0", "Fix resident identity and request linkage. Use residents.id for document_requests.resident_id, with a reliable auth-user lookup.", "A resident submits a request; the same request appears for the correct resident and admin after refresh."],
        ["P0", "Persist every chatbot message under chat_sessions.id and enforce session ownership.", "Database rows contain the session ID; another user cannot read the session; multi-request session test passes."],
        ["P0", "Define retention/deletion behavior for chat sessions and messages.", "Policy, migration/job or documented deletion procedure, and a test showing the expected retention result."],
        ["P0", "Implement service-specific dynamic forms with schema, required fields, validation, and optional document upload.", "At least the defended services produce structured, validated request data."],
        ["P1", "Add request status events, ready-for-pickup notifications, and payment-required/amount fields.", "Approved/released status creates a notification; payment-required cases clearly show amount and next action."],
        ["P1", "Implement filled-template generation with versioned templates and staff preview.", "Generated file contains the submitted resident values and is linked to the request."],
        ["P1", "Replace hard-coded suggested questions with approved-knowledge availability checks.", "Unavailable topics do not appear as clickable questions; each shown question has a traceable answer source."],
        ["P1", "Deliver dashboard report generation/export from recorded transactions and requests.", "Date-filtered counts and downloadable report match database fixtures."],
        ["P1", "Add applicant approval/rejection notification and complete audit trail.", "Applicant sees the result and reason; staff action records actor, time, and decision."],
    ], [0.45 * inch, 3.0 * inch, 3.7 * inch], s))
    story += [Spacer(1, 0.18 * inch), P("Payment boundary", s["h2"]),
              P("The thesis requirement says residents should be notified when documents are ready and should be told when payment is required. This does not necessarily require online payment collection. A validated first release may record payment required, amount, payment status, and the in-person payment instruction, provided the thesis clearly says online payment is out of scope.", s["body"]),
              PageBreak()]

    # Page 5: testing/evidence.
    story += [P("4. Verification and Defense Evidence", s["h1"]),
              P("The following evidence should accompany the revised manuscript so that the claims are defensible during capstone review.", s["body"])]
    story.append(table([
        ["Area", "Minimum test", "Evidence to attach"],
        ["Registration approval", "Register, reject, approve, and log in with each resulting state.", "Screenshots, database rows, RLS policy/migration version, and audit log."],
        ["Chatbot answers", "Ask each clickable question and one unsupported question.", "Question inventory, answer source/citation, fallback behavior, and answerability rule."],
        ["Multiple requests", "Create two document requests in one chat session and one in a new session.", "Session/request relational records and admin queue screenshots."],
        ["Documents and payment", "Process a free service and a payment-required service.", "Generated/attached document, payment flag/amount/status, and resident notification."],
        ["Reports", "Seed known records, filter a date range, export, and reconcile totals.", "Exported report plus reconciliation table."],
        ["Privacy", "Attempt cross-user access and execute the retention/deletion procedure.", "Denied-access result, retention configuration, and deletion verification."],
        ["Performance/UAT", "Run the stated sample sizes only if actually completed.", "Raw test data, procedure, date, participants, timings, and computed statistics."],
    ], [1.25 * inch, 2.6 * inch, 3.3 * inch], s))
    story += [Spacer(1, 0.2 * inch), P("Recommended thesis wording for results", s["h2"]),
              P("Report measured results separately from target requirements. A feature should be labeled implemented only when the deployed build, database state, and user-visible result agree. If a feature is planned, label it as a limitation or future enhancement rather than presenting it as an achieved output.", s["body"]),
              P("Alignment conclusion", s["h2"]),
              P("The project has a credible foundation for the proposed Smart Barangay system, including resident/admin portals, authentication, an approval workflow in the latest code, a chatbot route, request storage, and dashboard surfaces. Full thesis alignment still depends on completing the end-to-end service workflow and producing the verification evidence listed above.", s["body"]),
              PageBreak()]

    # Page 6: audit basis/signoff.
    story += [P("5. Revision Record and Sign-off", s["h1"]),
              P("This page records what was changed in this review copy and what remains the responsibility of the development team before submission.", s["body"])]
    story.append(table([
        ["Item", "Record"],
        ["Source reviewed", "Copy of the final Barangay AI - IT32.pdf (79 pages), supplied from the Downloads folder."],
        ["System revision reviewed", "Branch fix/sync-admin-resident-supabase at revision 0d23a14, synchronized with origin/main at the time of audit."],
        ["PDF change", "Original thesis pages preserved; this six-page alignment addendum appended to the end of the new PDF copy."],
        ["Primary correction", "Separates implemented, partial, missing, and planned capabilities so the thesis does not overclaim the current build."],
        ["Editable-source requirement", "For true in-place paragraph replacement, edit the original DOCX/ODT manuscript using the replacement statements in Section 2, then export a new official PDF."],
    ], [1.8 * inch, 5.35 * inch], s))
    story += [Spacer(1, 0.3 * inch), P("Approval checklist", s["h2"]),
              P("[ ] Adviser reviewed the corrected scope and objectives", s["body"]),
              P("[ ] Development team completed or explicitly removed each missing feature claim", s["body"]),
              P("[ ] Database migrations and RLS policies were applied in the target environment", s["body"]),
              P("[ ] End-to-end test evidence is attached to the final manuscript", s["body"]),
              P("[ ] Final thesis was exported from the editable source after these revisions", s["body"]),
              Spacer(1, 0.25 * inch),
              P("Prepared for capstone alignment review", s["center"])]

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def merge(source: Path, output: Path):
    if not source.exists():
        raise FileNotFoundError(f"Source thesis not found: {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    addendum = build_addendum()
    original = PdfReader(str(source))
    appendix = PdfReader(BytesIO(addendum))
    writer = PdfWriter()
    for page in original.pages:
        writer.add_page(page)
    for page in appendix.pages:
        writer.add_page(page)
    writer.add_metadata({
        "/Title": "Smart Barangay Capstone Thesis - Revised with Alignment Addendum",
        "/Subject": "Capstone thesis alignment revision",
        "/Producer": "Barangay AI project team",
    })
    with output.open("wb") as handle:
        writer.write(handle)


def main():
    merge(SOURCE, REPO_OUTPUT)
    merge(SOURCE, DOWNLOAD_OUTPUT)
    original_pages = len(PdfReader(str(SOURCE)).pages)
    revised_pages = len(PdfReader(str(REPO_OUTPUT)).pages)
    print(f"Source pages: {original_pages}")
    print(f"Revised pages: {revised_pages}")
    print(f"Repository output: {REPO_OUTPUT}")
    print(f"Downloads output: {DOWNLOAD_OUTPUT}")


if __name__ == "__main__":
    main()
