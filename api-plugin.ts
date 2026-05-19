// server/api-plugin.ts
// Vite plugin that provides /api/sync endpoints for cloud data sync
// All side effects (DB connections) are ONLY in configureServer (dev mode only)

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

export function apiSyncPlugin(): Plugin {
  return {
    name: 'api-sync-plugin',
    configureServer(server) {
      // Load .env.local for database connection
      const envLocalPath = join(process.cwd(), '.env.local');
      if (existsSync(envLocalPath)) {
        config({ path: envLocalPath, override: true });
      }

      // Lazy-load pg using dynamic import (ESM compatible)
      let pgPool: import('pg').Pool | null = null;
      let poolPromise: Promise<import('pg').Pool> | null = null;

      async function getPool(): Promise<import('pg').Pool> {
        if (pgPool) return pgPool;
        if (poolPromise) return poolPromise;

        poolPromise = (async () => {
          const pg = await import('pg');
          const connectionString = process.env.USER_POSTGRESQL_URL;
          if (!connectionString) {
            throw new Error('USER_POSTGRESQL_URL not configured');
          }
          pgPool = new pg.default.Pool({
            connectionString,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
          });
          return pgPool;
        })();
        return poolPromise;
      }

      function parseBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => resolve(body));
          req.on('error', reject);
        });
      }

      function sendJSON(res: ServerResponse, status: number, data: unknown) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Only handle /api/sync routes
        if (!url.startsWith('/api/sync')) {
          return next();
        }

        try {
          const pool = await getPool();

          // GET /api/sync?deviceId=xxx — Fetch data for a device
          if (req.method === 'GET' && url.startsWith('/api/sync?')) {
            const params = new URLSearchParams(url.split('?')[1]);
            const deviceId = params.get('deviceId');

            if (!deviceId) {
              return sendJSON(res, 400, { error: 'deviceId required' });
            }

            const result = await pool.query(
              'SELECT * FROM gfi3mpa9ejri_sync_data WHERE device_id = $1',
              [deviceId]
            );

            if (result.rows.length === 0) {
              return sendJSON(res, 404, { error: 'Device not found', exists: false });
            }

            const row = result.rows[0];
            return sendJSON(res, 200, {
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
              }
            });
          }

          // POST /api/sync — Upload/sync data
          if (req.method === 'POST' && url === '/api/sync') {
            const body = JSON.parse(await parseBody(req));
            const { deviceId, deviceName, skills, categories, checkinRecords, titleUnlocks, equipments, courses, skillReturns, settings, dataVersion } = body;

            if (!deviceId) {
              return sendJSON(res, 400, { error: 'deviceId required' });
            }

            // Upsert: insert or update on conflict
            const result = await pool.query(`
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
              dataVersion || 1
            ]);

            return sendJSON(res, 200, {
              success: true,
              dataVersion: result.rows[0].data_version,
              lastSyncedAt: result.rows[0].last_synced_at,
            });
          }

          // GET /api/sync/check?deviceId=xxx — Quick check if device exists
          if (req.method === 'GET' && url.startsWith('/api/sync/check?')) {
            const params = new URLSearchParams(url.split('?')[1]);
            const deviceId = params.get('deviceId');

            if (!deviceId) {
              return sendJSON(res, 400, { error: 'deviceId required' });
            }

            const result = await pool.query(
              'SELECT device_id, device_name, data_version, last_synced_at FROM gfi3mpa9ejri_sync_data WHERE device_id = $1',
              [deviceId]
            );

            if (result.rows.length === 0) {
              return sendJSON(res, 200, { exists: false });
            }

            return sendJSON(res, 200, {
              exists: true,
              deviceName: result.rows[0].device_name,
              dataVersion: result.rows[0].data_version,
              lastSyncedAt: result.rows[0].last_synced_at,
            });
          }

          return sendJSON(res, 404, { error: 'Not found' });
        } catch (error) {
          console.error('[api-sync] Error:', error);
          return sendJSON(res, 500, { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
        }
      });
    }
  };
}
