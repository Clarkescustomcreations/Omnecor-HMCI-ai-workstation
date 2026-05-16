# CORTEX Troubleshooting Guide

This guide helps you resolve common issues and problems with CORTEX.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Performance Issues](#performance-issues)
3. [AI Model Issues](#ai-model-issues)
4. [Chat & Context Issues](#chat--context-issues)
5. [Integration Issues](#integration-issues)
6. [Data & Storage Issues](#data--storage-issues)
7. [Advanced Troubleshooting](#advanced-troubleshooting)

## Installation Issues

### Problem: Port 3000 Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**

```bash
# Find the process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Problem: Node.js Not Found

**Error:** `command not found: node`

**Solution:**

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Problem: Dependencies Installation Fails

**Error:** `npm ERR! code ERESOLVE`

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Or use pnpm (recommended)
pnpm install
```

## Performance Issues

### Problem: Application Runs Slowly

**Symptoms:** Slow response times, UI lag, high CPU usage

**Solutions:**

1. **Disable Animations** - Go to Settings > General > Animations
2. **Clear Browser Cache** - Ctrl+Shift+Delete (Chrome/Firefox)
3. **Reduce Context Size** - Settings > Advanced > Context Size Limit
4. **Close Unused Tabs** - Free up browser memory
5. **Restart Application** - Sometimes helps with memory leaks

### Problem: High Memory Usage

**Symptoms:** Application uses excessive RAM, system becomes slow

**Solutions:**

1. **Enable Zram Buffer** - Allocate swap memory:
   ```bash
   sudo modprobe zram
   echo 2G | sudo tee /sys/block/zram0/disksize
   sudo mkswap /dev/zram0
   sudo swapon /dev/zram0
   ```

2. **Reduce Model Cache** - Settings > Advanced > Cache Size
3. **Clear Chat History** - Remove old conversations
4. **Limit Context Files** - Exclude large files from context

### Problem: GPU Not Being Used

**Symptoms:** AI responses are slow despite having a GPU

**Solutions:**

1. **Verify GPU Installation:**
   ```bash
   nvidia-smi  # For NVIDIA
   rocm-smi    # For AMD
   ```

2. **Install CUDA (NVIDIA):**
   ```bash
   sudo apt-get install -y nvidia-cuda-toolkit
   ```

3. **Configure Ollama for GPU:**
   ```bash
   CUDA_VISIBLE_DEVICES=0 ollama serve
   ```

## AI Model Issues

### Problem: Models Not Appearing in Model Hub

**Symptoms:** No local models available, only API models shown

**Solutions:**

1. **Check Ollama Status:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Start Ollama Service:**
   ```bash
   ollama serve
   ```

3. **Pull a Model:**
   ```bash
   ollama pull mistral
   ollama pull llama2
   ```

4. **Configure Ollama Host** - Settings > Model Hub > Local Models > Ollama Host

### Problem: API Model Errors

**Error:** `401 Unauthorized` or `Invalid API Key`

**Solutions:**

1. **Verify API Key** - Check your API key in Settings > Integrations
2. **Check API Key Format** - Ensure no extra spaces or characters
3. **Verify API Quota** - Check your account on the provider's website
4. **Test Connection:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.openai.com/v1/models
   ```

### Problem: Model Takes Too Long to Respond

**Symptoms:** AI responses take 30+ seconds

**Solutions:**

1. **Check Network Connection** - Ensure stable internet for API models
2. **Reduce Max Tokens** - Settings > Model Configuration > Max Tokens
3. **Lower Temperature** - Faster responses with lower randomness
4. **Use Faster Model** - Switch to a smaller, faster model
5. **Check System Resources** - Ensure sufficient RAM and CPU

## Chat & Context Issues

### Problem: ResizeObserver Error on Brain Map

**Error:** `ResizeObserver loop completed with undelivered notifications`

**Solution:** This is a known issue with React Flow. It's non-critical and doesn't affect functionality. If it persists:

1. **Refresh the Page** - Press F5
2. **Clear Browser Cache** - Ctrl+Shift+Delete
3. **Disable Browser Extensions** - Try with extensions disabled

### Problem: Context Transparency Indicator Shows Incorrect Tokens

**Symptoms:** Token count doesn't match actual usage

**Solutions:**

1. **Token Estimation is Approximate** - Actual tokens may vary
2. **Check Model Settings** - Different models count tokens differently
3. **Export Context** - See exact token usage in exported JSON

### Problem: Chat History Not Saving

**Symptoms:** Conversations disappear after refresh

**Solutions:**

1. **Enable Auto-Save** - Settings > General > Auto-Save
2. **Check Storage Space** - Ensure sufficient disk space
3. **Check Browser Storage** - Some browsers limit localStorage
4. **Export Conversation** - Manually save important chats

## Integration Issues

### Problem: GitHub Integration Not Working

**Error:** `Failed to connect to GitHub` or `Authorization failed`

**Solutions:**

1. **Check Internet Connection** - Ensure you're online
2. **Verify GitHub Credentials** - Settings > Integrations > GitHub
3. **Re-authorize** - Disconnect and reconnect GitHub
4. **Check GitHub Status** - Visit https://www.githubstatus.com

### Problem: Notion Sync Not Working

**Symptoms:** Notion databases not appearing or sync failing

**Solutions:**

1. **Verify Notion API Key** - Check your API key is correct
2. **Check Database Permissions** - Ensure CORTEX has access
3. **Test Connection** - Try syncing manually
4. **Check Notion Status** - Visit https://status.notion.so

### Problem: Cloud Storage Not Syncing

**Symptoms:** Files not syncing to Google Drive/Dropbox

**Solutions:**

1. **Check Internet Connection** - Ensure stable connection
2. **Verify Permissions** - Check storage provider permissions
3. **Check Storage Quota** - Ensure sufficient space available
4. **Re-authorize** - Disconnect and reconnect the service

## Data & Storage Issues

### Problem: Cannot Import Knowledge Base Folder

**Error:** `Permission denied` or `Folder not found`

**Solutions:**

1. **Check File Permissions:**
   ```bash
   ls -la /path/to/folder
   ```

2. **Grant Permissions:**
   ```bash
   chmod -R 755 /path/to/folder
   ```

3. **Check Path** - Ensure the path is correct and absolute
4. **Use Full Path** - Don't use `~` or relative paths

### Problem: Knowledge Base Files Not Indexed

**Symptoms:** Files appear in folder but not searchable

**Solutions:**

1. **Enable Auto-Index** - Settings > Knowledge Base > Auto-Index
2. **Check File Types** - Some file types may be excluded
3. **Check File Size** - Very large files may be skipped
4. **Manual Reindex** - Click "Reindex" button in Knowledge Base

### Problem: Storage Running Out

**Symptoms:** "Disk space low" warning

**Solutions:**

1. **Clear Model Cache** - Settings > Advanced > Clear Cache
2. **Remove Old Models** - Delete unused AI models
3. **Archive Old Projects** - Move completed projects to backup
4. **Enable Compression** - Compress large files

## Advanced Troubleshooting

### Enable Debug Mode

```bash
DEBUG=cortex:* npm run dev
```

### Check Application Logs

Logs are stored in `.manus-logs/` directory:

```bash
# View recent errors
tail -f .manus-logs/browserConsole.log

# View network requests
tail -f .manus-logs/networkRequests.log

# View server logs
tail -f .manus-logs/devserver.log
```

### Reset Application to Defaults

```bash
# Clear all preferences
rm ~/.cortex/preferences.json

# Clear all cache
rm -rf ~/.cortex/cache

# Clear browser storage
# In browser: DevTools > Application > Clear Storage
```

### Collect Diagnostic Information

For support tickets, gather:

1. **System Information:**
   ```bash
   uname -a
   node --version
   npm --version
   ```

2. **Application Version:**
   ```bash
   cat package.json | grep version
   ```

3. **Error Logs:**
   ```bash
   cat .manus-logs/browserConsole.log
   ```

4. **Environment:**
   ```bash
   env | grep CORTEX
   ```

### Contact Support

If you can't resolve the issue:

1. **Check GitHub Issues** - Search for similar problems
2. **Create New Issue** - Include diagnostic information
3. **Email Support** - support@cortex.ai
4. **Discord Community** - Join our community server

## Common Error Messages

### "ResizeObserver loop limit exceeded"
- Non-critical React Flow issue
- Refresh the page or disable animations

### "ENOENT: no such file or directory"
- File or folder not found
- Check the path and permissions

### "EACCES: permission denied"
- Insufficient file permissions
- Use `chmod` to grant permissions

### "ENOMEM: out of memory"
- Insufficient system memory
- Close other applications or enable Zram

### "ECONNREFUSED: connection refused"
- Service not running or wrong port
- Verify service is running and port is correct

## Performance Optimization Tips

1. **Use Local Models** - Faster and more private than API models
2. **Limit Context Size** - Smaller context = faster responses
3. **Disable Animations** - Reduces CPU usage
4. **Clear Cache Regularly** - Improves performance over time
5. **Update Regularly** - Latest version has performance improvements
6. **Monitor Resources** - Use `top` or `htop` to check system usage

## Getting Help

- **Documentation** - Read the User Guide
- **Keyboard Shortcuts** - Press Shift+?
- **In-App Help** - Hover over icons for tooltips
- **Community** - Join our Discord or forums
- **Support Email** - support@cortex.ai

Remember: Most issues can be resolved by restarting the application or clearing the browser cache!
