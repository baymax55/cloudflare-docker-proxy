# cloudflare-docker-proxy

基于 Cloudflare Workers 的 Docker 镜像代理加速工具，支持将 Docker Hub、GitHub Packages (GHCR)、Quay、GCR 等主流容器镜像源代理至自定义域名或 `*.workers.dev` 免费域名。

> ### ⚠️ **使用提示 (Notice)**
> Docker Hub 可能会对 Cloudflare Worker 的公共出口 IP 段实施拉取频率限制（偶发 `429 Too Many Requests`）。建议在配置了多个镜像加速地址的场景下使用。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/baymax55/cloudflare-docker-proxy)

---

## 🌟 项目特性 (Features)

- ⚡ **现代化 ES Modules 架构**：完全适配 Cloudflare Workers 当前运行时标准，支持直接在线粘贴部署与本地 Wrangler CLI 部署。
- 🌐 **支持 `*.workers.dev` 开箱即用**：部署后无需强制购买或绑定自定义域名，即可直接用于加速 Docker Hub。
- 🔀 **两种多镜像源路由方式**：
  - **子域名路由**：通过 `docker.`、`ghcr.`、`quay.`、`gcr.`、`k8s.` 等二级域名映射不同上游仓库。
  - **路径路由**：在单域名或 `workers.dev` 下，通过类似 `my-worker.workers.dev/ghcr.io/owner/repo` 的路径直接拉取多仓库。
- 🖥️ **友好 Web 说明页**：浏览器访问首页直接展示服务状态、当前配置、使用命令与 Docker 守护进程配置范例。
- 🔄 **完善重定向与认证代理**：正确处理 Docker V2 规范的 Bearer Token 鉴权以及镜像分层 Blob 在 S3/CloudFront 上的 302/307 重定向。

---

## 🚀 部署指南 (Deployment)

### 方式一：Cloudflare 控制台直接部署（最快捷，无需本地环境）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 依次点击 **Workers 和 Pages** -> **创建应用程序** -> **创建 Worker**。
3. 输入 Worker 名称并点击 **部署**。
4. 部署完成后进入详情页，点击右上角 **编辑代码 (Edit Code)**。
5. 将本项目 [`src/index.js`](file:///D:/code/github/cloudflare-docker-proxy/src/index.js) 中的所有代码完整复制并替换编辑器中的默认内容。
6. 点击右上角 **部署 (Deploy)** 即可立即生效！
7. *(可选配置)*：进入该 Worker 的 **设置** -> **变量和机密**：
   - 添加变量 `CUSTOM_DOMAIN`，值为你的主域名（例如 `yourdomain.com`）。

---

### 方式二：Wrangler CLI 本地部署（推荐开发者使用）

1. **克隆代码并安装依赖**
   ```bash
   git clone https://github.com/baymax55/cloudflare-docker-proxy.git
   cd cloudflare-docker-proxy
   npm install
   ```

2. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **配置自定义域名（可选）**
   在 [`wrangler.toml`](file:///D:/code/github/cloudflare-docker-proxy/wrangler.toml) 中配置你的自定义域名：
   ```toml
   [vars]
   CUSTOM_DOMAIN = "yourdomain.com"
   ```

4. **执行部署**
   ```bash
   npm run deploy
   ```

---

### 方式三：GitHub Actions 自动持续部署

1. Fork 本项目到你个人的 GitHub 账号。
2. 在 GitHub 仓库中进入 **Settings** -> **Secrets and variables** -> **Actions**，新增以下 Repository Secrets：
   - `CF_API_TOKEN`：Cloudflare API 令牌（需具备 Worker 编辑权限）
   - `CF_ACCOUNT_ID`：你的 Cloudflare 账户 ID
   - `CUSTOM_DOMAIN`（可选）：你的自定义域名
3. 推送代码至 `master` 分支或在 GitHub Actions 页面手动点击 **Run workflow** 即可自动触发部署。

---

## 🛠️ 环境变量说明 (Environment Variables)

| 变量名 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `CUSTOM_DOMAIN` | `""` | 自定义主域名（例如 `yourdomain.com`），用于子域名路由解析 |
| `MODE` | `"production"` | 运行模式：`"production"` 或 `"debug"` |
| `TARGET_UPSTREAM` | `""` | 显式指定的上游地址（仅在 debug 模式或指定单一代理目标时生效） |

---

## 📖 使用教程 (Usage Guide)

### 1. 使用 `*.workers.dev` 域名

部署完成后，Cloudflare 会为 Worker 分配一个免费的二级域名 `https://<worker-name>.<subdomain>.workers.dev`：

- **拉取 Docker Hub 官方镜像**：
  ```bash
  docker pull <worker-name>.<subdomain>.workers.dev/library/nginx:latest
  docker pull <worker-name>.<subdomain>.workers.dev/library/redis:alpine
  ```

- **拉取 Docker Hub 第三方公开镜像**：
  ```bash
  docker pull <worker-name>.<subdomain>.workers.dev/stilleshan/frpc:latest
  ```

- **拉取其他镜像仓库（路径路由）**：
  ```bash
  # GitHub Packages (ghcr.io)
  docker pull <worker-name>.<subdomain>.workers.dev/ghcr.io/owner/repo:tag

  # Quay.io
  docker pull <worker-name>.<subdomain>.workers.dev/quay.io/coreos/etcd:latest

  # Google Container Registry (gcr.io)
  docker pull <worker-name>.<subdomain>.workers.dev/gcr.io/google-containers/pause:3.2
  ```

---

### 2. 使用自定义域名（多镜像源子域名路由）

在 Cloudflare 控制台中将 Worker 绑定自定义域名（如 `yourdomain.com`）：

| 访问域名 | 对应上游镜像源 |
| :--- | :--- |
| `docker.yourdomain.com` | `https://registry-1.docker.io` (Docker Hub) |
| `ghcr.yourdomain.com` | `https://ghcr.io` (GitHub Packages) |
| `quay.yourdomain.com` | `https://quay.io` (Quay.io) |
| `gcr.yourdomain.com` | `https://gcr.io` (Google Container Registry) |
| `k8s-gcr.yourdomain.com` | `https://k8s.gcr.io` |
| `k8s.yourdomain.com` | `https://registry.k8s.io` (Kubernetes Registry) |
| `ecr.yourdomain.com` | `https://public.ecr.aws` (Amazon ECR Public) |
| `cloudsmith.yourdomain.com` | `https://docker.cloudsmith.io` |

**绑定步骤**：
1. 在 Cloudflare DNS 解析中添加子域名（如 `docker.yourdomain.com`）的 CNAME 或 A 记录，开启小黄云代理。
2. 在 Worker 设置中的 **触发器 (Triggers)** -> **自定义域 (Custom Domains)** 添加该域名。

---

### 3. 配置 Docker 守护进程镜像源 (daemon.json)

若希望全局加速 `docker pull`，可修改宿主机上的 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.yourdomain.com"
  ]
}
```
*(如果是无自定义域名的 `workers.dev` 地址，填入 `https://<worker-name>.<subdomain>.workers.dev`)*

重启 Docker 服务：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

检查配置是否生效：
```bash
docker info | grep -A 5 "Registry Mirrors"
```

---

## 📄 License

[MIT](LICENSE)

