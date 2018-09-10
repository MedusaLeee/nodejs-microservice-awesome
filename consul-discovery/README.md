# 基于consul的服务发现与客户端负载均衡

## 文件列表

* `Dockerfile`和`docker-compose.yml`就不解释了
* `app.js` 服务提供方，会向`consul`自动注册自己的`IP`和`PORT`
* `appAutoExit.js` 和`app.js`一样，服务提供方，会向`consul`自动注册自己的`IP`和`PORT`，只不过为了模拟服务异常
此服务会自动退出
* `resilient.js` 基于`resilient`客户端负载均衡器的测试服务，相当于`Spring Cloud`的`Ribbon`和`Feign`，
但是`resilient`不完善，自动刷新服务列表会导致连接到`consul`异常
* `ribbonAxios.js` 基于`axios`简单封装的服务发现客户端负载均衡器
* `loadBalanceServer.js` 基于`ribbonAxios`客户端负载均衡及服务监控的测试服务

## 场景模拟
> 所有服务定义在`docker-compose.yml`中

### 前提

* `consul`的管理页面`http://localhost:8500`
* `koa3`服务会在提供服务两分钟后自动退出，其他服务正常
* `ribbonAxios`负载均衡器采用简单的`随机`负载均衡策略

### 测试介绍

* `loadBalanceServer`的地址`http://localhost:10000`
* 服务`response`中有显示响应此次请求的服务信息`{name: 服务ID, port: 服务PORT}`
* 多次访问，发现请求被随机分发到`koa1`、`koa2`、`koa3`服务中，`consul`中`service`的`tab`显示`koa`服务有3个节点
* 当`koa3`退出后，`consul`中`service`的`tab`显示`koa`服务有3个节点，但有一个不是`健康`状态，不健康的`koa3`不会在响应请求
* 一分钟后，如果`koa3`不重新启动，`consul`自动取消`koa3`的服务注册
* 重启`koa3`服务，`koa3`服务会重新加入负载均衡并开始提供请求响应


## 测试流程

1. npm install
2. docker-compose build --no-cache
3. docker-compose up
4. 等待服务都启动后(consul集群启动后会进行leader选举) node loadBalanceServer.js
5. 访问`http://localhost:10000`，并刷新查看结果
6. 2分钟后，访问`http://localhost:10000`，并刷新查看结果
7. 重启`koa3`的`container`
8. 访问`http://localhost:10000`，并刷新查看结果





