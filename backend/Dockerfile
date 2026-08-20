# Use the newer Debian 12 (Bookworm) so Playwright is happy
FROM node:22-bookworm-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Playwright and ALL required Linux graphics dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of your application code
COPY . .

# Start both the API server and the BullMQ worker
CMD ["sh", "-c", "node server.js & node worker.js"]