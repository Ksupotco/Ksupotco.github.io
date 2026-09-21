(function () {
    'use strict';

    var panel = document.querySelector('.utility-panel');
    if (!panel) return;

    var monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dataNode = document.getElementById('calendar-post-data');
    var postsByDate = {};

    try {
        postsByDate = JSON.parse(dataNode ? dataNode.textContent : '{}');
    } catch (error) {
        postsByDate = {};
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var grid = panel.querySelector('[data-calendar-grid]');
    var monthLabel = panel.querySelector('[data-calendar-month]');
    var yearLabel = panel.querySelector('[data-calendar-year]');
    var selection = panel.querySelector('[data-calendar-selection]');

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function dateKey(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function showPosts(date) {
        var key = dateKey(date);
        var posts = postsByDate[key] || [];
        selection.innerHTML = '';

        var heading = document.createElement('div');
        heading.className = 'calendar-selection-date';
        heading.textContent = (date.getMonth() + 1) + ' 月 ' + date.getDate() + ' 日';
        selection.appendChild(heading);

        if (!posts.length) {
            var empty = document.createElement('p');
            empty.className = 'calendar-empty';
            empty.textContent = '今天不是作文天';
            selection.appendChild(empty);
            return;
        }

        var list = document.createElement('ul');
        posts.forEach(function (post) {
            var item = document.createElement('li');
            var link = document.createElement('a');
            link.href = post.url;
            link.textContent = post.title;
            item.appendChild(link);
            list.appendChild(item);
        });
        selection.appendChild(list);
    }

    function renderCalendar() {
        grid.innerHTML = '';
        selection.innerHTML = '';
        monthLabel.textContent = monthLabels[visibleMonth.getMonth()];
        yearLabel.textContent = visibleMonth.getFullYear();

        var firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
        var mondayOffset = (firstDay.getDay() + 6) % 7;
        var start = new Date(firstDay);
        start.setDate(firstDay.getDate() - mondayOffset);

        for (var index = 0; index < 42; index += 1) {
            var date = new Date(start);
            date.setDate(start.getDate() + index);
            var key = dateKey(date);
            var posts = postsByDate[key] || [];
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'calendar-day';
            button.textContent = date.getDate();
            button.setAttribute('aria-label', key + (posts.length ? '，' + posts.length + ' 篇文章' : '，没有文章'));

            if (date.getMonth() !== visibleMonth.getMonth()) button.classList.add('is-outside');
            if (date.getTime() === today.getTime()) button.classList.add('is-today');
            if (posts.length) {
                button.classList.add('has-posts');
                var dots = document.createElement('span');
                dots.className = 'calendar-dots';
                dots.textContent = Array(Math.min(posts.length, 3) + 1).join('•');
                button.appendChild(dots);
            }

            (function (chosenDate, chosenButton) {
                chosenButton.addEventListener('click', function () {
                    grid.querySelectorAll('.is-selected').forEach(function (item) {
                        item.classList.remove('is-selected');
                    });
                    chosenButton.classList.add('is-selected');
                    showPosts(chosenDate);
                });
            })(date, button);

            grid.appendChild(button);
        }
    }

    panel.querySelector('[data-calendar-prev]').addEventListener('click', function () {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
        renderCalendar();
    });
    panel.querySelector('[data-calendar-next]').addEventListener('click', function () {
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
        renderCalendar();
    });
    panel.querySelector('[data-calendar-today]').addEventListener('click', function () {
        visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        renderCalendar();
    });
    renderCalendar();

    var quoteConfigPromise = fetch('/data/fortune-quotes.json', { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) throw new Error('Unable to load quote repository');
            return response.json();
        });
    var jar = panel.querySelector('[data-fortune-jar]');
    var message = panel.querySelector('[data-fortune-message]');
    var messageTimer = null;
    var stateKey = 'ksupotco-fortune-pity-v1';

    function randomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function loadState() {
        try {
            return Object.assign({ total: 0, smallPity: 0, bigPity: 0 },
                JSON.parse(localStorage.getItem(stateKey) || '{}'));
        } catch (error) {
            return { total: 0, smallPity: 0, bigPity: 0 };
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(stateKey, JSON.stringify(state));
        } catch (error) {
            // Drawing still works when storage is unavailable; only pity persistence is lost.
        }
    }

    function drawQuote(config) {
        var state = loadState();
        var limits = config.limits || {};
        var rates = config.rates || {};
        var normal = config.normal || [];
        var smallPool = config.smallPity || ['赚赚大钱'];
        var bigPool = config.bigPity || ['多多人爱'];
        var tier = 'normal';

        state.total += 1;
        state.smallPity += 1;
        state.bigPity += 1;

        if (state.bigPity >= (limits.bigPity || 80)) {
            tier = 'bigPity';
        } else if (state.smallPity >= (limits.smallPity || 50)) {
            tier = 'smallPity';
        } else {
            var roll = Math.random();
            if (roll < (rates.bigPity || 0.01)) {
                tier = 'bigPity';
            } else if (roll < (rates.bigPity || 0.01) + (rates.smallPity || 0.03)) {
                tier = 'smallPity';
            }
        }

        var pool;
        if (tier === 'bigPity') {
            pool = bigPool;
            state.bigPity = 0;
            state.smallPity = 0;
        } else if (tier === 'smallPity') {
            pool = smallPool;
            state.smallPity = 0;
        } else {
            // Until normal quotes are added, reuse the two available phrases without
            // resetting either pity counter.
            pool = normal.length ? normal : smallPool.concat(bigPool);
        }

        saveState(state);
        return randomItem(pool);
    }

    function showQuote(text) {
        window.clearTimeout(messageTimer);
        message.textContent = text;
        message.classList.add('is-visible');
        messageTimer = window.setTimeout(function () {
            message.classList.remove('is-visible');
        }, 2600);
    }

    jar.addEventListener('click', function () {
        quoteConfigPromise.then(function (config) {
            showQuote(drawQuote(config));
        }).catch(function () {
            showQuote('纸罐暂时打不开');
        });
    });
})();
