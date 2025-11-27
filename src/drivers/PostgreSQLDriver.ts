import { Pool, PoolClient, PoolConfig } from 'pg';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * PostgreSQL driver configuration options
 */
export interface PostgreSQLDriverOptions {
    /**
     * PostgreSQL connection string (recommended)
     * Example: 'postgresql://user:password@host:port/database'
     */
    connectionString?: string;

    /**
     * Or individual connection parameters
     */
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;

    /**
     * Table name to use
     */
    tableName: string;

    /**
     * SSL configuration (required for cloud providers like Neon, Supabase)
     */
    ssl?: boolean | object;

    /**
     * Connection pool size (default: 10)
     */
    max?: number;

    /**
     * Additional PostgreSQL pool options
     */
    poolOptions?: PoolConfig;
}

/**
 * Driver implementation for PostgreSQL using node-postgres.
 * Provides a schema-less interface to PostgreSQL tables with JSONB storage.
 */
export class PostgreSQLDriver implements IDriver {
    private pool: Pool | null = null;
    private tableName: string;
    private config: PoolConfig;

    /**
     * Creates a new instance of PostgreSQLDriver
     * @param options - PostgreSQL driver configuration options
     */
    constructor(options: PostgreSQLDriverOptions) {
        this.tableName = options.tableName;

        this.config = {
            connectionString: options.connectionString,
            host: options.host,
            port: options.port,
            user: options.user,
            password: options.password,
            database: options.database,
            max: options.max || 10,
            ssl: options.ssl !== undefined ? options.ssl : (options.connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false),
            ...options.poolOptions,
        };
    }

