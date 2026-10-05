<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Writer Warehouse Planner Pro

A professional 2D & 3D warehouse planning system for Writer Relocations Services LLC, featuring automated storage calculations, interactive visualizations, and AI-driven layout optimization.

---

## 🚀 Running Locally

**Prerequisites:** Node.js (v20+ recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables (optional for local testing):**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API Key or custom Supabase credentials if desired.

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🌐 Deploying to Netlify

This repository is pre-configured for one-click deployment on Netlify with `netlify.toml` and `.node-version`.

### Build Settings
* **Build command:** `npm run build`
* **Publish directory:** `dist`
* **Node Version:** `20` (auto-configured in `netlify.toml` and `.node-version`)

### Environment Variables on Netlify (Site Settings > Environment Variables)
* `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key for AI layout generation.
* `VITE_SUPABASE_URL`: *(Optional)* Custom Supabase project URL (defaults to production instance if omitted).
* `VITE_SUPABASE_ANON_KEY`: *(Optional)* Custom Supabase anonymous key.

---

## ⌨️ Fast Selection & Single-Press Deletion Controls

* **Rubberband Marquee Select:** Click and drag anywhere on the canvas to draw a selection rectangle over cabins, offices, racks, or any layout items.
* **Quick Select Buttons:** Click **All**, **Cabins**, **Offices**, or **Racks** in the top navigation bar to select entire categories instantly.
* **Shift + Click:** Add or remove individual cabins, offices, or racks from selection.
* **Single-Press Delete:** Press the `Delete` or `Backspace` key on your keyboard to delete all selected items immediately without annoying interruption.
* **Ctrl + A / Cmd + A:** Select all items on the active floor.
* **Esc:** Deselect all items.
