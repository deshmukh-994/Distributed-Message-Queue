FROM node:18-alpine

# tools to compile native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./

# force native build inside the container (important for Alpine)
ENV npm_config_build_from_source=true

RUN npm ci --only=production

# now copy the rest (node_modules is ignored by .dockerignore)
COPY . .

EXPOSE 4000
CMD ["node", "src/server.js"]
