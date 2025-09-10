## Distributed Message Queue (DMQ)


A lightweight message queue for system design practice with topics, partitions, consumer groups, **at‑least‑once delivery**, and optional demo replication between brokers.


## Why this project
- Mirrors interview problems (Kafka/Rabbit/SQS) while staying small enough to read.
- Durable storage via SQLite; append‑only logs per partition.
- Clear HTTP APIs for producers/consumers.



## ✨ Features
- **Topics & partitions** – hash partitioning or round-robin
- **Producers & Consumers** – REST APIs
- **Consumer groups** – track offsets per group
- **At-least-once delivery** – messages re-deliver until ACKed
- **Long-polling support** – wait for new messages
- **Batch produce** – send multiple messages in one call
- **Replication demo** – 3-broker fan-out cluster (no leader election yet)
- **Web UI** – simple browser page for testing (`public/dmq.html`)

---
## 🚀 Quick Start (Single Broker)
### Local (Node 18+)
```bash
npm install
cp .env.example .env
npm run dev # http://localhost:4000


## Build & Run with Docker
```bash
docker build -t dmq .
docker run -it --rm -p 4000:4000 dmq
