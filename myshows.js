(function () {
    'use strict';

    // Константы и уникальный ключ хранилища, чтобы не пересекаться с оригиналом
    const MYSHOWS_API = 'https://api.myshows.me/v3/rpc/';
    const STORAGE_KEY = 'myshows_uncensored_fix';
    const APP_ID = 'lampa_uncensored_plugin';

    function MyShowsUncensored() {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="settings-list"></div>');
        var state = Lampa.Storage.get(STORAGE_KEY, { token: '', login: '', method: 'direct' });

        // Список прокси на случай, если прямой запрос блокируется AdGuard или CORS
        const proxies = {
            'direct': MYSHOWS_API,
            'allorigins': 'https://api.allorigins.win/raw?url=' + encodeURIComponent(MYSHOWS_API),
            'corsproxy': 'https://corsproxy.io/?' + encodeURIComponent(MYSHOWS_API)
        };

        this.create = function () {
            var _this = this;

            var statusStr = state.token ? 'Статус: <span style="color: #4caf50">Авторизован (' + state.login + ')</span>' : 'Статус: <span style="color: #ff5252">Не подключено</span>';

            var info = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title">Профиль MyShows</div>
                    <div class="settings-item__subtitle">${statusStr}</div>
                </div>
            `);

            var methodBtn = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title">Метод запроса</div>
                    <div class="settings-item__subtitle">Текущий: ${state.method.toUpperCase()} (нажми для смены)</div>
                </div>
            `);

            var loginBtn = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title">Вход в аккаунт</div>
                    <div class="settings-item__subtitle">Привязать аккаунт MyShows.me</div>
                </div>
            `);

            var logoutBtn = $(`
                <div class="settings-item selector">
                    <div class="settings-item__title" style="color: #ff5252">Выйти</div>
                    <div class="settings-item__subtitle">Сбросить токен и данные</div>
                </div>
            `);

            methodBtn.on('hover:enter', function () {
                const keys = Object.keys(proxies);
                let nextIdx = (keys.indexOf(state.method) + 1) % keys.length;
                state.method = keys[nextIdx];
                Lampa.Storage.set(STORAGE_KEY, state);
                Lampa.Noty.show('Метод изменен на: ' + state.method);
                _this.updateLabels(methodBtn);
            });

            loginBtn.on('hover:enter', function () {
                Lampa.Input.edit({ title: 'Email', value: state.login }, function (email) {
                    if (email) {
                        Lampa.Input.edit({ title: 'Пароль', value: '', free: true }, function (pass) {
                            if (pass) _this.performLogin(email, pass);
                        });
                    }
                });
            });

            logoutBtn.on('hover:enter', function () {
                state.token = '';
                state.login = '';
                Lampa.Storage.set(STORAGE_KEY, state);
                Lampa.Noty.show('Данные удалены');
                Lampa.Settings.update();
            });

            html.append(info);
            html.append(methodBtn);
            html.append(loginBtn);
            if (state.token) html.append(logoutBtn);

            return scroll.render();
        };

        this.updateLabels = function(el) {
            el.find('.settings-item__subtitle').text('Текущий: ' + state.method.toUpperCase());
        };

        this.performLogin = function (email, pass) {
            Lampa.Noty.show('Авторизация через ' + state.method + '...');
            
            var payload = {
                jsonrpc: "2.0",
                method: "auth.login",
                params: { login: email, password: pass },
                id: Math.floor(Math.random() * 1000)
            };

            fetch(proxies[state.method], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (!response.ok) throw new Error('HTTP Error ' + response.status);
                return response.json();
            })
            .then(json => {
                if (json.result && json.result.token) {
                    state.token = json.result.token;
                    state.login = email;
                    Lampa.Storage.set(STORAGE_KEY, state);
                    Lampa.Noty.show('Успешно! MyShows подключен.');
                    Lampa.Settings.update();
                } else if (json.error) {
                    throw new Error(json.error.message || 'Ошибка API');
                } else {
                    throw new Error('Неизвестный формат ответа');
                }
            })
            .catch(err => {
                Lampa.Noty.show('Ошибка: ' + err.message);
                console.error('[MyShows Fix Error]', err);
            });
        };

        this.render = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); html.remove(); };
    }

    // Инициализация
    function init() {
        if (window.myshows_uncensored_init) return;
        window.myshows_uncensored_init = true;

        Lampa.Component.add('myshows_uncensored', MyShowsUncensored);

        Lampa.Settings.create({
            title: 'MyShows Uncensored',
            icon: '<svg height="32" viewBox="0 0 32 32" width="32" xmlns="http://www.w3.org/2000/svg"><path d="m16 2c-7.73 0-14 6.27-14 14s6.27 14 14 14 14-6.27 14-14-6.27-14-14-14zm0 26c-6.62 0-12-5.38-12-12s5.38-12 12-12 12 5.38 12 12-5.38 12-12 12z" fill="#fff"/><path d="m16 7c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" fill="#fff"/></svg>',
            component: 'myshows_uncensored',
            search: false
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
