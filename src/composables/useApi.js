// src/composables/useApi.js
import axios from 'axios'

const BASE = import.meta.env.VITE_SPORTMONKS_BASE // např. /sm/v3
const TOKEN = import.meta.env.VITE_SPORTMONKS_TOKEN

export function useApi() {
  const http = axios.create({
    baseURL: BASE.endsWith('/') ? BASE : BASE + '/',
    params: { api_token: TOKEN },
  })

  // 🔹 Universal GET helper
  const get = (path, params = {}) => {
    const url = path.startsWith('/') ? path.slice(1) : path
    console.log('[SM] CALL ->', (BASE.endsWith('/') ? BASE : BASE + '/') + url, params)
    return http.get(url, { params }).then((res) => res.data)
  }

  const getStandingsBySeason = (seasonId, params = {}) =>
    get(`football/standings/seasons/${seasonId}`, params)


  const getTeamsBySeason = (seasonId, params = {}) =>
    get(`football/teams/seasons/${seasonId}`, params)


const getTeamSchedule = async (teamId, seasonId) => {
  // preferuj sezonní tvar, když máme seasonId
  if (seasonId) {
    return await get(`football/schedules/seasons/${seasonId}/teams/${teamId}`);
  }
  // fallback bez seasonId
  return await get(`football/schedules/teams/${teamId}`);
};


  // (volitelně zachováno pro budoucnost — zatím SportMonks v3 fixtures endpoint nevrací nic)
  const getFixturesBySeason = async (seasonId, params = {}) => {
    return get('football/fixtures', {
      seasons: seasonId,
      include:
        params.include ??
        'participants;team;league;round;state;scores',
      page: params.page ?? 1,
      per_page: params.per_page ?? 200,
    })
  }


  const getSquadByTeamSeason = (teamId, seasonId, params = {}) =>
    get(`football/squads/teams/${teamId}/seasons/${seasonId}`, params)

  return {
    get,
    getStandingsBySeason,
    getTeamsBySeason,
    getTeamSchedule, // ✅ aktuální endpoint pro zápasy
    getFixturesBySeason, // (ponechán jako fallback)
    getSquadByTeamSeason,
  }
}

