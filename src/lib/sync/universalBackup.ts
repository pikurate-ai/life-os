/**
 * Universal Raw Data Backup, Restore & Cross-Sync Module for Life-OS
 * Consolidates all 7 domain datasets into a single JSON artifact and enables 1-click cloud & local sync.
 */

import {
  saveEssentialInfoToCloud,
  loadEssentialInfoFromCloud,
  saveFinancialLogsToCloud,
  loadFinancialLogsFromCloud,
  saveAssetsToCloud,
  loadAssetsFromCloud,
  saveVaultToCloud,
  loadVaultFromCloud,
  saveWorkout1RMToCloud,
  loadWorkout1RMFromCloud,
  saveHealthMetricsToCloud,
  loadHealthMetricsFromCloud,
  saveArchivedDiariesToCloud,
  loadArchivedDiariesFromCloud,
} from "@/lib/firebase/client";

export interface LifeOSBackupPackage {
  version: string;
  exportedAt: string;
  app: "Life-OS";
  data: {
    essentialInfo: any[];
    financialLogs: any[];
    assets: any[];
    encryptedVault: any[];
    workout1RM: any[];
    healthMetrics: any[];
    archivedDiaries: any[];
    alarmConfig?: any;
    healthKitData?: any;
  };
}

/**
 * Collect all data from localStorage into a single raw backup package
 */
export function exportAllLocalData(): LifeOSBackupPackage {
  const getParsed = (key: string, fallback: any = []) => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  return {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    app: "Life-OS",
    data: {
      essentialInfo: getParsed("life_os_essential_items_v2"),
      financialLogs: getParsed("life_os_financial_logs_v2"),
      assets: getParsed("life_os_assets_v2"),
      encryptedVault: getParsed("life_os_encrypted_vault_v2"),
      workout1RM: getParsed("life_os_workout_1rm_v1"),
      healthMetrics: getParsed("life_os_body_metrics_v1"),
      archivedDiaries: getParsed("life_os_archived_diaries_v1"),
      alarmConfig: getParsed("life_os_alarm_config", null),
      healthKitData: getParsed("life_os_healthkit_data", null),
    },
  };
}

/**
 * Generate Excel-compatible UTF-8 BOM CSV data from all Life-OS local domains
 */
