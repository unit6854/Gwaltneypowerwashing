# Gwaltney's All Seasons Pressure Washing — Claude Code Instructions

## Deploy Command
When I type the word **deploy**, run these commands in order:
1. `git add -A`
2. `git commit -m "Update site"`
3. `git push origin main`

If no GitHub remote exists yet, ask me for the repo URL, then run:
```
git remote add origin <URL>
git push -u origin main
```

## Project Info
- **Framework**: Astro (static output)
- **Build command**: `npm run build`
- **Publish folder**: `dist`
- **CMS**: Decap CMS at /admin/
- **Hosting**: Netlify — https://gwaltneypowerwashing.netlify.app
- **Domain**: gwaltneypressurewashing.com
- **GitHub**: https://github.com/unit6854/Gwaltneypowerwashing.git

## Content Locations
All editable content lives in `src/data/`:
- `homepage.json` — hero, trust bar, stats, about section
- `services.json` — service cards
- `testimonials.json` — customer reviews
- `gallery.json` — gallery images
- `pricing.json` — pricing tables
- `faq.json` — FAQ accordion

## Business Contact
- Phone: 615-418-7454
- Email: Gwaltneysasp@gmail.com
- Address: 102 Greystone Road, Mount Juliet, TN

## Dev Server
```
npm run dev
```
