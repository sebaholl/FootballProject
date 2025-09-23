// src/composables/useApi.js
import axios from 'axios'

// voláme přes dev proxy – /sm -> https://api.sportmonks.com
const BASE = '/sm/v3/football'
const TOKEN = import.meta.env.VITE_SPORTMONKS_TOKEN

export function useApi() {
  const http = axios.create({
    baseURL: BASE,
    params: { api_token: TOKEN },
  })

  const getStandingsBySeason = (seasonId, params = {}) =>
    http.get(`/standings/seasons/${seasonId}`, { params })

  const getTeamsBySeason = (seasonId, page = 1) =>
    http.get(`/teams/seasons/${seasonId}`, { params: { page } })

  // Původní fixtures (někde vrací 404, ale to byla ta starší verze)
  const getFixturesBySeason = (seasonId, page = 1) =>
    http.get(`/fixtures/seasons/${seasonId}`, { params: { page } })

  const getSquadByTeamSeason = (teamId, seasonId) =>
    http.get(`/squads/teams/${teamId}/seasons/${seasonId}`)

  return {
    getStandingsBySeason,
    getTeamsBySeason,
    getFixturesBySeason,
    getSquadByTeamSeason,
  }
}

