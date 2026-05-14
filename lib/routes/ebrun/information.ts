import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/information/:category?',
    categories: ['new-media'],
    example: '/ebrun/information',
    parameters: {
        category: '分类，可选。默认为最新资讯。可选值：cross（跨境电商）、retail（未来零售）、industry（产业互联网）、brand（品牌）、AI',
    },
    url: 'm.ebrun.com/information',
    name: '资讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler(ctx) {
    const category = ctx.req.param('category') || '';
    const categoryPath = category ? `/${category}` : '';
    const url = `https://m.ebrun.com/information${categoryPath}`;

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        },
    });

    const $ = load(response);

    const list = $('.news-item')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const $title = $item.find('.info .title');
            const $date = $item.find('.info .info-foot .date');
            const id = $item.attr('data-visited');
            return {
                title: $title.text().trim(),
                link: `https://m.ebrun.com/${id}.html`,
                pubDate: parseDate($date.text().trim()),
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

                item.description = $detail('.article-content').html() || '';

                const authorText = $detail('.article-attr').text();
                const authorMatch = authorText.match(/作者[：:]\s*([^\s]+)/);
                if (authorMatch) {
                    item.author = authorMatch[1];
                }

                const dateText = $detail('.article-attr').text();
                const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}(?::\d{2})?)/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1]);
                }

                return item;
            })
        )
    );

    const categoryNames: Record<string, string> = {
        '': '最新资讯',
        cross: '跨境电商',
        retail: '未来零售',
        industry: '产业互联网',
        brand: '品牌',
        AI: 'AI',
    };

    return {
        title: `亿邦动力 - ${categoryNames[category] || category}`,
        link: url,
        item: items,
    };
}
