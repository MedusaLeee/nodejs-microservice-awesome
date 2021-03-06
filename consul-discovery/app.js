const http = require('http');
const consul = require('consul');
const Koa = require('koa');
const app = new Koa();

const option = {
  host: process.env.AGENT,
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
    };

    process.on('exit', function () {
      console.log('process will exit !!!!!!!!')
    });

    process.on('SIGTERM', function() {
      console.log('SIGTERM');
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
    console.error('error: ', error);
    process.exit(1);
});
server.on('listening', async() => {
  registerExitHandler(() => {
    consulIns.agent.service.deregister({id: process.env.ID}, (err) => {
      if (err) {
        return console.error(`${process.env.ID} - consul 撤销登记失败: `, err);
      }
      console.log(`${process.env.ID} - consul 撤销登记成功...`);
    });
  });
  console.log(`${process.env.ID} - service working on ${process.env.PORT}`);
  const intervalIns = setInterval(async () => {
    console.log(`${process.env.ID} - 正在等待 consul 集群启动和 leader 选举...`);
    let leader = null;
    try {
      leader = await consulIns.status.leader();
    } catch (e) {
      // do nothing
    }
    if (leader) {
      clearInterval(intervalIns);
      console.log(`${process.env.ID} - consul 集群启动且leader选举完成，leader: `, leader);
      console.log(`${process.env.ID} - 开始注册服务...`);
      // 注册
      await consulIns.agent.service.register({
        id: process.env.ID,
        name: 'koa',
        address: '127.0.0.1',
        port: parseInt(process.env.PORT),
        check: {
          id: `${process.env.ID}-check`,
          http: `http://${process.env.ID}:${process.env.PORT}`,
          interval: '10s',
          timeout: '5s',
          deregistercriticalserviceafter: '1m'
        }
      });
      setInterval(async () => {
        console.log(`${process.env.ID} - 开始每隔 5s 重新查询一次服务列表...`);
        // const catalogServiceList = await consulIns.catalog.service.list();
        // console.log(`${process.env.ID} - catalogService list: `, catalogServiceList);
        const serviceNodeList = await consulIns.catalog.service.nodes('koa');
        console.log(`${process.env.ID} - serviceNode list: `, serviceNodeList);
        const healthServiceList = await consulIns.health.service({
          service: 'koa',
          passing: true
        });
        console.log(`${process.env.ID} - healthService list: `, healthServiceList);
        console.log('-------------------------------------------------');
      }, 5000);
    }
  }, 3000);
});
