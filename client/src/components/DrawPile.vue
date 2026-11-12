<script setup lang="ts">
defineProps<{isTurn: boolean}>()
const emit = defineEmits<{ draw: [] }>() 
</script>
<template>
    <div class="card" :class="{active: isTurn}" @click="emit('draw')">
        <div class="ovalContainer">UNO</div>
    </div>
</template>

<style scoped>
.card{
    width: 10rem;
    align-items: center;
    border: 5px solid white;
    border-radius: 20px;
    cursor: default;
}
.ovalContainer{
    border: 5px solid white;
    font-size: 4.5rem;
}
.card.active:hover {
     transform: translateY(-12px); 
     box-shadow: 0 0 18px var(--card-yellow);
}
.card.active{
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}
</style>