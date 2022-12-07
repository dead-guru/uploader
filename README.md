# Uploader
Simple file storage with server-side encryption and basic auth.
Originally developed for https://github.com/42wim/matterbridge/wiki/Mediaserver-setup-%28advanced%29

## Features
* Basic authorization
* aes256ctr file encryption
* jpeg mozilla optimization

## Quick start

### Create .env configuration file
```bash
cp .env.example .env
```

**Configuration example:**
```sh
HTTP_PORT = 8885
ADMIN_PASS = "changeme" #password for basic auth
SITE_URL = "http://localhost:8555" #for response with uploaded file link
SECRET = "ieufhnwiegnug39u49gh394gb" #used as salt for aes256 encryption key
FILE_LIMIT = "50mb" #max file size to upload
```

### Docker-compose
```yaml
version: '3'

services:
  uploader:
    build: .
    restart: unless-stopped
    volumes:
      - uploader-datavolume:/app/public #all uploaded files stored in /app/public
    ports:
      - '8885:8885'
volumes:
  uploader-datavolume:
```

## Usage examples

**Upload to d94ff7cd/file_1494.jpg** *(GET http://localhost:8885/files/0b98428b/file_1497.jpg)*
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/d94ff7cd/file_1494.jpg' --form 'file=@"/Users/assada/Documents/2022-06-25 02.24.35.jpg"'
```

**Upload to hello/world.ogg** *(GET http://localhost:8885/files/hello/world.ogg)*
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/hello/world.ogg' --form 'file=@"/Users/assada/Documents/test.ogg"'
```

**Upload to test.js** *(GET http://localhost:8885/files/test.js)*
```bash
curl --location --request POST 'https://admin:WfQWBVU2XII@localhost:8885/upload/test.js' --form 'file=@"/Users/assada/Documents/test.js"'
```
