// Use require to avoid TypeScript module resolution issues in this repo
// @ts-ignore
const Expo = require('expo-server-sdk').Expo;
import pushStore from './pushStore';

const expo = new Expo();

export async function sendPushToTokens(tokens: string[], title: string, message: string, data: any = {}) {
  const messages = [];
  for (const pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn('Invalid Expo push token, skipping:', pushToken);
      continue;
    }
  // set high priority and include sound; channelId can be used on Android if you create a channel
  const msg: any = { to: pushToken, sound: 'default', title, body: message, data, priority: 'high' };
  // optional: send badge 1 to increment app badge on iOS
  try{ msg.badge = 1 }catch(e){}
  messages.push(msg);
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: any[] = [];
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notifications chunk:', error);
    }
  }
  return tickets;
}

export async function sendPushToAllUsers(title: string, message: string, data: any = {}) {
  const list = pushStore.listTokens();
  const tokens = list.map((l) => l.token);
  return sendPushToTokens(tokens, title, message, data);
}

export default { sendPushToTokens, sendPushToAllUsers };
