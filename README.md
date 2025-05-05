# Redux State Management with Appwrite Backend

This project demonstrates how to use Redux for state management with Appwrite as a backend storage solution.

## Overview

The application has:
- Redux for client-side state management
- Redux Persist for local storage persistence
- Appwrite for cross-browser/device state synchronization
- Next.js for the frontend framework

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- An Appwrite account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Install Appwrite SDK:

```bash
npm install appwrite
# or
yarn add appwrite
```

### Appwrite Setup

Follow the instructions in `setup-appwrite.md` to set up your Appwrite backend.

### Configuration

Update the Appwrite client configuration in `app/lib/appwrite.ts`:

```typescript
client
  .setEndpoint('YOUR_APPWRITE_ENDPOINT') // Replace with your Appwrite endpoint
  .setProject('YOUR_APPWRITE_PROJECT_ID'); // Replace with your project ID
```

### Running the Application

```bash
npm run dev
# or
yarn dev
```

## Usage

### Sign-in Page
- Enter an email and password
- Data will be saved to both Redux and Appwrite
- Navigate to the test page to see state persistence

### Test Page
- View the current Redux state
- Load data from Appwrite by email address
- Reset data

## Troubleshooting

### Data Not Persisting Between Browsers
- This is expected behavior with Redux/Redux Persist alone
- To test cross-browser persistence:
  1. Sign in with an email in one browser
  2. Open the application in another browser or device
  3. Go to the test page and use the "Load Data" function with the same email

### Appwrite Connection Issues
- Verify your Appwrite endpoint and project ID are correct
- Check network requests in your browser's developer tools
- Ensure your Appwrite collection has proper permissions and attributes

### TypeScript Errors
If you encounter TypeScript errors related to the Appwrite client, try:
```bash
npm install --save-dev @types/appwrite
# or
yarn add --dev @types/appwrite
```

## Next Steps

For a production application, consider:
1. Using Appwrite's authentication instead of storing passwords directly
2. Setting up proper permissions and security rules
3. Implementing more robust error handling
4. Using environment variables for Appwrite credentials

## License

This project is licensed under the MIT License.
