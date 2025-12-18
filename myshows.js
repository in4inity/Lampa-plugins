(function () {
    'use strict';

    /**
     * Исправленная версия плагина MyShows.
     * Добавлена регистрация компонента, чтобы избежать ошибки при клике.
     */

    const pluginName = 'MyShows';
    const storageKeyPrefix = 'myshows_';

    function init() {
        // --- 1. Регистрируем компонент в системе Lampa ---
        // Без этого вызова Lampa не знает, ЧТО рисовать, когда мы жмем на пункт в меню
        Lampa.Component.add('myshows_settings', function (object) {
            this.create = function () {
                // Создаем контейнер для наших настроек
                this.build = Lampa.Settings.get('myshows_settings');
            };

            this.render = function () {
                return this.build;
            };
        });

        // --- 2. Создаем структуру страницы настроек ---
        Lampa.Settings.create('myshows_settings', {
            title: 'MyShows',
            onBack: function () {
                Lampa.Settings.main('main');
            }
        });

        // --- 3. Наполняем полями ---
        Lampa.Settings.add('myshows_settings', [
            {
                name: storageKeyPrefix + 'login',
                type: 'input',
                default: '',
                placeholder: 'Email или логин',
                title: 'Логин на MyShows'
            },
            {
                name: storageKeyPrefix + 'password',
                type: 'input',
                default: '',
                placeholder: 'Ваш пароль',
                title: 'Пароль'
            },
            {
                name: 'myshows_status',
                type: 'static',
                title: 'Статус',
                content: Lampa.Storage.get(storageKeyPrefix + 'token') ? '<span style="color: #4caf50">Авторизован</span>' : 'Необходим вход'
            },
            {
                name: 'myshows_auth_btn',
                type: 'button',
                title: 'Выполнить вход',
                onSelect: function () {
                    Lampa.Noty.show('Функция входа в разработке');
                }
            }
        ]);

        // --- 4. Внедряем кнопку в главное меню настроек ---
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                // Используем setTimeout, чтобы DOM успел отрисоваться
                setTimeout(function() {
                    const settingsMenu = e.body;
                    if (settingsMenu.find('[data-component="myshows_settings"]').length === 0) {
                        const button = $(`
                            <div class="settings-folder selector" data-component="myshows_settings">
                                <div class="settings-folder__icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 17l-5-5h10l-5 5z" />
                                    </svg>
                                </div>
                                <div class="settings-folder__name">MyShows</div>
                            </div>
                        `);

                        button.on('hover:enter', function () {
                            Lampa.Settings.main('myshows_settings');
                        });

                        settingsMenu.find('[data-component="plugins"]').before(button);
                        Lampa.Controller.update();
                    }
                }, 10);
            }
        });

        console.log(pluginName + ': Ready');
    }

    // Запуск с проверкой наличия Lampa и jQuery ($)
    if (window.Lampa && window.$) {
        init();
    } else {
        let attempts = 0;
        const wait = setInterval(function () {
            attempts++;
            if (window.Lampa && window.$) {
                clearInterval(wait);
                init();
            } else if (attempts > 50) {
                clearInterval(wait);
                console.error('MyShows: Lampa not found');
            }
        }, 100);
    }
})();
