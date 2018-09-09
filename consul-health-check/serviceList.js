/**
 * Created by lijianxun on 2018/9/8
 * @Util
 */
const consul = require('consul');

const option = {
  host: 'localhost',
  port: 8500,
  promisify: true
};

const consulIns = consul(option);

const main = async () => {
  const serviceList = await consulIns.agent.service.list();
  console.log('service list: ', serviceList);
  const catalogServiceList = await consulIns.catalog.service.list();
  console.log('catalogServiceList list: ', catalogServiceList);
  const nodeList = await consulIns.catalog.node.list();
  console.log('node list:', nodeList);
};

main().then();
