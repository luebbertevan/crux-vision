# Simple test
#curl http://localhost:8000/api/ping

# More verbose test to see headers
#curl -v http://localhost:8000/api/ping

# Test with different HTTP methods (should work)
#curl -X GET http://localhost:8000/api/ping

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.src.api.routes import router

app = FastAPI(
    title="CruxVision API",
    description="AI climbing coach that analyzes climbing videos",
    version="0.1.0"
)

# Include API routes
app.include_router(router, prefix="/api")

# Mount static files for uploads and outputs
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
