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
      essentialInfo: getParsed("life_os_essential_info_v1"),
      financialLogs: getParsed("life_os_financial_logs_v1"),
      assets: getParsed("life_os_assets_v1"),
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
      localStorage.setItem("life_os_essential_info_v1", JSON.stringify(d.essentialInfo));
      totalCount += d.essentialInfo.length;
      if (userId) await saveEssentialInfoToCloud(userId, d.essentialInfo);
    }

    if (Array.isArray(d.financialLogs) && d.financialLogs.length > 0) {
      localStorage.setItem("life_os_financial_logs_v1", JSON.stringify(d.financialLogs));
      totalCount += d.financialLogs.length;
      if (userId) await saveFinancialLogsToCloud(userId, d.financialLogs);
    }

    if (Array.isArray(d.assets) && d.assets.length > 0) {
      localStorage.setItem("life_os_assets_v1", JSON.stringify(d.assets));
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
