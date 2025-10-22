# CruxVision Testing Guide

## Starting the Server

```bash
cd /Users/evan/fractal-bootcamp/crux-vision
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## API Testing Commands

### Health Check

```bash
# Simple test
curl http://localhost:8000/api/ping

# More verbose test to see headers
curl -v http://localhost:8000/api/ping

# Test with different HTTP methods (should work)
curl -X GET http://localhost:8000/api/ping
```

### Video Upload Testing

```bash
# Upload your MOV file
curl -X POST -F "file=@backend/static/uploads/pose-test.MOV" http://localhost:8000/api/analyze

# Upload any video file (replace with your file)
curl -X POST -F "file=@your_video.mp4" http://localhost:8000/api/analyze
```

### Web Interface

-   **API Docs**: http://localhost:8000/docs
-   **Interactive Testing**: Use the web interface at `/docs` to test endpoints

### Phone Testing

#### Option 1: Direct Upload from Phone Browser

1. **Find your computer's IP address**:

    ```bash
    # On Mac/Linux
    ifconfig | grep "inet " | grep -v 127.0.0.1

    # On Windows
    ipconfig | findstr "IPv4"
    ```

2. **Open phone browser** and go to: `http://[YOUR_IP]:8000/docs`

    - Example: `http://192.168.1.100:8000/docs`
      http://192.168.1.156:8000/docs

3. **Use the interactive API**:
    - Click on `/api/analyze` endpoint
    - Click "Try it out"
    - Choose file and select your climbing video
    - Click "Execute"

### Error Testing

```bash
# Test invalid file format
echo "not a video" > fake.mp4
curl -X POST -F "file=@fake.mp4" http://localhost:8000/api/analyze

# Test wrong file type
echo "hello world" > test.txt
curl -X POST -F "file=@test.txt" http://localhost:8000/api/analyze
```

### File Management

```bash
# Check uploaded files
ls -la backend/static/uploads/

# Clean up test files
rm -f fake.mp4 test.txt
```

## Expected Responses

### Successful Upload

```json
{
	"id": "some-uuid-here",
	"status_url": "/api/results/some-uuid-here"
}
```

### Error Responses

-   **File too large**: `{"detail": "File too large. Maximum size: 50MB"}`
-   **Wrong format**: `{"detail": "Invalid file format. Allowed formats: MP4, MOV, AVI"}`
-   **Invalid file**: `{"detail": "Invalid video file format detected"}`
