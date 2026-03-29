<script setup>
import { ref, onMounted, computed } from 'vue';
import { remove } from 'firebase/database'; // 記得引入
import { useRoute } from 'vue-router';
import { db } from '../firebase';
import { ref as dbRef, set, onValue, update } from 'firebase/database';

const route = useRoute();
const roomId = route.params.id;
const myNickname = localStorage.getItem('myNickname') || '神秘路人';

const roomData = ref(null);
const players = computed(() => roomData.value?.players || {});
const isHost = computed(() => roomData.value?.host === myNickname);

// === 1. 定義三種難度的詞庫 ===
const wordDatabase = {
  // 🟢 簡單模式
  easy: [
    "尖叫", "原地轉圈", "伏地挺身", "學狗叫", "唱一首歌", 
    "跳舞", "比愛心", "說「我愛你」", "深蹲", "扮鬼臉",
    "搥背", "敬禮", "挖鼻孔", "裝死", "說通關密語", "吐口水"
  ],

  // 🟡 普通模式
  medium: [
    "摸鼻子", "抓頭", "拍手", "看手錶", "比讚", 
    "推眼鏡", "雙手抱胸", "嘆氣", "聳肩", "伸懶腰",
    "說「真的假的」", "說「好喔」", "大笑", "喝水", "咳嗽"
  ],

  // 🔴 困難模式
  hard: [
    "眨眼睛", "點頭", "搖頭", "抿嘴唇", "挑眉", 
    "說「對」", "說「什麼」", "說「恩」", "看手機", "深呼吸",
    "吞口水", "摸臉", "看別的地方", "微笑", "張開嘴巴", "說髒話"
  ]
};

 // === 1. 初始化 ===
onMounted(() => {
  // 把自己加入玩家名單 (若已存在不會覆蓋分數，除非重置)
  const playerRef = dbRef(db, `rooms/${roomId}/players/${myNickname}`);
  // 先讀取一次，如果該玩家已經在裡面且有分數，保留分數，否則初始化
  onValue(playerRef, (snapshot) => {
    if (!snapshot.exists()) {
      set(playerRef, {
        name: myNickname,
        score: 0,
        word: ''
      });
    }
  }, { onlyOnce: true });
  // 監聽整個房間的變化
  const roomRef = dbRef(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      roomData.value = data;
    } else {
      alert("房間已關閉或不存在！");
      window.location.href = '/';
    }
  });
}); 


const getCurrentWordList = () => {
  const mode = roomData.value?.mode;
  // 如果模式是 easy/medium/hard 就回傳對應陣列，否則回傳 medium
  return wordDatabase[mode] || wordDatabase.medium;
};

// === 2. 修改：循環切換模式 (易 -> 中 -> 難 -> 易) ===
const toggleMode = () => {
  if(!isHost.value) return;
  
  const currentMode = roomData.value.mode || 'medium'; // 預設普通
  let newMode = 'medium';

  if (currentMode === 'easy') newMode = 'medium';
  else if (currentMode === 'medium') newMode = 'hard';
  else if (currentMode === 'hard') newMode = 'easy';
  else newMode = 'medium'; // 處理舊資料 (classic/expansion) 的情況

  update(dbRef(db, `rooms/${roomId}`), { mode: newMode });
};

// === 3. 修改：發牌時使用對應詞庫 ===
const startGame = () => {
  if (!isHost.value) return;
  
  const updates = {};
  updates[`rooms/${roomId}/status`] = 'playing';

  const wordList = getCurrentWordList(); // ★ 抓取目前難度的詞

  Object.keys(players.value).forEach(id => {
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    updates[`rooms/${roomId}/players/${id}/word`] = randomWord;
  });

  update(dbRef(db), updates);
};

// const resetGame = () => {
//   if (!isHost.value) return;
//   update(dbRef(db, `rooms/${roomId}`), { status: 'waiting' });
// };

// === 4. 遊戲互動 ===
const changeWord = (targetId) => {
  if (targetId === myNickname) return;
  if (roomData.value?.status !== 'playing') return;

  const wordList = getCurrentWordList(); // ★ 抓取目前難度的詞

  const newWord = wordList[Math.floor(Math.random() * wordList.length)];
  const currentScore = players.value[targetId].score || 0;

  update(dbRef(db, `rooms/${roomId}/players/${targetId}`), {
    word: newWord,
    score: currentScore + 1
  });
};


const closeRoom = () => {
  if (!isHost.value) return;
  
  if (confirm("確定要解散房間嗎？所有資料會被刪除。")) {
    // 直接刪除整個房間節點
    remove(dbRef(db, `rooms/${roomId}`))
      .then(() => {
        alert("房間已解散");
        window.location.href = '/'; // 回首頁
      });
  }
};
</script>

