# 🚀 Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- A Convex account and deployment
- Environment variables configured in Convex
- A GitHub account
- A Vercel account

## Step 1: Prepare for Deployment

1. **Build the project locally to test**
   ```bash
   npm run build
   ```

2. **Ensure all environment variables are set in Convex**
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET` 
   - `OPENROUTER_API_KEY`

## Step 2: Push to GitHub

1. **Initialize Git repository (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Personal Finance App with Plaid and AI"
   ```

2. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it `personal-finance-app`
   - Don't initialize with README (we already have one)

3. **Connect and push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/personal-finance-app.git
   git branch -M main
   git push -u origin main
   ```

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Link to existing project or create new
   - Set build settings (should auto-detect Vite)

4. **Set Environment Variables in Vercel**
   - Go to your project dashboard on Vercel
   - Navigate to Settings → Environment Variables
   - Add: `CONVEX_DEPLOYMENT` with your Convex deployment URL

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

### Option B: Vercel Dashboard

1. **Connect GitHub to Vercel**
   - Go to https://vercel.com/dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Add `CONVEX_DEPLOYMENT` with your Convex deployment URL

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Step 4: Configure Domain (Optional)

1. **Custom Domain**
   - In Vercel dashboard, go to Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

## Step 5: Set Up Continuous Deployment

Vercel automatically sets up continuous deployment from your main branch. Every push to main will trigger a new deployment.

## Environment Variables Reference

### Convex (Backend)
Set these in your Convex dashboard:
```
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Vercel (Frontend)
Set these in your Vercel dashboard:
```
CONVEX_DEPLOYMENT=https://your-deployment.convex.cloud
```

## Troubleshooting

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure TypeScript types are correct
- Verify environment variables are set

### Runtime Errors
- Check browser console for errors
- Verify Convex deployment is active
- Ensure environment variables are correctly set

### Plaid Integration Issues
- Verify Plaid credentials are correct
- Check that you're using sandbox mode for development
- Ensure webhook URLs are configured if needed

### AI Assistant Issues
- Verify OpenRouter API key is valid
- Check that you have sufficient credits
- Ensure the model name is correct

## Production Checklist

- [ ] All environment variables configured
- [ ] Build completes successfully
- [ ] Convex deployment is active
- [ ] Plaid integration tested
- [ ] AI assistant working
- [ ] Authentication flow tested
- [ ] Mobile responsiveness checked
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Security best practices followed

## Monitoring

### Vercel Analytics
- Enable Vercel Analytics in your dashboard
- Monitor performance and usage

### Convex Monitoring
- Check Convex dashboard for function performance
- Monitor database usage
- Review error logs

### Error Tracking
Consider adding error tracking services like:
- Sentry
- LogRocket
- Bugsnag

## Updates and Maintenance

1. **Regular Updates**
   ```bash
   git add .
   git commit -m "Update: description of changes"
   git push origin main
   ```

2. **Dependency Updates**
   ```bash
   npm update
   npm audit fix
   ```

3. **Security Updates**
   - Regularly update dependencies
   - Monitor security advisories
   - Update API keys as needed

## Support

If you encounter issues during deployment:
1. Check Vercel build logs
2. Review Convex function logs
3. Verify all environment variables
4. Test locally first
5. Check GitHub repository settings
