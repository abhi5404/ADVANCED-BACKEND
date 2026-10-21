# PDF RAG API

This project is a Retrieval-Augmented Generation (RAG) API. It reads text from a PDF, creates searchable vector embeddings, stores those embeddings in Qdrant, retrieves the most relevant PDF sections for a question, and asks a Groq-hosted language model to answer using only that retrieved context.

## How RAG works in this project

The request flow is:

1. `knowledge.pdf` is read when the server starts.
2. `pdf-parse` extracts text from the PDF.
3. `RecursiveCharacterTextSplitter` divides the text into chunks of 1,000 characters with 200 characters of overlap.
4. Google `gemini-embedding-001` converts each chunk into a vector embedding.
5. Qdrant stores the chunks and their embeddings in the configured collection.
6. A question sent to `/ai` is also converted into an embedding.
7. Qdrant performs similarity search and returns the five closest chunks.
8. The retrieved chunks are placed in a system prompt.
9. Groq generates an answer using only that context.

If the answer is not supported by the retrieved PDF text, the model is instructed to reply:

```text
I don't know from uploaded PDF.
```

## Project structure

```text
RAG/
├── index.js          # Express server, indexing, retrieval, and AI response logic
├── knowledge.pdf     # PDF used for automatic startup indexing
├── package.json      # Project metadata and dependencies
├── package-lock.json # Locked dependency versions
└── .env              # Local API keys and service configuration
```

## Requirements

- Node.js 18 or newer
- A Groq API key
- A Google AI API key
- A running Qdrant instance or a Qdrant Cloud collection

## Installation

From this directory:

```powershell
cd "D:\ADVANCED BACKEND\RAG"
npm install
```

## Environment variables

Create a `.env` file in the `RAG` directory:

```env
PORT=5000

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

GOOGLE_API_KEY=your_google_api_key

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=grocery-store
```

### Environment variable details

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to `5000`. |
| `GROQ_API_KEY` | Yes | Authenticates requests to Groq. |
| `GROQ_MODEL` | No | Groq chat model. Defaults to `openai/gpt-oss-20b`. |
| `GOOGLE_API_KEY` | Yes | Authenticates Google embedding requests. |
| `QDRANT_URL` | No | Qdrant URL. Defaults to `http://localhost:6333`. |
| `QDRANT_API_KEY` | No | Qdrant Cloud authentication key. |
| `QDRANT_COLLECTION_NAME` | No | Qdrant collection name. Defaults to `grocery-store`. |

Never commit `.env` or expose API keys in source code. The repository ignores `.env`.

## Start the server

```powershell
npm run dev
```

The `dev` script runs:

```text
nodemon index.js
```

At startup, the application indexes `knowledge.pdf` before listening on the configured port. Successful startup looks like:

```text
Indexed 5 document chunks from knowledge.pdf.
Server started on port 5000
```

The exact number of chunks depends on the PDF content.

## API endpoints

### `GET /`

Checks that the server is running.

```http
GET http://localhost:5000/
```

Response:

```json
{
  "message": "hello from level4"
}
```

### `POST /ai`

Asks a question about the indexed PDF.

Request:

```http
POST http://localhost:5000/ai
Content-Type: application/json
```

Body:

```json
{
  "input": "What is my CGPA?"
}
```

Example response:

```json
{
  "ai": "Your CGPA is 7.53."
}
```

The `input` property must be a non-empty string. The endpoint returns HTTP `400` for invalid input and HTTP `500` if retrieval or generation fails.

### `POST /upload`

Uploads and indexes another PDF in the same Qdrant collection.

Request:

```http
POST http://localhost:5000/upload
Content-Type: multipart/form-data
```

The multipart form field must be named `file` and must have type `File`:

| Key | Type | Value |
| --- | --- | --- |
| `file` | File | Select a `.pdf` file |

The maximum upload size is 10 MB. Only `application/pdf` files are accepted.

