import { supabase } from "@/lib/supabaseClient";

export interface ScanStatus {
  can_scan: boolean;
  scans_today: number;
  daily_limit: number;
  is_admin: boolean;
  time_until_reset_hours: number;
  time_until_reset_minutes: number;
}

export async function fetchScanStatus(): Promise<ScanStatus | null> {
  const { data, error } = await supabase.rpc("get_scan_status");
  if (error) return null;
  return data as ScanStatus;
}

export async function recordScanServer(fileName: string): Promise<{ allowed: boolean; reason: string } | null> {
  const { data, error } = await supabase.rpc("check_and_record_scan", { p_file_name: fileName });
  if (error) return null;
  return data as { allowed: boolean; reason: string };
}
