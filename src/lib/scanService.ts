import { supabase } from "@/lib/supabaseClient";

export async function recordScan(fileName: string): Promise<void> {
  const { error } = await supabase.rpc("check_and_record_scan", { p_file_name: fileName });
  if (error) console.error("Не удалось записать скан в журнал", error);
}
