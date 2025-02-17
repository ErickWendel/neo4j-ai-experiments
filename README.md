# Neo4j AI-Powered Query System

## Overview

This project integrates Neo4j with AI models to generate Cypher queries from natural language prompts. It utilizes local AI models for natural language processing and a vector database approach for efficient querying.

This is the source code shown on my [video tutorial](https://ewbr.cc/rag-ai-neo4j), consider watching it first!

## Folder Structure
```
.
├── README.md                  # Project documentation
├── data                        # Database-related files
│   ├── courses.json            # Course data
│   └── seed.js                 # Database seeding script
├── docker-compose.yml          # Configuration for running Neo4j
├── other-examples              # Additional use cases
│   ├── neo4j-vector.js         # Example using vector search in Neo4j
│   └── rag                     # Retrieval-Augmented Generation example
│       ├── data                # Sample data for RAG
│       │   └── javascript.txt  # Text data for queries
│       ├── index.js            # Implementation for RAG
│       ├── package-lock.json   # Dependency lock file
│       └── package.json        # Dependencies
├── package-lock.json           # Dependency lock file
├── package.json                # Project dependencies
├── prompts                     # AI-related prompts
│   ├── context.md              # Context prompt template
│   ├── nlpToCypher.md          # NLP to Cypher prompt template
│   └── responseTemplateFromJson.md # Response formatting template
├── references.txt              # Related documentation/references
├── request.sh                  # Script for testing caching mechanism
├── script.txt                  # Miscellaneous script
└── src                         # Source code
    ├── ai.js                   # AI model interaction logic
    └── index.js                # Main application entry point
```

## Setup Instructions
### Prerequisites
Ensure you have the following installed:
- [Ollama](https://ollama.ai) for running local AI models
- [Docker](https://www.docker.com) for running Neo4j
- [Node.js](https://nodejs.org) (v22+ recommended)

### Installation Steps
1. **Start Ollama**
   ```sh
   ollama serve
   ```
2. **Download AI models**
   ```sh
   ollama pull gemma:7b
   ollama pull deepseek-coder:6.7b
   ```
3. **Start Neo4j**
   ```sh
   docker-compose up -d
   ```
4. **Install dependencies**
   ```sh
   npm ci
   ```
5. **Seed the database**
   ```sh
   npm run seed
   ```
6. **Run the application**
   ```sh
   npm run dev
   ```
7. **Test caching mechanism** (Run twice to observe caching behavior)
   ```sh
   sh request.sh
   ```

## Features
- AI-powered natural language to Cypher query conversion
- Neo4j integration with vector search capabilities
- RAG (Retrieval-Augmented Generation) example included
- Database seeding for reproducible testing
- Dockerized Neo4j instance

## Usage
Once the application is running, you can send natural language queries to the AI, which will convert them into optimized Cypher queries for Neo4j. The system caches responses for better performance on repeated queries.

## Contributing
Feel free to open issues and submit PRs for enhancements!

## License
MIT License

