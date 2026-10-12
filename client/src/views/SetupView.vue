<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore, type GameSetup } from '@/stores/game'

const store = useGameStore()
const router = useRouter()

const playerName = ref('Player')
const botCount = ref<GameSetup['botCount']>(3)

function start() {
  store.startRound({ playerName: playerName.value.trim() || 'Player', botCount: botCount.value })
  router.push({ name: 'game' })
}
</script>

<template>
  <main>
    <h1>Uno</h1>
    <label>
      Your name
      <input v-model="playerName" maxlength="20" />
    </label>
    <label>
      Opponents (bots)
      <select v-model.number="botCount">
        <option :value="1">1</option>
        <option :value="2">2</option>
        <option :value="3">3</option>
      </select>
    </label>
    <button @click="start">Start game</button>
  </main>
</template>
