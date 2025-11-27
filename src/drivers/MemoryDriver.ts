import { IDriver, Query, Data } from '../interfaces/IDriver';

export class MemoryDriver implements IDriver {
  private data: Data[] = [];
  private idCounter: number = 1;

  async connect(): Promise<void> {
    this.data = [];
    this.idCounter = 1;
  }

  async disconnect(): Promise<void> {
    this.data = [];
  }

  async set(data: Data): Promise<Data> {
    const record = {
      _id: this.idCounter++,
      ...data,
      _createdAt: new Date().toISOString(),
    };
    this.data.push(record);
    return record;
  }

  async get(query: Query): Promise<Data[]> {
    return this.data.filter(record => this.matches(record, query));
  }

  async getOne(query: Query): Promise<Data | null> {
    const record = this.data.find(record => this.matches(record, query));
    return record || null;
  }

  async update(query: Query, data: Data): Promise<number> {
    let count = 0;
    this.data = this.data.map(record => {
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
    return count;
  }

  async delete(query: Query): Promise<number> {
    const initialLength = this.data.length;
    this.data = this.data.filter(record => !this.matches(record, query));
    return initialLength - this.data.length;
  }

  async exists(query: Query): Promise<boolean> {
    return this.data.some(record => this.matches(record, query));
  }

  async count(query: Query): Promise<number> {
    return this.data.filter(record => this.matches(record, query)).length;
  }

  private matches(record: Data, query: Query): boolean {
    if (Object.keys(query).length === 0) {
      return true;
    }

    return Object.keys(query).every(key => {
      const queryValue = query[key];
      const recordValue = record[key];

      if (typeof queryValue === 'object' && queryValue !== null) {
        if (typeof recordValue === 'object' && recordValue !== null) {
          return this.matches(recordValue, queryValue);
        }
        return false;
      }

      return recordValue === queryValue;
    });
  }

  async getAll(): Promise<Data[]> {
    return [...this.data];
  }

  async clear(): Promise<void> {
    this.data = [];
    this.idCounter = 1;
  }
}
