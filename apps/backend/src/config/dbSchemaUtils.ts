import type {PoolConnection, RowDataPacket} from 'mysql2/promise';

export async function tableHasColumn(
  connection: PoolConnection,
  table: string,
  column: string
): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}
