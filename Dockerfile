# Use official Node.js image
FROM node:20-alpine
# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 make g++

# Set up a non-root user for Hugging Face Spaces security requirements
RUN adduser -D -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json and set ownership
COPY --chown=appuser:appuser package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the rest of the application code (including dist/) and set ownership
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose the Hugging Face Spaces default port
EXPOSE 7860
ENV PORT=7860

# Start the application
CMD ["npm", "start"]
