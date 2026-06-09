# rss-monitor

A small dashboard that fetches and displays articles from RSS feeds.

## Structure

```
rss-monitor/
├─ public/
│  ├─ assets/
│  ├─ feeds.js
│  ├─ app.js
│  ├─ index.html
│  └─ styles.css
├─ samples/
├─ src/server/
├─ server.js
└─ server.ps1
```

## Run

```powershell
.\server.ps1
```

Then open `http://localhost:3000`.

## Feeds

| Source | URL |
|---|---|
| Ars Technica | https://feeds.arstechnica.com/arstechnica/index |
| Hacker News | https://news.ycombinator.com/rss |
| Korben | https://korben.info/feed |
| GitHub Blog | https://github.blog/feed/ |
| InfoQ | https://feed.infoq.com/ |
