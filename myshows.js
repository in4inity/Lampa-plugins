(function () {
    'use strict';

    /**
     * MyShows Ghost v3: Zero-UI Edition
     * Данные берутся из параметров URL при установке плагина.
     * Формат ссылки: http://твой-хост/plugin.js?user=LOG&pass=PSW
     */
    const MyShowsGhost = {
        init: function () {
            // Извлекаем учетки из URL скрипта
            const script = document.currentScript || (function() {
                const scripts = document.getElementsByTagName('script');
                return scripts[scripts.length - 1];
            })();
            
            const url = new URL(script.src);
            const user = url.searchParams.get('user');
            const pass = url.searchParams.get('pass');

            // Если в ссылке есть данные - кэшируем их в память Lampa
            if (user && pass) {
                Lampa.Storage.set('ms_ghost_user', user);
                Lampa.Storage.set('ms_ghost_pass', pass);
            }

            this.listen();
            console.log('MyShows Ghost: Silent mode active.');
        },

        listen: function () {
            Lampa.Player.listener.follow('timeupdate', (data) => {
                if (data.duration > 0 && (data.time / data.duration) > 0.85) {
                    this.sync();
                }
            });
        },

        sync: function () {
            const video = Lampa.Player.data();
            const user = Lampa.Storage.get('ms_ghost_user');
            const pass = Lampa.Storage.get('ms_ghost_pass');

            if (!video || !video.season || !user || !pass) return;

            const syncId = `msg_v3_${video.id}_${video.season}_${video.episode}`;
            if (Lampa.Storage.get(syncId)) return;

            // Логика запроса к API (упрощенно для стабильности)
            const auth = btoa(user + ':' + pass);
            
            fetch('https://api.myshows.me/v2/rpc/', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + auth,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'show.GetByExternalId',
                    params: { id: video.id, source: 'tmdb' },
                    id: 1
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.result && data.result.id) {
                    return fetch('https://api.myshows.me/v2/rpc/', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Basic ' + auth,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'manage.CheckEpisode',
                            params: { id: data.result.id, season: video.season, episode: video.episode },
                            id: 2
                        })
                    });
                }
            })
            .then(() => {
                Lampa.Storage.set(syncId, true);
                Lampa.Noty.show('MyShows: Отмечено');
            })
            .catch(e => console.error('MyShows Ghost Error', e));
        }
    };

    MyShowsGhost.init();
})();
