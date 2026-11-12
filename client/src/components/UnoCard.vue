<script setup lang="ts">
import type { Card } from '@domain/model/card'
import {computed} from 'vue'

const props = defineProps<{ card: Card; playable?: boolean; isTopCard?: boolean }>();

const colorClass = computed(() =>
    'color' in props.card ? props.card.color.toLowerCase() : 'wild',
)
const symbol = computed(() => {
    switch (props.card.type) {
      case 'NUMBERED':   return String(props.card.number)
      case 'SKIP':       return '⊘'
      case 'REVERSE':    return '⇄'
      case 'DRAW':       return '+2'
      case 'WILD DRAW':  return '+4'
      case 'WILD':       return '' 
      default:           return ''
    }
})
const emit = defineEmits<{ playCard: [] }>()          
</script>
<template>
    <div class="card" :class="[colorClass, { playable: !isTopCard && playable, disabled: !isTopCard && !playable }]" @click="emit('playCard')">
        <template v-if="props.card.type === 'WILD' || props.card.type === 'WILD DRAW'">
        <span class="cardSymbolTopCorner">{{ props.card.type === 'WILD' ? '' : '+4' }}</span>
        <div class="ovalContainer wildOvalContainer">
        </div>
        <span class="cardSymbolBottomCorner">{{ props.card.type === 'WILD' ? '' : '+4' }}</span>
        </template>
        <template v-else>
        <span class="cardSymbolTopCorner">{{ symbol }}</span>
        <div class="ovalContainer">
            <span class="cardSymbolMiddle">{{ symbol }}</span>
        </div>
        <span class="cardSymbolBottomCorner">{{ symbol }}</span>
        </template>
    </div>
</template>

<style scoped>
.card.red    { --card-color: var(--card-red); }
.card.blue   { --card-color: var(--card-blue); }
.card.green  { --card-color: var(--card-green); }
.card.yellow { --card-color: var(--card-yellow); }
.card.wild  { --card-color: var(--card-wildcard); }

.card { 
    isolation: isolate;
    width: 10rem;
    background: var(--card-color);
    border: 5px solid white;
    justify-content: space-between;
    border-radius: 20px;
    cursor: default;
    transition: transform 0.15s, box-shadow 0.15s;
}
.card.playable {
    cursor: pointer;
}
.card.playable:hover {
     transform: translateY(-12px); 
     box-shadow: 0 0 18px var(--card-yellow); 
}
.card.disabled {
    filter: brightness(0.5); 
}
.cardSymbolTopCorner {
    font-size: 2rem;
    font-weight: bold;
    color: white;
}
.cardSymbolBottomCorner {
    font-size: 2rem;
    font-weight: bold;
    color: white;
    align-self: flex-end;
    transform: rotate(180deg)
}
.cardSymbolMiddle {
    font-size: 4.5rem;
    font-weight: bold;
    color: white;
    transform: rotate(50deg);
}
.ovalContainer{
    background: var(--card-color);
    border: 5px solid white;
    align-self: center;
}
.wildOvalContainer{
   background: conic-gradient(
      var(--card-red) 0 25%,
      var(--card-blue) 0 50%,
      var(--card-green) 0 75%,
      var(--card-yellow) 0
    ); 
}
</style>