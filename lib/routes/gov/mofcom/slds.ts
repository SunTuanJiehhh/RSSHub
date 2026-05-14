import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/mofcom/slds',
    categories: ['government'],
    example: '/gov/mofcom/slds',
    url: 'dzswgf.mofcom.gov.cn/slds.html',
    name: '丝路电商 - 电子商务国际合作',
    maintainers: ['SunTuanJiehhh'],
    handler,
};

async function handler() {
    const rootUrl = 'https://dzswgf.mofcom.gov.cn';
    const url = `${rootUrl}/slds.html`;

    const response = await ofetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });

    const $ = load(response);

    const list = $('a[href*="/news/"][title]')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const href = $item.attr('href');
            const title = $item.attr('title') || $item.text().trim();

            return {
                title: title.trim(),
                link: href.startsWith('http') ? href : `${rootUrl}${href}`,
            };
        })
        .filter((item) => item.title && item.link.includes('/news/'));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                });

                const $detail = load(detailResponse);

                item.description = $detail('.m-article-body').html() || $detail('.article-body').html() || '';

                const sourceText = $detail('.m-article-head').text() || '';
                const dateMatch = sourceText.match(/发布时间[：:]\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/);
                if (dateMatch) {
                    item.pubDate = parseDate(dateMatch[1]);
                }

                const authorMatch = sourceText.match(/文章来源[：:]\s*([^\s]+)/);
                if (authorMatch) {
                    item.author = authorMatch[1];
                }

                return item;
            })
        )
    );

    return {
        title: '丝路电商 - 电子商务国际合作 - 商务部',
        link: url,
        item: items,
    };
}
