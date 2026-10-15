// Who the player is and their connection to the game server.
// The name lives in sessionStorage, so each browser tab can be a different player.
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { connectToGameServer, type GameServer } from '@/api/gameServer'

const nameKey = 'uno.playerName'

export type ConnectToServer = (playerName: string) => GameServer

function readStoredName(): string | undefined {
  try {
    return sessionStorage.getItem(nameKey) ?? undefined
  } catch {
    return undefined
  }
}

function storeName(name: string | undefined) {
  try {
    if (name === undefined) sessionStorage.removeItem(nameKey)
    else sessionStorage.setItem(nameKey, name)
  } catch {
    // Storage can be blocked; the player just logs in again after a reload.
  }
}

export const useSessionStore = defineStore('session', () => {
  const playerName = ref<string>()
  const server = shallowRef<GameServer>()
  const isLoggedIn = computed(() => playerName.value !== undefined)

  function login(name: string, connect: ConnectToServer = connectToGameServer) {
    const trimmed = name.trim()
    if (trimmed === '') return
    server.value?.close()
    playerName.value = trimmed
    server.value = connect(trimmed)
    storeName(trimmed)
  }

  function logout() {
    server.value?.close()
    server.value = undefined
    playerName.value = undefined
    storeName(undefined)
  }

  function requireServer(): GameServer {
    if (!server.value) throw new Error('Not logged in')
    return server.value
  }

  const storedName = readStoredName()
  if (storedName !== undefined) login(storedName)

  return { playerName, server, isLoggedIn, login, logout, requireServer }
})
