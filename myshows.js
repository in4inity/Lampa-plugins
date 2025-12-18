(function () {
    'use strict';

    const pluginName = 'MyShows Fix';
    const storagePrefix = 'ms_desktop_';
    const pageId = 'myshows_settings';
    const compId = 'myshows_component';

    function init() {
        // Проверяем, не был ли плагин уже запущен
        if (window.MyShowsPluginRunning) return;
        window.MyShowsPluginRunning = true;

        try {
            // 1. Создаем страницу настроек (безопасно)
            if (Lampa.Settings.create) {
                Lampa.Settings.create(pageId, {
                    title: 'MyShows (Desktop)',
                    onBack: function () {
                        Lampa.Settings.main('main');
                    }
                });

                // Добавляем поля ввода
                Lampa.Settings.add(pageId, [
                    {
                        name: storagePrefix + 'user',
                        type: 'input',
                        default: '',
                        placeholder: 'Логин',
                        title: 'Ваш логин на MyShows'
                    },
                    {
                        name: storagePrefix + 'pass',
                        type: 'input',
                        default: '',
                        placeholder: 'Пароль',
                        title: 'Ваш пароль'
                    }
                ]);
            }

            // 2. Регистрируем компонент, который будет открывать эти настройки
            if (Lampa.Component && Lampa.Component.add) {
                // Если компонент уже есть (после ошибки), Lampa может ругаться. 
                // В новых версиях можно просто перезаписать.
                Lampa.Component.add(compId, function (object) {
                    this.create = function () {
                        this.build = Lampa.Settings.get(pageId);
                    };
                    this.render = function () {
                        return this.build;
                    };
                });
            }

            // 3. Добавляем кнопку в главное меню настроек
            function injectButton() {
                if (Lampa.Settings.main && Lampa.Settings.add) {
                    Lampa.Settings.add('main', [
                        {
                            name: 'myshows_entry_btn',
                            type: 'button',
                            title: 'MyShows',
                            subtitle: 'Настройка аккаунта',
                            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
                            onSelect: function () {
                                Lampa.Settings.main(compId);
                            }
                        }
                    ]);
                }
            }

            // Пытаемся внедрить кнопку несколько раз, так как меню может перерисовываться
            injectButton();
            setTimeout(injectButton, 1000); 

        } catch (e) {
            console.error(pluginName + ' Fatal Error:', e);
        }
    }

    // Цикл ожидания готовности Lampa
    var attempts = 0;
    var readyTimer = setInterval(function () {
        attempts++;
        if (typeof Lampa !== 'undefined' && Lampa.Settings && Lampa.Component) {
            clearInterval(readyTimer);
            init();
        }
        if (attempts > 50) clearInterval(readyTimer); // Прекращаем через 10 секунд
    }, 200);

})();
