/**
 * Created by lijianxun on 2018/9/9
 * @Info 客户端负载均衡器+Axios相当于spring cloud中的Ribbon+Feign
 */
const axios = require('axios');
const consul = require('consul');
const Promise = require('bluebird');

class ServiceDiscovery {
  constructor(option) {
    this.consulAgent = option.consulAgent;
    this.serviceNameList = option.serviceNameList;
    this.consulIns = consul({
      host: option.consulAgent.host,
      port: option.consulAgent.port,
      promisify: true
    });
    this.isInit = false;
    this.serviceMap = {};
  }
  checkInit() {
    if (!this.isInit) {
      throw new Error('必须先调用init方法进行初始化');
    }
  }
  async init() {
    let leader = null;
    try {
      leader = await this.consulIns.status.leader();
    } catch (e) {
      throw new Error('连接consul失败...')
    }
    if (!leader) {
      throw new Error('连接consul失败...')
    }
    this.isInit = true;
    await this.pullService();
  }
  watchService(serviceName) {
    this.checkInit();
    const watcher = this.consulIns.watch({
      method: this.consulIns.health.service,
      options: {
        service: serviceName,
        passing: true
      }
    });

    watcher.on('change', data => {
      console.log(`watchService 服务：${serviceName}，可用服务数: ${data.length}`);
      this.serviceMap[serviceName] = data.map(node => {
        return `http://${node.Service.Address}:${node.Service.Port}`;
      });
    });

    watcher.on('error', err => {
      console.error('watchService error', err);
    });
  }
  async pullService() {
    this.checkInit();
    // 拉取需要的服务
    this.serviceMap = await Promise.props(this.serviceNameList.reduce((initObj, name) => {
      initObj[name] = this.consulIns.health.service({
        service: name,
        passing: true
      }).then(list => {
        return list.map(it => {
          console.log('pullService: ', name, it.Service.Address, it.Service.Port);
          return `http://${it.Service.Address}:${it.Service.Port}`;
        });
      });
      return initObj;
    }, {}));
    // 监听服务变化
    Object.keys(this.serviceMap).forEach(name => this.watchService(name));
  }
  randomIndex(a, b){
    this.checkInit();
    const c = b - a + 1;
    return Math.floor(Math.random() * c + a);
  }
  randomService(serviceName) {
    this.checkInit();
    const index = this.randomIndex(0, this.serviceMap[serviceName].length - 1);
    return this.serviceMap[serviceName][index]
  }
  getbalancedAxios(serviceName) {
    this.checkInit();
    const instance = axios.create({ timeout: 10000 });
    instance.defaults.baseURL = this.randomService(serviceName);
    return instance;
  }
}

let serviceDiscovery = null;

const build = async (option) => {
  if (!serviceDiscovery) {
    serviceDiscovery = new ServiceDiscovery(option);
    await serviceDiscovery.init();
    return serviceDiscovery;
  }
  return serviceDiscovery;
};

module.exports = {
  build
};
