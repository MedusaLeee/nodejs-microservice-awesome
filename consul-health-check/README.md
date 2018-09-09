# consul 服务状态检查

### 运行

    docker-compose build --no-cache
    docker-compose up

### 测试观察

   `koa1`服务会在注册成功后的`60s`后退出进程，`consul`对`koa1`服务的健康检查就
   会失败，开始`koa1`服务会被标记为`不健康`，`60s`后`consul`会`deregister`
   取消注册`koa1`服务
