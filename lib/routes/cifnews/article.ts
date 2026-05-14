import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/article',
    categories: ['new-media'],
    example: '/cifnews/article',
    url: 'm.cifnews.com',
    name: '资讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const url = 'https://m.cifnews.com/';

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        },
    });

    const $ = load(response);

    const list = $('li.fetch-present[data-fetch-type="article"]')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const id = $item.attr('data-fetch-id');
            const $link = $item.find('.art_con h2 a.title');
            const title = $link.attr('title') || $link.text().trim();
            const $time = $item.find('.times');
            const timeText = $time.text().trim();

            return {
                title,
                link: `https://m.cifnews.com/article/${id}`,
                pubDate: parseDate(timeText),
            };
        })
        .filter((item) => item.title);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                    },
                });

                const $detail = load(detailResponse);

                item.description = $detail('.article-content.article-inner').html() || '';

                const authorText = $detail('.article-author').text().trim();
                if (authorText) {
                    item.author = authorText.replace(/作者[：:]\s*/, '');
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
        title: '雨果跨境 - 资讯',
        link: 'https://www.cifnews.com/',
        item: items,
    };
}
