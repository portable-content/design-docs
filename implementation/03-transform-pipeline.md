# Transform Pipeline Architecture

## Overview

The transform pipeline is responsible for generating variants from block payloads. It uses containerized tools for reproducible transforms and supports both synchronous and asynchronous processing.

## Architecture Components

### Transform Worker (Python)
- **Queue Consumer**: Processes transform jobs from message queue
- **Container Orchestrator**: Manages tool containers for transforms
- **Storage Interface**: Downloads inputs and uploads outputs
- **Manifest Updater**: Updates ContentItem manifests with new variants

### Message Queue
- **Development**: Redis with RQ (Redis Queue)
- **Production**: AWS SQS, Google Cloud Tasks, or RabbitMQ
- **Job Payload**: Source URIs, transform options, output specifications

### Container Registry
- **Tool Images**: Pre-built containers for each transform type
- **Versioning**: Semantic versioning for reproducible builds
- **Security**: Vulnerability scanning and signed images

## Transform Job Specification

### Job Structure
```json
{
  "id": "job_uuid",
  "content_id": "content_uuid", 
  "block_id": "block_uuid",
  "transform": {
    "id": "mermaid:render",
    "tool_image": "ghcr.io/portable-content/mermaid-cli:1.0.0",
    "inputs": [
      {
        "uri": "s3://bucket/content/content_uuid/blocks/block_uuid/payload.mmd",
        "media_type": "text/plain"
      }
    ],
    "outputs": [
      {
        "media_type": "image/svg+xml;profile=mermaid",
        "options": {"theme": "default", "format": "svg"}
      },
      {
        "media_type": "image/png;profile=mermaid;dpi=192", 
        "options": {"theme": "default", "format": "png", "dpi": 192}
      }
    ]
  },
  "created_at": "2024-01-01T00:00:00Z",
  "priority": "normal"
}
```

### Transform Contract
Each transform tool must implement this interface:

#### Input
- **Environment Variables**:
  - `INPUT_DIR`: Directory containing input files
  - `OUTPUT_DIR`: Directory for output files
  - `OPTIONS_JSON`: JSON string with transform options
  - `OUTPUT_SPECS_JSON`: JSON array of expected outputs

#### Output
- **Files**: Generated variants in `OUTPUT_DIR`
- **Metadata**: `metadata.json` with variant information
```json
{
  "variants": [
    {
      "media_type": "image/svg+xml;profile=mermaid",
      "filename": "diagram.svg",
      "width": 800,
      "height": 600,
      "bytes": 12345,
      "content_hash": "sha256:abc123..."
    }
  ],
  "tool_info": {
    "name": "mermaid-cli",
    "version": "10.6.1",
    "generated_at": "2024-01-01T00:00:00Z"
  }
}
```

## Block-Specific Transforms

### Markdown Transform
```dockerfile
FROM node:18-alpine
RUN npm install -g unified remark-parse remark-html remark-gfm
COPY transform.js /app/
WORKDIR /app
ENTRYPOINT ["node", "transform.js"]
```

```javascript
// transform.js
const unified = require('unified');
const remarkParse = require('remark-parse');
const remarkHtml = require('remark-html');
const remarkGfm = require('remark-gfm');
const fs = require('fs');

async function transform() {
  const inputDir = process.env.INPUT_DIR;
  const outputDir = process.env.OUTPUT_DIR;
  const options = JSON.parse(process.env.OPTIONS_JSON || '{}');
  
  const markdown = fs.readFileSync(`${inputDir}/payload.md`, 'utf8');
  
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtml, {sanitize: false}); // Sanitization handled elsewhere
    
  const html = await processor.process(markdown);
  
  fs.writeFileSync(`${outputDir}/content.html`, String(html));
  
  const metadata = {
    variants: [{
      media_type: 'text/html;profile=markdown',
      filename: 'content.html',
      bytes: Buffer.byteLength(String(html), 'utf8'),
      content_hash: `sha256:${crypto.createHash('sha256').update(String(html)).digest('hex')}`
    }],
    tool_info: {
      name: 'unified-markdown',
      version: '1.0.0',
      generated_at: new Date().toISOString()
    }
  };
  
  fs.writeFileSync(`${outputDir}/metadata.json`, JSON.stringify(metadata, null, 2));
}

transform().catch(console.error);
```

### Mermaid Transform
```dockerfile
FROM node:18-alpine
RUN npm install -g @mermaid-js/mermaid-cli
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY transform.js /app/
WORKDIR /app
ENTRYPOINT ["node", "transform.js"]
```

