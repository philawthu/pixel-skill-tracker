// netlify/functions/api-sync.ts
// Netlify Function for cloud sync API (production environment)
// Handles: GET /api/sync, POST /api/sync, GET /api/sync/check

import type { Handler, HandlerEvent } from '@netlify/functions';

// Use pg for PostgreSQL connection
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.USER_POSTGRESQL_URL;
  if (!connectionString) {
    throw new Error('USER_POSTGRESQL_URL not configured');
  }
  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
  return pool;
}

const handler: Handler = async (event: HandlerEvent) => {
  const { httpMethod, queryStringParameters, body, path } = event;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const pgPool = getPool();

    // Route: GET /api/sync/check?deviceId=xxx
    if (httpMethod === 'GET' && path.includes('/check')) {
      const deviceId = queryStringParameters?.deviceId;
      if (!deviceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId required' }) };
      }

      const result = await pgPool.query(
        'SELECT device_id, device_name, data_version, last_synced_at FROM gfi3mpa9ejri_sync_data WHERE device_id = $1',
        [deviceId]
      );

      if (result.rows.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ exists: false }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          exists: true,
          deviceName: result.rows[0].device_name,
          dataVersion: result.rows[0].data_version,
          lastSyncedAt: result.rows[0].last_synced_at,
        }),
      };
    }

    // Route: GET /api/sync?deviceId=xxx
    if (httpMethod === 'GET') {
      const deviceId = queryStringParameters?.deviceId;
      if (!deviceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId required' }) };
      }

      const result = await pgPool.query(
        'SELECT * FROM gfi3mpa9ejri_sync_data WHERE device_id = $1',
        [deviceId]
      );

      if (result.rows.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Device not found', exists: false }) };
      }

      const row = result.rows[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          exists: true,
          data: {
            deviceId: row.device_id,
            deviceName: row.device_name,
            skills: row.skills,
            categories: row.categories,
            checkinRecords: row.checkin_records,
            titleUnlocks: row.title_unlocks,
            equipments: row.equipments,
            courses: row.courses,
            skillReturns: row.skill_returns,
            settings: row.settings,
            dataVersion: row.data_version,
            lastSyncedAt: row.last_synced_at,
            updatedAt: row.updated_at,
          },
        }),
      };
    }

    // Route: POST /api/sync
    if (httpMethod === 'POST') {
      const data = JSON.parse(body || '{}');
      const { deviceId, deviceName, skills, categories, checkinRecords, titleUnlocks, equipments, courses, skillReturns, settings, dataVersion } = data;

      if (!deviceId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'deviceId required' }) };
      }

      const result = await pgPool.query(`
        INSERT INTO gfi3mpa9ejri_sync_data
          (device_id, device_name, skills, categories, checkin_records, title_unlocks, equipments, courses, skill_returns, settings, data_version, last_synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        ON CONFLICT (device_id) DO UPDATE SET
          device_name = EXCLUDED.device_name,
          skills = EXCLUDED.skills,
          categories = EXCLUDED.categories,
          checkin_records = EXCLUDED.checkin_records,
          title_unlocks = EXCLUDED.title_unlocks,
          equipments = EXCLUDED.equipments,
          courses = EXCLUDED.courses,
          skill_returns = EXCLUDED.skill_returns,
          settings = EXCLUDED.settings,
          data_version = EXCLUDED.data_version,
          last_synced_at = now()
        RETURNING data_version, last_synced_at
      `, [
        deviceId,
        deviceName || 'Unknown Device',
        JSON.stringify(skills || []),
        JSON.stringify(categories || []),
        JSON.stringify(checkinRecords || []),
        JSON.stringify(titleUnlocks || []),
        JSON.stringify(equipments || []),
        JSON.stringify(courses || []),
        JSON.stringify(skillReturns || []),
        JSON.stringify(settings || {}),
        dataVersion || 1,
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          dataVersion: result.rows[0].data_version,
          lastSyncedAt: result.rows[0].last_synced_at,
        }),
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('[api-sync] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' }),
    };
  }
};

export { handler };
