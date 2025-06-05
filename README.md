# StatBeat - Sports Statistics Processing System

StatBeat is a CLI-based system for processing and publishing sports statistics and game stories. The system is designed to be modular and extensible, allowing for easy addition of new sports and data processing pipelines.

## Architecture

The system follows a modular architecture where each sport has its own dedicated processing file (e.g., `football_stats.js`). This design allows for:

- Independent processing logic for each sport
- Easy addition of new sports without modifying existing code
- Consistent data flow across different sports
- Reusable utilities and common functionality

### Core Components

1. **Data Source Layer**

   - Uses Apollo Client to query a GraphQL API
   - Authentication handled via AWS Cognito
   - Environment-based configuration

2. **Processing Layer**

   - Sport-specific transformation logic
   - Extracts key moments, player statistics, and game narratives
   - Generates structured content for publishing

3. **Publishing Layer**
   - Publishes processed content to a content management system
   - Handles both test and production environments
   - Manages media assets (team logos, etc.)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
# Required environment variables
BASE_ENDPOINT=<graphql-endpoint>
COGNITO_REGION=<aws-region>
COGNITO_USERPOOL_ID=<userpool-id>
COGNITO_APP_CLIENT_ID=<app-client-id>
FUSION_BASE=<fusion-base-url>
FUSION_TOKEN=<fusion-token>
```

## Usage

The system provides several CLI commands for processing sports data:

### Football Commands

```bash
# Query raw game data
node football_stats.js query-game <GAME_ID>

# Transform game data without uploading
node football_stats.js transform-game <GAME_ID>

# Query, transform, and upload game data
node football_stats.js query-transform-upload <GAME_ID>
```

### Command Details

- `query-game`: Retrieves raw game data from the GraphQL API
- `transform-game`: Processes raw game data into a publishable format
- `query-transform-upload`: Complete pipeline from query to publication
  - Optional `TEST_FLAG` parameter for test environment publishing

## Data Flow

1. **Query**: Fetches game data including:

   - Team information
   - Player statistics
   - Play-by-play data
   - Game metadata

2. **Transform**: Processes data into:

   - Game headlines and subheadlines
   - Key moments by quarter
   - Top performer statistics
   - Game narrative
   - Featured images

3. **Upload**: Publishes content to the CMS with:
   - Structured content elements
   - Associated media
   - Proper formatting and styling

## Extending the System

To add support for a new sport:

1. Create a new sport-specific file (e.g., `basketball_stats.js`)
2. Implement the required functions:
   - `query<Sport>Game()`
   - `transform<Sport>Game()`
   - `upload<Sport>Data()`
3. Add new CLI commands to handle sport-specific processing

## Future Enhancements

- Add support for more sports (basketball, baseball, etc.)
- Implement real-time game updates
- Add support for historical data analysis
- Enhance content generation with AI/ML capabilities
- Add support for custom content templates

## Contributing

When adding new sports or features:

1. Follow the existing modular architecture
2. Maintain consistent error handling
3. Add appropriate logging
4. Update documentation
5. Include test cases where applicable
