# Oracle 

You can change the network by creating a `.env` file with the variable `NETWORK=<mainnet|testnet|devnet|localnet>`

## Installation

1. Install dependencies by running

```bash
pnpm install --ignore-workspace
```

2. Copy the .env.example into .env and populate it with your actuall envormental variable

```bash
cp .env.example .env
```

2. Setup the database by running

```bash
pnpm db:setup:dev
```

3. Run both the API and the indexer

```bash
pnpm dev
```

## Event Indexer

> Run only a single instance of the indexer.

Indexer uses polling to watch for new events. We're saving the
cursor data in the database so we can start from where we left off
when restarting the API.

To run the indexer individually, run:

```bash
pnpm indexer
```

## API

# SUI Prompts API Documentation

## Base URL

`/api/prompts`

## Authentication

No authentication is required for read-only operations at this time.

## Response Format

All successful responses return either:
- A single object for single-resource requests
- A paginated response for collection requests:
  ```json
  {
    "data": [...],     // Array of prompt objects
    "cursor": 123      // Pagination cursor (ID of last item)
  }
  ```

## Endpoints

### Get Prompts with Filtering

Retrieve prompts with optional filtering parameters.

- **URL**: `/api/prompts`
- **Method**: `GET`
- **Query Parameters**:
  - `objectId` (string): Filter by object ID
  - `creator` (string): Filter by creator address
  - `timestamp` (date): Filter by timestamp
  - `limit` (number): Maximum number of items to return (defaults to system limit)
  - `cursor` (number): ID to start pagination from
  - `sort` (string): Sort order for results (`asc` or `desc`, defaults to `desc`)
- **Success Response**: 
  ```json
  {
    "data": [
      {
        "id": 123,
        "objectId": "0x123abc...",
        "creator": "0x456def...",
        "timestamp": "2024-04-09T12:34:56Z",
        "prompt": "Example prompt text",
        "createdAt": "2024-04-09T12:34:56Z",
        "updatedAt": "2024-04-09T12:34:56Z"
      },
      ...
    ],
    "cursor": 123
  }
  ```
- **Error Response**: 
  - **Status Code**: 400 Bad Request
  - **Content**: `{ "error": "Invalid parameter value" }`

### Get Latest Prompts

Retrieve the most recent prompts in the system.

- **URL**: `/api/latest`
- **Method**: `GET`
- **Query Parameters**:
  - `limit` (number): Maximum number of items to return (defaults to system limit)
  - `cursor` (number): ID to start pagination from
  - `sort` (string): Sort order for results (`asc` or `desc`, defaults to `desc`)
- **Success Response**: 
  ```json
  {
    "data": [
      {
        "id": 123,
        "objectId": "0x123abc...",
        "creator": "0x456def...",
        "timestamp": "2024-04-09T12:34:56Z",
        "prompt": "Example prompt text",
        "createdAt": "2024-04-09T12:34:56Z",
        "updatedAt": "2024-04-09T12:34:56Z"
      },
      ...
    ],
    "cursor": 123
  }
  ```
- **Error Response**: 
  - **Status Code**: 400 Bad Request
  - **Content**: `{ "error": "Invalid pagination parameters" }`

### Get Prompts by Creator

Retrieve all prompts created by a specific address.

- **URL**: `/api/creator/:address`
- **Method**: `GET`
- **URL Parameters**:
  - `address` (string): Creator's SUI address
- **Query Parameters**:
  - `limit` (number): Maximum number of items to return (defaults to system limit)
  - `cursor` (number): ID to start pagination from
  - `sort` (string): Sort order for results (`asc` or `desc`, defaults to `desc`)
- **Success Response**: 
  ```json
  {
    "data": [
      {
        "id": 123,
        "objectId": "0x123abc...",
        "creator": "0x456def...",
        "timestamp": "2024-04-09T12:34:56Z",
        "prompt": "Example prompt text",
        "createdAt": "2024-04-09T12:34:56Z",
        "updatedAt": "2024-04-09T12:34:56Z"
      },
      ...
    ],
    "cursor": 123
  }
  ```
- **Error Response**: 
  - **Status Code**: 400 Bad Request
  - **Content**: `{ "error": "Invalid address format" }`

### Get Specific Prompt by Object ID

Retrieve a single prompt by its unique object ID.

- **URL**: `/api/:objectId`
- **Method**: `GET`
- **URL Parameters**:
  - `objectId` (string): The unique blockchain object ID of the prompt
- **Success Response**: 
  ```json
  {
    "id": 123,
    "objectId": "0x123abc...",
    "creator": "0x456def...",
    "timestamp": "2024-04-09T12:34:56Z",
    "prompt": "Example prompt text",
    "createdAt": "2024-04-09T12:34:56Z",
    "updatedAt": "2024-04-09T12:34:56Z"
  }
  ```
- **Error Response**: 
  - **Status Code**: 404 Not Found
  - **Content**: `{ "error": "Prompt not found" }`

## Pagination

The API uses cursor-based pagination:

- Results are returned in pages controlled by the `limit` parameter
- Each response includes a `cursor` field containing the ID of the last item
- To fetch the next page, include the `cursor` value in your next request
- When there are no more results, the `cursor` field will be `undefined`

Example pagination flow:
```
# Initial request
GET /api/prompts?limit=10

# Response includes "cursor": 123
# Next page request:
GET /api/prompts?limit=10&cursor=123
```

## Sorting

Results can be sorted using the `sort` parameter:
- `sort=desc`: Latest first (default)
- `sort=asc`: Oldest first

## Error Handling

The API uses standard HTTP status codes:

- **200 OK**: Request succeeded
- **400 Bad Request**: Invalid request parameters
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

Error responses follow this format:
```json
{
  "error": "Error message description"
}
```

## Examples

### Fetch prompts with filtering

```bash
curl -X GET "http://example.com/api/prompts?creator=0x123abc&limit=5&sort=desc"
```

### Fetch the latest prompts

```bash
curl -X GET "http://example.com/api/latest?limit=10"
```

### Fetch prompts for a specific creator

```bash
curl -X GET "http://example.com/api/creator/0x123abc?limit=20"
```

### Fetch a specific prompt by objectt ID

```bash
curl -X GET "http://example.com/api/prompts/0x456def"
```