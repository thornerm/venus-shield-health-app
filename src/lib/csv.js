// Shared CSV export used by the Audit Trail and Reporting screens so every
// download produces identical quoting, headers, and file handling.

function triggerDownload(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rows of raw values -> a quoted CSV file. */
export function downloadCsv(filename, headers, rows) {
  const cell = (c) => `"${String(c ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  triggerDownload(filename, csv);
}

/** A pre-formatted, multi-section report body. */
export function downloadReport(filename, text) {
  triggerDownload(filename, text);
}