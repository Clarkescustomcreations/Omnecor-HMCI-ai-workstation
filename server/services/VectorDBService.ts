import { ChromaClient, Collection } from 'chromadb';

/**
 * Interface representing the standardized input structure for documents.
 */
export interface DocumentInput {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

/**
 * Interface representing a structured, ranked search result.
 */
export interface SearchResult {
  id: string;
  text: string;
  metadata: Record<string, any>;
  score: number;
}

/**
 * VectorDBService handles the native TypeScript integration layer for Omnecor's
 * local ChromaDB vector database instance.
 */
export class VectorDBService {
  private client: ChromaClient | null = null;
  private readonly chromaUrl: string;

  /**
   * Initializes the service configuration.
   * @param chromaUrl The endpoint of the local ChromaDB instance (defaults to standard local port).
   */
  constructor(chromaUrl: string = 'http://localhost:8000') {
    this.chromaUrl = chromaUrl;
  }

  /**
   * 1. init()
   * Connects to the local ChromaDB instance with a health check to guarantee connectivity.
   * Throws a descriptive error if the container or service is offline.
   */
  async init(): Promise<void> {
    try {
      this.client = new ChromaClient({ path: this.chromaUrl });
      
      // Perform a heartbeat check to ensure the local container is responsive
      await this.client.heartbeat();
      console.log(`[Omnecor VectorDB] Successfully connected to ChromaDB at ${this.chromaUrl}`);
    } catch (error) {
      this.client = null;
      console.error(`[Omnecor VectorDB Error] Failed to connect to ChromaDB at ${this.chromaUrl}. Ensure the Docker container is running.`);
      throw new Error(`Vector database offline: ${(error as Error).message}`);
    }
  }

  /**
   * Helper guard to ensure the client was initialized before executing operations.
   */
  private ensureClient(): ChromaClient {
    if (!this.client) {
      throw new Error('[Omnecor VectorDB Error] Service not initialized. Call init() first.');
    }
    return this.client;
  }

  /**
   * 2. createCollection(name: string)
   * Retrieves an existing collection or creates a new one if it doesn't exist.
   * Uses ChromaDB's default embedding function (all-MiniLM-L6-v2 running locally/server-side).
   */
  async createCollection(name: string): Promise<Collection> {
    const client = this.ensureClient();
    try {
      // getOrCreateCollection handles both instantiation paths natively
      const collection = await client.getOrCreateCollection({
        name: name,
        // Optional: override distance function here if needed (e.g., metadata: { "hnsw:space": "cosine" })
      });
      return collection;
    } catch (error) {
      console.error(`[Omnecor VectorDB Error] Failed to get/create collection "${name}":`, error);
      throw error;
    }
  }

  /**
   * 3. generateAndStoreEmbeddings(collectionName: string, documents: Array<DocumentInput>)
   * Stores documents into the specified collection.
   * Note: ChromaDB handles server-side embedding generation automatically via its default model 
   * when embeddings are omitted from the payload.
   */
  async generateAndStoreEmbeddings(
    collectionName: string,
    documents: DocumentInput[]
  ): Promise<void> {
    if (!documents || documents.length === 0) return;

    try {
      const collection = await this.createCollection(collectionName);

      // Map incoming array into distinct arrays required by Chroma's native schema
      const ids: string[] = [];
      const metadatas: Record<string, any>[] = [];
      const documentsText: string[] = [];

      for (const doc of documents) {
        // Basic naive chunking concept placeholder: If Omnecor passes massive files, 
        // they should be pre-chunked before calling this method to maintain semantic density.
        ids.push(doc.id);
        metadatas.push(doc.metadata);
        documentsText.push(doc.text);
      }

      // Batch upsert into Chroma DB
      await collection.upsert({
        ids: ids,
        metadatas: metadatas,
        documents: documentsText,
      });

      console.log(`[Omnecor VectorDB] Successfully upserted ${documents.length} documents into "${collectionName}".`);
    } catch (error) {
      console.error(`[Omnecor VectorDB Error] Failed embedding storage operation for "${collectionName}":`, error);
      throw error;
    }
  }

  /**
   * 4. semanticSearch(collectionName: string, query: string, limit: number = 5)
   * Queries the specified collection using natural language text and returns structured results.
   */
  async semanticSearch(
    collectionName: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const collection = await this.createCollection(collectionName);

      const queryResponse = await collection.query({
        queryTexts: [query],
        nResults: limit,
      });

      // Normalize the query arrays into a clean, flat array of SearchResults
      const results: SearchResult[] = [];
      
      const ids = queryResponse.ids[0] || [];
      const documents = queryResponse.documents[0] || [];
      const metadatas = queryResponse.metadatas[0] || [];
      const distances = queryResponse.distances ? queryResponse.distances[0] : [];

      for (let i = 0; i < ids.length; i++) {
        // ChromaDB defaults to L2 squared distance. Convert distance to a pseudo-similarity score if desired.
        // For standard L2, lower distance = closer match. We map it directly or pass raw distance.
        const distance = distances[i] !== undefined ? distances[i] : 0;

        results.push({
          id: ids[i],
          text: documents[i] || '',
          metadata: (metadatas[i] as Record<string, any>) || {},
          score: distance, // Storing raw distance metric (L2 squared distance)
        });
      }

      return this.buildSearchRanking(results);
    } catch (error) {
      console.error(`[Omnecor VectorDB Error] Semantic search failed on collection "${collectionName}":`, error);
      throw error;
    }
  }

  /**
   * 5. buildSearchRanking(results: SearchResult[])
   * Helper method that normalizes, sorts, and filters results.
   * Since Chroma defaults to L2 Squared distance, smaller distances mean higher relevance.
   * Filters out low-relevance matches exceeding a distance threshold.
   */
  public buildSearchRanking(results: SearchResult[]): SearchResult[] {
    // Maximum distance threshold to consider a result relevant (adjustable based on testing data parameters)
    const MAX_DISTANCE_THRESHOLD = 1.5;

    return results
      // Filter out low-confidence records
      .filter(item => item.score <= MAX_DISTANCE_THRESHOLD)
      // Sort ascending (0 is perfect match for L2 distance)
      .sort((a, b) => a.score - b.score);
  }
}