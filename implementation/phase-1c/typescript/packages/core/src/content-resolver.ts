import {
  BlockContent,
  ContentResolver,
  ContentResolutionError,
  ContentResolutionErrorType,
  LazyContentHandle,
  LoadingStrategy,
  NormalizedContent,
  PayloadSource
} from './interfaces';

/**
 * Default implementation of eager loading strategy
 * Framework-agnostic content resolution
 */
export class EagerLoadingStrategy implements LoadingStrategy {
  private async fetchContent(uri: string): Promise<Response> {
    try {
      return await fetch(uri);
    } catch (error) {
      throw new ContentResolutionError(
        ContentResolutionErrorType.NETWORK_ERROR,
        'Failed to fetch external content',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async processResponse(response: Response, mediaType: string): Promise<string | Blob> {
    if (!response.ok) {
      throw new ContentResolutionError(
        ContentResolutionErrorType.NETWORK_ERROR,
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    return mediaType.startsWith('text/') ? await response.text() : await response.blob();
  }

  private normalizeInlineContent(source: PayloadSource): NormalizedContent {
    if (!source.source) {
      throw new ContentResolutionError(
        ContentResolutionErrorType.INVALID_CONTENT,
        'Inline content source is missing'
      );
    }

    return {
      contentType: source.mediaType,
      data: source.source,
      metadata: {
        width: source.width,
        height: source.height
      }
    };
  }

  private async normalizeExternalContent(source: PayloadSource): Promise<NormalizedContent> {
    if (!source.uri) {
      throw new ContentResolutionError(
        ContentResolutionErrorType.INVALID_CONTENT,
        'External content URI is missing'
      );
    }

    const response = await this.fetchContent(source.uri);
    const data = await this.processResponse(response, source.mediaType);

    return {
      contentType: source.mediaType,
      data,
      metadata: {
        width: source.width,
        height: source.height
      }
    };
  }

  async resolve(content: BlockContent): Promise<NormalizedContent> {
    try {
      const { primary } = content;
      return primary.type === 'inline'
        ? this.normalizeInlineContent(primary)
        : await this.normalizeExternalContent(primary);
    } catch (error) {
      if (error instanceof ContentResolutionError) {
        throw error;
      }
      throw new ContentResolutionError(
        ContentResolutionErrorType.INVALID_CONTENT,
        'Failed to resolve content',
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Default implementation of ContentResolver
 * Uses strategy pattern to support different loading behaviors
 */
export class DefaultContentResolver implements ContentResolver {
  constructor(private strategy: LoadingStrategy = new EagerLoadingStrategy()) {}

  resolveContent(content: BlockContent): Promise<NormalizedContent> | LazyContentHandle {
    return this.strategy.resolve(content);
  }

  setStrategy(strategy: LoadingStrategy): void {
    this.strategy = strategy;
  }
}

// Export singleton instance for convenience
export const contentResolver = new DefaultContentResolver();