import db from '../database';

export const logActivity = (
  action: string,
  userId?: number,
  organizationId?: number,
  entityType?: string,
  entityId?: number,
  details?: any,
  ipAddress?: string
) => {
  db.run(
    `INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      organizationId || null,
      userId || null,
      action,
      entityType || null,
      entityId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
    ],
    (err) => {
      if (err) {
        console.error('Error logging activity:', err);
      }
    }
  );
};

export const getActivityLogs = (
  organizationId: number,
  limit: number = 50
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT al.*, u.username, u.email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.organization_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [organizationId, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};
