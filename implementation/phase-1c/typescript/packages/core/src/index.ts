/**
 * @portable-content/core
 * Framework-agnostic content resolution and handling
 */

// Export core interfaces
export type {
  Block,
  BlockContent,
  ContentResolver,
  ContentValidator,
  LazyContentHandle,
  LoadingStrategy,
  NormalizedContent,
  PayloadSource,
  CacheStrategy,
  NetworkStrategy
} from './interfaces';

// Export error types
export {
  ContentResolutionError,
  ContentResolutionErrorType
} from './interfaces';

// Export default implementations
export {
  EagerLoadingStrategy,
  DefaultContentResolver,
  contentResolver
} from './content-resolver';

// Constants and utilities can be added here as needed
export const VERSION = '0.1.0';