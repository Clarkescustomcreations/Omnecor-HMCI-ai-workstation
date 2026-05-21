import { ChromaClient, Collection } from 'chromadb';

export class VectorDBService {
  private static instance: VectorDBService | null = null;
  private client: ChromaClient | null = null;
  private isInitialized: boolean = false;
  private readonly chromaUrl: string = 'http://localhost:8000';

  private constructor() {}

  /**
   * Retrieves the singleton instance of the VectorDBService.
   */
  public static getInstance(): VectorDBService {
    if (!VectorDBService.instance) {
      VectorDBService.instance = new VectorDBService();
    }
    return VectorDBService.instance;
  }

  /**
   * Initializes the connection to the local ChromaDB instance.
   * Includes a heartbeat check to handle offline container states gracefully.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.client = new ChromaClient({ path: this.chromaUrl });
      
      // Perform a heartbeat check to verify the ChromaDB container is up and running
      await this.client.heartbeat();
      
      this.isInitialized = true;
      console.log(`[Omnecor VectorDB] Successfully connected to ChromaDB at ${this.chromaUrl}`);
    } catch (error) {
      this.isInitialized = false;
      this.client = null;
      throw new Error(
        `[Omnecor VectorDB Visual Failure] Could not connect to ChromaDB at ${this.chromaUrl}. ` +
        `Ensure your ChromaDB Docker container is running and healthy. Details: ${(error as Error).message}`
      );
    }
  }

  /**
   * Helper guard to ensure methods aren't called before init().
   */
  private ensureInitialized(): ChromaClient {
    if (!this.isInitialized || !this.client) {
      throw new Error('[Omnecor VectorDB] Service not initialized. Call init() before performing operations.');
    }
    return this.client;
  }

  /**
   * Gets an existing collection or creates a new one if it doesn't exist.
   */
  public async getOrCreateCollection(name: string): Promise<Collection> {
    const client = this.ensureInitialized();
    try {
      return await client.getOrCreateCollection({
        name: name,
      });
    } catch (error) {
      throw new Error(`[Omnecor VectorDB] Failed to get or create collection '${name}': ${(error as Error).message}`);
    }
  }

  /**
   * Adds an array of documents to a specified collection.
   * Utilizes Chroma's default built-in embedding function (handled automatically on server-side).
   */
  public async addDocuments(
    collectionName: string,
    documents: Array<{ id: string; text: string; metadata: Record<string, any> }>
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);

    if (documents.length === 0) return;

    try {
      const ids: string[] = [];
      const metadatas: Record<string, any>[] = [];
      const documentsText: string[] = [];

      for (const doc of documents) {
        ids.push(doc.id);
        metadatas.push(doc.metadata);
        documentsText.push(doc.text);
      }

      await collection.add({
        ids,
        metadatas,
        documents: documentsText,
      });
      
      console.log(`[Omnecor VectorDB] Successfully ingested ${documents.length} document(s) into '${collectionName}'`);
    } catch (error) {
      throw new Error(`[Omnecor VectorDB] Batch ingestion failed for collection '${collectionName}': ${(error as Error).message}`);
    }
  }

  /**
   * Performs a semantic similarity search across the target collection.
   * Returns formatted historical/contextual documents along with their metadata and distances.
   */
  public async semanticSearch(
    collectionName: string,
    query: string,
    limit: number = 5
  ): Promise<Array<{ id: string; text: string | null; metadata: Record<string, any> | null; distance: number | null }>> {
    const collection = await this.getOrCreateCollection(collectionName);

    try {
      const results = await collection.query({
        queryTexts: [query],
        nResults: limit,
      });

      // Transform Chroma's parallel arrays back into a clean, structured object array
      const formattedResults: Array<{
        id: string;
        text: string | null;
        metadata: Record<string, any> | null;
        distance: number | null;
      }> = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          formattedResults.push({
            id: results.ids[0][i],
            text: results.documents && results.documents[0] ? results.documents[0][i] : null,
            metadata: results.metadatas && results.metadatas[0] ? results.metadatas[0][i] : null,
            distance: results.distances && results.distances[0] ? results.distances[0][i] : null,
          });
        }
      }

      return formattedResults;
    } catch (error) {
      throw new Error(`[Omnecor VectorDB] Query failed on collection '${collectionName}': ${(error as Error).message}`);
    }
  }
}