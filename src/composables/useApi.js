// src/composables/useApi.js
import axios from 'axios'

const BASE = import.meta.env.VITE_SPORTMONKS_BASE; // /sm/v3
const TOKEN = import.meta.env.VITE_SPORTMONKS_TOKEN;

export function useApi() {
  const http = axios.create({
    baseURL: BASE.endsWith('/') ? BASE : BASE + '/',
    params: { api_token: TOKEN },
  });

  const get = (path, params = {}) => {
    const url = path.startsWith('/') ? path.slice(1) : path;
    console.log('[SM] CALL ->', (BASE.endsWith('/') ? BASE : BASE + '/') + url, params);
    return http.get(url, { params }).then((res) => res.data);
  };

  // standings & teams — beze změny
  const getStandingsBySeason = (seasonId, params = {}) =>
    get(`football/standings/seasons/${seasonId}`, params);

  const getTeamsBySeason = (seasonId, params = {}) =>
    get(`football/teams/seasons/${seasonId}`, params);

  // ✅ Team schedule – bez include, protože API ho nepodporuje
const getTeamSchedule = async (teamId, seasonId, params = {}) => {
  return await get(`football/schedules/teams/${teamId}`);
};


  // (zůstává, pokud ho někdy aktivují) – použijeme jen když endpoint existuje
  const getFixturesBySeason = async (seasonId, params = {}) => {
    return get('football/fixtures', {
      seasons: seasonId,
      include:
        params.include ??
        'participants;team;league;round;state;scores',
      page: params.page ?? 1,
      per_page: params.per_page ?? 200,
    });
  };

  const getSquadByTeamSeason = (teamId, seasonId, params = {}) =>
    get(`football/squads/teams/${teamId}/seasons/${seasonId}`, params);

  return {
    get,
    getStandingsBySeason,
    getTeamsBySeason,
    getFixturesBySeason, // necháme tu – třeba ho časem budeš moct použít
    getTeamSchedule,     // ⬅️ budeme používat teď
    getSquadByTeamSeason,
  };
}
