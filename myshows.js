(function () {
    'use strict';

    /**
     * MyShows Pro for Lampa
     * Смена стратегии: Полный функционал API и глубокая интеграция.
     */

    const pluginId = 'myshows_pro_v2';
    const pluginName = 'MyShows Pro';
    const apiHost = 'https://api.myshows.me/v2';
    
    // Хранилище данных в памяти (можно заменить на Firestore позже)
    let userData = {
        token: localStorage.getItem('myshows_token'),
        refresh_token: localStorage.getItem('myshows_refresh_token')
    };

    /**
     * Основной компонент интерфейса
     */
    Lampa.Component.add(pluginId, function (object) {
        let network = new Lampa.Reguest();
        let scroll = new Lampa.Scroll({mask: true, over: true});
        let items = [];
        let html = $('<div class="myshows-root"></div>');

        this.create = function () {
            this.activity.loader(true);
            
            if (!userData.token) {
                this.renderLogin();
            } else {
                this.loadShows();
            }
        };

        // Отрисовка экрана входа
        this.renderLogin = function () {
            let _this = this;
            let loginHtml = $(`
                <div class="myshows-login" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center;">
                    <img src="https://myshows.me/shared/img/fe/logo-main.svg" style="width: 200px; margin-bottom: 20px;" onerror="this.src='https://via.placeholder.com/200x50?text=MyShows'"/>
                    <h2 style="margin-bottom: 30px;">Синхронизируйте свои сериалы</h2>
                    <div class="selector button" style="padding: 15px 40px; background: #ea3e3e; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        Авторизоваться через код
                    </div>
                    <p style="margin-top: 20px; color: #888; font-size: 0.9em;">Плагин запросит код устройства для доступа к вашему профилю</p>
                </div>
            `);

            loginHtml.find('.button').on('hover:enter', () => {
                _this.startDeviceAuth();
            });

            scroll.append(loginHtml);
            this.activity.loader(false);
            html.append(scroll.render());
        };

        // Заглушка логики авторизации (Device Flow)
        this.startDeviceAuth = function () {
            Lampa.Noty.show("Функция авторизации в разработке. Токен не найден.");
            console.log("Starting Device Auth Flow...");
        };

        // Загрузка сериалов пользователя
        this.loadShows = function () {
            // Здесь будет fetch к api.myshows.me/v2/user/shows/
            Lampa.Noty.show("Загрузка ваших списков...");
            this.activity.loader(false);
        };

        this.render = function () { return html; };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    });

    /**
     * Инъекция в боковое меню
     */
    function injectToMenu() {
        const menu = Lampa.Menu.list();
        if (!menu.some(i => i.id === pluginId)) {
            const index = menu.findIndex(i => i.id === 'settings') || menu.length;
            menu.splice(index, 0, {
                title: 'MyShows Pro',
                id: pluginId,
                icon: `<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 12l-4-4h8l-4 4z" fill="#fff"/></svg>`,
                type: 'submenu'
            });
            if (Lampa.Menu.update) Lampa.Menu.update();
        }
    }

    // Регистрация плагина
    Lampa.Plugins.add({
        id: pluginId,
        name: pluginName,
        description: 'Синхронизация сериалов с MyShows.me',
        onReady: injectToMenu
    });

    // Форсированный запуск
    if (window.appready) injectToMenu();
    else Lampa.Listener.follow('app', e => { if (e.type === 'ready') injectToMenu(); });

})();
