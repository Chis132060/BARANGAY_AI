import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apps = ["admin-portal", "resident-pwa"];

function parseAttributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([\s\S]*?)"/g)].map((match) => [match[1], match[2]]));
}

function decodeXml(value = "") {
  return value.replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function relatedIssues(name) {
  const value = name.toLowerCase();
  if (value.includes("payment")) return ["A-01", "A-11"];
  if (value.includes("dashboard")) return ["A-04", "A-05", "A-06"];
  if (value.includes("household") || value.includes("resident verification")) return ["A-03", "A-07"];
  if (value.includes("photo") || value.includes("identification image")) return ["A-02", "A-08"];
  if (value.includes("rpc") || value.includes("anonymous")) return ["A-09", "A-10"];
  if (value.includes("refresh token")) return ["A-12"];
  if (value.includes("model") || value.includes("rerank")) return ["A-13"];
  if (value.includes("program")) return ["A-14"];
  return [];
}

function runSuite(app) {
  const appRoot = path.join(root, "apps", app);
  const testRoot = path.join(appRoot, "tests");
  const files = readdirSync(testRoot).filter((file) => /\.test\.(?:mjs|cjs)$/.test(file)).map((file) => path.join("tests", file));
  let xml = "";
  let exitCode = 0;
  try {
    xml = execFileSync(process.execPath, ["--test", "--test-reporter=junit", ...files], { cwd: appRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    xml = String(error.stdout || "");
    exitCode = Number(error.status ?? 1);
  }

  const results = [];
  for (const match of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const attrs = parseAttributes(match[1]);
    const body = match[2] || "";
    const failure = body.match(/<(failure|error)\b([^>]*)>([\s\S]*?)<\/\1>/);
    const skipped = /<skipped\b/.test(body);
    const name = decodeXml(attrs.name || "Unnamed test");
    results.push({
      id: `${app}:${results.length + 1}`,
      suite: app,
      name,
      status: failure ? "FAIL" : skipped ? "SKIP" : "PASS",
      severity: failure ? "High" : "Info",
      durationMs: Math.round(Number(attrs.time || 0) * 1000),
      issues: relatedIssues(name),
      request: null,
      response: null,
      error: failure ? decodeXml(failure[3]).trim() || decodeXml(parseAttributes(failure[2]).message || "Test failed") : null,
      coverageNote: "Node test execution only; code and end-to-end HTTP coverage are not collected by this suite.",
    });
  }
  const failCount = results.filter((result) => result.status === "FAIL").length;
  return { app, status: exitCode === 0 && failCount === 0 ? "PASS" : "FAIL", tests: results.length, passed: results.filter((result) => result.status === "PASS").length, failed: failCount, results };
}

function runApiImportSmoke() {
  const appRoot = path.join(root, "apps", "api");
  const python = process.platform === "win32"
    ? path.join(appRoot, ".venv", "Scripts", "python.exe")
    : path.join(appRoot, ".venv", "bin", "python");
  const started = Date.now();
  if (!existsSync(python)) {
    return { app: "api", status: "SKIP", tests: 1, passed: 0, failed: 0, results: [{
      id: "api:1", suite: "api", name: "FastAPI application imports without downloading AI models", status: "SKIP", severity: "Medium",
      durationMs: null, issues: ["A-13"], request: null, response: null, error: "API virtual environment is not present.",
      coverageNote: "Import smoke test skipped; provision the API virtual environment to run it.",
    }] };
  }
  let status = "PASS";
  let errorMessage = null;
  try {
    execFileSync(python, ["-c", "import main"], { cwd: appRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    status = "FAIL";
    errorMessage = String(error.stderr || error.message || "FastAPI import failed").slice(0, 4000);
  }
  return { app: "api", status, tests: 1, passed: status === "PASS" ? 1 : 0, failed: status === "FAIL" ? 1 : 0, results: [{
    id: "api:1", suite: "api", name: "FastAPI application imports without downloading AI models", status, severity: status === "FAIL" ? "High" : "Info",
    durationMs: Date.now() - started, issues: ["A-13"], request: null, response: null, error: errorMessage,
    coverageNote: "Local application import smoke test only; no HTTP endpoint or database request was made.",
  }] };
}

const suites = [...apps.map(runSuite), runApiImportSmoke()];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "Local Node test suites",
  coverage: { kind: "test execution", note: "No line, API-method, browser, or production coverage is measured by this report." },
  suites,
  results: suites.flatMap((suite) => suite.results),
};
const outputDir = path.join(root, ".test-results");
mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "system-test-report.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${report.results.length} test results (${report.results.filter((result) => result.status === "FAIL").length} failed) to ${path.relative(root, outputPath)}`);
if (suites.some((suite) => suite.status === "FAIL")) process.exitCode = 1;
