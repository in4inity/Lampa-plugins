(function () {
    'use strict';

    // --- Configuration & State ---
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'myshows_lampa_pro';
    const API_URL = 'https://api.myshows.me/v2/rpc/';
    
    let storage = {
        get: (key, def) => Lampa.Storage.get('myshows_' + key, def),
        set: (key, val) => Lampa.Storage.set('myshows_' + key, val)
    };

    let userConfig = {
        token: storage.get('token', ''),
        threshold: 0.8 // 80%
    };

    let currentSession = {
        myshows_id: null,
        episode_id: null,
        is_marked: false,
        last_id: null
    };

    // --- MyShows RPC Helper ---
    async function request(method, params = {}) {
        if (!userConfig.token) return null;
        
        const call = async (retries = 0) => {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + userConfig.token
                    },
                    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
                });
                const data = await response.json();
                return data.result || null;
            } catch (e) {
                if (retries < 3) {
                    await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
                    return call(retries + 1);
                }
                return null;
            }
        };
        return call();
    };

    /**
     * Логика сопоставления "как у Игоря":
     * Используем внешние ID (TMDB/IMDB) для получения ID MyShows
     */
    async function resolveMyShowsDetails(item) {
        let externalId = item.tmdb_id || item.id;
        let type = item.number_of_seasons ? 'show' : (item.name ? 'show' : 'movie');

        // Для сериалов ищем соответствие
        const show = await request('shows.getById', { 
            externalIds: { tmdb: externalId } 
        });

        if (show && show.id) {
            currentSession.myshows_id = show.id;
            
            // Сразу пытаемся найти ID конкретного эпизода
            const episodes = await request('shows.getEpisodes', { id: show.id });
            if (episodes && item.season && item.episode) {
                const target = episodes.find(e => e.season === item.season && e.episode === item.episode);
                if (target) currentSession.episode_id = target.id;
            }
        }
    }

    // --- Main Tracking ---
    function startTracking() {
        Lampa.Player.listener.follow('time', async (data) => {
            // Сброс сессии при смене видео
            if (currentSession.last_id !== data.item.id) {
                currentSession.last_id = data.item.id;
                currentSession.is_marked = false;
                currentSession.myshows_id = null;
                currentSession.episode_id = null;
                
                await resolveMyShowsDetails(data.item);
            }

            // Проверка порога 80%
            if (data.duration > 0 && !currentSession.is_marked && currentSession.episode_id) {
                const progress = data.time / data.duration;
                if (progress >= userConfig.threshold) {
                    currentSession.is_marked = true;
                    markWatched();
                }
            }
        });
    }

    async function markWatched() {
        if (!currentSession.episode_id) return;

        const result = await request('manage.checkEpisode', { 
            id: currentSession.episode_id,
            rating: 0 // Просто отмечаем без оценки
        });

        if (result !== null) {
            Lampa.Noty.show('MyShows: Серия отмечена (80%)');
        }
    }

    // --- Init ---
    function init() {
        if (!userConfig.token) {
            console.log('MyShows Pro: No token found');
            return;
        }
        startTracking();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', (e) => { if (e.type == 'ready') init(); });

})();
