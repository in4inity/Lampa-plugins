(function () {
    'use strict';

    /**
     * Lampa Plugin: Hello World Test
     * Этот плагин добавляет кнопку в боковое меню для проверки работоспособности.
     */
    function startPlugin() {
        // Проверяем, что Lampa загружена
        if (window.app_ready) {
            console.log('Lampa Test Plugin: Ready');
            
            // Добавляем новый пункт в главное меню
            Lampa.Component.add('test_plugin_component', {
                create: function () {
                    var html = $('<div><div class="broadcast__text">Привет! Если ты это видишь, значит плагин с твоего GitHub загрузился и работает корректно. [ ]</div></div>');
                    this.render = function () {
                        return html;
                    };
                }
            });

            // Регистрируем кнопку в боковом меню
            var menu_item = {
                title: 'Тест GitHub',
                icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm1-13c2.76 0 5 2.24 5 5 0 2.5-2.5 2.5-2.5 5h-1.5c0-2.83 2.5-2.73 2.5-5 0-1.65-1.35-3-3-3s-3 1.35-3 3h-2c0-2.76 2.24-5 5-5z" fill="white"/></svg>',
                component: 'test_plugin_component'
            };

            Lampa.Menu.add(menu_item);
        } else {
            // Если Lampa еще не готова, ждем события
            Lampa.Listener.follow('app', function (e) {
                if (e.type == 'ready') startPlugin();
            });
        }
    }

    // Запуск плагина
    if (window.Lampa) {
        startPlugin();
    } else {
        window.push_lampa_plugins = window.push_lampa_plugins || [];
        window.push_lampa_plugins.push(startPlugin);
    }
})();
