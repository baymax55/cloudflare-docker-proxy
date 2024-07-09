# cloudflare-docker-proxy

![deploy](https://github.com/baymax55/cloudflare-docker-proxy/actions/workflows/deploy.yaml/badge.svg)

> If you're looking for proxy for helm, maybe you can try [cloudflare-helm-proxy](github.com/baymax55/cloudflare-helm-proxy).

## Deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/baymax55/cloudflare-docker-proxy)

1. create an cloudflare **API Token** first (token ONLY SHOW ONCE), **Account ID** is needed. (Account ID is different from Login ID. If Account ID **Not Found**, create an **Application** in **cloudflare workers** page first.)
2. fork this project
3. modify the link of the above button to your fork url
4. modify **routes** as your need:    
    4.1. use cloudflare worker host: only support proxy one registry
   - modify **routes** as follow: (in file `src/index.js`)
   ```javascript
   const routes = {
     "${workername}.${username}.workers.dev/": "https://registry-1.docker.io",
   };
   ```
    4.2. use custom domain: support proxy multiple registries route by host (assume your domain is **yourdomain.com**)
   - modify **routes** according to your **domain** as follow: (in file `src/index.js`)
   ```javascript
   const routes = {
     "docker.yourdomain.com": "https://registry-1.docker.io",
     "quay.yourdomain.com": "https://quay.io",
     "gcr.yourdomain.com": "https://k8s.gcr.io",
     "k8s-gcr.yourdomain.com": "https://k8s.gcr.io",
     "ghcr.yourdomain.com": "https://ghcr.io",
   };
   ```  
5. click the button, you will be redirected to the deploy page.
6. if you choose **4.2 use custom domain** in _step 4_, you need to do the following steps:
  - host your domain DNS on cloudflare
  - add all domains (which config in _step 4.2_. eg: `docker.yourdomain.com`, `quay.yourdomain.com` etc.) to **Custom Domains** of the worker you have deployed. 


  *Attention： Click **Triggers** in the _worker page_ to show **Custom Domains** and **Routes** info.


## Config Docker mirrors
1. modify `/etc/docker/daemon.json`, add **registry-mirrors** as follow:
   - if you choose **4.1 use cloudflare worker host**.   
     Change the following **url** to your **actually url** (which you can find in **Preview** or **Routes** of your worker).
    ```javascript
    {
        "registry-mirrors": ["https://<workername>.<username>.workers.dev"]
    }
    ```
    - if you choose **4.2 use custom domain**
    ```javascript
    {
        "registry-mirrors": ["https://docker.yourdomain.com"]
    }
    ```
2. restart docker daemon
```
   systemctl restart docker.service
```

**Enjoy yourself!**
  
