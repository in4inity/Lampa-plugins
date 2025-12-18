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
                    
                    // Обновляем статус в меню (перерисовываем настройки)
                    Lampa.Settings.update(); 
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

    // --- UI: НАСТРОЙКИ (ИСПРАВЛЕННАЯ СВЯЗКА) ---
    function showMyShowsSettings() {
        // Создаем страницу в реестре настроек Lampa
        Lampa.Settings.create('myshows_page', {
            title: 'MyShows Pro',
            onBack: function() {
                Lampa.Settings.main('main');
            }
        });

        // Наполняем полями
        Lampa.Settings.add('myshows_page', [
            {
                title: 'Статус',
                name: 'ms_status',
                type: 'static',
                content: state.token ? '<span style="color:#4caf50">Авторизован</span>' : 'Необходим вход'
            },
            {
                title: 'Логин',
                name: 'ms_login',
                type: 'input',
                value: state.login,
                placeholder: 'Email',
                onChange: (v) => { state.login = v; }
            },
            {
                title: 'Пароль',
                name: 'ms_password',
                type: 'input',
                value: '',
                placeholder: 'Пароль',
                onChange: (v) => { 
                    if (state.login && v) doAuth(state.login, v);
                }
            }
        ]);

        // Открываем созданную страницу
        Lampa.Settings.main('myshows_page');
    }

    // --- ИНИЦИАЛИЗАЦИЯ (MUTATION OBSERVER) ---
    function init() {
        if (window.myshows_started) return;
        window.myshows_started = true;

        console.log('MyShows: Observer Started');
        Lampa.Noty.show('Скрипт MyShows активен'); // ПРОВЕРКА ЗАГРУЗКИ
        
        startTracking();

        // Тяжелая артиллерия: следим за DOM, чтобы поймать отрисовку настроек
        var observer = new MutationObserver(function(mutations) {
            // Ищем контейнер настроек в любой модификации
            var settings = $('.settings__content, .settings-main');
            
            if (settings.length > 0) {
                // Если контейнер есть, а нашей кнопки нет
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

                    // Вставляем ВНАЧАЛО списка, чтобы точно увидеть
                    settings.find('.scroll__content').prepend(btn);
                    console.log('MyShows: Button injected via Observer');
                }
            }
        });

        // Начинаем следить за всем телом документа
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Ожидание
    const wait = setInterval(() => {
        if (typeof Lampa !== 'undefined' && Lampa.Settings && Lampa.Player && window.$) {
            clearInterval(wait);
            init();
        }
    }, 200);
})();
