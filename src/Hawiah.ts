import { IDriver, Query, Data } from './interfaces/IDriver';

export class Hawiah {
  private driver: IDriver;
  private isConnected: boolean = false;

  constructor(driver: IDriver) {
    this.driver = driver;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }
    await this.driver.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    await this.driver.disconnect();
    this.isConnected = false;
  }

  async set(data: Data): Promise<Data> {
    this.ensureConnected();
    return await this.driver.set(data);
  }

  async get(query: Query = {}): Promise<Data[]> {
    this.ensureConnected();
    return await this.driver.get(query);
  }

  async getOne(query: Query): Promise<Data | null> {
    this.ensureConnected();
    return await this.driver.getOne(query);
  }

  async update(query: Query, data: Data): Promise<number> {
    this.ensureConnected();
    return await this.driver.update(query, data);
  }

  async delete(query: Query): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete(query);
  }

  async exists(query: Query): Promise<boolean> {
    this.ensureConnected();
    return await this.driver.exists(query);
  }

  async count(query: Query = {}): Promise<number> {
    this.ensureConnected();
    return await this.driver.count(query);
  }

  async getAll(): Promise<Data[]> {
    this.ensureConnected();
    return await this.driver.get({});
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

  async getMany(queries: Query[]): Promise<Data[]> {
    this.ensureConnected();
    const results: Data[] = [];
    for (const query of queries) {
      const data = await this.driver.get(query);
      results.push(...data);
    }
    return results;
  }

  async setMany(dataArray: Data[]): Promise<Data[]> {
    this.ensureConnected();
    const results: Data[] = [];
    for (const data of dataArray) {
      const result = await this.driver.set(data);
      results.push(result);
    }
    return results;
  }

  async updateOne(query: Query, data: Data): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.update(query, data);
    return count > 0;
  }

  async deleteOne(query: Query): Promise<boolean> {
    this.ensureConnected();
    const count = await this.driver.delete(query);
    return count > 0;
  }

  async deleteAll(): Promise<number> {
    this.ensureConnected();
    return await this.driver.delete({});
  }

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

  async find(query: Query, limit?: number): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (limit && limit > 0) {
      return results.slice(0, limit);
    }
    return results;
  }

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

  async search(searchQuery: { [key: string]: any }): Promise<Data[]> {
    this.ensureConnected();
    return await this.driver.get(searchQuery);
  }

  async countBy(key: string, value: any): Promise<number> {
    this.ensureConnected();
    const query: Query = { [key]: value };
    return await this.driver.count(query);
  }

  async existsByField(key: string, value: any): Promise<boolean> {
    this.ensureConnected();
    const query: Query = { [key]: value };
    return await this.driver.exists(query);
  }

  async getByField(key: string, value: any): Promise<Data[]> {
    this.ensureConnected();
    const query: Query = { [key]: value };
    return await this.driver.get(query);
  }

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

  async sort(query: Query, sortBy: string, order: 'asc' | 'desc' = 'asc'): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return order === 'asc' ? -1 : 1;
      if (a[sortBy] > b[sortBy]) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

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

  async distinct(field: string, query: Query = {}): Promise<any[]> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    const values = results.map(record => record[field]);
    return [...new Set(values)];
  }

  async sum(field: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    return results.reduce((sum, record) => sum + (Number(record[field]) || 0), 0);
  }

  async avg(field: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (results.length === 0) return 0;
    const total = results.reduce((sum, record) => sum + (Number(record[field]) || 0), 0);
    return total / results.length;
  }

  async min(field: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (results.length === 0) return 0;
    return Math.min(...results.map(record => Number(record[field]) || 0));
  }

  async max(field: string, query: Query = {}): Promise<number> {
    this.ensureConnected();
    const results = await this.driver.get(query);
    if (results.length === 0) return 0;
    return Math.max(...results.map(record => Number(record[field]) || 0));
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
      await this.driver.update(query, record); // Note: This might be inefficient if query matches multiple, but driver update handles it.
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

  async random(sampleSize: number = 1): Promise<Data[]> {
    this.ensureConnected();
    const results = await this.driver.get({});
    const shuffled = results.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

  async groupBy(field: string, query: Query = {}): Promise<{ [key: string]: Data[] }> {
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
