/**
 * Query interface for filtering data
 */
export interface Query {
  [key: string]: any;
}

/**
 * Data interface for storing information
 */
export interface Data {
  [key: string]: any;
}

/**
 * Driver interface that all database drivers must implement
 */
export interface IDriver {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Set/Insert data into the database
   * @param data - The data to store
   * @returns The stored data with any additional fields (like auto-generated IDs)
   */
  set(data: Data): Promise<Data>;

  /**
   * Get data from the database based on query
   * @param query - The query to filter data
   * @returns Array of matching records
   */
  get(query: Query): Promise<Data[]>;

  /**
   * Update data in the database
   * @param query - The query to find records to update
   * @param data - The new data to set
   * @returns Number of updated records
   */
  update(query: Query, data: Data): Promise<number>;

  /**
   * Delete data from the database
   * @param query - The query to find records to delete
   * @returns Number of deleted records
   */
  delete(query: Query): Promise<number>;

  /**
   * Get a single record from the database
   * @param query - The query to filter data
   * @returns A single matching record or null
   */
  getOne(query: Query): Promise<Data | null>;

  /**
   * Check if a record exists
   * @param query - The query to check
   * @returns True if exists, false otherwise
   */
  exists(query: Query): Promise<boolean>;

  /**
   * Count records matching the query
   * @param query - The query to filter data
   * @returns Number of matching records
   */
  count(query: Query): Promise<number>;
}
