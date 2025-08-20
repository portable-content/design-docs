# Security Considerations

## Overview

Security is a critical aspect of the Portable Content System, especially when handling user-generated content and executing transforms. This document outlines security measures for content sanitization, safe rendering, and system protection.

## Content Sanitization

### HTML Sanitization
All HTML output from markdown transforms must be sanitized to prevent XSS attacks.

#### Sanitization Policy
```json
{
  "allowedTags": [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "u", "s", "code", "pre",
    "blockquote", "cite",
    "ul", "ol", "li",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span"
  ],
  "allowedAttributes": {
    "a": ["href", "title", "target"],
    "img": ["src", "alt", "title", "width", "height"],
    "code": ["class"],
    "pre": ["class"],
    "div": ["class"],
    "span": ["class"]
  },
  "allowedProtocols": {
    "href": ["http", "https", "mailto"],
    "src": ["http", "https", "data"]
  },
  "allowedClasses": {
    "code": ["language-*"],
    "pre": ["language-*"],
    "div": ["highlight"],
    "span": ["token", "keyword", "string", "number", "comment"]
  },
  "disallowedTags": ["script", "style", "iframe", "object", "embed", "form", "input"],
  "stripIgnoreTag": true,
  "stripIgnoreTagBody": ["script", "style"]
}
```

#### Implementation (Node.js)
```javascript
const DOMPurify = require('isomorphic-dompurify');

function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'strong', 'em', 'u', 's',
      'code', 'pre', 'blockquote', 'cite',
      'ul', 'ol', 'li', 'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'src', 'alt', 'width', 'height', 'class'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  });
}
```

### SVG Sanitization
Mermaid-generated SVGs must be sanitized to remove potentially dangerous elements.

```javascript
const { JSDOM } = require('jsdom');

function sanitizeSVG(svgContent) {
  const dom = new JSDOM(svgContent);
  const svg = dom.window.document.querySelector('svg');
  
  if (!svg) {
    throw new Error('Invalid SVG content');
  }
  
  // Remove dangerous elements
  const dangerousElements = svg.querySelectorAll('script, foreignObject, use');
  dangerousElements.forEach(el => el.remove());
  
  // Remove event handlers
  const allElements = svg.querySelectorAll('*');
  allElements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  // Ensure viewBox is set for proper scaling
  if (!svg.getAttribute('viewBox')) {
    const width = svg.getAttribute('width') || '100';
    const height = svg.getAttribute('height') || '100';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  
  return svg.outerHTML;
}
```

## Input Validation

### Content Validation
```php
<?php

class ContentValidator
{
    private const MAX_TITLE_LENGTH = 255;
    private const MAX_SUMMARY_LENGTH = 1000;
    private const MAX_BLOCKS_PER_CONTENT = 100;
    private const MAX_MARKDOWN_LENGTH = 100000; // 100KB
    private const MAX_MERMAID_LENGTH = 50000;   // 50KB

    public function validateContentItem(array $data): array
    {
        $errors = [];

        // Basic structure validation
        if (empty($data['type'])) {
            $errors[] = 'Content type is required';
        } elseif (!$this->isValidContentType($data['type'])) {
            $errors[] = 'Invalid content type';
        }

        if (isset($data['title']) && strlen($data['title']) > self::MAX_TITLE_LENGTH) {
            $errors[] = 'Title too long (max ' . self::MAX_TITLE_LENGTH . ' characters)';
        }

        if (isset($data['summary']) && strlen($data['summary']) > self::MAX_SUMMARY_LENGTH) {
            $errors[] = 'Summary too long (max ' . self::MAX_SUMMARY_LENGTH . ' characters)';
        }

        // Blocks validation
        if (empty($data['blocks'])) {
            $errors[] = 'At least one block is required';
        } elseif (count($data['blocks']) > self::MAX_BLOCKS_PER_CONTENT) {
            $errors[] = 'Too many blocks (max ' . self::MAX_BLOCKS_PER_CONTENT . ')';
        } else {
            foreach ($data['blocks'] as $index => $block) {
                $blockErrors = $this->validateBlock($block, $index);
                $errors = array_merge($errors, $blockErrors);
            }
        }

        return $errors;
    }

    private function validateBlock(array $block, int $index): array
    {
        $errors = [];
        $prefix = "Block {$index}: ";

        if (empty($block['kind'])) {
            $errors[] = $prefix . 'kind is required';
            return $errors;
        }

        if (!$this->isValidBlockKind($block['kind'])) {
            $errors[] = $prefix . 'invalid kind';
            return $errors;
        }

        // Kind-specific validation
        switch ($block['kind']) {
            case 'markdown':
                $errors = array_merge($errors, $this->validateMarkdownBlock($block, $prefix));
                break;
            case 'mermaid':
                $errors = array_merge($errors, $this->validateMermaidBlock($block, $prefix));
                break;
            case 'image':
                $errors = array_merge($errors, $this->validateImageBlock($block, $prefix));
                break;
        }

        return $errors;
    }

    private function validateMarkdownBlock(array $block, string $prefix): array
    {
        $errors = [];
        
        if (empty($block['payload']['source'])) {
            $errors[] = $prefix . 'markdown source is required';
        } elseif (strlen($block['payload']['source']) > self::MAX_MARKDOWN_LENGTH) {
            $errors[] = $prefix . 'markdown content too long';
        }

        return $errors;
    }

    private function validateMermaidBlock(array $block, string $prefix): array
    {
        $errors = [];
        
        if (empty($block['payload']['source'])) {
            $errors[] = $prefix . 'mermaid source is required';
        } elseif (strlen($block['payload']['source']) > self::MAX_MERMAID_LENGTH) {
            $errors[] = $prefix . 'mermaid content too long';
        }

        // Basic mermaid syntax validation
        if (!$this->isValidMermaidSyntax($block['payload']['source'])) {
            $errors[] = $prefix . 'invalid mermaid syntax';
        }

        return $errors;
    }

    private function validateImageBlock(array $block, string $prefix): array
    {
        $errors = [];
        
        if (empty($block['payload']['uri'])) {
            $errors[] = $prefix . 'image URI is required';
        } elseif (!$this->isValidImageURI($block['payload']['uri'])) {
            $errors[] = $prefix . 'invalid image URI';
        }

        return $errors;
    }

    private function isValidMermaidSyntax(string $source): bool
    {
        // Basic validation - check for common mermaid diagram types
        $validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'pie', 'gantt'];
        
        foreach ($validTypes as $type) {
            if (strpos(trim($source), $type) === 0) {
                return true;
            }
        }
        
        return false;
    }

    private function isValidImageURI(string $uri): bool
    {
        // Only allow HTTPS URLs or S3 URIs
        return preg_match('/^(https:\/\/|s3:\/\/)/', $uri) === 1;
    }
}
```

