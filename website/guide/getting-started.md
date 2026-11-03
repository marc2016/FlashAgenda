# Getting Started

The quickest way to run FlashAgenda is Docker Compose with the published images from the GitHub Container Registry. You need [Docker](https://docs.docker.com/get-docker/) with the Compose plugin.

## 1. Create the Compose file

Save the following as `docker-compose.yml` in an empty folder:

```yaml
services:
  mongodb:
    image: mongo:4.4
    container_name: flashagenda-mongo
    ports:
      - "30303:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

  backend:
    image: ghcr.io/marc2016/flashagenda-backend:latest
    container_name: flashagenda-backend
    ports:
      - "30302:3001"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/flashagenda
      - PORT=3001
      - ADMIN_PASSWORD=change-me
      - ADMIN_JWT_SECRET=change-me-to-a-long-random-string
    depends_on:
      - mongodb
    restart: unless-stopped

  frontend:
    image: ghcr.io/marc2016/flashagenda-frontend:latest
    container_name: flashagenda-frontend
    ports:
      - "30301:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongo-data:
```

The frontend container serves the app and forwards `/api` to the backend. Real-time updates use a WebSocket connection on `/socket.io` that has to reach the backend directly; in production your reverse proxy takes care of that (see [Configuration](./configuration#running-behind-a-reverse-proxy)).

::: warning Change the admin credentials
Replace `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` with your own values before exposing the instance. See [Configuration](./configuration).
:::

## 2. Start it

```bash
docker compose up -d
```

## 3. Open FlashAgenda

Open [http://localhost:30301](http://localhost:30301), click the start button to create your first agenda and share the link.

The admin area is available at `/admin` and uses the `ADMIN_PASSWORD` from above.

## Updating

```bash
docker compose pull
docker compose up -d
```

Your data lives in the `mongo-data` volume and survives updates.

## Next steps

- [Using FlashAgenda](./usage): what you can do with an agenda
- [Configuration](./configuration): environment variables and running behind a reverse proxy
