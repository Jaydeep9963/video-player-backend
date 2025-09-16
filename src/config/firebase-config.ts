import * as admin from "firebase-admin";
import serviceAccount from "../keys/service-account-key";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: "https://video-player-1562c-default-rtdb.firebaseio.com",
});

export default admin;
