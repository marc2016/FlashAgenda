# Configuration

FlashAgenda is configured through environment variables on the **backend** container. The frontend container needs no configuration.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port the backend listens on | `3188` (the published image is run with `3001`) |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/flashagenda` |
| `ADMIN_PASSWORD` | Password for the admin area, used as long as no password has been set in the admin area itself | `admin123` |
| `ADMIN_JWT_SECRET` | Secret used to sign admin sessions | a fixed development value |

::: danger Set the admin credentials in production
Without `ADMIN_PASSWORD` the admin area accepts `admin123`, and without `ADMIN_JWT_SECRET` admin sessions are signed with a value that is public in the source code. Always set both to your own values, and use a long random string for the secret.
:::

## Running behind a reverse proxy

Put a reverse proxy (for example Caddy, Traefik or nginx) with TLS in front of FlashAgenda and point your domain to it:

- `/socket.io/` goes to the **backend** container. This is the WebSocket connection for real-time updates, so the proxy must pass the `Upgrade` and `Connection` headers through.
- Everything else goes to the **frontend** container, which serves the app and forwards `/api` to the backend itself.

Example for nginx with the ports from [Getting Started](./getting-started):

```nginx
location /socket.io/ {
    proxy_pass http://localhost:30302;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://localhost:30301;
    proxy_set_header Host $host;
}
```

Without the `/socket.io/` route the app still works, but changes by others only appear after a reload.

## Data and backups

All data is stored in MongoDB. With the Compose file from [Getting Started](./getting-started) it lives in the `mongo-data` Docker volume. Back it up with `mongodump`, for example:

```bash
docker exec flashagenda-mongo mongodump --db flashagenda --archive > flashagenda-backup.archive
```
