# Kanji Builder

Use the **Create** page to combine symbols into words. Supports multiple languages.

## Why don’t images load when I open the HTML from a folder or zip?

Browsers block loading images when the page is opened via **file://** (e.g. double‑clicking `create.html` or opening it after extracting a zip). The console shows CORS errors like “from origin 'null' has been blocked”. This is a security rule and **cannot be fixed in code**. To see images you must use either:

- **GitHub Pages** (see below), or  
- **A local web server** in this folder (see below).

The app will show a yellow notice on the Create page when it detects file:// and suggest these options.

## Running locally (with images)

1. Open a terminal in this project folder.
2. Start a small server, for example:
   - **Node:** `npx serve` then open the URL it prints (e.g. `http://localhost:3000`).
   - **Python 3:** `python -m http.server 8000` then open `http://localhost:8000`.
3. In the browser, open `index.html` or `create.html` from that URL.

Keep all files in the same folder and **do not rename the `placeholders` folder** or the image files inside it.

## Hosting on GitHub (images loading)

To run the app from GitHub with images working:

1. **Use GitHub Pages**  
   Do not open the HTML files from the GitHub file browser (e.g. “View” on `create.html`). That won’t load images. Instead:
   - In your repo: **Settings → Pages**
   - Under “Source” choose **Deploy from a branch**
   - Branch: usually `main` (or `master`), folder: **/ (root)**
   - Save. After a minute, the site will be at `https://<your-username>.github.io/<repo-name>/`

2. **Commit the `placeholders` folder**  
   The Create page loads images from `placeholders/` (e.g. `placeholders/cold.png`). If that folder isn’t in the repo, images will not load. Ensure it’s committed:
   ```bash
   git add placeholders/
   git commit -m "Add placeholder images"
   git push
   ```

3. **Open the site via the Pages URL**  
   Visit `https://<your-username>.github.io/<repo-name>/` and use **Create** from there. Image paths are resolved from the page URL so they work on GitHub Pages.

## Files

- `index.html`, `create.html`, `dictionary.html`, `comments.html` – app pages
- `style.css`, `script.js`, `symbols.js`, `translations.js` – required; keep in the same folder
- `placeholders/` – symbol images; **do not rename**; must be in the repo for Create page images to load
