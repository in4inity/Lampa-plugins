(function () {
    'use strict';

    /**
     * Плагин MyShows для Lampa с глубокой интеграцией в настройки.
     * Мы используем стандартный механизм Lampa.Settings для создания интерфейса.
     */

    const pluginName = 'MyShows';
    const storageKeyPrefix = 'myshows_';

    function init() {
        // --- 1. Регистрация нового раздела в настройках ---
        Lampa.Settings.listener.follow('open', function (e) {
            // Ждем открытия главного меню настроек
            if (e.name === 'main') {
                const settingsMenu = e.body;
                
                // Проверяем, не добавили ли мы уже кнопку (чтобы не дублировать)
                if (settingsMenu.find('[data-component="myshows_settings"]').length === 0) {
                    const button = $(`
                        <div class="settings-folder selector" data-component="myshows_settings">
                            <div class="settings-folder__icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/>
                                </svg>
                            </div>
                            <div class="settings-folder__name">MyShows</div>
                        </div>
                    `);

                    button.on('hover:enter', function () {
                        // При нажатии открываем наш кастомный компонент настроек
                        Lampa.Settings.main('myshows_settings');
                    });

                    // Вставляем перед разделом "Плагины"
                    settingsMenu.find('[data-component="plugins"]').before(button);
                    
                    // Обновляем навигацию Lampa, чтобы новая кнопка стала кликабельной
                    Lampa.Controller.update();
                }
            }
        });

        // --- 2. Создание структуры страницы настроек ---
        Lampa.Settings.create('myshows_settings', {
            title: 'MyShows',
            onBack: function () {
                Lampa.Settings.main('main');
            }
        });

        // Добавляем поля ввода и кнопки
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
                    performAuth();
                }
            }
        ]);

        console.log(pluginName + ': Интеграция в настройки завершена');
    }

    /**
     * Логика авторизации
     */
    function performAuth() {
        const login = Lampa.Storage.get(storageKeyPrefix + 'login');
        const password = Lampa.Storage.get(storageKeyPrefix + 'password');

        if (!login || !password) {
            Lampa.Noty.show('Введите логин и пароль в настройках!');
            return;
        }

        Lampa.Noty.show('Пробуем войти в MyShows...');
        
        // Тут должна быть твоя логика API запроса к MyShows
        // После успеха не забудь обновить статус в меню или перезагрузить страницу
        console.log('Попытка входа для:', login);
    }

    // Ждем готовности Lampa
    if (window.Lampa) {
        init();
    } else {
        var waitLampa = setInterval(function () {
            if (window.Lampa) {
                clearInterval(waitLampa);
                init();
            }
        }, 100);
    }
})();
