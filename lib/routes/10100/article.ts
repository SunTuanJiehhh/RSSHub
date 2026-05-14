import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/article',
    categories: ['new-media'],
    example: '/10100/article',
    url: 'www.10100.com',
    name: '资讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const url = 'https://www.10100.com/';

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        },
    });

    const $ = load(response);

    const list = $('a[href*="/article/"]')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const href = $item.attr('href');
            const match = href?.match(/\/article\/(\d+)/);
            if (!match) {
                return null;
            }
            const title = $item.attr('title') || $item.text().trim();
            return {
                title,
                link: href.startsWith('http') ? href : `https://www.10100.com${href}`,
            };
        })
        .filter(Boolean)
        .filter((item) => item.title && item.title.length > 5)
        .filter((item, index, self) => index === self.findIndex((t) => t.link === item.link))
        .slice(0, 20);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    },
                });

                const $detail = load(detailResponse);

                const titleText = $detail('title').text().split('-')[0].trim();
                if (titleText) {
                    item.title = titleText;
                }

                item.description = $detail('.rte-article').html() || '';

                const dateMatch = detailResponse.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1]);
                }

                const authorText = $detail('.article-source').text().trim();
                if (authorText) {
                    item.author = authorText.replace(/来源[：:]\s*/, '');
                }

                return item;
            })
        )
    );

    return {
        title: '大数跨境 - 资讯',
        link: url,
        item: items,
    };
}
