<script setup lang="ts">
// Minimal, functional play screen - meant to be restyled.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CARD_COLORS, type Card, type CardColor } from '@domain/model/card'
import { canCardBePlayed } from '@domain/model/rules'
import { HUMAN, useGameStore } from '@/stores/game'
import UnoCard from '@/components/UnoCard.vue'

const store = useGameStore()
const router = useRouter()

const sayUno = ref(false)
const pendingWild = ref<number>() // index of a wild card waiting for a colour choice
const message = ref('')

const view = computed(() => store.view)
const opponents = computed(() =>
  (view.value?.playerNames ?? []).map((name, i) => ({ i, name })).filter(({ i }) => i !== HUMAN),
)

const playable = (card: Card) => store.isMyTurn && !!view.value && canCardBePlayed(card, view.value)

async function clickCard(index: number, card: Card) {
  if (!playable(card)) return
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    pendingWild.value = index
    return
  }
  await playCard(index)
}

async function playCard(index: number, color?: CardColor) {
  pendingWild.value = undefined
  message.value = ''
  const uno = sayUno.value
  sayUno.value = false
  await store.play(index, color, uno)
}

function accuse(i: number, name: string) {
  message.value = store.accuse(i) ? `Caught ${name}! +4 cards.` : `${name} is safe.`
}

function leave() {
  store.endRound()
  router.push({ name: 'setup' })
}
</script>

<template>
  <main v-if="view">
    <section v-if="store.winner !== undefined">
      <h2>{{ store.winner === HUMAN ? 'You won!' : `${view.playerNames[store.winner]} won` }}</h2>
      <button @click="leave">New game</button>
    </section>

    <section>
      <h2>Opponents</h2>
      <ul>
        <li v-for="o in opponents" :key="o.i">
          <strong v-if="view.playerInTurn === o.i">▶ </strong>
          {{ o.name }}: {{ view.handSizes[o.i] }} cards
          <button v-if="view.handSizes[o.i] === 1" @click="accuse(o.i, o.name)">
            Didn't say Uno!
          </button>
        </li>
      </ul>
    </section>

    <section>
      <p>
        Top Card:
      </p>
      <UnoCard :card="view.topCard" isTopCard />
      <p>
        Current color: {{ view.currentColor }}
      </p>
      <p>Draw pile: {{ view.drawPileSize }} · direction: {{ view.direction }}</p>
      <p v-if="store.botsThinking && !store.isMyTurn">Bots are playing…</p>
      <p v-if="message">{{ message }}</p>
    </section>

    <section>
      <h2>Your hand <span v-if="store.isMyTurn">— your turn</span></h2>
      <div class="handContainer">
        <UnoCard
        v-for="(card, i) in view.hand"
        :key="i"
        :card="card"
        :playable="playable(card)"
        @playCard="clickCard(i, card)"
        />
      </div>
      <div v-if="pendingWild !== undefined">
        Choose a color:
        <button v-for="c in CARD_COLORS" :key="c" @click="playCard(pendingWild, c)">{{ c }}</button>
      </div>

      <p>
        <button :disabled="!store.isMyTurn" @click="store.draw()">Draw</button>
        <label><input v-model="sayUno" type="checkbox" /> Say Uno with this play</label>
      </p>
    </section>

    <button @click="leave">Quit</button>
  </main>
  <main v-else>
    <p>No game in progress.</p>
    <RouterLink to="/">Set up a game</RouterLink>
  </main>
</template>

<style scoped>
.handContainer{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem; 
}
</style>
