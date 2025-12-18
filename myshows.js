(function () {
    'use strict';

    // Функция отрисовки интерфейса настроек внутри плагина
    function showMyShowsSettings() {
        const modal = $('<div><div class="settings-list"></div></div>');
        const items = [
            {
                title: 'Логин MyShows',
                subtitle: Lampa.Storage.get('myshows_login', 'Не установлен'),
                name: 'login'
            },
            {
                title: 'Пароль MyShows',
                subtitle: '**********',
                name: 'password'
            },
            {
                title: 'Проверить авторизацию',
                subtitle: 'Нажмите для входа',
                name: 'check'
            }
        ];

        items.forEach(item => {
            const el = $(`<div class="settings-item selector">
                <div class="settings-item__title">${item.title}</div>
                <div class="settings-item__subtitle">${item.subtitle}</div>
            </div>`);

            el.on('hover:enter', () => {
                if (item.name === 'login' || item.name === 'password') {
                    Lampa.Input.edit({
                        value: item.name === 'login' ? Lampa.Storage.get('myshows_login', '') : '',
                        title: item.title
                    }, (new_val) => {
                        if (new_val) {
                            Lampa.Storage.set('myshows_' + item.name, new_val);
                            Lampa.Noty.show('Сохранено: ' + item.title);
                            Lampa.Controller.trigger('back'); // Перерисовать
                        }
                    });
                }
            });
            modal.find('.settings-list').append(el);
        });

        Lampa.Modal.open({
            title: 'MyShows для Windows',
            html: modal,
            size: 'medium',
            onBack: () => {
                Lampa.Modal.close();
                Lampa.Controller.toggle('settings');
            }
        });
    }

    function init() {
        // Добавляем пункт в меню настроек через прямое вмешательство в визуализатор
        Lampa.Listener.follow('settings', (e) => {
            if (e.type === 'open' && e.name === 'main') {
                setTimeout(() => {
                    const body = e.body || $('.settings-main'); // Ищем контейнер настроек
                    
                    if ($('.selector[data-name="myshows"]').length === 0) {
                        const btn = $(`<div class="settings-item selector" data-name="myshows">
                            <div class="settings-item__icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                            </div>
                            <div class="settings-item__title">MyShows</div>
                            <div class="settings-item__subtitle">Синхронизация (Desktop Fix)</div>
                        </div>`);

                        btn.on('hover:enter', () => {
                            showMyShowsSettings();
                        });

                        // Вставляем кнопку в начало или конец списка
                        body.find('.scroll__content').append(btn);
                        
                        // Заставляем Lampa обновить список активных элементов (чтобы фокус работал)
                        if (Lampa.Controller.enabled().name === 'settings') {
                            Lampa.Controller.toggle('settings'); 
                        }
                    }
                }, 10);
            }
        });
    }

    // Ожидание готовности
    const wait = setInterval(() => {
        if (typeof Lampa !== 'undefined' && Lampa.Settings) {
            clearInterval(wait);
            try {
                init();
            } catch (e) {
                console.error('MyShows Plugin Error:', e);
            }
        }
    }, 200);
})();
