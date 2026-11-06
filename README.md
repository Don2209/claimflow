# ClaimsFlow marketing website

The marketing site for ClaimsFlow, by VisynTech (Visyn Technologies). Built with React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router, react-hook-form with zod, and react-helmet-async.

Every route is prerendered to static HTML at build time, so the output in `dist/` runs on any static host, and crawlers and social networks see full content and per-page meta tags.

## Setup

Requires Node 20.19 or newer.

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev            # http://localhost:5173
```

## Scripts

| Script                 | What it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                       |
| `npm run build`        | Type-check, build, prerender all pages, write sitemap and robots |
| `npm run preview`      | Serve the production build locally                               |
| `npm run typecheck`    | TypeScript check only                                            |
| `npm run lint`         | ESLint, including accessibility rules                            |
| `npm run format`       | Format everything with Prettier                                  |
| `npm run format:check` | Check formatting without changing files                          |

`npm run preview` sends unknown URLs to the home page. A real static host serves `404.html` for them.

## Environment variables

These are read at build time, so rebuild after changing them. They end up in public code, so never put a secret in them.

| Variable             | Required | Purpose                                                                                                                   |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `VITE_FORM_ENDPOINT` | Yes      | URL that receives both forms as a JSON POST. Without it, forms open a ready-written email to the contact address instead. |
| `VITE_SITE_URL`      | Yes      | Public address, with no trailing slash. Used for canonical links, Open Graph tags, sitemap and robots.txt.                |
| `VITE_SITE_BASE`     | No       | The folder the site sits in on its host, such as `/claimflow`. Leave empty at the root of a domain.                       |
| `VITE_ANALYTICS_SRC` | No       | Analytics script URL. Off when empty. When set, a cookie notice appears and the script loads only after consent.          |

Each form POST has a `form` field set to `demo-request` or `pilot-application`, a `timeZone` field with the visitor's time zone (such as `Asia/Tokyo`), plus the submitted values. Any non-2xx response shows the error state, along with the direct email address.

## Editing copy

All copy lives in typed files in `src/content/`. Change the text between the quotes and leave the rest alone. TypeScript will flag a mistake when you run `npm run typecheck`.

| File                    | Covers                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `site.ts`               | Contact details, navigation, footer, buttons, 404, cookie notice |
| `home.ts`               | Home page                                                        |
| `product.ts`            | Product page                                                     |
| `solutions.ts`          | Insurers, brokers and loss adjusters pages                       |
| `security.ts`           | Security page                                                    |
| `pilot.ts`              | Pilot page and form options                                      |
| `demoPage.ts`           | Book a demo page                                                 |
| `about.ts`              | About page and founder details                                   |
| `faq.ts`                | FAQ, shared by the home page and `/faq`                          |
| `legal.ts`              | Privacy and terms                                                |
| `samples.ts`            | Fictional data inside the product mocks                          |
| `src/demo/scenarios.ts` | The interactive demo's claims, documents and wording             |

### Honesty rules for copy

ClaimsFlow is pre-pilot. Until that changes, do not add customer logos, testimonials, case studies, ratings, usage statistics, performance figures, certification claims or named vendor integrations. Keep sample data obviously fictional, and labelled "Sample data". Photographs must never suggest a customer or a real claim handled by ClaimsFlow. Say "AI-assisted", never "fully automated". Use British spelling. The site sells to insurers in any country, so keep product copy and sample data free of any one country's currency, law or document names. Facts about the company, such as being based in Harare, are fine. Never claim compliance with a country's law.

## Languages

The site is published in English, plus chiShona, isiNdebele, Kiswahili, isiZulu, Hausa, Yorùbá and Amharic. English lives at `/`, and the others at `/sn/`, `/nd/`, `/sw/`, `/zu/`, `/ha/`, `/yo/` and `/am/`. Each is a separate prerendered build, and `npm run build` makes them all.

- **Covered so far:** navigation, footer, home page and the demo booking page (`translatedRoutes` in `src/i18n/languages.ts`). Other pages show English with a notice. Translated home pages leave out the interactive demo and FAQ, which are English only.
- **To add a language:** copy a file in `src/i18n/locales/`, translate it, and add the language to `languages.ts`. Anything left out shows in English.
- **To preview one locally:** `VITE_LANG=sn npm run dev`, or `npm run build` and serve `dist/` with a static server.
- **Right-to-left scripts,** such as Arabic and Tigrinya's neighbours in Arabic script, are not supported yet and need layout work first.

**The translations are unreviewed drafts.** They can be reached through the language picker, but `reviewed: false` in `languages.ts` keeps them out of search results and the sitemap. Have a native speaker with insurance knowledge check each one, then set `reviewed: true`.

## Look and feel

The site takes its look from Harare and the claim file. Colours are jacaranda purple (`ink`), number-plate yellow (`sun`, and the buttons) and the handler's red pen. Headlines are Big Shoulders Display, body text is Instrument Sans, and pen notes are Reenie Beanie.

- `ink` and `sun` classes switch a band to the purple or yellow palette. `daylight` switches a part of one back to the light palette.
- `Print` is a photo as a crooked print from the file, with an optional red-pen note. `.stamp` is a rubber stamp. `.pen` is the pen.
- The load animation in the hero (`HeroFile`) is the only motion that runs without being asked. Keep it that way.

## Photos

Photos live in `public/photos`, each in several widths. `src/content/photos.ts` records each one's size, alt text, author, source and licence, and `/credits` is built from it. To add one, put the WebP files in `public/photos`, add its entry to `photos.ts`, and use `<Photo id="..." sizes="..." />`. CC BY photos must keep their credit, so do not remove a photo's entry while it is still in use.

## Placeholders to fill in

Placeholders appear in dashed amber boxes on the dev server only, and disappear once the value is set. The built site simply leaves them out, so check this list before launch.

- [ ] **Phone number**: `contact.phone` in `src/content/site.ts`
- [ ] **Postal address**: `contact.postalAddress` in `src/content/site.ts`
- [ ] **LinkedIn URL**: `contact.linkedinUrl` in `src/content/site.ts`
- [ ] **Founder role**: `founder.role` in `src/content/about.ts`
- [ ] **Founder bio**: `founder.bio` in `src/content/about.ts`
- [ ] **Founder photo**: add the image to `public/`, then set `founder.photo` in `src/content/about.ts`, e.g. `/rufaro.jpg`
- [ ] **Privacy notice**: `src/content/legal.ts` holds a plain-language draft marked as such. Have a lawyer review it, and cover visitors from other countries, such as the EU and UK
- [ ] **Terms of use**: also a draft in `src/content/legal.ts`, for a lawyer to review
- [ ] **Form endpoint**: set `VITE_FORM_ENDPOINT`. Until then, forms open a ready-written email to `contact.email`
- [ ] **Domain**: set `VITE_SITE_URL`. The default, `https://claimsflow.example`, is not a real address

