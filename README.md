# JSX-Deploy

Convert your raw JSX/TSX files into production-ready web apps in seconds.  No more wrestling with Vite configs, Netlify setup, or dependency management.

## What's the Deal?

You've got a React component.  Maybe it's beautiful.  Maybe it works perfectly. But turning it into something you can actually deploy? That's annoying.

JSX-Deploy takes your `.jsx` or `.tsx` file and spits out a complete, ready-to-deploy project.  Vite, React, Tailwind, ESLint—all wired up and ready to go.

## Installation

```bash
npm install
```

## Usage

```bash
jsx-deploy filename.jsx
```

This creates a folder called `MyComponent-app` with everything you need. 

Want a custom folder name? 

```bash
jsx-deploy filename.jsx myapp
```

That's it.  Seriously.


## What the Tool Does Automatically

1. **Reads your component** – Takes your JSX/TSX file as-is
2. **Detects dependencies** – Finds all your imports and adds the right packages
3. **Patches missing exports** – If you forgot an `export default`, it figures it out
4. **Sets up the project** – Creates folders, generates configs, installs everything
5. **Hands it over** – You get a working project folder


## Deploying

### Netlify

**Option 1 (Easiest):** Drag and drop your project folder into [Netlify Drop](https://app.netlify.com/drop)

**Option 2 (Better):**
1. Push your project to GitHub
2. Connect your repo to Netlify
3. Set build command to `npm run build` (already in `netlify.toml`)
4. Deploy!

### Vercel

Push to GitHub and connect to Vercel.  It should just work—we've included a `vercel.json` config.

## Example:  Building a Button Component

Create `Button.jsx`:

```jsx
export default function Button() {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
      Click me! 
    </button>
  );
}
```

Run: 

```bash
jsx-deploy Button.jsx button-app
cd button-app
npm run dev
```

Open `http://localhost:5173` and you've got a live button component.  Deploy it with one click. 

## FAQ

**Q: What if my component needs external packages?**

A: JSX-Deploy scans your imports and automatically adds them to `package.json`. If you import something not found, just add it manually to `package.json` and run `npm install`.

**Q: Can I customize the generated project?**

A:  Absolutely.  It's just a normal Vite project once it's created. Edit `vite.config.js`, `package.json`, whatever you need.

**Q: Does it work with TypeScript?**

A:  Yep, just name your file `.tsx` instead of `.jsx`.

**Q: What if my component doesn't export anything?**

A:  JSX-Deploy tries to find the first component (capitalized function) and exports it automatically. If that doesn't work, add an `export default` yourself.

**Q: Can I use a different CSS framework?**

A: It comes with Tailwind, but you can swap it out.  Edit `index.html` and `src/index.css` to use whatever you want (Bootstrap, plain CSS, etc.).

**Q: How do I remove Node modules and clean up?**

A: ```bash
rm -rf node_modules
```
Then `npm install` again when you're ready.  Or just recreate the project. 

## Requirements

- Node.js 14+ 
- npm (comes with Node)

## Limitations

- Opinionated stack (Vite + React + Tailwind) – not configurable (yet)
- Requires a valid React component with a proper export
- Auto-installed dependencies use "latest" version (not pinned)

## Contributing

Found a bug? Have a feature idea? Open an issue or submit a PR!

## License

MIT

---

Made with ☕ for developers who just want to ship. 
