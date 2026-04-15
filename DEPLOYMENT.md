# 🚀 Deployment Guide - Business Intelligence Dashboard

This guide helps you deploy the Business Intelligence Dashboard to **Render** (recommended for Flask apps).

## Why Render?

- ✅ **Excellent Python/Flask support**
- ✅ **Free tier available** (with limitations)
- ✅ **Easy GitHub integration**
- ✅ **Built-in database options**
- ✅ **Automatic HTTPS**
- ✅ **Beginner friendly**

---

## 📝 Pre-Deployment Checklist

Before deploying, make sure you have:

- [ ] A GitHub account (for free deployment)
- [ ] Your repository pushed to GitHub
- [ ] A Render account (free, at render.com)
- [ ] `.env` file configured locally
- [ ] `requirements.txt` up to date

### Check Your `requirements.txt`:

```bash
# Make sure these are included:
Flask==2.3.3
Flask-SQLAlchemy==3.1.1
Flask-Login==0.6.3
mysql-connector-python==8.1.0
python-dotenv==1.0.0
gunicorn==21.2.0  # <-- Already added for production!
```

**✅ Gunicorn is already included in your requirements.txt - no action needed!**

---

## 🔧 Step 1: Update Configuration Files

### Create `render.yaml` (Render deployment config)

In your project root, create a file called `render.yaml`:

```yaml
services:
  - type: web
    name: bi-dashboard
    env: python
    region: oregon
    plan: free
    buildCommand: "pip install -r requirements.txt"
    startCommand: "gunicorn app:create_app()"
    envVars:
      - key: PYTHON_VERSION
        value: 3.14
      - key: FLASK_ENV
        value: production
      - key: DEBUG
        value: false
```

### Update `run.py` for Production

Modify your `run.py` to work with Render's environment:

```python
import os
from app import create_app, db

if __name__ == '__main__':
    app = create_app()
    
    # In production (Render), don't run debug mode
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host='0.0.0.0', port=port, debug=debug)
```

---

## 🗄️ Step 2: Set Up a Database on Render

Render provides **PostgreSQL** for free. You have two options:

### Option A: Use Render's PostgreSQL (Recommended for Free Tier)
1. Create a Render PostgreSQL database
2. Update your SQLAlchemy connection string
3. Migrate your data

### Option B: Keep MySQL (Need External Service)
- Use **PlanetScale** (free MySQL hosting)
- Or **AWS RDS** (paid MySQL hosting)
- Or **Railway.app** (supports MySQL)

**For beginners, use Render's PostgreSQL** - it's easier and free!

---

## 🔑 Step 3: Create `.env` Template

Create a `.env.example` file so Render knows what environment variables are needed:

```
FLASK_ENV=production
DEBUG=False
SECRET_KEY=your_secret_key_here
DATABASE_URL=your_database_url_here
MYSQL_HOST=your_mysql_host
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_database_name
```

---

## 📤 Step 4: Deploy to Render

### 4.1 **Sign Up on Render**
- Go to **render.com**
- Click **Sign Up**
- Use your GitHub account

### 4.2 **Connect Your GitHub Repository**
1. Click **"New Web Service"**
2. Click **"Connect a GitHub repository"**
3. Select **business-intelligence-dashboard**
4. Click **"Connect"**

### 4.3 **Configure Deployment Settings**

Fill in the form:

| Setting | Value |
|---------|-------|
| **Name** | bi-dashboard (or your app name) |
| **Region** | oregon (or closest to you) |
| **Branch** | main |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn 'app:create_app()'` |

### 4.4 **Add Environment Variables**

Before deploying, add these in the **Environment** section:

```
FLASK_ENV = production
SECRET_KEY = (generate a random string)
DATABASE_URL = (from your database service)
```

### 4.5 **Deploy!**

Click **"Create Web Service"** and watch the deployment happen!

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError"
- Make sure `requirements.txt` is updated
- Run: `pip freeze > requirements.txt`

### Error: "Database connection failed"
- Check `DATABASE_URL` environment variable
- Make sure database is running
- For MySQL: Use connection string format: `mysql+mysqlconnector://user:password@host:port/database`

### App runs locally but crashes on Render
- Check Render logs: Click your service → **Logs**
- Common issue: Debug mode left on
- Set `DEBUG=False` in environment variables

### Slow deployment
- Free tier resources are limited
- Consider upgrading to **Starter** plan for better performance

---

## ✅ Success Checklist

After deployment:
- [ ] App loads at `your-app-name.onrender.com`
- [ ] Login works with test credentials
- [ ] Dashboard displays data
- [ ] Sales page loads correctly
- [ ] Inventory page functions
- [ ] No errors in Render logs

---

## 💡 Next Steps

1. **Monitor your app**: Check Render dashboard regularly
2. **Set up auto-redeploy**: Enable GitHub integration for automatic updates
3. **Scale up if needed**: Upgrade to **Starter** plan for production use
4. **Add custom domain**: Connect your own domain (paid feature)

---

## 🆘 Need Help?

If deployment fails:
1. Check Render logs (Click service → Logs)
2. Review this guide for your specific error
3. Common issues are usually in `requirements.txt` or environment variables

**Good luck with your deployment!** 🚀
