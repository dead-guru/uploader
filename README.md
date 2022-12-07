# Uploader
Simple file storage with server-side encryption and basic auth.

## Docker-compose
```yaml
version: '3'

services:
  uploader:
    build: .
    restart: unless-stopped
    volumes:
      - uploader-datavolume:/app/public
    ports:
      - '8885:8885'
volumes:
  uploader-datavolume:
```

## Usage examples

### No response
*Upload to d94ff7cd/file_1494.jpg* (GET http://localhost:8885/files/0b98428b/file_1497.jpg)
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/d94ff7cd/file_1494.jpg' --form 'file=@"/Users/alex/Documents/2022-06-25 02.24.35.jpg"'
```

*Upload to hello/world.ogg* (GET http://localhost:8885/files/hello/world.jpg)
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/hello/world.jpg' --form 'file=@"/Users/alex/Documents/2022-06-25 02.24.35.jpg"'
```

*Upload to test.js* (GET http://localhost:8885/files/test.js)
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/test.js' --form 'file=@"/Users/alex/Documents/2022-06-25 02.24.35.jpg"'
```
