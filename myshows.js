(function () {
    'use strict';

    /**
     * Специальная версия для Windows-приложения Lampa.
     * Решает проблему "error undefined" путем изоляции контекста настроек.
     */

    const pluginName = 'MyShows';
    const storagePrefix = 'myshows_';
    const componentName = 'myshows_settings_component';

    function init() {
        // Проверяем, не был ли плагин уже инициализирован (защита от двойного запуска)
        if (window.MyShowsInitialized) return;
        window.MyShowsInitialized = true;

        // 1. Регистрация компонента (визуальная часть внутри настроек)
        Lampa.Component.add(componentName, function (object) {
            this.create = function () {
                try {
                    // Пытаемся получить шаблон настроек, если он уже создан
                    this.build = Lampa.Settings.get('myshows_page') || $('<div><div class="settings-param"><div class="settings-param__name">Ошибка</div><div class="settings-param__value">Не удалось загрузить параметры</div></div></div>');
                } catch (e) {
                    console.error('MyShows Component Build Error:', e);
                }
            };

            this.render = function () {
                return this.build;
            };
        });

        // 2. Создание страницы в реестре Lampa
        try {
            Lampa.Settings.create('myshows_page', {
                title: 'MyShows.me',
                onBack: function () {
                    Lampa.Settings.main('main');
                }
            });

            // 3. Наполнение страницы полями (используем безопасную проверку)
            Lampa.Settings.add('myshows_page', [
                {
                    name: storagePrefix + 'user',
                    type: 'input',
                    default: '',
                    placeholder: 'example@mail.ru',
                    title: 'Логин / Email'
                },
                {
                    name: storagePrefix + 'pass',
                    type: 'input',
                    default: '',
                    placeholder: '******',
                    title: 'Пароль'
                },
                {
                    name: storagePrefix + 'status',
                    type: 'static',
                    title: 'Версия для Windows',
                    content: 'Плагин адаптирован для десктопного приложения.'
                }
            ]);

            // 4. Добавление кнопки в основной раздел "Плагины"
            // Используем тайм-аут, чтобы убедиться, что основной список настроек Lampa готов
            setTimeout(function() {
                if (Lampa.Settings.add) {
                    Lampa.Settings.add('main', [
                        {
                            name: 'myshows_btn',
                            type: 'button',
                            title: 'MyShows',
                            subtitle: 'Настройка синхронизации',
                            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
                            onSelect: function () {
                                Lampa.Settings.main(componentName);
                            }
                        }
                    ]);
                }
            }, 500);

        } catch (err) {
            console.error('MyShows Main Registration Error:', err);
        }

        console.log(pluginName + ': Windows App Version Loaded');
    }

    // В приложении на Windows ожидание может занять больше времени
    var checkLampa = setInterval(function () {
        if (typeof Lampa !== 'undefined' && Lampa.Settings && Lampa.Component) {
            clearInterval(checkLampa);
            init();
        }
    }, 300);
})();
