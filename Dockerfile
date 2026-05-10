FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "backend/server.js"]