export function generateExcelCSV(): string {
  const backup = exportAllLocalData();
  const d = backup.data;
  const lines: string[] = [];

  // UTF-8 BOM for seamless Excel Korean display
  const BOM = "\uFEFF";

  lines.push(`=== [Life-OS Master Excel Backup] ===`);
  lines.push(`백업 일시: ${new Date().toLocaleString("ko-KR")}`);
  lines.push(`수신자: imidoing@naver.com\n`);

  // 1. 필수 정보 (1초 복사)
  lines.push(`[1. 필수 정보 (1초 복사 메모장)]`);
  lines.push(`ID,카테고리,제목,값,메모,조회수`);
  if (Array.isArray(d.essentialInfo)) {
    d.essentialInfo.forEach((item: any) => {
      const cat = `"${(item.category || "").replace(/"/g, '""')}"`;
      const title = `"${(item.title || "").replace(/"/g, '""')}"`;
      const val = `"${(item.value || "").replace(/"/g, '""')}"`;
      const memo = `"${(item.memo || "").replace(/"/g, '""')}"`;
      lines.push(`${item.id || ""},${cat},${title},${val},${memo},${item.clickCount || 0}`);
    });
  }
  lines.push(`\n`);

  // 2. 가계부 지출 내역
  lines.push(`[2. 가계부 지출 내역]`);
  lines.push(`일시,가맹점/내역,금액(원),결제수단,카테고리,비고`);
  if (Array.isArray(d.financialLogs)) {
    d.financialLogs.forEach((tx: any) => {
      const merchant = `"${(tx.merchant || tx.title || "").replace(/"/g, '""')}"`;
      const category = `"${(tx.category || "").replace(/"/g, '""')}"`;
      const method = `"${(tx.paymentMethod || "").replace(/"/g, '""')}"`;
      lines.push(`${tx.date || ""},${merchant},${tx.amount || 0},${method},${category},"${(tx.memo || "").replace(/"/g, '""')}"`);
    });
  }
  lines.push(`\n`);

  // 3. 자산 현황
  lines.push(`[3. 자산 현황]`);
  lines.push(`자산명,분류,평가금액(원),금융기관/비고`);
  if (Array.isArray(d.assets)) {
    d.assets.forEach((asset: any) => {
      const name = `"${(asset.name || asset.title || "").replace(/"/g, '""')}"`;
      const type = `"${(asset.type || asset.category || "").replace(/"/g, '""')}"`;
      const inst = `"${(asset.institution || asset.memo || "").replace(/"/g, '""')}"`;
      lines.push(`${name},${type},${asset.amount || asset.value || 0},${inst}`);
    });
  }
  lines.push(`\n`);

  // 4. 지독한 일기 히스토리
  lines.push(`[4. 지독한 감사 일기 히스토리]`);
  lines.push(`날짜,기분(척도),일기 본문`);
  if (Array.isArray(d.archivedDiaries)) {
    d.archivedDiaries.forEach((diary: any) => {
      const content = `"${(diary.text || diary.content || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      lines.push(`${diary.date || ""},${diary.mood || ""},${content}`);
    });
  }
  lines.push(`\n`);

  // 5. 헬스 1RM 및 신체지표
  lines.push(`[5. 헬스 1RM 및 신체지표]`);
  lines.push(`종목/항목,수치(kg/횟수),측정일자,메모`);
  if (Array.isArray(d.workout1RM)) {
    d.workout1RM.forEach((w: any) => {
      lines.push(`1RM-${w.exercise || ""},${w.calculated1RM || w.weight || 0}kg,${w.date || ""},"${(w.notes || "").replace(/"/g, '""')}"`);
    });
  }
  if (Array.isArray(d.healthMetrics)) {
    d.healthMetrics.forEach((m: any) => {
      lines.push(`체중,${m.weight}kg,${m.date || ""},"골격근 ${m.muscleMass || 0}kg / 체지방 ${m.fatRatio || 0}%"`);
    });
  }

  return BOM + lines.join("\r\n");
}

/**
 * Trigger immediate browser download of the entire raw JSON backup
 */
export function downloadBackupFile(): void {
  const backup = exportAllLocalData();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-os-raw-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger immediate browser download of the Excel backup file (.csv)
 */
export function downloadExcelBackupFile(): void {
  const csvContent = generateExcelCSV();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `life-os-monthly-backup-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger Monthly Backup & Email Dispatch to imidoing@naver.com
 */
export async function sendMonthlyBackupEmail(targetEmail: string = "imidoing@naver.com"): Promise<{ success: boolean; message: string }> {
  // 1. Download Excel file immediately
  downloadExcelBackupFile();

  // 2. Prepare mailto link with summary
  const backup = exportAllLocalData();
  const d = backup.data;
  const dateStr = new Date().toISOString().split("T")[0];
  const subject = encodeURIComponent(`[Life-OS 월간 데이터 백업] ${dateStr} 전체 데이터 보고서`);
  const bodyText = `안녕하세요, Life-OS 월간 자동 백업 보고서입니다.

■ 백업 일시: ${new Date().toLocaleString("ko-KR")}
■ 수신 대상: ${targetEmail}

[도메인별 백업 통계]
• 1초 복사 메모: ${d.essentialInfo?.length || 0}개
• 가계부 지출 내역: ${d.financialLogs?.length || 0}건
• 자산 항목: ${d.assets?.length || 0}개
• 지독한 일기: ${d.archivedDiaries?.length || 0}편
• 헬스 1RM 기록: ${d.workout1RM?.length || 0}개
• 신체 지표 기록: ${d.healthMetrics?.length || 0}개

다운로드 폴더에 자동 저장된 'life-os-monthly-backup-${dateStr}.csv' 엑셀 백업 파일을 확인해 주세요.
`;
  const body = encodeURIComponent(bodyText);

  // 3. Try Web Share API with file if supported on Mobile
  if (typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator) {
    try {
      const csvContent = generateExcelCSV();
      const file = new File([csvContent], `life-os-monthly-backup-${dateStr}.csv`, { type: "text/csv" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Life-OS 엑셀 백업 (${dateStr})`,
          text: `imidoing@naver.com으로 발송할 Life-OS 월간 엑셀 백업 파일입니다.`,
          files: [file],
        });
        return { success: true, message: "모바일 이메일/앱으로 엑셀 파일 공유가 실행되었습니다!" };
      }
    } catch {
      // fallback to mailto
    }
  }

  // Fallback to mailto link
  const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, "_blank");

  return {
    success: true,
    message: `엑셀 백업 파일이 다운로드되었으며, ${targetEmail} 메일 전송 창이 열렸습니다!`,
  };
}

