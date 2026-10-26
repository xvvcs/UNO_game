<script setup lang="ts">
import { computed,  watch} from 'vue'
import { useRouter } from 'vue-router'
import { useLobbyStore } from '@/stores/lobby'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const lobby = useLobbyStore()
const session = useSessionStore()

const lobbyRoom = computed(() => lobby.waitingIn)
const isCreator = computed(() => lobbyRoom.value?.creator === session.playerName)
const isEnoughPlayers = computed(() => (lobbyRoom.value?.players.length ?? 0) >= 2)

watch(
  () => lobby.startedGameId,
  (gameId) => {
    if (!gameId) return                     
    lobby.clearStarted()                    
    router.push({ name: 'onlineGame', params: { gameId } })
  },
  { immediate: true },
)

async function leave() {
    await lobby.leave()
    router.push({ name: 'setup' })
}

async function start(){
    await lobby.startNow()
}

const infoText = computed(() => {
  if (!isCreator.value){
    return 'Waiting for the host to start the game…'
  }     
  return isEnoughPlayers.value ? 'You can start the game!' : 'Waiting for more players to join…'
})

</script>

<template>
    <main v-if="lobbyRoom" class="lobbyPageContainer">
        <section class="topBarLobby">
            <button class="quitButton" @click="leave">Leave</button>
            <img id="uno-logo" src="@/assets/UNO_Logo.svg" alt="UNO Logo" />
        </section>
        <span class="lobbyTitle">{{ lobbyRoom.creator }}'s lobby</span>
        <div class="lobbyContainer">
            <span class="setupLabel" id="joinCode">Join code: {{ lobbyRoom.id }}</span>
            <span class="setupLabel">{{ lobbyRoom.players.length }} / {{ lobbyRoom.numberOfPlayers }} players</span>
            <ul class="playerList">
                <li v-for="player in lobbyRoom.players" :key="player" class="playerRow">
                    <span class="playerName">
                    <span v-if="player === lobbyRoom.creator" class="crown">👑</span>
                    {{ player }}
                    </span>
                     <span v-if="player === session.playerName" class="youTag">(You)</span>
                </li>
            </ul>
            <p class="infoLabel">{{ infoText }}</p>
            <button class="startButton" :disabled="!isCreator || lobbyRoom.players.length < 2" @click="start">Start Game</button>
            <p v-if="lobby.error" class="errorLabel">Error: {{ lobby.error }}</p>
        </div>
    </main>
    <main v-else>
        <p>Loading...</p>
    </main>
</template>

<style scoped>

.lobbyPageContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100%;
}
.lobbyContainer {
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
  text-align: center;
}
#uno-logo {
  width: min(65%);
  margin: 2% 0px 2% 0px;
  justify-self:center;
}
.lobbyTitle{
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
}

.quitButton {
  justify-self: start;
  align-self: start;
  border-radius: 16px;
  border: none;
  background-color: var(--uno-logo-red);
  color:white;
  font-weight: 700;
  padding: 1rem 2rem;
  cursor: pointer;
  font-size: 18px;
  margin-left: 1rem;
}
.topBarLobby{
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    width: 100%;
    padding: 1rem;
}
.errorLabel{
  text-align: center;
  color: red;
}
.infoLabel{
  text-align: center;
}
.playerList{
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.playerRow{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: var(--background-tiles);
  font-weight: 700;
}
.crown{
  margin-right: 0.4rem;
}
.youTag{
  color: var(--uno-logo-yellow);
  font-size: 0.9rem;
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

</style>