    /**
     * Connects to the PostgreSQL database.
     * Creates the table if it doesn't exist.
     */
    async connect(): Promise<void> {
        this.pool = new Pool(this.config);

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                _id VARCHAR(100) PRIMARY KEY,
                _data JSONB NOT NULL,
                _createdAt TIMESTAMP NOT NULL,
                _updatedAt TIMESTAMP NOT NULL
            )
        `;

        await this.pool.query(createTableSQL);

        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_createdAt ON ${this.tableName}(_createdAt)`);
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updatedAt ON ${this.tableName}(_updatedAt)`);
    }

    /**
     * Disconnects from the PostgreSQL database.
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    /**
     * Inserts a new record into the database.
     * @param data - The data to insert
     * @returns The inserted record with ID
     */
    async set(data: Data): Promise<Data> {
        this.ensureConnected();

        const id = this.generateId();
        const now = new Date();
        const record = {
            ...data,
            _id: id,
            _createdAt: now.toISOString(),
            _updatedAt: now.toISOString(),
        };

        const sql = `
            INSERT INTO ${this.tableName} (_id, _data, _createdAt, _updatedAt)
            VALUES ($1, $2, $3, $4)
        `;

        await this.pool!.query(sql, [
            id,
            JSON.stringify(record),
            now,
            now,
        ]);

        return record;
    }

    /**
     * Retrieves records matching the query.
     * @param query - The query criteria
     * @returns Array of matching records
     */
    async get(query: Query): Promise<Data[]> {
        this.ensureConnected();

        const sql = `SELECT _data FROM ${this.tableName}`;
        const result = await this.pool!.query(sql);

        const allRecords = result.rows.map((row: any) => row._data);

        if (Object.keys(query).length === 0) {
            return allRecords;
        }

        return allRecords.filter((record: any) => this.matchesQuery(record, query));
    }

    /**
     * Retrieves a single record matching the query.
     * @param query - The query criteria
     * @returns The first matching record or null
     */
    async getOne(query: Query): Promise<Data | null> {
        this.ensureConnected();

        if (query._id) {
            const sql = `SELECT _data FROM ${this.tableName} WHERE _id = $1 LIMIT 1`;
            const result = await this.pool!.query(sql, [query._id]);

            if (result.rows.length > 0) {
                return result.rows[0]._data;
            }
            return null;
        }

        const results = await this.get(query);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Updates records matching the query.
     * @param query - The query criteria
     * @param data - The data to update
     * @returns The number of updated records
     */
    async update(query: Query, data: Data): Promise<number> {
        this.ensureConnected();

        const records = await this.get(query);
        let count = 0;

        const sql = `
            UPDATE ${this.tableName}
            SET _data = $1, _updatedAt = $2
            WHERE _id = $3
        `;

        for (const record of records) {
            const updatedRecord: any = {
                ...record,
                ...data,
                _updatedAt: new Date().toISOString(),
            };

            updatedRecord._id = record._id;
            updatedRecord._createdAt = record._createdAt;

            await this.pool!.query(sql, [
                JSON.stringify(updatedRecord),
                new Date(),
                record._id,
            ]);
            count++;
        }

        return count;
    }

    /**
     * Deletes records matching the query.
     * @param query - The query criteria
     * @returns The number of deleted records
     */
    async delete(query: Query): Promise<number> {
        this.ensureConnected();

        const records = await this.get(query);
        const sql = `DELETE FROM ${this.tableName} WHERE _id = $1`;

        let count = 0;
        for (const record of records) {
            await this.pool!.query(sql, [record._id]);
            count++;
        }

        return count;
    }

    /**
     * Checks if any record matches the query.
     * @param query - The query criteria
     * @returns True if a match exists, false otherwise
     */
    async exists(query: Query): Promise<boolean> {
        this.ensureConnected();

        const result = await this.getOne(query);
        return result !== null;
    }

    /**
     * Counts records matching the query.
     * @param query - The query criteria
     * @returns The number of matching records
     */
    async count(query: Query): Promise<number> {
        this.ensureConnected();

        if (Object.keys(query).length === 0) {
            const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
            const result = await this.pool!.query(sql);
            return parseInt(result.rows[0].count);
        }

        const results = await this.get(query);
        return results.length;
    }

    /**
     * Ensures the database is connected before executing operations.
     * @throws Error if database is not connected
     * @private
     */
    private ensureConnected(): void {
        if (!this.pool) {
            throw new Error('Database not connected. Call connect() first.');
        }
    }

    /**
     * Generates a unique ID for records.
     * @returns A unique string ID
     * @private
     */
    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Checks if a record matches the query criteria.
     * @param record - The record to check
     * @param query - The query criteria
     * @returns True if the record matches
     * @private
     */
    private matchesQuery(record: Data, query: Query): boolean {
        for (const [key, value] of Object.entries(query)) {
            if (record[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Gets the PostgreSQL connection pool.
     * @returns The PostgreSQL connection pool
     */
    getPool(): Pool | null {
        return this.pool;
    }

    /**
     * Executes a raw SQL query.
     * WARNING: Use with caution. This bypasses the abstraction layer.
     * @param sql - The SQL query to execute
     * @param params - Optional parameters for the query
     * @returns Query results
     */
    async executeRaw(sql: string, params?: any[]): Promise<any> {
        this.ensureConnected();
        const result = await this.pool!.query(sql, params);
        return result.rows;
    }

    /**
     * Clears all data from the table.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        await this.pool!.query(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Drops the entire table.
     * WARNING: This will permanently delete all data and indexes.
     */
    async drop(): Promise<void> {
        this.ensureConnected();
        await this.pool!.query(`DROP TABLE IF EXISTS ${this.tableName}`);
    }

    /**
     * Vacuums the table for optimization.
     */
    async vacuum(): Promise<void> {
        this.ensureConnected();
        await this.pool!.query(`VACUUM ${this.tableName}`);
    }

    /**
     * Analyzes the table for query optimization.
     */
    async analyze(): Promise<void> {
        this.ensureConnected();
        await this.pool!.query(`ANALYZE ${this.tableName}`);
    }

    /**
     * Begins a transaction.
     * @returns A client from the pool for transaction use
     */
    async beginTransaction(): Promise<PoolClient> {
        this.ensureConnected();
        const client = await this.pool!.connect();
        await client.query('BEGIN');
        return client;
    }

    /**
     * Commits a transaction.
     * @param client - The client to commit
     */
    async commit(client: PoolClient): Promise<void> {
        await client.query('COMMIT');
        client.release();
    }

    /**
     * Rolls back a transaction.
     * @param client - The client to rollback
     */
    async rollback(client: PoolClient): Promise<void> {
        await client.query('ROLLBACK');
        client.release();
    }
}
