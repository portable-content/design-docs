/**
 * Core interfaces for the Portable Content System
 * Framework-agnostic definitions for content handling
 */

export enum ContentResolutionErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_CONTENT = 'INVALID_CONTENT',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  TIMEOUT = 'TIMEOUT'
}

export class ContentResolutionError extends Error {
  constructor(
    public type: ContentResolutionErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContentResolutionError';
  }
}

export interface PayloadSource {
  type: 'inline' | 'external';
  mediaType: string;
  source?: string;  // For inline content
  uri?: string;     // For external content
  width?: number;   // Optional dimensions for visual content
  height?: number;
}

export interface BlockContent {
  primary: PayloadSource;
  source?: PayloadSource;
  alternatives?: PayloadSource[];
}

export interface Block {
  id: string;
  kind: string;
  content: BlockContent;
}

export interface NormalizedContent {
  contentType: string;
  data: string | Blob;
  metadata: Record<string, unknown>;
}

export interface LazyContentHandle {
  get(): Promise<NormalizedContent>;
  cancel(): void;
  status: 'pending' | 'loading' | 'loaded' | 'error';
}

export interface LoadingStrategy {
  resolve(content: BlockContent): Promise<NormalizedContent> | LazyContentHandle;
  cancel?(handle: LazyContentHandle): void;
}

export interface ContentResolver {
  resolveContent(content: BlockContent): Promise<NormalizedContent> | LazyContentHandle;
  setStrategy(strategy: LoadingStrategy): void;
}

// Cache interfaces for future implementation
export interface CacheStrategy {
  get(key: string): Promise<NormalizedContent | undefined>;
  set(key: string, content: NormalizedContent): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Network interfaces for future implementation
export interface NetworkStrategy {
  fetch(uri: string): Promise<Response>;
  abort(request: string): void;
}

// Content type validation
export interface ContentValidator {
  validate(content: BlockContent): Promise<boolean>;
  validateSync(content: BlockContent): boolean;
}