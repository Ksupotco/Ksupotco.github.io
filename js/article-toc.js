(function () {
    'use strict';

    function initArticleToc() {
        var toc = document.querySelector('.article-toc');
        if (!toc) return;

        var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
        var entries = links.map(function (link) {
            var id;
            try {
                id = decodeURIComponent(link.getAttribute('href').slice(1));
            } catch (error) {
                id = link.getAttribute('href').slice(1);
            }
            return { link: link, heading: document.getElementById(id) };
        }).filter(function (entry) {
            return entry.heading;
        });

        if (!entries.length) return;

        function setActive(activeLink) {
            links.forEach(function (link) {
                link.classList.toggle('is-active', link === activeLink);
                if (link === activeLink) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });

            if (activeLink) {
                var linkTop = activeLink.offsetTop;
                var linkBottom = linkTop + activeLink.offsetHeight;
                if (linkTop < toc.scrollTop + 80) toc.scrollTop = Math.max(0, linkTop - 80);
                if (linkBottom > toc.scrollTop + toc.clientHeight - 30) {
                    toc.scrollTop = linkBottom - toc.clientHeight + 30;
                }
            }
        }

        function updateActive() {
            var marker = window.scrollY + 140;
            var current = entries[0];
            entries.forEach(function (entry) {
                if (entry.heading.offsetTop <= marker) current = entry;
            });
            setActive(current.link);
        }

        links.forEach(function (link) {
            link.addEventListener('click', function () {
                setActive(link);
            });
        });

        var scheduled = false;
        window.addEventListener('scroll', function () {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(function () {
                updateActive();
                scheduled = false;
            });
        }, { passive: true });

        updateActive();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArticleToc);
    } else {
        initArticleToc();
    }
}());
