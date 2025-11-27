import { IDriver, Query, Data } from './interfaces/IDriver';

/**
 * Hawiah: A lightweight, schema-less database abstraction layer.
 * Designed to be friendly and easy to use.
 */
export class Hawiah {
  private driver: IDriver;
  private isConnected: boolean = false;

  constructor(driver: IDriver) {
    this.driver = driver;
  }

  /**
   * Connects to the database.
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    await this.driver.connect();
    this.isConnected = true;
  }

  /**
   * Disconnects from the database.
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    await this.driver.disconnect();
    this.isConnected = false;
  }

  /**
   * Adds a new record to the database.
   * @param data - The data to add
   * @returns The added record
   */
  async insert(data: Data): Promise<Data> {
    this.ensureConnected();
    return await this.driver.set(data);
  }

  /**
   * Inserts multiple records into the database.
   * @param dataArray - Array of data to insert
   * @returns Array of inserted records
   */
  async insertMany(dataArray: Data[]): Promise<Data[]> {
    this.ensureConnected();
    const results: Data[] = [];
    for (const data of dataArray) {
      const result = await this.driver.set(data);
      results.push(result);
    }
    return results;
  }

  /**
   * Gets records matching the query.
   * @param query - The filter condition (default: all)
   * @param limit - Optional maximum number of records to return
   * @returns Array of matching records
   */
  async get(query: Query = {}, limit?: number): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (limit && limit > 0) {
      return results.slice(0, limit);
    }
    return results;
  }

  /**
   * Gets a single record matching the query.
   * @param query - The filter condition
   * @returns The first matching record or null
   */
  async getOne(query: Query): Promise<Data | null> {
    this.ensureConnected();
    return await this.driver.getOne(query);
  }

  /**
   * Gets all records in the database.
   * @returns Array of all records
   */
  async getAll(): Promise<Data[]> {
    this.ensureConnected();
    return await this.driver.get({});
  }

  /**
   * Gets records matching any of the provided queries.
   * @param queries - Array of filter conditions
   * @returns Combined array of matching records
   */
  async getMany(queries: Query[]): Promise<Data[]> {
    this.ensureConnected();
    const results: Data[] = [];
    for (const query of queries) {
      const data = await this.driver.get(query);
      results.push(...data);
    }
    return results;
  }

  /**
   * Updates records matching the query.
   * @param query - The filter condition
   * @param data - The data to update
   * @returns Number of updated records
   */
  async update(query: Query, data: Data): Promise<number> {
    this.ensureConnected();
    return await this.driver.update(query, data);
  }

  /**
   * Updates a single record matching the query.
   * @param query - The filter condition
   * @param data - The data to update
   * @returns True if a record was updated
   */
  async updateOne(query: Query, data: Data): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.update(query, data);
    return count > 0;
  }

  /**
   * Saves a record (adds if new, updates if exists).
   * @param query - The filter condition to check existence
   * @param data - The data to add or update
   * @returns The saved record
   */
  async save(query: Query, data: Data): Promise<Data> {
    this.ensureConnected();
    const existing = await this.driver.getOne(query);
    if (existing) {
      await this.driver.update(query, data);
      return { ...existing, ...data };
    } else {
      return await this.driver.set({ ...query, ...data });
    }
  }

  /**
   * Removes records matching the query.
   * @param query - The filter condition
   * @returns Number of removed records
   */
  async remove(query: Query): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete(query);
  }

  /**
   * Removes a single record matching the query.
   * @param query - The filter condition
   * @returns True if a record was removed
   */
  async removeOne(query: Query): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.delete(query);
    return count > 0;
  }

  /**
   * Clears all records from the database.
   * @returns Number of removed records
   */
  async clear(): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete({});
  }

  /**
   * Checks if records exist matching the query.
   * @param query - The filter condition
   * @returns True if exists
   */
  async has(query: Query): Promise<boolean> {
    this.ensureConnected();
    return await this.driver.exists(query);
  }

  /**
   * Counts records matching the query.
   * @param query - The filter condition
   * @returns Count of records
   */
  async count(query: Query = {}): Promise<number> {
    this.ensureConnected();
    return await this.driver.count(query);
  }

  /**
   * Counts records where a field matches a value.
   * @param field - The field name
   * @param value - The value to match
   * @returns Count of records
   */
  async countBy(field: string, value: any): Promise<number> {
    this.ensureConnected();
    const query: Query = { [field]: value };
    return await this.driver.count(query);
  }

  async getById(id: number | string): Promise<Data | null> {
    this.ensureConnected();
    return await this.driver.getOne({ _id: id });
  }

  async updateById(id: number | string, data: Data): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.update({ _id: id }, data);
    return count > 0;
  }

  async removeById(id: number | string): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.delete({ _id: id });
    return count > 0;
  }

  async hasId(id: number | string): Promise<boolean> {
    this.ensureConnected();
    return await this.driver.exists({ _id: id });
  }

  async getBy(field: string, value: any): Promise<Data[]> {
    this.ensureConnected();
    const query: Query = { [field]: value };
    return await this.driver.get(query);
  }

  async hasBy(field: string, value: any): Promise<boolean> {
    this.ensureConnected();
    const query: Query = { [field]: value };
    return await this.driver.exists(query);
  }

  /**
   * Sorts the results based on a field.
   * @param query - The filter condition
   * @param field - The field to sort by
   * @param direction - 'asc' or 'desc'
   * @returns Sorted array of records
   */
  async sort(query: Query, field: string, direction: 'asc' | 'desc' = 'asc'): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.sort((a, b) => {
      if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Selects specific fields from the results.
   * @param query - The filter condition
   * @param fields - Array of field names to select
   * @returns Array of records with only selected fields
   */
  async select(query: Query, fields: string[]): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.map(record => {
      const selected: Data = {};
      fields.forEach(field => {
        if (field in record) {
          selected[field] = record[field];
        }
      });
      return selected;
    });
  }

  /**
   * Retrieves unique values for a specific field.
   * @param field - The field to get unique values for
   * @param query - Optional filter condition
   * @returns Array of unique values
   */
  async unique(field: string, query: Query = {}): Promise<any[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    const values = results.map(record => record[field]);
    return [...new Set(values)];
  }

  /**
   * Groups records by a specific field.
   * @param field - The field to group by
   * @param query - Optional filter condition
   * @returns Object where keys are group values and values are arrays of records
   */
  async group(field: string, query: Query = {}): Promise<{ [key: string]: Data[] }> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.reduce((groups: { [key: string]: Data[] }, record) => {
      const key = String(record[field]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
      return groups;
    }, {});
  }

  /**
   * Paginates results.
   * @param query - The filter condition
   * @param page - Page number (1-based)
   * @param pageSize - Records per page
   * @returns Pagination result object
   */
  async paginate(query: Query, page: number = 1, pageSize: number = 10): Promise<{
    data: Data[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    this.ensureConnected();
    const allResults = await this.driver.get(query);
    const total = allResults.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const data = allResults.slice(startIndex, endIndex);

    return {
      data,
      page,
      pageSize,
      total,
      totalPages
    };
  }


  /**
   * Calculates the sum of a numeric field.
   */
  async sum(field: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.reduce((sum, record) => sum + (Number(record[field]) || 0), 0);
  }

  async increment(query: Query, field: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    const record = await this.driver.getOne(query);
    if (!record) {
      throw new Error('Record not found');
    }
    const currentValue = Number(record[field]) || 0;
    const newValue = currentValue + amount;
    await this.driver.update(query, { [field]: newValue });
    return newValue;
  }

  async decrement(query: Query, field: string, amount: number = 1): Promise<number> {
    return await this.increment(query, field, -amount);
  }


  async push(query: Query, field: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (!Array.isArray(record[field])) {
        record[field] = [];
      }
      record[field].push(value);
      await this.driver.update(query, record);
      count++;
    }
    return count;
  }

  async pull(query: Query, field: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[field])) {
        const initialLength = record[field].length;
        record[field] = record[field].filter((item: any) => JSON.stringify(item) !== JSON.stringify(value));
        if (record[field].length !== initialLength) {
          await this.driver.update(query, record);
          count++;
        }
      }
    }
    return count;
  }

  async shift(query: Query, field: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[field]) && record[field].length > 0) {
        record[field].shift();
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  async unshift(query: Query, field: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (!Array.isArray(record[field])) {
        record[field] = [];
      }
      record[field].unshift(value);
      await this.driver.update(query, record);
      count++;
    }
    return count;
  }

  async pop(query: Query, field: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[field]) && record[field].length > 0) {
        record[field].pop();
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }


  /**
   * Removes a field from matching records.
   */
  async unset(query: Query, field: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (field in record) {
        delete record[field];
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  /**
   * Renames a field in matching records.
   */
  async rename(query: Query, oldField: string, newField: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (oldField in record) {
        record[newField] = record[oldField];
        delete record[oldField];
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }


  async first(): Promise<Data | null> {
    this.ensureConnected();
    const results = await this.driver.get({});
    return results.length > 0 ? results[0] : null;
  }

  async last(): Promise<Data | null> {
    this.ensureConnected();
    const results = await this.driver.get({});
    return results.length > 0 ? results[results.length - 1] : null;
  }

  async isEmpty(): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.count({});
    return count === 0;
  }

  async random(sampleSize: number = 1): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get({});
    const shuffled = results.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  getDriver(): IDriver {
    return this.driver;
  }

  isActive(): boolean {
    return this.isConnected;
  }
}