## File Upload Security

### File Type Validation
```php
class FileUploadValidator
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif'
    ];

    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    public function validateUpload(UploadedFile $file): array
    {
        $errors = [];

        // Size check
        if ($file->getSize() > self::MAX_FILE_SIZE) {
            $errors[] = 'File too large (max 10MB)';
        }

        // MIME type check
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES)) {
            $errors[] = 'Invalid file type';
        }

        // File extension check
        $extension = strtolower($file->getClientOriginalExtension());
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        if (!in_array($extension, $allowedExtensions)) {
            $errors[] = 'Invalid file extension';
        }

        // MIME type vs extension consistency
        if (!$this->mimeTypeMatchesExtension($mimeType, $extension)) {
            $errors[] = 'File type mismatch';
        }

        // Malware scan (if available)
        if ($this->containsMalware($file)) {
            $errors[] = 'File failed security scan';
        }

        return $errors;
    }

    private function mimeTypeMatchesExtension(string $mimeType, string $extension): bool
    {
        $mapping = [
            'image/jpeg' => ['jpg', 'jpeg'],
            'image/png' => ['png'],
            'image/webp' => ['webp'],
            'image/gif' => ['gif']
        ];

        return isset($mapping[$mimeType]) && in_array($extension, $mapping[$mimeType]);
    }

    private function containsMalware(UploadedFile $file): bool
    {
        // Implement virus scanning if available
        // This could integrate with ClamAV or similar
        return false;
    }
}
```

## Transform Security

### Container Isolation
```yaml
# Docker security configuration
version: '3.8'
services:
  mermaid-transform:
    image: ghcr.io/portable-content/mermaid-cli:1.0.0
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    user: "1000:1000"  # Non-root user
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
    networks:
      - transform-network
    environment:
      - NODE_ENV=production
    resource_limits:
      cpus: '0.5'
      memory: 512M
    ulimits:
      nproc: 100
      nofile: 1024
```

### Resource Limits
```python
# Transform worker with resource limits
import resource
import signal
import subprocess
from contextlib import contextmanager

class TransformExecutor:
    def __init__(self):
        self.max_memory = 512 * 1024 * 1024  # 512MB
        self.max_cpu_time = 30  # 30 seconds
        self.max_wall_time = 60  # 60 seconds

    @contextmanager
    def resource_limits(self):
        """Apply resource limits to transform execution"""
        
        def timeout_handler(signum, frame):
            raise TimeoutError("Transform execution timed out")
        
        # Set memory limit
        resource.setrlimit(resource.RLIMIT_AS, (self.max_memory, self.max_memory))
        
        # Set CPU time limit
        resource.setrlimit(resource.RLIMIT_CPU, (self.max_cpu_time, self.max_cpu_time))
        
        # Set wall clock timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(self.max_wall_time)
        
        try:
            yield
        finally:
            signal.alarm(0)  # Cancel timeout

    def execute_transform(self, container_image: str, input_dir: str, output_dir: str):
        """Execute transform with security constraints"""
        
        with self.resource_limits():
            cmd = [
                'docker', 'run',
                '--rm',
                '--read-only',
                '--tmpfs', '/tmp:noexec,nosuid,size=100m',
                '--user', '1000:1000',
                '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges:true',
                '--network', 'none',  # No network access
                '--memory', '512m',
                '--cpus', '0.5',
                '--pids-limit', '100',
                '-v', f'{input_dir}:/input:ro',
                '-v', f'{output_dir}:/output:rw',
                container_image
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self.max_wall_time
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"Transform failed: {result.stderr}")
            
            return result.stdout
```

