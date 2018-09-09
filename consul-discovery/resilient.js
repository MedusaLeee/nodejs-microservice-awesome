const http = require('http');
const Koa = require('koa');
const app = new Koa();
const Resilient = require('resilient');
const consul = require('resilient-consul');

// This is a sample Resilient client configuration
// which uses Consul as discovery server via middleware
// See: https://github.com/h2non/resilient-consul

const client = Resilient({
  balancer: {
    random: true,
    roundRobin: false
  },
});

client.use(consul({
  // App service name (required)
  service: 'koa',
  // Discovery service name (optional, default to consul)
  discoveryService: 'consul',
  // Specificy a custom datacenter (optional)
  // datacenter: 'ams2',
  // auto refresh servers from Consul (optional, default to false)
  enableSelfRefresh: true,
  refreshServersInterval: 5000,
  parallel: true,
  // refreshPath: '/',
  // Consul servers pool
  servers: [
    'http://localhost:8500'
  ]
}));

app.use(async(ctx) => {
  const {data} = await client.get('/');
  return ctx.body = data;
});

const server = http.createServer(app.callback());
server.listen(10000);
server.on('error', (error) => {
  console.error('error: ', error);
  process.exit(1)
});
server.on('listening', async() => {

  console.log('service workding on 10000')

});
