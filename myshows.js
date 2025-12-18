(function () {
    'use strict';

    // Конфигурация и прокси
    const PROXY_URL = 'https://numparser.igorek1986.ru/myshows/auth';
    const API_URL = 'https://api.myshows.me/v3/rpc/';
    const STORAGE_KEY = 'myshows_desktop_data';

    let state = {
        token: Lampa.Storage.get(STORAGE_KEY, {}).token || '',
        login: Lampa.Storage.get(STORAGE_KEY, {}).login || '',
        current_video: null
    };

    // --- РЕГИСТРАЦИЯ КОМПОНЕНТА (Как у Игоря) ---
    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var items = [];
        var active = 0;

        this.create = function () {
            this.activity.loader(true);
            
            // Отрисовка полей
            var html = $('<div class="settings-list"></div>');
            
            var field_login = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title">Логин (Email)</div>
                    <div class="settings-item__subtitle">${state.login || 'Не указан'}</div>
                </div>
            `);

            var field_pass = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title">Пароль</div>
                    <div class="settings-item__subtitle">Нажмите, чтобы ввести пароль и войти</div>
                </div>
            `);

            var status_info = $(`
                <div class="settings-item">
                    <div class="settings-item__title">Статус</div>
                    <div class="settings-item__subtitle">${state.token ? 'Авторизован' : 'Требуется вход'}</div>
                </div>
            `);

            field_login.on('hover:enter', () => {
                Lampa.Input.edit({
                    value: state.login,
                    title: 'Введите Email на MyShows'
                }, (value) => {
                    if (value) {
                        state.login = value;
                        field_login.find('.settings-item__subtitle').text(value);
                    }
                });
            });

            field_pass.on('hover:enter', () => {
                Lampa.Input.edit({
                    value: '',
                    title: 'Введите пароль'
                }, (value) => {
                    if (value && state.login) {
                        Lampa.Noty.show('Авторизация...');
                        $.ajax({
                            url: PROXY_URL,
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({ login: state.login, password: value }),
                            success: function (data) {
                                if (data && data.token) {
                                    state.token = data.token;
                                    Lampa.Storage.set(STORAGE_KEY, { login: state.login, token: data.token });
                                    Lampa.Noty.show('Успешно подключено!');
                                    status_info.find('.settings-item__subtitle').text('Авторизован');
                                } else {
                                    Lampa.Noty.show('Ошибка: Проверьте данные');
                                }
                            },
                            error: function() { Lampa.Noty.show('Ошибка сети'); }
                        });
                    } else {
                        Lampa.Noty.show('Сначала введите логин');
                    }
                });
            });

            html.append(status_info);
            html.append(field_login);
            html.append(field_pass);

            scroll.append(html);
            this.activity.loader(false);
            return scroll.render();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    // --- ЛОГИКА API ---
    async function request(method, params = {}) {
        if (!state.token) return null;
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + state.token
                },
                body: JSON.stringify({ jsonrpc: '2.0', method: method, params: params, id: 1 })
            });
            const data = await res.json();
            return data.result;
        } catch (e) { return null; }
    }

    async function markEpisode(data) {
        if (!state.token || !data.item.season || !data.item.episode) return;
        let query = data.item.original_title || data.item.title;
        let shows = await request('shows.Search', { query: query });
        if (shows && shows.length > 0) {
            let episodes = await request('shows.GetEpisodes', { showId: shows[0].id });
            if (episodes) {
                let ep = episodes.find(e => e.season == data.item.season && e.episode == data.item.episode);
                if (ep) {
                    await request('manage.CheckEpisode', { id: ep.id });
                    Lampa.Noty.show('MyShows: Отмечено ' + data.item.season + 'x' + data.item.episode);
                }
            }
        }
    }

    // --- ИНИЦИАЛИЗАЦИЯ (Метод Игоря) ---
    function init() {
        if (window.myshows_loaded) return;
        window.myshows_loaded = true;

        // Регистрируем компонент страницы
        Lampa.Component.add('myshows_page', Component);

        // Добавляем пункт в настройки (копируем структуру Игоря)
        Lampa.Settings.create({
            title: 'MyShows Pro',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white"/></svg>',
            component: 'myshows_page',
            search: false
        });

        // Следим за плеером
        Lampa.Player.listener.follow('time', function (data) {
            let progress = (data.time / data.duration) * 100;
            let key = data.item.id + '_' + data.item.season + '_' + data.item.episode;
            if (progress > 85 && state.current_video !== key) {
                state.current_video = key;
                markEpisode(data);
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') init();
    });
})();
