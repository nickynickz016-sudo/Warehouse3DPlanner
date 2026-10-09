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

## 🗄️ Supabase SQL Database Setup

If you are connecting your own Supabase project, you need to run the SQL commands in `supabase_schema.sql` once in your Supabase SQL Editor:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Copy and paste the contents of `supabase_schema.sql` (or copy the SQL snippet below) and click **Run**:

```sql
-- 1. Warehouses table for configurations and layouts
create table if not exists public.warehouses (
  id text not null primary key,
  name text,
  data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.warehouses enable row level security;

drop policy if exists "Enable all access for public" on public.warehouses;
create policy "Enable all access for public"
on public.warehouses for all using (true) with check (true);

-- 2. Passports table for unit & job digital passports
create table if not exists public.passports (
  id uuid default gen_random_uuid() primary key,
  unit_id text not null,
  warehouse_name text,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.passports enable row level security;

drop policy if exists "Enable all access for public passports" on public.passports;
create policy "Enable all access for public passports"
on public.passports for all using (true) with check (true);
```

---

## ⌨️ Fast Selection & Single-Press Deletion Controls

* **Rubberband Marquee Select:** Click and drag anywhere on the canvas to draw a selection rectangle over cabins, offices, racks, or any layout items.
* **Quick Select Buttons:** Click **All**, **Cabins**, **Offices**, or **Racks** in the top navigation bar to select entire categories instantly.
* **Shift + Click:** Add or remove individual cabins, offices, or racks from selection.
* **Single-Press Delete:** Press the `Delete` or `Backspace` key on your keyboard to delete all selected items immediately without annoying interruption.
* **Ctrl + A / Cmd + A:** Select all items on the active floor.
* **Esc:** Deselect all items.

---

## 💰 Floor-by-Floor Financial Goals & Revenue Planning

Each floor in your facility can have its own independent financial targets and billing rates:
* **Target Price per CBM:** Set distinct billing rates per floor (e.g., Ground Floor at 85 AED/m³, Mezzanine at 45 AED/m³).
* **Monthly Revenue Goal:** Define custom monthly yield targets for each floor or use the one-click 85% capacity calculator.
* **Operating Budget / Overhead:** Set floor-specific operating expenses to track projected net profit.
* **Target Occupancy Goal:** Configure utilization benchmarks (e.g., 85%).
* **Floor Performance Analytics:** View real-time actual revenue versus monthly target, goal progress bars, and occupied volume in both the sidebar panel and the Financial Report modal.

