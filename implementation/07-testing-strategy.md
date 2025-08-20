# Testing Strategy

## Overview

Comprehensive testing is critical for the Portable Content System to ensure reliability, security, and cross-platform compatibility. This document outlines the testing approach for Phase 1 implementation.

## Testing Pyramid

### Unit Tests (Foundation)
- **Scope**: Individual functions, classes, and components
- **Coverage Target**: 90%+ for core business logic
- **Tools**: PHPUnit (PHP), Jest (TypeScript/Node.js), pytest (Python)

### Integration Tests (Middle)
- **Scope**: Component interactions, API endpoints, database operations
- **Coverage Target**: 80%+ for critical paths
- **Tools**: PHPUnit with database, Supertest (Node.js), pytest with fixtures

### End-to-End Tests (Top)
- **Scope**: Complete user workflows, cross-system integration
- **Coverage Target**: 100% of critical user journeys
- **Tools**: Playwright, Cypress, or similar

## Test Categories

### 1. Data Model Tests

#### JSON Schema Validation
```javascript
// Jest test for ContentItem schema validation
import Ajv from 'ajv';
import contentItemSchema from '../schemas/content-item.schema.json';
import blockSchema from '../schemas/block.schema.json';

describe('ContentItem Schema Validation', () => {
  let ajv;
  
  beforeAll(() => {
    ajv = new Ajv();
    ajv.addSchema(blockSchema, 'block.schema.json');
  });

  test('validates valid ContentItem', () => {
    const validContent = {
      id: 'content_123',
      type: 'note',
      title: 'Test Content',
      blocks: [
        {
          id: 'block_123',
          kind: 'markdown',
          payload: { source: '# Hello' },
          variants: [
            {
              mediaType: 'text/markdown',
              uri: 's3://bucket/path/file.md'
            }
          ]
        }
      ]
    };

    const validate = ajv.compile(contentItemSchema);
    const valid = validate(validContent);
    
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  test('rejects invalid ContentItem', () => {
    const invalidContent = {
      // Missing required 'id' field
      type: 'note',
      blocks: []
    };

    const validate = ajv.compile(contentItemSchema);
    const valid = validate(invalidContent);
    
    expect(valid).toBe(false);
    expect(validate.errors).toContainEqual(
      expect.objectContaining({
        instancePath: '',
        schemaPath: '#/required',
        keyword: 'required',
        params: { missingProperty: 'id' }
      })
    );
  });
});
```

#### PHP Data Model Tests
```php
<?php

use PHPUnit\Framework\TestCase;

class ContentItemTest extends TestCase
{
    private PDO $db;
    private ContentRepository $repository;

    protected function setUp(): void
    {
        // Use in-memory SQLite for tests
        $this->db = new PDO('sqlite::memory:');
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->db->exec('PRAGMA foreign_keys = ON');

        // Create tables
        $this->db->exec(file_get_contents(__DIR__ . '/../migrations/001_create_tables.sql'));

        $this->repository = new ContentRepository($this->db);
    }

    public function testCreateAndRetrieveContent(): void
    {
        $content = ContentItem::create('note', 'Test Content', 'A test note');
        $content->blocks[] = MarkdownBlock::create('# Hello World\n\nThis is a test.');

        // Save content
        $this->repository->save($content);

        // Retrieve content
        $retrieved = $this->repository->findById($content->id);

        $this->assertNotNull($retrieved);
        $this->assertEquals($content->id, $retrieved->id);
        $this->assertEquals('Test Content', $retrieved->title);
        $this->assertCount(1, $retrieved->blocks);
        $this->assertEquals('# Hello World\n\nThis is a test.', $retrieved->blocks[0]->source);
    }

    public function testContentValidation(): void
    {
        $validator = new ContentValidator();

        $validData = [
            'type' => 'note',
            'title' => 'Valid Content',
            'blocks' => [
                [
                    'kind' => 'markdown',
                    'payload' => ['source' => '# Valid markdown']
                ]
            ]
        ];

        $errors = $validator->validateCreateRequest($validData);
        $this->assertEmpty($errors);

        $invalidData = [
            'type' => '',
            'blocks' => []
        ];

        $errors = $validator->validateCreateRequest($invalidData);
        $this->assertNotEmpty($errors);
        $this->assertContains('Content type is required', $errors);
        $this->assertContains('At least one block is required', $errors);
    }
}
```

