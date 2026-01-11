# Build Frontend
FROM node:18 as build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Setup Backend
FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .

# Copy Frontend Build to Flask static folder
COPY --from=build /app/frontend/dist ./static

# Expose port (Cloud Run sets $PORT env var, default 8080)
ENV PORT=8080
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
