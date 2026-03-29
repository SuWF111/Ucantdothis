<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { db } from '../firebase'; // 引入我們設定好的 firebase
import { ref as dbRef, set } from 'firebase/database'; // 引入寫入資料庫的功能

const router = useRouter();
const nickname = ref(''); // 玩家輸入的暱稱
const roomIdInput = ref(''); // 玩家輸入的房間號碼 (加入用)

// === 功能 1: 建立新房間 ===
const createRoom = () => {
  if (!nickname.value) return alert("請先輸入暱稱！");

  // 1. 隨機產生一個 4 位數房間號碼 (1000~9999)
  const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();

  // 2. 把房間資料寫入 Firebase
  // 資料庫路徑: rooms/房間號/
  set(dbRef(db, 'rooms/' + newRoomId), {
    status: 'waiting', // 狀態：等待中
    host: nickname.value, // 房主是誰
    createdAt: Date.now()
  }).then(() => {
    // 3. 寫入成功後，把玩家帶到房間頁面 (同時把名字存在瀏覽器裡)
    localStorage.setItem('myNickname', nickname.value);
    // 我們等等再來寫 '/room' 這個頁面，先讓它跳轉
    alert(`房間建立成功！房號是：${newRoomId}`);
    router.push(`/room/${newRoomId}`);
  });
};

// === 功能 2: 加入房間 ===
const joinRoom = () => {
  if (!nickname.value || !roomIdInput.value) return alert("暱稱和房號都要填喔！");
  
  localStorage.setItem('myNickname', nickname.value);
  alert(`準備加入房間：${roomIdInput.value}`);
  router.push(`/room/${roomIdInput.value}`);
};
</script>

<template>
  <div class="home">
    <h1>不要這樣做</h1>
    <p>Don't do this</p>

    <div class="card">
      <label>你的暱稱：</label>
      <input v-model="nickname" type="text" placeholder="例如：阿明" />

      <div class="actions">
        <button @click="createRoom" class="btn primary">建立新房間</button>
        
        <hr />
        
        <input v-model="roomIdInput" type="number" placeholder="輸入房號" />
        <button @click="joinRoom" class="btn secondary">加入房間</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 簡單的美化樣式 */
.home { padding-top: 50px; }
.card {
  background: white;
  color: #333;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}
input {
  width: 80%;
  padding: 10px;
  margin: 10px 0;
  font-size: 18px;
  text-align: center;
  border: 1px solid #ccc;
  border-radius: 5px;
}
.btn {
  width: 90%;
  padding: 12px;
  font-size: 18px;
  margin: 10px 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.primary { background-color: #e74c3c; color: white; } /* 紅色按鈕 */
.secondary { background-color: #3498db; color: white; } /* 藍色按鈕 */

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 針對 Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>