/**
 * Restore from JSON backup and sync to LocalStorage and Cloud Firestore (if logged in)
 */
export async function restoreFromBackup(
  backup: LifeOSBackupPackage,
  userId?: string
): Promise<{ success: boolean; message: string; count: number }> {
  if (!backup || !backup.data) {
    return { success: false, message: "유효하지 않은 백업 파일 형식입니다.", count: 0 };
  }

  const d = backup.data;
  let totalCount = 0;

  try {
    if (Array.isArray(d.essentialInfo) && d.essentialInfo.length > 0) {
      localStorage.setItem("life_os_essential_items_v2", JSON.stringify(d.essentialInfo));
      totalCount += d.essentialInfo.length;
      if (userId) await saveEssentialInfoToCloud(userId, d.essentialInfo);
    }

    if (Array.isArray(d.financialLogs) && d.financialLogs.length > 0) {
      localStorage.setItem("life_os_financial_logs_v2", JSON.stringify(d.financialLogs));
      totalCount += d.financialLogs.length;
      if (userId) await saveFinancialLogsToCloud(userId, d.financialLogs);
    }

    if (Array.isArray(d.assets) && d.assets.length > 0) {
      localStorage.setItem("life_os_assets_v2", JSON.stringify(d.assets));
      totalCount += d.assets.length;
      if (userId) await saveAssetsToCloud(userId, d.assets);
    }

    if (Array.isArray(d.encryptedVault) && d.encryptedVault.length > 0) {
      localStorage.setItem("life_os_encrypted_vault_v2", JSON.stringify(d.encryptedVault));
      totalCount += d.encryptedVault.length;
      if (userId) await saveVaultToCloud(userId, d.encryptedVault);
    }

    if (Array.isArray(d.workout1RM) && d.workout1RM.length > 0) {
      localStorage.setItem("life_os_workout_1rm_v1", JSON.stringify(d.workout1RM));
      totalCount += d.workout1RM.length;
      if (userId) await saveWorkout1RMToCloud(userId, d.workout1RM);
    }

    if (Array.isArray(d.healthMetrics) && d.healthMetrics.length > 0) {
      localStorage.setItem("life_os_body_metrics_v1", JSON.stringify(d.healthMetrics));
      totalCount += d.healthMetrics.length;
      if (userId) await saveHealthMetricsToCloud(userId, d.healthMetrics);
    }

    if (Array.isArray(d.archivedDiaries) && d.archivedDiaries.length > 0) {
      localStorage.setItem("life_os_archived_diaries_v1", JSON.stringify(d.archivedDiaries));
      totalCount += d.archivedDiaries.length;
      if (userId) await saveArchivedDiariesToCloud(userId, d.archivedDiaries);
    }

    if (d.alarmConfig) {
      localStorage.setItem("life_os_alarm_config", JSON.stringify(d.alarmConfig));
    }

    if (d.healthKitData) {
      localStorage.setItem("life_os_healthkit_data", JSON.stringify(d.healthKitData));
    }

    return {
      success: true,
      message: `성공적으로 ${totalCount}개 로우 데이터를 복원하고 클라우드에 적재했습니다.`,
      count: totalCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `데이터 복원 중 오류 발생: ${msg}`,
      count: totalCount,
    };
  }
}
