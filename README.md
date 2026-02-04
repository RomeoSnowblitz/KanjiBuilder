# Kanji Builder

Use the **Create** page to combine symbols into words. Supports multiple languages.

## Running locally

Open `index.html` or `create.html` in a browser (e.g. Chrome). Images load the same way as in AlphabetApp: **relative paths in HTML** (e.g. `placeholders/cold.png`) so they work when you open the page from a folder or from an extracted zip—no server or build step needed.

Keep all files in the same folder and **do not rename the `placeholders` folder** or the image files inside it.

## Hosting on GitHub

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
- `placeholders/` – symbol images; **do not rename**
