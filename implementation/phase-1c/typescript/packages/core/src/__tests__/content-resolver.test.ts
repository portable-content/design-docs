import { 
  BlockContent, 
  ContentResolutionError, 
  ContentResolutionErrorType,
  EagerLoadingStrategy, 
  DefaultContentResolver 
} from '../';

describe('ContentResolver', () => {
  let resolver: DefaultContentResolver;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    resolver = new DefaultContentResolver();
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('EagerLoadingStrategy', () => {
    describe('inline content', () => {
      it('resolves inline markdown content', async () => {
        const content: BlockContent = {
          primary: {
            type: 'inline',
            mediaType: 'text/markdown',
            source: '# Hello World'
          }
        };

        const result = await resolver.resolveContent(content);
        expect(result).toEqual({
          contentType: 'text/markdown',
          data: '# Hello World',
          metadata: {}
        });
      });

      it('throws error for inline content without source', async () => {
        const content: BlockContent = {
          primary: {
            type: 'inline',
            mediaType: 'text/markdown'
          }
        };

        await expect(resolver.resolveContent(content)).rejects.toThrow(
          new ContentResolutionError(
            ContentResolutionErrorType.INVALID_CONTENT,
            'Inline content source is missing'
          )
        );
      });
    });

    describe('external content', () => {
      it('resolves external text content', async () => {
        const mockResponse = '# External Content';
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockResponse)
        } as Response);

        const content: BlockContent = {
          primary: {
            type: 'external',
            mediaType: 'text/markdown',
            uri: 'https://example.com/content.md'
          }
        };

        const result = await resolver.resolveContent(content);
        expect(result).toEqual({
          contentType: 'text/markdown',
          data: mockResponse,
          metadata: {}
        });
      });

      it('resolves external binary content', async () => {
        const mockBlob = new Blob(['test'], { type: 'image/png' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(mockBlob)
        } as Response);

        const content: BlockContent = {
          primary: {
            type: 'external',
            mediaType: 'image/png',
            uri: 'https://example.com/image.png'
          }
        };

        const result = await resolver.resolveContent(content);
        expect(result).toEqual({
          contentType: 'image/png',
          data: mockBlob,
          metadata: {}
        });
      });

      it('throws network error for failed fetch', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const content: BlockContent = {
          primary: {
            type: 'external',
            mediaType: 'text/markdown',
            uri: 'https://example.com/content.md'
          }
        };

        await expect(resolver.resolveContent(content)).rejects.toThrow(
          new ContentResolutionError(
            ContentResolutionErrorType.NETWORK_ERROR,
            'Failed to fetch external content'
          )
        );
      });

      it('throws error for external content without URI', async () => {
        const content: BlockContent = {
          primary: {
            type: 'external',
            mediaType: 'text/markdown'
          }
        };

        await expect(resolver.resolveContent(content)).rejects.toThrow(
          new ContentResolutionError(
            ContentResolutionErrorType.INVALID_CONTENT,
            'External content URI is missing'
          )
        );
      });
    });
  });

  describe('Strategy switching', () => {
    it('allows switching strategies', () => {
      const mockStrategy = {
        resolve: jest.fn()
      };

      resolver.setStrategy(mockStrategy);
      const content: BlockContent = {
        primary: {
          type: 'inline',
          mediaType: 'text/markdown',
          source: 'test'
        }
      };

      resolver.resolveContent(content);
      expect(mockStrategy.resolve).toHaveBeenCalledWith(content);
    });
  });
});