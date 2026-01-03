# Vercel Deployment Guide

This guide explains how to deploy the AdversarialX application to Vercel.

## Quick Start

1. **Install Vercel CLI** (optional but recommended)
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```
   Follow the prompts to connect your project and deploy.

3. **Set Environment Variables** (in Vercel Dashboard or CLI)
   ```
   VITE_API_URL=your_backend_api_url
   VITE_WS_URL=your_backend_ws_url
   VITE_USE_MOCK=false  # If using a real backend
   ```

## Configuration Files

- `vercel.json` - Vercel build configuration
- `.vercelignore` - Files excluded from deployment
- `vite.config.js` - Build settings updated for Vercel

## Backend Deployment

The frontend can use mock data (default) or connect to a real backend. To deploy the backend:

### Option 1: Deploy with Vercel Serverless Functions
- Create `api/index.py` with FastAPI
- Use `vercel.json` to configure API routes
- Update CORS to allow your Vercel domain

### Option 2: Deploy to Railway, Render, or Similar
1. Deploy the `backend/` directory as a container
2. Get the backend URL
3. Update `VITE_API_URL` and `VITE_WS_URL` in Vercel

### Option 3: Use Mock Data (Default)
Set `VITE_USE_MOCK=true` (already set in `.env.example`)

## Environment Variables

Required variables for production:
```
VITE_API_URL=https://your-backend-url.com/api
VITE_WS_URL=wss://your-backend-url.com/ws
VITE_USE_MOCK=false
```

## Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check that Node.js version is compatible (18+ recommended)

### API Connection Issues
- Verify backend is deployed and accessible
- Check CORS settings in backend (add your Vercel domain)
- Test API endpoints with curl or Postman

### WebSocket Issues
- Ensure `VITE_WS_URL` uses `wss://` for production
- Check that WebSocket endpoint is enabled on backend
- Verify firewall allows WebSocket connections

## Migration from GitHub Pages

1. Remove GitHub Pages base path from `vite.config.js` ✓ (already done)
2. Add `vercel.json` configuration ✓ (already created)
3. Update any hardcoded URLs in code
4. Set up environment variables
5. Deploy and test

## CI/CD Integration

Vercel automatically deploys on push to main branch. For custom workflows:

```yaml
# .github/workflows/vercel-deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Support

For issues with:
- **Vercel deployment**: [Vercel Docs](https://vercel.com/docs)
- **Backend deployment**: Check backend/README.md
- **Application**: Open an issue on GitHub
