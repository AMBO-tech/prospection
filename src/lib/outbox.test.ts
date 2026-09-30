import { beforeEach, describe, expect, it } from 'vitest'
import { enqueue, flush, loadOutbox, removeFromOutbox, type KeyValueStore } from './outbox'

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

const item = (clientId: string) => ({
  clientId,
  answers: { shop_name: clientId, segment: 'textile' as const },
  savedAt: '2026-09-30T10:00:00.000Z',
})

const kindError = (kind: string) => Object.assign(new Error(kind), { kind })

let store: MemoryStore
beforeEach(() => {
  store = new MemoryStore()
})

describe('outbox storage', () => {
  it('starts empty and persists enqueued items in order', () => {
    expect(loadOutbox(store)).toEqual([])
    enqueue(item('a'), store)
    enqueue(item('b'), store)
    expect(loadOutbox(store).map((i) => i.clientId)).toEqual(['a', 'b'])
  })

  it('does not enqueue the same clientId twice', () => {
    enqueue(item('a'), store)
    enqueue(item('a'), store)
    expect(loadOutbox(store)).toHaveLength(1)
  })

  it('removes an item by clientId', () => {
    enqueue(item('a'), store)
    enqueue(item('b'), store)
    removeFromOutbox('a', store)
    expect(loadOutbox(store).map((i) => i.clientId)).toEqual(['b'])
  })

  it('survives corrupted storage', () => {
    store.setItem('prospection.outbox.v1', '{not json')
    expect(loadOutbox(store)).toEqual([])
  })
})

describe('flush', () => {
  it('sends everything and empties the outbox', async () => {
    enqueue(item('a'), store)
    enqueue(item('b'), store)
    const sent: string[] = []
    const result = await flush(async (i) => void sent.push(i.clientId), store)
    expect(sent).toEqual(['a', 'b'])
    expect(result).toMatchObject({ sent: 2, remaining: 0, authError: false })
    expect(loadOutbox(store)).toEqual([])
  })

  it('stops at the first network error and keeps the rest', async () => {
    enqueue(item('a'), store)
    enqueue(item('b'), store)
    const result = await flush(async () => {
      throw kindError('network')
    }, store)
    expect(result).toMatchObject({ sent: 0, remaining: 2, authError: false })
    expect(loadOutbox(store)).toHaveLength(2)
  })

  it('stops and flags an invalid access code', async () => {
    enqueue(item('a'), store)
    const result = await flush(async () => {
      throw kindError('auth')
    }, store)
    expect(result.authError).toBe(true)
    expect(loadOutbox(store)).toHaveLength(1)
  })

  it('keeps a rejected item with its error but still sends the others', async () => {
    enqueue(item('bad'), store)
    enqueue(item('good'), store)
    const sent: string[] = []
    const result = await flush(async (i) => {
      if (i.clientId === 'bad') throw kindError('server')
      sent.push(i.clientId)
    }, store)
    expect(sent).toEqual(['good'])
    expect(result).toMatchObject({ sent: 1, remaining: 1 })
    expect(loadOutbox(store)[0]).toMatchObject({ clientId: 'bad', lastError: 'server' })
  })
})