### 2. Transform Pipeline Tests

#### Transform Contract Tests
```python
# pytest tests for transform contracts
import json
import tempfile
import subprocess
from pathlib import Path

class TestMermaidTransform:
    def test_mermaid_svg_generation(self):
        """Test mermaid diagram to SVG conversion"""
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_dir = temp_path / 'input'
            output_dir = temp_path / 'output'
            input_dir.mkdir()
            output_dir.mkdir()
            
            # Create test input
            mermaid_source = "graph TD;\n    A-->B;\n    A-->C;"
            (input_dir / 'payload.mmd').write_text(mermaid_source)
            
            # Run transform
            result = subprocess.run([
                'docker', 'run', '--rm',
                '-v', f'{input_dir}:/input:ro',
                '-v', f'{output_dir}:/output:rw',
                '-e', 'OUTPUT_SPECS_JSON=[{"media_type": "image/svg+xml;profile=mermaid", "options": {"format": "svg"}}]',
                'ghcr.io/portable-content/mermaid-cli:1.0.0'
            ], capture_output=True, text=True)
            
            assert result.returncode == 0, f"Transform failed: {result.stderr}"
            
            # Verify outputs
            metadata_file = output_dir / 'metadata.json'
            assert metadata_file.exists(), "metadata.json not generated"
            
            metadata = json.loads(metadata_file.read_text())
            assert len(metadata['variants']) == 1
            
            variant = metadata['variants'][0]
            assert variant['media_type'] == 'image/svg+xml;profile=mermaid'
            assert 'width' in variant
            assert 'height' in variant
            assert 'content_hash' in variant
            
            # Verify SVG file exists and is valid
            svg_file = output_dir / variant['filename']
            assert svg_file.exists(), "SVG file not generated"
            
            svg_content = svg_file.read_text()
            assert svg_content.startswith('<svg'), "Invalid SVG content"
            assert 'viewBox' in svg_content, "SVG missing viewBox"

    def test_mermaid_png_generation(self):
        """Test mermaid diagram to PNG conversion"""
        # Similar test for PNG output
        pass

    def test_invalid_mermaid_syntax(self):
        """Test handling of invalid mermaid syntax"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_dir = temp_path / 'input'
            output_dir = temp_path / 'output'
            input_dir.mkdir()
            output_dir.mkdir()
            
            # Create invalid input
            (input_dir / 'payload.mmd').write_text("invalid mermaid syntax")
            
            # Run transform - should fail gracefully
            result = subprocess.run([
                'docker', 'run', '--rm',
                '-v', f'{input_dir}:/input:ro',
                '-v', f'{output_dir}:/output:rw',
                'ghcr.io/portable-content/mermaid-cli:1.0.0'
            ], capture_output=True, text=True)
            
            assert result.returncode != 0, "Transform should fail with invalid input"
```

#### Golden File Tests
```python
class TestTransformGoldenFiles:
    """Test transforms against known good outputs"""
    
    def test_markdown_html_golden(self):
        """Test markdown to HTML against golden file"""
        
        test_cases = [
            {
                'name': 'basic_formatting',
                'input': '# Title\n\n**Bold** and *italic* text.',
                'expected_file': 'golden/markdown/basic_formatting.html'
            },
            {
                'name': 'code_blocks',
                'input': '```javascript\nconsole.log("hello");\n```',
                'expected_file': 'golden/markdown/code_blocks.html'
            }
        ]
        
        for case in test_cases:
            with self.subTest(case=case['name']):
                result = self.run_markdown_transform(case['input'])
                expected = Path(case['expected_file']).read_text()
                
                # Normalize whitespace for comparison
                result_normalized = ' '.join(result.split())
                expected_normalized = ' '.join(expected.split())
                
                assert result_normalized == expected_normalized, \
                    f"Output doesn't match golden file for {case['name']}"
```

### 3. API Tests

