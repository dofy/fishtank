import type { BodyShape } from '../core/types'
import type { Agent, DecorNode, SceneView } from './scene'
import { hashString } from './shape'

export interface SceneryVisit {
  kind: 'rest' | 'arch' | 'school'
  targetId: string
  age: number
  stage: 'approach' | 'pause' | 'pass'
  direction: 1 | -1
}

export function interruptScenery(a: Agent): void {
  delete a.scenery
  a.sceneryCooldown = Math.max(a.sceneryCooldown ?? 0, 5)
}

export function pufferAmount(a: Agent, reducedMotion = false): number {
  if (reducedMotion || a.species.body.silhouette !== 'spiky-puffer' || a.withdrawal) return 0
  const remaining = Math.max(0, a.puffTimer ?? 0)
  return Math.min(1, Math.max(0, (1.8 - remaining) / 0.12), remaining / 0.6)
}

/** LCD samples four opaque silhouettes rather than scaling the pixel grid. */
export function pufferLevel(a: Agent, reducedMotion = false): number {
  return Math.round(pufferAmount(a, reducedMotion) * 3)
}

export function pufferBody(body: BodyShape, level: number): BodyShape {
  return body.silhouette === 'spiky-puffer' && level > 0
    ? { ...body, depth: body.depth * (1 + Math.min(3, level) / 3 * 0.28) } : body
}

/** The arch frame briefly moves in front of passing fish, leaving the hole open. */
export function foregroundDecor(view: Pick<SceneView, 'agents'>): Set<string> {
  return new Set(view.agents.filter(a => a.scenery?.kind === 'arch' && !a.withdrawal)
    .map(a => a.scenery!.targetId))
}

function available(a: Agent): boolean {
  return !a.dropping && !a.withdrawal && (a.scaredTimer ?? 0) <= 0 && (a.shockedTimer ?? 0) <= 0 && (a.dischargingTimer ?? 0) <= 0
}

/** Visual-only behavior. Called after food and all player-triggered interactions. */
export function updateScenery(
  a: Agent, agents: readonly Agent[], decors: readonly DecorNode[], width: number, height: number,
  dt: number, time: number, reducedMotion = false,
): boolean {
  if (reducedMotion || !available(a)) { interruptScenery(a); return false }
  const minX = Math.min(width / 2, Math.max(36, a.species.body.length * 4.2 * a.scale / 2 + 10))
  const minY = 28, maxY = Math.max(48, height - 44)
  const clampX = (x: number): number => Math.min(width - minX, Math.max(minX, x))
  const clampY = (y: number): number => Math.min(maxY, Math.max(minY, y))
  if (!a.scenery) {
    if ((a.sceneryCooldown ?? 0) > 0) return false
    const seed = hashString(a.fish.uid) + (a.sceneryCount ?? 0)
    const form = a.species.body.form ?? 'fish'
    const kelp = decors.find(d => d.item.id === 'kelp' && !d.active)
    const arch = decors.find(d => d.item.id === 'arch' && !d.active)
    const partner = form === 'fish' ? agents.find(other => other !== a &&
      other.fish.speciesId === a.fish.speciesId && other.fish.uid < a.fish.uid &&
      available(other) && !other.scenery && Math.hypot(other.x - a.x, other.y - a.y) < 220) : undefined
    const small = form === 'fish' && a.species.body.length <= 14 && a.species.body.depth < 0.72
    if (form === 'seahorse' && kelp) a.scenery = { kind: 'rest', targetId: kelp.item.id, age: 0, stage: 'approach', direction: a.dir }
    else if (partner && (!arch || seed % 2 === 0)) a.scenery = { kind: 'school', targetId: partner.fish.uid, age: 0, stage: 'approach', direction: partner.dir }
    else if (small && arch && Math.abs(arch.x - a.x) < Math.min(width * 0.6, 340)) a.scenery = { kind: 'arch', targetId: arch.item.id, age: 0, stage: 'approach', direction: a.x < arch.x ? 1 : -1 }
    else { a.sceneryCooldown = 4 + seed % 5; return false }
    a.sceneryCount = (a.sceneryCount ?? 0) + 1
  }
  const visit = a.scenery
  visit.age += dt
  if (visit.age > (visit.kind === 'rest' ? 18 : 12)) { interruptScenery(a); return false }
  let x: number, y: number, speed = Math.max(22, a.speed * 1.35)
  if (visit.kind === 'school') {
    const partner = agents.find(other => other.fish.uid === visit.targetId)
    if (!partner || !available(partner) || partner.scenery || visit.age > 7) { interruptScenery(a); return false }
    a.dir = partner.dir
    const distance = (a.species.body.length * 4.2 * a.scale) * 0.85 + 15
    x = clampX(partner.x - partner.dir * distance)
    y = clampY(partner.y + (hashString(a.fish.uid) % 2 ? 12 : -12))
    speed = Math.min(a.speed * 2, Math.max(a.speed, Math.hypot(x - a.x, y - a.y)))
  } else {
    const decor = decors.find(d => d.item.id === visit.targetId && !d.active)
    if (!decor) { interruptScenery(a); return false }
    if (visit.kind === 'rest') {
      x = clampX(decor.x + visit.direction * decor.item.width * 0.2)
      y = clampY(height - 14 - decor.item.height * 0.43)
      if (Math.hypot(a.x - x, a.y - y) < 6) visit.stage = 'pause'
      if (visit.stage === 'pause') {
        a.x += (x - a.x) * Math.min(1, dt * 2)
        a.y += (y - a.y) * Math.min(1, dt * 2) + Math.sin(time + a.phase) * dt * 1.5
        a.tilt = Math.sin(time * 0.8 + a.phase) * 0.025
        a.phase += dt * 0.25
        if (visit.age > 11) { interruptScenery(a); a.dir = visit.direction }
        return true
      }
    } else {
      y = clampY(height - 14 - decor.item.height * 0.30)
      x = clampX(decor.x + (visit.stage === 'approach' ? -1 : 1) * visit.direction * decor.item.width * 0.67)
      if (Math.hypot(a.x - x, a.y - y) < 5) {
        if (visit.stage === 'approach') visit.stage = 'pass'
        else { interruptScenery(a); a.baseDepth = y / height; return false }
      }
    }
  }
  const dx = x - a.x, dy = y - a.y, distance = Math.hypot(dx, dy)
  if (Math.abs(dx) > 3 && visit.kind !== 'school') a.dir = dx > 0 ? 1 : -1
  const step = Math.min(distance, speed * dt)
  if (distance > 0) { a.x = clampX(a.x + dx / distance * step); a.y = clampY(a.y + dy / distance * step) }
  a.phase += dt * 0.9
  a.tilt = Math.max(-0.14, Math.min(0.14, dy / (Math.abs(dx) + 20) * 0.08))
  return true
}
