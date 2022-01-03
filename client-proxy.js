"use strict";

const { Client } = require("undici");
const { createServer } = require("http");
const proxy = require("proxy");

function buildServer() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => resolve(server));
  });
}

function buildProxy() {
  return new Promise((resolve, reject) => {
    const server = proxy(createServer());
    server.listen(0, () => resolve(server));
  });
}

async function start() {
  const server = await buildServer();
  const proxyInstance = await buildProxy();

  const serverUrl = `http://localhost:${server.address().port}`;
  const proxyUrl = `http://localhost:${proxyInstance.address().port}`;
  console.warn({ proxyUrl, serverUrl });

  server.on("request", (req, res) => {
    console.warn({ rawHeaders: req.rawHeaders });
    console.log(req.url); // '/hello?foo=bar'
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ hello: "world" }));
  });

  const client = new Client(proxyUrl);

  const response = await client.request({
    method: "GET",
    path: serverUrl + "/hello?foo=bar",
  });

  response.body.setEncoding("utf8");
  let data = "";
  for await (const chunk of response.body) {
    data += chunk;
  }

  console.log(JSON.parse(data)); // { hello: 'world' }

  server.close();
  proxyInstance.close();
  client.close();
}

start();
