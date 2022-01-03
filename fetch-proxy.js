"use strict";

const { ProxyAgent, fetch, setGlobalDispatcher } = require("undici");
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

async function main() {
  const server = await buildServer();
  const proxyInstance = await buildProxy();

  const serverUrl = `http://localhost:${server.address().port}`;
  const proxyUrl = `http://localhost:${proxyInstance.address().port}`;

  setGlobalDispatcher(new ProxyAgent(proxyUrl));

  console.warn({ proxyUrl, serverUrl });

  server.on("request", (req, res) => {
    console.warn({ rawHeaders: req.rawHeaders });
    console.log(req.url); // '/hello?foo=bar'
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ hello: "world" }));
  });

  const response = await fetch(serverUrl + "/hello?foo=bar");
  console.warn({ response });

  const data = [];
  for await (const chunk of response.body) {
    data.push(chunk);
  }

  console.log(JSON.parse(Buffer.concat(data).toString("utf-8"))); // { hello: 'world' }

  server.close();
  proxyInstance.close();
}

main();
