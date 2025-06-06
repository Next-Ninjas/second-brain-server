# 🧠 Second Brain(Neuronote) - AI Chat Backend

This is the backend of **Second Brain(Neuronote)**, an AI-powered personal assistant that helps users retrieve their memories and chat contextually with an LLM. It uses Hono (a lightweight Node.js framework), Prisma ORM with PostgreSQL, Pinecone for vector search, and Mistral for AI responses.

---

## 🚀 Tech Stack

- **Framework:** [Hono](https://hono.dev/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** PostgreSQL
- **Authentication:** [BetterAuth](https://betterstack.dev)
- **Vector Database:** [Pinecone](https://www.pinecone.io/)
- **LLM Provider:** [Mistral](https://mistral.ai/)
- **Hosting:** Azure 

---


## 🛠️ Setup

### 1. Clone the Repository

```
git clone https://github.com/Next-Ninjas/second-brain-server.git
cd second-brain-backend
```

### 2. Install dependencies
```
pnpm install
```

### 3. Create .env File and add the respective url and API keys

```env
DATABASE_URL=your_postgres_database_url
DIRECT_URL=your_postgres_direct_url
MISTRAL_API_KEY=your_mistral_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_environment
```

### 4.migrate the schema (before create a project in supabase)

```
npx prisma migrate dev --name init
```

### 5. run the server

```
pnpm run dev
```

open [http://localhost:3000](http://localhost:3000)



