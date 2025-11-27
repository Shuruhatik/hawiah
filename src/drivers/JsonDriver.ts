import * as fs from 'fs/promises';
import * as path from 'path';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * Driver implementation for storing data in a local JSON file.
 * Stores data as a simple array of objects.
 */
export class JSONDriver implements IDriver {
  private records: Data[] = [];
  private filePath: string;
  private autoSave: boolean;

  /**
   * Creates a new instance of JsonDriver
   * @param filePath - Path to the JSON file
   * @param autoSave - Whether to automatically save changes to disk (default: true)
   */
  constructor(filePath: string, autoSave: boolean = true) {
    this.filePath = path.resolve(filePath);
    this.autoSave = autoSave;
  }

  /**
   * Connects to the database file.
   * Creates the file and directory if they don't exist.
   * Loads existing data into memory.
   */
  async connect(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(fileContent);

      if (Array.isArray(parsed)) {
        this.records = parsed;
      } else if (parsed.records && typeof parsed.records === 'object') {
        this.records = Object.values(parsed.records);
      } else {
        this.records = [];
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.records = [];
        if (this.autoSave) {
          await this.persist();
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Disconnects from the database.
   * Persists any pending changes and clears memory.
   */
  async disconnect(): Promise<void> {
    await this.persist();
    this.records = [];
  }

  /**
   * Inserts a new record into the database.
   * @param data - The data to insert
   * @returns The inserted record with metadata
   */
  async set(data: Data): Promise<Data> {
    const record = {
      ...data,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    };

    this.records.push(record);

    if (this.autoSave) {
      await this.persist();
    }

    return record;
  }

  /**
   * Retrieves records matching the query.
   * @param query - The query criteria
   * @returns Array of matching records
   */
  async get(query: Query): Promise<Data[]> {
    return this.records.filter(record => this.matches(record, query));
  }

  /**
   * Retrieves a single record matching the query.
   * @param query - The query criteria
   * @returns The first matching record or null
   */
  async getOne(query: Query): Promise<Data | null> {
    const record = this.records.find(record => this.matches(record, query));
    return record || null;
  }

  /**
   * Updates records matching the query.
   * @param query - The query criteria
   * @param data - The data to update
   * @returns The number of updated records
   */
  async update(query: Query, data: Data): Promise<number> {
    let count = 0;

    this.records = this.records.map(record => {
      if (this.matches(record, query)) {
        count++;
        return {
          ...record,
          ...data,
          _updatedAt: new Date().toISOString(),
        };
      }
      return record;
    });

    if (count > 0 && this.autoSave) {
      await this.persist();
    }

    return count;
  }

  /**
   * Deletes records matching the query.
   * @param query - The query criteria
   * @returns The number of deleted records
   */
  async delete(query: Query): Promise<number> {
    const initialLength = this.records.length;
    this.records = this.records.filter(record => !this.matches(record, query));
    const count = initialLength - this.records.length;

    if (count > 0 && this.autoSave) {
      await this.persist();
    }

    return count;
  }

  /**
   * Checks if any record matches the query.
   * @param query - The query criteria
   * @returns True if a match exists, false otherwise
   */
  async exists(query: Query): Promise<boolean> {
    return this.records.some(record => this.matches(record, query));
  }

  /**
   * Counts records matching the query.
   * @param query - The query criteria
   * @returns The number of matching records
   */
  async count(query: Query): Promise<number> {
    return this.records.filter(record => this.matches(record, query)).length;
  }

  /**
   * Persists the current in-memory data to the JSON file.
   */
  async persist(): Promise<void> {
    const content = JSON.stringify(this.records, null, 2);
    await fs.writeFile(this.filePath, content, 'utf-8');
  }

  /**
   * Forces a save of the data to disk.
   * Alias for persist().
   */
  async flush(): Promise<void> {
    await this.persist();
  }

  /**
   * Clears all data from the database.
   */
  async clear(): Promise<void> {
    this.records = [];
    if (this.autoSave) {
      await this.persist();
    }
  }

  /**
   * Checks if a record matches the query criteria.
   * Supports nested objects and exact array matching.
   * @param record - The record to check
   * @param query - The query criteria
   * @returns True if the record matches, false otherwise
   */
  private matches(record: Data, query: Query): boolean {
    if (Object.keys(query).length === 0) {
      return true;
    }

    return Object.keys(query).every(key => {
      const queryValue = query[key];
      const recordValue = record[key];

      if (typeof queryValue === 'object' && queryValue !== null && !Array.isArray(queryValue)) {
        if (typeof recordValue === 'object' && recordValue !== null && !Array.isArray(recordValue)) {
          return this.matches(recordValue, queryValue);
        }
        return false;
      }

      if (Array.isArray(queryValue) && Array.isArray(recordValue)) {
        return JSON.stringify(queryValue) === JSON.stringify(recordValue);
      }

      return recordValue === queryValue;
    });
  }

  /**
   * Gets the total number of records in memory.
   * @returns Total record count
   */
  getRecordCount(): number {
    return this.records.length;
  }

  /**
   * Compacts the database file.
   * For JsonDriver, this simply persists the current state.
   */
  async compact(): Promise<void> {
    if (this.autoSave) {
      await this.persist();
    }
  }
}
