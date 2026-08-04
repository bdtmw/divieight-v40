# Share Your Space

Create a new web application called "divieight" — a fractional real estate 

co-ownership platform for sellers to list and manage properties sold in 1/8th 

shares. This is the Seller Module MVP.




Set up:

- A clean, professional design system (real-estate + fintech feel — trustworthy, 

  not flashy). Primary color: deep navy/charcoal. Accent: warm gold/bronze 

  (denoting "shares" and "ownership"). Use a modern sans-serif font.

- A responsive layout shell with a top navigation bar (logo left, "Seller 

  Dashboard" link, profile menu right).

- A landing/marketing home page with a hero section: "Sell Your Home in 

  1/8th Shares" and a "List Your Property" CTA button.

- Set up routing structure for: /login, /register, /onboarding, /dashboard, 

  /listings/new, /listings/:id.

- Use Supabase for backend (auth + database) since we'll need real user 

  accounts, file storage, and a Postgres database for structured data.




Do not build any forms or logic yet — just the shell, navigation, routing, 

and design system.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://divieight-v40.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b711437-0847-4eb8-96ae-d712f5d23fda).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
