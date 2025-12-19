# Enteward Admin Analytics Dashboard

A beautiful, read-only analytics portal built with **Next.js 14** for your self-hosted Appwrite database that displays real-time record counts for all collections.

## Features

✨ **Modern Stack**
- Built with Next.js 14 (App Router)
- TypeScript for type safety
- React 18 with hooks
- Client-side rendering for real-time updates

📊 **Analytics**
- Total collections count
- Total documents across all collections
- Average documents per collection
- Individual collection statistics with document counts
- Collections sorted by document count (highest to lowest)

🔄 **Real-time Updates**
- Manual refresh button
- Auto-refresh every 5 minutes
- Shows last updated timestamp

🎨 **Beautiful UI/UX**
- Modern gradient design with smooth animations
- Responsive layout that works on all devices
- Card-based interface for easy viewing
- Hover effects and transitions

## Configuration

The dashboard is pre-configured with your Appwrite instance in `lib/appwrite.ts`:

```typescript
export const CONFIG = {
  endpoint: 'https://appwrite-prod.cloud3.appetite.studio/v1',
  projectId: 'default-677b965c00367b19d8a1',
  databaseId: 'database-66681e3f0001445f43af'
}
```

You can modify these settings by editing the `lib/appwrite.ts` file.

## Installation

1. **Install dependencies:**

```bash
npm install
# or
yarn install
# or
pnpm install
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## Production Build

Build the application for production:

```bash
npm run build
npm run start
```

This will create an optimized production build and start the server.

## Deployment

### Deploy to Vercel

The easiest way to deploy your Next.js app is using [Vercel](https://vercel.com):

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Other Platforms

You can also deploy to:
- **Netlify**: Use the Next.js plugin
- **AWS**: Use AWS Amplify or EC2
- **DigitalOcean**: Use App Platform
- **Docker**: Build a Docker image with the Next.js standalone output

### Environment Variables (Optional)

If you want to use environment variables instead of hardcoded values, create a `.env.local` file:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://appwrite-prod.cloud3.appetite.studio/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=default-677b965c00367b19d8a1
NEXT_PUBLIC_APPWRITE_DATABASE_ID=database-66681e3f0001445f43af
```

Then update `lib/appwrite.ts` to use these variables:

```typescript
export const CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
}
```

## Project Structure

```
enteward-admin-analytics/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main dashboard page
│   └── globals.css      # Global styles
├── lib/
│   └── appwrite.ts      # Appwrite configuration
├── public/              # Static files
├── .eslintrc.json       # ESLint configuration
├── .gitignore          # Git ignore rules
├── next.config.js      # Next.js configuration
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Permissions

This dashboard requires **read-only** access to your Appwrite database. Make sure your Appwrite project has the appropriate permissions configured:

1. Go to your Appwrite Console
2. Navigate to your project settings
3. Ensure the project allows public read access to database collections, OR
4. Set up an API key with read-only permissions and update the client initialization

## Security Notes

⚠️ **Important**: This dashboard connects directly to your Appwrite instance. Consider:

1. **Public Access**: If your Appwrite database requires authentication, you'll need to add authentication to this dashboard
2. **API Keys**: Never commit API keys to version control (use environment variables)
3. **Firewall**: Consider restricting access to this dashboard to specific IP addresses
4. **HTTPS**: Always serve this dashboard over HTTPS in production
5. **CORS**: Ensure CORS is properly configured in your Appwrite instance

## Troubleshooting

**Dashboard shows error:**
- Check that your Appwrite endpoint is accessible
- Verify project ID and database ID are correct
- Check browser console for detailed error messages
- Ensure CORS is properly configured in your Appwrite instance

**No collections showing:**
- Verify collections exist in your database
- Check that the database ID is correct
- Ensure proper read permissions are set

**Build errors:**
- Make sure you're using Node.js 18 or higher
- Delete `node_modules` and `.next` folders, then reinstall: `npm install`
- Clear Next.js cache: `rm -rf .next`

## Browser Support

This dashboard works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI**: React 18
- **Database**: Appwrite
- **Styling**: CSS (custom)

## License

MIT License - Feel free to modify and use as needed!

## Support

For issues or questions, please check:
- [Next.js Documentation](https://nextjs.org/docs)
- [Appwrite Documentation](https://appwrite.io/docs)
- [React Documentation](https://react.dev)
# enteward-analytics
