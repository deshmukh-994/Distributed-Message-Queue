Distributed Message Queue (DMQ)


A lightweight message queue for system design practice with topics, partitions, consumer groups, **at‑least‑once delivery**, and optional demo replication between brokers.


## Why this project
- Mirrors interview problems (Kafka/Rabbit/SQS) while staying small enough to read.
- Durable storage via SQLite; append‑only logs per partition.
- Clear HTTP APIs for producers/consumers.


## Quick Start


### Local (Node 18+)
```bash
npm install
cp .env.example .env
npm run dev # http://localhost:4000