import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    QueryConstraint,
    DocumentData,
    CollectionReference,
    Query as FirestoreQuery,
} from 'firebase/firestore';
import { IDriver, Query, Data } from '../interfaces/IDriver';

/**
 * Firebase driver configuration options
 */
export interface FirebaseDriverOptions {
    /**
     * Firebase configuration object
     */
    firebaseConfig: FirebaseOptions;

    /**
     * Collection name to use
     */
    collectionName: string;
}

/**
 * Driver implementation for Firebase Firestore.
 * Provides a schema-less interface to Firestore collections.
 */
export class FirebaseDriver implements IDriver {
    private app: FirebaseApp | null = null;
    private db: Firestore | null = null;
    private collectionName: string;
    private firebaseConfig: FirebaseOptions;
    private collectionRef: CollectionReference<DocumentData> | null = null;

    /**
     * Creates a new instance of FirebaseDriver
     * @param options - Firebase driver configuration options
     */
    constructor(options: FirebaseDriverOptions) {
        this.firebaseConfig = options.firebaseConfig;
        this.collectionName = options.collectionName;
    }

    /**
     * Connects to the Firebase database.
     * Initializes Firebase app and Firestore instance.
     */
    async connect(): Promise<void> {
        this.app = initializeApp(this.firebaseConfig);
        this.db = getFirestore(this.app);
        this.collectionRef = collection(this.db, this.collectionName);
    }

    /**
     * Disconnects from the Firebase database.
     * Note: Firebase doesn't require explicit disconnection, but we clean up references.
     */
    async disconnect(): Promise<void> {
        this.db = null;
        this.app = null;
        this.collectionRef = null;
    }

    /**
     * Inserts a new record into the database.
     * @param data - The data to insert
     * @returns The inserted record with Firestore ID
     */
    async set(data: Data): Promise<Data> {
        this.ensureConnected();

        const id = this.generateId();
        const docRef = doc(this.db!, this.collectionName, id);

        const record = {
            ...data,
            _id: id,
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
        };

        await setDoc(docRef, record);

        return record;
    }

    /**
     * Retrieves records matching the query.
     * @param query - The query criteria
     * @returns Array of matching records
     */
    async get(queryObj: Query): Promise<Data[]> {
        this.ensureConnected();

        if (Object.keys(queryObj).length === 0) {
            const snapshot = await getDocs(this.collectionRef!);
            return snapshot.docs.map((doc: any) => doc.data() as Data);
        }

        const constraints: QueryConstraint[] = [];
        for (const [key, value] of Object.entries(queryObj)) {
            constraints.push(where(key, '==', value));
        }

        const q = query(this.collectionRef!, ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc: any) => doc.data() as Data);
    }

    /**
     * Retrieves a single record matching the query.
     * @param query - The query criteria
     * @returns The first matching record or null
     */
    async getOne(queryObj: Query): Promise<Data | null> {
        this.ensureConnected();

        if (queryObj._id) {
            const docRef = doc(this.db!, this.collectionName, queryObj._id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as Data;
            }
            return null;
        }

        const results = await this.get(queryObj);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Updates records matching the query.
     * @param query - The query criteria
     * @param data - The data to update
     * @returns The number of updated records
     */
    async update(queryObj: Query, data: Data): Promise<number> {
        this.ensureConnected();

        const records = await this.get(queryObj);
        let count = 0;

        for (const record of records) {
            const docRef = doc(this.db!, this.collectionName, record._id);
            const updateData: any = {
                ...data,
                _updatedAt: new Date().toISOString(),
            };

            delete updateData._id;

            await updateDoc(docRef, updateData);
            count++;
        }

        return count;
    }

    /**
     * Deletes records matching the query.
     * @param query - The query criteria
     * @returns The number of deleted records
     */
    async delete(queryObj: Query): Promise<number> {
        this.ensureConnected();

        const records = await this.get(queryObj);
        let count = 0;

        for (const record of records) {
            const docRef = doc(this.db!, this.collectionName, record._id);
            await deleteDoc(docRef);
            count++;
        }

        return count;
    }

    /**
     * Checks if any record matches the query.
     * @param query - The query criteria
     * @returns True if a match exists, false otherwise
     */
    async exists(queryObj: Query): Promise<boolean> {
        this.ensureConnected();

        const result = await this.getOne(queryObj);
        return result !== null;
    }

    /**
     * Counts records matching the query.
     * @param query - The query criteria
     * @returns The number of matching records
     */
    async count(queryObj: Query): Promise<number> {
        this.ensureConnected();

        const results = await this.get(queryObj);
        return results.length;
    }

    /**
     * Ensures the database is connected before executing operations.
     * @throws Error if database is not connected
     * @private
     */
    private ensureConnected(): void {
        if (!this.db || !this.collectionRef) {
            throw new Error('Database not connected. Call connect() first.');
        }
    }

    /**
     * Generates a unique ID for documents.
     * @returns A unique string ID
     * @private
     */
    private generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Gets the Firestore collection reference.
     * @returns The Firestore collection reference
     */
    getCollectionRef(): CollectionReference<DocumentData> | null {
        return this.collectionRef;
    }

    /**
     * Gets the Firestore instance.
     * @returns The Firestore instance
     */
    getFirestore(): Firestore | null {
        return this.db;
    }

    /**
     * Gets the Firebase app instance.
     * @returns The Firebase app instance
     */
    getApp(): FirebaseApp | null {
        return this.app;
    }

    /**
     * Clears all data from the collection.
     */
    async clear(): Promise<void> {
        this.ensureConnected();
        await this.delete({});
    }
}