### Check before launch

These describe commitments the business has to stand behind. They came from the brief or were written for it, so confirm they are accurate:

- "We'll reply within one working day" (`demoPage.ts`)
- Pilot inclusions and requirements, especially "Training and direct support" (`pilot.ts`)
- The controls on the security page, while the product is in development (`security.ts`)
- Offering a security overview on request. It needs to exist (`security.ts`)
- The starter checklists for property and agriculture (`solutions.ts`)
- Selling outside Zimbabwe: that you can really offer in-country hosting, pilots, working hours and support in the markets you target, and that the laws named on the security page are ones you are ready to discuss (`security.ts`)
- Photo licences on `/credits`, against each source page. They came from Wikimedia Commons and the Openverse index
- The people in photos. The licences cover the photographer's rights, not the permission of anyone pictured, especially the mechanic (`mechanic`) and the crowd on First Street (`first-street`). Your own photos are better wherever you can get them
- The "Cause of loss: elephant" joke in the hero (`heroFile` in `home.ts`), and whether it suits your buyers

## Deploying

The live site is at https://don2209.github.io/claimflow/, on GitHub Pages. Run `npm run deploy:pages` to build it and publish it to the `gh-pages` branch. That branch holds generated files only, and each deploy adds a commit to it.

For any other host, run `npm run build`, then publish `dist/`. With your own domain, set `VITE_SITE_URL` and leave `VITE_SITE_BASE` empty.

- **Vercel**: import the repository. `vercel.json` sets the build and headers. Add the environment variables in project settings.
- **Netlify**: import the repository. `netlify.toml` sets the build and headers. Add the environment variables in site settings.
- **Other static hosting** (cPanel, S3, nginx, Apache): upload the contents of `dist/`. Serve `/path` from `/path/index.html`, serve `404.html` for missing pages, and cache `/assets/*` for a long time, since those filenames are hashed.

## Project structure

```
src/
  components/   Reusable UI: Button, Card, Tabs, Accordion, Navbar, MockWindow, Photo, Print, form fields
    mocks/      Custom-built product screens
  sections/     Page sections, for the home page and shared
  pages/        One file per route
  demo/         The interactive demo and its sample scenarios
  content/      All copy
  styles/       Design tokens (CSS variables) and base styles
  lib/          Helpers: forms, motion, deferred hydration, site settings
scripts/        Prerender step, which also writes sitemap.xml and robots.txt
public/         Favicons, web manifest, Open Graph image, photos/
```

Design tokens are CSS variables in `src/styles/index.css`, exposed to Tailwind in `tailwind.config.ts`. Adding the `ink` class to an element gives that element and its contents the dark palette, in either theme. `sun` does the same for yellow.

## The ClaimsFlow app

The product itself lives in `server/` (API, database, AI) and `app/` (the screens). The website above is separate.

- **Host it for demos, free:** open https://render.com/deploy?repo=https://github.com/Don2209/claimflow and fill in `GEMINI_API_KEY` and `ADMIN_EMAIL`. Render creates `ADMIN_PASSWORD` and `DATA_ENCRYPTION_KEY`, and shows them under Environment. The free plan has no permanent storage, so claims disappear when the app restarts, and it sleeps when idle. Free Gemini content may be read by Google's reviewers, so upload fictional documents only.
- **Move to real use:** in `render.yaml`, set `plan: starter`, add a `disk` mounted at `/var/data` with `DATA_DIR=/var/data`, and use a paid AI plan: `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` with `GEMINI_PAID=true`. Keep a safe copy of the encryption key.
- **After deploying:** sign in, then open Settings and press "Test the AI connection". Then open a claim using the fictional documents in `samples/motor-claim/`.
- **Run it locally:** run `npm run server:dev` and `npm run product:dev`, then open http://localhost:5180. The first sign-in details are printed in the server's terminal unless you set `ADMIN_EMAIL` and `ADMIN_PASSWORD`. `npm run product:build` then `npm start` runs the built version.
- **Settings:** `.env.product.example` lists them. Email sending and inbox collection are optional, and switch on when their settings are added.
- **Tests:** `npm test` runs the whole system against a stand-in AI service, so it proves the plumbing, not the quality of the AI's reading.
- **Storage:** one SQLite database and one folder of encrypted documents under `DATA_DIR`. It runs one server for one insurer. A second insurer gets its own deployment.
