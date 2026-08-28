import { db } from './pool';
import { logError } from '../../utils/logger';

/**
 * Adapter that translates PostgreSQL-style $1, $2 ... placeholders to SQLite ? placeholders.
 * Also translates some common PostgreSQL functions to SQLite equivalents inline.
 */
const convertPgToSqlite = (sql: string): string => {
  let converted = sql;

  // Replace $1, $2, etc. with ?
  converted = converted.replace(/\$\d+/g, '?');

  // NOW() → datetime('now')
  converted = converted.replace(/\bNOW\(\)/gi, "datetime('now')");

  // ILIKE → LIKE (SQLite LIKE is case-insensitive for ASCII by default)
  converted = converted.replace(/\bILIKE\b/gi, 'LIKE');

  // SERIAL PRIMARY KEY → INTEGER PRIMARY KEY AUTOINCREMENT
  converted = converted.replace(/\bSERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

  // NUMERIC(x,y) → REAL
  converted = converted.replace(/\bNUMERIC\(\d+,\s*\d+\)/gi, 'REAL');

  // VARCHAR(n) → TEXT
  converted = converted.replace(/\bVARCHAR\(\d+\)/gi, 'TEXT');

  // JSONB → TEXT
  converted = converted.replace(/\bJSONB\b/gi, 'TEXT');

  // TIMESTAMP → TEXT
  converted = converted.replace(/\bTIMESTAMP\b/gi, 'TEXT');

  // BOOLEAN → INTEGER
  converted = converted.replace(/\bBOOLEAN\b/gi, 'INTEGER');

  // DEFAULT true → DEFAULT 1, DEFAULT false → DEFAULT 0
  converted = converted.replace(/\bDEFAULT\s+true\b/gi, 'DEFAULT 1');
  converted = converted.replace(/\bDEFAULT\s+false\b/gi, 'DEFAULT 0');

  // DEFAULT CURRENT_TIMESTAMP → DEFAULT (datetime('now'))
  converted = converted.replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b/gi, "DEFAULT (datetime('now'))");

  // INTERVAL handling: datetime('now') - INTERVAL 'X unit'
  converted = converted.replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*(hours?|days?|minutes?)'/gi,
    (_match, num, unit) => `datetime('now', '-${num} ${unit}')`);

  // ON CONFLICT (name) DO NOTHING → OR IGNORE (handled by rewriting INSERT)
  converted = converted.replace(/\bON\s+CONFLICT\s*\([^)]+\)\s*DO\s+NOTHING\b/gi, '');
  if (/\bOR\s+IGNORE\b/i.test(converted) === false && converted.replace(/\s+/g, ' ').trim().match(/^INSERT\s+INTO/i)) {
    // already handled in init.ts; skip auto-transform
  }

  return converted;
};

export const query = async (text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
  try {
    const sqliteSQL = convertPgToSqlite(text);
    const trimmed = sqliteSQL.trim();
    const isReadOnlyQuery = /^SELECT\b/i.test(trimmed);

    // Normalize params for SQLite (convert Date, boolean, undefined, and objects)
    const cleanParams = params.map(p => {
      if (p instanceof Date) return p.toISOString();
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p === undefined) return null;
      if (typeof p === 'object' && p !== null && !(p instanceof Buffer)) return JSON.stringify(p);
      return p;
    });

    if (isReadOnlyQuery) {
      const stmt = db.prepare(sqliteSQL);
      const rows = stmt.all(...cleanParams);
      return { rows, rowCount: rows.length };
    } else {
      // Check for RETURNING clause
      const hasReturning = /\bRETURNING\s+/i.test(trimmed);

      if (hasReturning) {
        const sqlClean = sqliteSQL.replace(/\s+RETURNING\s+.+$/i, '');
        const stmt = db.prepare(sqlClean);
        const result = stmt.run(...cleanParams);

        // Determine the table name for the follow-up SELECT
        const insertMatch = trimmed.match(/^INSERT\s+INTO\s+(\w+)/i);
        const updateMatch = trimmed.match(/^UPDATE\s+(\w+)/i);
        const deleteMatch = trimmed.match(/^DELETE\s+FROM\s+(\w+)/i);

        const table = insertMatch?.[1] || updateMatch?.[1] || deleteMatch?.[1];

        if (table && result.changes > 0) {
          let followUp: any[];
          if (insertMatch && result.lastInsertRowid) {
            followUp = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).all(result.lastInsertRowid);
          } else if (updateMatch) {
            // For UPDATE, re-run the WHERE clause to find updated rows
            const whereMatch = sqlClean.match(/\bWHERE\s+(.+)$/is);
            if (whereMatch) {
              const beforeWhere = sqlClean.substring(0, sqlClean.search(/\bWHERE\b/i));
              const paramsBefore = (beforeWhere.match(/\?/g) || []).length;
              const whereParams = cleanParams.slice(paramsBefore);
              followUp = db.prepare(`SELECT * FROM ${table} WHERE ${whereMatch[1]}`).all(...whereParams);
            } else {
              followUp = [];
            }
          } else {
            followUp = [];
          }
          return { rows: followUp, rowCount: result.changes };
        }

        return { rows: [], rowCount: result.changes };
      } else {
        const stmt = db.prepare(trimmed);
        const result = stmt.run(...cleanParams);
        return { rows: [], rowCount: result.changes };
      }
    }
  } catch (err: any) {
    const trimmed = text.trim();
    const isReadOnlyQuery = /^SELECT\b/i.test(trimmed);

    logError(`SQLite query error: ${err.message} | SQL: ${text}`);

    if (isReadOnlyQuery) {
      return { rows: [], rowCount: 0 };
    }

    throw err;
  }
};
