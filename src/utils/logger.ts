import { db } from '../db/db';

export async function logActivity(
  username: string,
  action: string,
  module: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
) {
  try {
    await db.auditLogs.add({
      username: username || 'System',
      action,
      timestamp: new Date().toISOString(),
      module,
      severity
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
