# start redis
```shell
setsid redis-server >> redis.log
```


# start node app with pm2
```shell
pm2 start dynAPI.js assignAttach.js scheduler.js latest.js 
```
