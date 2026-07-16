const loadSheetJS = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () =>
      reject(new Error("Failed to load Excel export library. Check network."));
    document.head.appendChild(script);
  });
};

const flattenRow = (row) => {
  const flat = {};
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) {
      flat[key] = value.join(" | ");
    } else if (
      typeof value === "object" &&
      value !== null &&
      !(value instanceof Date)
    ) {
      flat[key] = JSON.stringify(value);
    } else {
      flat[key] = value;
    }
  }
  return flat;
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates and downloads the export file.
 * @param {Array} data - The raw JSON data from SurrealDB.
 * @param {string} format - 'json', 'csv', or 'xlsx'.
 * @param {Object} config - The module config (used to map DB keys to human-readable labels).
 */
export const generateExportFile = async (data, format, config) => {
  if (!data || data.length === 0)
    throw new Error("No data available to export.");

  const filename = `${config.domain}_export_${new Date().toISOString().split("T")[0]}`;

  if (format === "json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    triggerDownload(blob, `${filename}.json`);
    return;
  }

  const flatData = data.map(flattenRow);
  const rawKeys = Object.keys(flatData[0] || {});

  const getLabel = (key) => {
    const field = config.fields.find((f) => f.id === key);
    return field ? field.label : key;
  };

  if (format === "csv") {
    const csvRows = [rawKeys.map(getLabel).join(",")];
    for (const row of flatData) {
      csvRows.push(rawKeys.map((key) => escapeCSV(row[key])).join(","));
    }
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    triggerDownload(blob, `${filename}.csv`);
    return;
  }

  if (format === "xlsx") {
    const labeledData = flatData.map((row) => {
      const newRow = {};
      for (const key of rawKeys) {
        newRow[getLabel(key)] = row[key];
      }
      return newRow;
    });

    const XLSX = await loadSheetJS();
    const worksheet = XLSX.utils.json_to_sheet(labeledData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return;
  }

  throw new Error(`Unsupported export format: ${format}`);
};
