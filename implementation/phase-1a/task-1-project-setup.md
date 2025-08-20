# Task 1: Project Setup - Detailed Steps

## Overview
Set up the basic PHP project structure with GitHub repository, Composer, and essential files. This creates the foundation for all subsequent development.

**Estimated Time:** 1-2 hours  
**Dependencies:** None

---

## Step 1.1: Create GitHub Repository
**Time:** 10-15 minutes

### Instructions:
1. Go to [GitHub.com](https://github.com) and click "New repository"
2. Choose repository name: `portable-content-php` (or your preference)
3. Add description: "PHP implementation of portable content system - Phase 1A MVP"
4. Set to **Public** (for open source) or **Private** (if preferred)
5. **Check** "Add a README file"
6. **Check** "Add .gitignore" and select **PHP** template
7. **Don't** add a license yet (can add later)
8. Click "Create repository"

### Example Repository Settings:
```
Repository name: portable-content-php
Description: PHP implementation of portable content system - Phase 1A MVP
Visibility: Public
Initialize with:
  ✅ Add a README file
  ✅ Add .gitignore (PHP template)
  ❌ Choose a license (add later if needed)
```

### Validation:
- [ ] Repository exists and is accessible
- [ ] README.md file is present
- [ ] .gitignore file contains PHP-specific ignores
- [ ] Repository URL works: `https://github.com/yourusername/portable-content-php`

---

## Step 1.2: Clone Repository Locally
**Time:** 5 minutes

### Instructions:
1. Copy the repository URL from GitHub
2. Open terminal/command prompt
3. Navigate to your development directory
4. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/portable-content-php.git
   cd portable-content-php
   ```

### Validation:
- [ ] Repository is cloned to local machine
- [ ] Can navigate into project directory
- [ ] `.git` folder exists (hidden folder)
- [ ] README.md and .gitignore are present locally

---

## Step 1.3: Initialize Composer Project
**Time:** 10-15 minutes

### Instructions:
1. Ensure you have Composer installed:
   ```bash
   composer --version
   ```
   If not installed, visit [getcomposer.org](https://getcomposer.org/download/)

2. Initialize Composer project:
   ```bash
   composer init
   ```

3. Answer the interactive prompts:
   ```
   Package name: yourusername/portable-content-php
   Description: PHP implementation of portable content system
   Author: Your Name <your.email@example.com>
   Minimum Stability: stable
   Package Type: project
   License: MIT (or leave blank)
   ```

4. When asked about dependencies, say **no** for now (we'll add them manually)

### Example composer.json Result:
```json
{
    "name": "yourusername/portable-content-php",
    "description": "PHP implementation of portable content system",
    "type": "project",
    "authors": [
        {
            "name": "Your Name",
            "email": "your.email@example.com"
        }
    ],
    "minimum-stability": "stable",
    "require": {}
}
```

### Validation:
- [ ] `composer.json` file is created
- [ ] File contains correct package information
- [ ] `composer install` runs without errors (even with empty dependencies)

---

## Step 1.4: Add Required Dependencies
**Time:** 5-10 minutes

### Instructions:
1. Edit `composer.json` to add dependencies and autoloading:
   ```json
   {
       "name": "portable-content/portable-content-php",
       "description": "PHP implementation of portable content system",
       "type": "project",
       "authors": [
           {
               "name": "Your Name",
               "email": "your.email@example.com"
           }
       ],
       "minimum-stability": "stable",
       "require": {
           "php": "^8.3",
           "ramsey/uuid": "^4.7"
       },
       "require-dev": {
           "phpunit/phpunit": "^11.0"
       },
       "autoload": {
           "psr-4": {
               "PortableContent\\": "src/"
           }
       },
       "autoload-dev": {
           "psr-4": {
               "PortableContent\\Tests\\": "tests/"
           }
       },
       "scripts": {
           "test": "phpunit",
           "test-coverage": "phpunit --coverage-html coverage"
       }
   }
   ```

2. Install dependencies:
   ```bash
   composer install
   ```

### Validation:
- [ ] `vendor/` directory is created
- [ ] `composer.lock` file is generated
- [ ] No error messages during installation
- [ ] `composer test` command is available (will fail until tests exist)

---

## Step 1.5: Create Directory Structure
**Time:** 5 minutes

### Instructions:
Create the following directories and files:

```bash
mkdir src
mkdir tests
mkdir tests/Unit
mkdir tests/Integration
mkdir storage
mkdir migrations
touch src/.gitkeep
touch tests/.gitkeep
touch storage/.gitkeep
touch migrations/.gitkeep
```

### Expected Directory Structure:
```
portable-content-php/
├── .git/
├── .gitignore
├── README.md
├── composer.json
├── composer.lock
├── vendor/
├── src/
│   └── .gitkeep
├── tests/
│   ├── Unit/
│   ├── Integration/
│   └── .gitkeep
├── storage/
│   └── .gitkeep
└── migrations/
    └── .gitkeep
```

### Validation:
- [ ] All directories exist
- [ ] Directory structure matches expected layout
- [ ] `.gitkeep` files ensure empty directories are tracked by Git

---

## Step 1.6: Update README.md
**Time:** 10-15 minutes

### Instructions:
Replace the default README.md content with:

```markdown
# Portable Content PHP

PHP implementation of the portable content system - Phase 1A MVP.

## Overview

This is a minimal viable implementation focusing on markdown content storage and retrieval using SQLite. Part of the larger portable content system design.

## Phase 1A Goals

- ✅ Basic content entity storage (ContentItem, MarkdownBlock)
- ✅ SQLite database with simple schema
- ✅ Repository pattern for data access
- ✅ Input validation
- ✅ Comprehensive testing

## Requirements

- PHP 8.2 or higher
- Composer
- SQLite (included with PHP)

## Installation

```bash
git clone https://github.com/yourusername/portable-content-php.git
cd portable-content-php
composer install
```

## Usage

*Coming soon - Phase 1A implementation in progress*

## Development

```bash
# Run tests
composer test

# Run tests with coverage
composer test-coverage

# Run specific test suite
./vendor/bin/phpunit --testsuite=Unit

# Run tests with verbose output
./vendor/bin/phpunit --verbose
```

## Project Structure

```
src/           # Source code
tests/         # Test files
storage/       # SQLite database files
migrations/    # Database schema migrations
```

## License

MIT License (or your preferred license)
```

### Validation:
- [ ] README.md is updated with project information
- [ ] Installation instructions are clear
- [ ] Project structure is documented
- [ ] Goals and requirements are listed

---

## Step 1.7: Update .gitignore
**Time:** 5 minutes

### Instructions:
The PHP template should be good, but add these specific entries to `.gitignore`:

```gitignore
# Composer
/vendor/

# PHPUnit
/coverage/
.phpunit.result.cache

# Storage
/storage/*.db
/storage/*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
```

### Validation:
- [ ] .gitignore includes all necessary patterns
- [ ] Database files will be ignored
- [ ] IDE and OS files will be ignored
- [ ] Coverage reports will be ignored

---

## Step 1.8: Update .gitignore for Testing
**Time:** 5 minutes

### Instructions:
Add these testing-specific entries to `.gitignore`:

```gitignore
# Composer
/vendor/

# PHPUnit
/coverage/
.phpunit.cache/
.phpunit.result.cache

# Storage
/storage/*.db
/storage/*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# Testing
/tests/_output/
/tests/_support/_generated/
```

### Validation:
- [ ] .gitignore includes testing directories
- [ ] Coverage reports will be ignored
- [ ] PHPUnit cache will be ignored
- [ ] All necessary patterns are included

---

## Step 1.9: Initial Commit
**Time:** 5 minutes

### Instructions:
1. Stage all files:
   ```bash
   git add .
   ```

2. Commit with descriptive message:
   ```bash
   git commit -m "Initial project setup with testing infrastructure

   - Created basic PHP project structure
   - Added Composer configuration with dependencies
   - Set up directory structure for src, tests, storage, migrations
   - Configured PHPUnit with proper test structure
   - Added base TestCase class with testing utilities
   - Created example tests to verify setup
   - Updated README with project information
   - Configured .gitignore for PHP project and testing"
   ```

3. Push to GitHub:
   ```bash
   git push origin main
   ```

### Validation:
- [ ] All files are committed
- [ ] Commit message describes complete setup
- [ ] Changes are pushed to GitHub
- [ ] GitHub repository shows all setup files

---

## Step 1.9: Configure PHPUnit Testing
**Time:** 10-15 minutes

### Instructions:
1. Create `phpunit.xml` configuration file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/11.0/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         cacheDirectory=".phpunit.cache"
         executionOrder="depends,defects"
         requireCoverageMetadata="true"
         beStrictAboutCoverageMetadata="true"
         beStrictAboutOutputDuringTests="true"
         failOnRisky="true"
         failOnWarning="true">

    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>

    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>

    <coverage>
        <report>
            <html outputDirectory="coverage"/>
            <text outputFile="php://stdout"/>
        </report>
    </coverage>

    <logging>
        <junit outputFile="coverage/junit.xml"/>
    </logging>
</phpunit>
```

2. Create base test class `tests/TestCase.php`:

```php
<?php

declare(strict_types=1);

namespace PortableContent\Tests;

use PDO;
use PHPUnit\Framework\TestCase as PHPUnitTestCase;
use PortableContent\Database\Database;
use PortableContent\Repository\RepositoryFactory;
use PortableContent\Repository\ContentRepositoryInterface;

abstract class TestCase extends PHPUnitTestCase
{
    protected function createTestDatabase(): PDO
    {
        $pdo = Database::createInMemory();
        Database::runMigrations($pdo);
        return $pdo;
    }

    protected function createTestRepository(): ContentRepositoryInterface
    {
        return RepositoryFactory::createInMemoryRepository();
    }

    protected function tearDown(): void
    {
        // Reset any static state
        RepositoryFactory::resetDefault();
        parent::tearDown();
    }
}
```

3. Create first test `tests/Unit/ExampleTest.php`:

```php
<?php

declare(strict_types=1);

namespace PortableContent\Tests\Unit;

use PortableContent\Tests\TestCase;

final class ExampleTest extends TestCase
{
    public function testBasicAssertion(): void
    {
        $this->assertTrue(true);
    }

    public function testPHPVersion(): void
    {
        $this->assertGreaterThanOrEqual('8.3.0', PHP_VERSION);
    }

    public function testAutoloadingWorks(): void
    {
        $this->assertTrue(class_exists('PortableContent\ContentItem'));
        $this->assertTrue(interface_exists('PortableContent\Repository\ContentRepositoryInterface'));
    }
}
```

### Validation:
- [ ] phpunit.xml is created with proper configuration
- [ ] Base TestCase class provides testing utilities
- [ ] Example test runs successfully
- [ ] Test structure is organized (Unit/Integration)

---

## Step 1.10: Test the Testing Setup
**Time:** 5-10 minutes

### Instructions:
1. Run the tests to verify setup:

```bash
# Run all tests
composer test

# Run tests with verbose output
./vendor/bin/phpunit --verbose

# Run specific test suite
./vendor/bin/phpunit --testsuite=Unit

# Generate coverage report
composer test-coverage
```

### Expected Output:
```bash
$ composer test
PHPUnit 11.x.x by Sebastian Bergmann and contributors.

Runtime:       PHP 8.3.x

...                                                                 3 / 3 (100%)

Time: 00:00.123, Memory: 6.00 MB

OK (3 tests, 3 assertions)
```

2. Verify coverage directory is created:
```bash
ls -la coverage/
```

### Validation:
- [ ] Tests run successfully
- [ ] Coverage reports are generated
- [ ] No errors or warnings
- [ ] Test output is clean and informative

---

## Step 1.11: Verify Complete Setup
**Time:** 5 minutes

### Instructions:
Run these commands to verify everything is working:

```bash
# Check PHP version
php --version

# Check Composer
composer --version

# Verify autoloading works
composer dump-autoload

# Run tests
composer test

# Check project structure
ls -la

# Verify dependencies
composer show
```

### Expected Output Examples:
```bash
$ php --version
PHP 8.3.x (cli) (built: ...)

$ composer test
PHPUnit 11.x.x by Sebastian Bergmann and contributors.
OK (3 tests, 3 assertions)

$ ls -la
drwxr-xr-x  src/
drwxr-xr-x  tests/
drwxr-xr-x  storage/
drwxr-xr-x  migrations/
drwxr-xr-x  vendor/
drwxr-xr-x  coverage/
-rw-r--r--  composer.json
-rw-r--r--  composer.lock
-rw-r--r--  phpunit.xml
-rw-r--r--  README.md
```

### Validation:
- [ ] PHP 8.3+ is available
- [ ] Composer is working
- [ ] All directories exist
- [ ] Dependencies are installed
- [ ] Autoloading is configured
- [ ] Tests run successfully
- [ ] Coverage reports generate

---

## Completion Checklist

### Repository Setup:
- [ ] GitHub repository created and accessible
- [ ] Repository cloned locally
- [ ] Initial README and .gitignore present

### Composer Configuration:
- [ ] composer.json with correct dependencies
- [ ] Autoloading configured for src/ and tests/
- [ ] Dependencies installed successfully
- [ ] Test scripts configured

### Project Structure:
- [ ] src/ directory for source code
- [ ] tests/ directory with Unit and Integration subdirectories
- [ ] storage/ directory for database files
- [ ] migrations/ directory for schema files

### Testing Infrastructure:
- [ ] PHPUnit configured with proper settings
- [ ] Base TestCase class with testing utilities
- [ ] Example tests run successfully
- [ ] Coverage reporting configured
- [ ] Test database helpers available

### Documentation:
- [ ] README.md updated with project information
- [ ] .gitignore configured for PHP project and testing
- [ ] Directory structure documented
- [ ] Testing commands documented

### Version Control:
- [ ] Initial commit made with all setup files
- [ ] Changes pushed to GitHub
- [ ] Repository is ready for development

---

## Next Steps

With Task 1 complete, you're ready to move on to **Task 2: Basic Data Classes**. The foundation is now in place to start implementing the core ContentItem and MarkdownBlock classes.

## Troubleshooting

### Common Issues:

**Composer not found:**
- Install Composer from [getcomposer.org](https://getcomposer.org/download/)

**PHP version too old:**
- Install PHP 8.3+ or update your PHP installation

**Permission errors:**
- Ensure you have write permissions in the project directory

**Git authentication issues:**
- Set up SSH keys or use personal access tokens for GitHub
