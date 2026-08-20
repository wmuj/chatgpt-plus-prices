# ChatGPT Plus 各地区充值价

深色静态站：把各地区 ChatGPT Plus 本币月费按实时汇率折成人民币。

- 页面刷新按钮：即时拉取 [open.er-api.com](https://open.er-api.com/v6/latest/USD)
- GitHub Actions：每天 00:00（UTC+8）更新 `data/rates.json` 作为备用快照
- 本币档位在 `data/prices.json`，不随汇率脚本改写

## 本地预览

用任意静态服务器打开仓库根目录，例如：

```bash
python -m http.server 8080
```

浏览器访问 http://127.0.0.1:8080

## GitHub Pages

1. 本仓库设为 **Public**
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`

站点地址：`https://<用户名>.github.io/chatgpt-plus-prices/`
