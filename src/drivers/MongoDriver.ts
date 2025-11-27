import { MongoClient, Db, Collection, Document, ObjectId } from 'mongodb';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * MongoDB driver configuration options
 */
export interface MongoDriverOptions {
    /**
     * MongoDB connection URI
     * Example: 'mongodb://localhost:27017'
     */
    uri: string;

    /**
     * Database name to use
     */
    databaseName: string;

    /**
     * Collection name to use
     */
    collectionName: string;

    /**
     * Additional MongoDB client options
     */
    clientOptions?: any;
}

/**
 * Driver implementation for MongoDB.
 * Provides a schema-less interface to MongoDB collections.
 */
export class MongoDriver implements IDriver {
    private client: MongoClient;
    private db: Db | null = null;
    private collection: Collection<Document> | null = null;
    private uri: string;
    private databaseName: string;
    private collectionName: string;
    private clientOptions: any;

    /**
     * Creates a new instance of MongoDriver
     * @param options - MongoDB driver configuration options
     */
    constructor(options: MongoDriverOptions) {
        this.uri = options.uri;
        this.databaseName = options.databaseName;
        this.collectionName = options.collectionName;
        this.clientOptions = options.clientOptions || {};
        this.client = new MongoClient(this.uri, this.clientOptions);
    }

    /**
     * Connects to the MongoDB database.
     * Establishes connection and initializes database and collection references.
     */
    async connect(): Promise<void> {
        await this.client.connect();
        this.db = this.client.db(this.databaseName);
        this.collection = this.db.collection(this.collectionName);
    }

    /**
     * Disconnects from the MongoDB database.
     * Closes the MongoDB client connection.
     */
    async disconnect(): Promise<void> {
        await this.client.close();
        this.db = null;
        this.collection = null;
    }

    /**
     * Inserts a new record into the database.
     * @param data - The data to insert
     * @returns The inserted record with MongoDB _id
     */
    async set(data: Data): Promise<Data> {
        this.ensureConnected();

        const record = {
            ...data,
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
        };

        const result = await this.collection!.insertOne(record);

        return {
            ...record,
            _id: result.insertedId.toString(),
        };
    }

    /**
     * Retrieves records matching the query.
     * @param query - The query criteria
     * @returns Array of matching records
     */
    async get(query: Query): Promise<Data[]> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        const cursor = this.collection!.find(mongoQuery);
        const results = await cursor.toArray();

        return results.map((doc: Document) => this.convertDocument(doc));
    }

    /**
     * Retrieves a single record matching the query.
     * @param query - The query criteria
     * @returns The first matching record or null
     */
    async getOne(query: Query): Promise<Data | null> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        const result = await this.collection!.findOne(mongoQuery);

        return result ? this.convertDocument(result) : null;
    }

    /**
     * Updates records matching the query.
     * @param query - The query criteria
     * @param data - The data to update
     * @returns The number of updated records
     */
    async update(query: Query, data: Data): Promise<number> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        const updateData: any = {
            ...data,
            _updatedAt: new Date().toISOString(),
        };

        delete updateData._id;

        const result = await this.collection!.updateMany(
            mongoQuery,
            { $set: updateData }
        );

        return result.modifiedCount;
    }

    /**
     * Deletes records matching the query.
     * @param query - The query criteria
     * @returns The number of deleted records
     */
    async delete(query: Query): Promise<number> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        const result = await this.collection!.deleteMany(mongoQuery);

        return result.deletedCount;
    }

    /**
     * Checks if any record matches the query.
     * @param query - The query criteria
     * @returns True if a match exists, false otherwise
     */
    async exists(query: Query): Promise<boolean> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        const count = await this.collection!.countDocuments(mongoQuery, { limit: 1 });

        return count > 0;
    }

    /**
     * Counts records matching the query.
     * @param query - The query criteria
     * @returns The number of matching records
     */
    async count(query: Query): Promise<number> {
        this.ensureConnected();

        const mongoQuery = this.convertQuery(query);
        return await this.collection!.countDocuments(mongoQuery);
    }

    /**
     * Ensures the database is connected before executing operations.
     * @throws Error if database is not connected
     * @private
     */
    private ensureConnected(): void {
        if (!this.collection) {
            throw new Error('Database not connected. Call connect() first.');
        }
    }

    /**
     * Converts Hawiah query format to MongoDB query format.
     * Handles special cases like _id conversion to ObjectId.
     * @param query - The Hawiah query
     * @returns MongoDB-compatible query
     * @private
     */
    private convertQuery(query: Query): any {
        const mongoQuery: any = {};

        for (const [key, value] of Object.entries(query)) {
            if (key === '_id') {
                if (typeof value === 'string' && ObjectId.isValid(value)) {
                    mongoQuery._id = new ObjectId(value);
                } else if (typeof value === 'number') {
                    mongoQuery._id = value;
                } else {
                    mongoQuery._id = value;
                }
            } else {
                mongoQuery[key] = value;
            }
        }

        return mongoQuery;
    }

    /**
     * Converts MongoDB document to Hawiah data format.
     * Converts ObjectId to string for consistency.
     * @param doc - MongoDB document
     * @returns Hawiah data object
     * @private
     */
    private convertDocument(doc: Document): Data {
        const { _id, ...rest } = doc;

        return {
            _id: _id instanceof ObjectId ? _id.toString() : _id,
            ...rest,
        };
    }

    /**
     * Gets the MongoDB collection instance.
     * @returns The MongoDB collection
     */
    getCollection(): Collection<Document> | null {
        return this.collection;
    }

    /**
     * Gets the MongoDB database instance.
     * @returns The MongoDB database
     */
    getDatabase(): Db | null {
        return this.db;
    }

    /**
     * Gets the MongoDB client instance.
     * @returns The MongoDB client
     */
    getClient(): MongoClient {
        return this.client;
    }

    /**
     * Creates an index on the collection.
     * @param fieldOrSpec - Field name or index specification
     * @param options - Index options
     */
    async createIndex(fieldOrSpec: string | any, options?: any): Promise<string> {
        this.ensureConnected();
        return await this.collection!.createIndex(fieldOrSpec, options);
    }

    /**
     * Drops an index from the collection.
     * @param indexName - Name of the index to drop
     */
    async dropIndex(indexName: string): Promise<void> {
        this.ensureConnected();
        await this.collection!.dropIndex(indexName);
    }

    /**
     * Lists all indexes on the collection.
     * @returns Array of index information
     */
    async listIndexes(): Promise<any[]> {
        this.ensureConnected();
        const cursor = this.collection!.listIndexes();
        return await cursor.toArray();
    }

    /**
     * Performs an aggregation pipeline on the collection.
     * @param pipeline - Aggregation pipeline stages
     * @returns Array of aggregation results
     */
    async aggregate(pipeline: any[]): Promise<any[]> {
        this.ensureConnected();
        const cursor = this.collection!.aggregate(pipeline);
        return await cursor.toArray();
    }

    /**
     * Clears all data from the collection.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        await this.collection!.deleteMany({});
    }

    /**
     * Drops the entire collection.
     * WARNING: This will permanently delete all data and indexes.
     */
    async drop(): Promise<void> {
        this.ensureConnected();
        await this.collection!.drop();
    }
}
