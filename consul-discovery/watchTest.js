/**
 * Created by lijianxun on 2018/9/9
 */
const consul = require('consul')();

const watcher = consul.watch({
  method: consul.health.service,
  options: {
    service:'koa',
    passing:true
  }
});

watcher.on('change', data => {
  console.log('可用服务数:', data.length);
  data.forEach(it => {
    console.log(`http://${it.Service.Address}:${it.Service.Port}`);
  });
});

watcher.on('error', err => {
  console.error('watch error', err);
});
