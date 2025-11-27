import * as fs from 'fs/promises';
import * as path from 'path';
import { IDriver, Query, Data } from '../interfaces/IDriver';

export class FileDriver implements IDriver {
  private data: Data[] = [];
  private idCounter: number = 1;
  private filePath: string;
  private isLoaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  async connect(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      const content = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);
      this.data = parsed.data || [];
      this.idCounter = parsed.idCounter || 1;
      this.isLoaded = true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.data = [];
        this.idCounter = 1;
        await this.save();
        this.isLoaded = true;
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.save();
    this.data = [];
    this.isLoaded = false;
  }

  async set(data: Data): Promise<Data> {
    const record = {
      _id: this.idCounter++,
      ...data,
      _createdAt: new Date().toISOString(),
    };
    this.data.push(record);
    await this.save();
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
    await this.save();
    return count;
  }

  async delete(query: Query): Promise<number> {
    const initialLength = this.data.length;
    this.data = this.data.filter(record => !this.matches(record, query));
    const deletedCount = initialLength - this.data.length;
    await this.save();
    return deletedCount;
  }

  async exists(query: Query): Promise<boolean> {
    return this.data.some(record => this.matches(record, query));
  }

  async count(query: Query): Promise<number> {
    return this.data.filter(record => this.matches(record, query)).length;
  }

  private async save(): Promise<void> {
    const content = JSON.stringify({
      data: this.data,
      idCounter: this.idCounter,
      lastModified: new Date().toISOString(),
    }, null, 2);

    await fs.writeFile(this.filePath, content, 'utf-8');
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

  async clear(): Promise<void> {
    this.data = [];
    this.idCounter = 1;
    await this.save();
  }
}
