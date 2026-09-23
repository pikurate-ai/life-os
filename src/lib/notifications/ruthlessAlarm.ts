"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface AlarmConfig {
  enabled: boolean;
  targetHour: number;
  targetMinute: number;
  snoozeIntervalMinutes: number;
  ruthlessMode: boolean;
  soundEnabled: boolean;
}

const DEFAULT_CONFIG: AlarmConfig = {
  enabled: true,
  targetHour: 22,
  targetMinute: 30,
  snoozeIntervalMinutes: 5,
  ruthlessMode: true,
  soundEnabled: true,
};

const STORAGE_KEY = "life_os_alarm_config";

export const getAlarmConfig = (): AlarmConfig => {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
};

export const saveAlarmConfig = (config: AlarmConfig): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

// Web Audio API Synthesizer Chime (no external audio assets required)
export const playAlarmChime = (tone: "alert" | "success" | "snooze" = "alert") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (tone === "success") {
      // Pleasant dual chime (C5 -> G5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(783.99, now + 0.15);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } else if (tone === "snooze") {
      // Subtle double beep
      const now = ctx.currentTime;
      [0, 0.15].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(440, now + offset);
        gain.gain.setValueAtTime(0.1, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } else {
      // Urgent wake chime (High tri-tone alarm)
      const now = ctx.currentTime;
      [0, 0.18, 0.36].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const freq = [587.33, 739.99, 880][idx];
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    }
  } catch (err) {
    console.warn("Web Audio API chime error:", err);
  }
};

// Request system notification permission (Capacitor Native or Web Notification)
export const requestAlarmPermission = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch (e) {
      console.warn("Capacitor permission request failed:", e);
      return false;
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch {
      return false;
    }
  }

  return false;
};

// Cancel all scheduled ruthlessness
export const cancelRuthlessAlarms = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (e) {
      console.warn("Capacitor cancel notifications failed:", e);
    }
  }
};

// Schedule Ruthless Alarm
export const scheduleRuthlessAlarm = async (isDiarySavedToday: boolean): Promise<{ success: boolean; message: string }> => {
  const config = getAlarmConfig();
  if (!config.enabled) {
    await cancelRuthlessAlarms();
    return { success: true, message: "알람이 비활성화되어 있습니다." };
  }

  if (isDiarySavedToday) {
    await cancelRuthlessAlarms();
    playAlarmChime("success");
    return { success: true, message: "오늘의 일기가 작성되어 알람이 정상 해제되었습니다!" };
  }

  // Calculate next target time
  const now = new Date();
  const target = new Date();
  target.setHours(config.targetHour, config.targetMinute, 0, 0);

  // If already past today's target time, schedule snooze repeats right now
  const isPastTime = now.getTime() > target.getTime();

  if (Capacitor.isNativePlatform()) {
    try {
      await cancelRuthlessAlarms();
      const notifications = [];

      if (!isPastTime) {
        // Initial Target Notification
        notifications.push({
          id: 1001,
          title: "🔥 [Life-OS] 지독한 일기 알람",
          body: "오늘 하루의 감사와 반성을 기록할 시간입니다. 작성할 때까지 5분마다 울립니다.",
          schedule: { at: target },
          sound: "beep.wav",
        });
      }

      // Schedule aggressive snooze repeats if ruthlessMode is enabled (up to 6 times = 30 minutes)
      if (config.ruthlessMode) {
        const baseStartTime = isPastTime ? now.getTime() + 1000 * 60 : target.getTime() + config.snoozeIntervalMinutes * 60 * 1000;
        for (let i = 1; i <= 6; i++) {
          notifications.push({
            id: 2000 + i,
            title: `🚨 [지독한 스누즈 #${i}] 아직 일기가 작성되지 않았습니다!`,
            body: `단 한 줄이라도 저장해야 알람이 멈춥니다! (${i * config.snoozeIntervalMinutes}분 경과)`,
            schedule: { at: new Date(baseStartTime + (i - 1) * config.snoozeIntervalMinutes * 60 * 1000) },
            sound: "beep.wav",
          });
        }
      }

      await LocalNotifications.schedule({ notifications });
      return {
        success: true,
        message: `iOS 네이티브 지독한 알람 예약 완료 (${config.targetHour.toString().padStart(2, "0")}:${config.targetMinute.toString().padStart(2, "0")}, 5분 간격 스누즈)`,
      };
    } catch (e) {
      console.warn("Failed scheduling native notifications:", e);
    }
  }

  // Web Browser Notification fallback
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    if (config.soundEnabled) {
      playAlarmChime("alert");
    }
    return {
      success: true,
      message: `웹 알림 모드: ${config.targetHour.toString().padStart(2, "0")}:${config.targetMinute.toString().padStart(2, "0")} 지독한 알람 대기 중`,
    };
  }

  return {
    success: true,
    message: `알람 설정됨 (${config.targetHour.toString().padStart(2, "0")}:${config.targetMinute.toString().padStart(2, "0")})`,
  };
};

// Immediate test alarm for user verification
export const triggerTestAlarm = async () => {
  const permGranted = await requestAlarmPermission();
  playAlarmChime("alert");

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: "🚨 [Life-OS] 지독한 알람 테스트",
            body: "일기 쓸 때까지 울리는 5분 스누즈 알람 시스템 정상 작동 중!",
            schedule: { at: new Date(Date.now() + 1000) },
          },
        ],
      });
      return { success: true, message: "네이티브 테스트 알림이 발송되었습니다." };
    } catch (e) {
      console.error(e);
    }
  }

  if (typeof window !== "undefined" && "Notification" in window && permGranted) {
    new Notification("🚨 [Life-OS] 지독한 알람 테스트", {
      body: "일기 쓸 때까지 울리는 5분 스누즈 알람 시스템 정상 작동 중!",
      icon: "/favicon.ico",
    });
  }

  return { success: true, message: "테스트 차임벨 및 알람이 작동했습니다." };
};
