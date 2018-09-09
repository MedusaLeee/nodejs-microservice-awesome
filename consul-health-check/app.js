const http = require('http');
const consul = require('consul');
const Koa = require('koa');
const app = new Koa();
// ID=koa1 PORT=3000 node app.js
// docker-compose build --no-cache
// docker stop $(docker ps -q)
const option = {
  // host: 'localhost',
  host: 'consul-agent-2',
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
    process.exit(1)
});
server.on('listening', async() => {
  console.log(`service working on ${process.env.PORT}`);
  const intervalIns = setInterval(async () => {
    console.log('正在等待 consul 集群启动和 leader 选举...');
    const leader = await consulIns.status.leader();
    if (leader) {
      clearInterval(intervalIns);
      console.log('consul 集群启动且leader选举完成，leader: ', leader);
      console.log('开始注册服务...');
      await consulIns.agent.service.register({
        id: process.env.ID,
        name: 'koa',
        address: '127.0.0.1',
        port: parseInt(process.env.PORT),
        check: {
          id: `${process.env.ID}-check`,
          http: `http://${process.env.ID}:${process.env.PORT}`,
          //  http: `http://127.0.0.1:${process.env.PORT}`,
          interval: '10s',
          timeout: '5s',
          deregistercriticalserviceafter: '1m'
        }
      });
      console.log('60秒后，模拟程序异常退出...');
      setTimeout(() => {
        console.log('程序异常退出...');
        process.exit(1)
      }, 60000)
    }
  }, 2000);
});
