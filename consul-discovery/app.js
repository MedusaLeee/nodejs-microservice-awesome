const http = require('http');
const consul = require('consul');
const Koa = require('koa');
const app = new Koa();

const option = {
  host: 'consulserver',
  port: 8500,
  promisify: true
};

const consulIns = consul(option);

const registerExitHandler = (callback) => {
    const exit = (signal) => {
      callback = callback || (() => {});
      callback();
      setTimeout(function() {
        process.exit(signal);
      }, 500);
    }

    process.on('exit', function () {
      console.log('process will exit !!!!!!!!')
    });

    process.on('SIGTERM', function() {
      console.log('SIGTERM')
      exit(1);
    });

    process.on('SIGINT', function () {
      console.log('Ctrl-C...');
      exit(2);
    });

    process.on('uncaughtException', function(e) {
      console.error('Uncaught Exception', e.stack);
      exit(3);
    });
  };

app.use(async(ctx) => {
    return ctx.body = {
        name: process.env.ID,
        port: process.env.PORT
    };
});

const server = http.createServer(app.callback());
server.listen(process.env.PORT);
server.on('error', (error) => {
    console.error('error: ', error)
    process.exit(1)
});
server.on('listening', async() => {
  registerExitHandler(() => {
    consulIns.agent.service.deregister({id: process.env.ID}, (err) => {
      if (err) {
        return console.error('consul 撤销登记失败: ', err);
      }
      console.log('consul 撤销登记成功')
    });
  });
  console.log('service workding on 3000')

  const leader = await consulIns.status.leader();
  console.log('consul leader: ', leader)

  // const nodeList = await consulIns.catalog.node.list();
  // console.log('node list:', nodeList)
  // 注册
  await consulIns.agent.service.register({
    id: process.env.ID,
    name: 'koa',
    address: '127.0.0.1',
    port: parseInt(process.env.PORT)
  });
  const serviceList = await consulIns.agent.service.list();
  console.log('service list: ', serviceList)
  const catalogServiceList = await consulIns.catalog.service.list();
  console.log('catalogServiceList list: ', catalogServiceList)
});


// TODO 服务注册  和 客户端负载均衡  docker compose 进程 后台运行