```javascript
// transform.js
const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

async function transform() {
  const inputDir = process.env.INPUT_DIR;
  const outputDir = process.env.OUTPUT_DIR;
  const options = JSON.parse(process.env.OPTIONS_JSON || '{}');
  const outputSpecs = JSON.parse(process.env.OUTPUT_SPECS_JSON || '[]');
  
  const mermaidSource = fs.readFileSync(`${inputDir}/payload.mmd`, 'utf8');
  const tempInput = `${outputDir}/input.mmd`;
  fs.writeFileSync(tempInput, mermaidSource);
  
  const variants = [];
  
  for (const spec of outputSpecs) {
    const format = spec.options.format || 'svg';
    const theme = spec.options.theme || 'default';
    const dpi = spec.options.dpi || 96;
    
    const outputFile = `${outputDir}/diagram.${format}`;
    const cmd = `mmdc -i ${tempInput} -o ${outputFile} -t ${theme} ${format === 'png' ? `--scale ${dpi/96}` : ''}`;
    
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    const content = fs.readFileSync(outputFile);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    // Get dimensions for images
    let width, height;
    if (format === 'svg') {
      const svgContent = content.toString();
      const viewBoxMatch = svgContent.match(/viewBox="0 0 (\d+) (\d+)"/);
      if (viewBoxMatch) {
        width = parseInt(viewBoxMatch[1]);
        height = parseInt(viewBoxMatch[2]);
      }
    }
    
    variants.push({
      media_type: spec.media_type,
      filename: `diagram.${format}`,
      width,
      height,
      bytes: content.length,
      content_hash: `sha256:${hash}`
    });
  }
  
  const metadata = {
    variants,
    tool_info: {
      name: 'mermaid-cli',
      version: '10.6.1',
      generated_at: new Date().toISOString()
    }
  };
  
  fs.writeFileSync(`${outputDir}/metadata.json`, JSON.stringify(metadata, null, 2));
}

transform().catch(console.error);
```

### Image Transform
```dockerfile
FROM alpine:latest
RUN apk add --no-cache vips-dev vips-tools python3 py3-pip
COPY requirements.txt /app/
COPY transform.py /app/
WORKDIR /app
RUN pip3 install -r requirements.txt
ENTRYPOINT ["python3", "transform.py"]
```

```python
# transform.py
import os
import json
import hashlib
import pyvips
from pathlib import Path

def transform():
    input_dir = Path(os.environ['INPUT_DIR'])
    output_dir = Path(os.environ['OUTPUT_DIR'])
    options = json.loads(os.environ.get('OPTIONS_JSON', '{}'))
    output_specs = json.loads(os.environ.get('OUTPUT_SPECS_JSON', '[]'))
    
    # Find input image
    input_files = list(input_dir.glob('payload.*'))
    if not input_files:
        raise ValueError("No input image found")
    
    input_file = input_files[0]
    image = pyvips.Image.new_from_file(str(input_file))
    
    variants = []
    
    for spec in output_specs:
        media_type = spec['media_type']
        opts = spec.get('options', {})
        
        # Parse media type parameters
        if 'width=' in media_type:
            target_width = int(media_type.split('width=')[1].split(';')[0])
            # Resize maintaining aspect ratio
            scale = target_width / image.width
            resized = image.resize(scale)
        else:
            resized = image
            
        # Determine output format
        if 'webp' in media_type:
            format_ext = 'webp'
            save_opts = {'Q': opts.get('quality', 80)}
        elif 'avif' in media_type:
            format_ext = 'avif' 
            save_opts = {'Q': opts.get('quality', 80)}
        elif 'jpeg' in media_type:
            format_ext = 'jpg'
            save_opts = {'Q': opts.get('quality', 85)}
        else:
            format_ext = 'png'
            save_opts = {}
            
        output_file = output_dir / f'image.{format_ext}'
        resized.write_to_file(str(output_file), **save_opts)
        
        # Calculate hash
        with open(output_file, 'rb') as f:
            content = f.read()
            content_hash = hashlib.sha256(content).hexdigest()
            
        variants.append({
            'media_type': media_type,
            'filename': f'image.{format_ext}',
            'width': resized.width,
            'height': resized.height,
            'bytes': len(content),
            'content_hash': f'sha256:{content_hash}'
        })
    
    metadata = {
        'variants': variants,
        'tool_info': {
            'name': 'libvips',
            'version': pyvips.version(0),
            'generated_at': datetime.utcnow().isoformat() + 'Z'
        }
    }
    
    with open(output_dir / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

if __name__ == '__main__':
    transform()
```

## Worker Implementation

