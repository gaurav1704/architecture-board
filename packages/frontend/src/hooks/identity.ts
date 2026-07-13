const ADJECTIVES = [
  'Swift', 'Bold', 'Calm', 'Dark', 'Eager', 'Fierce', 'Gentle', 'Happy',
  'Iron', 'Jade', 'Keen', 'Lazy', 'Misty', 'Noble', 'Onyx', 'Proud',
  'Quiet', 'Rapid', 'Sharp', 'Tough', 'Ultra', 'Vivid', 'Wild', 'Zesty',
]

const ANIMALS = [
  'Falcon', 'Badger', 'Coyote', 'Dolphin', 'Eagle', 'Fox', 'Gorilla',
  'Hawk', 'Ibex', 'Jackal', 'Koala', 'Lynx', 'Moose', 'Newt', 'Owl',
  'Puma', 'Quail', 'Raven', 'Snake', 'Tiger', 'Urchin', 'Viper', 'Wolf',
  'Yak', 'Zebra',
]

function generateId(): string {
  return crypto.randomUUID().slice(0, 8)
}

function getOrCreate(key: string, storage: Storage): string {
  let id = storage.getItem(key)
  if (!id) {
    id = generateId()
    storage.setItem(key, id)
  }
  return id
}

export function getUserId(): string {
  return getOrCreate('board_user_id', localStorage)
}

export function getClientId(): string {
  return getOrCreate('board_client_id', sessionStorage)
}

export function getDisplayName(userId: string): string {
  const stored = localStorage.getItem('board_display_name')
  if (stored) return stored

  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const adj = ADJECTIVES[hash % ADJECTIVES.length]
  const animal = ANIMALS[(hash * 7 + 3) % ANIMALS.length]
  const num = hash % 100
  const name = `${adj}${animal}${num}`
  localStorage.setItem('board_display_name', name)
  return name
}
