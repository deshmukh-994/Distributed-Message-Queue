#!/usr/bin/env bash
curl -s -X POST localhost:4000/topics -H 'Content-Type: application/json' -d '{"name":"orders","partitions":3}' | jq .