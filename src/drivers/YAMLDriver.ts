import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * YAML driver configuration options
 */
export interface YAMLDriverOptions {
    /**
     * Path to the YAML file
     * Example: './data/db.yaml'
     */
    filename: string;

    /**
     * Auto-save after each modification (default: true)
     */
    autoSave?: boolean;

    /**
     * YAML dump options
     */
    yamlOptions?: yaml.DumpOptions;
}

/**
 * Driver implementation for YAML files.
 * Stores data in a human-readable YAML format.
 */
export class YAMLDriver implements IDriver {
    private filename: string;
    private autoSave: boolean;
    private yamlOptions: yaml.DumpOptions;
    private data: Data[];
    private isConnected: boolean = false;

    /**
     * Creates a new instance of YAMLDriver
     * @param options - YAML driver configuration options
     */
    constructor(options: YAMLDriverOptions) {
        this.filename = options.filename;
        this.autoSave = options.autoSave !== undefined ? options.autoSave : true;
        this.yamlOptions = options.yamlOptions || {
            indent: 2,
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        };
        this.data = [];
    }

    /**
     * Connects to the YAML file.
     * Loads existing data or creates a new file.
     */
    async connect(): Promise<void> {
        const dir = path.dirname(this.filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (fs.existsSync(this.filename)) {
            const content = fs.readFileSync(this.filename, 'utf8');
            try {
                const parsed = yaml.load(content);
                this.data = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                this.data = [];
            }
        } else {
            this.data = [];
            this.saveToFile();
        }

        this.isConnected = true;
    }

    /**
     * Disconnects from the YAML file.
     * Saves data if autoSave is enabled.
     */
    async disconnect(): Promise<void> {
        if (this.autoSave) {
            this.saveToFile();
        }
        this.isConnected = false;
    }

    /**
     * Saves the data to the YAML file.
     * @private
     */
    private saveToFile(): void {
        const yamlStr = yaml.dump(this.data, this.yamlOptions);
        fs.writeFileSync(this.filename, yamlStr, 'utf8');
    }

    /**
     * Inserts a new record.
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

        this.data.push(record);

        if (this.autoSave) {
            this.saveToFile();
        }

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
            return [...this.data];
        }

        return this.data.filter(record => this.matchesQuery(record, query));
    }

    /**
     * Retrieves a single record matching the query.
     * @param query - The query criteria
     * @returns The first matching record or null
     */
    async getOne(query: Query): Promise<Data | null> {
        this.ensureConnected();

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

        let count = 0;
        for (let i = 0; i < this.data.length; i++) {
            if (this.matchesQuery(this.data[i], query)) {
                this.data[i] = {
                    ...this.data[i],
                    ...data,
                    _id: this.data[i]._id,
                    _createdAt: this.data[i]._createdAt,
                    _updatedAt: new Date().toISOString(),
                };
                count++;
            }
        }

        if (count > 0 && this.autoSave) {
            this.saveToFile();
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

        const beforeLength = this.data.length;
        this.data = this.data.filter(record => !this.matchesQuery(record, query));
        const count = beforeLength - this.data.length;

        if (count > 0 && this.autoSave) {
            this.saveToFile();
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

        return this.data.some(record => this.matchesQuery(record, query));
    }

    /**
     * Counts records matching the query.
     * @param query - The query criteria
     * @returns The number of matching records
     */
    async count(query: Query): Promise<number> {
        this.ensureConnected();

        if (Object.keys(query).length === 0) {
            return this.data.length;
        }

        return this.data.filter(record => this.matchesQuery(record, query)).length;
    }

    /**
     * Ensures the driver is connected before executing operations.
     * @throws Error if driver is not connected
     * @private
     */
    private ensureConnected(): void {
        if (!this.isConnected) {
            throw new Error('Driver not connected. Call connect() first.');
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
            if (JSON.stringify(record[key]) !== JSON.stringify(value)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Gets all data in memory.
     * @returns All records
     */
    getAllData(): Data[] {
        return [...this.data];
    }

    /**
     * Manually saves data to file.
     * Useful when autoSave is disabled.
     */
    async save(): Promise<void> {
        this.ensureConnected();
        this.saveToFile();
    }

    /**
     * Clears all data from memory and file.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        this.data = [];
        this.saveToFile();
    }

    /**
     * Deletes the YAML file.
     */
    async drop(): Promise<void> {
        this.ensureConnected();
        if (fs.existsSync(this.filename)) {
            fs.unlinkSync(this.filename);
        }
        this.data = [];
    }

    /**
     * Reloads data from the YAML file.
     * Useful for syncing with external changes.
     */
    async reload(): Promise<void> {
        this.ensureConnected();

        if (fs.existsSync(this.filename)) {
            const content = fs.readFileSync(this.filename, 'utf8');
            try {
                const parsed = yaml.load(content);
                this.data = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                throw new Error(`Failed to parse YAML file: ${error}`);
            }
        }
    }

    /**
     * Gets the YAML file path.
     * @returns The file path
     */
    getFilename(): string {
        return this.filename;
    }

    /**
     * Checks if auto-save is enabled.
     * @returns True if auto-save is enabled
     */
    isAutoSaveEnabled(): boolean {
        return this.autoSave;
    }

    /**
     * Enables or disables auto-save.
     * @param enabled - Whether to enable auto-save
     */
    setAutoSave(enabled: boolean): void {
        this.autoSave = enabled;
    }
}
