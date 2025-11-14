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
  try{
    // After sending, attempt to fetch receipts for ticket ids to detect invalid tokens
    const ticketIds = tickets.filter(t => t && t.id).map(t => t.id);
    if(ticketIds.length){
      const receiptChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
      for(const rc of receiptChunks){
        try{
          const receipts = await expo.getPushNotificationReceiptsAsync(rc);
          // receipts is an object keyed by ticket id
          for(const [ticketId, receipt] of Object.entries(receipts)){
            try{
              if((receipt as any).status === 'error'){
                console.error('Push receipt error for ticket', ticketId, (receipt as any).message || (receipt as any).details || receipt);
                // If device not registered, attempt to remove the corresponding token from store
                const details = (receipt as any).details || {};
                if(details.error === 'DeviceNotRegistered'){
                  // tickets array contains items with id so find index by id
                  const idx = tickets.findIndex(t => t && t.id === ticketId);
                  if(idx !== -1){
                    // map messages/tokens: messages and tokens arrays are in same order
                    const badToken = messages[idx]?.to || null;
                    if(badToken){
                      try{ pushStore.removeToken(badToken); console.log('Removed unregistered push token from store', badToken); }catch(e){console.warn('Failed to remove token', e)}
                    }
                  }
                }
              }
            }catch(e){ console.warn('Error processing receipt', e); }
          }
        }catch(e){ console.warn('Failed to fetch receipts chunk', e); }
      }
    }
  }catch(e){ console.warn('Post-send receipt handling failed', e); }
  // Log tickets for debugging
  try{ console.log('push.sendPushToTokens: tickets:', JSON.stringify(tickets)); }catch(e){/* ignore */}
  return tickets;
}

export async function sendPushToAllUsers(title: string, message: string, data: any = {}) {
  const list = pushStore.listTokens();
  const tokens = list.map((l) => l.token);
  return sendPushToTokens(tokens, title, message, data);
}

export default { sendPushToTokens, sendPushToAllUsers };
