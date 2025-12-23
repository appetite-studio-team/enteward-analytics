# Environment Variables Setup

## Step 1: Create .env.local file

Create a file named `.env.local` in the root directory with the following content:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://appwrite-prod.cloud3.appetite.studio/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=default-677b965c00367b19d8a1
NEXT_PUBLIC_APPWRITE_DATABASE_ID=database-66681e3f0001445f43af

# Appwrite API Key (for server-side authentication)
# Replace 'your_api_key_here' with your actual API key from Appwrite Console
APPWRITE_API_KEY=your_api_key_here
```

## Step 2: Add Your API Key

1. Go to your Appwrite Console
2. Navigate to **API Keys** section
3. Copy the API key you created
4. Replace `your_api_key_here` in `.env.local` with your actual API key

Example:
```env
APPWRITE_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

## Step 3: Restart the Development Server

After creating/updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Security Notes

- ✅ `.env.local` is already in `.gitignore` - it won't be committed
- ⚠️ Never share your `.env.local` file or commit it to version control
- ✅ The API key is only used server-side and won't be exposed to the browser
- ✅ Use read-only permissions for the API key (databases.read, collections.read, documents.read)

## Quick Copy-Paste Command

You can also create the file using this command:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://appwrite-prod.cloud3.appetite.studio/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=default-677b965c00367b19d8a1
NEXT_PUBLIC_APPWRITE_DATABASE_ID=database-66681e3f0001445f43af
APPWRITE_API_KEY=your_api_key_here
EOF
```

Then edit the file and replace `your_api_key_here` with your actual API key.