#### GraphQL API Tests
```javascript
// Supertest + GraphQL testing
import request from 'supertest';
import { app } from '../src/app';

describe('GraphQL Content API', () => {
  test('retrieves content with capability-based variant selection', async () => {
    // Create test content
    const contentId = await createTestContent();
    
    const query = `
      query GetContent($id: ID!, $capabilities: CapabilitiesInput!) {
        content(id: $id, capabilities: $capabilities) {
          id
          title
          blocks {
            id
            kind
            variants {
              mediaType
              uri
            }
          }
        }
      }
    `;
    
    const variables = {
      id: contentId,
      capabilities: {
        accept: ['image/svg+xml', 'text/html', 'text/markdown'],
        hints: { width: 800, network: 'FAST' }
      }
    };
    
    const response = await request(app)
      .post('/graphql')
      .send({ query, variables })
      .expect(200);
    
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.content).toBeDefined();
    expect(response.body.data.content.id).toBe(contentId);
    
    // Verify variant selection
    const mermaidBlock = response.body.data.content.blocks
      .find(b => b.kind === 'mermaid');
    
    expect(mermaidBlock).toBeDefined();
    expect(mermaidBlock.variants).toHaveLength(1); // Should select best variant
    expect(mermaidBlock.variants[0].mediaType).toBe('image/svg+xml;profile=mermaid');
  });

  test('handles content not found', async () => {
    const query = `
      query GetContent($id: ID!) {
        content(id: $id) {
          id
        }
      }
    `;
    
    const response = await request(app)
      .post('/graphql')
      .send({ 
        query, 
        variables: { id: 'nonexistent_id' } 
      })
      .expect(200);
    
    expect(response.body.data.content).toBeNull();
  });
});
```

#### REST API Tests
```php
<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentControllerTest extends TestCase
{
    use RefreshDatabase;

    public function testCreateContent(): void
    {
        $user = User::factory()->create();

        $contentData = [
            'type' => 'note',
            'title' => 'Test Content',
            'blocks' => [
                [
                    'kind' => 'markdown',
                    'payload' => [
                        'source' => '# Hello World'
                    ]
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/v1/content', $contentData);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'content' => [
                    'id',
                    'type',
                    'title',
                    'blocks' => [
                        '*' => ['id', 'kind', 'variants']
                    ]
                ]
            ]);

        $this->assertDatabaseHas('content_items', [
            'type' => 'note',
            'title' => 'Test Content'
        ]);
    }

    public function testCreateContentValidation(): void
    {
        $user = User::factory()->create();

        $invalidData = [
            'type' => '', // Invalid: empty type
            'blocks' => [] // Invalid: no blocks
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/v1/content', $invalidData);

        $response->assertStatus(400)
            ->assertJsonValidationErrors(['type', 'blocks']);
    }
}
```

### 4. Variant Selection Tests

```php
class VariantSelectorTest extends TestCase
{
    public function testSelectsBestImageVariant(): void
    {
        $variants = [
            new Variant('image/jpeg', 'original.jpg', 2048, 1536, 500000),
            new Variant('image/webp;width=800', 'image-800.webp', 800, 600, 45000),
            new Variant('image/avif;width=800', 'image-800.avif', 800, 600, 32000),
        ];

        $capabilities = new Capabilities(
            accept: ['image/avif', 'image/webp', 'image/jpeg'],
            hints: new CapabilityHints(width: 800, network: 'FAST')
        );

        $selector = new VariantSelector();
        $selected = $selector->selectBest($variants, $capabilities);

        // Should prefer AVIF for modern browsers with fast network
        $this->assertEquals('image/avif;width=800', $selected->mediaType);
    }

    public function testFallbackToSupportedFormat(): void
    {
        $variants = [
            new Variant('image/avif;width=800', 'image.avif', 800, 600, 32000),
            new Variant('image/webp;width=800', 'image.webp', 800, 600, 45000),
            new Variant('image/jpeg', 'image.jpg', 2048, 1536, 500000),
        ];

        $capabilities = new Capabilities(
            accept: ['image/jpeg', 'image/png'], // No modern format support
            hints: new CapabilityHints(width: 800)
        );

        $selector = new VariantSelector();
        $selected = $selector->selectBest($variants, $capabilities);

        // Should fallback to JPEG
        $this->assertEquals('image/jpeg', $selected->mediaType);
    }
}
```

### 5. Security Tests