Example response:

```json
{
  "message": "PDF uploaded and indexed successfully.",
  "documentCount": 5,
  "collectionName": "grocery-store"
}
```

## Using Postman

### Ask a question

1. Create a `POST` request to `http://localhost:5000/ai`.
2. Select **Body**.
3. Select **raw**.
4. Select **JSON**.
5. Use:

```json
{
  "input": "What is my CGPA?"
}
```

6. Click **Send**.

### Upload a PDF manually

Manual upload is optional because `knowledge.pdf` is indexed automatically during startup.

1. Create a `POST` request to `http://localhost:5000/upload`.
2. Select **Body → form-data**.
3. Set the key to exactly `file`.
4. Change the key type from **Text** to **File**.
5. Select a PDF.
6. Click **Send**.

## Packages

### Runtime and web server

| Package | What it is used for |
| --- | --- |
| `express` | Creates the HTTP server and defines `/`, `/ai`, and `/upload` routes. |
| `dotenv` | Loads configuration and API keys from `.env`. |
| `multer` | Parses multipart form-data and handles PDF uploads in memory. |
| `pdf-parse` | Extracts readable text from PDF files. |
| `node:fs/promises` | Reads `knowledge.pdf` asynchronously at startup. |

### LangChain packages

| Package | What it is used for |
| --- | --- |
| `@langchain/core` | Provides `HumanMessage` and `SystemMessage` for the chat prompt. |
| `@langchain/groq` | Connects LangChain to the Groq chat-completions API. |
| `@langchain/google-genai` | Provides Google Gemini embeddings for documents and questions. |
| `@langchain/qdrant` | Connects LangChain to the Qdrant vector database. |
| `@langchain/textsplitters` | Splits extracted PDF text into overlapping chunks. |

### Google and vector database packages

| Package | What it is used for |
| --- | --- |
| `@google/generative-ai` | Provides the `TaskType.RETRIEVAL_DOCUMENT` constant used by the embedding configuration. |
| Qdrant | Stores vectors and performs similarity search. It is a separate service, not an npm package in this project. |

### Development and currently installed supporting packages

| Package | What it is used for |
| --- | --- |
| `nodemon` | Restarts the Node.js server when source files change during development. |
| `@google/genai` | Installed as a Google AI SDK dependency; the current `index.js` uses the LangChain Google integration instead. |
| `@langchain/langgraph` | Installed for LangGraph workflows; it is not currently used by this `index.js`. |

## Important implementation notes

- The Qdrant collection must already exist with a vector configuration compatible with `gemini-embedding-001`.
- The application indexes `knowledge.pdf` every time it starts. Depending on the Qdrant configuration, restarting the server can add duplicate chunks. For production, add document IDs or a collection reset/upsert strategy.
- The `/upload` endpoint adds uploaded PDF chunks to the same collection; it does not delete existing documents.
- Answers are limited to the five chunks returned by similarity search.
- `maxTokens` is set to `100`, so responses are intentionally short.
- `temperature` is set to `0.7`, which allows some variation while the system prompt restricts the answer to retrieved context.

## Common problems

### `model_not_found`

The configured Groq model is not available for the API key. Set `GROQ_MODEL` in `.env` to a model returned by the Groq models API, then restart the server.

### `I don't know from uploaded PDF.`

This means the retrieved Qdrant chunks did not contain enough information to answer the question. Check that:

1. `knowledge.pdf` was indexed successfully.
2. The question relates to the PDF.
3. The Qdrant URL and collection name are correct.
4. The collection contains vectors created with the same embedding model.

### Upload returns `400`

Use `multipart/form-data`, set the field name to exactly `file`, and change its type from **Text** to **File**.

### Server does not start

Check that `GROQ_API_KEY` and `GOOGLE_API_KEY` exist in `.env`, Qdrant is reachable, and `knowledge.pdf` is present in the `RAG` directory.
