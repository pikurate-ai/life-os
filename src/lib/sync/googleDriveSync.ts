/**
 * Google Drive, Sheets, Docs, and Slides Sync Module for Life-OS
 * Supports live CSV fetch from Google Sheets sharing URLs, auto-mapping, deduplication, and Google Docs text parsing.
 */

export interface GoogleSyncResultItem {
  id: string;
  title: string;
  value: string;
  category: "금융" | "운전" | "건강" | "가족" | "업무" | "일상";
  memo?: string;
  source: "google_sheets" | "google_docs" | "google_slides";
}

export const PRESET_GOOGLE_SHEETS = [
  {
    id: "sheet-1",
    name: "기본 정보 1 (주민/계좌/주소)",
    url: "https://docs.google.com/spreadsheets/d/1_Fc7JVHrhmipBzDq-ehuSz1HMifP4mAaBer3BMBnyV4/edit?usp=sharing",
    sheetId: "1_Fc7JVHrhmipBzDq-ehuSz1HMifP4mAaBer3BMBnyV4",
  },
  {
    id: "sheet-2",
    name: "기본 정보 2 (차량/비즈니스/가족)",
    url: "https://docs.google.com/spreadsheets/d/1Kj8cXd9qoZTMi_mxYbNP_PpjE3JIwPHQ6YqbJZZ1cwk/edit?usp=sharing",
    sheetId: "1Kj8cXd9qoZTMi_mxYbNP_PpjE3JIwPHQ6YqbJZZ1cwk",
  },
];

/**
 * Extract Spreadsheet ID from standard Google Drive / Sheets URL
 */
export function extractSpreadsheetId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // If raw ID passed
  if (/^[a-zA-Z0-9-_]{20,}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }
  return null;
}

/**
 * Infer 40s Korean male category from title / header keyword
 */
export function inferCategory(title: string, value: string): "금융" | "운전" | "건강" | "가족" | "업무" | "일상" {
  const combined = `${title} ${value}`.toLowerCase();

  if (
    combined.includes("계좌") ||
    combined.includes("은행") ||
    combined.includes("카드") ||
    combined.includes("급여") ||
    combined.includes("예금") ||
    combined.includes("대출") ||
    combined.includes("증권") ||
    combined.includes("통장") ||
    combined.includes("irp") ||
    combined.includes("연금")
  ) {
    return "금융";
  }

  if (
    combined.includes("차량") ||
    combined.includes("자동차") ||
    combined.includes("면허") ||
    combined.includes("하이패스") ||
    combined.includes("블랙박스") ||
    combined.includes("주차") ||
    combined.includes("주유")
  ) {
    return "운전";
  }

  if (
    combined.includes("혈압") ||
    combined.includes("건강") ||
    combined.includes("병원") ||
    combined.includes("약") ||
    combined.includes("검진") ||
    combined.includes("체중") ||
    combined.includes("1rm") ||
    combined.includes("혈액형")
  ) {
    return "건강";
  }

  if (
    combined.includes("주민") ||
    combined.includes("가족") ||
    combined.includes("자녀") ||
    combined.includes("배우자") ||
    combined.includes("생일") ||
    combined.includes("본적") ||
    combined.includes("비상연락") ||
    combined.includes("아이")
  ) {
    return "가족";
  }

  if (
    combined.includes("사업자") ||
    combined.includes("회사") ||
    combined.includes("법인") ||
    combined.includes("세금") ||
    combined.includes("계산서") ||
    combined.includes("직급") ||
    combined.includes("업무") ||
    combined.includes("사번")
  ) {
    return "업무";
  }

  return "일상";
}

/**
 * Parse CSV text into key-value items
 */
export function parseCsvRows(csvText: string, source: "google_sheets" | "google_docs" | "google_slides"): GoogleSyncResultItem[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const items: GoogleSyncResultItem[] = [];

  lines.forEach((line, idx) => {
    // Basic CSV splitting (handling quoted fields)
    const tokens = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((t) => t.replace(/^"|"$/g, "").trim());
    if (tokens.length < 2) return;

    const title = tokens[0];
    const value = tokens[1];
    const extraMemo = tokens.slice(2).filter(Boolean).join(" | ");

    if (title && value && title !== "항목" && title !== "Title" && title !== "구분") {
      items.push({
        id: `gsync-${idx}-${Date.now()}`,
        title,
        value,
        category: inferCategory(title, value),
        memo: extraMemo || "",
        source,
      });
    }
  });

  return items;
}

/**
 * Fetch live Google Sheet via Google Visualization CSV endpoint (works for any public/view-shared sheet)
 */
export async function fetchLiveGoogleSheet(urlOrId: string): Promise<{ success: boolean; items: GoogleSyncResultItem[]; message: string }> {
  const sheetId = extractSpreadsheetId(urlOrId);
  if (!sheetId) {
    return { success: false, items: [], message: "올바른 구글 시트 URL이나 시트 ID가 아닙니다." };
  }

  // Google Visualization API CSV Export Endpoint
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

  try {
    const res = await fetch(exportUrl, {
      method: "GET",
      headers: { Accept: "text/csv" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: 시트 접근 권한을 확인해주세요 (링크가 있는 모든 사용자 읽기 권한 필요).`);
    }

    const csvData = await res.text();
    const parsed = parseCsvRows(csvData, "google_sheets");

    if (parsed.length === 0) {
      return { success: false, items: [], message: "시트에서 유효한 행 데이터를 추출하지 못했습니다." };
    }

    return {
      success: true,
      items: parsed,
      message: `구글 시트로부터 ${parsed.length}개 항목을 성공적으로 동기화했습니다!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      items: [],
      message: `구글 시트 연동 실패: ${msg}`,
    };
  }
}

/**
 * Parse Google Docs / Slides raw text (colon-delimited or tab-delimited)
 */
export function parseDocsOrSlidesText(rawText: string, source: "google_docs" | "google_slides"): GoogleSyncResultItem[] {
  if (!rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const items: GoogleSyncResultItem[] = [];

  lines.forEach((line, idx) => {
    let title = "";
    let value = "";
    let memo = "";

    if (line.includes("\t")) {
      const parts = line.split("\t");
      title = parts[0]?.trim();
      value = parts[1]?.trim();
      memo = parts.slice(2).join(" ").trim();
    } else if (line.includes(":")) {
      const firstColon = line.indexOf(":");
      title = line.slice(0, firstColon).trim();
      value = line.slice(firstColon + 1).trim();
    } else if (line.includes("-")) {
      const parts = line.split("-");
      if (parts.length >= 2) {
        title = parts[0].trim();
        value = parts.slice(1).join("-").trim();
      }
    }

    if (title && value && title.length < 30) {
      items.push({
        id: `gdoc-${idx}-${Date.now()}`,
        title,
        value,
        category: inferCategory(title, value),
        memo: memo || "",
        source,
      });
    }
  });

  return items;
}
