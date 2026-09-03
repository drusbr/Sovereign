import { createClient } from './client'
import { hydrateGameState, type GameState } from '@/lib/gameState'

export interface CampaignRecord {
  id: string
  user_id: string | null
  guest_session_id: string | null
  country_id: string
  country_name: string
  player_name: string
  player_title: string
  turn: number
  game_date: string
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  outcome: string | null
  created_at: string
  updated_at: string
}

// Create a new campaign
export async function createCampaign(
  userId: string,
  initialState: GameState
): Promise<{ campaign: CampaignRecord | null; error: string | null }> {
  const supabase = createClient()

  // Check campaign limit
  const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  if ((count ?? 0) >= 3) {
    return {
      campaign: null,
      error: 'You have reached the maximum of 3 active campaigns. Please abandon one to start a new campaign.'
    }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      country_id: initialState.countryName.toLowerCase(),
      country_name: initialState.countryName,
      player_name: initialState.playerName,
      player_title: initialState.playerTitle,
      turn: initialState.turn,
      game_date: initialState.date,
      status: 'active'
    })
    .select()
    .single()

  if (campaignError) {
    return { campaign: null, error: campaignError.message }
  }

  // Save initial game state
  await saveGameState(campaign.id, initialState)

  return { campaign, error: null }
}

// Auto-save game state after each turn
export async function saveGameState(
  campaignId: string,
  state: GameState
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error: saveError } = await supabase
    .from('game_saves')
    .upsert({
      campaign_id: campaignId,
      turn: state.turn,
      game_state: state as unknown as Record<string, unknown>
    }, {
      onConflict: 'campaign_id,turn'
    })

  if (saveError) {
    console.error('Auto-save failed:', saveError)
    return { error: saveError.message }
  }

  // Update campaign metadata
  await supabase
    .from('campaigns')
    .update({
      turn: state.turn,
      game_date: state.date,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)

  return { error: null }
}

// Load the most recent game state for a campaign
export async function loadGameState(
  campaignId: string
): Promise<{ state: GameState | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('game_saves')
    .select('game_state')
    .eq('campaign_id', campaignId)
    .order('turn', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return { state: null, error: error.message }
  }

  return { state: hydrateGameState(data.game_state as Partial<GameState>), error: null }
}

// Get all campaigns for a user
export async function getUserCampaigns(
  userId: string
): Promise<{ campaigns: CampaignRecord[]; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  if (error) {
    return { campaigns: [], error: error.message }
  }

  return { campaigns: data ?? [], error: null }
}

// Abandon a campaign
export async function abandonCampaign(
  campaignId: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'abandoned' })
    .eq('id', campaignId)

  return { error: error?.message ?? null }
}

// Record turn history
export async function recordTurnHistory(
  campaignId: string,
  turn: number,
  orders: string,
  narrative: string,
  approvalChange: number,
  securityChange: number,
  keyEvents: string[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('turn_history').insert({
    campaign_id: campaignId,
    turn,
    orders_issued: orders,
    narrative_summary: narrative.slice(0, 500),
    approval_change: approvalChange,
    security_change: securityChange,
    key_events: keyEvents
  })
}