### Python Transform Worker
```python
# worker.py
import os
import json
import uuid
import docker
import tempfile
from pathlib import Path
from typing import Dict, List
import boto3
from redis import Redis
from rq import Worker, Queue

class TransformWorker:
    def __init__(self, storage_client, docker_client):
        self.storage = storage_client
        self.docker = docker_client
        
    def process_job(self, job_data: Dict):
        """Process a transform job"""
        job_id = job_data['id']
        content_id = job_data['content_id']
        block_id = job_data['block_id']
        transform = job_data['transform']
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_dir = temp_path / 'input'
            output_dir = temp_path / 'output'
            input_dir.mkdir()
            output_dir.mkdir()
            
            # Download inputs
            for input_spec in transform['inputs']:
                filename = Path(input_spec['uri']).name
                self.storage.download_file(
                    input_spec['uri'], 
                    input_dir / filename
                )
            
            # Run transform container
            container = self.docker.containers.run(
                transform['tool_image'],
                environment={
                    'INPUT_DIR': '/input',
                    'OUTPUT_DIR': '/output',
                    'OPTIONS_JSON': json.dumps(transform.get('options', {})),
                    'OUTPUT_SPECS_JSON': json.dumps(transform['outputs'])
                },
                volumes={
                    str(input_dir): {'bind': '/input', 'mode': 'ro'},
                    str(output_dir): {'bind': '/output', 'mode': 'rw'}
                },
                remove=True,
                detach=False
            )
            
            # Read metadata
            metadata_file = output_dir / 'metadata.json'
            if not metadata_file.exists():
                raise ValueError("Transform did not produce metadata.json")
                
            with open(metadata_file) as f:
                metadata = json.load(f)
            
            # Upload variants
            variants = []
            for variant_meta in metadata['variants']:
                variant_file = output_dir / variant_meta['filename']
                
                # Generate storage key
                variant_key = self._encode_media_type(variant_meta['media_type'])
                storage_uri = f"s3://bucket/content/{content_id}/blocks/{block_id}/variants/{variant_key}/content.{Path(variant_meta['filename']).suffix[1:]}"
                
                # Upload file
                self.storage.upload_file(variant_file, storage_uri)
                
                # Create variant descriptor
                variant = {
                    'mediaType': variant_meta['media_type'],
                    'uri': storage_uri,
                    'width': variant_meta.get('width'),
                    'height': variant_meta.get('height'),
                    'bytes': variant_meta['bytes'],
                    'contentHash': variant_meta['content_hash'],
                    'generatedBy': metadata['tool_info']['name'],
                    'toolVersion': metadata['tool_info']['version'],
                    'createdAt': metadata['tool_info']['generated_at']
                }
                variants.append(variant)
            
            # Update manifest
            self._update_manifest(content_id, block_id, variants)
            
        return {'status': 'success', 'variants': len(variants)}
    
    def _encode_media_type(self, media_type: str) -> str:
        """Encode media type for storage path"""
        # text/html;profile=markdown → html-markdown
        # image/png;dpi=192 → png-192dpi
        parts = media_type.split(';')
        base = parts[0].split('/')[-1]  # Get subtype
        
        params = []
        for part in parts[1:]:
            if '=' in part:
                key, value = part.split('=', 1)
                params.append(f"{value}{key}")
            else:
                params.append(part)
                
        return '-'.join([base] + params) if params else base
    
    def _update_manifest(self, content_id: str, block_id: str, new_variants: List[Dict]):
        """Update ContentItem manifest with new variants"""
        manifest_uri = f"s3://bucket/content/{content_id}/item.json"

        # Download current manifest
        manifest = self.storage.download_json(manifest_uri)

        # Find block and add variants
        for block in manifest['blocks']:
            if block['id'] == block_id:
                block['variants'].extend(new_variants)
                break

        # Upload updated manifest
        self.storage.upload_json(manifest, manifest_uri)

        # Update vector database with processing status
        self._update_vector_database(content_id, {'updated_at': datetime.utcnow().isoformat()})

# Queue setup
redis_conn = Redis(host='localhost', port=6379, db=0)
queue = Queue('transforms', connection=redis_conn)

# Worker setup
storage_client = StorageClient()  # Your storage implementation
docker_client = docker.from_env()
worker = TransformWorker(storage_client, docker_client)

if __name__ == '__main__':
    rq_worker = Worker(['transforms'], connection=redis_conn)
    rq_worker.work()
```

## Deployment Configuration

### Docker Compose (Development)
```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
      
  transform-worker:
    build: ./transform-worker
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379/0
      - STORAGE_BACKEND=minio
      - MINIO_ENDPOINT=http://minio:9000
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    command: server /data --console-address ":9001"
```

### Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transform-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: transform-worker
  template:
    metadata:
      labels:
        app: transform-worker
    spec:
      containers:
      - name: worker
        image: portable-content/transform-worker:latest
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379/0"
        - name: STORAGE_BACKEND
          value: "s3"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```
