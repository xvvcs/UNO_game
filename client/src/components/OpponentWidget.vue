<script setup lang="ts">
defineProps<{name: string, handSize: number, isTurn: boolean, canAccuse?: boolean}>()
const emit = defineEmits<{ accuse: [] }>() 
</script>

<template>
    <div class="opponentWidgetContainer" :class="{active: isTurn}">
        <div class="cards">
            <div v-for="n in handSize" :key="n" class="card">
                <div class="ovalContainer">UNO</div>
            </div>
        </div>
        <div class="opponentInfo">
            <span class="opponentName">{{ name }}</span>
            <span class="opponentHandSize">{{ handSize }} {{ handSize === 1 ? 'card' : 'cards' }}</span>
            <button class="accuseBtn" v-if="canAccuse" @click="emit('accuse')">
                Didn't say Uno!
            </button>
        </div>
    </div>
</template>

<style scoped>
.opponentWidgetContainer{
    min-width: 18rem;
    display: flex;
    flex-direction: column;
    border-radius: 1rem;
    border: 1px solid black;
    padding: 20px;
    align-self: center;
    background: var(--background-tiles);
    color: white;
    font-weight: 700;
    gap: 15px;
}
.opponentWidgetContainer.active{
    border-color: var(--card-yellow);
    box-shadow: 0 0 18px var(--card-yellow);
}
.cards{
    display: flex;
    min-height: 30px;
}
.card + .card {
    margin-left: -12px;      
}
.card{
    border: 2px solid white;
    align-items: center;
}
.ovalContainer{
    font-size: 0.7rem;
}
.opponentInfo {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.accuseBtn{
  border-radius: 10px;
  border: none;
  background-color: var(--uno-logo-red);
  color:white;
  font-weight: 700;
  padding: 0.5rem 0.5rem;
  cursor: pointer;
}
</style>