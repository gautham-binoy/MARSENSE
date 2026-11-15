# MARSENSE — Quick & Free Hosting Guide

This guide details the simplest, 100% free ways to deploy and host the entire **MARSENSE – Martian Survival Navigator** platform online for the NASA Space Apps Challenge.

---

## Recommended: The Simplest Method (Render.com Free Tier)

Because MARSENSE includes both an interactive React 19 frontend and a Python FastAPI backend with NASA raster intelligence, the **simplest** method is to deploy it as a **single unified Web Service on Render** using our pre-configured root `Dockerfile` and `render.yaml`.

- **Cost**: **$0 / Free**
- **Setup Time**: **~2 minutes**
- **Services Required**: Just **1** (everything runs in one container, eliminating CORS or domain mismatch issues).
- **Free Live URL**: `https://<your-app-name>.onrender.com`

---

### Step-by-Step Instructions for Render.com

#### Step 1: Push your latest changes to GitHub
Ensure all files are committed and pushed to your GitHub repository:
```bash
git push origin master
```

#### Step 2: Create a Free Account on Render
1. Visit [https://render.com](https://render.com).
2. Click **Get Started** and select **Sign in with GitHub**.

#### Step 3: Deploy via Blueprint (Automatic) OR Web Service

##### Method A: 1-Click Blueprint (Easiest)
1. On your Render Dashboard, click the **New +** button in the top right.
2. Select **Blueprint**.
3. Choose your `MARSENSE` GitHub repository.
4. Render will automatically read [`render.yaml`](file:///home/titan/Projects/MARSENSE/render.yaml) from your repository root and pre-fill all configuration:
   - **Service Name**: `marsense`
   - **Environment**: `Docker`
   - **Plan**: `Free`
5. Click **Apply**. Render will build the frontend, install GDAL/Python, and launch your live site!

##### Method B: Manual Web Service
If you prefer not using Blueprint:
1. Click **New +** -> **Web Service**.
2. Select your `MARSENSE` repository.
3. Fill in:
   - **Name**: `marsense` (or your choice)
   - **Region**: Choose the closest region (e.g. Frankfurt, Oregon, Ohio, Singapore)
   - **Language**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: **Free**
4. Click **Create Web Service**.

#### Step 4: Access Your Live Application!
Render will build the project and provide you with a permanent HTTPS link:
```
https://marsense.onrender.com
```
*Note: On Render's free tier, services spin down after 15 minutes of inactivity and take ~30–45 seconds to wake up on the first visit.*

---

## Alternative 1: GitHub Pages (Frontend) + Render (Backend)

If you prefer having your frontend hosted directly on **GitHub Pages** (`https://<username>.github.io/<repo>`):

### 1. Deploy the Backend to Render (Free)
1. Go to [Render.com](https://render.com) -> **New +** -> **Web Service**.
2. Point to your repository, set Dockerfile path to `backend/Dockerfile`.
3. Note your backend URL (e.g., `https://marsense-api.onrender.com`).

### 2. Enable GitHub Pages
1. On GitHub, go to your repository **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Go to **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**.
4. Add a variable named `VITE_API_BASE` with the value: `https://marsense-api.onrender.com`.
5. Push to GitHub! The pre-configured workflow [`.github/workflows/deploy-pages.yml`](file:///home/titan/Projects/MARSENSE/.github/workflows/deploy-pages.yml) will build and publish your frontend automatically.

---

## Alternative 2: Hugging Face Spaces (100% Free Docker)

Hugging Face provides **Free 2 vCPU / 16 GB RAM** Docker hosting with no credit card required.

1. Go to [https://huggingface.co/spaces](https://huggingface.co/spaces) and create a free account.
2. Click **Create new Space**.
3. Enter Space Name: `marsense`.
4. License: `mit` or `apache-2.0`.
5. Select Space SDK: **Docker** -> **Blank**.
6. Set Space Hardware: **Free (CPU basic · 2 vCPU · 16 GB RAM)**.
7. Click **Create Space**.
8. In your local terminal, add the Hugging Face git remote and push:
   ```bash
   git remote add space https://huggingface.co/spaces/<your-username>/marsense
   git push space master
   ```
9. Hugging Face will automatically build your root `Dockerfile` and give you an instant public URL!

---

## Alternative 3: Vercel (Frontend)

If you love Vercel's lightning-fast edge CDN for frontend delivery:

1. Log into [https://vercel.com](https://vercel.com) with GitHub.
2. Click **Add New...** -> **Project** -> Import your `MARSENSE` repository.
3. In Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click Edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_BASE`: Your Render backend URL (e.g. `https://marsense-api.onrender.com`)
5. Click **Deploy**.

---

## Quick Summary of Pre-Configured Files in Repo

| File | Purpose |
| :--- | :--- |
| [`Dockerfile`](file:///home/titan/Projects/MARSENSE/Dockerfile) | Multi-stage Dockerfile that builds React + Cesium and packages FastAPI + GDAL into a single zero-config image. |
| [`render.yaml`](file:///home/titan/Projects/MARSENSE/render.yaml) | Render Infrastructure-as-Code Blueprint for 1-click automatic deployment. |
| [`.github/workflows/deploy-pages.yml`](file:///home/titan/Projects/MARSENSE/.github/workflows/deploy-pages.yml) | GitHub Actions workflow that automatically builds and publishes the frontend to GitHub Pages. |
| [`backend/app/main.py`](file:///home/titan/Projects/MARSENSE/backend/app/main.py) | Configured with unified SPA routing — automatically serves the frontend static build on port 8000 when present. |