<template>
  <div class="room-container">
    
    <div class="header">
      <div class="room-id-badge">
        房號：<span class="room-number">{{ roomId }}</span>
      </div>
      <div class="status-badge" :class="roomData?.status">
        {{ roomData?.status === 'playing' ? '🎮 遊戲進行中' : '⏳ 等待開始' }}
      </div>
    </div>

    <div v-if="roomData?.status === 'waiting'" class="lobby-view">      
      <div class="player-list">
        <h3>已加入玩家 ({{ Object.keys(players).length }})</h3>
        <div v-for="(player, key) in players" :key="key" class="player-card">
          <span class="avatar">👤</span>
          <span class="name">{{ player.name }}</span>
          <span v-if="roomData?.host === player.name" class="host-badge">房主</span>
        </div>
      </div>

      <div v-if="isHost" class="host-controls">
        <button @click="toggleMode" class="btn mode-btn">
          目前難度: 
          <span class="mode-highlight" :class="roomData?.mode">
            {{ 
              roomData?.mode === 'easy' ? '簡單 (安全)' : 
              roomData?.mode === 'hard' ? '困難 (危險)' : 
              '普通' 
            }}
          </span>
        </button>
        <button @click="startGame" class="btn primary">開始遊戲</button>
        <button @click="closeRoom" class="btn danger" style="margin-top: 15px;">
          解散房間
        </button>
      </div>
      <div v-else class="guest-msg">
        <p>等待房主開始遊戲...</p>
      </div>
    </div>

    <div v-else-if="roomData?.status === 'playing'" class="game-view">
      <div class="cards-grid">
        <div 
          v-for="(player, key) in players" 
          :key="key" 
          class="game-card" 
          :class="{ 'my-card': key === myNickname }"
          @dblclick="changeWord(key)"
        >
          <div class="card-header">
            <span class="avatar">👤</span>
            <span class="name">{{ player.name }}</span>
            <span class="score">🏆 {{ player.score || 0 }}</span>
          </div>

          <div class="card-content">
            <h2 v-if="key === myNickname" class="secret-text">🙈<br>秘密</h2>
            <h2 v-else class="target-word">{{ player.word }}</h2>
          </div>

          <div class="card-footer">
            <p v-if="key === myNickname" class="action-hint">這是你</p>
            <button v-else class="next-btn" @click="changeWord(key)">
              換題
            </button>
          </div>
        </div>
      </div>

      <div v-if="isHost" class="host-controls" style="margin-top: 30px;">
        <button @click="closeRoom" class="btn danger"> 解散房間 (結束遊戲)</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* === 1. 全域背景設定 (深色背景，白色文字) === */
.room-container { 
  padding: 20px; 
  text-align: center; 
  max-width: 800px; 
  margin: 0 auto; 
  /* 這裡改為深藍灰背景 */
  background-color: #2d3748; 
  color: #ffffff; 
  min-height: 100vh;
}

/* === 2. 頂部房號膠囊樣式 (新增) === */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.room-id-badge {
  background-color: #ffffff; /* 白底 */
  color: #2d3748;            /* 深色字 */
  padding: 8px 24px;
  border-radius: 50px;       /* 圓角 */
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  border: 3px solid #f6ad55; /* 橘黃色邊框 */
  display: inline-block;
}

.room-number {
  font-family: monospace;    /* 數字等寬 */
  font-size: 1.5rem;
  color: #dd6b20;            /* 橘色數字 */
  margin-left: 5px;
}

/* 狀態標籤 */
.status-badge {
  font-size: 0.9rem;
  opacity: 0.8;
  padding: 4px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
}

/* === 3. 標題與文字優化 === */
.main-title {
  color: #ffffff;
  font-size: 2.5rem;
  font-weight: 800;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5); /* 陰影讓字體浮現 */
  margin: 10px 0 30px 0;
}

/* 讓列表標題稍微小一點，且保持白色 */
.player-list h3 {
  color: #e2e8f0;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 5px;
}

/* 玩家卡片 (保持白底黑字，對比才高) */
.player-list { margin: 20px 0; text-align: left; }
.player-card { 
  background: white; 
  color: #333; /* 卡片內文字改回深色 */
  padding: 15px; 
  margin-bottom: 10px; 
  border-radius: 10px; 
  display: flex; 
  align-items: center; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.avatar { font-size: 1.5rem; margin-right: 15px; }
.name { font-weight: bold; flex-grow: 1; font-size: 1.1rem; }
.host-badge { background: #f1c40f; color: #333; font-size: 0.7rem; padding: 3px 8px; border-radius: 5px; }

/* === 4. 按鈕與控制項 === */
.btn { width: 100%; padding: 15px; margin-top: 10px; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: transform 0.1s;}
.btn:active { transform: scale(0.98); }

.primary { background: #48bb78; color: white; box-shadow: 0 4px 0 #2f855a;}
.secondary { background: #4a5568; color: white; border: 1px solid rgba(255,255,255,0.2);}

/* 模式按鈕特別設計 */
.mode-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}
.mode-highlight { color: #f6ad55; margin-left: 5px;}

/* === 5. 遊戲區域 (卡片樣式) === */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.game-card {
  background: white;
  color: #333; /* 確保遊戲卡片內文字是深色 */
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 4px 0 #cbd5e0;
  border: 2px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  user-select: none;
}

/* 自己的卡片 */
.my-card { background: #fffaf0; border-color: #fbd38d; box-shadow: 0 4px 0 #fbd38d;}

.card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px;}
.score { font-size: 0.9rem; color: #d69e2e; font-weight: bold; }

.card-content { min-height: 100px; display: flex; align-items: center; justify-content: center; }
.target-word { font-size: 1.8rem; font-weight: 900; color: #e53e3e; margin: 0; line-height: 1.2; }
.secret-text { font-size: 1.2rem; color: #a0aec0; margin: 0; }

.card-footer { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; }
.action-hint { font-size: 0.8rem; color: #718096; margin: 0; }

.next-btn {
  background: white;
  border: 2px solid #48bb78;
  color: #48bb78;
  padding: 8px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
}
.next-btn:active { background: #48bb78; color: white; }
</style>