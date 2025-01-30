# Proxy Server for HTTP/HTTPS traffic with metrics storage

## Usage

This server needs a MongoDB instance to store the metrics. to configure it you can
add the MONGO_URI environment variable to the .env file.

We have a docker-compose.yml file to start a MongoDB instance.

```bash
npm run dev
```

To shutdown the server you can use the SIGTERM or SIGINT signals, and you'll get
global stats.

### How to create a user

```bash
npm run create-user <username> <password>
```

### How to use the proxy server

After you start the server and you have a user created, you can use the proxy server
by adding the user credentials as proxy auth:

```bash
curl -v -x http://localhost:8080 --proxy-user foo:bar -L https://httpbin.org
```

To get metrics for a user, you can call the `/stats` endpoint with the same user credentials:

```bash
curl -u foo:bar http://localhost:8080/metrics | jq .
```
