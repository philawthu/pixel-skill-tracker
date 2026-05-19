// src/cloudSync.ts
// Cloud sync service — handles device ID generation, data upload/download

import type { Skill, SkillCategory, CheckinRecord, TitleUnlock, Equipment, Course, SkillReturn } from './types';

// ============================================================
// Device ID Management
// ============================================================

const DEVICE_ID_KEY = 'pixel-device-id';
const DEVICE_NAME_KEY = 'pixel-device-name';
const SYNC_VERSION_KEY = 'pixel-sync-version';
const LAST_SYNC_KEY = 'pixel-last-sync';

/** Generate a short, human-readable device code (8 chars) */
function generateDeviceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I/L)
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Get or create the device ID */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Get the device name */
export function getDeviceName(): string {
  return localStorage.getItem(DEVICE_NAME_KEY) || getDefaultDeviceName();
}

/** Set the device name */
export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

function getDefaultDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Browser';
}

/** Get last sync version */
export function getSyncVersion(): number {
  return parseInt(localStorage.getItem(SYNC_VERSION_KEY) || '0', 10);
}

/** Get last sync time */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

// ============================================================
// API Base URL Detection
// ============================================================

function getApiBaseUrl(): string {
  // Both dev (Vite middleware) and prod (Netlify redirects) use same path
  return '';
}

// ============================================================
// Sync Operations
// ============================================================

export interface SyncData {
  skills: Skill[];
  categories: SkillCategory[];
  checkinRecords: CheckinRecord[];
  titleUnlocks: TitleUnlock[];
  equipments: Equipment[];
  courses: Course[];
  skillReturns: SkillReturn[];
  settings: {
    farmName?: string;
    userName?: string;
  };
}

export interface SyncResult {
  success: boolean;
  error?: string;
  lastSyncedAt?: string;
  dataVersion?: number;
}

export interface CloudData extends SyncData {
  deviceId: string;
  deviceName: string;
  dataVersion: number;
  lastSyncedAt: string;
  updatedAt: string;
}

export interface DeviceCheckResult {
  exists: boolean;
  deviceName?: string;
  dataVersion?: number;
  lastSyncedAt?: string;
}

/** Upload local data to cloud */
export async function uploadToCloud(data: SyncData): Promise<SyncResult> {
  const baseUrl = getApiBaseUrl();
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();
  const version = getSyncVersion() + 1;

  try {
    const response = await fetch(`${baseUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        deviceName,
        skills: data.skills,
        categories: data.categories,
        checkinRecords: data.checkinRecords,
        titleUnlocks: data.titleUnlocks,
        equipments: data.equipments,
        courses: data.courses,
        skillReturns: data.skillReturns,
        settings: data.settings,
        dataVersion: version,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${response.status}` };
    }

    const result = await response.json();

    // Save sync metadata locally
    localStorage.setItem(SYNC_VERSION_KEY, String(result.dataVersion || version));
    localStorage.setItem(LAST_SYNC_KEY, result.lastSyncedAt || new Date().toISOString());

    return {
      success: true,
      lastSyncedAt: result.lastSyncedAt,
      dataVersion: result.dataVersion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/** Download data from cloud by device ID */
export async function downloadFromCloud(deviceId: string): Promise<{ success: boolean; data?: CloudData; error?: string }> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/sync?deviceId=${encodeURIComponent(deviceId)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Device code not found. Please check and try again.' };
      }
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    if (!result.exists) {
      return { success: false, error: 'Device code not found.' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/** Check if a device code exists in the cloud */
export async function checkDeviceExists(deviceId: string): Promise<DeviceCheckResult> {
  const baseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/api/sync/check?deviceId=${encodeURIComponent(deviceId)}`);
    if (!response.ok) {
      return { exists: false };
    }
    return await response.json();
  } catch {
    return { exists: false };
  }
}

/** Set a custom device ID (for restoring from another device) */
export function setDeviceId(id: string): void {
  localStorage.setItem(DEVICE_ID_KEY, id.toUpperCase().trim());
}
