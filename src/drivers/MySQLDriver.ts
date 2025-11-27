import mysql from 'mysql2/promise';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * MySQL driver configuration options
 */
export interface MySQLDriverOptions {
    /**
     * MySQL connection configuration
     */
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;

    /**
     * Table name to use
     */
    tableName: string;

    /**
     * Connection pool size (default: 10)
     */
    connectionLimit?: number;

    /**
     * Additional MySQL connection options
     */
    connectionOptions?: mysql.PoolOptions;
}

/**
 * Driver implementation for MySQL using mysql2.
 * Provides a schema-less interface to MySQL tables with JSON storage.
 */
export class MySQLDriver implements IDriver {
    private pool: mysql.Pool | null = null;
    private host: string;
    private port: number;
    private user: string;
    private password: string;
    private database: string;
    private tableName: string;
    private connectionLimit: number;
    private connectionOptions: mysql.PoolOptions;

    /**
     * Creates a new instance of MySQLDriver
     * @param options - MySQL driver configuration options
     */
    constructor(options: MySQLDriverOptions) {
        this.host = options.host;
        this.port = options.port || 3306;
        this.user = options.user;
        this.password = options.password;
        this.database = options.database;
        this.tableName = options.tableName;
        this.connectionLimit = options.connectionLimit || 10;
        this.connectionOptions = options.connectionOptions || {};
    }

    /**
     * Connects to the MySQL database.
     * Creates the table if it doesn't exist.
     */
    async connect(): Promise<void> {
        this.pool = mysql.createPool({
            host: this.host,
            port: this.port,
            user: this.user,
            password: this.password,
            database: this.database,
            connectionLimit: this.connectionLimit,
            waitForConnections: true,
            ...this.connectionOptions,
        });

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                _id VARCHAR(100) PRIMARY KEY,
                _data TEXT NOT NULL,
                _createdAt DATETIME NOT NULL,
                _updatedAt DATETIME NOT NULL,
                KEY idx_createdAt (_createdAt),
                KEY idx_updatedAt (_updatedAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;

        const connection = await this.pool.getConnection();
        try {
            await connection.execute(createTableSQL);
        } finally {
            connection.release();
        }
    }

    /**
     * Disconnects from the MySQL database.
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
            VALUES (?, ?, ?, ?)
        `;

        await this.pool!.execute(sql, [
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
        const [rows] = await this.pool!.execute(sql);

        const allRecords = (rows as any[]).map(row =>
            typeof row._data === 'string' ? JSON.parse(row._data) : row._data
        );

        if (Object.keys(query).length === 0) {
            return allRecords;
        }

        return allRecords.filter(record => this.matchesQuery(record, query));
    }

    /**
     * Retrieves a single record matching the query.
     * @param query - The query criteria
     * @returns The first matching record or null
     */
    async getOne(query: Query): Promise<Data | null> {
        this.ensureConnected();

        if (query._id) {
            const sql = `SELECT _data FROM ${this.tableName} WHERE _id = ? LIMIT 1`;
            const [rows] = await this.pool!.execute(sql, [query._id]);

            if ((rows as any[]).length > 0) {
                const row = (rows as any[])[0];
                return typeof row._data === 'string' ? JSON.parse(row._data) : row._data;
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
            SET _data = ?, _updatedAt = ?
            WHERE _id = ?
        `;

        for (const record of records) {
            const updatedRecord: any = {
                ...record,
                ...data,
                _updatedAt: new Date().toISOString(),
            };

            updatedRecord._id = record._id;
            updatedRecord._createdAt = record._createdAt;

            await this.pool!.execute(sql, [
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
        const sql = `DELETE FROM ${this.tableName} WHERE _id = ?`;

        let count = 0;
        for (const record of records) {
            await this.pool!.execute(sql, [record._id]);
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
            const [rows] = await this.pool!.execute(sql);
            return (rows as any[])[0].count;
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
     * Gets the MySQL connection pool.
     * @returns The MySQL connection pool
     */
    getPool(): mysql.Pool | null {
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
        const [rows] = await this.pool!.execute(sql, params);
        return rows;
    }

    /**
     * Clears all data from the table.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        await this.pool!.execute(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Drops the entire table.
     * WARNING: This will permanently delete all data and indexes.
     */
    async drop(): Promise<void> {
        this.ensureConnected();
        await this.pool!.execute(`DROP TABLE IF EXISTS ${this.tableName}`);
    }

    /**
     * Optimizes the table.
     */
    async optimize(): Promise<void> {
        this.ensureConnected();
        await this.pool!.execute(`OPTIMIZE TABLE ${this.tableName}`);
    }

    /**
     * Analyzes the table for query optimization.
     */
    async analyze(): Promise<void> {
        this.ensureConnected();
        await this.pool!.execute(`ANALYZE TABLE ${this.tableName}`);
    }

    /**
     * Begins a transaction.
     * @returns A connection from the pool for transaction use
     */
    async beginTransaction(): Promise<mysql.PoolConnection> {
        this.ensureConnected();
        const connection = await this.pool!.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Commits a transaction.
     * @param connection - The connection to commit
     */
    async commit(connection: mysql.PoolConnection): Promise<void> {
        await connection.commit();
        connection.release();
    }

    /**
     * Rolls back a transaction.
     * @param connection - The connection to rollback
     */
    async rollback(connection: mysql.PoolConnection): Promise<void> {
        await connection.rollback();
        connection.release();
    }
}
