import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news',
    categories: ['new-media'],
    example: '/ikjzd/news',
    url: 'www.ikjzd.com',
    name: '24小时快讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const url = 'https://www.ikjzd.com/';

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    const $ = load(response);

    const list = $('.newslist li a[href*="/news/"]')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const href = $item.attr('href');
            const title =
                $item.attr('title') ||
                $item
                    .text()
                    .replace(/\d{2}-\d{2}/, '')
                    .trim();
            const dateText = $item.find('.date').text().trim();

            return {
                title,
                link: href.startsWith('http') ? href : `https://www.ikjzd.com${href}`,
                pubDate: dateText ? parseDate(`${new Date().getFullYear()}-${dateText}`) : undefined,
            };
        })
        .filter((item) => item.title);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                });

                const $detail = load(detailResponse);

                item.description = $detail('.articlecontent').html() || '';

                const titleText = $detail('title').text().replace('_跨境知道', '').trim();
                if (titleText) {
                    item.title = titleText;
                }

                const dateMatch = detailResponse.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1]);
                }

                return item;
            })
        )
    );

    return {
        title: '跨境知道 - 24小时快讯',
        link: url,
        item: items,
    };
}
