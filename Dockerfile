FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn

# Copy application files
COPY backend /app/backend
COPY frontend /app/frontend
COPY architecture.md /app/architecture.md
COPY orchestration.md /app/orchestration.md
COPY sequential_multi_agent_development_guide.md /app/sequential_multi_agent_development_guide.md
COPY GEMINI.md /app/GEMINI.md

# Set environment variables for Vertex AI / Gemini Enterprise Platform
ENV PORT=8080
ENV GOOGLE_GENAI_USE_VERTEXAI=true
ENV GOOGLE_CLOUD_PROJECT=arsanjani-genai
ENV GOOGLE_CLOUD_LOCATION=us-central1

EXPOSE 8080

CMD ["python", "backend/app.py"]
