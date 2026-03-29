// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5X1MqxEdVkjgarzKPJpglZBJx3OEd_Co",
  authDomain: "ucantdothis.firebaseapp.com",
  databaseURL: "https://ucantdothis-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ucantdothis",
  storageBucket: "ucantdothis.firebasestorage.app",
  messagingSenderId: "682723055694",
  appId: "1:682723055694:web:99e75de52a7dce2d15cb1f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);