## Access Control

### Authentication & Authorization

> **Note**: Access control and authorization are domain-specific concerns that should be implemented in the application layer, not in the core content system.

The core content system focuses on content representation and processing. Access control should be handled by:

1. **API Gateway/Middleware**: Authentication and basic authorization
2. **Application Layer**: Domain-specific access rules (workspace membership, ownership, etc.)
3. **Content Service**: Pure content operations without access control logic

```php
// Example: Application layer handles authorization
class SecureContentController
{
    public function __construct(
        private ContentServiceInterface $contentService,
        private AuthorizationService $authService
    ) {}

    public function getContent(string $id, User $user): ContentItem
    {
        // Get content from core service
        $content = $this->contentService->get($id);

        if (!$content) {
            throw new ContentNotFoundException();
        }

        // Apply domain-specific authorization
        if (!$this->authService->canRead($user, $content)) {
            throw new UnauthorizedException();
        }

        return $content;
    }
}
```

### Rate Limiting
```php
class RateLimiter
{
    private Redis $redis;
    
    public function checkLimit(string $key, int $maxAttempts, int $decayMinutes): bool
    {
        $attempts = $this->redis->get($key) ?: 0;
        
        if ($attempts >= $maxAttempts) {
            return false;
        }
        
        $this->redis->incr($key);
        $this->redis->expire($key, $decayMinutes * 60);
        
        return true;
    }
}

// Usage in API
$rateLimiter = new RateLimiter($redis);

// Per-user content creation limit
$userKey = "content_create:{$user->id}";
if (!$rateLimiter->checkLimit($userKey, 100, 60)) {
    return response()->json(['error' => 'Rate limit exceeded'], 429);
}

// Per-IP upload limit
$ipKey = "upload:{$request->ip()}";
if (!$rateLimiter->checkLimit($ipKey, 50, 60)) {
    return response()->json(['error' => 'Upload limit exceeded'], 429);
}
```

## Data Privacy

### EXIF Data Removal
```python
from PIL import Image
from PIL.ExifTags import TAGS

def strip_exif_data(image_path: str, output_path: str):
    """Remove EXIF data from images for privacy"""
    
    with Image.open(image_path) as image:
        # Create a new image without EXIF data
        clean_image = Image.new(image.mode, image.size)
        clean_image.putdata(list(image.getdata()))
        
        # Save without metadata
        clean_image.save(output_path, optimize=True, quality=85)
```

### Content Encryption (Optional)
```php
class ContentEncryption
{
    private string $encryptionKey;
    
    public function __construct(string $key)
    {
        $this->encryptionKey = $key;
    }
    
    public function encryptContent(string $content): string
    {
        $iv = random_bytes(16);
        $encrypted = openssl_encrypt($content, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    public function decryptContent(string $encryptedContent): string
    {
        $data = base64_decode($encryptedContent);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $this->encryptionKey, 0, $iv);
    }
}
```

## Monitoring & Alerting

### Security Event Logging
```php
class SecurityLogger
{
    public function logSuspiciousActivity(string $event, array $context): void
    {
        $logEntry = [
            'timestamp' => now()->toISOString(),
            'event' => $event,
            'user_id' => $context['user_id'] ?? null,
            'ip_address' => $context['ip_address'] ?? null,
            'user_agent' => $context['user_agent'] ?? null,
            'details' => $context['details'] ?? null
        ];
        
        // Log to security monitoring system
        Log::channel('security')->warning('Security event', $logEntry);
        
        // Alert on critical events
        if (in_array($event, ['malware_detected', 'rate_limit_exceeded', 'unauthorized_access'])) {
            $this->sendSecurityAlert($logEntry);
        }
    }
    
    private function sendSecurityAlert(array $logEntry): void
    {
        // Send to monitoring system (e.g., Slack, PagerDuty)
        // Implementation depends on your alerting setup
    }
}
```

## Security Checklist

### Pre-deployment Security Review
- [ ] All user inputs are validated and sanitized
- [ ] HTML output is properly sanitized
- [ ] SVG content is sanitized to remove dangerous elements
- [ ] File uploads are validated for type, size, and content
- [ ] Transform containers run with minimal privileges
- [ ] Resource limits are enforced for all transforms
- [ ] Rate limiting is implemented for all endpoints
- [ ] Authentication and authorization are properly implemented
- [ ] EXIF data is stripped from uploaded images
- [ ] Security logging and monitoring are in place
- [ ] Regular security scans are scheduled
- [ ] Dependency vulnerabilities are monitored and patched
