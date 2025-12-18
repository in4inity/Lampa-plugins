(function () {
    'use strict';

    // --- КОНФИГУРАЦИЯ (ИЗ ОРИГИНАЛА) ---
    const API_URL = 'https://api.myshows.me/v3/rpc/';
    const PROXY_URL = 'https://numparser.igorek1986.ru/myshows/auth'; // Используем прокси Игоря для обхода CORS
    const STORAGE_KEY = 'myshows_desktop_data';

    // Состояние
    let state = {
        token: Lampa.Storage.get(STORAGE_KEY, {}).token || '',
        login: Lampa.Storage.get(STORAGE_KEY, {}).login || '',
        current_video: null
    };

    // --- СЕТЕВОЙ СЛОЙ (КАК У ИГОРЯ) ---
    async function request(method, params = {}) {
        if (!state.token && method !== 'auth') return null;

        try {
            let headers = { 'Content-Type': 'application/json' };
            if (state.token) headers['Authorization'] = 'Bearer ' + state.token;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: 1
                })
            });
            const data = await response.json();
            return data.result;
        } catch (e) {
            console.error('MyShows RPC Error:', e);
            return null;
        }
    }

    // --- ЛОГИКА АВТОРИЗАЦИИ (ЧЕРЕЗ ПРОКСИ) ---
    function doAuth(login, password) {
        Lampa.Noty.show('MyShows: Авторизация...');
        
        // Используем $.ajax для совместимости с Lampa Network
        $.ajax({
            url: PROXY_URL,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ login: login, password: password }),
            success: function (data) {
                if (data && data.token) {
                    state.token = data.token;
                    state.login = login;
                    
                    Lampa.Storage.set(STORAGE_KEY, {
                        login: login,
                        token: data.token
                    });
                    
                    Lampa.Noty.show('MyShows: Успешный вход!');
                    Lampa.Modal.close();
                } else {
                    Lampa.Noty.show('MyShows: Ошибка (Нет токена)');
                }
            },
            error: function (xhr) {
                Lampa.Noty.show('MyShows: Ошибка сети/пароля');
            }
        });
    }

    // --- БИЗНЕС-ЛОГИКА: СОПОСТАВЛЕНИЕ (ИЗ ПЛАГИНА ИГОРЯ) ---
    async function findShowId(card) {
        // 1. Пробуем по IMDB (самый надежный метод Игоря)
        if (card.imdb_id) {
            let imdbClean = card.imdb_id.replace('tt', '');
            let res = await request('shows.GetByExternalId', { id: parseInt(imdbClean), source: 'imdb' });
            if (res && res.id) return res.id;
        }

        // 2. Пробуем по Kinopoisk
        if (card.kp_id) {
            let res = await request('shows.GetByExternalId', { id: parseInt(card.kp_id), source: 'kinopoisk' });
            if (res && res.id) return res.id;
        }

        // 3. Фолбек: Поиск по названию (как у Игоря для торрентов)
        let query = card.original_title || card.original_name || card.title;
        if (query) {
            let res = await request('shows.Search', { query: query });
            if (res && res.length > 0) return res[0].id;
        }

        return null;
    }

    async function checkEpisode(card, season, episode) {
        if (!state.token) return;

        let showId = await findShowId(card);
        if (!showId) return console.log('MyShows: Шоу не найдено');

        // Получаем список эпизодов
        let episodes = await request('shows.GetEpisodes', { showId: showId });
        if (episodes) {
            let target = episodes.find(e => e.season === parseInt(season) && e.episode === parseInt(episode));
            if (target) {
                await request('manage.CheckEpisode', { id: target.id, rating: 0 });
                Lampa.Noty.show('MyShows: Отмечено ' + season + 'x' + episode);
            }
        }
    }

    // --- СЛЕЖКА ЗА ПЛЕЕРОМ (LAMPA API) ---
    function startTracking() {
        Lampa.Player.listener.follow('time', function (data) {
            if (!state.token) return;

            // Логика 85% прогресса (как в оригинале)
            let progress = (data.time / data.duration) * 100;
            
            // Защита от дребезга (чтобы не отправлять 100 запросов)
            let uniqKey = data.item.id + '_' + data.item.season + '_' + data.item.episode;
            
            if (progress > 85 && state.current_video !== uniqKey) {
                state.current_video = uniqKey;
                
                // Проверяем, что это сериал
                if (data.item.season && data.item.episode) {
                    checkEpisode(data.item, data.item.season, data.item.episode);
                }
            }
        });
    }

    // --- UI: НАСТРОЙКИ (ТВОЙ РАБОЧИЙ ВАРИАНТ) ---
    function showMyShowsSettings() {
        const modal = $('<div><div class="settings-list"></div></div>');
        
        // Статус
        let statusColor = state.token ? '#4caf50' : '#f44336';
        let statusText = state.token ? 'Авторизован (' + state.login + ')' : 'Не авторизован';

        const items = [
            {
                title: 'Статус',
                subtitle: `<span style="color: ${statusColor}">${statusText}</span>`,
                name: 'status'
            },
            {
                title: 'Логин',
                subtitle: 'Ввод email',
                name: 'login'
            },
            {
                title: 'Пароль',
                subtitle: 'Ввод пароля',
                name: 'password'
            },
            {
                title: 'Войти',
                subtitle: 'Получить токен',
                name: 'auth'
            }
        ];

        let tempLogin = state.login;
        let tempPass = '';

        items.forEach(item => {
            const el = $(`<div class="settings-item selector">
                <div class="settings-item__title">${item.title}</div>
                <div class="settings-item__subtitle">${item.subtitle}</div>
            </div>`);

            el.on('hover:enter', () => {
                if (item.name === 'login') {
                    Lampa.Input.edit({ value: tempLogin, title: 'Логин' }, (v) => { 
                        tempLogin = v; 
                        el.find('.settings-item__subtitle').text(v);
                    });
                }
                if (item.name === 'password') {
                    Lampa.Input.edit({ value: '', title: 'Пароль', type: 'password' }, (v) => { 
                        tempPass = v; 
                        el.find('.settings-item__subtitle').text('********');
                    });
                }
                if (item.name === 'auth') {
                    if (tempLogin && tempPass) doAuth(tempLogin, tempPass);
                    else Lampa.Noty.show('Введите логин и пароль');
                }
            });
            modal.find('.settings-list').append(el);
        });

        Lampa.Modal.open({
            title: 'MyShows Pro',
            html: modal,
            size: 'medium',
            onBack: () => {
                Lampa.Modal.close();
                if (Lampa.Controller.toggle) Lampa.Controller.toggle('settings');
            }
        });
    }

    // --- ИНИЦИАЛИЗАЦИЯ (ПРЯМАЯ ИНЪЕКЦИЯ) ---
    function init() {
        if (window.myshows_started) return;
        window.myshows_started = true;

        console.log('MyShows: Logic Loaded');
        startTracking(); // Запускаем слежку за плеером

        // Внедрение кнопки (Твой метод)
        Lampa.Listener.follow('settings', (e) => {
            if (e.type === 'open' && e.name === 'main') {
                setTimeout(() => {
                    const body = e.body || $('.settings-main'); 
                    
                    if ($('.selector[data-name="myshows"]').length === 0) {
                        const btn = $(`<div class="settings-item selector" data-name="myshows">
                            <div class="settings-item__icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                            </div>
                            <div class="settings-item__title">MyShows</div>
                            <div class="settings-item__subtitle">Синхронизация</div>
                        </div>`);

                        btn.on('hover:enter', () => {
                            showMyShowsSettings();
                        });

                        body.find('.scroll__content').append(btn);
                        
                        // Рефреш фокуса (важно для пульта)
                        if (Lampa.Controller.enabled().name === 'settings') {
                            // Lampa.Controller.toggle('settings'); // Иногда вызывает мерцание, но нужно для обновления навигации
                        }
                    }
                }, 200); // Чуть увеличил тайм-аут для надежности
            }
        });
    }

    // Ожидание
    const wait = setInterval(() => {
        if (typeof Lampa !== 'undefined' && Lampa.Settings && Lampa.Player) {
            clearInterval(wait);
            init();
        }
    }, 200);
})();
