<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CARD_COLORS, type Card, type CardColor } from '@domain/model/card'
import { canCardBePlayed } from '@domain/model/rules'
import { HUMAN, useGameStore } from '@/stores/game'
import UnoCard from '@/components/UnoCard.vue'
import OpponentWidget from '@/components/OpponentWidget.vue'
import ColorWheelWidget from '@/components/ColorWheelWidget.vue'
import DrawPile from '@/components/DrawPile.vue'

const store = useGameStore()
const router = useRouter()

const sayUno = ref(false)
const pendingWild = ref<number>() // index of a wild card waiting for a colour choice
const message = ref('')

const view = computed(() => store.view)
const opponents = computed(() =>
  (view.value?.playerNames ?? []).map((name, i) => ({ i, name })).filter(({ i }) => i !== HUMAN),
)
const status = computed(() => {
  if (message.value) return message.value
  if (store.botsThinking && !store.isMyTurn) return 'Bots are playing…'
  return ''
})

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
    <section class="topBar">
      <button class="quitButton" @click="leave">Quit</button>
      <img id="uno-logo" src="@/assets/UNO_Logo.svg" alt="UNO Logo" />
      <span class="directionLabel">{{ view.direction === 'clockwise' ? '↻ Clockwise' : '↺ Counter-clockwise' }}</span>
    </section>
    <section v-if="store.winner !== undefined">
      <h2>{{ store.winner === HUMAN ? 'You won!' : `${view.playerNames[store.winner]} won` }}</h2>
      <button @click="leave">New game</button>
    </section>

    <section class="opponents">
      <OpponentWidget v-for="o in opponents" 
        :key="o.i"
        :name="o.name"
        :handSize="view.handSizes[o.i]"
        :isTurn="view.playerInTurn === o.i"
        :canAccuse="view.handSizes[o.i] === 1"
        @accuse="accuse(o.i, o.name)"
        />
    </section>
    <section class="colorInfo">
      <span>Current color:</span>
      <ColorWheelWidget class="colorWheelStatus" :currentColor="view.currentColor"/>
    </section>
    <section class="mainGameInfo">
      <div class="mainGameInfoContainers">
        <UnoCard :card="view.topCard" isTopCard />
        <span>Top Card</span>
      </div>
      <div class="mainGameInfoContainers">
        <DrawPile 
        :isTurn="store.isMyTurn"
        @draw="store.draw()"
        />
        <span>Draw pile: {{ view.drawPileSize }}</span>
      </div>
    </section>
    <section class="statusInfo">
      <span>{{ status }}</span>
    </section>

    <section class="handSection">
      <div class="handContainer">
        <UnoCard class="handCard"
        v-for="(card, i) in view.hand"
        :key="i"
        :card="card"
        :playable="playable(card)"
        @playCard="clickCard(i, card)"
        />
      </div>
      <span>Your hand <span v-if="store.isMyTurn">— your turn</span></span>
      <div class="colorSelection" v-if="pendingWild !== undefined">
        <ColorWheelWidget selectable @selectColor="c => playCard(pendingWild!, c)" />
      </div>

      <p>
        <label><input v-model="sayUno" type="checkbox" /> Say Uno with this play</label>
      </p>
    </section>
  </main>
  <main v-else>
    <p>No game in progress.</p>
    <RouterLink to="/">Set up a game</RouterLink>
  </main>
</template>

<style scoped>
.topBar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
}
.directionLabel{
  justify-self: end;
}
.quitButton {
  justify-self: start;
  border-radius: 16px;
  border: none;
  background-color: var(--uno-logo-red);
  color:white;
  font-weight: 700;
  padding: 1rem 2rem;
  cursor: pointer;
  font-size: 18px;
}
#uno-logo {
  width: 15rem;
}
.handContainer{
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1rem; 
  margin-bottom: 2rem;
}
.handContainer > * + * {
  margin-left: -50px;         
}
.colorWheelStatus{
  width: 4rem;
  height: 4rem;
  margin-left: 1rem;
}
.opponents{
  display: flex;
  flex-direction: row;
  gap: 1rem; 
  justify-content: center;
  margin-bottom: 1rem;
}
.colorInfo, .statusInfo{
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
}
.mainGameInfo{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5rem;
  margin-bottom: 1rem;
}
.mainGameInfoContainers{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 700;
}
.handSection{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-weight: 700;
}
.colorSelection{
  min-height: 4rem;
}
</style>
