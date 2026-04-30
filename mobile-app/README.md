# A2Z Tuition Mobile App (Expo)

This folder contains the native React Native app migrated from the web frontend.

## Structure

- `App.js`
- `navigation/`
- `screens/`
- `components/`
- `services/`
- `hooks/`
- `utils/`

## Backend Integration

- Backend base URL currently uses the existing Render URL from the web config:
  - `https://schoolapp-ln74.onrender.com`
- Config is in `services/config.js`.

## Install and Run

1. Open terminal in `mobile-app`.
2. Install dependencies:
   - `npm install`
3. Start Expo:
   - `npm run start`
4. Run on Android:
   - `npm run android`

## Auth and Session

- Login supports `student`, `teacher`, and `admin`.
- Session is persisted with AsyncStorage.
- Logout clears local session and calls backend logout endpoint.

## Build APK with EAS

1. Install EAS CLI:
   - `npm install -g eas-cli`
2. Login:
   - `eas login`
3. Configure project if first time:
   - `eas build:configure`
4. Build preview APK:
   - `eas build -p android --profile preview`
5. Build production AAB:
   - `eas build -p android --profile production`
