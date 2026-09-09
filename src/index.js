const dockerHub = "https://registry-1.docker.io";

const hubHostMap = {
  docker: dockerHub,
  quay: "https://quay.io",
  gcr: "https://gcr.io",
  "k8s-gcr": "https://k8s.gcr.io",
  k8s: "https://registry.k8s.io",
  ghcr: "https://ghcr.io",
  cloudsmith: "https://docker.cloudsmith.io",
  ecr: "https://public.ecr.aws",
};

const pathRegistryMap = {
  "registry-1.docker.io": dockerHub,
  "docker.io": dockerHub,
  "quay.io": "https://quay.io",
  "gcr.io": "https://gcr.io",
  "k8s.gcr.io": "https://k8s.gcr.io",
  "registry.k8s.io": "https://registry.k8s.io",
  "ghcr.io": "https://ghcr.io",
  "docker.cloudsmith.io": "https://docker.cloudsmith.io",
  "public.ecr.aws": "https://public.ecr.aws",
  // Shorthands
  docker: dockerHub,
  quay: "https://quay.io",
  gcr: "https://gcr.io",
  "k8s-gcr": "https://k8s.gcr.io",
  k8s: "https://registry.k8s.io",
  ghcr: "https://ghcr.io",
  cloudsmith: "https://docker.cloudsmith.io",
  ecr: "https://public.ecr.aws",
};

function resolveRoute(url, env) {
  const customDomain =
    (env && env.CUSTOM_DOMAIN) ||
    (typeof CUSTOM_DOMAIN !== "undefined" ? CUSTOM_DOMAIN : "");
  const mode =
    (env && env.MODE) || (typeof MODE !== "undefined" ? MODE : "production");
  const targetUpstream =
    (env && env.TARGET_UPSTREAM) ||
    (typeof TARGET_UPSTREAM !== "undefined" ? TARGET_UPSTREAM : "");

  if (mode === "debug" && targetUpstream) {
    return {
      upstream: targetUpstream,
      cleanPathname: url.pathname,
      registryPrefix: "",
    };
  }

  const hostname = url.hostname;

  // 1. Check customDomain subdomain matches (e.g. docker.example.com, quay.example.com)
  if (customDomain) {
    if (
      hostname === `docker.${customDomain}` ||
      hostname === `docker-staging.${customDomain}`
    ) {
      return {
        upstream: dockerHub,
        cleanPathname: url.pathname,
        registryPrefix: "",
      };
    }
    for (const [prefix, target] of Object.entries(hubHostMap)) {
      if (hostname === `${prefix}.${customDomain}`) {
        return {
          upstream: target,
          cleanPathname: url.pathname,
          registryPrefix: "",
        };
      }
    }
  }

  // 2. Check general subdomain prefixes (e.g. docker.mycompany.com, quay.mycompany.com)
  for (const [prefix, target] of Object.entries(hubHostMap)) {
    if (hostname.startsWith(`${prefix}.`)) {
      return {
        upstream: target,
        cleanPathname: url.pathname,
        registryPrefix: "",
      };
    }
  }

  // 3. Check path-based registry routing on single domains or workers.dev (e.g. /v2/ghcr.io/... or /v2/ghcr/...)
  const pathMatch = url.pathname.match(/^\/v2\/([a-zA-Z0-9.-]+)\/(.*)$/);
  if (pathMatch) {
    const candidate = pathMatch[1].toLowerCase();
    if (candidate in pathRegistryMap) {
      return {
        upstream: pathRegistryMap[candidate],
        cleanPathname: `/v2/${pathMatch[2]}`,
        registryPrefix: candidate,
      };
    }
  }

  // 4. Explicit TARGET_UPSTREAM
  if (targetUpstream) {
    return {
      upstream: targetUpstream,
      cleanPathname: url.pathname,
      registryPrefix: "",
    };
  }

  // 5. Default fallback for workers.dev or root custom domain (defaults to Docker Hub)
  if (
    hostname.endsWith(".workers.dev") ||
    (customDomain && hostname === customDomain) ||
    !customDomain
  ) {
    return {
      upstream: dockerHub,
      cleanPathname: url.pathname,
      registryPrefix: "",
    };
  }

  return { upstream: "", cleanPathname: url.pathname, registryPrefix: "" };
}

