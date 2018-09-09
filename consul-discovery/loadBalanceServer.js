/**
 * Created by lijianxun on 2018/9/9
 */
// docker-compose build --no-cache
// docker stop $(docker ps -q)
const http = require('http');
const Koa = require('koa');
const app = new Koa();
const ribbonAxios = require('./ribbonAxios');

const main  = async () => {
  const RibbonAxios = await ribbonAxios.build({
    consulAgent: {
      host: 'localhost',
      port: 8500
    },
    serviceNameList: ['koa']
  });

  app.use(async(ctx) => {
    const { data } = await RibbonAxios.getbalancedAxios('koa').get('/');
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
};

main().then();


