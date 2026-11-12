// Fake network lag for local testing.
// Usage: node lagproxy.cjs <listenPort> <gamePort> <delayMs>
// Open http://localhost:<listenPort> instead of the normal address.
// Every message is delayed <delayMs> each way, so round-trip lag = 2 x delayMs.
const net = require('net');
const [listenPort, targetPort, delay] = process.argv.slice(2).map(Number);
if (!listenPort || !targetPort || isNaN(delay)) {
  console.log('Usage: node lagproxy.cjs <listenPort> <gamePort> <delayMs>   e.g. node lagproxy.cjs 3100 5173 75');
  process.exit(1);
}
net.createServer((client) => {
  const server = net.connect(targetPort, '127.0.0.1');
  const pipe = (from, to) => from.on('data', (d) => setTimeout(() => to.writable && to.write(d), delay));
  pipe(client, server); pipe(server, client);
  const end = () => { client.destroy(); server.destroy(); };
  client.on('error', end); server.on('error', end); client.on('close', end); server.on('close', end);
}).listen(listenPort, () => console.log(`Lag on: open http://localhost:${listenPort}  (+${delay} ms each way, ${2 * delay} ms round trip)`));
