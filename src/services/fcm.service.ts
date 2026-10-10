import { getMessaging } from "firebase-admin/messaging";
import firebaseApp from "../config/firebase";

export async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
) {
  try {
    const response = await getMessaging(firebaseApp).send({
      token,

      notification: {
        title,
        body,
      },

      data,

      android: {
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
    });

    console.log("FCM notification sent:", response);

    return response;
  } catch (error) {
    console.error("FCM notification error:", error);
    throw error;
  }
}