<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore, type GameSetup } from '@/stores/game'
import { computed, ref } from 'vue'

const store = useGameStore()
const router = useRouter()

const playerName = ref('')
const botCount = ref<GameSetup['botCount']>(3)
const canStart = computed(() => playerName.value.trim().length > 0)

function start() {
  store.startRound({ playerName: playerName.value.trim(), botCount: botCount.value })
  router.push({ name: 'game' })
}
</script>

<template>
  <main class="setupPageContainer">
    <img id="uno-logo" src="@/assets/UNO_Logo.svg" alt="UNO Logo" />
    <div class="setupContainer">
      <label class="setupLabel" for="playerName">Your name</label>
      <input id="playerName" class="nameInput" v-model="playerName" maxlength="20" placeholder="Enter your name"/>
      <span class="setupLabel">Number of bots</span>
      <div class="bots">
        <input v-model.number="botCount" type="radio" name="bots" id="b1" :value="1"><label for="b1">1</label>
        <input v-model.number="botCount" type="radio" name="bots" id="b2" :value="2"><label for="b2">2</label>
        <input v-model.number="botCount" type="radio" name="bots" id="b3" :value="3"><label for="b3">3</label>
      </div>
      <p class="infoLabel"> There are {{ botCount  + 1}} players at the table</p>
      <button class="startButton" :disabled="!canStart" @click="start">Start game</button>
    </div>
  </main>
</template>

<style scoped>
.setupPageContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100%;
}
#uno-logo {
  width: min(15%);
  margin: 2% 0px 2% 0px;
}
.setupContainer {
  width: 15%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--background-tiles); 
  border: 1px solid black;
  border-radius: 24px;
  padding: 1.5rem;
}
.setupLabel {
  display: block;
  margin: 10px 0 5px;
  color: white; 
  font-weight: bold;
}
.nameInput{
  width: 90%;
  border-radius: 8px;
  border: 2px solid black;
  padding: 13px;
  align-self: center;
  background: white;
  color: black;
  font-weight: 700;
  font-size: 18px;
}
.bots { 
  display: flex; 
  gap: 10px; 
}
.bots input { 
  position: absolute; 
  opacity: 0; 
  pointer-events: none; 
}
.bots label {
  flex: 1;
  display: grid;
  place-items: center;
  height: 50px;
  border-radius: 16px;
  border: 2px solid black;
  background: white;  
  color: black;
  font-weight: 700;
  cursor: pointer;
}
.bots input:checked + label {
  background: var(--uno-logo-yellow);
  color: black;
  border: 2px solid white;
}
.startButton{
  width: 100%;
  border-radius: 16px;
  border: none;
  background-color: var(--uno-logo-red);
  color:white;
  font-weight: 700;
  padding: 15px;
  cursor: pointer;
  font-size: 18px;
}
.startButton:disabled{
  cursor: not-allowed;
  background-color: #5c3328;
  color: rgba(255, 255, 255, 0.5);
}
.infoLabel{
  text-align: center;
}
</style>
