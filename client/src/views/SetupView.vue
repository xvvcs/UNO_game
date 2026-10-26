<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGameStore, type GameSetup } from '@/stores/game'
import { computed, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useLobbyStore } from '@/stores/lobby'

const store = useGameStore()
const router = useRouter()
const session = useSessionStore()
const lobby = useLobbyStore()

const playerName = ref('')
const botCount = ref<GameSetup['botCount']>(3)
const gameMode = ref<'singleplayer' | 'multiplayer'>('singleplayer')

const multiOption = ref<'createLobby' | 'joinLobby'>('createLobby')
const numberOfPlayers = ref(2);
const joinCode = ref('');

const canStart = computed(() => playerName.value.trim().length > 0)
const startLabel = computed(() => {
  if (gameMode.value === 'singleplayer'){
    return 'Start game'
  } 
  return multiOption.value === 'createLobby' ? 'Create lobby' : 'Join lobby'
})

async function start() {
  if(gameMode.value === 'singleplayer'){
    store.startRound({ playerName: playerName.value.trim(), botCount: botCount.value })
    router.push({ name: 'game' })
    return
  }

  session.login(playerName.value.trim())
    if(multiOption.value === 'createLobby'){
      await lobby.create(numberOfPlayers.value)
    } 
    else {
      await lobby.join(joinCode.value.trim())
    }
    if(!lobby.error){
      router.push('/lobby')
    }
  }
</script>

<template>
  <main class="setupPageContainer">
    <img id="uno-logo" src="@/assets/UNO_Logo.svg" alt="UNO Logo" />
    <div class="modeToggle">
      <input v-model="gameMode" type="radio" name="mode" id="singleplayer" :value="'singleplayer'"><label for="singleplayer">Singleplayer</label>
      <input v-model="gameMode" type="radio" name="mode" id="multiplayer" :value="'multiplayer'"><label for="multiplayer">Multiplayer</label>
    </div>
    <div class="setupContainer">
      <label class="setupLabel" for="playerName">Your name:</label>
      <input id="playerName" class="setupInput" v-model="playerName" maxlength="20" placeholder="Enter your name"/>
      <template v-if="gameMode === 'singleplayer'">
        <span class="setupLabel">Number of bots:</span>
        <div class="choiceBtns">
          <input v-model.number="botCount" type="radio" name="bots" id="b1" :value="1"><label for="b1">1</label>
          <input v-model.number="botCount" type="radio" name="bots" id="b2" :value="2"><label for="b2">2</label>
          <input v-model.number="botCount" type="radio" name="bots" id="b3" :value="3"><label for="b3">3</label>
        </div>
        <p class="infoLabel"> There are {{ botCount  + 1}} players at the table</p>
      </template>
      <template v-else>
        <span class="setupLabel">Game options:</span>
        <div class="choiceBtns">
          <input v-model.number="multiOption" type="radio" name="gameOptions" id="createLobby" :value="'createLobby'"><label for="createLobby">Create Lobby</label>
          <input v-model.number="multiOption" type="radio" name="gameOptions" id="joinLobby" :value="'joinLobby'"><label for="joinLobby">Join Lobby</label>
        </div>
        <template v-if="multiOption === 'createLobby'">
          <span class="setupLabel">Number of players (including you):</span>
          <div class="choiceBtns">
            <input v-model.number="numberOfPlayers" type="radio" name="numberOfPlayers" id="p2" :value="2"><label for="p2">2</label>
            <input v-model.number="numberOfPlayers" type="radio" name="numberOfPlayers" id="p3" :value="3"><label for="p3">3</label>
            <input v-model.number="numberOfPlayers" type="radio" name="numberOfPlayers" id="p4" :value="4"><label for="p4">4</label>
          </div>
          <p class="infoLabel">You will be the host of the game</p>
        </template>
        <template v-else>
          <label class="setupLabel" for="joinCode">Join Code:</label>
          <input id="joinCode" class="setupInput" v-model="joinCode" placeholder="Enter join code for the lobby"/>
          <p class="infoLabel">You will join someone else game</p>
        </template>
      </template>
      <button class="startButton" :disabled="!canStart" @click="start">{{ startLabel }}</button>
      <p v-if="gameMode === 'multiplayer' && lobby.error" class="errorLabel">Error: {{ lobby.error }}</p>
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
.setupInput{
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
.choiceBtns, .modeToggle { 
  display: flex; 
  gap: 10px; 
}
.choiceBtns input, .modeToggle input { 
  position: absolute; 
  opacity: 0; 
  pointer-events: none; 
}
.choiceBtns label {
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
.choiceBtns input:checked + label, .modeToggle input:checked + label {
  background: var(--uno-logo-yellow);
  color: black;
  border: 2px solid white;
}
.modeToggle label {
  flex: 1;
  display: grid;
  place-items: center;
  height: 4rem;
  border-radius: 16px;
  border: 2px solid black;
  padding: 0.5rem;
  background: white;  
  color: black;
  font-weight: 700;
  cursor: pointer;
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
.errorLabel{
  text-align: center;
  color: red;
}
</style>
