Dev build & test push

This document explains how to create a development build (expo dev client) for the mobile app and test push notifications using the backend test endpoint.

1) Build a development client with EAS (recommended)

- Install EAS CLI:

  npm install -g eas-cli

- Log in to your Expo account (or create one):

  eas login

- From the mobile project folder:

  cd c:\Sagipero\SagiperoMobile
  eas build --profile development --platform android

- Install the generated APK on your device. Once installed, open the app using the development client.

2) Register push token

- The mobile app calls `/api/users/push-token` after login and stores the token in the backend file `data/push_tokens.json`.

3) Send a test push

- Use the backend endpoint (authenticated):

  POST /api/notifications/test-push
  Body: { "title": "Hello", "message": "This is a test", "all": false }

- Example curl (replace TOKEN):

  curl -X POST http://<HOST>:8080/api/notifications/test-push -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"title":"Hi","message":"Test push"}'

4) Notes

- Expo Go on Android does not support remote push notifications (SDK 53+). Use the dev client or a production build.
- For production push delivery, ensure you configure credentials (FCM for Android, APNs for iOS) in EAS or Expo account settings.
