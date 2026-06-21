# Use official Node.js image
FROM node:20-alpine

# Set up a non-root user for Hugging Face Spaces security requirements
RUN adduser -D -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json and set ownership
COPY --chown=appuser:appuser package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install --include=dev

# Copy the rest of the application code and set ownership
COPY --chown=appuser:appuser . .

# Build the TypeScript code
RUN npm run build

# Switch to non-root user
USER appuser

# Expose the Hugging Face Spaces default port
EXPOSE 7860
ENV PORT=7860

# Start the application
CMD ["npm", "start"]
