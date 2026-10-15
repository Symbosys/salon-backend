import { cert, getApps, initializeApp } from "firebase-admin/app";
import fs from "fs";
import path from "path";
const serviceAccountPath = path.join(
  process.cwd(),
  "salonapp-da00a-firebase-adminsdk-fbsvc-47dfdaf30a.json",
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];
export default firebaseApp;
