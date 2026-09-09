---
name: vercel-deploy
description: >-
  Use this skill when the user asks to deploy the frontend or backend to Vercel.
---

# Vercel Deployment Helper

This skill guides the agent in deploying the ThermoShelter application to Vercel.

## Steps for Frontend Deployment (Vite + React)

1. Ensure you are in the frontend directory.
2. If the Vercel CLI is not installed, install it globally: `npm i -g vercel`.
3. Run `vercel --prod` to deploy the application to production.
4. If prompted for project linking, select the existing project or create a new one.

## Steps for Backend Deployment (FastAPI)

1. Vercel supports Python Serverless Functions. Ensure there is a `vercel.json` in the backend root configuring the Python runtime.
2. The `api/index.py` or `main.py` should expose the FastAPI `app` object.
3. Run `vercel --prod` from the backend directory to deploy.
