import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/article',
    categories: ['new-media'],
    example: '/mjzj/article',
    url: 'm.mjzj.com',
    name: '资讯',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const apiUrl = 'https://data.mjzj.com/api/Article/Search';

    const { data: response } = await got.post(apiUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            Referer: 'https://m.mjzj.com/',
        },
        json: { page: 1, pageSize: 20 },
    });

    const list = (response.list || []).map((item) => ({
        title: item.title,
        link: item.articleMobileUrl || `https://m.mjzj.com/article/${item.id}`,
        pubDate: parseDate(item.publishDateTime?.htmlInputString || item.publishTime),
        author: item.author?.name,
        category: item.tags,
        summary: item.summary || item.aiSummary,
    }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                try {
                    const { data: detailResponse } = await got(item.link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
                        },
                    });

                    const $detail = load(detailResponse);
                    const content = $detail('.article-content').html();

                    if (content) {
                        item.description = content;
                    }
                } catch {
                    item.description = item.summary || '';
                }

                return item;
            })
        )
    );

    return {
        title: '卖家之家 - 资讯',
        link: 'https://m.mjzj.com/',
        item: items,
    };
}