```php
class SecurityTest extends TestCase
{
    public function testHTMLSanitization(): void
    {
        $maliciousMarkdown = '# Title\n\n<script>alert("xss")</script>\n\n[Link](javascript:alert("xss"))';
        
        $transformer = new MarkdownTransformer();
        $html = $transformer->toHtml($maliciousMarkdown);
        
        // Should strip dangerous elements and attributes
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('javascript:', $html);
        $this->assertStringContainsString('<h1>Title</h1>', $html);
    }

    public function testSVGSanitization(): void
    {
        $maliciousSVG = '<svg><script>alert("xss")</script><rect width="100" height="100"/></svg>';
        
        $sanitizer = new SVGSanitizer();
        $cleanSVG = $sanitizer->sanitize($maliciousSVG);
        
        $this->assertStringNotContainsString('<script>', $cleanSVG);
        $this->assertStringContainsString('<rect', $cleanSVG);
    }

    public function testFileUploadValidation(): void
    {
        $user = User::factory()->create();
        
        // Test malicious file upload
        $maliciousFile = UploadedFile::fake()->create('malware.exe', 1000);
        
        $response = $this->actingAs($user)
            ->post('/api/v1/upload', ['file' => $maliciousFile]);
        
        $response->assertStatus(400)
            ->assertJsonValidationErrors(['file']);
    }
}
```

### 6. Performance Tests

```javascript
// Load testing with Artillery or similar
describe('Performance Tests', () => {
  test('content creation under load', async () => {
    const promises = [];
    const concurrentRequests = 50;
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(createTestContent());
    }
    
    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    // All requests should succeed
    expect(results.every(r => r.status === 201)).toBe(true);
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  test('variant selection performance', () => {
    const variants = generateManyVariants(1000);
    const capabilities = generateTestCapabilities();
    
    const start = performance.now();
    const selected = selectBestVariant(variants, capabilities);
    const duration = performance.now() - start;
    
    expect(selected).toBeDefined();
    expect(duration).toBeLessThan(100); // Should be fast
  });
});
```

## Test Data Management

### Test Fixtures
```php
// Database seeders for consistent test data
class ContentTestSeeder extends Seeder
{
    public function run(): void
    {
        // Create test content with all block types
        $content = ContentItem::factory()->create([
            'type' => 'note',
            'title' => 'Test Content with All Block Types'
        ]);

        // Add markdown block
        $markdownBlock = Block::factory()->markdown()->create([
            'content_id' => $content->id,
            'payload' => ['source' => '# Test Markdown\n\nThis is **bold** text.']
        ]);

        // Add mermaid block
        $mermaidBlock = Block::factory()->mermaid()->create([
            'content_id' => $content->id,
            'payload' => [
                'source' => 'graph TD;\n    A-->B;\n    A-->C;',
                'theme' => 'default'
            ]
        ]);

        // Add image block
        $imageBlock = Block::factory()->image()->create([
            'content_id' => $content->id,
            'payload' => [
                'uri' => 's3://test-bucket/test-image.jpg',
                'alt' => 'Test image',
                'width' => 1024,
                'height' => 768
            ]
        ]);
    }
}
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: 8.2
          extensions: pdo, pdo_pgsql, redis
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install PHP dependencies
        run: composer install --no-interaction --prefer-dist
      
      - name: Install Node.js dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          mkdir -p storage
          php -r "
          \$db = new PDO('sqlite:storage/test.db');
          \$db->exec('PRAGMA foreign_keys = ON');
          \$db->exec(file_get_contents('migrations/001_create_tables.sql'));
          "

      - name: Run PHP tests
        run: vendor/bin/phpunit --coverage-clover coverage.xml
      
      - name: Run JavaScript tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Start services
        run: docker-compose -f docker-compose.test.yml up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Stop services
        run: docker-compose -f docker-compose.test.yml down

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          npm run db:seed:test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-screenshots
          path: tests/e2e/screenshots/
```

## Test Coverage Goals

### Coverage Targets
- **Unit Tests**: 90%+ line coverage for core business logic
- **Integration Tests**: 80%+ coverage for API endpoints and database operations
- **E2E Tests**: 100% coverage for critical user journeys

### Quality Gates
- All tests must pass before merge
- Coverage must not decrease
- Performance tests must meet SLA requirements
- Security tests must pass vulnerability scans

## Test Environment Management

### Docker Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - APP_ENV=testing
      - DB_CONNECTION=sqlite
      - DB_PATH=storage/test.db
      - REDIS_HOST=redis
    depends_on:
      - redis
    volumes:
      - ./storage:/app/storage

  redis:
    image: redis:7-alpine

  # Optional: Add MinIO only if testing object storage features
  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: testuser
      MINIO_ROOT_PASSWORD: testpass
    command: server /data
```

This comprehensive testing strategy ensures the reliability, security, and performance of the Portable Content System across all components and integration points.
