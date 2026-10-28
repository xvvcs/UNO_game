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
import UnoButton from '@/components/UnoButton.vue'
import { useGameSource } from '@/game/gameSource'

const router = useRouter()
const gameSource = useGameSource()
const { view, mySeat, isMyTurn, winner } = gameSource

const sayUno = ref(false)
const pendingWild = ref<number>() // index of a wild card waiting for a colour choice
const message = ref('')

const opponents = computed(() =>
  (view.value?.playerNames ?? []).map((name, i) => ({ i, name })).filter(({ i }) => i !== mySeat.value),
)
const status = computed(() => {
  if (winner.value !== undefined) {
    return winner.value === mySeat.value ? 'You won!' : `${view.value?.playerNames[winner.value]} won`
  }
  if (message.value) return message.value
  if (gameSource.error.value) return gameSource.error.value
  return gameSource.waitingText.value
})

const playable = (card: Card) => isMyTurn.value && !!view.value && canCardBePlayed(card, view.value)

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
  await gameSource.play(index, color, uno)
}

async function accuse(i: number, name: string) {
  message.value = (await gameSource.accuse(i)) ? `Caught ${name}! +4 cards.` : `${name} is safe.`
}

function leave() {
  gameSource.endLocalGame()
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
        <DrawPile 
        :isTurn="isMyTurn"
        @draw="gameSource.draw()"
        />
        <span>Draw pile: {{ view.drawPileSize }}</span>
      </div>
      <div class="mainGameInfoContainers">
        <UnoCard :card="view.topCard" isTopCard />
        <span>Top Card</span>
      </div>
      <div class="mainGameInfoContainers">
        <UnoButton :sayUnoActive="sayUno" :isTurn="isMyTurn" @toggleBtn="sayUno = !sayUno" />
        <span>Say Uno with this play</span>
      </div>
    </section>
    <section class="statusInfo">
      <span>{{ status }}</span>
      <button class="newGamebutton" v-if="winner !== undefined" @click="leave">New game</button>
    </section>

    <section class="handSection">
      <span>Your hand <span v-if="isMyTurn">— your turn</span></span>
      <Transition name="fade">
        <div class="colorSelection" v-if="pendingWild !== undefined" @click.self="pendingWild = undefined">
          <ColorWheelWidget selectable @selectColor="c => playCard(pendingWild!, c)" />
        </div>
      </Transition>
      <div class="handContainer">
        <UnoCard class="handCard"
        v-for="(card, i) in view.hand"
        :key="i"
        :card="card"
        :playable="playable(card)"
        @playCard="clickCard(i, card)"
        />
      </div>
    </section>
  </main>
  <main v-else>
    <section class="noGameSection">
      <div class="noGameContainer">
        <p>No game in progress.</p>
        <RouterLink to="/">Set up a game</RouterLink>
      </div>
    </section>
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
  flex-wrap: wrap;  
  justify-content: center; 
  padding: 1rem 5rem 1rem 1rem;
  margin-bottom: 2rem;
  row-gap: 1rem
}
.handContainer > * {
  margin-right: -4rem;       
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
  margin-top: 2rem;
  margin-bottom: 2rem;
  font-weight: 700;
}
.statusInfo{
  flex-direction: column;
  gap: 1rem;
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
  gap: 1em;
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
  position: fixed;
  inset: 0;                        
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.80);
  z-index: 10;
}
.fade-enter-active,
.fade-leave-active{
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to{
  opacity: 0;
}

.newGamebutton{
  border-radius: 16px;
  background-color: white;
  border: 1px solid black;
  color:black;
  font-weight: 700;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 18px;
}
.newGamebutton:hover{
  background-color: var(--uno-logo-yellow);
  border: 1px solid white;
}
.noGameContainer{
  width: 15%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--background-tiles); 
  border: 1px solid black;
  border-radius: 24px;
  padding: 1.5rem;
}
.noGameSection{
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  height: 100%;
  width: 100%;
  margin-top: 20%;
}
</style>
