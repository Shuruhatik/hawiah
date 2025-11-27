import Database from 'better-sqlite3';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * SQLite driver configuration options
 */
export interface SQLiteDriverOptions {
    /**
     * Path to the SQLite database file
     * Example: './data/mydb.sqlite'
     * Use ':memory:' for in-memory database
     */
    filename: string;

    /**
     * Table name to use
     */
    tableName: string;

    /**
     * Additional better-sqlite3 options
     */
    options?: Database.Options;
}

/**
 * Driver implementation for SQLite using better-sqlite3.
 * Provides a schema-less interface to SQLite tables.
 */
export class SQLiteDriver implements IDriver {
    private db: Database.Database | null = null;
    private filename: string;
    private tableName: string;
    private options: Database.Options;

    /**
     * Creates a new instance of SQLiteDriver
     * @param options - SQLite driver configuration options
     */
    constructor(options: SQLiteDriverOptions) {
        this.filename = options.filename;
        this.tableName = options.tableName;
        this.options = options.options || {};
    }

    /**
     * Connects to the SQLite database.
     * Creates the table if it doesn't exist.
     */
    async connect(): Promise<void> {
        this.db = new Database(this.filename, this.options);

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                _id TEXT PRIMARY KEY,
                _data TEXT NOT NULL,
                _createdAt TEXT NOT NULL,
                _updatedAt TEXT NOT NULL
            )
        `;
        this.db.exec(createTableSQL);

        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_createdAt ON ${this.tableName}(_createdAt)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_updatedAt ON ${this.tableName}(_updatedAt)`);
    }

    /**
     * Disconnects from the SQLite database.
     */
    async disconnect(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
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
        const record = {
            ...data,
            _id: id,
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
        };

        const stmt = this.db!.prepare(`
            INSERT INTO ${this.tableName} (_id, _data, _createdAt, _updatedAt)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(id, JSON.stringify(record), record._createdAt, record._updatedAt);

        return record;
    }

    /**
     * Retrieves records matching the query.
     * @param query - The query criteria
     * @returns Array of matching records
     */
    async get(query: Query): Promise<Data[]> {
        this.ensureConnected();

        if (Object.keys(query).length === 0) {
            const stmt = this.db!.prepare(`SELECT _data FROM ${this.tableName}`);
            const rows = stmt.all() as Array<{ _data: string }>;
            return rows.map(row => JSON.parse(row._data));
        }

        const allRecords = await this.get({});
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
            const stmt = this.db!.prepare(`SELECT _data FROM ${this.tableName} WHERE _id = ?`);
            const row = stmt.get(query._id) as { _data: string } | undefined;
            return row ? JSON.parse(row._data) : null;
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

        const stmt = this.db!.prepare(`
            UPDATE ${this.tableName}
            SET _data = ?, _updatedAt = ?
            WHERE _id = ?
        `);

        for (const record of records) {
            const updatedRecord: any = {
                ...record,
                ...data,
                _updatedAt: new Date().toISOString(),
            };

            updatedRecord._id = record._id;
            updatedRecord._createdAt = record._createdAt;

            stmt.run(JSON.stringify(updatedRecord), updatedRecord._updatedAt, record._id);
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
        const stmt = this.db!.prepare(`DELETE FROM ${this.tableName} WHERE _id = ?`);

        let count = 0;
        for (const record of records) {
            stmt.run(record._id);
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
            const stmt = this.db!.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
            const result = stmt.get() as { count: number };
            return result.count;
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
        if (!this.db) {
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
     * Gets the SQLite database instance.
     * @returns The SQLite database instance
     */
    getDatabase(): Database.Database | null {
        return this.db;
    }

    /**
     * Executes a raw SQL query.
     * WARNING: Use with caution. This bypasses the abstraction layer.
     * @param sql - The SQL query to execute
     * @returns Query results
     */
    executeRaw(sql: string): any {
        this.ensureConnected();
        return this.db!.exec(sql);
    }

    /**
     * Prepares a SQL statement.
     * WARNING: Use with caution. This bypasses the abstraction layer.
     * @param sql - The SQL statement to prepare
     * @returns Prepared statement
     */
    prepare(sql: string): Database.Statement {
        this.ensureConnected();
        return this.db!.prepare(sql);
    }

    /**
     * Clears all data from the table.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        this.db!.exec(`DELETE FROM ${this.tableName}`);
    }

    /**
     * Drops the entire table.
     * WARNING: This will permanently delete all data and indexes.
     */
    async drop(): Promise<void> {
        this.ensureConnected();
        this.db!.exec(`DROP TABLE IF EXISTS ${this.tableName}`);
    }

    /**
     * Optimizes the database by running VACUUM.
     */
    async vacuum(): Promise<void> {
        this.ensureConnected();
        this.db!.exec('VACUUM');
    }

    /**
     * Analyzes the database for query optimization.
     */
    async analyze(): Promise<void> {
        this.ensureConnected();
        this.db!.exec('ANALYZE');
    }

    /**
     * Begins a transaction.
     */
    beginTransaction(): void {
        this.ensureConnected();
        this.db!.exec('BEGIN TRANSACTION');
    }

    /**
     * Commits the current transaction.
     */
    commit(): void {
        this.ensureConnected();
        this.db!.exec('COMMIT');
    }

    /**
     * Rolls back the current transaction.
     */
    rollback(): void {
        this.ensureConnected();
        this.db!.exec('ROLLBACK');
    }
}
