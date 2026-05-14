import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/article',
    categories: ['new-media'],
    example: '/ennews/article',
    url: 'm.ennews.com',
    name: '资讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const url = 'https://m.ennews.com/';

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        },
    });

    const $ = load(response);

    const list = $('a[href*="/article-"]')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const href = $item.attr('href');
            const match = href?.match(/article-(\d+)-1\.html/);
            if (!match) {
                return null;
            }
            const title = $item.find('img').attr('alt') || $item.find('img').attr('title') || $item.text().trim();
            return {
                title,
                link: href.startsWith('http') ? href : `https://m.ennews.com${href}`,
            };
        })
        .filter(Boolean)
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

                const titleText = $detail('title').text().replace('-亿恩网', '').trim();
                if (titleText) {
                    item.title = titleText;
                }

                item.description = $detail('.weui_article_info').html() || $detail('article').html() || '';

                const dateMatch = detailResponse.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1]);
                }

                const sourceMatch = detailResponse.match(/来源[：:]\s*([^\s<]+)/);
                if (sourceMatch) {
                    item.author = sourceMatch[1];
                }

                return item;
            })
        )
    );

    return {
        title: '亿恩网 - 跨境电商资讯',
        link: url,
        item: items,
    };
}
