# Apple Sign In Configuration Guide

To enable real "Sign in with Apple" functionality, you need an enrolled **Apple Developer Account** ($99/year). The current button is a UI placeholder until these backend requirements are met.

## 1. Apple Developer Portal Setup
Go to [developer.apple.com/account/resources](https://developer.apple.com/account/resources).

### Step 1: Create an App ID
1.  Go to **Identifiers** -> Click **(+)**.
2.  Select **App IDs** -> **App**.
3.  Description: `Futbin AI`, Bundle ID: `com.futbin.ai` (example).
4.  **Capabilities**: Scroll down and check **Sign In with Apple**.
5.  Continue and Register.

### Step 2: Create a Service ID
1.  Go to **Identifiers** -> Click **(+)**.
2.  Select **Service IDs**.
3.  Description: `Futbin AI Web`, Identifier: `com.futbin.ai.web` (This will be your `APPLE_CLIENT_ID`).
4.  Continue and Register.
5.  Click the newly created Service ID to edit it.
6.  Enable **Sign In with Apple** -> Click **Configure**.
7.  **Primary App ID**: Select the App ID created in Step 1.
8.  **Domains and Subdomains**: Add `futbin.ai` and `www.futbin.ai` (do not include https://).
9.  **Return URLs**: Add your callback URL, e.g., `https://futbin.ai/api/auth/apple/callback` (and `http://localhost:5173` for testing).
10. Save and Continue.

### Step 3: Create a Private Key
1.  Go to **Keys** -> Click **(+)**.
2.  Key Name: `Apple Sign In`.
3.  Enable **Sign In with Apple** -> Configure -> Choose your Primary App ID.
4.  Continue and Register.
5.  **Download** the `.p8` file. **Save this safely!** You cannot download it again.
6.  Note the **Key ID**.

## 2. Required Environment Variables
Once you have the above, you will need to configure these in `backend/.env` and Cloud Run:

```bash
# Your Team ID (Top right of Apple Developer Portal, usually 10 characters)
APPLE_TEAM_ID=XXXXXXXXXX

# The Service ID you created (Step 2)
APPLE_CLIENT_ID=com.futbin.ai.web

# The Key ID (Step 3)
APPLE_KEY_ID=XXXXXXXXXX

# The contents of the .p8 file (Step 3)
# Note: Handle newlines carefully in env vars
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 3. Backend Implementation
We will need to update the Flask backend to:
1.  Generate a Client Secret (JWT signed with your Private Key) using these credentials.
2.  Exchange the authorization code from the frontend for an ID token.
3.  Validate the ID token with Apple's servers.
