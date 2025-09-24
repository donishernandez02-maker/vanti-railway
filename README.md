
# Vanti Bot on Railway

HTTP API para consultar estado/valor en Vanti usando Puppeteer en modo headless.
Expuesto en `/api/v1/vanti?cuenta=XXXXXXXX`.

## Run local
```bash
npm i
node index.js
# GET http://localhost:3000/api/v1/vanti?cuenta=61489570
```

## Deploy en Railway
- Conecta el repo y despliega con el Dockerfile incluido.
- Variable opcional: `REQUEST_TIMEOUT_MS=60000`.
