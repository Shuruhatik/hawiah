import { IDriver, Query, Data } from './interfaces/IDriver';

/**
 * Hawiah: A lightweight, schema-less database abstraction layer.
 * Provides a SQL-like API for interacting with various data sources.
 */
export class Hawiah {
  private driver: IDriver;
  private isConnected: boolean = false;

  constructor(driver: IDriver) {
    this.driver = driver;
  }

  /**
   * Establishes a connection to the database driver.
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    await this.driver.connect();
    this.isConnected = true;
  }

  /**
   * Closes the connection to the database driver.
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    await this.driver.disconnect();
    this.isConnected = false;
  }

  /**
   * Inserts a new record into the database.
   * @param data - The data to insert
   * @returns The inserted record
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
   * Finds records matching the query criteria.
   * @param query - The filter condition (default: all)
   * @param limit - Optional maximum number of records to return
   * @returns Array of matching records
   */
  async find(query: Query = {}, limit?: number): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (limit && limit > 0) {
      return results.slice(0, limit);
    }
    return results;
  }

  /**
   * Finds a single record matching the query criteria.
   * @param query - The filter condition
   * @returns The first matching record or null
   */
  async findOne(query: Query): Promise<Data | null> {
    this.ensureConnected();
    return await this.driver.getOne(query);
  }

  /**
   * Finds all records in the database.
   * @returns Array of all records
   */
  async findAll(): Promise<Data[]> {
    this.ensureConnected();
    return await this.driver.get({});
  }

  /**
   * Finds records matching any of the provided queries.
   * @param queries - Array of filter conditions
   * @returns Combined array of matching records
   */
  async findMany(queries: Query[]): Promise<Data[]> {
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
   * Updates or inserts a record.
   * @param query - The filter condition to check existence
   * @param data - The data to insert or update
   * @returns The updated or inserted record
   */
  async upsert(query: Query, data: Data): Promise<Data> {
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
   * Deletes records matching the query.
   * @param query - The filter condition
   * @returns Number of deleted records
   */
  async delete(query: Query): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete(query);
  }

  /**
   * Deletes a single record matching the query.
   * @param query - The filter condition
   * @returns True if a record was deleted
   */
  async deleteOne(query: Query): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.delete(query);
    return count > 0;
  }

  /**
   * Deletes all records from the database.
   * @returns Number of deleted records
   */
  async truncate(): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete({});
  }

  /**
   * Checks if records exist matching the query.
   * @param query - The filter condition
   * @returns True if exists
   */
  async exists(query: Query): Promise<boolean> {
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
   * Counts records where a column matches a value.
   * @param column - The column name
   * @param value - The value to match
   * @returns Count of records
   */
  async countBy(column: string, value: any): Promise<number> {
    this.ensureConnected();
    const query: Query = { [column]: value };
    return await this.driver.count(query);
  }

  // --- ID Helpers ---

  async findById(id: number | string): Promise<Data | null> {
    this.ensureConnected();
    return await this.driver.getOne({ _id: id });
  }

  async updateById(id: number | string, data: Data): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.update({ _id: id }, data);
    return count > 0;
  }

  async deleteById(id: number | string): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.delete({ _id: id });
    return count > 0;
  }

  async existsById(id: number | string): Promise<boolean> {
    this.ensureConnected();
    return await this.driver.exists({ _id: id });
  }

  // --- Field Helpers ---

  async findBy(column: string, value: any): Promise<Data[]> {
    this.ensureConnected();
    const query: Query = { [column]: value };
    return await this.driver.get(query);
  }

  async existsBy(column: string, value: any): Promise<boolean> {
    this.ensureConnected();
    const query: Query = { [column]: value };
    return await this.driver.exists(query);
  }

  // --- Advanced Querying ---

  /**
   * Orders the results by a specific column.
   * @param query - The filter condition
   * @param column - The column to sort by
   * @param direction - 'asc' or 'desc'
   * @returns Sorted array of records
   */
  async orderBy(query: Query, column: string, direction: 'asc' | 'desc' = 'asc'): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.sort((a, b) => {
      if (a[column] < b[column]) return direction === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Selects specific columns from the results (Projection).
   * @param query - The filter condition
   * @param columns - Array of column names to select
   * @returns Array of records with only selected columns
   */
  async select(query: Query, columns: string[]): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.map(record => {
      const selected: Data = {};
      columns.forEach(col => {
        if (col in record) {
          selected[col] = record[col];
        }
      });
      return selected;
    });
  }

  /**
   * Retrieves distinct values for a specific column.
   * @param column - The column to get distinct values for
   * @param query - Optional filter condition
   * @returns Array of unique values
   */
  async distinct(column: string, query: Query = {}): Promise<any[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    const values = results.map(record => record[column]);
    return [...new Set(values)];
  }

  /**
   * Groups records by a specific column.
   * @param column - The column to group by
   * @param query - Optional filter condition
   * @returns Object where keys are group values and values are arrays of records
   */
  async groupBy(column: string, query: Query = {}): Promise<{ [key: string]: Data[] }> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.reduce((groups: { [key: string]: Data[] }, record) => {
      const key = String(record[column]);
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

  // --- Aggregation ---

  /**
   * Calculates the sum of a numeric column.
   */
  async sum(column: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.reduce((sum, record) => sum + (Number(record[column]) || 0), 0);
  }

  async increment(query: Query, column: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    const record = await this.driver.getOne(query);
    if (!record) {
      throw new Error('Record not found');
    }
    const currentValue = Number(record[column]) || 0;
    const newValue = currentValue + amount;
    await this.driver.update(query, { [column]: newValue });
    return newValue;
  }

  async decrement(query: Query, column: string, amount: number = 1): Promise<number> {
    return await this.increment(query, column, -amount);
  }

  // --- Array Operations ---

  async push(query: Query, column: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (!Array.isArray(record[column])) {
        record[column] = [];
      }
      record[column].push(value);
      await this.driver.update(query, record);
      count++;
    }
    return count;
  }

  async pull(query: Query, column: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[column])) {
        const initialLength = record[column].length;
        record[column] = record[column].filter((item: any) => JSON.stringify(item) !== JSON.stringify(value));
        if (record[column].length !== initialLength) {
          await this.driver.update(query, record);
          count++;
        }
      }
    }
    return count;
  }

  async shift(query: Query, column: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[column]) && record[column].length > 0) {
        record[column].shift();
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  async unshift(query: Query, column: string, value: any): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (!Array.isArray(record[column])) {
        record[column] = [];
      }
      record[column].unshift(value);
      await this.driver.update(query, record);
      count++;
    }
    return count;
  }

  async pop(query: Query, column: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (Array.isArray(record[column]) && record[column].length > 0) {
        record[column].pop();
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  // --- Schema/Structure Operations ---

  /**
   * Drops (removes) a column from matching records.
   */
  async drop(query: Query, column: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (column in record) {
        delete record[column];
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  /**
   * Renames a column in matching records.
   */
  async rename(query: Query, oldColumn: string, newColumn: string): Promise<number> {
    this.ensureConnected();
    const records = await this.driver.get(query);
    let count = 0;
    for (const record of records) {
      if (oldColumn in record) {
        record[newColumn] = record[oldColumn];
        delete record[oldColumn];
        await this.driver.update(query, record);
        count++;
      }
    }
    return count;
  }

  // --- Utilities ---

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