function getRoutesList(customDomain) {
  const routes = {};
  if (customDomain) {
    routes[`docker.${customDomain}`] = dockerHub;
    routes[`quay.${customDomain}`] = "https://quay.io";
    routes[`gcr.${customDomain}`] = "https://gcr.io";
    routes[`k8s-gcr.${customDomain}`] = "https://k8s.gcr.io";
    routes[`k8s.${customDomain}`] = "https://registry.k8s.io";
    routes[`ghcr.${customDomain}`] = "https://ghcr.io";
    routes[`cloudsmith.${customDomain}`] = "https://docker.cloudsmith.io";
    routes[`ecr.${customDomain}`] = "https://public.ecr.aws";
    routes[`docker-staging.${customDomain}`] = dockerHub;
  }
  return routes;
}

function renderWelcomeHtml(url, customDomain) {
  const host = url.host;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cloudflare Docker Proxy</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --success: #4ade80;
      --border: #334155;
      --code-bg: #0b1120;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(74, 222, 128, 0.1);
      color: var(--success);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 1rem;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h2 { font-size: 1.25rem; color: var(--primary); margin-bottom: 0.75rem; }
    p { color: var(--text-muted); margin-bottom: 0.75rem; }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.9rem;
      color: #e2e8f0;
      margin: 0.5rem 0 1rem 0;
    }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.75rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    th { color: var(--text-muted); }
    footer {
      text-align: center;
      margin-top: 2rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge"><span class="badge-dot"></span>服务运行正常 (Running)</div>
      <h1>Cloudflare Docker Proxy</h1>
      <p>当前代理地址：<code>${host}</code></p>
    </div>

    <div class="card">
      <h2>快速使用 (Quick Start)</h2>
      <p>无需修改本地 Docker 配置，直接使用当前域名拉取镜像：</p>
      <pre><code># 拉取 Docker Hub 官方镜像
docker pull ${host}/library/nginx:latest

# 拉取其它个人/组织镜像
docker pull ${host}/stilleshan/frpc:latest</code></pre>
    </div>

    <div class="card">
      <h2>配置镜像加速源 (daemon.json)</h2>
      <p>在 Linux / macOS / Windows Docker 中配置镜像源 <code>/etc/docker/daemon.json</code>：</p>
      <pre><code>{
  "registry-mirrors": ["https://${host}"]
}</code></pre>
      <p>重启 Docker 服务：</p>
      <pre><code>sudo systemctl daemon-reload
sudo systemctl restart docker</code></pre>
    </div>

    <div class="card">
      <h2>支持的镜像源 (Supported Registries)</h2>
      <table>
        <thead>
          <tr>
            <th>镜像仓库</th>
            <th>子域名路由 (Custom Domain)</th>
            <th>路径路由 (Single Domain / Workers.dev)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Docker Hub</td>
            <td><code>docker.${customDomain || "yourdomain.com"}</code></td>
            <td><code>${host}/...</code></td>
          </tr>
          <tr>
            <td>GitHub Container Registry</td>
            <td><code>ghcr.${customDomain || "yourdomain.com"}</code></td>
            <td><code>${host}/ghcr.io/...</code></td>
          </tr>
          <tr>
            <td>Quay.io</td>
            <td><code>quay.${customDomain || "yourdomain.com"}</code></td>
            <td><code>${host}/quay.io/...</code></td>
          </tr>
          <tr>
            <td>Google Container Registry</td>
            <td><code>gcr.${customDomain || "yourdomain.com"}</code></td>
            <td><code>${host}/gcr.io/...</code></td>
          </tr>
          <tr>
            <td>Kubernetes Registry</td>
            <td><code>k8s.${customDomain || "yourdomain.com"}</code></td>
            <td><code>${host}/registry.k8s.io/...</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer>
      Powered by <a href="https://workers.cloudflare.com/" target="_blank">Cloudflare Workers</a>
    </footer>
  </div>
</body>
</html>`;
}

function parseAuthenticate(authenticateStr) {
  // sample: Bearer realm="https://auth.ipv6.docker.com/token",service="registry.docker.io"
  const re = /(\w+)="([^"]+)"/g;
  let match;
  const params = {};
  while ((match = re.exec(authenticateStr)) !== null) {
    params[match[1]] = match[2];
  }
  if (!params.realm) {
    const reFallback = /(?<=\=")(?:\\.|[^"\\])*(?=")/g;
    const matches = authenticateStr.match(reFallback);
    if (matches && matches.length >= 2) {
      return {
        realm: matches[0],
        service: matches[1],
      };
    }
    throw new Error(`invalid Www-Authenticate Header: ${authenticateStr}`);
  }
  return {
    realm: params.realm,
    service: params.service || "",
  };
}

async function fetchToken(wwwAuthenticate, scope, authorization) {
  const url = new URL(wwwAuthenticate.realm);
  if (wwwAuthenticate.service && wwwAuthenticate.service.length) {
    url.searchParams.set("service", wwwAuthenticate.service);
  }
  if (scope) {
    url.searchParams.set("scope", scope);
  }
  const headers = new Headers();
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  return await fetch(url, { method: "GET", headers: headers });
}

function responseUnauthorized(url, mode) {
  const headers = new Headers();
  const protocol =
    mode === "debug" && url.protocol === "http:" ? "http:" : "https:";
  headers.set(
    "Www-Authenticate",
    `Bearer realm="${protocol}//${url.host}/v2/auth",service="cloudflare-docker-proxy"`
  );
  return new Response(JSON.stringify({ message: "UNAUTHORIZED" }), {
    status: 401,
    headers: headers,
  });
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const customDomain =
    (env && env.CUSTOM_DOMAIN) ||
    (typeof CUSTOM_DOMAIN !== "undefined" ? CUSTOM_DOMAIN : "");
  const mode =
    (env && env.MODE) || (typeof MODE !== "undefined" ? MODE : "production");

  if (url.pathname === "/") {
    const accept = request.headers.get("accept") || "";
    if (accept.includes("text/html")) {
      return new Response(renderWelcomeHtml(url, customDomain), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return Response.redirect(`${url.protocol}//${url.host}/v2/`, 301);
  }

  const { upstream, cleanPathname, registryPrefix } = resolveRoute(url, env);
  if (!upstream) {
    return new Response(
      JSON.stringify({
        routes: getRoutesList(customDomain),
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const isDockerHub = upstream === dockerHub;
  const authorization = request.headers.get("Authorization");

  if (url.pathname === "/v2/") {
    const newUrl = new URL(upstream + "/v2/");
    const headers = new Headers();
    if (authorization) {
      headers.set("Authorization", authorization);
    }
    // check if need to authenticate
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      headers: headers,
      redirect: "follow",
    });
    if (resp.status === 401) {
      return responseUnauthorized(url, mode);
    }
    return resp;
  }

  // get token
  if (url.pathname === "/v2/auth") {
    const newUrl = new URL(upstream + "/v2/");
    const resp = await fetch(newUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    if (resp.status !== 401) {
      return resp;
    }
    const authenticateStr = resp.headers.get("WWW-Authenticate");
    if (authenticateStr === null) {
      return resp;
    }
    const wwwAuthenticate = parseAuthenticate(authenticateStr);
    let scope = url.searchParams.get("scope");

    if (scope) {
      if (registryPrefix && scope.startsWith(`repository:${registryPrefix}/`)) {
        scope = `repository:${scope.slice(
          `repository:${registryPrefix}/`.length
        )}`;
      }
      // autocomplete repo part into scope for DockerHub library images
      // Example: repository:busybox:pull => repository:library/busybox:pull
      if (isDockerHub) {
        let scopeParts = scope.split(":");
        if (scopeParts.length === 3 && !scopeParts[1].includes("/")) {
          scopeParts[1] = "library/" + scopeParts[1];
          scope = scopeParts.join(":");
        }
      }
    }
    return await fetchToken(wwwAuthenticate, scope, authorization);
  }

  // redirect for DockerHub library images
  // Example: /v2/busybox/manifests/latest => /v2/library/busybox/manifests/latest
  if (isDockerHub) {
    const pathParts = cleanPathname.split("/");
    if (pathParts.length === 5) {
      pathParts.splice(2, 0, "library");
      const redirectUrl = new URL(url);
      if (registryPrefix) {
        redirectUrl.pathname = `/v2/${registryPrefix}/${pathParts
          .slice(2)
          .join("/")}`;
      } else {
        redirectUrl.pathname = pathParts.join("/");
      }
      return Response.redirect(redirectUrl.toString(), 301);
    }
  }

  // forward requests
  const newUrl = new URL(upstream + cleanPathname);
  const newReq = new Request(newUrl, {
    method: request.method,
    headers: request.headers,
    // don't follow redirect to dockerhub blob upstream
    redirect: isDockerHub ? "manual" : "follow",
  });
  const resp = await fetch(newReq);
  if (resp.status === 401) {
    return responseUnauthorized(url, mode);
  }

  // handle dockerhub blob redirect manually
  if (isDockerHub && (resp.status === 307 || resp.status === 302)) {
    const location = resp.headers.get("Location");
    if (location) {
      const redirectResp = await fetch(location, {
        method: "GET",
        redirect: "follow",
      });
      return redirectResp;
    }
  }
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};
